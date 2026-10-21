// Replace the menu (categories + items) with src/db/menu-data.js, leaving
// tables (and their QR slugs), orders, sales and feedback untouched.
//   npm run db:menu                       -> local (file:local.db)
//   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run db:menu  -> Turso
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";
import { MENU, menuRows } from "./menu-data.js";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client, { schema });

// Past order lines keep their own name + price, so unlink them from the old
// menu items before deleting those (Sales shows them as "Uncategorized").
await client.batch(
  [
    "UPDATE order_items SET menu_item_id = NULL",
    "DELETE FROM menu_items",
    "DELETE FROM menu_categories",
  ],
  "write"
);

const cats = await db
  .insert(schema.menuCategories)
  .values(MENU.map((c, i) => ({ name: c.category, sortOrder: i + 1 })))
  .returning()
  .all();

const rows = menuRows(Object.fromEntries(cats.map((c) => [c.name, c.id])));
await db.insert(schema.menuItems).values(rows).run();

console.log(`Menu replaced: ${cats.length} categories, ${rows.length} items.`);
