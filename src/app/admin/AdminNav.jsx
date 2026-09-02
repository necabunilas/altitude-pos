"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallAlerts } from "./useCallAlerts";
import { useFeedbackBadge } from "./useFeedbackBadge";
import NotifBell from "./NotifBell";
import { RESTAURANT_NAME } from "@/lib/brand";

const LINKS = [
  { href: "/admin/order", label: "Counter" },
  { href: "/admin", label: "Orders" },
  { href: "/admin/sales", label: "Sales" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/tables", label: "QR Codes" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    calls,
    justArrived,
    soundReady,
    enableSound,
    newOrders,
    newOrderCount,
    orderArrived,
  } = useCallAlerts();
  const unreadFeedback = useFeedbackBadge({
    onFeedbackPage: pathname === "/admin/feedback",
  });

  // Close the mobile menu whenever the route changes.
  useEffect(() => setMenuOpen(false), [pathname]);

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  }

  function badgeFor(href) {
    if (href === "/admin") return { n: newOrderCount, tone: "order", pulse: orderArrived };
    if (href === "/admin/feedback") return { n: unreadFeedback, tone: "gray" };
    return { n: 0 };
  }

  return (
    <nav className="bg-cream/95 backdrop-blur border-t-4 border-brass border-b border-sand sticky top-0 z-20">
      <div className="px-4 py-3 flex items-center gap-2">
        {/* Hamburger (mobile only) */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          className="sm:hidden w-9 h-9 -ml-1 grid place-items-center rounded-lg hover:bg-neutral-100"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menuOpen ? (
              <>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>

        <span className="font-black uppercase tracking-tight text-2xl text-espresso leading-none">
          {RESTAURANT_NAME}
        </span>

        {/* Inline links (desktop only) */}
        <div className="hidden sm:flex items-center gap-1 ml-2">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            const badge = badgeFor(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-2 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition-colors ${
                  active ? "bg-mocha text-white" : "text-neutral-500 hover:bg-sand"
                }`}
              >
                {l.label}
                {badge.n > 0 && (
                  <CountPill n={badge.n} tone={badge.tone} pulse={badge.pulse} active={active} />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right cluster: always visible */}
        <div className="ml-auto flex items-center gap-1">
          {!soundReady && (
            <button
              onClick={enableSound}
              className="text-xs px-2.5 py-1.5 rounded-full bg-amber-100 text-amber-800 font-medium hover:bg-amber-200 whitespace-nowrap"
              title="Browsers block sound until you allow it. Click to enable the call ding."
            >
              <span className="sm:hidden">🔇</span>
              <span className="hidden sm:inline">🔇 Enable sound</span>
            </button>
          )}

          <NotifBell
            calls={calls}
            newOrders={newOrders}
            unreadFeedback={unreadFeedback}
            justArrived={justArrived}
            orderArrived={orderArrived}
          />

          {/* Logout inline on desktop; lives in the mobile menu otherwise */}
          <button
            onClick={logout}
            className="hidden sm:block text-sm text-neutral-500 hover:text-neutral-900 ml-1"
          >
            Log out
          </button>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {menuOpen && (
        <div className="sm:hidden border-t border-neutral-100 px-2 py-2 flex flex-col">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            const badge = badgeFor(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-3 text-xs font-black uppercase tracking-wide flex items-center gap-2 ${
                  active ? "bg-mocha text-white" : "text-neutral-600 hover:bg-sand"
                }`}
              >
                {l.label}
                {badge.n > 0 && (
                  <CountPill n={badge.n} tone={badge.tone} pulse={badge.pulse} active={active} />
                )}
              </Link>
            );
          })}
          <button
            onClick={logout}
            className="px-3 py-2.5 rounded-lg text-sm text-left text-neutral-500 hover:bg-neutral-100"
          >
            Log out
          </button>
        </div>
      )}
    </nav>
  );
}

function CountPill({ n, tone = "gray", pulse = false, active = false }) {
  const color =
    tone === "order"
      ? "bg-emerald-600 text-white"
      : active
      ? "bg-white/25 text-white"
      : "bg-neutral-300 text-neutral-700";
  return (
    <span
      className={`min-w-5 h-5 px-1 grid place-items-center rounded-full text-xs font-semibold ${color} ${
        pulse ? "animate-pulse ring-2 ring-emerald-300" : ""
      }`}
    >
      {n}
    </span>
  );
}