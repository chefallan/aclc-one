"use client";

import { Card, CardContent, Metric } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SupervisorDashboardProps {
  classSessions: Array<{
    id: string;
    date: string | Date;
    startTime: string | Date;
    endTime: string | Date;
    subject: string | null;
    room: string | null;
    status: string;
    section?: { name: string; program?: { name: string } | null } | null;
    teacher?: { firstName: string; lastName: string } | null;
    attendances?: Array<{
      id: string;
      status: string;
      scannedAt: string | Date;
      student: { firstName: string; lastName: string; studentNumber: string };
    }>;
  }>;
  user: { name?: string | null };
}

export function SupervisorDashboard({ classSessions }: SupervisorDashboardProps) {
  const today = new Date().toDateString();
  const todaySessions = classSessions.filter(
    (s) => new Date(s.date).toDateString() === today
  );
  const todayPresent = todaySessions.reduce(
    (sum, s) => sum + (s.attendances?.length ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Workplace supervisor</p>
        <h1 className="mt-1 text-2xl font-semibold">Today at a glance</h1>
        <p className="mt-1 text-sm text-content-muted">
          You see attendance for the students attached to you. Nothing else from the school.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="Sessions today" value={todaySessions.length} />
        <Metric label="Students present" value={todayPresent} tone="present" />
        <Metric label="On record" value={classSessions.length} caption="Sessions visible to you" />
      </div>

      <section aria-labelledby="today-heading" className="space-y-2.5">
        <h2 id="today-heading" className="text-lg font-semibold">
          Today
        </h2>

        {todaySessions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-content-muted">
              Nothing scheduled today.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2.5">
            {todaySessions.map((s) => (
              <li key={s.id}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{s.subject ?? "Class session"}</p>
                        <p className="data mt-0.5 text-xs text-content-faint">
                          {formatTime(s.startTime)}–{formatTime(s.endTime)}
                          {s.room ? ` · ${s.room}` : ""}
                          {s.section?.name ? ` · ${s.section.name}` : ""}
                        </p>
                      </div>
                      <Badge variant={s.status === "ACTIVE" ? "present" : "secondary"}>
                        {titleCase(s.status)}
                      </Badge>
                    </div>

                    {s.attendances && s.attendances.length > 0 && (
                      <ul className="mt-3 divide-y divide-hairline overflow-hidden rounded-field border border-hairline">
                        {s.attendances.map((a) => (
                          <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {a.student.lastName}, {a.student.firstName}
                              </p>
                              <p className="data text-xs text-content-faint">
                                {a.student.studentNumber}
                              </p>
                            </div>
                            <Badge variant={a.status === "LATE" ? "late" : "present"}>
                              <span className="data">{formatTime(a.scannedAt)}</span>
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatTime(value: string | Date) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function titleCase(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
