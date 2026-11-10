"use client";

import { useEffect, useState } from "react";
import { formatPeso } from "@/lib/money";
import ConfirmModal from "../ConfirmModal";

function fmt(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
const todayStr = () => fmt(new Date());

// First and last day of the month `offset` months from now.
function monthRange(offset) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  return {
    from: fmt(start),
    to: fmt(end),
    label: start.toLocaleDateString("en-PH", { month: "long", year: "numeric" }),
  };
}

function dayLabel(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const EMPTY = { spentOn: "", description: "", amount: "", paymentMethod: "cash" };
const METHODS = [
  ["cash", "💵 Cash"],
  ["qr", "📱 QR"],
];

// Money going out, one total per entry (what it was + how much). Browsed a
// month at a time; Sales subtracts these to show net.
export default function ExpensesView() {
  const [offset, setOffset] = useState(0); // months back from this one
  const [list, setList] = useState([]);
  const [loaded, setLoaded] = useState(false); // first fetch done
  const [form, setForm] = useState({ ...EMPTY, spentOn: todayStr() });
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(null);
  const range = monthRange(offset);

  const [version, setVersion] = useState(0); // bump to refetch after a change
  const load = () => setVersion((v) => v + 1);

  useEffect(() => {
    let alive = true;
    fetch(`/api/expenses?from=${range.from}&to=${range.to}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        setList(d.expenses || []);
        setLoaded(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [range.from, range.to, version]);

  const total = list.reduce((s, e) => s + e.amountCents, 0);
  const cashTotal = list.filter((e) => e.paymentMethod !== "qr").reduce((s, e) => s + e.amountCents, 0);
  // Group by day, newest first (the API already sorts).
  const days = [];
  for (const e of list) {
    const last = days[days.length - 1];
    if (last?.day === e.spentOn) last.items.push(e);
    else days.push({ day: e.spentOn, items: [e] });
  }

  function resetForm() {
    setForm({ ...EMPTY, spentOn: todayStr() });
    setEditingId(null);
    setError("");
  }

  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const body = JSON.stringify({
        spentOn: form.spentOn,
        description: form.description,
        amountCents: Math.round(Number(form.amount) * 100),
        paymentMethod: form.paymentMethod,
      });
      const res = await fetch(editingId ? `/api/expenses/${editingId}` : "/api/expenses", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Could not save.");
        return;
      }
      resetForm();
      load();
    } finally {
      setBusy(false);
    }
  }

  function edit(e) {
    setEditingId(e.id);
    setForm({
      spentOn: e.spentOn,
      description: e.description,
      amount: String(e.amountCents / 100),
      paymentMethod: e.paymentMethod || "cash",
    });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(e) {
    const res = await fetch(`/api/expenses/${e.id}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: "Could not delete." };
    if (editingId === e.id) resetForm();
    load();
    return { ok: true };
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <h1 className="font-display text-3xl text-espresso">Expenses</h1>

      {/* Add / edit */}
      <form onSubmit={save} className="bg-white border border-ink p-4 space-y-3">
        <div className="text-xs uppercase tracking-[0.15em] text-brass-dark">
          {editingId ? "Edit expense" : "Add expense"}
        </div>
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 120) })}
          placeholder="What was it? e.g. Milk restock, Electricity"
          className="w-full border border-ink px-3 py-2.5 text-base bg-white focus:outline-none focus:border-brass"
        />
        <div className="flex flex-wrap gap-2">
          <label className="flex-1 min-w-[140px] flex items-center border border-ink focus-within:border-brass bg-white">
            <span className="pl-3 text-mocha">₱</span>
            <input
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d.]/g, "") })}
              inputMode="decimal"
              placeholder="Total"
              className="flex-1 min-w-0 px-2 py-2.5 text-base font-bold tabular-nums focus:outline-none"
            />
          </label>
          <input
            type="date"
            value={form.spentOn}
            max={todayStr()}
            onChange={(e) => setForm({ ...form, spentOn: e.target.value })}
            className="border border-ink px-2 py-2.5 bg-white focus:outline-none focus:border-brass"
          />
        </div>
        {/* Paid from the cash drawer or by QR */}
        <div className="flex gap-2">
          {METHODS.map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setForm({ ...form, paymentMethod: v })}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wide border ${
                form.paymentMethod === v ? "bg-ink text-white border-ink" : "bg-white border-ink text-ink"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">{error}</p>
        )}
        <div className="flex gap-2">
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 py-3 border border-ink text-sm font-black uppercase tracking-wide hover:bg-ink hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={busy || !form.description.trim() || !(Number(form.amount) > 0)}
            className="flex-[2] py-3 bg-ink text-white text-sm font-black uppercase tracking-wide hover:bg-espresso-light transition-colors disabled:opacity-40"
          >
            {busy ? "Saving…" : editingId ? "Save changes" : "Add expense"}
          </button>
        </div>
      </form>

      {/* Month stepper + total */}
      <div className="flex items-stretch border border-ink bg-white">
        <button
          onClick={() => setOffset((o) => o - 1)}
          aria-label="Previous month"
          className="px-4 text-2xl leading-none font-black hover:bg-ink hover:text-white transition-colors"
        >
          ‹
        </button>
        <div className="flex-1 text-center py-2.5 font-black uppercase tracking-wide text-sm border-x border-ink">
          {range.label}
        </div>
        <button
          onClick={() => setOffset((o) => o + 1)}
          disabled={offset >= 0}
          aria-label="Next month"
          className="px-4 text-2xl leading-none font-black hover:bg-ink hover:text-white transition-colors disabled:opacity-25 disabled:hover:bg-white disabled:hover:text-ink"
        >
          ›
        </button>
      </div>

      <div className="bg-white border border-ink p-4 flex items-baseline justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.15em] text-brass-dark">Total spent</div>
          <div className="text-xs text-mocha mt-1">
            {list.length} entr{list.length === 1 ? "y" : "ies"}
          </div>
          <div className="text-xs text-mocha mt-1 tabular-nums flex flex-wrap gap-x-3">
            <span className="whitespace-nowrap">💵 {formatPeso(cashTotal)}</span>
            <span className="whitespace-nowrap">📱 {formatPeso(total - cashTotal)}</span>
          </div>
        </div>
        <div className="font-display text-3xl text-espresso tabular-nums">{formatPeso(total)}</div>
      </div>

      {loaded && list.length === 0 && (
        <p className="text-mocha/70 py-8 text-center">No expenses this month.</p>
      )}

      {days.map((g) => (
        <div key={g.day} className="bg-white border border-ink">
          <div className="px-4 py-2 flex justify-between text-xs font-black uppercase tracking-wide bg-sand/40 border-b border-sand">
            <span>{dayLabel(g.day)}</span>
            <span className="tabular-nums">
              {formatPeso(g.items.reduce((s, e) => s + e.amountCents, 0))}
            </span>
          </div>
          <div className="divide-y divide-sand">
            {g.items.map((e) => (
              <div
                key={e.id}
                className={`px-4 py-2.5 flex items-center gap-3 ${editingId === e.id ? "bg-brass/10" : ""}`}
              >
                <span className="flex-1 min-w-0 break-words">{e.description}</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    e.paymentMethod === "qr" ? "bg-mocha/15 text-mocha" : "bg-sage/15 text-sage"
                  }`}
                >
                  {e.paymentMethod === "qr" ? "QR" : "Cash"}
                </span>
                <span className="font-semibold tabular-nums whitespace-nowrap">
                  {formatPeso(e.amountCents)}
                </span>
                <button
                  onClick={() => edit(e)}
                  className="text-xs font-black uppercase tracking-wide px-2.5 py-1 border border-ink hover:bg-ink hover:text-white transition-colors"
                >
                  Edit
                </button>
                <button onClick={() => setDeleting(e)} className="text-xs text-mocha/70 hover:text-red-600">
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {deleting && (
        <ConfirmModal
          title="Delete expense?"
          onConfirm={() => remove(deleting)}
          onClose={() => setDeleting(null)}
        >
          {deleting.description} · {formatPeso(deleting.amountCents)}
        </ConfirmModal>
      )}
    </div>
  );
}
