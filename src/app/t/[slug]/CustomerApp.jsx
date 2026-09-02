"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatPeso } from "@/lib/money";
import { RESTAURANT_NAME } from "@/lib/brand";
import Footer from "@/app/Footer";
import { Star } from "@/app/Stars";

const ORDER_STATUS = {
  placed: { label: "Order received", color: "bg-sand text-espresso", step: 1 },
  preparing: { label: "Preparing", color: "bg-amber-100 text-amber-800", step: 2 },
  served: { label: "Served", color: "bg-emerald-100 text-emerald-800", step: 3 },
};

// Per-item preparation state, color-coded so the guest can see at a glance
// which items are still being made vs. already served.
const ITEM_STATUS_STYLE = {
  placed: { label: "Received", bar: "border-white/25", text: "text-white/55", dot: "bg-white/40" },
  preparing: { label: "Preparing", bar: "border-amber-400", text: "text-amber-300", dot: "bg-amber-400" },
  served: { label: "Served", bar: "border-emerald-400", text: "text-emerald-300", dot: "bg-emerald-400" },
};

export default function CustomerApp({ slug, table, menu }) {
  const [cart, setCart] = useState({}); // { [itemId]: qty }
  const [note, setNote] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [myOrders, setMyOrders] = useState([]);
  const [myTotal, setMyTotal] = useState(0);
  const [paidModal, setPaidModal] = useState(null);

  const order = myOrders[0] || null; // one active order per table
  const paid = !!order?.paidAt; // once paid, no more items can be added

  // Pop a "payment received" confirmation when the bill flips to paid — covers
  // both cash (staff marks paid) and card/QR (Maya callback). Only fires on a
  // real unpaid→paid transition, so reloading an already-paid table stays quiet.
  const prevPaid = useRef(null);
  useEffect(() => {
    if (prevPaid.current === false && paid && order) {
      setPaidModal({ total: myTotal, orderId: order.id });
      setBillOpen(false);
    }
    if (order) prevPaid.current = paid;
  }, [paid, order, myTotal]);

  const loadMyOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/my-orders?slug=${encodeURIComponent(slug)}`);
      if (res.ok) {
        const d = await res.json();
        setMyOrders(d.orders || []);
        setMyTotal(d.totalCents || 0);
      }
    } catch {
      /* ignore transient errors */
    }
  }, [slug]);

  // Poll the table's own order so status updates (preparing/served) show live.
  useEffect(() => {
    loadMyOrders();
    const id = setInterval(loadMyOrders, 5000);
    return () => clearInterval(id);
  }, [loadMyOrders]);

  const itemsById = useMemo(() => {
    const m = {};
    menu.forEach((c) => c.items.forEach((i) => (m[i.id] = i)));
    return m;
  }, [menu]);

  const lines = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([id, qty]) => ({ item: itemsById[Number(id)], qty }));
  const total = lines.reduce((s, l) => s + l.item.priceCents * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  function show(msg, kind = "ok") {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2500);
  }
  const setQty = (id, qty) => setCart((c) => ({ ...c, [id]: Math.max(0, qty) }));

  async function placeOrder() {
    if (!count || busy) return;
    if (paid) {
      show("Bill already paid.", "err");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          note,
          cart: lines.map((l) => ({ menuItemId: l.item.id, qty: l.qty })),
        }),
      });
      if (res.ok) {
        setCart({});
        setNote("");
        setCartOpen(false);
        show(order ? "Added to your order!" : "Order sent to the kitchen!");
        await loadMyOrders();
      } else {
        const d = await res.json().catch(() => ({}));
        show(d.error || "Something went wrong. Try again.", "err");
      }
    } catch {
      show("No connection. Please try again.", "err");
    } finally {
      setBusy(false);
    }
  }

  async function call(type, paymentMethod) {
    const res = await fetch("/api/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, type, paymentMethod }),
    });
    show(
      res.ok
        ? type === "bill"
          ? `Bill requested (${paymentMethod}). Staff are on the way.`
          : "A waiter has been called."
        : "Could not reach staff. Try again.",
      res.ok ? "ok" : "err"
    );
  }

  async function askBill(method) {
    setBillOpen(false);
    await call("bill", method);
  }

  const st = order ? ORDER_STATUS[order.status] || ORDER_STATUS.placed : null;

  return (
    <div className="min-h-screen bg-cream text-ink flex flex-col">
      <header className="px-4 pt-5 pb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-black uppercase tracking-tight text-3xl leading-none text-espresso">{RESTAURANT_NAME}</h1>
          <p className="text-[11px] tracking-[0.3em] uppercase text-brass-dark mt-1">
            Order &amp; pay from your table
          </p>
        </div>
        <span className="shrink-0 bg-ink text-white text-xs font-black uppercase tracking-wide px-3 py-1.5">
          {table.label}
        </span>
      </header>

      {/* Active-order ticket — a bold, dark kitchen-ticket panel that reads
          top-to-bottom like a printed order, distinct from a light card. */}
      {order && (
        <section className="mx-4 bg-ink text-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-white/50">
                Order #{order.id}
              </div>
              <div className="font-black uppercase tracking-tight text-2xl leading-none mt-1">
                {st.label}
              </div>
            </div>
            {paid ? (
              <span className="bg-brass text-ink text-[11px] font-black uppercase tracking-wide px-2.5 py-1">
                Paid
              </span>
            ) : (
              <span className="border border-white/30 text-[11px] font-black uppercase tracking-wide px-2.5 py-1">
                Live
              </span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-1.5">
            {[
              { n: 1, label: "Received" },
              { n: 2, label: "Preparing" },
              { n: 3, label: "Served" },
            ].map((s) => (
              <div key={s.n}>
                <div className={`h-1.5 ${s.n <= st.step ? "bg-brass" : "bg-white/15"}`} />
                <div
                  className={`mt-1.5 text-[9px] uppercase tracking-widest ${
                    s.n <= st.step ? "text-brass" : "text-white/30"
                  }`}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-2">
            {order.items.map((it) => {
              const s = ITEM_STATUS_STYLE[it.status] || ITEM_STATUS_STYLE.placed;
              return (
                <div
                  key={it.id}
                  className={`flex items-center gap-3 bg-white/[0.06] border-l-4 ${s.bar} pl-3 pr-3 py-2.5`}
                >
                  <span className="font-black text-brass text-lg w-8 shrink-0">
                    {it.qty}×
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold leading-tight truncate">{it.name}</div>
                    <div
                      className={`mt-1 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${s.text}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${s.dot} ${
                          it.status === "preparing" ? "animate-pulse" : ""
                        }`}
                      />
                      {s.label}
                    </div>
                  </div>
                  <span className="text-white/60 tabular-nums shrink-0">
                    {formatPeso(it.priceCents * it.qty)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-dashed border-white/25 flex items-baseline justify-between">
            <span className="text-[11px] uppercase tracking-[0.3em] text-white/50">Total</span>
            <span className="font-black text-2xl">{formatPeso(myTotal)}</span>
          </div>
        </section>
      )}

      {/* Quick service actions — compact, sharp, always available. */}
      <div className="grid grid-cols-3 gap-2 px-4 mt-4">
        <QuickAction icon="🙋" label="Call barista" onClick={() => call("waiter")} />
        <QuickAction
          icon="🧾"
          label={paid ? "Bill paid" : "Ask for bill"}
          onClick={() => setBillOpen(true)}
          disabled={!order || paid}
        />
        <QuickAction icon="⭐" label="Feedback" onClick={() => setFeedbackOpen(true)} />
      </div>

      {/* Sticky category rail — jump between sections on one continuous page. */}
      <nav className="sticky top-0 z-10 bg-cream/95 backdrop-blur border-y border-sand mt-5">
        <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
          {menu.map((cat) => (
            <a
              key={cat.id}
              href={`#cat-${cat.id}`}
              className="shrink-0 border border-ink/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide hover:bg-ink hover:text-white transition-colors"
            >
              {cat.name}
            </a>
          ))}
        </div>
      </nav>

      {/* Menu — one continuous editorial list; dividers instead of cards. */}
      <main className={`flex-1 px-4 ${count > 0 ? "pb-28" : "pb-6"}`}>
        {menu.map((cat) => (
          <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-16">
            <div className="flex items-center gap-3 mt-8 mb-1">
              <h2 className="font-display text-espresso text-2xl">{cat.name}</h2>
              <span className="text-[11px] font-black text-white bg-mocha px-2 py-0.5">
                {cat.items.length}
              </span>
              <span className="h-0.5 flex-1 bg-sand" />
            </div>
            <div className="divide-y divide-sand">
              {cat.items.map((item) => (
                <div key={item.id} className="py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-ink leading-tight">{item.name}</div>
                    {item.description && (
                      <div className="text-sm text-mocha/70 mt-0.5">{item.description}</div>
                    )}
                    <div className="mt-2 font-black text-brass-dark tabular-nums">
                      {formatPeso(item.priceCents)}
                    </div>
                  </div>
                  <Stepper
                    qty={cart[item.id] || 0}
                    onChange={(q) => setQty(item.id, q)}
                    disabled={paid}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
        {paid && (
          <p className="mt-6 text-center text-xs text-mocha">
            Bill already paid — start a new visit to order again.
          </p>
        )}
      </main>

      <Footer />

      {/* Floating cart bar — shows whenever items are selected. */}
      {count > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 inset-x-4 z-20 bg-brass text-ink px-5 py-4 flex items-center justify-between shadow-lg active:scale-[0.99] transition"
        >
          <span className="font-black uppercase tracking-wide text-sm">
            Review · {count} item{count > 1 ? "s" : ""}
          </span>
          <span className="font-black">{formatPeso(total)}</span>
        </button>
      )}

      {cartOpen && (
        <Sheet onClose={() => setCartOpen(false)} title={order ? "Add to your order" : "Your order"}>
          <div className="space-y-3">
            {lines.map((l) => (
              <div key={l.item.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium">{l.item.name}</div>
                  <div className="text-sm text-mocha">{formatPeso(l.item.priceCents)}</div>
                </div>
                <Stepper qty={l.qty} onChange={(q) => setQty(l.item.id, q)} />
              </div>
            ))}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Notes for the kitchen (allergies, no onions…)"
              className="w-full border border-ink p-2.5 text-sm focus:outline-none focus:border-brass"
              rows={2}
            />
            <div className="flex items-center justify-between pt-2 border-t border-sand">
              <span className="text-mocha">Total</span>
              <span className="font-semibold text-lg">{formatPeso(total)}</span>
            </div>
            <button
              disabled={busy}
              onClick={placeOrder}
              className="w-full bg-espresso text-cream py-3.5 font-black uppercase tracking-wide text-sm disabled:opacity-50 active:scale-[0.99] transition"
            >
              {busy ? "Sending…" : order ? "Add to order" : "Place order"}
            </button>
          </div>
        </Sheet>
      )}

      {billOpen && (
        <Sheet title="Request the bill" onClose={() => setBillOpen(false)}>
          <p className="text-sm text-mocha mb-3">How will you pay? Staff will bring your bill.</p>
          {order && (
            <div className="flex items-center justify-between mb-3 text-sm">
              <span className="text-mocha">Your total</span>
              <span className="font-semibold text-lg">{formatPeso(myTotal)}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => askBill("cash")}
              className="border-2 border-ink bg-white py-6 active:scale-[0.98] hover:bg-ink hover:text-white transition-colors"
            >
              <div className="text-2xl">💵</div>
              <div className="mt-1.5 font-black uppercase tracking-wide text-sm">Cash</div>
            </button>
            <button
              onClick={() => askBill("card")}
              className="border-2 border-ink bg-white py-6 active:scale-[0.98] hover:bg-ink hover:text-white transition-colors"
            >
              <div className="text-2xl">💳</div>
              <div className="mt-1.5 font-black uppercase tracking-wide text-sm">Card</div>
            </button>
          </div>
        </Sheet>
      )}

      {paidModal && (
        <Sheet title="Payment received" onClose={() => setPaidModal(null)}>
          <div className="text-center py-2">
            <div className="text-5xl mb-2">✅</div>
            <p className="text-mocha">Thank you! Your bill is settled.</p>
            <div className="mt-3 font-display text-4xl text-espresso">
              {formatPeso(paidModal.total)}
            </div>
            <p className="text-xs text-mocha/70 mt-1">Order #{paidModal.orderId}</p>
          </div>
          <button
            onClick={() => {
              setPaidModal(null);
              setFeedbackOpen(true);
            }}
            className="w-full mt-4 bg-espresso text-cream py-3.5 font-black uppercase tracking-wide text-sm active:scale-[0.99] transition"
          >
            ⭐ Leave feedback
          </button>
          <button
            onClick={() => setPaidModal(null)}
            className="w-full mt-2 border border-ink py-3 font-black uppercase tracking-wide text-sm text-espresso hover:bg-ink hover:text-white transition-colors"
          >
            Done
          </button>
        </Sheet>
      )}

      {feedbackOpen && (
        <FeedbackSheet
          slug={slug}
          onClose={() => setFeedbackOpen(false)}
          onDone={() => {
            setFeedbackOpen(false);
            show("Thanks for the feedback!");
          }}
        />
      )}

      {toast && (
        <div
          className={`fixed bottom-24 inset-x-4 z-50 text-center text-sm font-bold px-4 py-3 shadow-lg ${
            toast.kind === "err" ? "bg-red-600 text-white" : "bg-sage text-cream"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function ItemStatus({ status }) {
  const map = {
    placed: { label: "Received", cls: "bg-sand text-espresso" },
    preparing: { label: "Preparing", cls: "bg-amber-100 text-amber-800" },
    served: { label: "Served", cls: "bg-emerald-100 text-emerald-800" },
  };
  const s = map[status] || map.placed;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

function QuickAction({ icon, label, onClick, disabled = false }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-1 border border-ink/80 py-3 transition ${
        disabled ? "opacity-30" : "active:scale-95 hover:bg-ink hover:text-white"
      }`}
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-wide text-center leading-tight">
        {label}
      </span>
    </button>
  );
}

function Stepper({ qty, onChange, disabled = false }) {
  if (!qty) {
    return (
      <button
        onClick={() => onChange(1)}
        disabled={disabled}
        className="shrink-0 h-9 px-5 bg-ink text-white text-xs font-black uppercase tracking-wide active:scale-95 transition disabled:opacity-30"
      >
        Add
      </button>
    );
  }
  return (
    <div className="shrink-0 flex items-center border border-ink">
      <button
        onClick={() => onChange(qty - 1)}
        className="w-9 h-9 text-xl leading-none active:bg-sand transition"
      >
        −
      </button>
      <span className="w-8 text-center font-bold tabular-nums">{qty}</span>
      <button
        onClick={() => onChange(qty + 1)}
        disabled={disabled}
        className="w-9 h-9 text-xl leading-none bg-ink text-white active:scale-90 transition disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

function Sheet({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full bg-cream border-t-4 border-ink p-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-2xl text-espresso">{title}</h3>
          <button onClick={onClose} className="text-mocha text-2xl leading-none">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FeedbackSheet({ slug, onClose, onDone }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!rating || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, rating, comment, name }),
      });
      if (res.ok) onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title="How was everything?" onClose={onClose}>
      <div className="flex justify-center gap-1.5 py-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setRating(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className="active:scale-90 transition"
          >
            <Star
              filled={n <= rating}
              className={`w-9 h-9 ${n <= rating ? "text-honey" : "text-brass/30"}`}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Tell us more (optional)"
        className="w-full border border-ink p-2.5 text-sm focus:outline-none focus:border-brass mt-2"
        rows={3}
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name (optional)"
        className="w-full border border-ink p-2.5 text-sm focus:outline-none focus:border-brass mt-2"
      />
      <button
        disabled={busy || !rating}
        onClick={submit}
        className="w-full bg-espresso text-cream py-3.5 font-black uppercase tracking-wide text-sm mt-3 disabled:opacity-50"
      >
        {busy ? "Sending…" : "Submit feedback"}
      </button>
    </Sheet>
  );
}