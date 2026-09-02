import { requireStaff } from "@/lib/auth";
import AdminNav from "./AdminNav";
import OrderBoard from "./OrderBoard";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  await requireStaff();
  return (
    <div className="bg-cream">
      <AdminNav />
      <OrderBoard />
    </div>
  );
}