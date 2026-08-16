/**
 * Creates the first administrator, and the school row the app needs to exist.
 *
 * Without this a fresh deployment is a locked door. Sign-ups can only ever be
 * PENDING students or faculty, only an ADMIN can approve them, and the only
 * other thing that makes an ADMIN is the demo seed — which refuses to run in
 * production, and rightly so, because every account it makes shares one
 * published password.
 *
 * Unlike the seed, this is safe against a real deployment: it creates exactly
 * one account, takes the password from the environment, never prints it, and
 * will not accept a weak one.
 *
 *   ADMIN_EMAIL=you@aclcormoc.edu.ph \
 *   ADMIN_PASSWORD='...' \
 *   ADMIN_FIRST_NAME=Maria ADMIN_LAST_NAME=Santos \
 *   npm run db:create-admin
 *
 * Re-running promotes an existing account to ADMIN rather than failing. The
 * password is only touched if you ask for it with ADMIN_RESET_PASSWORD=1.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const prisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString: databaseUrl })),
});

/** Longer than the eight a student needs: this account approves everyone else. */
const MIN_PASSWORD = 12;

function required(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    console.error(`\n  ${name} is required.\n`);
    process.exit(1);
  }
  return value.trim();
}

/** Host and database only — never the password. */
function describeTarget(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

async function main() {
  console.log("");
  console.log(`  Target: ${describeTarget(databaseUrl!)}`);
  if (/localhost|127\.0\.0\.1/.test(databaseUrl!)) {
    console.log("  This is a LOCAL database. For Supabase, pass DATABASE_URL inline.");
  }
  console.log("");

  const email = required("ADMIN_EMAIL").toLowerCase();
  const password = required("ADMIN_PASSWORD");
  const firstName = required("ADMIN_FIRST_NAME");
  const lastName = required("ADMIN_LAST_NAME");
  const idNumber = process.env.ADMIN_ID_NUMBER?.trim() || null;

  if (password.length < MIN_PASSWORD) {
    console.error(`\n  ADMIN_PASSWORD must be at least ${MIN_PASSWORD} characters.\n`);
    process.exit(1);
  }
  if (password === "password123") {
    console.error("\n  Refusing the demo password for an administrator.\n");
    process.exit(1);
  }

  // The register route returns 503 without this, so a deployment with no
  // school row rejects every sign-up with no explanation.
  let school = await prisma.school.findFirst({ select: { id: true, name: true } });
  if (!school) {
    school = await prisma.school.create({
      data: {
        name: process.env.SCHOOL_NAME?.trim() || "ACLC College of Ormoc",
        timezone: process.env.SCHOOL_TIMEZONE?.trim() || "Asia/Manila",
      },
      select: { id: true, name: true },
    });
    console.log(`  Created the school record: ${school.name}`);
  } else {
    console.log(`  School already present: ${school.name}`);
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, status: true },
  });

  if (existing) {
    const resetPassword = process.env.ADMIN_RESET_PASSWORD === "1";
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: "ADMIN",
        status: "ACTIVE",
        approvedAt: new Date(),
        emailVerifiedAt: new Date(),
        ...(resetPassword ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
      },
    });
    console.log(`  Promoted ${email} to ADMIN (was ${existing.role}/${existing.status}).`);
    console.log(
      resetPassword
        ? "  Password was reset."
        : "  Password left as it was — set ADMIN_RESET_PASSWORD=1 to change it."
    );
  } else {
    await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        firstName,
        lastName,
        role: "ADMIN",
        idNumber,
        status: "ACTIVE",
        approvedAt: new Date(),
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`  Created administrator ${email}.`);
  }

  console.log("\n  Sign in, then approve everyone else from Requests.\n");
}

main()
  .catch((e: unknown) => {
    const code = (e as { code?: string })?.code;

    if (code === "P2021" || /does not exist in the current database/.test(String(e))) {
      console.error("");
      console.error("  The tables are not there yet. Run the migrations first:");
      console.error("");
      console.error("    DIRECT_URL='<direct or session-pooler URL>' npx prisma migrate deploy");
      console.error("");
      process.exit(1);
    }

    if (code === "P1001" || /Can't reach database server/.test(String(e))) {
      console.error("");
      console.error("  Could not reach the database.");
      console.error("");
      console.error("  On Supabase the direct connection is IPv6-only on newer projects.");
      console.error("  If your network is IPv4, use the session pooler URL instead");
      console.error("  (port 5432 on the ...pooler.supabase.com host).");
      console.error("");
      process.exit(1);
    }

    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
