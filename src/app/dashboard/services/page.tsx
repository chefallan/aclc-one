import Link from "next/link";
import {
  MapPin,
  CircleCheck,
  BookOpen,
  NotebookPen,
  GraduationCap,
  CalendarRange,
  FileSignature,
  FileText,
  PhilippinePeso,
} from "lucide-react";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { StatusPill } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata = { title: "Campus services" };

/**
 * Concept sheet 08.2 · Campus services — the growth surface.
 *
 * The screen that makes "eventually everything" a design decision rather than a
 * future rewrite. Every new service is a row here.
 *
 * Phases are shown to students rather than hidden, because a visible "Sem 2"
 * badge manages expectations better than an absent feature does. Nothing in the
 * "Coming next" list is clickable — a row that leads nowhere is a worse promise
 * than a row that says when.
 */
type Service = {
  label: string;
  detail: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: "brand" | "present" | "gold" | "buddy" | "absent" | "muted";
  href?: string;
  /** Shown on the right when the service is not live yet. */
  when?: string;
};

const LIVE: Service[] = [
  {
    label: "Find a staff",
    detail: "Offices, faculty, live status",
    icon: MapPin,
    tone: "brand",
    href: "/dashboard/campus",
  },
  {
    label: "Attendance & excuses",
    detail: "Records, disputes, medical certs",
    icon: CircleCheck,
    tone: "present",
    href: "/dashboard/attend",
  },
  {
    label: "Library",
    detail: "Catalog, ebooks, capstone archive",
    icon: BookOpen,
    tone: "gold",
    href: "/dashboard/library",
  },
  {
    label: "Notes & study buddy",
    detail: "Notebooks, reviewer, sessions",
    icon: NotebookPen,
    tone: "buddy",
    href: "/dashboard/notes",
  },
  {
    label: "Grades",
    detail: "Prelim, midterm, finals",
    icon: GraduationCap,
    tone: "brand",
    href: "/dashboard/my-grades",
  },
];

const NEXT: Service[] = [
  {
    label: "Room & table booking",
    detail: "Library tables, AVR, comlabs",
    icon: CalendarRange,
    tone: "muted",
    when: "Term 2",
  },
  {
    label: "Clearance tracker",
    detail: "Which windows are still to sign",
    icon: FileSignature,
    tone: "muted",
    when: "Year 2",
  },
  {
    label: "Document requests",
    detail: "TOR, COE, good moral",
    icon: FileText,
    tone: "muted",
    when: "Year 2",
  },
  {
    label: "Tuition & assessment",
    detail: "Balances, receipts, payment",
    icon: PhilippinePeso,
    tone: "muted",
    when: "Later",
  },
];

const TONE: Record<Service["tone"], string> = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-900 dark:text-brand-200",
  present: "bg-present-50 text-present-600 dark:bg-present-900/40 dark:text-present-200",
  gold: "bg-gold-50 text-gold-700 dark:bg-gold-900/40 dark:text-gold-200",
  buddy: "bg-buddy-50 text-buddy-600 dark:bg-buddy-900/50 dark:text-buddy-200",
  absent: "bg-absent-50 text-absent-600 dark:bg-absent-900/40 dark:text-absent-200",
  muted: "bg-surface-sunk text-content-faint",
};

function ServiceRow({ service }: { service: Service }) {
  const body = (
    <>
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-[0.625rem]",
          TONE[service.tone]
        )}
      >
        <service.icon className="size-4.5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-semibold leading-tight">
          {service.label}
        </span>
        <span className="mt-0.5 block truncate text-[0.8125rem] leading-tight text-content-muted">
          {service.detail}
        </span>
      </span>
      {service.when ? (
        <StatusPill variant="warning" className="shrink-0">
          {service.when}
        </StatusPill>
      ) : (
        <span aria-hidden className="shrink-0 text-content-faint">
          →
        </span>
      )}
    </>
  );

  const classes = "flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left";

  if (service.href) {
    return (
      <Link href={service.href} className={cn(classes, "transition-colors hover:bg-surface-sunk")}>
        {body}
      </Link>
    );
  }
  return <div className={cn(classes, "opacity-80")}>{body}</div>;
}

export default async function ServicesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <header>
        <h1 className="text-2xl">Campus services</h1>
        <p className="mt-1 text-sm text-content-muted">
          Everything the college does at a window, moving into the app one phase
          at a time.
        </p>
      </header>

      <section aria-labelledby="live-heading" className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <h2 id="live-heading" className="text-[1.0625rem]">
            Live now
          </h2>
          <span className="eyebrow">Phase 1–2</span>
        </div>
        <div className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card [&>*+*]:border-t [&>*+*]:border-hairline">
          {LIVE.map((s) => (
            <ServiceRow key={s.label} service={s} />
          ))}
        </div>
      </section>

      <section aria-labelledby="next-heading" className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <h2 id="next-heading" className="text-[1.0625rem]">
            Coming next
          </h2>
          <span className="eyebrow">Phase 3–4</span>
        </div>
        <div
          id="requests"
          className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card [&>*+*]:border-t [&>*+*]:border-hairline"
        >
          {NEXT.map((s) => (
            <ServiceRow key={s.label} service={s} />
          ))}
        </div>
        <p id="tuition" className="text-xs text-content-faint">
          Payments land last on purpose. Money means reconciliation, receipts and
          an audit trail, and none of that should hold up the rest.
        </p>
      </section>
    </div>
  );
}
