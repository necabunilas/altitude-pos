import { requireStaff } from "@/lib/auth";
import { getMenu } from "@/lib/data";
import AdminNav from "../AdminNav";
import CounterOrder from "./CounterOrder";

export const dynamic = "force-dynamic";

export default async function CounterOrderPage() {
  await requireStaff();
  const menu = await getMenu({ onlyAvailable: true });
  return (
    <div className="bg-cream min-h-screen">
      <AdminNav />
      <CounterOrder menu={menu} />
    </div>
  );
}