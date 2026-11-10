"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPeso } from "@/lib/money";
import { CARD_ENABLED } from "@/lib/flags";
import MilkPicker from "@/app/MilkPicker";
import { cartKey, parseCartKey, milkExtra, milkLineName } from "@/lib/milk";
import { discountCents, discountLabel } from "@/lib/discount";
import DiscountFields, { NO_DISCOUNT } from "../DiscountFields";

// Display names for the tender chosen at the counter.
const METHOD_LABEL = { cash: "Cash", card: "Card", qr: "QR" };

// Staff-facing counter / bar order entry. Builds a cart from the menu and rings
// it up as a standalone order (its own hidden table) that appears on the board.
export default function CounterOrder({ menu }) {
  const router = useRouter();
  const [cart, setCart] = useState({}); // { [cartKey]: qty }, key "id" or "id:milk"
  const [picking, setPicking] = useState(null); // milk drink awaiting dairy/oat choice
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
  const [cashOpen, setCashOpen] = useState(false); // cash tendered/change step before placing
  const [discount, setDiscount] = useState(NO_DISCOUNT); // senior / PWD

  const itemsById = useMemo(() => {
    const m = {};
    menu.forEach((c) => c.items.forEach((i) => (m[i.id] = i)));
    return m;
  }, [menu]);

  const lines = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([key, qty]) => {
      const { id, milk } = parseCartKey(key);
      const item = itemsById[id];
      if (!item) return null;
      return {
        key,
        item,
        milk,
        qty,
        name: milkLineName(item.name, milk),
        priceCents: item.priceCents + milkExtra(milk),
      };
    })
    .filter(Boolean);
  const subtotal = lines.reduce((s, l) => s + l.priceCents * l.qty, 0);
  const discountOff = discountCents(subtotal, discount);
  const total = subtotal - discountOff;
  const count = lines.reduce((s, l) => s + l.qty, 0);

  // Cash tendered + change, entered in the cash step before the order is placed.
  const isCash = payMethod === "cash";
  const receivedNum = received === "" ? NaN : Number(received);
  const receivedCents = Number.isFinite(receivedNum) ? Math.round(receivedNum * 100) : null;
  const changeCents = receivedCents === null ? null : receivedCents - total;
  const short = changeCents !== null && changeCents < 0;
  // Quick-tap bills: the common notes that cover the total.
  const quickBills = [100, 200, 500, 1000].filter((b) => b * 100 >= total).slice(0, 4);
  // Pay later: the order goes to the board unpaid and is billed there.
  const isLater = payMethod === "later";
  // Every counter order needs a name so staff can call it out on the board.
  const nameMissing = !name.trim();

  const setQty = (key, qty) => setCart((c) => ({ ...c, [key]: Math.max(0, Math.min(50, qty)) }));
  // How many of an item are in the cart across milk choices.
  const itemQty = (id) => lines.filter((l) => l.item.id === id).reduce((s, l) => s + l.qty, 0);
  function pickMilk(milk) {
    const key = cartKey(picking.id, milk);
    setCart((c) => ({ ...c, [key]: Math.min(50, (c[key] || 0) + 1) }));
    setPicking(null);
  }
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

  // Cash opens the tendered/change step first; QR and pay later place right away.
  function checkout() {
    if (!count || busy || nameMissing) return;
    if (isCash) {
      setReceived("");
      setCashOpen(true);
    } else {
      placeOrder();
    }
  }

  async function placeOrder() {
    if (!count || busy || nameMissing) return;
    if (isCash && (receivedCents === null || short)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/staff-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: name,
          note,
          paymentMethod: isLater ? null : payMethod,
          discount: discount.type ? discount : null,
          cart: lines.map((l) => ({ menuItemId: l.item.id, qty: l.qty, milk: l.milk })),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        router.refresh(); // pick up the new stock counts
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
        setCashOpen(false);
        setCart({});
        setName("");
        setNote("");
        setDiscount(NO_DISCOUNT);
        setShowCart(true);
      } else {
        setCashOpen(false);
        show(d.error || "Could not place the order.", "err");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    // Wide screens: menu on the left, checkout panel on the right. Phones keep
    // the checkout as a bar fixed to the bottom.
    <div className="p-4 max-w-4xl lg:max-w-7xl mx-auto pb-44 lg:pb-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6 lg:items-start">
      <div className="min-w-0">
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
              const qty = it.milkOption ? itemQty(it.id) : cart[it.id] || 0;
              // Food with stock: show what's left and stop at it.
              const tracked = it.stock !== null && it.stock !== undefined;
              const soldOut = tracked && it.stock <= 0;
              const atMax = tracked && qty >= it.stock;
              return (
                <div
                  key={it.id}
                  className={`flex items-center gap-3 border p-3 bg-white ${
                    qty > 0 ? "border-ink ring-1 ring-ink/20" : "border-sand"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{it.name}</div>
                    <div className="text-sm text-mocha">
                      {formatPeso(it.priceCents)}
                      {tracked && (
                        <span
                          className={`ml-2 text-xs font-bold ${
                            soldOut ? "text-red-600" : it.stock <= 3 ? "text-amber-700" : "text-mocha/60"
                          }`}
                        >
                          {soldOut ? "Sold out" : `${it.stock} left`}
                        </span>
                      )}
                    </div>
                  </div>
                  {soldOut && !qty ? (
                    <span className="px-3 py-1.5 border border-sand text-mocha/50 text-xs font-black uppercase tracking-wide">
                      Sold out
                    </span>
                  ) : it.milkOption ? (
                    // Milk drinks: each Add asks dairy or oat; remove in the order list.
                    <button
                      onClick={() => setPicking(it)}
                      className="px-3 py-1.5 bg-ink text-white text-xs font-black uppercase tracking-wide"
                    >
                      {qty > 0 ? `Add · ${qty}` : "Add"}
                    </button>
                  ) : qty > 0 ? (
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
                        disabled={atMax}
                        className="w-8 h-8 rounded-full bg-espresso text-cream text-lg leading-none disabled:opacity-30"
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

      </div>

      {/* Checkout: bottom bar on phones, sticky side panel on wide screens */}
      <div className="fixed bottom-0 inset-x-0 z-20 bg-cream/95 backdrop-blur border-t border-sand print:hidden lg:sticky lg:top-4 lg:bottom-auto lg:inset-x-auto lg:z-auto lg:bg-white lg:backdrop-blur-none lg:border lg:border-ink lg:flex lg:flex-col lg:h-[calc(100vh-6rem)]">
        {/* Order lines: toggled on phones, always shown on the side panel */}
        <div
          className={`max-w-4xl mx-auto px-3 pt-3 max-h-[40vh] overflow-y-auto lg:max-w-none lg:mx-0 lg:w-full lg:px-4 lg:pt-4 lg:max-h-none lg:flex-1 lg:min-h-0 ${
            showCart && count > 0 ? "" : "hidden"
          } lg:block`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-[0.15em] text-brass-dark">
              Order{count > 0 ? ` · ${count} item${count === 1 ? "" : "s"}` : ""}
            </span>
            {count > 0 && (
              <button onClick={clearCart} className="text-xs text-red-600 hover:underline">
                Clear all
              </button>
            )}
          </div>
          {count === 0 && (
            <p className="hidden lg:block text-sm text-mocha/60 py-6 text-center">
              Tap items on the left to start an order.
            </p>
          )}
          <div className="space-y-1.5">
            {lines.map((l) => (
              <div key={l.key} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">
                  <span className="font-medium">{l.qty}×</span> {l.name}
                </span>
                <span className="tabular-nums">{formatPeso(l.priceCents * l.qty)}</span>
                <button
                  onClick={() => setQty(l.key, l.qty - 1)}
                  className="text-mocha/40 hover:text-red-600 leading-none text-lg"
                  title="Remove one"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-3 space-y-2 lg:max-w-none lg:mx-0 lg:w-full lg:p-4 lg:space-y-3 lg:border-t lg:border-sand">
          {/* Total (side panel only; phones show it on the Place button) */}
          {discountOff > 0 && (
            <div className="hidden lg:block text-sm space-y-0.5">
              <div className="flex justify-between text-mocha">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatPeso(subtotal)}</span>
              </div>
              <div className="flex justify-between text-brass-dark">
                <span>
                  {discountLabel(discount.type)} 20%
                  {discount.party > 1 && ` (${discount.count} of ${discount.party})`}
                </span>
                <span className="tabular-nums">−{formatPeso(discountOff)}</span>
              </div>
            </div>
          )}
          <div className="hidden lg:flex items-baseline justify-between">
            <span className="text-mocha">Total</span>
            <span className="font-black text-2xl tabular-nums">{formatPeso(total)}</span>
          </div>
          <div className="flex flex-wrap gap-2 lg:flex-col">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Customer name (required)"
              className="flex-1 min-w-[140px] border border-ink px-3 py-2 text-sm bg-white focus:outline-none focus:border-brass"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note for kitchen (optional)"
              className="flex-1 min-w-[140px] border border-ink px-3 py-2 text-sm bg-white focus:outline-none focus:border-brass"
            />
          </div>
          <DiscountFields value={discount} onChange={setDiscount} />
          {/* Payment choice: pay now, or pay later (billed from the board) */}
          <div className="flex gap-2">
            {[
              ["cash", "💵 Cash"],
              ["card", "💳 Card"],
              ["qr", "📱 QR"],
              ["later", "🕒 Pay later"],
            ]
              .filter(([v]) => v !== "card" || CARD_ENABLED)
              .map(([v, l]) => (
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
          <div className="flex gap-2">
            <button
              onClick={() => setShowCart((v) => !v)}
              disabled={!count}
              className="lg:hidden px-3 py-3 border border-ink text-sm font-black uppercase tracking-wide disabled:opacity-40 whitespace-nowrap hover:bg-ink hover:text-white transition-colors"
            >
              {showCart ? "Hide" : "Review"} ({count})
            </button>
            <button
              onClick={checkout}
              disabled={!count || busy || nameMissing}
              className="flex-1 py-3 bg-emerald-600 text-white font-black uppercase tracking-wide disabled:opacity-40"
            >
              {busy
                ? "Placing…"
                : !count
                ? "Add items to start"
                : nameMissing
                ? "Enter the customer's name"
                : isLater
                ? `Place · pay later · ${formatPeso(total)}`
                : isCash
                ? `Pay cash · ${formatPeso(total)}`
                : `Place & pay ${METHOD_LABEL[payMethod] || payMethod} · ${formatPeso(total)}`}
            </button>
          </div>
        </div>
      </div>

      {picking && (
        <MilkPicker item={picking} onPick={pickMilk} onClose={() => setPicking(null)} />
      )}

      {cashOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !busy && setCashOpen(false)} />
          <div className="relative bg-white border border-ink w-full max-w-sm p-6">
            <div className="text-xs uppercase tracking-[0.15em] text-brass-dark">Cash payment</div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-mocha">
                {name.trim()}
                {discountOff > 0 && ` · ${discountLabel(discount.type)} −${formatPeso(discountOff)}`}
              </span>
              <span className="font-black text-3xl text-espresso tabular-nums">{formatPeso(total)}</span>
            </div>

            <label className="mt-5 flex items-center border-2 border-ink focus-within:border-brass">
              <span className="pl-3 text-mocha">Received ₱</span>
              <input
                value={received}
                onChange={(e) => setReceived(e.target.value.replace(/[^\d.]/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && placeOrder()}
                inputMode="decimal"
                autoFocus
                placeholder="0"
                className="flex-1 min-w-0 px-2 py-3 text-2xl font-bold tabular-nums focus:outline-none"
              />
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => setReceived(String(total / 100))}
                className="flex-1 px-3 py-2 border border-ink text-xs font-black uppercase tracking-wide hover:bg-ink hover:text-white transition-colors"
              >
                Exact
              </button>
              {quickBills.map((b) => (
                <button
                  key={b}
                  onClick={() => setReceived(String(b))}
                  className="flex-1 px-3 py-2 border border-ink text-xs font-black tabular-nums hover:bg-ink hover:text-white transition-colors"
                >
                  ₱{b}
                </button>
              ))}
            </div>

            <div className="mt-5 border-t border-sand pt-4 text-center">
              <div className="text-xs uppercase tracking-[0.15em] text-brass-dark">
                {short ? "Short" : "Change"}
              </div>
              <div
                className={`font-black text-4xl tabular-nums ${
                  changeCents === null ? "text-mocha/30" : short ? "text-red-600" : "text-emerald-700"
                }`}
              >
                {changeCents === null ? "—" : formatPeso(Math.abs(changeCents))}
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setCashOpen(false)}
                disabled={busy}
                className="flex-1 py-3 border border-ink text-sm font-black uppercase tracking-wide text-ink hover:bg-ink hover:text-white transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={placeOrder}
                disabled={busy || receivedCents === null || short}
                className="flex-[2] py-3 bg-emerald-600 text-white text-sm font-black uppercase tracking-wide disabled:opacity-40"
              >
                {busy ? "Placing…" : "Confirm & place"}
              </button>
            </div>
          </div>
        </div>
      )}

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