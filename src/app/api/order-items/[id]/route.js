import { setItemStatus, voidItem } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";

// Advance a single line item's status (preparing / served).
export async function PATCH(request, { params }) {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  try {
    const item = await setItemStatus(Number(id), body?.status);
    if (!item) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ ok: true, item });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

// Staff void: remove the line.
export async function DELETE(request, { params }) {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const item = await voidItem(Number(id));
    if (!item) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}