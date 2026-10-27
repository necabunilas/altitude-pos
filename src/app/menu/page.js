import { getMenu } from "@/lib/data";
import { formatPeso } from "@/lib/money";
import { RESTAURANT_NAME, RESTAURANT_TAGLINE } from "@/lib/brand";
import Footer from "@/app/Footer";

// Public, view-only menu to share online (socials, Maps, chat). Same look as
// the table page but with no ordering. Only items currently marked available.
export const dynamic = "force-dynamic";

export const metadata = {
  title: `Menu · ${RESTAURANT_NAME}`,
  description: `Drinks, pastries and prices at ${RESTAURANT_NAME}, ${RESTAURANT_TAGLINE}.`,
};

export default async function PublicMenu() {
  const menu = await getMenu({ onlyAvailable: true });

  return (
    <div className="min-h-screen bg-cream text-ink flex flex-col">
      <header className="px-4 pt-5 pb-4">
        <h1 className="font-black uppercase tracking-tight text-3xl leading-none text-espresso">
          {RESTAURANT_NAME}
        </h1>
        <p className="text-[11px] tracking-[0.3em] uppercase text-brass-dark mt-1">
          Menu · {RESTAURANT_TAGLINE}
        </p>
      </header>

      {/* Sticky category rail: jump between sections on one continuous page. */}
      {menu.length > 0 && (
        <nav className="sticky top-0 z-10 bg-cream/95 backdrop-blur border-y border-sand">
          <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
            {menu.map((cat) => (
              <a
                key={cat.id}
                href={`#cat-${cat.id}`}
                className="shrink-0 border border-ink/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide hover:bg-ink hover:text-white transition-colors"
              >
                {cat.name}
              </a>
            ))}
          </div>
        </nav>
      )}

      <main className="flex-1 px-4 pb-6">
        {menu.length === 0 && (
          <p className="text-mocha/70 py-16 text-center">The menu is being updated. Check back soon.</p>
        )}
        {menu.map((cat) => (
          <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-16">
            <div className="flex items-center gap-3 mt-8 mb-1">
              <h2 className="font-display text-espresso text-2xl">{cat.name}</h2>
              <span className="h-0.5 flex-1 bg-sand" />
            </div>
            <div className="divide-y divide-sand">
              {cat.items.map((item) => (
                <div key={item.id} className="py-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="font-bold text-ink leading-tight">{item.name}</div>
                    <div className="shrink-0 font-black text-brass-dark tabular-nums">
                      {formatPeso(item.priceCents)}
                    </div>
                  </div>
                  {item.description && (
                    <div className="text-sm text-mocha/70 mt-0.5">{item.description}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <p className="mt-10 text-center text-xs text-mocha/70">
          To order, visit us and scan the QR code on your table, or order at the counter.
        </p>
      </main>

      <Footer />
    </div>
  );
}
