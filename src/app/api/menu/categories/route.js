import { createCategory } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";

export async function POST(request) {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body?.name) return Response.json({ error: "Name required" }, { status: 400 });
  const category = await createCategory(body);
  return Response.json({ ok: true, category }, { status: 201 });
}