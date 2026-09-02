import { closeTable } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";

// Close a table's paid + fully served orders, moving them to sales.
export async function POST(request, { params }) {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const closed = await closeTable(Number(id));
    return Response.json({ ok: true, count: closed.length });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}