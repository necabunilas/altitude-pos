"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="text-sm px-4 py-2 bg-ink text-white font-black uppercase tracking-wide hover:bg-espresso-light transition-colors"
    >
      Print all
    </button>
  );
}