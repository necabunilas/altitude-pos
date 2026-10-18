import Link from "next/link";
import { RESTAURANT_NAME, RESTAURANT_TAGLINE, RESTAURANT_DESCRIPTION } from "@/lib/brand";

// Splash screen for the counter device: brand name + caption. Tapping anywhere
// opens the counter order page (staff login first if not signed in).
export default function Home() {
  return (
    <Link
      href="/admin/order"
      aria-label="Tap to open the counter"
      className="relative min-h-screen bg-ink text-white flex flex-col items-center justify-center px-6 select-none"
    >
      <div className="flex flex-col items-center text-center">
        <h1 className="font-black uppercase tracking-[0.2em] text-[min(8vw,6rem)] leading-none pl-[0.2em]">
          {RESTAURANT_NAME}
        </h1>
        <p className="mt-8 text-base sm:text-lg text-white/70">{RESTAURANT_DESCRIPTION}</p>
        <p className="mt-2 text-[11px] sm:text-xs tracking-[0.4em] uppercase text-brass">
          {RESTAURANT_TAGLINE}
        </p>
      </div>

      <p className="absolute bottom-10 inset-x-0 text-center text-xs tracking-[0.3em] uppercase text-white/40 animate-pulse">
        Tap anywhere to start
      </p>
    </Link>
  );
}
