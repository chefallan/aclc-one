/**
 * Applies migrations during a Vercel production build, and refuses to during
 * any other kind.
 *
 * The hazard this exists to prevent: Vercel builds every branch and every pull
 * request. A plain `prisma migrate deploy` in the build command would let a
 * preview build alter the production database - and the person who opened the
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
// pooler - use the direct connection, or the session pooler on an IPv4-only
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

/**
 * Prisma's own error for a malformed URL is "P1013: invalid port number",
 * which sends you looking at the port - almost never the actual problem. The
 * real cause is nearly always something in the value that a URL parser cannot
 * read, and it is worth naming precisely.
 *
 * Nothing here prints the password or the URL.
 */
function diagnoseUrl(name, raw) {
  const problems = [];

  if (raw !== raw.trim()) {
    problems.push("It has leading or trailing whitespace - often a newline picked up when pasting.");
  }
  const url = raw.trim();

  if (/^["']|["']$/.test(url)) {
    problems.push('It is wrapped in quotes. Vercel stores the value literally, so the quotes become part of it.');
  }
  if (url.includes("[") || url.includes("]")) {
    problems.push("It still contains [ ] - the placeholder from Supabase, such as [YOUR-PASSWORD], was not replaced.");
  }
  if (!/^postgres(ql)?:\/\//.test(url)) {
    problems.push("It does not begin with postgresql:// or postgres://.");
  }

  // Everything between the scheme and the last @ is the user info. A raw
  // @ : / ? # inside the password shifts where the parser thinks the host and
  // port begin, which is exactly how a valid password produces "invalid port".
  const afterScheme = url.replace(/^postgres(ql)?:\/\//, "");
  const lastAt = afterScheme.lastIndexOf("@");
  if (lastAt !== -1) {
    const userinfo = afterScheme.slice(0, lastAt);
    const password = userinfo.slice(userinfo.indexOf(":") + 1);
    // Drop valid %XX escapes before looking for raw characters, or a correctly
    // encoded password is condemned for containing the % that encodes it.
    const raw = password.replace(/%[0-9A-Fa-f]{2}/g, "");
    const offenders = [...new Set((raw.match(/[@/?#[\]%: ]/g) ?? []))];
    if (offenders.length > 0) {
      problems.push(
        `The password contains ${offenders.map((c) => (c === " " ? "a space" : `"${c}"`)).join(", ")}, ` +
          "which must be percent-encoded (@ becomes %40, : becomes %3A, / becomes %2F, # becomes %23)."
      );
    }
    const hostPort = afterScheme.slice(lastAt + 1).split("/")[0];
    const port = hostPort.includes(":") ? hostPort.slice(hostPort.lastIndexOf(":") + 1) : "";
    if (port && !/^\d+$/.test(port)) {
      problems.push(`The port reads as "${port}", which is not a number.`);
    }
  }

  if (problems.length > 0) {
    console.error("");
    console.error(`  ${name} does not parse as a database URL:`);
    console.error("");
    for (const p of problems) console.error(`    - ${p}`);
    console.error("");
    console.error("  Expected shape (session pooler, which is what Migrate wants):");
    console.error("    postgresql://postgres.REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres");
    console.error("");
    process.exit(1);
  }
}

// Both, not just the one Migrate uses. They normally carry the same password,
// so fixing only DIRECT_URL turns a failed build into a deployed app that
// cannot reach its database - a worse outcome, discovered later.
for (const name of ["DIRECT_URL", "DATABASE_URL"]) {
  if (process.env[name]) diagnoseUrl(name, process.env[name]);
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
