import { sql } from "drizzle-orm";
import {
  sqliteTable,
  integer,
  text,
  real,
} from "drizzle-orm/sqlite-core";

// Physical tables in the restaurant. `slug` is what the QR code encodes.
export const tables = sqliteTable("tables", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(), // e.g. "Table 5"
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const menuCategories = sqliteTable("menu_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Prices are stored in centavos (integer) to avoid float rounding.
export const menuItems = sqliteTable("menu_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id")
    .notNull()
    .references(() => menuCategories.id),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  priceCents: integer("price_cents").notNull(),
  available: integer("available", { mode: "boolean" })
    .notNull()
    .default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// status: placed -> preparing -> served -> closed | cancelled
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tableId: integer("table_id")
    .notNull()
    .references(() => tables.id),
  status: text("status").notNull().default("placed"),
  note: text("note").notNull().default(""),
  // Name the guest gives when placing a table order (blank for counter orders,
  // whose name lives on their hidden table's label).
  customerName: text("customer_name").notNull().default(""),
  // Set when payment is recorded ("Mark paid"); order stays open on the board.
  paidAt: integer("paid_at", { mode: "timestamp" }),
  // How the guest paid: "cash" | "card" (from the bill request).
  paymentMethod: text("payment_method"),
  // Payment source + reference (e.g. maya_terminal + txn ref) for the terminal
  // upgrade; null for cash / manual card.
  paymentProvider: text("payment_provider"),
  paymentRef: text("payment_ref"),
  // Set when the order is finalized ("Close"); moves it to sales.
  closedAt: integer("closed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Line items snapshot name + price so history is stable if the menu changes.
export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  menuItemId: integer("menu_item_id").references(() => menuItems.id),
  name: text("name").notNull(),
  priceCents: integer("price_cents").notNull(),
  qty: integer("qty").notNull(),
  note: text("note").notNull().default(""),
  // Per-item kitchen status: "placed" -> "preparing" -> "served".
  status: text("status").notNull().default("placed"),
  // Items added together share a round; "Start preparing" acts on a round.
  round: integer("round").notNull().default(1),
});

// Waiter / bill requests. type: "waiter" | "bill". status: open | resolved
export const calls = sqliteTable("calls", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tableId: integer("table_id")
    .notNull()
    .references(() => tables.id),
  type: text("type").notNull(),
  status: text("status").notNull().default("open"),
  // For bill requests: "cash" | "card" (null for waiter calls).
  paymentMethod: text("payment_method"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const feedback = sqliteTable("feedback", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tableId: integer("table_id").references(() => tables.id),
  orderId: integer("order_id").references(() => orders.id),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment").notNull().default(""),
  // Optional reviewer name (empty = anonymous).
  name: text("name").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});