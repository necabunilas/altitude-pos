import { staffPassword, setStaffCookie, clearStaffCookie } from "@/lib/auth";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (body?.password !== staffPassword()) {
    return Response.json({ error: "Wrong password" }, { status: 401 });
  }
  await setStaffCookie();
  return Response.json({ ok: true });
}

export async function DELETE() {
  await clearStaffCookie();
  return Response.json({ ok: true });
}