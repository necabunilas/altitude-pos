// Maya (PayMaya) Checkout client. Defaults to Maya's published SANDBOX keys so
// the hidden terminal upgrade is testable now; override via env for real keys.
// Docs: https://developers.maya.ph/reference/createv1checkout
const BASE = process.env.MAYA_API_BASE || "https://pg-sandbox.paymaya.com";
const PUBLIC_KEY =
  process.env.MAYA_PUBLIC_KEY || "pk-Z0OSzLvIcOI2UIvDhdTGVVfRSSeiGStnceqwUE7n0Ah";
const SECRET_KEY =
  process.env.MAYA_SECRET_KEY || "sk-X8qolYjy62kIzEbr0QRK1h4b4KDVHaNcwMYk39jInSl";

function authHeader(key) {
  return "Basic " + Buffer.from(key + ":").toString("base64");
}

// Create a hosted checkout. Auth uses the PUBLIC key. Returns { checkoutId, redirectUrl }.
export async function createCheckout({ amountCents, rrn, successUrl, failureUrl, cancelUrl }) {
  const body = {
    totalAmount: { currency: "PHP", value: (amountCents / 100).toFixed(2) },
    requestReferenceNumber: String(rrn).slice(0, 36),
    redirectUrl: { success: successUrl, failure: failureUrl, cancel: cancelUrl },
  };
  const res = await fetch(`${BASE}/checkout/v1/checkouts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader(PUBLIC_KEY) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Maya create checkout ${res.status}: ${await res.text()}`);
  return res.json();
}

// Retrieve a checkout's payment status. Auth uses the SECRET key.
export async function getCheckoutStatus(checkoutId) {
  const res = await fetch(`${BASE}/checkout/v1/checkouts/${checkoutId}`, {
    headers: { Authorization: authHeader(SECRET_KEY) },
  });
  if (!res.ok) throw new Error(`Maya get checkout ${res.status}`);
  const data = await res.json();
  const status = data.paymentStatus || data.status || "";
  const paid = ["PAYMENT_SUCCESS", "COMPLETED", "SUCCESS"].includes(status);
  return { paid, status, data };
}