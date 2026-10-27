"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { orderLabel } from "@/lib/orderLabel";

function since(ts) {
  const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// Facebook-style notification center: a bell that opens a dropdown listing
// every pending item (waiter/bill calls, new orders, new feedback). Each row
// links to the page that handles it.
export default function NotifBell({
  calls = [],
  newOrders = [],
  unreadFeedback = 0,
  justArrived,
  orderArrived,
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ref = useRef(null);

  const total = calls.length + newOrders.length + unreadFeedback;
  const pulsing = justArrived || orderArrived;

  // Close on route change and on outside click.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Build a flat, time-sorted-ish list of notification rows.
  const items = [];
  for (const c of calls) {
    items.push({
      key: `call-${c.id}`,
      href: "/admin",
      icon: c.type === "bill" ? "🧾" : "🙋",
      title:
        c.type === "bill"
          ? `Bill requested${c.paymentMethod ? ` (${c.paymentMethod})` : ""}`
          : "Waiter called",
      sub: `${c.table?.label || "Table"} · ${since(c.createdAt)}`,
      accent: c.type === "bill" ? "bg-espresso" : "bg-honey",
    });
  }
  for (const o of newOrders) {
    items.push({
      key: `order-${o.id}`,
      href: "/admin",
      icon: "🍽️",
      title: "New order",
      sub: `${orderLabel(o)} · #${o.id} · ${since(o.createdAt)}`,
      accent: "bg-emerald-500",
    });
  }
  if (unreadFeedback > 0) {
    items.push({
      key: "feedback",
      href: "/admin/feedback",
      icon: "⭐",
      title: `${unreadFeedback} new feedback`,
      sub: "Tap to review",
      accent: "bg-yellow-400",
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`${total} notification${total === 1 ? "" : "s"}`}
        aria-expanded={open}
        className={`relative w-10 h-10 grid place-items-center rounded-full transition ${
          total > 0 ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-neutral-100"
        } ${pulsing ? "animate-bounce" : ""}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`w-5 h-5 ${total > 0 ? "text-amber-600" : "text-neutral-500"}`}
          aria-hidden="true"
        >
          <path d="M10.268 21a2 2 0 0 0 3.464 0" />
          <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
        </svg>
        {total > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 grid place-items-center rounded-full bg-red-600 text-white text-xs font-bold ${
              pulsing ? "animate-pulse ring-2 ring-red-300" : ""
            }`}
          >
            {total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] bg-white border border-ink shadow-xl overflow-hidden z-30">
          <div className="px-4 py-2.5 border-b border-sand flex items-center justify-between">
            <span className="font-black uppercase tracking-wide text-sm">Notifications</span>
            {total > 0 && <span className="text-xs text-neutral-400">{total} pending</span>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-400">
                You&apos;re all caught up 🎉
              </p>
            ) : (
              items.map((it) => (
                <Link
                  key={it.key}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 border-b border-neutral-50 last:border-0"
                >
                  <span
                    className={`w-8 h-8 shrink-0 grid place-items-center rounded-full text-sm ${it.accent} ${
                      it.accent === "bg-honey" || it.accent === "bg-yellow-400"
                        ? "text-neutral-900"
                        : "text-white"
                    }`}
                  >
                    {it.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-neutral-800">
                      {it.title}
                    </span>
                    <span className="block text-xs text-neutral-500 truncate">{it.sub}</span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}