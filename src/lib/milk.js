// Milk choice for drinks flagged `milkOption`. Dairy is the default; oat milk
// adds a surcharge and is written into the line name so the board, receipts
// and sales all show it, e.g. "Flat White (Oat milk)".
export const OAT_MILK_CENTS = 3000;

export const MILKS = [
  { value: "dairy", label: "Dairy milk", extraCents: 0 },
  { value: "oat", label: "Oat milk", extraCents: OAT_MILK_CENTS },
];

export function milkExtra(milk) {
  return milk === "oat" ? OAT_MILK_CENTS : 0;
}

export function milkLineName(name, milk) {
  return milk === "oat" ? `${name} (Oat milk)` : name;
}

// Cart key for one item + milk choice, so a dairy and an oat Flat White are
// separate lines. Items without a milk option keep the plain id.
export function cartKey(id, milk) {
  return milk ? `${id}:${milk}` : String(id);
}

export function parseCartKey(key) {
  const [id, milk] = String(key).split(":");
  return { id: Number(id), milk: milk || null };
}
