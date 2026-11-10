import { createExpense, listExpenses } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";

// Staff: expenses between two days (yyyy-mm-dd), or add one.
export async function GET(request) {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const expenses = await listExpenses({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });
  return Response.json({ expenses });
}

export async function POST(request) {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  try {
    return Response.json({ ok: true, expense: await createExpense(body) }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
