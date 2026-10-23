// altitude.cc menu, copied from the old Kyte catalog
// (altitudeph.catalog.kyte.site) with ₱20 added to every price.
// Prices in pesos here; the scripts convert to centavos.
// Cold versions of drinks that also exist hot get an "Iced" prefix so the
// board and receipts can tell them apart.
export const MENU = [
  {
    category: "Hot drinks",
    items: [
      { name: "Flat White", price: 130, description: "Double shot espresso + steamed milk. Same amount of espresso as a latte, but lesser milk." },
      { name: "Latte", price: 140, description: "Double shot espresso + steamed milk. A balanced unsweetened drink. It's not too bitter, but also not too milky." },
      { name: "Americano", price: 120, description: "Double shot espresso + water. The most basic of them all, but sometimes the one with the most complex taste." },
      { name: "Cortado", price: 120, description: "Double shot espresso + steamed milk. This is even smaller than a flat white. Obviously the coffee taste is stronger in this one." },
      { name: "Dirty Matcha Latte", price: 150, description: "Espresso + matcha + milk. When you love coffee and matcha at the same time, but can't decide which one to drink. Drink them both." },
      { name: "Duet", price: 180, description: "Piccolo + single shot of espresso. Two drinks: a piccolo (single shot espresso and steamed milk) and a pure single shot of espresso. A balanced drink vs the espresso's strong taste." },
      { name: "Espresso", price: 120, description: "Double shot espresso. Just espresso. For the cold-hearted." },
      { name: "Hot Chocolate", price: 140, description: "Chocolate + steamed milk. For the kids. But if you're a kid at heart, you can get this too." },
      { name: "Matcha Latte", price: 140, description: "Matcha + steamed milk. For the matcha lovers out there. We see you." },
      { name: "Piccolo", price: 120, description: "Single shot espresso + steamed milk. Small, strong and smooth." },
    ],
  },
  {
    category: "Cold drinks",
    items: [
      { name: "Coco Brew", price: 180, description: "Espresso + coconut cream + milk + condensed milk. We know this is kind of a weird combination for most people. But you gotta trust us on this." },
      { name: "Coco Matcha", price: 180, description: "Matcha + coconut cream + milk + condensed milk. A little experiment turned to something good 😌" },
      { name: "Iced Dirty Matcha Latte", price: 180, description: "Espresso + matcha + milk, sweetened with condensed milk. When matcha is not enough for you, let's put some espresso in for that full kick." },
      { name: "Iced Choco", price: 160, description: "Chocolate + condensed milk + milk." },
      { name: "Iced Matcha Latte", price: 170, description: "Matcha + milk + condensed milk. For our matcha lovers out there. We see you." },
      { name: "Mocha Brew", price: 180, description: "Espresso + chocolate + milk + condensed milk. Coffee and chocolate together, what's not to love?" },
      { name: "White Brew", price: 170, description: "Espresso + milk + condensed milk. This is basically a spanish latte, but cold. Everyone's favorite!" },
      { name: "Iced Ube Latte", price: 160, description: "Ube + milk + condensed milk, over ice. Sweet, creamy and very purple." },
      { name: "Iced Americano", price: 120, description: "Double shot espresso + water, over ice. Clean, bold and refreshing." },
    ],
  },
  {
    category: "Pastries",
    items: [
      { name: "Dark Rye Cookies", price: 50, description: "" },
      { name: "Ssamjang Biscuit", price: 130, description: "With hot honey." },
      { name: "Butter Croissant", price: 120, description: "Flaky, golden and all butter. The classic." },
      { name: "Pain au Chocolat", price: 140, description: "Buttery croissant dough wrapped around dark chocolate." },
      { name: "Almond Croissant", price: 120, description: "Filled with almond cream and topped with toasted almonds." },
    ],
  },
  {
    category: "Snacks",
    items: [{ name: "Grilled Cheese", price: 150, description: "" }],
  },
];

export function menuRows(categoryIds) {
  return MENU.flatMap((c) =>
    c.items.map((it, i) => ({
      categoryId: categoryIds[c.category],
      name: it.name,
      description: it.description,
      priceCents: it.price * 100,
      sortOrder: i + 1,
    }))
  );
}
