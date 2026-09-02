import { markTablePaid } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";

// Record payment for a table's open orders and resolve the bill request.
// The order stays open until it is closed.
export async function POST(request, { params }) {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const orders = await markTablePaid(Number(id));
  return Response.json({ ok: true, count: orders.length });
}