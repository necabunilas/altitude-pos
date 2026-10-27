"use client";

import { formatPeso, groupItems } from "@/lib/money";
import { RECEIPT_BUSINESS, VAT_RATE } from "@/lib/brand";

// A single-order receipt, styled like a thermal-printer slip. Wrap in
// ReceiptModal to view/print, or render inline.
function fmtDateTime(ts) {
  return new Date(ts).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Receipt({ order, printable = true }) {
  const total = order.totalCents ?? order.items.reduce((s, i) => s + i.priceCents * i.qty, 0);
  const itemCount = order.items.reduce((s, i) => s + i.qty, 0);
  const paid = !!order.paidAt;
  const method = order.paymentMethod;

  // Prices are VAT-inclusive: back out the VATable sales and 12% VAT amount.
  const vatSales = Math.round(total / (1 + VAT_RATE));
  const vatAmount = total - vatSales;

  const Rule = () => <div className="border-t border-dashed border-neutral-500 my-2" />;
  const Row = ({ label, value, strong }) => (
    <div className={`flex justify-between ${strong ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );

  return (
    <div
      className={`${printable ? "receipt-printable" : ""} mx-auto max-w-[280px] bg-white text-neutral-900 font-mono text-[12px] leading-snug p-4`}
    >
      <div className="text-center leading-tight">
        <div className="font-bold tracking-wide text-sm uppercase">{RECEIPT_BUSINESS.name}</div>
        <div className="text-[11px]">Proprietor: {RECEIPT_BUSINESS.proprietor}</div>
        <div className="text-[11px]">VAT REG TIN {RECEIPT_BUSINESS.vatTin}</div>
        <div className="text-[11px]">{RECEIPT_BUSINESS.address}</div>
        <div className="text-[11px]">Tel. {RECEIPT_BUSINESS.tel}</div>
      </div>

      <Rule />

      <Row label="Receipt No." value={`#${String(order.id).padStart(6, "0")}`} />
      <Row label="Table" value={order.table?.label || "—"} />
      {order.customerName && <Row label="Name" value={order.customerName} />}
      <Row label="Date" value={fmtDateTime(order.createdAt)} />

      <Rule />

      <div className="space-y-1">
        {groupItems(order.items).map((it) => (
          <div key={it.key}>
            <div className="flex justify-between">
              <span className="pr-2">
                {it.qty}× {it.name}
              </span>
              <span className="whitespace-nowrap">{formatPeso(it.priceCents * it.qty)}</span>
            </div>
            <div className="text-[10px] text-neutral-500 pl-3">
              @ {formatPeso(it.priceCents)}
            </div>
          </div>
        ))}
      </div>

      {order.note ? <div className="text-[10px] text-neutral-500 mt-1">Note: {order.note}</div> : null}

      <Rule />

      <Row label={`Subtotal (${itemCount} item${itemCount === 1 ? "" : "s"})`} value={formatPeso(total)} />
      <div className="flex justify-between font-bold text-sm mt-0.5">
        <span>TOTAL</span>
        <span>{formatPeso(total)}</span>
      </div>

      <Rule />

      {/* VAT breakdown (informational; prices are VAT-inclusive) */}
      <Row label="VATable Sales" value={formatPeso(vatSales)} />
      <Row label="VAT-Exempt Sales" value={formatPeso(0)} />
      <Row label="Zero-Rated Sales" value={formatPeso(0)} />
      <Row label={`VAT (${Math.round(VAT_RATE * 100)}%)`} value={formatPeso(vatAmount)} />

      <Rule />

      {paid ? (
        <>
          <div className="text-center font-bold tracking-widest">*** PAID ***</div>
          {method ? <Row label="Payment" value={method === "card" ? "Card" : "Cash"} /> : null}
          {order.paymentRef ? (
            <div>
              <span>Ref No.</span>
              <div className="text-[10px] break-all text-neutral-600">{order.paymentRef}</div>
            </div>
          ) : null}
          <Row label="Paid at" value={fmtDateTime(order.paidAt)} />
        </>
      ) : (
        <Row label="Amount due" value={formatPeso(total)} strong />
      )}

      <Rule />

      <div className="text-center text-[10px] text-neutral-500">
        This is not an official BIR invoice.
        <br />
        Thank you and please come again!
      </div>
    </div>
  );
}

// Modal wrapper with a print button. Renders one order's receipt.
export function ReceiptModal({ order, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 no-print" onClick={onClose} />
      <div className="relative bg-white border border-ink shadow-xl w-full max-w-xs max-h-[90vh] flex flex-col">
        <div className="overflow-y-auto">
          <Receipt order={order} />
        </div>
        <div className="no-print flex gap-2 p-3 border-t border-sand shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-ink text-sm font-black uppercase tracking-wide hover:bg-ink hover:text-white transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 py-2.5 bg-ink text-white text-sm font-black uppercase tracking-wide"
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
}