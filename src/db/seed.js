// Seed the database. Runs against the local file by default, or against Turso
// when TURSO_DATABASE_URL / TURSO_AUTH_TOKEN are set:
//   npm run db:seed                       -> local (file:local.db)
//   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run db:seed  -> Turso
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as schema from "./schema.js";
import { MENU, menuRows } from "./menu-data.js";

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
  .values(MENU.map((c, i) => ({ name: c.category, sortOrder: i + 1 })))
  .returning()
  .all();

const items = menuRows(Object.fromEntries(cats.map((c) => [c.name, c.id])));
await db.insert(schema.menuItems).values(items).run();

await db
  .insert(schema.tables)
  .values(
    Array.from({ length: 8 }, (_, i) => ({
      slug: `t${String(i + 1).padStart(2, "0")}-${Math.random().toString(36).slice(2, 8)}`,
      label: `Table ${i + 1}`,
    }))
  )
  .run();

console.log(`Seeded: ${cats.length} categories, ${items.length} items, 8 tables.`);