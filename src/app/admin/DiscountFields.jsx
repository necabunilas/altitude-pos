"use client";

import { DISCOUNTS, discountLabel } from "@/lib/discount";

export const NO_DISCOUNT = { type: null, count: 1, party: 1, idNo: "" };

// Senior / PWD discount controls, shared by the counter and Edit order.
// value = { type, count, party, idNo }. The steppers say how many eligible
// people are in the party sharing the order (1 of 1 for a solo guest).
export default function DiscountFields({ value, onChange, disabled = false }) {
  const v = value || NO_DISCOUNT;
  const set = (patch) => onChange({ ...v, ...patch });
  const pick = (type) =>
    onChange(type === v.type || !type ? NO_DISCOUNT : { ...v, type });
  const setParty = (party) => {
    const p = Math.max(1, Math.min(50, party));
    set({ party: p, count: Math.min(v.count, p) });
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {[{ value: null, label: "No discount" }, ...DISCOUNTS].map((d) => (
          <button
            key={d.label}
            type="button"
            onClick={() => pick(d.value)}
            disabled={disabled}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-wide border disabled:opacity-60 ${
              v.type === d.value
                ? d.value
                  ? "bg-brass text-ink border-ink"
                  : "bg-ink text-white border-ink"
                : "bg-white border-ink text-ink"
            }`}
          >
            {d.value ? `${d.label} 20%` : d.label}
          </button>
        ))}
      </div>
      {v.type && (
        <>
          <div className="flex items-center gap-2 text-sm">
            <Stepper
              value={v.count}
              onChange={(c) => set({ count: Math.max(1, Math.min(v.party, c)) })}
              max={v.party}
              disabled={disabled}
            />
            <span className="text-mocha">of</span>
            <Stepper value={v.party} onChange={setParty} max={50} disabled={disabled} />
            <span className="text-mocha">people</span>
          </div>
          <input
            value={v.idNo}
            onChange={(e) => set({ idNo: e.target.value.slice(0, 80) })}
            disabled={disabled}
            placeholder={`${discountLabel(v.type)} ID no. (optional)`}
            className="w-full border border-ink px-3 py-2 text-sm bg-white focus:outline-none focus:border-brass"
          />
        </>
      )}
    </div>
  );
}

function Stepper({ value, onChange, max, disabled }) {
  return (
    <div className="flex items-center border border-ink bg-white">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= 1}
        className="w-7 h-7 text-lg leading-none disabled:opacity-30"
      >
        −
      </button>
      <span className="w-6 text-center font-bold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        className="w-7 h-7 text-lg leading-none disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}
