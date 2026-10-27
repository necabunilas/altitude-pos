"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPeso } from "@/lib/money";
import DeleteOrderModal from "../DeleteOrderModal";
import { orderLabel } from "@/lib/orderLabel";
import { ReceiptModal } from "../Receipt";

function fmt(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function todayStr() {
  return fmt(new Date());
}
// Quick-range presets: today, this week (Mon–today), this month (1st–today).
function presetRange(kind) {
  const now = new Date();
  const to = fmt(now);
  if (kind === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // back to Monday
    return { from: fmt(d), to };
  }
  if (kind === "month") {
    return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to };
  }
  return { from: to, to }; // today
}

// Convert a yyyy-mm-dd (local) to ISO instants for the day's start/end.
function dayRange(from, to) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T23:59:59.999`);
  return { from: start.toISOString(), to: end.toISOString() };
}

export default function SalesView() {
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const PAGE = 50;
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState({ count: 0, revenueCents: 0 });
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [preset, setPreset] = useState("today");
  const [deleting, setDeleting] = useState(null); // order awaiting delete confirmation

  function applyPreset(kind) {
    const r = presetRange(kind);
    setFrom(r.from);
    setTo(r.to);
    setPreset(kind);
  }

  // Fetch a page. `offset === 0` replaces the list; otherwise it appends.
  const fetchPage = useCallback(
    async (offset) => {
      setLoading(true);
      const { from: f, to: t } = dayRange(from, to);
      const res = await fetch(
        `/api/sales?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}&limit=${PAGE}&offset=${offset}`
      );
      if (res.ok) {
        const d = await res.json();
        setSales((prev) => (offset === 0 ? d.sales : [...prev, ...d.sales]));
        setSummary(d.summary);
        setHasMore(d.hasMore);
      }
      setLoading(false);
    },
    [from, to]
  );

  async function deleteOrder(order) {
    const res = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    // Reload so the totals and breakdowns drop the deleted order.
    if (res.ok) fetchPage(0);
    return { ok: res.ok, error: d.error };
  }

  // Reload from the start whenever the range changes.
  useEffect(() => {
    fetchPage(0);
  }, [fetchPage]);

  const presets = [
    { key: "today", label: "Today" },
    { key: "week", label: "This week" },
    { key: "month", label: "This month" },
  ];
  const avgCents = summary.count ? Math.round(summary.revenueCents / summary.count) : 0;

  function exportCsv() {
    const { from: f, to: t } = dayRange(from, to);
    const a = document.createElement("a");
    a.href = `/api/sales/export?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl text-espresso mr-auto">Sales</h1>
        <div className="inline-flex border border-ink overflow-hidden">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className={`text-xs font-black uppercase tracking-wide px-3 py-1.5 ${
                preset === p.key
                  ? "bg-ink text-white"
                  : "bg-white text-ink hover:bg-sand"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={exportCsv}
          disabled={summary.count === 0}
          className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wide px-3 py-1.5 border border-ink bg-white text-ink hover:bg-ink hover:text-white transition-colors disabled:opacity-50"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-mocha text-xs mb-1">From</span>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => {
              setFrom(e.target.value);
              setPreset("custom");
            }}
            className="border border-ink px-2 py-1.5 focus:outline-none focus:border-brass"
          />
        </label>
        <label className="text-sm">
          <span className="block text-mocha text-xs mb-1">To</span>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => {
              setTo(e.target.value);
              setPreset("custom");
            }}
            className="border border-ink px-2 py-1.5 focus:outline-none focus:border-brass"
          />
        </label>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-ink p-4">
          <div className="text-xs uppercase tracking-[0.15em] text-brass-dark">Revenue</div>
          <div className="font-display text-3xl text-espresso mt-1">
            {formatPeso(summary.revenueCents)}
          </div>
          <div className="text-xs text-mocha mt-1.5">
            💵 Cash {formatPeso(summary.cashCents || 0)} · 💳 Card{" "}
            {formatPeso(summary.cardCents || 0)} · 📱 QR{" "}
            {formatPeso(summary.qrCents || 0)}
            {summary.otherCents ? ` · Other ${formatPeso(summary.otherCents)}` : ""}
          </div>
        </div>
        <div className="bg-white border border-ink p-4">
          <div className="text-xs uppercase tracking-[0.15em] text-brass-dark">Orders</div>
          <div className="font-display text-3xl text-espresso mt-1">{summary.count}</div>
          <div className="text-xs text-mocha mt-1.5">Avg {formatPeso(avgCents)} / order</div>
        </div>
      </div>

      {/* Food & drinks breakdown — revenue and units split by category, for
          accounting. Categories are grouped into drinks vs food. */}
      {(summary.categoryBreakdown?.length || 0) > 0 && (
        <div className="bg-white border border-ink">
          <div className="px-4 py-3 border-b border-sand">
            <h2 className="font-display text-xl text-espresso">Food &amp; drinks breakdown</h2>
          </div>
          <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-sand">
            <BreakdownGroup
              title="Drinks"
              accent="bg-mocha"
              total={summary.drinkCents || 0}
              rows={summary.categoryBreakdown.filter((c) => c.kind === "drink")}
            />
            <BreakdownGroup
              title="Food"
              accent="bg-sage"
              total={summary.foodCents || 0}
              rows={summary.categoryBreakdown.filter((c) => c.kind === "food")}
            />
          </div>
        </div>
      )}

      {!loading && sales.length === 0 && (
        <p className="text-mocha/70 py-10 text-center">No sales in this range.</p>
      )}

      {/* Sales list */}
      <div className="bg-white border border-ink divide-y divide-sand">
        {sales.map((order) => (
          <div key={order.id} className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium">
                {orderLabel(order)}{" "}
                <span className="text-mocha/70 font-normal">#{order.id}</span>
              </div>
              <div className="text-xs text-mocha truncate">
                {new Date(order.closedAt).toLocaleString("en-PH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}{" "}
                · {order.items.reduce((s, i) => s + i.qty, 0)} item(s)
              </div>
            </div>
            {order.paymentMethod && (
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  order.paymentMethod === "card"
                    ? "bg-brass/15 text-brass-dark"
                    : order.paymentMethod === "qr"
                    ? "bg-mocha/15 text-mocha"
                    : "bg-sage/15 text-sage"
                }`}
              >
                {order.paymentMethod === "card"
                  ? "Card"
                  : order.paymentMethod === "qr"
                  ? "QR"
                  : "Cash"}
              </span>
            )}
            <span className="font-semibold">{formatPeso(order.totalCents)}</span>
            <button
              onClick={() => setViewOrder(order)}
              className="text-xs font-black uppercase tracking-wide px-3 py-1.5 border border-ink hover:bg-ink hover:text-white transition-colors"
            >
              Receipt
            </button>
            <button
              onClick={() => setDeleting(order)}
              className="text-xs text-mocha/70 hover:text-red-600"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {(hasMore || loading) && sales.length > 0 && (
        <button
          onClick={() => fetchPage(sales.length)}
          disabled={loading}
          className="w-full py-2.5 border border-ink text-sm font-black uppercase tracking-wide text-ink hover:bg-ink hover:text-white transition-colors disabled:opacity-50"
        >
          {loading ? "Loading…" : `Load more (${sales.length} of ${summary.count})`}
        </button>
      )}

      {viewOrder && (
        <ReceiptModal order={viewOrder} onClose={() => setViewOrder(null)} />
      )}

      {deleting && (
        <DeleteOrderModal
          order={deleting}
          onConfirm={() => deleteOrder(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function BreakdownGroup({ title, accent, total, rows }) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2.5 h-2.5 ${accent}`} />
          <span className="font-black uppercase tracking-wide text-sm">{title}</span>
        </div>
        <span className="font-display text-lg text-espresso">{formatPeso(total)}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-mocha/60">No sales.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((c) => (
            <li
              key={c.category}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-ink">
                {c.category}{" "}
                <span className="text-mocha/60">· {c.qty} sold</span>
              </span>
              <span className="tabular-nums font-medium">
                {formatPeso(c.revenueCents)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}