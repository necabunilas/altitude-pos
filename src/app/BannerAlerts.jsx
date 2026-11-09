"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCallAlerts } from "@/app/admin/useCallAlerts";

// While the counter sits on the home banner, keep listening for staff alerts.
// A new order or a waiter/bill call plays the usual sound and jumps to the
// board. Only does anything on a device logged in as staff (the alerts API
// is staff-only), so guests who open the home page are unaffected.
export default function BannerAlerts() {
  const router = useRouter();
  const { justArrived, orderArrived } = useCallAlerts();

  useEffect(() => {
    if (justArrived || orderArrived) router.push("/admin");
  }, [justArrived, orderArrived, router]);

  // Enter on the banner opens the counter, same as tapping anywhere.
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Enter" && !e.repeat) router.push("/admin/order");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return null;
}
