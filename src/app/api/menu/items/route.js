import { createMenuItem } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";

export async function POST(request) {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.categoryId) {
    return Response.json({ error: "Name and category required" }, { status: 400 });
  }
  const item = await createMenuItem(body);
  return Response.json({ ok: true, item }, { status: 201 });
}