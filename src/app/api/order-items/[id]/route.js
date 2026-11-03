import { setItemStatus, voidItem, setOrderItemQty, removeOrderItem } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";

// Advance a single line item's status (preparing / served), or change its
// quantity from the Edit order screen ({ qty }).
export async function PATCH(request, { params }) {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  try {
    const item =
      body?.qty != null
        ? await setOrderItemQty(Number(id), body.qty)
        : await setItemStatus(Number(id), body?.status);
    if (!item) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ ok: true, item });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

// Staff void: remove the line. From the Edit order screen (?edit=1) it also
// works on paid orders, as long as the order is still open.
export async function DELETE(request, { params }) {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const edit = new URL(request.url).searchParams.get("edit") === "1";
  try {
    const item = edit ? await removeOrderItem(Number(id)) : await voidItem(Number(id));
    if (!item) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}