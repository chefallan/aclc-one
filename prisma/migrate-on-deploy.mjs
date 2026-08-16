/**
 * Applies migrations during a Vercel production build, and refuses to during
 * any other kind.
 *
 * The hazard this exists to prevent: Vercel builds every branch and every pull
 * request. A plain `prisma migrate deploy` in the build command would let a
 * preview build alter the production database — and the person who opened the
 * pull request would have no idea it happened.
 *
 * So the rule is narrow. Migrations run only when VERCEL_ENV is exactly
 * "production". Previews and local builds generate the client and stop.
 *
 * When it does run and fails, the build fails with it. That is deliberate:
 * shipping code whose columns do not exist yet turns a loud build error into a
 * quiet runtime one.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const env = process.env.VERCEL_ENV;
const where = env ? `VERCEL_ENV=${env}` : "not a Vercel build";

if (env !== "production") {
  console.log(`  Skipping migrations (${where}).`);
  console.log("  They run only on a Vercel production build.");
  process.exit(0);
}

// prisma.config.ts prefers DIRECT_URL and falls back to DATABASE_URL. Migrate
// needs a real session, so on Supabase this must not be the transaction
// pooler — use the direct connection, or the session pooler on an IPv4-only
// network.
if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
  console.error("");
  console.error("  Production build, but neither DIRECT_URL nor DATABASE_URL is set.");
  console.error("  Refusing to build: the schema would not match the code.");
  console.error("");
  process.exit(1);
}

if (!process.env.DIRECT_URL) {
  console.warn("  DIRECT_URL is not set; falling back to DATABASE_URL.");
  console.warn("  On Supabase that is the transaction pooler, which cannot hold");
  console.warn("  the advisory lock Migrate needs. Set DIRECT_URL if this fails.");
}

console.log("  Applying migrations to the production database...");

// Run the CLI's entry point with this same Node rather than going through npx.
// `npx` needs a shell on Windows, and passing args through a shell is both a
// deprecation warning and an injection surface. Resolving the bin avoids both
// and works identically on a Linux build runner.
const cli = createRequire(import.meta.url).resolve("prisma/build/index.js");

const result = spawnSync(process.execPath, [cli, "migrate", "deploy"], {
  stdio: "inherit",
});

// A failure to start the process is not a failed migration, and saying so
// sends you looking at the database instead of at the build image.
if (result.error) {
  console.error("");
  console.error(`  Could not start the Prisma CLI: ${result.error.message}`);
  console.error("");
  process.exit(1);
}

if (result.status !== 0) {
  console.error("");
  console.error("  Migrations failed, so the build is being stopped.");
  console.error("  Deploying now would ship code whose tables do not exist.");
  console.error("");
  process.exit(result.status ?? 1);
}

console.log("  Migrations applied.");
