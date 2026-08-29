"use client";

import Link from "next/link";
import {
  BookOpen,
  NotebookPen,
  Users,
  QrCode,
  MapPin,
  GraduationCap,
  PhilippinePeso,
  FileText,
  LayoutGrid,
} from "lucide-react";
import { Card, CardContent, HeroCard, Metric } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/badge";
import { ListGroup, ListRow } from "@/components/ui/list-row";
import { findUpNext, formatRange, DAY_LABEL, todayWeekday } from "@/lib/schedule";
import { absenceBudget } from "@/lib/attendance-cap";
import type { Weekday } from "@prisma/client";
import { cn } from "@/lib/utils";

interface StudentDashboardProps {
  user: { name?: string | null };
  classAttendances: Array<{
    id: string;
    scannedAt: Date | string;
    status: string;
    classSession?: { subject: string | null; room: string | null; startTime: Date | string } | null;
  }>;
  todaySessions: Array<{
    id: string;
    subject: string | null;
    room: string | null;
    startTime: Date | string;
    endTime: Date | string;
    status: string;
    section?: { name: string } | null;
    teacher?: { firstName: string; lastName: string } | null;
  }>;
  qrCodeToken: string;
  studentNumber?: string;
  schedule?: Array<{
    id: string;
    subjectCode: string;
    subjectTitle: string | null;
    day: Weekday;
    startTime: string;
    endTime: string;
    room: string | null;
    instructor: string | null;
  }>;
}

/**
 * Concept sheet 02.3 · Quick actions.
 *
 * The grid carries the Phase 2+ services now so it never has to be redrawn
 * later. Everything here leads somewhere — the three that are not built yet
 * land on the services screen, which states their phase rather than pretending
 * they are missing.
 */
const QUICK_ACTIONS = [
  { href: "/dashboard/campus", label: "Find a staff", icon: MapPin, tone: "gold" },
  { href: "/dashboard/library", label: "Library", icon: BookOpen, tone: "brand" },
  { href: "/dashboard/study-buddy", label: "Study buddy", icon: Users, tone: "buddy" },
  { href: "/dashboard/notes", label: "Notes", icon: NotebookPen, tone: "present" },
  { href: "/dashboard/my-grades", label: "Grades", icon: GraduationCap, tone: "brand" },
  { href: "/dashboard/services#tuition", label: "Tuition", icon: PhilippinePeso, tone: "absent" },
  { href: "/dashboard/services#requests", label: "Requests", icon: FileText, tone: "brand" },
  { href: "/dashboard/services", label: "All services", icon: LayoutGrid, tone: "brand" },
] as const;

const ACTION_TONE: Record<(typeof QUICK_ACTIONS)[number]["tone"], string> = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-900 dark:text-brand-200",
  gold: "bg-gold-50 text-gold-700 dark:bg-gold-900/40 dark:text-gold-200",
  buddy: "bg-buddy-50 text-buddy-600 dark:bg-buddy-900/50 dark:text-buddy-200",
  present: "bg-present-50 text-present-600 dark:bg-present-900/40 dark:text-present-200",
  absent: "bg-absent-50 text-absent-600 dark:bg-absent-900/40 dark:text-absent-200",
};

export function StudentDashboard({
  // The greeting moved into the shell header, which is where concept sheet 02.3
  // puts it. The prop stays on the interface because the page still passes it
  // and a future card here will want the name.
  classAttendances,
  todaySessions,
  schedule = [],
}: StudentDashboardProps) {
  const today = new Date().toDateString();
  const presentToday = classAttendances.filter(
    (a) => new Date(a.scannedAt).toDateString() === today
  );

  // "Up next" comes from the timetable and nothing else.
  //
  // It used to fall back to an open ClassSession, which meant a student with
  // no timetable was shown a class as "up next" that they had never entered
  // and might not even be enrolled in. A session is an instructor opening
  // attendance; it is not a schedule, and presenting one as the other told
  // the student something untrue.
  const next = findUpNext(schedule);
  const todaysClasses = schedule.filter((e) => e.day === todayWeekday());

  // Attendance that is open right now, in their own section, that they have
  // not already been marked in. Shown as itself rather than as a schedule.
  //
  // ACTIVE is filtered here rather than in the query, because todaySessions is
  // also the denominator of "Today x/y" and a closed class still counts as one
  // of the day's.
  const attended = new Set(presentToday.map((a) => a.classSession?.subject).filter(Boolean));
  const openSession = todaySessions.find(
    (s) => s.status === "ACTIVE" && !attended.has(s.subject ?? "")
  );

  const rate =
    classAttendances.length > 0
      ? Math.round(
          (classAttendances.filter((a) => a.status === "PRESENT").length /
            classAttendances.length) *
            100
        )
      : null;

  // Sheet 02.3: absences-left is framed as a budget, not a percentage —
  // that is how students actually think about it.
  const budget = absenceBudget(
    classAttendances.length,
    classAttendances.filter((a) => a.status === "ABSENT").length
  );

  const subjectCount = new Set(schedule.map((e) => e.subjectCode)).size;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {/* Up next owns the top — class, room, instructor, and the single action
          attached to it. Always from the timetable. */}
      {next ? (
        <HeroCard>
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-16 size-48 rounded-full bg-gold-400/20 blur-2xl"
          />
          <div className="relative p-5">
            <p className="eyebrow text-brand-200">
              {next.inProgress ? "Happening now" : `Up next · ${next.minutesUntil} min`}
            </p>
            <h2 className="mt-1.5 text-[1.375rem] leading-tight text-white">
              {next.entry.subjectTitle ?? next.entry.subjectCode}
            </h2>
            <p className="data mt-1.5 text-[0.8125rem] text-brand-100">
              {next.entry.subjectCode} · {formatRange(next.entry.startTime, next.entry.endTime)}
              {next.entry.room ? ` · ${next.entry.room}` : ""}
            </p>
            {next.entry.instructor && (
              <p className="mt-0.5 text-[0.8125rem] text-brand-200">{next.entry.instructor}</p>
            )}

            {/* The one gold surface on this screen. */}
            <Button asChild variant="accent" block size="lg" className="mt-4">
              <Link href="/dashboard/scan">
                <QrCode className="size-4.5" aria-hidden="true" />
                Check in
              </Link>
            </Button>
            <p className="mt-2 text-center text-xs text-brand-200">
              {openSession
                ? "Attendance is open now"
                : next.inProgress
                  ? "Attendance is open during class"
                  : "Opens 10 minutes before class"}
            </p>
          </div>
        </HeroCard>
      ) : (
        <Card>
          <CardContent className="p-5">
            <p className="font-medium">
              {schedule.length === 0
                ? "No class schedule yet"
                : todaysClasses.length === 0
                  ? `Nothing on ${DAY_LABEL[todayWeekday()]}`
                  : "That's your last class today"}
            </p>
            <p className="mt-1 text-sm text-content-muted">
              {schedule.length === 0
                ? "Once your schedule is set it stays put for the whole term, and this card tells you what's next."
                : todaysClasses.length === 0
                  ? "Wala pa. Enjoy the quiet one."
                  : `${todaysClasses.length} ${todaysClasses.length === 1 ? "class" : "classes"} today.`}
            </p>
            {schedule.length === 0 && (
              <Link
                href="/dashboard/schedule"
                className="mt-3 inline-flex text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
              >
                Set up my schedule
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attendance being taken right now, in a class that is not the one up
          next. The hero already carries the common case. */}
      {openSession && !next?.inProgress && (
        <Card className="border-gold-300 bg-gold-50 dark:border-gold-800 dark:bg-gold-900/25">
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="eyebrow text-gold-700 dark:text-gold-300">Attendance is open</p>
              <p className="mt-1 font-medium">{openSession.subject ?? "Class session"}</p>
              <p className="data mt-0.5 text-xs text-content-muted">
                {formatTime(openSession.startTime)}–{formatTime(openSession.endTime)}
                {openSession.room ? ` · ${openSession.room}` : ""}
                {openSession.section ? ` · ${openSession.section.name}` : ""}
              </p>
            </div>
            <Button asChild variant="accent" size="default" className="shrink-0">
              <Link href="/dashboard/scan">
                <QrCode className="size-4.5" aria-hidden="true" />
                Check in
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sheet 02.3: the quick-action grid, four across, two rows. */}
      <nav aria-label="Services" className="grid grid-cols-4 gap-2">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex min-h-[5.25rem] flex-col items-center justify-center gap-2 rounded-card border border-hairline bg-surface px-1 py-3 text-center shadow-card transition-colors hover:border-brand-300 hover:bg-brand-50/40"
          >
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-[0.625rem]",
                ACTION_TONE[a.tone]
              )}
            >
              <a.icon className="size-4.5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="text-[0.6875rem] font-medium leading-tight">{a.label}</span>
          </Link>
        ))}
      </nav>

      <section aria-labelledby="attendance-heading" className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <h2 id="attendance-heading" className="text-[1.0625rem]">
            Your attendance
          </h2>
          <Link
            href="/dashboard/attendance-reports"
            className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
          >
            See record
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Metric
            label="This term"
            value={rate ?? "—"}
            unit={rate === null ? undefined : "%"}
            caption={
              subjectCount > 0
                ? `${subjectCount} ${subjectCount === 1 ? "subject" : "subjects"}`
                : `${classAttendances.length} sessions recorded`
            }
            tone={rate !== null && rate < 80 ? "absent" : "present"}
          />
          <Metric
            label="Absences left"
            value={budget.left}
            unit={`/${budget.allowed}`}
            caption="Cap is 20%"
            tone={budget.exceeded ? "absent" : budget.atRisk ? "late" : "neutral"}
          />
        </div>
      </section>

      {/* Sheet 02.3: "Today · Thursday" with a way through to the full week. */}
      <section aria-labelledby="today-heading" className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <h2 id="today-heading" className="text-[1.0625rem]">
            Today · {DAY_LABEL[todayWeekday()]}
          </h2>
          <Link
            href="/dashboard/schedule"
            className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
          >
            Full week
          </Link>
        </div>

        {todaysClasses.length === 0 ? (
          <Card>
            <CardContent className="p-5 text-center">
              <p className="text-sm text-content-muted">
                {schedule.length === 0
                  ? "Your timetable has not been set yet."
                  : "Wala pa. Nothing scheduled today."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <ListGroup>
            {[...todaysClasses]
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((e) => (
                <ListRow
                  key={e.id}
                  leading={
                    <span className="data flex w-14 shrink-0 flex-col items-start text-[0.6875rem] leading-tight text-content-muted">
                      <span className="font-medium text-content">{e.startTime}</span>
                      <span>{e.endTime}</span>
                    </span>
                  }
                  title={e.subjectTitle ?? e.subjectCode}
                  subtitle={
                    <span className="data">
                      {e.subjectCode}
                      {e.room ? ` · ${e.room}` : ""}
                    </span>
                  }
                  trailing={
                    e.instructor ? (
                      <span className="text-xs text-content-faint">{e.instructor}</span>
                    ) : null
                  }
                />
              ))}
          </ListGroup>
        )}
      </section>

      <section aria-labelledby="recent-heading" className="space-y-2.5">
        <h2 id="recent-heading" className="text-[1.0625rem]">
          Recent
        </h2>

        {classAttendances.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-content-muted">
                Nothing recorded yet. Your first check-in shows up here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ListGroup>
            {classAttendances.slice(0, 6).map((a) => (
              <ListRow
                key={a.id}
                title={a.classSession?.subject ?? "Class session"}
                subtitle={
                  <span className="data">
                    {formatDate(a.scannedAt)} · {formatTime(a.scannedAt)}
                    {a.classSession?.room ? ` · ${a.classSession.room}` : ""}
                  </span>
                }
                trailing={<StatusBadge status={a.status} />}
              />
            ))}
          </ListGroup>
        )}
      </section>

      <ListGroup>
        <ListRow href="/dashboard/attendance-reports" title="Full attendance record" />
      </ListGroup>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: "present" | "late" | "absent" | "excused"; label: string }> = {
    PRESENT: { variant: "present", label: "Present" },
    LATE: { variant: "late", label: "Late" },
    ABSENT: { variant: "absent", label: "Absent" },
    EXCUSED: { variant: "excused", label: "Excused" },
  };
  const entry = map[status] ?? { variant: "excused" as const, label: titleCase(status) };
  return (
    <StatusPill variant={entry.variant} dot className="shrink-0">
      {entry.label}
    </StatusPill>
  );
}

function formatTime(value: Date | string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString([], { month: "short", day: "numeric" });
}

function titleCase(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
