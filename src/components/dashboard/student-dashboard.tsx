"use client";

import Link from "next/link";
import { BookOpen, NotebookPen, Users, QrCode, ChevronRight } from "lucide-react";
import { Card, CardContent, Metric } from "@/components/ui/card";
import { findUpNext, formatRange, DAY_LABEL, todayWeekday } from "@/lib/schedule";
import type { Weekday } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
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

const SHORTCUTS = [
  { href: "/dashboard/library", label: "Library", icon: BookOpen },
  { href: "/dashboard/notes", label: "Notes", icon: NotebookPen },
  { href: "/dashboard/study-buddy", label: "Study buddy", icon: Users },
];

export function StudentDashboard({
  user,
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

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <header>
        <p className="eyebrow">{greeting()}</p>
        <h1 className="mt-1 text-2xl font-semibold">{firstName(user.name)}</h1>
      </header>

      {/* Attendance being taken right now is the one thing more urgent than
          what comes next, so it sits above it. */}
      {openSession && (
        <Card className="border-brand-300 bg-brand-50 dark:border-brand-800 dark:bg-brand-950">
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="data text-[0.68rem] uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
                Attendance is open
              </p>
              <p className="mt-1 font-medium">{openSession.subject ?? "Class session"}</p>
              <p className="data mt-0.5 text-xs text-content-muted">
                {formatTime(openSession.startTime)}–{formatTime(openSession.endTime)}
                {openSession.room ? ` · ${openSession.room}` : ""}
                {openSession.section ? ` · ${openSession.section.name}` : ""}
              </p>
            </div>
            <Link
              href="/dashboard/scan"
              className="flex h-11 shrink-0 items-center gap-2 rounded-field bg-brand-600 px-4 font-medium text-white transition-colors hover:bg-brand-700"
            >
              <QrCode className="size-4.5" />
              Show my code
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Up next owns the top — class, room, instructor, and the one action
          attached to it. Always from the timetable. */}
      {next ? (
        <Card className="overflow-hidden border-navy-800 bg-navy-900 text-white shadow-raised">
          <CardContent className="p-5">
            <p className="data text-[0.68rem] uppercase tracking-[0.14em] text-navy-200">
              {next.inProgress
                ? "Happening now"
                : `Up next · ${next.minutesUntil} min`}
            </p>
            <h2 className="mt-1.5 font-display text-xl font-semibold leading-tight">
              {next.entry.subjectTitle ?? next.entry.subjectCode}
            </h2>
            <p className="data mt-1 text-sm text-navy-100">
              {next.entry.subjectCode} · {formatRange(next.entry.startTime, next.entry.endTime)}
              {next.entry.room ? ` · ${next.entry.room}` : ""}
            </p>
            {next.entry.instructor && (
              <p className="mt-0.5 text-sm text-navy-200">{next.entry.instructor}</p>
            )}
            <Link
              href="/dashboard/scan"
              className="mt-4 flex h-12 items-center justify-center gap-2 rounded-field bg-brand-600 font-medium text-white transition-colors hover:bg-brand-700"
            >
              <QrCode className="size-4.5" />
              Show my code
            </Link>
          </CardContent>
        </Card>
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
                className="mt-3 inline-flex text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
              >
                Set up my schedule
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-2.5">
        {SHORTCUTS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex flex-col items-center gap-2 rounded-card border border-hairline bg-surface p-4 text-center shadow-card transition-colors hover:border-brand-300 hover:bg-brand-50/50"
          >
            <s.icon className="size-5 text-brand-700 dark:text-brand-300" />
            <span className="text-xs font-medium leading-tight">{s.label}</span>
          </Link>
        ))}
      </div>

      <section aria-labelledby="attendance-heading" className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <h2 id="attendance-heading" className="text-lg font-semibold">
            Your attendance
          </h2>
          <Link
            href="/dashboard/attendance-reports"
            className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
          >
            See record
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Metric
            label="Present rate"
            value={rate ?? "—"}
            unit={rate === null ? undefined : "%"}
            caption={`${classAttendances.length} sessions recorded`}
            tone={rate !== null && rate < 80 ? "absent" : "present"}
          />
          <Metric
            label="Today"
            value={presentToday.length}
            unit={`/${todaySessions.length || 0}`}
            caption="Sessions marked"
          />
        </div>
      </section>

      <section aria-labelledby="recent-heading" className="space-y-2.5">
        <h2 id="recent-heading" className="text-lg font-semibold">
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
          <ul className="divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
            {classAttendances.slice(0, 6).map((a) => (
              <li key={a.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {a.classSession?.subject ?? "Class session"}
                  </p>
                  <p className="data mt-0.5 text-xs text-content-faint">
                    {formatDate(a.scannedAt)} · {formatTime(a.scannedAt)}
                    {a.classSession?.room ? ` · ${a.classSession.room}` : ""}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href="/dashboard/attendance-reports"
        className="flex items-center justify-between rounded-card border border-hairline bg-surface p-4 shadow-card transition-colors hover:border-brand-300"
      >
        <span className="text-sm font-medium">Full attendance record</span>
        <ChevronRight className="size-4 text-content-faint" />
      </Link>
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
    <Badge variant={entry.variant} dot className={cn("shrink-0")}>
      {entry.label}
    </Badge>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function firstName(name?: string | null) {
  if (!name) return "There";
  return name.split(" ")[0];
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
