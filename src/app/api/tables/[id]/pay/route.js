import { markTablePaid } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";

// Record payment for a table's open orders and resolve the bill request.
// The order stays open until it is closed.
export async function POST(request, { params }) {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  // Staff-chosen tender (cash / qr / card). Falls back to the guest's bill
  // request method when not provided.
  const method = ["cash", "card", "qr"].includes(body.method) ? body.method : undefined;
  const orders = await markTablePaid(Number(id), method ? { method } : {});
  return Response.json({ ok: true, count: orders.length });
}