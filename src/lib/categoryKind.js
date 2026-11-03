// Classify a menu category as a drink or food (sales roll-ups, and food-only
// stock). A category counts as a drink if its name contains any of these
// hints; add to the list if you introduce new drink categories.
const DRINK_HINTS = [
  "coffee", "drink", "beverage", "tea", "juice", "shake",
  "frappe", "soda", "water", "smoothie", "latte", "espresso",
  "add-on", // oat milk, extra shot: drink extras
];
export function categoryKind(name) {
  const n = (name || "").toLowerCase();
  return DRINK_HINTS.some((h) => n.includes(h)) ? "drink" : "food";
}
