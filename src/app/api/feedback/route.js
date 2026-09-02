import { getTableBySlug, createFeedback, listFeedback } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";

// Customer submits feedback (rating + optional comment).
export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body?.rating) {
    return Response.json({ error: "Rating required" }, { status: 400 });
  }
  const table = body.slug ? await getTableBySlug(body.slug) : null;
  const fb = await createFeedback({
    tableId: table?.id || null,
    orderId: body.orderId || null,
    rating: body.rating,
    comment: body.comment,
    name: body.name,
  });
  return Response.json({ ok: true, id: fb.id }, { status: 201 });
}

// Staff reads the feedback inbox.
export async function GET() {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json({ feedback: await listFeedback() });
}