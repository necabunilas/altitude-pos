import { getTableOpenOrders, markTablePaid } from "@/lib/data";
import { getCheckoutStatus } from "@/lib/maya";
import { TERMINAL_ENABLED } from "@/lib/flags";

function page(title, message) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
     <title>${title}</title></head>
     <body style="font-family:system-ui;background:#f6f1e7;color:#241f1a;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px">
       <div><div style="font-size:40px">${title.startsWith("Payment received") ? "✅" : "⚠️"}</div>
       <h1 style="font-weight:600">${title}</h1><p style="color:#6f4e37">${message}</p></div>
     </body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

// Maya redirects the customer's browser here after the hosted checkout. We
// verify the payment status server-side (secret key) before marking paid — so
// this public callback can't be spoofed into faking a payment.
export async function GET(request) {
  if (!TERMINAL_ENABLED) return page("Not available", "This feature is off.");
  const url = new URL(request.url);
  const tableId = Number(url.searchParams.get("tableId"));
  const r = url.searchParams.get("r");

  if (r !== "success") {
    return page("Payment not completed", "The payment was cancelled or failed. Please try again.");
  }
  const open = await getTableOpenOrders(tableId);
  const order = open.find((o) => !o.paidAt && o.paymentProvider === "maya" && o.paymentRef);
  if (!order) return page("Payment received", "Your table's order is settled. You may return to your table.");

  try {
    const { paid } = await getCheckoutStatus(order.paymentRef);
    if (paid) {
      await markTablePaid(tableId, { method: "card", provider: "maya", ref: order.paymentRef });
      return page("Payment received", "Thank you! Your payment was successful.");
    }
    return page("Payment not completed", "We couldn't confirm the payment yet. Please ask a staff member.");
  } catch {
    return page("Payment not completed", "We couldn't verify the payment. Please ask a staff member.");
  }
}