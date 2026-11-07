"use client";

import { useEffect, useState } from "react";
import { formatPeso } from "@/lib/money";
import { orderLabel } from "@/lib/orderLabel";
import MilkPicker from "@/app/MilkPicker";
import { CARD_ENABLED } from "@/lib/flags";

// Staff fix-ups on an active order: name, payment type, quantities, removing
// lines and adding items from the menu. Every change saves right away (stock follows) and the
// board refreshes behind it. Paid orders can be edited too; the footer shows
// how much to collect or refund.
export default function EditOrderModal({ order, onChanged, onClose: close }) {
  const [menu, setMenu] = useState([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false); // brief "Saved" after each change
  const [edited, setEdited] = useState(false); // any change made, for the board's toast
  const [picking, setPicking] = useState(null); // milk drink awaiting dairy/oat
  // Total when the editor opened, to show the difference on paid orders.
  const [startTotal] = useState(order.totalCents);
  const [wasPaid] = useState(!!order.paidAt);
  // Counter orders keep the name on their hidden table; QR orders on the order.
  const isCounter = !!order.table?.slug?.startsWith("counter-");
  const savedName = (isCounter ? order.table?.label : order.customerName) || "";
  const [name, setName] = useState(savedName);
  const method = order.paidAt ? order.paymentMethod || "cash" : "unpaid";

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => (r.ok ? r.json() : { menu: [] }))
      .then((d) => setMenu(d.menu || []))
      .catch(() => {});
  }, []);

  async function run(request) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await request();
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Could not save the change.");
      } else {
        setEdited(true);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
      await onChanged();
      // Stock counts may have moved; reload the add list.
      const m = await fetch("/api/menu").then((r) => (r.ok ? r.json() : null));
      if (m) setMenu(m.menu || []);
    } finally {
      setBusy(false);
    }
  }

  const json = (method, body) => ({
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const setQty = (it, qty) =>
    run(() => fetch(`/api/order-items/${it.id}`, json("PATCH", { qty })));
  const remove = (it) =>
    run(() => fetch(`/api/order-items/${it.id}?edit=1`, { method: "DELETE" }));
  const setMethod = (paymentMethod) =>
    paymentMethod !== method &&
    run(() => fetch(`/api/orders/${order.id}`, json("PATCH", { action: "details", paymentMethod })));
  const add = (menuItemId, milk = null) =>
    run(() => fetch(`/api/orders/${order.id}/items`, json("POST", { menuItemId, qty: 1, milk })));

  // Tell the board whether anything changed so it can confirm the edit.
  const onClose = () => close(edited);

  // Done saves a changed name, then closes. Other changes already saved.
  async function done() {
    if (busy) return;
    const changed = name.trim() !== savedName;
    if (!changed) return onClose();
    if (!name.trim()) {
      setError("Enter a name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${order.id}`, json("PATCH", { action: "details", name }));
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Could not save the name.");
        return;
      }
      await onChanged();
      close(true);
    } finally {
      setBusy(false);
    }
  }

  const q = query.trim().toLowerCase();
  const results = menu
    .map((c) => ({ ...c, items: c.items.filter((i) => !q || i.name.toLowerCase().includes(q)) }))
    .filter((c) => c.items.length);

  const paid = !!order.paidAt;
  const diff = order.totalCents - startTotal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-cream border border-ink w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-4 py-3 flex items-center justify-between border-b border-ink bg-white">
          <h3 className="font-black uppercase tracking-tight">
            Edit order #{order.id} · {orderLabel(order)}
          </h3>
          <button onClick={onClose} className="text-mocha/50 text-2xl leading-none" aria-label="Close">
            ×
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-5">
          {/* Name + payment type */}
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.15em] text-brass-dark">Details</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 40))}
              placeholder="Customer name"
              className="w-full border border-ink px-3 py-2 text-sm bg-white focus:outline-none focus:border-brass"
            />
            <div className="flex gap-2">
              {[
                ["unpaid", "Unpaid"],
                ["cash", "💵 Cash"],
                ["qr", "📱 QR"],
                ["card", "💳 Card"],
              ]
                .filter(([v]) => v !== "card" || CARD_ENABLED || method === "card")
                .map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setMethod(v)}
                    disabled={busy}
                    className={`flex-1 py-2 text-xs font-black uppercase tracking-wide border disabled:opacity-60 ${
                      method === v
                        ? v === "unpaid"
                          ? "bg-amber-100 text-amber-800 border-amber-600"
                          : "bg-ink text-white border-ink"
                        : "bg-white border-ink text-ink"
                    }`}
                  >
                    {l}
                  </button>
                ))}
            </div>
            <p className="text-[11px] text-mocha/60">
              Picking Cash or QR marks it paid. Unpaid sends it back to be billed.
            </p>
          </div>

          {/* Current lines */}
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-brass-dark mb-2">Items</div>
            <div className="bg-white border border-ink divide-y divide-sand">
              {order.items.map((it) => (
                <div key={it.id} className="flex items-center gap-2 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{it.name}</div>
                    <div className="text-xs text-mocha">
                      {formatPeso(it.priceCents)}
                      {it.status !== "placed" && <span className="capitalize"> · {it.status}</span>}
                    </div>
                  </div>
                  <div className="flex items-center border border-ink">
                    <button
                      onClick={() => setQty(it, it.qty - 1)}
                      disabled={busy || it.qty <= 1}
                      className="w-8 h-8 text-lg leading-none disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="w-7 text-center font-bold tabular-nums">{it.qty}</span>
                    <button
                      onClick={() => setQty(it, it.qty + 1)}
                      disabled={busy}
                      className="w-8 h-8 text-lg leading-none bg-ink text-white disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                  <span className="w-20 text-right text-sm tabular-nums">
                    {formatPeso(it.priceCents * it.qty)}
                  </span>
                  <button
                    onClick={() => remove(it)}
                    disabled={busy}
                    title="Remove item"
                    className="w-7 h-7 grid place-items-center text-mocha/40 hover:text-red-600 text-lg leading-none disabled:opacity-30"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add from the menu (available, in-stock items) */}
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-brass-dark mb-2">Add items</div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search menu…"
              className="w-full border border-ink px-3 py-2 text-sm bg-white mb-2 focus:outline-none focus:border-brass"
            />
            <div className="bg-white border border-ink max-h-64 overflow-y-auto">
              {results.length === 0 && (
                <p className="text-sm text-mocha/70 text-center py-4">No items match.</p>
              )}
              {results.map((c) => (
                <div key={c.id}>
                  <div className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wide bg-sand/40">
                    {c.name}
                  </div>
                  {c.items.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => (i.milkOption ? setPicking(i) : add(i.id))}
                      disabled={busy}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left border-t border-sand/50 hover:bg-sand/30 disabled:opacity-50"
                    >
                      <span className="flex-1 truncate">{i.name}</span>
                      {i.stock !== null && i.stock !== undefined && (
                        <span className="text-[11px] text-mocha/60">{i.stock} left</span>
                      )}
                      <span className="text-sm tabular-nums text-mocha">{formatPeso(i.priceCents)}</span>
                      <span className="text-xs font-black text-emerald-700">+ Add</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-ink bg-white p-4 space-y-2">
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">{error}</p>
          )}
          {saved && !error && (
            <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2">
              ✓ Saved
            </p>
          )}
          {wasPaid && paid && diff !== 0 && (
            <p className="text-sm bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2">
              Already paid.{" "}
              {diff > 0
                ? `Collect ${formatPeso(diff)} more from the customer.`
                : `Give back ${formatPeso(-diff)} to the customer.`}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-mocha">Total</span>
            <span className="font-black text-xl tabular-nums">{formatPeso(order.totalCents)}</span>
          </div>
          <button
            onClick={done}
            disabled={busy}
            className="w-full py-3 bg-ink text-white font-black uppercase tracking-wide text-sm hover:bg-espresso-light transition-colors disabled:opacity-60"
          >
            {busy ? "Saving…" : "Done"}
          </button>
        </div>
      </div>

      {picking && (
        <MilkPicker
          item={picking}
          onPick={(milk) => {
            const id = picking.id;
            setPicking(null);
            add(id, milk);
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
}
