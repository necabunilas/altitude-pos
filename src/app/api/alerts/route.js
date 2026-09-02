import { listOrders, listOpenCalls } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";

// Lightweight poll for the nav bell: open calls + active orders in one call.
export async function GET() {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [orders, calls] = await Promise.all([
    listOrders({ activeOnly: true }),
    listOpenCalls(),
  ]);
  return Response.json({ orders, calls });
}