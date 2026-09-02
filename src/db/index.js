import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// Uses Turso (libSQL) in production when TURSO_DATABASE_URL is set, and a local
// SQLite file for development otherwise. libSQL is async, so all query helpers
// in lib/data.js are async and must be awaited.
const globalForDb = globalThis;

const client =
  globalForDb.__libsql ??
  createClient({
    url: process.env.TURSO_DATABASE_URL || "file:local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__libsql = client;
}

export const db = drizzle(client, { schema });
export { schema };