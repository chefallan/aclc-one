/**
 * Builds Supabase connection URLs with the password correctly encoded.
 *
 * A password containing @ / : # or a space cannot go into a URL as-is - the
 * parser reads those as the boundary between user, host and port, and Prisma
 * reports "P1013: invalid port number", which points at the wrong thing.
 *
 * Usage, keeping the password out of shell history:
 *
 *   read -rsp 'Supabase DB password: ' DB_PASSWORD; echo
 *   DB_PASSWORD="$DB_PASSWORD" node prisma/encode-db-url.mjs <ref> <region>
 *
 * e.g. node prisma/encode-db-url.mjs abcdefghijkl ap-southeast-1
 */
const [ref, region] = process.argv.slice(2);
const password = process.env.DB_PASSWORD;

if (!ref || !region || !password) {
  console.error("");
  console.error("  Usage:");
  console.error("    read -rsp 'Supabase DB password: ' DB_PASSWORD; echo");
  console.error("    DB_PASSWORD=\"$DB_PASSWORD\" node prisma/encode-db-url.mjs <ref> <region>");
  console.error("");
  console.error("  <ref>    the project ref, as in db.<ref>.supabase.co");
  console.error("  <region> e.g. ap-southeast-1");
  console.error("");
  process.exit(1);
}

const encoded = encodeURIComponent(password);
const host = `aws-0-${region}.pooler.supabase.com`;

console.log("");
if (encoded !== password) {
  const offenders = [...new Set(password.match(/[@/?#[\]%: ]/g) ?? [])];
  console.log(`  The password contains ${offenders.map((c) => (c === " " ? "a space" : `"${c}"`)).join(", ")}.`);
  console.log("  That is what broke the URL. Encoded below.");
} else {
  console.log("  This password needs no encoding, so the fault is elsewhere:");
  console.log("  look for stray quotes or a trailing newline in the Vercel value.");
}

console.log("");
console.log("  DATABASE_URL   (transaction pooler - the running app)");
console.log(`  postgresql://postgres.${ref}:${encoded}@${host}:6543/postgres`);
console.log("");
console.log("  DIRECT_URL     (session pooler - migrations, IPv4 friendly)");
console.log(`  postgresql://postgres.${ref}:${encoded}@${host}:5432/postgres`);
console.log("");
console.log("  Paste each into Vercel with no surrounding quotes.");
console.log("");
