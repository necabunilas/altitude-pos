import { listOrders, listOpenCalls, listSales } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";

// One call for the whole order board: active orders, open calls, and today's
// closed sales — fetched in parallel to cut round-trips.
export async function GET() {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [orders, calls, sales] = await Promise.all([
    listOrders({ activeOnly: true }),
    listOpenCalls(),
    listSales({ from: startOfToday, limit: 50 }),
  ]);
  return Response.json({
    orders,
    calls,
    closed: sales.sales,
    closedSummary: sales.summary,
  });
}