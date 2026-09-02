import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "staff_session";

// Single-restaurant, single staff login. The password lives in env; the cookie
// simply stores a token derived from it so we don't keep the password around.
export function staffPassword() {
  return process.env.STAFF_PASSWORD || "admin123";
}

export function staffToken() {
  // Not cryptographic — good enough to gate a single-venue back office.
  // base64url (no "=" padding) so the cookie value never gets percent-encoded.
  return Buffer.from("staff:" + staffPassword()).toString("base64url");
}

export async function isStaffAuthed() {
  const jar = await cookies();
  return jar.get(COOKIE)?.value === staffToken();
}

export async function setStaffCookie() {
  const jar = await cookies();
  jar.set(COOKIE, staffToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h shift
  });
}

export async function clearStaffCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

// For protected server components: redirect to login when not authed.
export async function requireStaff() {
  if (!(await isStaffAuthed())) redirect("/admin/login");
}