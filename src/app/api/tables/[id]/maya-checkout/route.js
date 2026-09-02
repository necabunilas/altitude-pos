import { headers } from "next/headers";
import { getTableOpenOrders, setTablePaymentPending } from "@/lib/data";
import { createCheckout } from "@/lib/maya";
import { isStaffAuthed } from "@/lib/auth";
import { TERMINAL_ENABLED } from "@/lib/flags";

async function baseUrl() {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

// Create a Maya sandbox checkout for the table's unpaid total; the caller opens
// the returned redirectUrl. On success, Maya redirects to /api/maya/callback,
// which verifies and marks the order paid.
export async function POST(request, { params }) {
  if (!TERMINAL_ENABLED) return Response.json({ error: "Not found" }, { status: 404 });
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const open = await getTableOpenOrders(Number(id));
  const amountCents = open.filter((o) => !o.paidAt).reduce((s, o) => s + o.totalCents, 0);
  if (!amountCents) return Response.json({ error: "Nothing to pay" }, { status: 400 });

  const base = await baseUrl();
  const back = (r) => `${base}/api/maya/callback?tableId=${id}&r=${r}`;
  try {
    const checkout = await createCheckout({
      amountCents,
      rrn: `t${id}-${Date.now()}`,
      successUrl: back("success"),
      failureUrl: back("failure"),
      cancelUrl: back("cancel"),
    });
    await setTablePaymentPending(Number(id), { provider: "maya", ref: checkout.checkoutId });
    return Response.json({ ok: true, redirectUrl: checkout.redirectUrl });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}