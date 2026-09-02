import { requireStaff } from "@/lib/auth";
import { getMenu } from "@/lib/data";
import AdminNav from "../AdminNav";
import MenuManager from "./MenuManager";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  await requireStaff();
  const menu = await getMenu();
  return (
    <div className="bg-cream">
      <AdminNav />
      <MenuManager initialMenu={menu} />
    </div>
  );
}