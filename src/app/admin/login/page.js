"use client";

import { useState } from "react";
import { RESTAURANT_NAME } from "@/lib/brand";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      // Full-page navigation so the freshly-set cookie is sent with the
      // request for /admin (a client RSC navigation can miss it).
      window.location.assign("/admin");
    } else {
      setBusy(false);
      setError("Wrong password");
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-cream p-4 text-ink">
      <form
        onSubmit={submit}
        className="bg-white border border-ink p-8 w-full max-w-sm space-y-4 text-center"
      >
        <div>
          <h1 className="font-black uppercase tracking-tight text-4xl text-espresso leading-none">
            {RESTAURANT_NAME}
          </h1>
          <p className="text-xs tracking-[0.25em] uppercase text-brass-dark mt-1">
            Staff back office
          </p>
        </div>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full border border-ink px-3 py-2.5 text-center focus:outline-none focus:border-brass"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={busy}
          className="w-full bg-ink text-white py-3 font-black uppercase tracking-wide text-sm disabled:opacity-50 hover:bg-espresso-light transition-colors"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}