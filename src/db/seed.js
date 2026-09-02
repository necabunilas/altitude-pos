// Seed the database. Runs against the local file by default, or against Turso
// when TURSO_DATABASE_URL / TURSO_AUTH_TOKEN are set:
//   npm run db:seed                       -> local (file:local.db)
//   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run db:seed  -> Turso
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as schema from "./schema.js";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client, { schema });

// Apply migration SQL files so a fresh database is built from scratch.
const migDir = join(process.cwd(), "drizzle");
for (const file of readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort()) {
  const raw = readFileSync(join(migDir, file), "utf8");
  for (const stmt of raw.split("--> statement-breakpoint")) {
    const s = stmt.trim();
    if (!s) continue;
    try {
      await client.execute(s);
    } catch (e) {
      // Ignore "already applied" errors so re-seeding is safe.
      if (!/already exists|duplicate column/i.test(e.message)) throw e;
    }
  }
}

// Wipe (dev/setup) so re-seeding is idempotent.
for (const t of [
  "feedback",
  "order_items",
  "orders",
  "calls",
  "menu_items",
  "menu_categories",
  "tables",
]) {
  await client.execute(`DELETE FROM ${t}`);
}

const cats = await db
  .insert(schema.menuCategories)
  .values([
    { name: "Coffee", sortOrder: 1 },
    { name: "Non-Coffee", sortOrder: 2 },
    { name: "Food", sortOrder: 3 },
    { name: "Pastries", sortOrder: 4 },
  ])
  .returning()
  .all();

const byName = Object.fromEntries(cats.map((c) => [c.name, c.id]));

await db
  .insert(schema.menuItems)
  .values([
    { categoryId: byName.Coffee, name: "Espresso", description: "Double shot, house blend", priceCents: 11000, sortOrder: 1 },
    { categoryId: byName.Coffee, name: "Flat White", description: "Ristretto shots, velvet microfoam", priceCents: 15000, sortOrder: 2 },
    { categoryId: byName.Coffee, name: "Cappuccino", description: "Espresso, steamed milk, thick foam", priceCents: 14000, sortOrder: 3 },
    { categoryId: byName.Coffee, name: "Iced Spanish Latte", description: "Sweet condensed milk over ice", priceCents: 16000, sortOrder: 4 },
    { categoryId: byName.Coffee, name: "Cold Brew", description: "18-hour steep, bright and smooth", priceCents: 15000, sortOrder: 5 },
    { categoryId: byName["Non-Coffee"], name: "Matcha Latte", description: "Ceremonial matcha, fresh milk", priceCents: 16000, sortOrder: 1 },
    { categoryId: byName["Non-Coffee"], name: "Hot Chocolate", description: "Dark couverture, steamed milk", priceCents: 14000, sortOrder: 2 },
    { categoryId: byName["Non-Coffee"], name: "Sparkling Citrus", description: "Calamansi, soda, mint", priceCents: 12000, sortOrder: 3 },
    { categoryId: byName.Food, name: "Avocado Toast", description: "Sourdough, chili flakes, poached egg", priceCents: 22000, sortOrder: 1 },
    { categoryId: byName.Food, name: "Chicken Pesto Panini", description: "Grilled, basil pesto, mozzarella", priceCents: 24000, sortOrder: 2 },
    { categoryId: byName.Food, name: "Power Bowl", description: "Quinoa, greens, egg, seeds", priceCents: 26000, sortOrder: 3 },
    { categoryId: byName.Pastries, name: "Butter Croissant", description: "Laminated, baked fresh daily", priceCents: 9000, sortOrder: 1 },
    { categoryId: byName.Pastries, name: "Banana Bread", description: "Toasted, salted butter", priceCents: 8500, sortOrder: 2 },
    { categoryId: byName.Pastries, name: "Dark Chocolate Cookie", description: "Sea salt, gooey center", priceCents: 7000, sortOrder: 3 },
  ])
  .run();

await db
  .insert(schema.tables)
  .values(
    Array.from({ length: 8 }, (_, i) => ({
      slug: `t${String(i + 1).padStart(2, "0")}-${Math.random().toString(36).slice(2, 8)}`,
      label: `Table ${i + 1}`,
    }))
  )
  .run();

console.log("Seeded: 4 categories, 14 items, 8 tables.");