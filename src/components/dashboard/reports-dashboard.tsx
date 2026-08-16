"use client";

import Link from "next/link";
import { ChartNoAxesColumn } from "lucide-react";
import { Card, CardContent, Metric } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ReportsDashboardProps {
  range: string;
  days: number;
  totals: {
    sessions: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    rate: number | null;
  };
  byDay: Array<{ day: string; present: number; late: number; absent: number }>;
}

const RANGES = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

export function ReportsDashboard({ range, days, totals, byDay }: ReportsDashboardProps) {
  const peak = Math.max(1, ...byDay.map((d) => d.present + d.late + d.absent));
  const hasData = totals.present + totals.late + totals.absent + totals.excused > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Reports</p>
          <h1 className="mt-1 text-2xl font-semibold">Attendance</h1>
          <p className="mt-1 text-sm text-content-muted">
            Recorded check-ins across the last <span className="data">{days}</span> days.
          </p>
        </div>

        <div
          role="group"
          aria-label="Date range"
          className="inline-flex rounded-field border border-hairline bg-surface-sunk p-1"
        >
          {RANGES.map((r) => (
            <Link
              key={r.value}
              href={`/dashboard/attendance-reports?range=${r.value}`}
              aria-current={range === r.value ? "true" : undefined}
              className={cn(
                "rounded-[0.4rem] px-3 py-1.5 text-sm font-medium transition-colors",
                range === r.value
                  ? "bg-surface text-brand-800 shadow-card dark:text-brand-200"
                  : "text-content-muted hover:text-content"
              )}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Sessions held" value={totals.sessions} />
        <Metric
          label="Attendance rate"
          value={totals.rate ?? "—"}
          unit={totals.rate === null ? undefined : "%"}
          caption="Present or late, of all records"
          tone={totals.rate === null ? "neutral" : totals.rate < 80 ? "absent" : "present"}
        />
        <Metric label="Present" value={totals.present} tone="present" />
        <Metric label="Late" value={totals.late} tone={totals.late > 0 ? "late" : "neutral"} />
      </div>

      <section aria-labelledby="daily-heading">
        <h2 id="daily-heading" className="text-lg font-semibold">
          Day by day
        </h2>

        {!hasData || byDay.length === 0 ? (
          <Card className="mt-2.5">
            <CardContent className="p-10 text-center">
              <ChartNoAxesColumn className="mx-auto size-8 text-content-faint" />
              <p className="mt-3 font-medium">Nothing recorded in this window</p>
              <p className="mt-1 text-sm text-content-muted">
                Once sessions run, the daily breakdown appears here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-2.5">
            <CardContent className="p-5">
              <ul className="space-y-3">
                {byDay.map((d) => {
                  const total = d.present + d.late + d.absent;
                  return (
                    <li key={d.day} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3">
                      <span className="data text-xs text-content-faint">{d.day}</span>

                      <span
                        className="flex h-6 overflow-hidden rounded-[0.3rem] bg-surface-sunk"
                        style={{ width: `${(total / peak) * 100}%`, minWidth: "2px" }}
                      >
                        {d.present > 0 && (
                          <span
                            className="bg-present-600"
                            style={{ width: `${(d.present / total) * 100}%` }}
                            title={`${d.present} present`}
                          />
                        )}
                        {d.late > 0 && (
                          <span
                            className="bg-late-500"
                            style={{ width: `${(d.late / total) * 100}%` }}
                            title={`${d.late} late`}
                          />
                        )}
                        {d.absent > 0 && (
                          <span
                            className="bg-absent-600"
                            style={{ width: `${(d.absent / total) * 100}%` }}
                            title={`${d.absent} absent`}
                          />
                        )}
                      </span>

                      <span className="data text-sm tabular-nums text-content-muted">{total}</span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-5 flex flex-wrap gap-4 border-t border-hairline pt-4">
                <Key color="bg-present-600" label="Present" value={totals.present} />
                <Key color="bg-late-500" label="Late" value={totals.late} />
                <Key color="bg-absent-600" label="Absent" value={totals.absent} />
                <Key color="bg-slab-300" label="Excused" value={totals.excused} />
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function Key({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <span className="flex items-center gap-2 text-sm">
      <span className={cn("size-2.5 rounded-[2px]", color)} aria-hidden />
      <span className="text-content-muted">{label}</span>
      <span className="data font-medium">{value}</span>
    </span>
  );
}
