import { listOrders, listOpenCalls, listSales } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";

// One call for the whole order board: active orders, open calls, and today's
// closed sales — fetched in parallel to cut round-trips.
export async function GET() {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Midnight in Manila (UTC+8, no DST). The server runs in UTC, so a plain
  // setHours(0) would keep showing yesterday's orders until 8 AM local time.
  const DAY = 24 * 60 * 60 * 1000;
  const MANILA = 8 * 60 * 60 * 1000;
  const startOfToday = new Date(Math.floor((Date.now() + MANILA) / DAY) * DAY - MANILA);
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