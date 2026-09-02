import { markTablePaid } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";
import { TERMINAL_ENABLED } from "@/lib/flags";

// Semi-integrated payment terminal (upgrade, hidden behind TERMINAL_ENABLED).
//
// PLACEHOLDER: the real flow is (1) send the amount to the Maya Terminal via the
// local bridge agent, (2) verify the approval against Maya's transaction API,
// then (3) mark the table paid. See docs/payment-terminal-integration.md.
// Until the device + Maya ECR access exist, this simulates an approved card
// payment so the flow is testable end to end.
export async function POST(request, { params }) {
  if (!TERMINAL_ENABLED) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const ref = "SIM-" + Date.now(); // TODO: real Maya transaction reference
  const paid = await markTablePaid(Number(id), {
    method: "card",
    provider: "maya_terminal",
    ref,
  });
  return Response.json({ ok: true, count: paid.length, ref });
}