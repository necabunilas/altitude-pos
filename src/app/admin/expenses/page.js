import { requireStaff } from "@/lib/auth";
import AdminNav from "../AdminNav";
import ExpensesView from "./ExpensesView";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  await requireStaff();
  return (
    <div className="bg-cream">
      <AdminNav />
      <ExpensesView />
    </div>
  );
}
