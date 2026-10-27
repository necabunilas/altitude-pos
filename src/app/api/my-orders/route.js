import { getTableBySlug, getTableOpenOrders } from "@/lib/data";

// Guest-facing: a table's own current (unpaid) orders, scoped by the slug that
// the QR encodes. No staff auth — the slug is the table's identity.
export async function GET(request) {
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) return Response.json({ error: "Missing slug" }, { status: 400 });
  const table = await getTableBySlug(slug);
  if (!table || !table.active) {
    return Response.json({ error: "Unknown table" }, { status: 404 });
  }
  const orders = (await getTableOpenOrders(table.id)).map((o) => ({
    id: o.id,
    status: o.status,
    paidAt: o.paidAt,
    createdAt: o.createdAt,
    note: o.note,
    customerName: o.customerName,
    items: o.items.map((i) => ({
      id: i.id,
      name: i.name,
      qty: i.qty,
      priceCents: i.priceCents,
      status: i.status,
      round: i.round,
    })),
    totalCents: o.totalCents,
  }));
  const totalCents = orders.reduce((s, o) => s + o.totalCents, 0);
  return Response.json({ orders, totalCents });
}