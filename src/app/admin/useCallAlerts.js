"use client";

import { useEffect, useRef, useState } from "react";

// Polls open calls and reports the count, plus a `justArrived` pulse that flips
// true briefly (and beeps) whenever the open-call count goes UP. Shared by the
// nav bell so staff are alerted on any admin page.
export function useCallAlerts({ intervalMs = 3000 } = {}) {
  const [calls, setCalls] = useState([]);
  const [justArrived, setJustArrived] = useState(false);
  const [soundReady, setSoundReady] = useState(false);
  const [newOrders, setNewOrders] = useState([]);
  const [orderArrived, setOrderArrived] = useState(false);
  const prevCount = useRef(null);
  const prevOrders = useRef(null);
  const audioCtx = useRef(null);

  function ensureCtx() {
    if (!audioCtx.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx.current = new Ctx();
    }
    return audioCtx.current;
  }

  // Browsers block audio until a user gesture. Keep listening (not `once`)
  // until the context is actually running, then report sound as ready.
  useEffect(() => {
    function unlock() {
      const ctx = ensureCtx();
      if (!ctx) return;
      ctx.resume?.().then(() => {
        if (ctx.state === "running") setSoundReady(true);
      });
    }
    // If audio is already permitted (e.g. after prior interaction), reflect it.
    const ctx = ensureCtx();
    if (ctx && ctx.state === "running") setSoundReady(true);
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Explicit opt-in used by an "Enable sound" button: unlocks and plays a test.
  function enableSound() {
    const ctx = ensureCtx();
    if (!ctx) return;
    ctx.resume?.().then(() => {
      setSoundReady(ctx.state === "running");
      beep();
    });
  }

  // Two distinct alert sounds so staff can tell them apart by ear.
  // "call"  = bright service-bell ding (waiter/bill — most urgent).
  // "order" = softer two-note chime (a new order hit the kitchen).
  function beep(kind = "call") {
    const ctx = audioCtx.current;
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const notes =
      kind === "order"
        ? [
            { freq: 587.33, at: 0, gain: 0.22, dur: 0.25 }, // D5
            { freq: 880, at: 0.14, gain: 0.22, dur: 0.35 }, // A5
          ]
        : [
            { freq: 1318.5, at: 0, gain: 0.3, dur: 0.9 }, // E6 fundamental
            { freq: 2637, at: 0, gain: 0.1, dur: 0.9 }, // octave shimmer
          ];
    notes.forEach(({ freq, at, gain: g, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = t0 + at;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(g, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    });
  }

  useEffect(() => {
    let alive = true;
    async function poll() {
      const data = await fetch("/api/alerts")
        .then((r) => (r.ok ? r.json() : { calls: [], orders: [] }))
        .catch(() => ({ calls: [], orders: [] }));
      const callData = data;
      const orderData = data;
      if (!alive) return;

      // Calls
      const nextCalls = callData.calls || [];
      if (prevCount.current !== null && nextCalls.length > prevCount.current) {
        beep("call");
        setJustArrived(true);
        setTimeout(() => alive && setJustArrived(false), 2500);
      }
      prevCount.current = nextCalls.length;
      setCalls(nextCalls);

      // Orders with any un-started ("placed") item — a new order or a newly
      // appended round both surface here and ding.
      const activeOrders = orderData.orders || [];
      const placed = activeOrders.filter((o) => o.items?.some((i) => i.status === "placed"));
      const placedItemCount = activeOrders.reduce(
        (n, o) => n + (o.items?.filter((i) => i.status === "placed").length || 0),
        0
      );
      if (prevOrders.current !== null && placedItemCount > prevOrders.current) {
        beep("order");
        setOrderArrived(true);
        setTimeout(() => alive && setOrderArrived(false), 2500);
      }
      prevOrders.current = placedItemCount;
      setNewOrders(placed);
    }
    poll();
    const id = setInterval(poll, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return {
    calls,
    count: calls.length,
    justArrived,
    soundReady,
    enableSound,
    newOrders,
    newOrderCount: newOrders.length,
    orderArrived,
  };
}