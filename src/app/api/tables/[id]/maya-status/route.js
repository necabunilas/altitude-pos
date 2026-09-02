import { getTableOpenOrders, markTablePaid } from "@/lib/data";
import { getCheckoutStatus } from "@/lib/maya";
import { isStaffAuthed } from "@/lib/auth";
import { TERMINAL_ENABLED } from "@/lib/flags";

// Staff-triggered fallback: verify a pending Maya checkout directly (via the
// stored checkoutId) and settle it if paid. Covers the case where the customer
// completed payment but the browser redirect back never landed.
export async function POST(request, { params }) {
  if (!TERMINAL_ENABLED) return Response.json({ error: "Not found" }, { status: 404 });
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const open = await getTableOpenOrders(Number(id));
  const order = open.find((o) => !o.paidAt && o.paymentProvider === "maya" && o.paymentRef);
  if (!order) return Response.json({ error: "No pending card payment for this table." }, { status: 400 });

  try {
    const { paid, status } = await getCheckoutStatus(order.paymentRef);
    if (paid) {
      await markTablePaid(Number(id), { method: "card", provider: "maya", ref: order.paymentRef });
    }
    return Response.json({ ok: true, paid, status });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}