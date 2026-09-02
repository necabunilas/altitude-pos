"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatPeso } from "@/lib/money";
import BillModal from "./BillModal";
import { ReceiptModal } from "./Receipt";

const ORDER_COLOR = {
  placed: "bg-blue-100 text-blue-800",
  preparing: "bg-amber-100 text-amber-800",
  served: "bg-emerald-100 text-emerald-800",
};
const ITEM_COLOR = {
  placed: "text-blue-700",
  preparing: "text-amber-700",
  served: "text-emerald-700",
};
// Colored left spine on each order card so the board is scannable by state.
const CARD_ACCENT = {
  placed: "border-l-blue-500",
  preparing: "border-l-amber-500",
  served: "border-l-emerald-500",
};

function deriveStatus(items) {
  if (items.length && items.every((i) => i.status === "served")) return "served";
  if (items.some((i) => i.status === "preparing")) return "preparing";
  return "placed";
}

function since(ts) {
  const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function OrderBoard() {
  const [orders, setOrders] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [billTableId, setBillTableId] = useState(null);
  const [closed, setClosed] = useState([]);
  const [viewOrder, setViewOrder] = useState(null);
  const [closedSummary, setClosedSummary] = useState({ count: 0, revenueCents: 0 });
  const [showClosed, setShowClosed] = useState(false);
  // Count of in-flight mutations. The background poll stands down while > 0 so
  // it can't revert an optimistic update with stale data mid-request.
  const mutating = useRef(0);

  const refresh = useCallback(async (force = false) => {
    if (mutating.current > 0 && !force) return;
    const d = await fetch("/api/board")
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
    if (mutating.current > 0 && !force) return; // a mutation started meanwhile
    setOrders(d.orders || []);
    setCalls(d.calls || []);
    setClosed(d.closed || []);
    setClosedSummary(d.closedSummary || { count: 0, revenueCents: 0 });
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  // Run a mutation with the poll paused; reconcile once all settle.
  async function mutate(optimistic, request) {
    mutating.current++;
    if (optimistic) patchLocal(optimistic);
    try {
      await request();
    } finally {
      mutating.current--;
      if (mutating.current === 0) refresh(true);
    }
  }

  const billOrders = orders.filter((o) => o.tableId === billTableId);
  const billTable = billOrders[0]?.table || null;
  // How the guest said they'd pay (from their bill request), if any.
  const billCall = calls.find((c) => c.type === "bill" && c.table?.id === billTableId);
  const requestedMethod = billCall?.paymentMethod || null;
  // Show the longest-waiting orders first (kitchen FIFO).
  const activeOrders = [...orders].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  // Optimistically patch an order's items in local state so the buttons react
  // instantly, then reconcile with the server.
  function patchLocal(apply) {
    setOrders((prev) =>
      prev.map((o) => {
        const items = apply(o);
        if (items === o.items) return o;
        return { ...o, status: deriveStatus(items), items };
      })
    );
  }

  function setItemStatus(itemId, status) {
    return mutate(
      (o) =>
        o.items.some((it) => it.id === itemId)
          ? o.items.map((it) => (it.id === itemId ? { ...it, status } : it))
          : o.items,
      () =>
        fetch(`/api/order-items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
    );
  }

  function voidItem(itemId) {
    if (!confirm("Void this item?")) return;
    return mutate(
      (o) => {
        const next = o.items.filter((it) => it.id !== itemId);
        return next.length === o.items.length ? o.items : next;
      },
      () => fetch(`/api/order-items/${itemId}`, { method: "DELETE" })
    );
  }

  function cancel(order) {
    if (!confirm("Cancel the whole order?")) return;
    return mutate(null, () =>
      fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      })
    );
  }

  function resolveCall(id) {
    return mutate(null, () => fetch(`/api/calls/${id}`, { method: "PATCH" }));
  }

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      {/* Call alerts */}
      {calls.length > 0 && (
        <div className="space-y-2">
          {calls.map((c) => (
            <div
              key={c.id}
              className={`px-4 py-3 flex items-center justify-between border border-ink ${
                c.type === "bill" ? "bg-sage text-cream" : "bg-honey text-espresso"
              }`}
            >
              <div className="font-medium">
                {c.type === "bill"
                  ? `🧾 Bill requested${c.paymentMethod ? ` (${c.paymentMethod})` : ""}`
                  : "🙋 Waiter called"}{" "}
                · {c.table?.label || "Unknown"}
                <span className="opacity-70 text-sm ml-2">{since(c.createdAt)}</span>
              </div>
              <div className="flex gap-2">
                {c.type === "bill" && c.table && (
                  <button
                    onClick={() => setBillTableId(c.table.id)}
                    className="text-xs px-3 py-1.5 bg-white text-ink font-black uppercase tracking-wide"
                  >
                    View bill
                  </button>
                )}
                <button
                  onClick={() => resolveCall(c.id)}
                  className="text-xs px-3 py-1.5 bg-white/90 text-ink font-black uppercase tracking-wide"
                >
                  Resolve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-display text-2xl text-espresso">
        Active orders {loaded && `(${orders.length})`}
      </h2>

      {loaded && orders.length === 0 && (
        <p className="text-mocha/70 py-12 text-center">No active orders.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {activeOrders.map((order) => {
          const paid = !!order.paidAt;
          return (
            <div
              key={order.id}
              className={`bg-white border border-ink border-l-4 ${
                CARD_ACCENT[order.status] || "border-l-neutral-400"
              } p-4 flex flex-col`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{order.table?.label || "Table"}</span>
                <span className="text-xs text-mocha/70">
                  #{order.id} · {since(order.createdAt)}
                </span>
              </div>
              <span
                className={`self-start mt-1 text-xs px-2 py-0.5 rounded-full capitalize ${
                  ORDER_COLOR[order.status] || "bg-neutral-100 text-ink/80"
                }`}
              >
                {order.status}
              </span>

              <div className="mt-3 space-y-1.5 text-sm flex-1">
                {order.items.map((it) => (
                  <div key={it.id} className="flex items-center gap-2">
                    <span className="flex-1">
                      <span className="font-medium">{it.qty}×</span> {it.name}
                      {it.note && (
                        <span className="text-mocha/70 italic"> — {it.note}</span>
                      )}
                    </span>
                    {it.status === "served" ? (
                      <span className={`text-[11px] font-medium ${ITEM_COLOR.served}`}>
                        ✓ Served
                      </span>
                    ) : it.status === "preparing" ? (
                      <button
                        onClick={() => setItemStatus(it.id, "served")}
                        className="text-xs px-2 py-1 bg-emerald-600 text-white font-black uppercase tracking-wide"
                      >
                        Serve
                      </button>
                    ) : (
                      <button
                        onClick={() => setItemStatus(it.id, "preparing")}
                        className="text-xs px-2 py-1 bg-espresso text-cream font-black uppercase tracking-wide"
                      >
                        Prepare
                      </button>
                    )}
                    {!paid && (
                      <button
                        onClick={() => voidItem(it.id)}
                        title="Void item"
                        className="text-mocha/40 hover:text-red-600 leading-none text-lg"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {order.note && (
                <p className="text-sm text-amber-700 bg-amber-50 px-2 py-1 mt-2">
                  Note: {order.note}
                </p>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-sand/60">
                <span className="font-semibold">{formatPeso(order.totalCents)}</span>
                <div className="flex gap-2 items-center">
                  {!paid && (
                    <button
                      onClick={() => cancel(order)}
                      className="text-sm text-mocha/70 hover:text-red-600"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={() => setBillTableId(order.tableId)}
                    className={`text-xs px-3 py-1.5 text-white font-black uppercase tracking-wide ${
                      paid ? "bg-espresso" : "bg-emerald-600"
                    }`}
                  >
                    {paid ? "Close" : "Bill"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Closed / paid today — collapsed by default to keep active orders front-and-center */}
      {closedSummary.count > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setShowClosed((v) => !v)}
            className="w-full flex items-center gap-2 mb-3"
          >
            <h2 className="font-display text-2xl text-espresso">
              Closed today ({closedSummary.count}) · {formatPeso(closedSummary.revenueCents)}
            </h2>
            <span className={`text-mocha transition-transform ${showClosed ? "rotate-90" : ""}`}>
              ›
            </span>
          </button>
          {showClosed && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {closed.map((order) => (
              <button
                key={order.id}
                onClick={() => setViewOrder(order)}
                className="text-left bg-white border border-ink p-3 hover:border-brass transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">
                    {order.table?.label || "Table"}
                  </span>
                  <span className="text-xs text-mocha/70">
                    #{order.id} · {since(order.closedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-mocha">
                    {order.items.reduce((s, i) => s + i.qty, 0)} item(s) · paid
                  </span>
                  <span className="font-semibold">{formatPeso(order.totalCents)}</span>
                </div>
                <span className="text-xs text-mocha/70 underline">View receipt</span>
              </button>
            ))}
          </div>
          )}
        </div>
      )}

      {viewOrder && (
        <ReceiptModal order={viewOrder} onClose={() => setViewOrder(null)} />
      )}

      {billTableId && billTable && (
        <BillModal
          table={billTable}
          orders={billOrders}
          requestedMethod={requestedMethod}
          onClose={() => setBillTableId(null)}
          onPaid={() => refresh(true)}
          onSettled={() => {
            setBillTableId(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}