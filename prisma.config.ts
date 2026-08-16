import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Migrations must run over a direct connection. A pooler sits in front of
 * multiple backends and cannot hold the advisory lock or the session state
 * Prisma Migrate depends on, so pointing this at DATABASE_URL works locally
 * and then fails against Supabase.
 *
 * DIRECT_URL is optional: with a plain local Postgres both URLs are the same
 * and DATABASE_URL is a fine fallback.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
