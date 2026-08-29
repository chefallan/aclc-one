"use client";

import Link from "next/link";
import { Upload, ChartNoAxesColumn, BookOpen, Settings, ChevronRight } from "lucide-react";
import { Card, CardContent, Metric } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AdminDashboardProps {
  stats: {
    totalStudents: number;
    totalTeachers: number;
    todaysSessions: number;
    avgAttendanceRate: number;
  };
  recentSessions: Array<{
    id: string;
    date: string | Date;
    subject: string | null;
    room: string | null;
    status: string;
    section?: { name: string } | null;
    teacher?: { firstName: string; lastName: string } | null;
    attendances?: Array<{ status: string }>;
  }>;
  user: { name?: string | null };
}

const ACTIONS = [
  {
    href: "/dashboard/students/import",
    label: "Import students",
    detail: "Upload a CSV and check it before it commits",
    icon: Upload,
  },
  {
    href: "/dashboard/attendance-reports",
    label: "Attendance reports",
    detail: "By program, section, and date range",
    icon: ChartNoAxesColumn,
  },
  {
    href: "/dashboard/library",
    label: "Library",
    detail: "Catalog, loans, and the capstone archive",
    icon: BookOpen,
  },
  {
    href: "/dashboard/settings",
    label: "School settings",
    detail: "Profile, academic year, and people",
    icon: Settings,
  },
];

export function AdminDashboard({ stats, recentSessions }: AdminDashboardProps) {
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">ACLC College of Ormoc</p>
        <h1 className="mt-1 text-2xl font-semibold">School overview</h1>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Students" value={stats.totalStudents} caption="Enrolled on the roll" />
        <Metric label="Faculty" value={stats.totalTeachers} caption="Accounts active" />
        <Metric
          label="Sessions today"
          value={stats.todaysSessions}
          caption="Scheduled or running"
        />
        <Metric
          label="Attendance today"
          value={stats.avgAttendanceRate}
          unit="%"
          caption="Of enrolled students"
          tone={
            stats.avgAttendanceRate === 0
              ? "neutral"
              : stats.avgAttendanceRate < 80
                ? "absent"
                : "present"
          }
        />
      </div>

      <section aria-labelledby="actions-heading" className="space-y-2.5">
        <h2 id="actions-heading" className="text-lg font-semibold">
          Manage
        </h2>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              // min-w-0: a grid item defaults to min-width:auto and so refuses to shrink
              // below its own content, which pushed these cards past the screen at
              // phone width and gave the page a horizontal scroll.
              className="group flex min-w-0 items-center gap-3.5 rounded-card border border-hairline bg-surface p-4 shadow-card transition-colors hover:border-brand-300"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-field bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                <a.icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{a.label}</span>
                <span className="block truncate text-sm text-content-muted">{a.detail}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-content-faint transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="recent-heading" className="space-y-2.5">
        <h2 id="recent-heading" className="text-lg font-semibold">
          Recent class sessions
        </h2>

        {recentSessions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-content-muted">
              No sessions recorded yet.
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-card border border-hairline bg-surface shadow-card">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-hairline bg-surface-sunk text-left">
                  <Th>Subject</Th>
                  <Th>Section</Th>
                  <Th>Instructor</Th>
                  <Th className="text-right">Present</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {recentSessions.map((s) => {
                  const present =
                    s.attendances?.filter((a) => a.status === "PRESENT" || a.status === "LATE")
                      .length ?? 0;
                  return (
                    <tr key={s.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{s.subject ?? "Class session"}</p>
                        <p className="data text-xs text-content-faint">
                          {formatDate(s.date)}
                          {s.room ? ` · ${s.room}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-content-muted">{s.section?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-content-muted">
                        {s.teacher ? `${s.teacher.firstName} ${s.teacher.lastName}` : "—"}
                      </td>
                      <td className="data px-4 py-3 text-right font-medium">{present}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            s.status === "ACTIVE"
                              ? "present"
                              : s.status === "CLOSED"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {titleCase(s.status)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`px-4 py-2.5 font-mono text-[0.66rem] font-medium uppercase tracking-[0.13em] text-content-faint ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString([], { month: "short", day: "numeric" });
}

function titleCase(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
