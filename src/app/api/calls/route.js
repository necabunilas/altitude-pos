import { getTableBySlug, createCall, listOpenCalls } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";

// Customer calls waiter / requests bill.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body?.slug || !body?.type) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const table = await getTableBySlug(body.slug);
  if (!table || !table.active) {
    return Response.json({ error: "Unknown table" }, { status: 404 });
  }
  try {
    const call = await createCall({
      tableId: table.id,
      type: body.type,
      paymentMethod: body.paymentMethod,
    });
    return Response.json({ ok: true, callId: call.id }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

// Staff lists open calls.
export async function GET() {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json({ calls: await listOpenCalls() });
}