import { resolveBillCalls } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";

// Acknowledge a table's bill request without closing the order.
export async function POST(request) {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tableId = new URL(request.url).searchParams.get("tableId");
  if (!tableId) return Response.json({ error: "Missing tableId" }, { status: 400 });
  await resolveBillCalls(Number(tableId));
  return Response.json({ ok: true });
}