import { getMenu } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";

export async function GET(request) {
  const url = new URL(request.url);
  const all = url.searchParams.get("all") === "1" && (await isStaffAuthed());
  return Response.json({ menu: await getMenu({ onlyAvailable: !all }) });
}