import { db, schema } from "@/db";
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, ne, sql } from "drizzle-orm";

const { tables, menuCategories, menuItems, orders, orderItems, calls, feedback } =
  schema;

// libSQL is async — every helper here returns a Promise and must be awaited.

// Classify a menu category as a drink or food for accounting roll-ups. A
// category counts as a drink if its name contains any of these hints; add to
// the list if you introduce new drink categories.
const DRINK_HINTS = [
  "coffee", "drink", "beverage", "tea", "juice", "shake",
  "frappe", "soda", "water", "smoothie", "latte", "espresso",
  "add-on", // oat milk, extra shot: drink extras
];
export function categoryKind(name) {
  const n = (name || "").toLowerCase();
  return DRINK_HINTS.some((h) => n.includes(h)) ? "drink" : "food";
}

export async function getTableBySlug(slug) {
  return db.select().from(tables).where(eq(tables.slug, slug)).get();
}

// Menu grouped by category. `onlyAvailable` for the customer view.
export async function getMenu({ onlyAvailable = false } = {}) {
  const [cats, allItems] = await Promise.all([
    db.select().from(menuCategories).orderBy(asc(menuCategories.sortOrder)).all(),
    db.select().from(menuItems).orderBy(asc(menuItems.sortOrder)).all(),
  ]);
  const items = allItems.filter((i) => (onlyAvailable ? i.available : true));
  const menu = cats.map((c) => ({
    ...c,
    items: items.filter((i) => i.categoryId === c.id),
  }));
  // Customers shouldn't see a category header with nothing under it; staff
  // still need empty categories in the menu editor to add items to them.
  return onlyAvailable ? menu.filter((c) => c.items.length) : menu;
}

// Create an order from a cart of { menuItemId, qty, note }.
export async function placeOrder({ tableId, cart, note = "", customerName = "" }) {
  const cleanName = String(customerName || "").trim().slice(0, 40);
  const ids = cart.map((c) => c.menuItemId);
  const found = ids.length
    ? await db.select().from(menuItems).where(inArray(menuItems.id, ids)).all()
    : [];
  const byId = Object.fromEntries(found.map((i) => [i.id, i]));

  const lines = cart
    .map((c) => {
      const item = byId[c.menuItemId];
      if (!item || !item.available) return null;
      const qty = Math.max(1, Math.min(50, Number(c.qty) || 1));
      return {
        menuItemId: item.id,
        name: item.name,
        priceCents: item.priceCents,
        qty,
        note: String(c.note || "").slice(0, 200),
      };
    })
    .filter(Boolean);

  if (!lines.length) throw new Error("No valid items in cart");

  // One active order per table, enforced by a unique partial index
  // (orders_one_open_per_table). If the table already has an open (unpaid,
  // non-cancelled) order, append the new items to it instead of creating a
  // second one. The loop makes this race-safe: if a concurrent request wins
  // the insert, our insert hits the unique constraint and we retry — this time
  // finding the now-existing order and appending to it.
  for (let attempt = 0; ; attempt++) {
    const active = await listOrders({ activeOnly: true });
    const existing = active.find((o) => o.tableId === tableId);

    if (existing) {
      // Once the bill is paid, no more items can be added to this order.
      if (existing.paidAt) {
        throw new Error("This order is already paid.");
      }
      // Append the new items to the table's open order (one eating session).
      // Newly added items start as "placed"; already-served items keep status.
      await db
        .insert(orderItems)
        .values(lines.map((l) => ({ ...l, orderId: existing.id, status: "placed" })))
        .run();
      const cleanNote = String(note || "").trim();
      if (cleanNote) {
        const merged = ((existing.note ? existing.note + " | " : "") + cleanNote).slice(0, 300);
        await db.update(orders).set({ note: merged }).where(eq(orders.id, existing.id)).run();
      }
      // Keep the first name given; only fill it in if the order has none yet.
      if (cleanName && !existing.customerName) {
        await db.update(orders).set({ customerName: cleanName }).where(eq(orders.id, existing.id)).run();
      }
      return { id: existing.id, appended: true };
    }

    try {
      const order = await db
        .insert(orders)
        .values({ tableId, note: String(note || "").slice(0, 300), customerName: cleanName })
        .returning()
        .get();

      await db
        .insert(orderItems)
        .values(lines.map((l) => ({ ...l, orderId: order.id, status: "placed" })))
        .run();

      return order;
    } catch (e) {
      // Lost the race to open the table's order — retry to append to it.
      if (attempt < 2 && /UNIQUE constraint failed/i.test(String(e?.message))) continue;
      throw e;
    }
  }
}

// Derived order status from its per-item statuses (cancelled stays cancelled).
export function deriveOrderStatus(order) {
  if (order.status === "cancelled") return "cancelled";
  const its = order.items || [];
  if (its.length && its.every((i) => i.status === "served")) return "served";
  if (its.some((i) => i.status === "preparing")) return "preparing";
  return "placed";
}

// Orders with their line items, newest first. Optionally filter out closed.
export async function listOrders({ activeOnly = false } = {}) {
  // "Active" = not yet closed and not cancelled. Filter in SQL so we only pull
  // open orders (a small set) instead of the whole history.
  const ordersQuery = activeOnly
    ? db
        .select()
        .from(orders)
        .where(and(isNull(orders.closedAt), ne(orders.status, "cancelled")))
        .orderBy(desc(orders.createdAt))
    : db.select().from(orders).orderBy(desc(orders.createdAt));
  const [rows, tableRows] = await Promise.all([
    ordersQuery.all(),
    db.select().from(tables).all(),
  ]);
  const tById = Object.fromEntries(tableRows.map((t) => [t.id, t]));
  const orderIds = rows.map((o) => o.id);
  const items = orderIds.length
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)).all()
    : [];
  return rows.map((o) => {
    const its = items.filter((i) => i.orderId === o.id).sort((a, b) => a.id - b.id);
    const enriched = {
      ...o,
      table: tById[o.tableId] || null,
      items: its,
      totalCents: its.reduce((s, i) => s + i.priceCents * i.qty, 0),
    };
    enriched.status = deriveOrderStatus(enriched);
    return enriched;
  });
}

// Cancel a whole order (order-level). Per-item prep is handled separately.
export async function cancelOrder(id) {
  const order = await db.select().from(orders).where(eq(orders.id, id)).get();
  if (order?.paidAt) throw new Error("Can't cancel a paid order.");
  return db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, id)).returning().get();
}

// Permanently delete an order (active, paid or closed), e.g. one rung up by
// mistake. Removes its items so it drops out of sales totals; feedback that
// pointed at it is kept but unlinked. If it was the table's open order, any
// open waiter/bill calls for that table are cleared too.
export async function deleteOrder(id) {
  const order = await db.select().from(orders).where(eq(orders.id, id)).get();
  if (!order) return null;
  await db.batch([
    db.update(feedback).set({ orderId: null }).where(eq(feedback.orderId, id)),
    db.delete(orderItems).where(eq(orderItems.orderId, id)),
    db.delete(orders).where(eq(orders.id, id)),
  ]);
  if (!order.closedAt) {
    await db
      .update(calls)
      .set({ status: "resolved" })
      .where(and(eq(calls.tableId, order.tableId), eq(calls.status, "open")))
      .run();
  }
  return order;
}

// Advance a single item's status ("preparing" or "served").
export async function setItemStatus(itemId, status) {
  if (!["placed", "preparing", "served"].includes(status)) throw new Error("Bad item status");
  return db
    .update(orderItems)
    .set({ status })
    .where(eq(orderItems.id, itemId))
    .returning()
    .get();
}

// Staff void: remove a line from an order. Blocked once the order is paid.
export async function voidItem(itemId) {
  const item = await db.select().from(orderItems).where(eq(orderItems.id, itemId)).get();
  if (!item) return null;
  const order = await db.select().from(orders).where(eq(orders.id, item.orderId)).get();
  if (order?.paidAt) throw new Error("Can't void an item on a paid order.");
  return db.delete(orderItems).where(eq(orderItems.id, itemId)).returning().get();
}

// Unpaid, non-cancelled orders for one table, with items + totals. Used to
// build the bill when a table is settled.
export async function getTableOpenOrders(tableId) {
  const active = await listOrders({ activeOnly: true });
  return active.filter((o) => o.tableId === tableId);
}

// Record payment for a table's open orders (keeps them open on the board) and
// resolve any open bill request.
export async function markTablePaid(tableId, opts = {}) {
  const when = opts.when || new Date();
  const open = await getTableOpenOrders(tableId);
  const unpaid = open.filter((o) => !o.paidAt);
  // Use the explicit method (e.g. terminal) or carry it from the bill request.
  let method = opts.method || null;
  if (!method) {
    const billCall = await db
      .select()
      .from(calls)
      .where(and(eq(calls.tableId, tableId), eq(calls.type, "bill"), eq(calls.status, "open")))
      .get();
    // Only carry a concrete tender; the "cash_qr" request hint isn't a real
    // method, so leave it unset for staff to choose at settle time.
    method = ["cash", "card", "qr"].includes(billCall?.paymentMethod)
      ? billCall.paymentMethod
      : null;
  }
  const provider = opts.provider || null;
  const ref = opts.ref || null;
  if (unpaid.length) {
    await db
      .update(orders)
      .set({ paidAt: when, paymentMethod: method, paymentProvider: provider, paymentRef: ref })
      .where(inArray(orders.id, unpaid.map((o) => o.id)))
      .run();
  }
  await resolveBillCalls(tableId);
  return open.map((o) => ({
    ...o,
    paidAt: o.paidAt || when,
    paymentMethod: o.paymentMethod || method,
    paymentProvider: o.paymentProvider || provider,
    paymentRef: o.paymentRef || ref,
  }));
}

// Attach a pending payment reference (e.g. a Maya checkoutId) to the table's
// unpaid open orders. Returns the amount due so a checkout can be created.
export async function setTablePaymentPending(tableId, { provider, ref }) {
  const open = await getTableOpenOrders(tableId);
  const unpaid = open.filter((o) => !o.paidAt);
  if (unpaid.length) {
    await db
      .update(orders)
      .set({ paymentProvider: provider, paymentRef: ref })
      .where(inArray(orders.id, unpaid.map((o) => o.id)))
      .run();
  }
  return { amountCents: unpaid.reduce((s, o) => s + o.totalCents, 0), count: unpaid.length };
}

// Close a table's paid orders (moves them to sales). Requires every item
// served and every order paid.
export async function closeTable(tableId, when = new Date()) {
  const open = await getTableOpenOrders(tableId);
  if (!open.length) return [];
  if (open.some((o) => !o.paidAt)) {
    throw new Error("Mark the bill paid before closing.");
  }
  if (open.flatMap((o) => o.items).some((i) => i.status !== "served")) {
    throw new Error("All items must be served before closing.");
  }
  await db
    .update(orders)
    .set({ status: "closed", closedAt: when })
    .where(inArray(orders.id, open.map((o) => o.id)))
    .run();
  return open.map((o) => ({ ...o, status: "closed", closedAt: when }));
}

// Completed sales (closed orders) with items, table, and total, closed in the
// [from, to] range. Paginated (limit/offset) — the summary still reflects the
// whole range, computed with SQL aggregates so history isn't fully loaded.
export async function listSales({ from, to, limit = 50, offset = 0 } = {}) {
  const conds = [isNotNull(orders.closedAt)];
  if (from) conds.push(gte(orders.closedAt, from));
  if (to) conds.push(lte(orders.closedAt, to));
  const where = and(...conds);

  const [orderRows, tableRows, countRow, revRow, methodRows, catRows] = await Promise.all([
    db.select().from(orders).where(where).orderBy(desc(orders.closedAt)).limit(limit).offset(offset).all(),
    db.select().from(tables).all(),
    db.select({ n: sql`count(*)`.mapWith(Number) }).from(orders).where(where).get(),
    db
      .select({ r: sql`coalesce(sum(${orderItems.priceCents} * ${orderItems.qty}), 0)`.mapWith(Number) })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(where)
      .get(),
    db
      .select({
        method: orders.paymentMethod,
        r: sql`coalesce(sum(${orderItems.priceCents} * ${orderItems.qty}), 0)`.mapWith(Number),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(where)
      .groupBy(orders.paymentMethod)
      .all(),
    // Revenue + units sold per menu category over the range. Left-joins so
    // items whose menu entry was deleted still count (as "Uncategorized").
    db
      .select({
        category: menuCategories.name,
        r: sql`coalesce(sum(${orderItems.priceCents} * ${orderItems.qty}), 0)`.mapWith(Number),
        qty: sql`coalesce(sum(${orderItems.qty}), 0)`.mapWith(Number),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .leftJoin(menuItems, eq(menuItems.id, orderItems.menuItemId))
      .leftJoin(menuCategories, eq(menuCategories.id, menuItems.categoryId))
      .where(where)
      .groupBy(menuCategories.name)
      .all(),
  ]);

  const tById = Object.fromEntries(tableRows.map((t) => [t.id, t]));
  const ids = orderRows.map((o) => o.id);
  const items = ids.length
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, ids)).all()
    : [];
  const sales = orderRows.map((o) => {
    const its = items.filter((i) => i.orderId === o.id);
    return {
      ...o,
      table: tById[o.tableId] || null,
      items: its,
      totalCents: its.reduce((s, i) => s + i.priceCents * i.qty, 0),
    };
  });
  const count = countRow?.n || 0;
  let cashCents = 0, cardCents = 0, qrCents = 0, otherCents = 0;
  for (const m of methodRows) {
    if (m.method === "cash") cashCents += m.r;
    else if (m.method === "card") cardCents += m.r;
    else if (m.method === "qr") qrCents += m.r;
    else otherCents += m.r;
  }
  // Per-category revenue + units, tagged food vs drink, highest revenue first.
  const categoryBreakdown = catRows
    .map((r) => ({
      category: r.category || "Uncategorized",
      kind: r.category ? categoryKind(r.category) : "food",
      revenueCents: r.r,
      qty: r.qty,
    }))
    .sort((a, b) => b.revenueCents - a.revenueCents);
  const foodCents = categoryBreakdown
    .filter((c) => c.kind === "food")
    .reduce((s, c) => s + c.revenueCents, 0);
  const drinkCents = categoryBreakdown
    .filter((c) => c.kind === "drink")
    .reduce((s, c) => s + c.revenueCents, 0);
  return {
    sales,
    summary: {
      count,
      revenueCents: revRow?.r || 0,
      cashCents,
      cardCents,
      qrCents,
      otherCents,
      categoryBreakdown,
      foodCents,
      drinkCents,
    },
    hasMore: offset + sales.length < count,
  };
}

export async function createCall({ tableId, type, paymentMethod = null }) {
  if (!["waiter", "bill"].includes(type)) throw new Error("Bad call type");
  const method =
    type === "bill" && ["cash", "card", "qr"].includes(paymentMethod) ? paymentMethod : null;
  // Collapse duplicate open calls of the same type for a table (refresh the
  // chosen payment method if a bill is re-requested).
  const existing = await db
    .select()
    .from(calls)
    .where(and(eq(calls.tableId, tableId), eq(calls.type, type), eq(calls.status, "open")))
    .get();
  if (existing) {
    if (type === "bill" && method && existing.paymentMethod !== method) {
      await db.update(calls).set({ paymentMethod: method }).where(eq(calls.id, existing.id)).run();
      return { ...existing, paymentMethod: method };
    }
    return existing;
  }
  return db.insert(calls).values({ tableId, type, paymentMethod: method }).returning().get();
}

export async function listOpenCalls() {
  const [rows, tableRows] = await Promise.all([
    db.select().from(calls).where(eq(calls.status, "open")).orderBy(asc(calls.createdAt)).all(),
    db.select().from(tables).all(),
  ]);
  const tById = Object.fromEntries(tableRows.map((t) => [t.id, t]));
  return rows.map((c) => ({ ...c, table: tById[c.tableId] || null }));
}

// Resolve open bill request(s) for a table without closing the order.
export async function resolveBillCalls(tableId) {
  await db
    .update(calls)
    .set({ status: "resolved" })
    .where(and(eq(calls.tableId, tableId), eq(calls.type, "bill"), eq(calls.status, "open")))
    .run();
  return { ok: true };
}

export async function resolveCall(id) {
  return db
    .update(calls)
    .set({ status: "resolved" })
    .where(eq(calls.id, id))
    .returning()
    .get();
}

export async function createFeedback({ tableId, orderId, rating, comment, name }) {
  const r = Math.max(1, Math.min(5, Number(rating) || 0));
  return db
    .insert(feedback)
    .values({
      tableId: tableId || null,
      orderId: orderId || null,
      rating: r,
      comment: String(comment || "").slice(0, 1000),
      name: String(name || "").trim().slice(0, 80),
    })
    .returning()
    .get();
}

export async function listFeedback() {
  const [rows, tableRows] = await Promise.all([
    db.select().from(feedback).orderBy(desc(feedback.createdAt)).limit(200).all(),
    db.select().from(tables).all(),
  ]);
  const tById = Object.fromEntries(tableRows.map((t) => [t.id, t]));
  return rows.map((f) => ({ ...f, table: f.tableId ? tById[f.tableId] : null }));
}

export async function listTables() {
  return db.select().from(tables).orderBy(asc(tables.id)).all();
}

// Staff counter/bar order for walk-ins with no table QR. Creates a standalone
// hidden table (active:false, so it never shows a QR) so the order is billed
// and closed independently on the board, then places the order against it.
export async function placeCounterOrder({ label, cart, note = "", paymentMethod = null }) {
  const clean = String(label || "").trim().slice(0, 40) || "Counter";
  const slug = `counter-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const table = await db
    .insert(tables)
    .values({ slug, label: clean, active: false })
    .returning()
    .get();
  const order = await placeOrder({ tableId: table.id, cart, note });
  // Counter/bar is pay-first: if a method is chosen, mark it paid right away.
  // The order still stays open on the board until it is served and closed.
  const method = ["cash", "card", "qr"].includes(paymentMethod) ? paymentMethod : null;
  if (method) await markTablePaid(table.id, { method });
  return { orderId: order.id, tableId: table.id, label: clean, method };
}

// ---- Menu management (staff) ----

export async function createMenuItem({ categoryId, name, description, priceCents, sortOrder }) {
  return db
    .insert(menuItems)
    .values({
      categoryId: Number(categoryId),
      name: String(name).slice(0, 120),
      description: String(description || "").slice(0, 300),
      priceCents: Math.max(0, Math.round(Number(priceCents) || 0)),
      sortOrder: Number(sortOrder) || 0,
    })
    .returning()
    .get();
}

export async function updateMenuItem(id, patch) {
  const fields = {};
  if (patch.name != null) fields.name = String(patch.name).slice(0, 120);
  if (patch.description != null) fields.description = String(patch.description).slice(0, 300);
  if (patch.priceCents != null) fields.priceCents = Math.max(0, Math.round(Number(patch.priceCents)));
  if (patch.available != null) fields.available = !!patch.available;
  if (patch.categoryId != null) fields.categoryId = Number(patch.categoryId);
  if (patch.sortOrder != null) fields.sortOrder = Number(patch.sortOrder);
  if (!Object.keys(fields).length) return null;
  return db.update(menuItems).set(fields).where(eq(menuItems.id, id)).returning().get();
}

export async function deleteMenuItem(id) {
  // Past order lines keep their own name + price; unlink them so the delete
  // isn't blocked by the foreign key (Sales lists them as "Uncategorized").
  await db.update(orderItems).set({ menuItemId: null }).where(eq(orderItems.menuItemId, id)).run();
  return db.delete(menuItems).where(eq(menuItems.id, id)).returning().get();
}

export async function createCategory({ name, sortOrder }) {
  return db
    .insert(menuCategories)
    .values({ name: String(name).slice(0, 80), sortOrder: Number(sortOrder) || 0 })
    .returning()
    .get();
}

// Delete a category only when it has no items (keeps historical items safe).
export async function deleteCategory(id) {
  const items = await db.select().from(menuItems).where(eq(menuItems.categoryId, id)).all();
  if (items.length) throw new Error("Remove the items in this category first.");
  return db.delete(menuCategories).where(eq(menuCategories.id, id)).returning().get();
}