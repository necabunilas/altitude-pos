"use client";

import { useEffect, useRef, useState } from "react";

// Every admin page renders its own AdminNav, so this hook remounts on each page
// switch. The audio context and "what was already pending" live at module
// scope so they survive navigation: one context, unlocked once, stays unlocked
// (a fresh context per page starts suspended, and Safari caps how many a page
// may create), and an alert arriving mid-switch still dings.
let sharedCtx = null;
let output = null; // master gain -> compressor -> speakers
let lastCallCount = null;
let lastPlacedCount = null;

function getCtx() {
  if (!sharedCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    sharedCtx = new Ctx();
    // Compressor lets the dings run loud without harsh clipping.
    const comp = sharedCtx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 6;
    output = sharedCtx.createGain();
    output.gain.value = 1;
    output.connect(comp).connect(sharedCtx.destination);
  }
  return sharedCtx;
}

// Polls open calls and reports the count, plus a `justArrived` pulse that flips
// true briefly (and beeps) whenever the open-call count goes UP. Shared by the
// nav bell so staff are alerted on any admin page.
export function useCallAlerts({ intervalMs = 3000 } = {}) {
  const [calls, setCalls] = useState([]);
  const [justArrived, setJustArrived] = useState(false);
  const [soundReady, setSoundReady] = useState(false);
  const [newOrders, setNewOrders] = useState([]);
  const [orderArrived, setOrderArrived] = useState(false);
  const audioCtx = useRef(null);

  function ensureCtx() {
    audioCtx.current = getCtx();
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

  // Two distinct alert sounds so staff can tell them apart by ear, loud enough
  // to hear over a busy bar. Triangle waves carry further than pure sines.
  // "call"  = bright service-bell ding, rung 3 times (waiter/bill: most urgent).
  // "order" = two-note chime, played twice (a new order hit the kitchen).
  function beep(kind = "call") {
    const ctx = audioCtx.current;
    if (!ctx || !output) return;
    const t0 = ctx.currentTime;
    const once =
      kind === "order"
        ? [
            { freq: 587.33, at: 0, gain: 0.7, dur: 0.3 }, // D5
            { freq: 880, at: 0.16, gain: 0.7, dur: 0.45 }, // A5
          ]
        : [
            { freq: 1318.5, at: 0, gain: 0.8, dur: 0.6 }, // E6 fundamental
            { freq: 2637, at: 0, gain: 0.3, dur: 0.6 }, // octave shimmer
          ];
    const repeats = kind === "order" ? 2 : 3;
    const gap = kind === "order" ? 0.7 : 0.45;
    for (let r = 0; r < repeats; r++) {
      once.forEach(({ freq, at, gain: g, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        const t = t0 + r * gap + at;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(g, t + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain).connect(output);
        osc.start(t);
        osc.stop(t + dur + 0.05);
      });
    }
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
      if (lastCallCount !== null && nextCalls.length > lastCallCount) {
        beep("call");
        setJustArrived(true);
        setTimeout(() => alive && setJustArrived(false), 2500);
      }
      lastCallCount = nextCalls.length;
      setCalls(nextCalls);

      // Orders with any un-started ("placed") item — a new order or a newly
      // appended round both surface here and ding.
      const activeOrders = orderData.orders || [];
      const placed = activeOrders.filter((o) => o.items?.some((i) => i.status === "placed"));
      const placedItemCount = activeOrders.reduce(
        (n, o) => n + (o.items?.filter((i) => i.status === "placed").length || 0),
        0
      );
      if (lastPlacedCount !== null && placedItemCount > lastPlacedCount) {
        beep("order");
        setOrderArrived(true);
        setTimeout(() => alive && setOrderArrived(false), 2500);
      }
      lastPlacedCount = placedItemCount;
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