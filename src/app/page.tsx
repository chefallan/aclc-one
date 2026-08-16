import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Mark } from "@/components/shell/app-shell";
import { HeroPreview } from "@/components/landing/hero-preview";

/**
 * Swiss Modernist landing.
 *
 * The rules this page follows, and why each one is here:
 *
 *   Grid        A 12-column field with visible structure. Content sits on
 *               column boundaries rather than being centred by eye.
 *   Type        One grotesque, hierarchy from scale and weight alone. The
 *               serif used for headings elsewhere in the app is suppressed
 *               here — the International Style is a sans-serif tradition and
 *               a display serif would contradict the direction.
 *   Colour      Paper, ink, and one accent. Crimson is the accent, which is
 *               also the school's own colour, so nothing decorative is added.
 *   Rule        1px hairlines in the ink colour do the dividing. No shadows,
 *               no radii, no gradients — structure is drawn, not simulated.
 *   Alignment   Flush left, ragged right, throughout. Nothing is centred.
 *   Motion      Interaction is a colour or underline change. Nothing lifts.
 *
 * Values below are mine, derived from the movement's documented principles:
 * the supplied reference URL renders client-side and returned no CSS to read.
 */

const REPLACES = [
  "Paper attendance sheets",
  "Spreadsheet hour counts",
  "Google Forms for every request",
  "Messenger threads",
  "Walking the building to find someone",
];

const FEATURES = [
  {
    title: "Attendance in one tap",
    body: "Show your code, or scan the room's. The session, the room and the arrival time are recorded together — not on a sheet passed down the row and signed by whoever.",
  },
  {
    title: "Work immersion, end to end",
    body: "Time in, hourly logs, photo evidence, supervisor sign-off. Hours add themselves up as they happen instead of being counted by hand in the last week.",
  },
  {
    title: "An online library",
    body: "Catalog, ebooks, and the school's own capstone archive. Reserve a physical copy, read the rest in the app, and see what's on the shelf before you go.",
  },
  {
    title: "Notes that file themselves",
    body: "Checking in opens the right notebook — dated, room-stamped, with the instructor's name on it. Nobody has to decide where a note goes.",
  },
  {
    title: "A study assistant that read your notes",
    body: "Ask it anything about your subjects. It draws on your own notes and the school library, and shows you which note each answer came from.",
  },
  {
    title: "A staff finder",
    body: "Search by the errand, not the name. You get the office, whether they're in, and how many people are waiting before you make the trip.",
  },
];

const ROLES = [
  {
    role: "Student",
    line: "Open, check in, work, log it, time out.",
    detail: "One thumb-length scroll, on the phone they already carry.",
  },
  {
    role: "Faculty",
    line: "Open the roster, watch who arrives, submit the sheet.",
    detail: "The same mental model as the paper sheet, without the paper.",
  },
  {
    role: "Staff",
    line: "Set your status, see your queue, clear it.",
    detail: "Requests arrive in order instead of as a crowd at the window.",
  },
];

const STATS: Array<[string, string]> = [
  ["06", "Core flows"],
  ["03", "Roles"],
  ["01", "College"],
  ["00", "Paper sheets"],
];

const PRIVACY_CLAIMS = [
  "No continuous location",
  "No location history",
  "Hide-me switch for staff",
  "Audit log on every change",
];

/** The Swiss section marker: small, tracked-out, mono, flush left. */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="data text-[0.68rem] uppercase tracking-[0.18em] text-content-muted">{children}</p>
  );
}

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-page">
      {/* ── Masthead ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-rule bg-page">
        <div className="mx-auto flex h-14 max-w-[84rem] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Mark />
            <span className="text-[0.95rem] font-semibold tracking-[-0.01em]">ACLC One</span>
          </Link>
          <nav className="flex items-center gap-5 sm:gap-6">
            <Link
              href="/auth/signin"
              className="data text-[0.7rem] uppercase tracking-[0.14em] underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="data bg-brand-600 px-4 py-2 text-[0.7rem] uppercase tracking-[0.14em] text-white transition-colors hover:bg-brand-700"
            >
              Request access
            </Link>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section className="border-b border-rule">
          <div className="mx-auto max-w-[84rem] px-5 sm:px-8">
            {/* Meta row: the poster's identifying line. */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 border-b border-rule py-3">
              <Label>ACLC College of Ormoc · Ormoc City, Leyte</Label>
              <Label>Superapp · 2026</Label>
            </div>

            {/* The headline carries the whole hierarchy: one face, one weight,
                one enormous size. Nothing else on the page competes with it. */}
            <h1 className="mt-10 max-w-[16ch] font-sans text-[clamp(2.75rem,9.2vw,7.5rem)] font-bold leading-[0.92] tracking-[-0.035em] md:mt-14">
              Everything the school does at a window.
            </h1>

            <div className="mt-10 grid gap-x-8 gap-y-10 border-t border-rule pt-10 md:mt-14 md:grid-cols-12 md:pt-12">
              <div className="md:col-span-5 lg:col-span-4">
                <p className="max-w-[46ch] text-lg leading-[1.5]">
                  Attendance you tap once. Work immersion that counts its own hours. The library,
                  your notes, and a study assistant that has read them.{" "}
                  <span className="font-semibold">One sign-in</span>, for students, faculty and
                  staff.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/auth/register"
                    className="data inline-flex items-center gap-2 bg-brand-600 px-6 py-3.5 text-[0.72rem] uppercase tracking-[0.14em] text-white transition-colors hover:bg-brand-700"
                  >
                    Request an account
                    <ArrowRight className="size-3.5" />
                  </Link>
                  <Link
                    href="/auth/signin"
                    className="data inline-flex items-center border border-rule px-6 py-3.5 text-[0.72rem] uppercase tracking-[0.14em] transition-colors hover:bg-content hover:text-content-invert"
                  >
                    Sign in
                  </Link>
                </div>
              </div>

              <div className="md:col-span-6 md:col-start-7 lg:col-span-5 lg:col-start-8">
                <HeroPreview />
              </div>
            </div>

            {/* Numeric band. Figures in mono, dividers as hairlines. */}
            <dl className="mt-12 grid grid-cols-2 border-l border-t border-rule md:mt-16 md:grid-cols-4">
              {STATS.map(([value, label]) => (
                <div key={label} className="border-b border-r border-rule px-5 py-6">
                  <dt className="data text-[2.5rem] font-semibold leading-none tracking-[-0.03em]">
                    {value}
                  </dt>
                  <dd className="data mt-2 text-[0.66rem] uppercase tracking-[0.16em] text-content-muted">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── Replaces ─────────────────────────────────────────────────── */}
        <section className="border-b border-rule">
          <div className="mx-auto grid max-w-[84rem] gap-x-8 gap-y-4 px-5 py-8 sm:px-8 md:grid-cols-12">
            <div className="md:col-span-3">
              <Label>Replaces</Label>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-1 md:col-span-9 md:col-start-4">
              {REPLACES.map((item) => (
                <li
                  key={item}
                  className="text-sm leading-7 text-content-muted line-through decoration-brand-600 decoration-2"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────────── */}
        <section className="border-b border-rule">
          <div className="mx-auto max-w-[84rem] px-5 py-16 sm:px-8 md:py-24">
            <div className="grid gap-x-8 gap-y-6 md:grid-cols-12">
              <div className="md:col-span-3">
                <Label>What it does</Label>
              </div>
              <h2 className="max-w-[20ch] font-sans text-[clamp(1.75rem,4vw,3rem)] font-bold leading-[1.02] tracking-[-0.025em] md:col-span-9 md:col-start-4">
                Six things a school runs on, in one place.
              </h2>
            </div>

            <div className="mt-12 grid border-l border-t border-rule md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <article key={f.title} className="border-b border-r border-rule p-6 lg:p-8">
                  <p className="data text-[0.66rem] uppercase tracking-[0.16em] text-brand-600">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-4 text-lg font-semibold leading-snug">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-content-muted">{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Roles ────────────────────────────────────────────────────── */}
        <section className="border-b border-rule">
          <div className="mx-auto max-w-[84rem] px-5 py-16 sm:px-8 md:py-24">
            <div className="grid gap-x-8 gap-y-6 md:grid-cols-12">
              <div className="md:col-span-3">
                <Label>Who opens it</Label>
              </div>
              <h2 className="max-w-[16ch] font-sans text-[clamp(1.75rem,4vw,3rem)] font-bold leading-[1.02] tracking-[-0.025em] md:col-span-9 md:col-start-4">
                One app, three jobs.
              </h2>
            </div>

            <div className="mt-12 grid border-l border-t border-rule md:grid-cols-3">
              {ROLES.map((r) => (
                <div key={r.role} className="border-b border-r border-rule p-6 lg:p-8">
                  <p className="data text-[0.66rem] uppercase tracking-[0.16em] text-brand-600">
                    {r.role}
                  </p>
                  <p className="mt-4 text-xl font-semibold leading-snug tracking-[-0.015em]">
                    {r.line}
                  </p>
                  <p className="mt-2 text-sm text-content-muted">{r.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Privacy ──────────────────────────────────────────────────── */}
        <section className="border-b border-rule">
          <div className="mx-auto grid max-w-[84rem] gap-x-8 gap-y-8 px-5 py-16 sm:px-8 md:grid-cols-12 md:py-24">
            <div className="md:col-span-3">
              <Label>Data</Label>
            </div>

            <div className="md:col-span-9 md:col-start-4">
              <h2 className="max-w-[14ch] font-sans text-[clamp(1.75rem,4vw,3rem)] font-bold leading-[1.02] tracking-[-0.025em]">
                Presence, not tracking.
              </h2>

              <div className="mt-8 grid gap-x-8 gap-y-6 lg:grid-cols-2">
                <p className="max-w-[46ch] leading-relaxed text-content-muted">
                  Staff location comes from a person&apos;s own check-in and their timetable —
                  never a continuous position, never a history of where anyone has been. Any staff
                  member can hide themselves for the day, and the directory still adds up without
                  naming who did.
                </p>
                <p className="max-w-[46ch] leading-relaxed text-content-muted">
                  Students see their own records. Faculty see their own sections. Supervisors see
                  only the students attached to them. Photographs are never on a public link —
                  every image is served behind a session check.
                </p>
              </div>

              <ul className="mt-10 grid border-l border-t border-rule sm:grid-cols-2 lg:grid-cols-4">
                {PRIVACY_CLAIMS.map((claim) => (
                  <li
                    key={claim}
                    className="data border-b border-r border-rule px-4 py-4 text-[0.68rem] uppercase leading-relaxed tracking-[0.12em]"
                  >
                    {claim}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Close ────────────────────────────────────────────────────── */}
        <section className="bg-content text-content-invert">
          <div className="mx-auto grid max-w-[84rem] gap-x-8 gap-y-8 px-5 py-16 sm:px-8 md:grid-cols-12 md:py-24">
            <h2 className="max-w-[18ch] font-sans text-[clamp(1.9rem,4.6vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.03em] md:col-span-7">
              One app instead of five, and no paper at all.
            </h2>

            <div className="md:col-span-4 md:col-start-9 md:self-end">
              <p className="max-w-[38ch] leading-relaxed opacity-80">
                Students and staff request an account with their ID number. An administrator
                approves it, and they&apos;re in.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/auth/register"
                  className="data inline-flex items-center gap-2 bg-brand-600 px-6 py-3.5 text-[0.72rem] uppercase tracking-[0.14em] text-white transition-colors hover:bg-brand-500"
                >
                  Request an account
                  <ArrowRight className="size-3.5" />
                </Link>
                <Link
                  href="/auth/signin"
                  className="data inline-flex items-center border border-current px-6 py-3.5 text-[0.72rem] uppercase tracking-[0.14em] transition-colors hover:bg-content-invert hover:text-content"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto grid max-w-[84rem] gap-x-8 gap-y-3 px-5 py-8 sm:px-8 md:grid-cols-12">
          <p className="flex items-center gap-2.5 text-sm md:col-span-5">
            <Mark className="size-6" />
            ACLC One · ACLC College of Ormoc
          </p>
          <p className="data text-[0.66rem] uppercase leading-relaxed tracking-[0.12em] text-content-muted md:col-span-6 md:col-start-7">
            Concept build. Not affiliated with or endorsed by the AMA Education System.
          </p>
        </div>
      </footer>
    </div>
  );
}
