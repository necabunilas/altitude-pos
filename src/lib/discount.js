// Senior citizen / PWD discount (PH law: 20% off their own order). For a group
// sharing one order the discount is pro-rata: only the eligible share of the
// bill is discounted, e.g. 1 senior in a party of 3 gets 20% off a third.
export const DISCOUNT_RATE = 0.2;
export const DISCOUNTS = [
  { value: "senior", label: "Senior" },
  { value: "pwd", label: "PWD" },
];
export const discountLabel = (type) =>
  DISCOUNTS.find((d) => d.value === type)?.label || "";

// Discount in centavos for a subtotal. count = eligible people, party = people
// sharing the order. No type means no discount.
export function discountCents(subtotalCents, { type, count = 1, party = 1 } = {}) {
  if (!DISCOUNTS.some((d) => d.value === type)) return 0;
  const p = Math.max(1, Number(party) || 1);
  const c = Math.max(1, Math.min(p, Number(count) || 1));
  return Math.round((subtotalCents * c * DISCOUNT_RATE) / p);
}
