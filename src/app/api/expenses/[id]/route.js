import { deleteExpense, updateExpense } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";

// Staff: fix or remove an expense entry.
export async function PATCH(request, { params }) {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const expense = await updateExpense(Number(id), body);
    if (!expense) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ ok: true, expense });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const expense = await deleteExpense(Number(id));
  if (!expense) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
