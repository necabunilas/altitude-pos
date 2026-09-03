import { headers } from "next/headers";
import { getTableBySlug, getTableOpenOrders, setTablePaymentPending } from "@/lib/data";
import { createCheckout } from "@/lib/maya";
import { TERMINAL_ENABLED } from "@/lib/flags";

async function baseUrl() {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

// Guest-initiated card payment. Keyed by the table's own (unguessable) slug —
// the same credential the customer already uses to view/order — so no staff
// login is needed. Creates a Maya hosted checkout for the table's unpaid total
// and returns its redirectUrl; the browser then navigates there. On success
// Maya redirects to /api/maya/callback, which verifies and marks the order paid
// before sending the customer back to their table page.
export async function POST(request, { params }) {
  if (!TERMINAL_ENABLED) return Response.json({ error: "Not found" }, { status: 404 });
  const { slug } = await params;
  const table = await getTableBySlug(slug);
  if (!table) return Response.json({ error: "Unknown table" }, { status: 404 });

  const open = await getTableOpenOrders(table.id);
  const amountCents = open.filter((o) => !o.paidAt).reduce((s, o) => s + o.totalCents, 0);
  if (!amountCents) return Response.json({ error: "Nothing to pay" }, { status: 400 });

  const base = await baseUrl();
  const back = (r) =>
    `${base}/api/maya/callback?tableId=${table.id}&slug=${encodeURIComponent(slug)}&r=${r}`;
  try {
    const checkout = await createCheckout({
      amountCents,
      rrn: `t${table.id}-${Date.now()}`,
      successUrl: back("success"),
      failureUrl: back("failure"),
      cancelUrl: back("cancel"),
    });
    await setTablePaymentPending(table.id, { provider: "maya", ref: checkout.checkoutId });
    return Response.json({ ok: true, redirectUrl: checkout.redirectUrl });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}