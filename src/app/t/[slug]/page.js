import { getTableBySlug, getMenu } from "@/lib/data";
import { notFound } from "next/navigation";
import CustomerApp from "./CustomerApp";

export const dynamic = "force-dynamic";

export default async function TablePage({ params }) {
  const { slug } = await params;
  const table = await getTableBySlug(slug);
  if (!table || !table.active) notFound();
  const menu = await getMenu({ onlyAvailable: true });
  return <CustomerApp slug={slug} table={table} menu={menu} />;
}