"use client";

import { useEffect, useState } from "react";
import { formatPeso } from "@/lib/money";
import Receipt from "./Receipt";
import { TERMINAL_ENABLED } from "@/lib/flags";

// Shows every open order for a table as its own receipt, lets staff print each,
// and settles the whole table (paid + closed) resolving any bill call.
export default function BillModal({
  table,
  orders,
  requestedMethod,
  onClose,
  onSettled,
  onPaid,
}) {
  const [printingId, setPrintingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [paidFlash, setPaidFlash] = useState(false);

  const grandTotal = orders.reduce((s, o) => s + o.totalCents, 0);
  const allServed = orders.flatMap((o) => o.items).every((i) => i.status === "served");
  const paid = orders.length > 0 && orders.every((o) => o.paidAt);
  // A card payment was started (checkout opened) but hasn't been confirmed yet.
  const pendingCard = orders.some(
    (o) => !o.paidAt && o.paymentProvider === "maya" && o.paymentRef
  );

  async function post(path, { keepOpen = false } = {}) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(path, { method: "POST" });
      if (res.ok) {
        (keepOpen ? onPaid || onSettled : onSettled)();
        return true;
      }
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  // Pop a confirmation modal, and keep the bill open behind it, on Mark paid.
  const markPaid = async () => {
    if (await post(`/api/tables/${table.id}/pay`, { keepOpen: true })) setPaidFlash(true);
  };
  const closeOrder = () => post(`/api/tables/${table.id}/close`);
  const resolveOnly = () => post(`/api/calls/resolve-bill?tableId=${table.id}`);

  // Verify a pending card payment directly with Maya, in case the customer's
  // browser never redirected back to settle it.
  async function checkCardStatus() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tables/${table.id}/maya-status`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.paid) {
        onPaid?.() || onSettled();
        setPaidFlash(true);
      } else if (res.ok) {
        alert("Payment not completed yet. Ask the customer to finish, then check again.");
      } else {
        alert(d.error || "Could not check the payment.");
      }
    } finally {
      setBusy(false);
    }
  }

  // Terminal upgrade: open a Maya (sandbox) checkout; the callback verifies and
  // marks the order paid, which the board picks up on its next poll.
  async function payViaTerminal() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tables/${table.id}/maya-checkout`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.redirectUrl) {
        window.open(d.redirectUrl, "_blank", "noopener");
      } else {
        alert(d.error || "Could not start the payment.");
      }
    } finally {
      setBusy(false);
    }
  }

  // Reset the printable flag after the print dialog closes.
  useEffect(() => {
    function done() {
      setPrintingId(null);
    }
    window.addEventListener("afterprint", done);
    return () => window.removeEventListener("afterprint", done);
  }, []);

  function printOne(orderId) {
    setPrintingId(orderId);
    // Let React apply the printable class before opening the dialog.
    setTimeout(() => window.print(), 50);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 no-print" onClick={onClose} />
      <div className="relative bg-neutral-100 border border-ink shadow-xl w-full max-w-sm max-h-[90vh] flex flex-col">
        <div className="no-print px-4 py-3 flex items-center justify-between border-b border-ink">
          <h3 className="font-black uppercase tracking-tight flex items-center gap-2">
            {table.label} · Bill
            {requestedMethod && (
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  requestedMethod === "card"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {requestedMethod === "card" ? "💳 Card" : "💵 Cash"}
              </span>
            )}
          </h3>
          <button onClick={onClose} className="text-neutral-400 text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="overflow-y-auto p-3 space-y-3">
          {orders.length === 0 && (
            <p className="text-neutral-500 text-sm text-center py-6">
              No open orders for this table.
            </p>
          )}
          {orders.map((order) => (
            <div key={order.id} className="bg-white border border-ink">
              <Receipt order={order} printable={printingId === order.id} />
              <div className="no-print border-t border-sand p-2">
                <button
                  onClick={() => printOne(order.id)}
                  className="w-full py-2 border border-ink text-xs font-black uppercase tracking-wide hover:bg-ink hover:text-white transition-colors"
                >
                  Print order #{order.id}
                </button>
              </div>
            </div>
          ))}
        </div>

        {orders.length > 0 && (
          <div className="no-print border-t border-ink p-3 space-y-2 bg-white">
            <div className="flex justify-between font-semibold">
              <span>Table total</span>
              <span>{formatPeso(grandTotal)}</span>
            </div>
            {!paid ? (
              <>
                {TERMINAL_ENABLED && requestedMethod !== "cash" && (
                  <>
                    <button
                      onClick={payViaTerminal}
                      disabled={busy}
                      className="w-full py-3 bg-ink text-white font-black uppercase tracking-wide text-sm hover:bg-espresso-light transition-colors disabled:opacity-50"
                    >
                      {busy ? "Opening payment…" : "💳 Pay via terminal"}
                    </button>
                    <p className="text-[11px] text-neutral-400 text-center">
                      Opens a card / QR Ph payment; marks paid automatically on success.
                    </p>
                  </>
                )}
                {TERMINAL_ENABLED && pendingCard && (
                  <>
                    <button
                      onClick={checkCardStatus}
                      disabled={busy}
                      className="w-full py-3 border border-ink text-ink font-black uppercase tracking-wide text-sm hover:bg-ink hover:text-white transition-colors disabled:opacity-50"
                    >
                      {busy ? "Checking…" : "🔄 Check payment status"}
                    </button>
                    <p className="text-[11px] text-neutral-400 text-center">
                      Confirms a card payment with Maya if the customer already paid.
                    </p>
                  </>
                )}
                <button
                  onClick={markPaid}
                  disabled={busy}
                  className="w-full py-3 bg-emerald-600 text-white font-black uppercase tracking-wide text-sm disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Mark paid"}
                </button>
                <p className="text-[11px] text-neutral-400 text-center">
                  Records payment and clears the bill request. The order stays open
                  until you close it.
                </p>
                <button
                  onClick={resolveOnly}
                  disabled={busy}
                  className="w-full py-2.5 border border-ink text-xs font-black uppercase tracking-wide text-ink hover:bg-ink hover:text-white transition-colors disabled:opacity-50"
                >
                  Resolve request only
                </button>
              </>
            ) : (
              <>
                <div className="bg-emerald-50 border border-emerald-200 p-3 text-center">
                  <div className="text-2xl">✅</div>
                  <div className="font-semibold text-emerald-800">
                    Paid · {formatPeso(grandTotal)}
                  </div>
                  <div className="text-xs text-emerald-700/80">Payment recorded.</div>
                </div>
                <button
                  onClick={closeOrder}
                  disabled={busy || !allServed}
                  className="w-full py-3 bg-ink text-white font-black uppercase tracking-wide text-sm hover:bg-espresso-light transition-colors disabled:opacity-50"
                >
                  {busy ? "Closing…" : "Close order"}
                </button>
                <p className="text-[11px] text-neutral-400 text-center">
                  {allServed
                    ? "Closes the order and adds it to sales."
                    : "Serve all items before closing."}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {paidFlash && (
        <div className="no-print absolute inset-0 z-10 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setPaidFlash(false)}
          />
          <div className="relative bg-white border border-ink shadow-xl w-full max-w-xs p-6 text-center">
            <div className="text-5xl mb-2">✅</div>
            <h3 className="font-display text-2xl text-espresso">Payment received</h3>
            <div className="mt-2 font-semibold text-3xl text-emerald-700">
              {formatPeso(grandTotal)}
            </div>
            <p className="text-sm text-mocha mt-1">{table.label} · paid</p>
            <button
              onClick={() => setPaidFlash(false)}
              className="w-full mt-5 py-3 bg-ink text-white font-black uppercase tracking-wide text-sm hover:bg-espresso-light transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}