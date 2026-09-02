import { updateMenuItem, deleteMenuItem } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";

export async function PATCH(request, { params }) {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const item = await updateMenuItem(Number(id), body || {});
  if (!item) return Response.json({ error: "Nothing to update" }, { status: 400 });
  return Response.json({ ok: true, item });
}

export async function DELETE(request, { params }) {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const item = await deleteMenuItem(Number(id));
  if (!item) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}