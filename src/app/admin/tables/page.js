import { headers } from "next/headers";
import QRCode from "qrcode";
import { requireStaff } from "@/lib/auth";
import { listTables } from "@/lib/data";
import AdminNav from "../AdminNav";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function TablesPage() {
  await requireStaff();
  // Prefer an explicit base URL (LAN IP or production domain) so scanned QR
  // codes work from a phone; fall back to the request host for local clicks.
  let base = process.env.APP_BASE_URL;
  if (!base) {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
    const proto = h.get("x-forwarded-proto") || "http";
    base = `${proto}://${host}`;
  }
  base = base.replace(/\/$/, "");

  // Exclude counter/bar pseudo-tables (no QR); they're internal to staff orders.
  const tables = (await listTables()).filter((t) => !t.slug.startsWith("counter-"));
  const cards = await Promise.all(
    tables.map(async (t) => {
      const url = `${base}/t/${t.slug}`;
      const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 320 });
      return { ...t, url, dataUrl };
    })
  );

  return (
    <div className="bg-cream">
      <div className="print:hidden">
        <AdminNav />
      </div>
      <div className="p-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight">Table QR codes</h1>
            <p className="text-sm text-neutral-500">
              Print these and place one on each table. Scanning opens that table&apos;s menu.
            </p>
          </div>
          <PrintButton />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
          {cards.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-ink p-4 text-center break-inside-avoid"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.dataUrl} alt={`QR for ${t.label}`} className="w-full max-w-[220px] mx-auto" />
              <div className="font-semibold mt-2">{t.label}</div>
              <div className="text-xs text-neutral-400 break-all">{t.url}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}