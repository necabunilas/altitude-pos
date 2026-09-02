import Link from "next/link";
import { listTables } from "@/lib/data";
import { RESTAURANT_NAME, RESTAURANT_TAGLINE } from "@/lib/brand";
import Footer from "@/app/Footer";

export const dynamic = "force-dynamic";

export default async function Home() {
  let sample = null;
  try {
    sample = (await listTables())[0] || null;
  } catch {}

  return (
    <div className="min-h-screen bg-white text-ink flex flex-col">
      <main className="flex-1 flex flex-col justify-center bg-ink text-white px-6 py-20 md:px-12">
        <div className="mx-auto w-full max-w-3xl">
          <p className="text-[11px] md:text-xs tracking-[0.4em] uppercase text-brass mb-6">
            {RESTAURANT_NAME} · {RESTAURANT_TAGLINE}
          </p>
          <h1 className="font-black uppercase leading-[0.9] tracking-tight text-6xl sm:text-7xl md:text-8xl">
            Skip the
            <br />
            <span className="text-brass">wait.</span> Just
            <br />
            order.
          </h1>
          <p className="mt-8 max-w-xl text-base md:text-lg text-white/70 leading-relaxed">
            Scan the code on your table to browse the menu, order, call a
            barista, ask for the bill, and leave feedback. No app, no line, no
            fuss.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            {sample && (
              <Link
                href={`/t/${sample.slug}`}
                className="inline-flex items-center justify-center bg-brass text-ink px-8 py-4 font-black uppercase tracking-wide text-sm hover:bg-brass-dark transition-colors"
              >
                Preview a table — {sample.label}
              </Link>
            )}
            <Link
              href="/admin"
              className="inline-flex items-center justify-center border-2 border-white/25 text-white px-8 py-4 font-black uppercase tracking-wide text-sm hover:bg-white hover:text-ink transition-colors"
            >
              Staff back office
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}