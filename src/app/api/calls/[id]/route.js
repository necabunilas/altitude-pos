import { resolveCall } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";

export async function PATCH(request, { params }) {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const call = await resolveCall(Number(id));
  if (!call) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true, call });
}