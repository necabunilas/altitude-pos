"use client";

import { useState } from "react";

// Generic destructive-action confirmation, styled like the app's other
// modals. `onConfirm` may return { ok, error }; anything else counts as ok.
// The modal closes itself on success and shows the error otherwise.
export default function ConfirmModal({
  icon = "🗑️",
  title,
  children,
  confirmLabel = "Delete",
  busyLabel = "Deleting…",
  cancelLabel = "Keep",
  onConfirm,
  onClose,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await onConfirm();
    if (r && r.ok === false) {
      setError(r.error || "Something went wrong. Try again.");
      setBusy(false);
    } else {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={busy ? undefined : onClose} />
      <div className="relative bg-white border border-ink w-full max-w-xs p-6 text-center">
        <div className="text-5xl mb-2">{icon}</div>
        <h3 className="font-display text-2xl text-espresso">{title}</h3>
        {children}
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-2.5 border border-ink text-sm font-black uppercase tracking-wide text-ink hover:bg-ink hover:text-white transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={confirm}
            disabled={busy}
            className="flex-1 py-2.5 bg-red-600 text-white text-sm font-black uppercase tracking-wide hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
