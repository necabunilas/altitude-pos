import { addOrderItem } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";

// Staff: add a line to an open order from the Edit order screen.
export async function POST(request, { params }) {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body?.menuItemId) return Response.json({ error: "Pick an item" }, { status: 400 });
  try {
    const item = await addOrderItem(Number(id), body);
    if (!item) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ ok: true, item }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
