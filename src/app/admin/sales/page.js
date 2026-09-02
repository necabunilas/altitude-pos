import { requireStaff } from "@/lib/auth";
import AdminNav from "../AdminNav";
import SalesView from "./SalesView";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  await requireStaff();
  return (
    <div className="bg-cream">
      <AdminNav />
      <SalesView />
    </div>
  );
}