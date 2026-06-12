/**
 * Server-only database client.
 *
 * Exposes a single shared Prisma client as `db`. Import it in loaders/actions:
 *
 *     import { db } from "~/db.server";
 *     const notes = await db.note.findMany();
 *
 * The `.server.ts` suffix guarantees this (and the DB credentials) never reach
 * the browser bundle. The data model lives in `prisma/schema.prisma`.
 */
import { PrismaClient } from "@prisma/client";

// Connection string comes from DATABASE_URL (see .env locally, Coolify env vars
// in production). We default to a local file so the app still boots if it's
// unset during local development.
const DATABASE_URL = process.env.DATABASE_URL ?? "file:./dev.db";

function createPrismaClient() {
  const client = new PrismaClient({
    datasources: { db: { url: DATABASE_URL } },
  });

  // Enable WAL mode: lets reads and writes happen concurrently, which keeps a
  // single-container SQLite deployment responsive under modest load.
  // Note: `PRAGMA journal_mode` *returns a row* (the new mode), so this must use
  // $queryRawUnsafe — $executeRawUnsafe rejects statements that return results.
  client
    .$queryRawUnsafe("PRAGMA journal_mode=WAL;")
    .catch((error) => console.warn("Could not enable SQLite WAL mode:", error));

  return client;
}

// In development, React Router's HMR re-imports modules on every save. Without
// this guard each reload would open a brand-new client and leak connections, so
// we stash one client on `globalThis` and reuse it.
const globalForDb = globalThis as unknown as { __db__?: PrismaClient };

export const db = globalForDb.__db__ ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__db__ = db;
}
