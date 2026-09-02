import { cancelOrder } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";

// Order-level actions: cancel the whole order.
export async function PATCH(request, { params }) {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  try {
    if (body?.action === "cancel" || body?.status === "cancelled") {
      const order = await cancelOrder(Number(id));
      if (!order) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json({ ok: true, order });
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}