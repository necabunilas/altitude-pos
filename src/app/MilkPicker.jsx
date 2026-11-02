"use client";

import { formatPeso } from "@/lib/money";
import { MILKS } from "@/lib/milk";

// Asks dairy or oat milk when a milk drink is added, on the guest's phone and
// at the counter. Picking one adds the drink and closes.
export default function MilkPicker({ item, onPick, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full sm:max-w-sm bg-cream border-t-4 sm:border-4 border-ink p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-brass-dark">Choose milk</div>
            <h3 className="font-black uppercase tracking-tight text-lg leading-tight">{item.name}</h3>
          </div>
          <button onClick={onClose} className="text-mocha/50 text-2xl leading-none" aria-label="Close">
            ×
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {MILKS.map((m) => (
            <button
              key={m.value}
              onClick={() => onPick(m.value)}
              className="border-2 border-ink bg-white py-4 px-2 text-center hover:bg-ink hover:text-white active:scale-[0.98] transition"
            >
              <div className="font-black uppercase tracking-wide text-sm">{m.label}</div>
              <div className="text-xs mt-1 tabular-nums opacity-70">
                {formatPeso(item.priceCents + m.extraCents)}
                {m.extraCents > 0 && ` (+${formatPeso(m.extraCents)})`}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
