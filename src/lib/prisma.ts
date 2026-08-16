import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Runtime queries go through DATABASE_URL.
 *
 * On Supabase this should be the *session* pooler, not the transaction pooler
 * on 6543. We run as a long-lived container rather than serverless, so session
 * mode keeps prepared statements working and avoids the pgbouncer caveats
 * entirely. Migrations use DIRECT_URL instead — see prisma.config.ts.
 */
function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    // Explicit rather than inherited: Supabase caps connections per project and
    // an implicit default makes that ceiling easy to blow through on scale-out.
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
