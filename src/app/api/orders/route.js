import { getTableBySlug, placeOrder, listOrders } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";

// Customer places an order.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body?.slug || !Array.isArray(body.cart) || !body.cart.length) {
    return Response.json({ error: "Invalid order" }, { status: 400 });
  }
  const table = await getTableBySlug(body.slug);
  if (!table || !table.active) {
    return Response.json({ error: "Unknown table" }, { status: 404 });
  }
  try {
    const order = await placeOrder({
      tableId: table.id,
      cart: body.cart,
      note: body.note,
      customerName: body.customerName,
    });
    return Response.json({ ok: true, orderId: order.id }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

// Staff lists orders.
export async function GET(request) {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const activeOnly = url.searchParams.get("active") === "1";
  return Response.json({ orders: await listOrders({ activeOnly }) });
}