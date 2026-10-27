"use client";

import { formatPeso } from "@/lib/money";
import { orderLabel } from "@/lib/orderLabel";
import ConfirmModal from "./ConfirmModal";

// Confirm permanently deleting an order. `onConfirm` does the delete and
// returns { ok, error }; the modal closes itself on success.
export default function DeleteOrderModal({ order, onConfirm, onClose }) {
  const itemCount = order.items?.reduce((s, i) => s + i.qty, 0) || 0;
  return (
    <ConfirmModal title="Delete order?" onConfirm={onConfirm} onClose={onClose}>
      <div className="mt-1 text-mocha">
        Order #{order.id} · {orderLabel(order)}
      </div>
      <div className="mt-3 font-semibold text-3xl text-espresso">
        {formatPeso(order.totalCents)}
      </div>
      {itemCount > 0 && (
        <p className="text-xs text-mocha/70 mt-1">
          {itemCount} item{itemCount === 1 ? "" : "s"}
          {order.paidAt ? " · paid" : ""}
        </p>
      )}
      <p className="text-sm text-mocha mt-4">
        It will be removed from the board and from sales. This can&apos;t be undone.
      </p>
    </ConfirmModal>
  );
}
