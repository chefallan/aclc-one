import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Runtime queries go through DATABASE_URL. Migrations do not — they use
 * DIRECT_URL, see prisma.config.ts.
 *
 * Which Supabase URL belongs here depends entirely on how the app is running,
 * and the two answers are opposites:
 *
 *   Serverless (Vercel)   The *transaction* pooler, port 6543. Every function
 *                         instance opens its own pool, so the pool must be
 *                         tiny — a handful of instances at max: 10 each will
 *                         exhaust the project's connection cap and everything
 *                         starts failing at once.
 *
 *   Long-lived container  The *session* pooler, port 5432 on the pooler host.
 *                         One process, one pool, prepared statements intact.
 *
 * The default below follows that split so a deploy does not need to remember.
 */
function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const serverless = Boolean(process.env.VERCEL);

  const pool = new Pool({
    connectionString: databaseUrl,
    // Explicit rather than inherited: Supabase caps connections per project and
    // an implicit default makes that ceiling easy to blow through on scale-out.
    max: Number(process.env.DATABASE_POOL_MAX ?? (serverless ? 1 : 10)),
    // A frozen serverless instance holding an idle connection is holding one
    // the rest of the fleet cannot have.
    idleTimeoutMillis: serverless ? 10_000 : 30_000,
    connectionTimeoutMillis: 10_000,
  });

  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
