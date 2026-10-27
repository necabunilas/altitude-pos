// How staff screens name an order: its table (or counter customer) label,
// plus the name the guest gave when ordering from the table, if any.
export function orderLabel(order, fallback = "Table") {
  const table = order.table?.label || fallback;
  return order.customerName ? `${table} · ${order.customerName}` : table;
}
