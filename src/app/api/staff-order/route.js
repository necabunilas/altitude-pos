import { placeCounterOrder } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";

// Staff rings up a counter / bar order for a walk-in (no table QR).
export async function POST(request) {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.cart) || !body.cart.length) {
    return Response.json({ error: "Invalid order" }, { status: 400 });
  }
  try {
    const res = await placeCounterOrder({
      label: body.label,
      cart: body.cart,
      note: body.note,
      paymentMethod: body.paymentMethod,
    });
    return Response.json({ ok: true, ...res }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}