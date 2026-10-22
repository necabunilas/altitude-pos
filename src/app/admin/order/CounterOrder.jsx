"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatPeso } from "@/lib/money";

// Display names for the tender chosen at the counter.
const METHOD_LABEL = { cash: "Cash", card: "Card", qr: "QR" };

// Staff-facing counter / bar order entry. Builds a cart from the menu and rings
// it up as a standalone order (its own hidden table) that appears on the board.
export default function CounterOrder({ menu }) {
  const [cart, setCart] = useState({}); // { [itemId]: qty }
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [placed, setPlaced] = useState(null);
  const [activeCat, setActiveCat] = useState("all");
  const [query, setQuery] = useState("");
  const [showCart, setShowCart] = useState(true);
  const [payMethod, setPayMethod] = useState("cash"); // "cash" | "card" | "later"
  const [received, setReceived] = useState(""); // cash handed over, in pesos

  const itemsById = useMemo(() => {
    const m = {};
    menu.forEach((c) => c.items.forEach((i) => (m[i.id] = i)));
    return m;
  }, [menu]);

  const lines = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([id, qty]) => ({ item: itemsById[Number(id)], qty }))
    .filter((l) => l.item);
  const total = lines.reduce((s, l) => s + l.item.priceCents * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  // Cash tendered + change. Blank means exact amount.
  const isCash = payMethod === "cash";
  const receivedNum = received === "" ? NaN : Number(received);
  const receivedCents = Number.isFinite(receivedNum) ? Math.round(receivedNum * 100) : null;
  const changeCents = receivedCents === null ? null : receivedCents - total;
  const short = isCash && changeCents !== null && changeCents < 0;
  // Quick-tap bills: the common notes that cover the total.
  const quickBills = [100, 200, 500, 1000].filter((b) => b * 100 >= total).slice(0, 3);

  const setQty = (id, qty) => setCart((c) => ({ ...c, [id]: Math.max(0, Math.min(50, qty)) }));
  const clearCart = () => {
    setCart({});
    setShowCart(true);
  };

  // Menu filtered by the active category chip and the search box.
  const q = query.trim().toLowerCase();
  const visible = menu
    .filter((c) => activeCat === "all" || c.id === activeCat)
    .map((c) => ({
      ...c,
      items: c.items.filter((i) => !q || i.name.toLowerCase().includes(q)),
    }))
    .filter((c) => c.items.length);

  function show(msg, kind = "ok") {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3000);
  }

  async function placeOrder() {
    if (!count || busy || short) return;
    setBusy(true);
    try {
      const res = await fetch("/api/staff-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: name,
          note,
          paymentMethod: payMethod,
          cart: lines.map((l) => ({ menuItemId: l.item.id, qty: l.qty })),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setPlaced({
          orderId: d.orderId,
          label: d.label,
          total,
          count,
          method: d.method,
          receivedCents: isCash ? receivedCents : null,
          changeCents: isCash ? changeCents : null,
        });
        setReceived("");
        setCart({});
        setName("");
        setNote("");
        setShowCart(true);
      } else {
        show(d.error || "Could not place the order.", "err");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 max-w-4xl mx-auto pb-44">
      <div className="flex items-center gap-2 mb-3">
        <h1 className="font-display text-3xl text-espresso mr-auto">Counter order</h1>
        <Link href="/admin" className="text-sm text-mocha hover:text-espresso">
          View board →
        </Link>
      </div>

      {/* Search */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search menu…"
        className="w-full border border-ink px-4 py-3 text-base bg-white mb-3 focus:outline-none focus:border-brass"
      />

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
        <Chip active={activeCat === "all"} onClick={() => setActiveCat("all")}>
          All
        </Chip>
        {menu.map((c) => (
          <Chip key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>
            {c.name}
          </Chip>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="text-mocha/70 py-10 text-center">No items match.</p>
      )}

      {visible.map((cat) => (
        <div key={cat.id} className="mb-6">
          <h2 className="font-display text-xl text-espresso mb-3">{cat.name}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {cat.items.map((it) => {
              const qty = cart[it.id] || 0;
              return (
                <div
                  key={it.id}
                  className={`flex items-center gap-3 border p-3 bg-white ${
                    qty > 0 ? "border-ink ring-1 ring-ink/20" : "border-sand"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{it.name}</div>
                    <div className="text-sm text-mocha">{formatPeso(it.priceCents)}</div>
                  </div>
                  {qty > 0 ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQty(it.id, qty - 1)}
                        className="w-8 h-8 rounded-full border border-sand text-lg leading-none"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-semibold">{qty}</span>
                      <button
                        onClick={() => setQty(it.id, qty + 1)}
                        className="w-8 h-8 rounded-full bg-espresso text-cream text-lg leading-none"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setQty(it.id, 1)}
                      className="px-3 py-1.5 bg-ink text-white text-xs font-black uppercase tracking-wide"
                    >
                      Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Sticky checkout bar */}
      <div className="fixed bottom-0 inset-x-0 z-20 bg-cream/95 backdrop-blur border-t border-sand print:hidden">
        {/* Expandable order review */}
        {showCart && count > 0 && (
          <div className="max-w-4xl mx-auto px-3 pt-3 max-h-[40vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-[0.15em] text-brass-dark">Order</span>
              <button onClick={clearCart} className="text-xs text-red-600 hover:underline">
                Clear all
              </button>
            </div>
            <div className="space-y-1.5">
              {lines.map((l) => (
                <div key={l.item.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">
                    <span className="font-medium">{l.qty}×</span> {l.item.name}
                  </span>
                  <span className="tabular-nums">{formatPeso(l.item.priceCents * l.qty)}</span>
                  <button
                    onClick={() => setQty(l.item.id, 0)}
                    className="text-mocha/40 hover:text-red-600 leading-none text-lg"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto p-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Customer name (optional)"
              className="flex-1 min-w-[140px] border border-ink px-3 py-2 text-sm bg-white focus:outline-none focus:border-brass"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note for kitchen (optional)"
              className="flex-1 min-w-[140px] border border-ink px-3 py-2 text-sm bg-white focus:outline-none focus:border-brass"
            />
          </div>
          {/* Payment choice (counter is pay-first) */}
          <div className="flex gap-2">
            {[
              ["cash", "💵 Cash"],
              ["card", "💳 Card"],
              ["qr", "📱 QR"],
            ].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setPayMethod(v)}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-wide border ${
                  payMethod === v
                    ? "bg-ink text-white border-ink"
                    : "bg-white border-ink text-ink"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          {/* Cash received -> change to give back */}
          {isCash && count > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center border border-ink bg-white focus-within:border-brass">
                <span className="pl-3 text-sm text-mocha">Received ₱</span>
                <input
                  value={received}
                  onChange={(e) => setReceived(e.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  placeholder={(total / 100).toFixed(0)}
                  className="w-24 px-2 py-2 text-sm tabular-nums focus:outline-none"
                />
              </label>
              <button
                onClick={() => setReceived(String(total / 100))}
                className="px-3 py-2 border border-ink text-xs font-black uppercase tracking-wide hover:bg-ink hover:text-white transition-colors"
              >
                Exact
              </button>
              {quickBills.map((b) => (
                <button
                  key={b}
                  onClick={() => setReceived(String(b))}
                  className="px-3 py-2 border border-ink text-xs font-black tabular-nums hover:bg-ink hover:text-white transition-colors"
                >
                  ₱{b}
                </button>
              ))}
              {changeCents !== null && (
                <span
                  className={`ml-auto text-sm font-black tabular-nums ${
                    short ? "text-red-600" : "text-emerald-700"
                  }`}
                >
                  {short ? `Short ${formatPeso(-changeCents)}` : `Change ${formatPeso(changeCents)}`}
                </span>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setShowCart((v) => !v)}
              disabled={!count}
              className="px-3 py-3 border border-ink text-sm font-black uppercase tracking-wide disabled:opacity-40 whitespace-nowrap hover:bg-ink hover:text-white transition-colors"
            >
              {showCart ? "Hide" : "Review"} ({count})
            </button>
            <button
              onClick={placeOrder}
              disabled={!count || busy || short}
              className="flex-1 py-3 bg-emerald-600 text-white font-black uppercase tracking-wide disabled:opacity-40"
            >
              {busy
                ? "Placing…"
                : !count
                ? "Add items to start"
                : `Place & pay ${METHOD_LABEL[payMethod] || payMethod} · ${formatPeso(total)}`}
            </button>
          </div>
        </div>
      </div>

      {placed && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPlaced(null)} />
          <div className="relative bg-white border border-ink w-full max-w-xs p-6 text-center">
            <div className="text-5xl mb-2">✅</div>
            <h3 className="font-display text-2xl text-espresso">Order placed</h3>
            <div className="mt-1 text-mocha">
              Order #{placed.orderId}
              {placed.label ? ` · ${placed.label}` : ""}
            </div>
            <div className="mt-3 font-semibold text-3xl text-espresso">
              {formatPeso(placed.total)}
            </div>
            <p className="text-xs text-mocha/70 mt-1">
              {placed.count} item{placed.count === 1 ? "" : "s"} · sent to the board
            </p>
            <div
              className={`mt-3 inline-block text-sm px-3 py-1 rounded-full font-medium ${
                placed.method
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {placed.method
                ? `✓ Paid · ${METHOD_LABEL[placed.method] || "Cash"}`
                : "Unpaid · bill on the board"}
            </div>
            {placed.changeCents !== null && (
              <div className="mt-4 border-t border-sand pt-4">
                <div className="text-xs text-mocha/70 tabular-nums">
                  Received {formatPeso(placed.receivedCents)}
                </div>
                <div className="text-xs uppercase tracking-[0.15em] text-brass-dark mt-2">Change</div>
                <div className="font-black text-4xl text-emerald-700 tabular-nums">
                  {formatPeso(placed.changeCents)}
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-5">
              <Link
                href="/admin"
                className="flex-1 py-2.5 border border-ink text-sm font-black uppercase tracking-wide text-ink hover:bg-ink hover:text-white transition-colors"
              >
                View board
              </Link>
              <button
                onClick={() => setPlaced(null)}
                className="flex-1 py-2.5 bg-ink text-white text-sm font-black uppercase tracking-wide hover:bg-espresso-light transition-colors"
              >
                New order
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-40 inset-x-4 z-30 text-center text-sm px-4 py-3 shadow-lg ${
            toast.kind === "err" ? "bg-red-600 text-white" : "bg-sage text-cream"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap px-5 py-2.5 text-sm font-black uppercase tracking-wide border transition-colors ${
        active
          ? "bg-mocha text-white border-mocha"
          : "bg-white text-ink border-ink hover:bg-sand"
      }`}
    >
      {children}
    </button>
  );
}