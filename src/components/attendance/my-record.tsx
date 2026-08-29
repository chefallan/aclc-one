"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { Guidance } from "@/components/ui/guidance";
import { AttendanceCalendar, type CalendarDay } from "@/components/ui/attendance-calendar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { absenceBudget } from "@/lib/attendance-cap";
import { cn } from "@/lib/utils";

export interface SubjectRate {
  code: string;
  title: string;
  sessions: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
}

export interface MyRecordProps {
  termLabel: string;
  counts: { present: number; late: number; absent: number; excused: number };
  subjects: SubjectRate[];
  days: CalendarDay[];
  monthLabel: string;
  startsOn: number;
}

/**
 * Concept sheet 03.3 · My record.
 *
 * Built around the one number that can end a semester: distance from the 20%
 * absence cap. The sheet is explicit that no student should have to do the
 * arithmetic, so every card here states the consequence in a sentence rather
 * than leaving a percentage to be interpreted.
 */
export function MyRecord({
  termLabel,
  counts,
  subjects,
  days,
  monthLabel,
  startsOn,
}: MyRecordProps) {
  const total = counts.present + counts.late + counts.absent + counts.excused;
  const rate = total > 0 ? Math.round(((counts.present + counts.late) / total) * 100) : null;
  const budget = absenceBudget(total, counts.absent);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Tabs defaultValue="term">
        <TabsList className="w-full">
          <TabsTrigger value="term" className="flex-1">
            This term
          </TabsTrigger>
          <TabsTrigger value="subject" className="flex-1">
            By subject
          </TabsTrigger>
          <TabsTrigger value="all" className="flex-1">
            All years
          </TabsTrigger>
        </TabsList>

        <TabsContent value="term" className="space-y-4">
          <TermSummary rate={rate} termLabel={termLabel} counts={counts} />
          <BudgetLine budget={budget} />
          <PerSubject subjects={subjects} />
          <Heatmap days={days} monthLabel={monthLabel} startsOn={startsOn} />
          <DisputeEntry />
        </TabsContent>

        <TabsContent value="subject" className="space-y-4">
          <PerSubject subjects={subjects} expanded />
          <DisputeEntry />
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-content-muted">
                Only this term is on record so far. Past terms appear here once a
                second one closes.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * The ring. A percentage is an abstraction; a ring that is nearly closed is
 * not, and the sheet spends its one hero card here for that reason.
 */
function TermSummary({
  rate,
  termLabel,
  counts,
}: {
  rate: number | null;
  termLabel: string;
  counts: MyRecordProps["counts"];
}) {
  const r = 46;
  const circumference = 2 * Math.PI * r;
  const filled = ((rate ?? 0) / 100) * circumference;

  return (
    <div className="relative overflow-hidden rounded-hero bg-brand-600 p-5 text-white shadow-hero">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-14 size-44 rounded-full bg-brand-400/25 blur-2xl"
      />
      <div className="relative flex flex-col items-center">
        <div className="relative grid size-[7.5rem] place-items-center">
          <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
            <circle cx="60" cy="60" r={r} fill="none" strokeWidth="9" className="stroke-white/20" />
            {rate !== null && (
              <circle
                cx="60"
                cy="60"
                r={r}
                fill="none"
                strokeWidth="9"
                strokeLinecap="round"
                className="stroke-present-400"
                strokeDasharray={`${filled} ${circumference}`}
              />
            )}
          </svg>
          <span className="relative text-center">
            <span className="figure block text-[2rem] text-white">
              {rate === null ? "—" : rate}
              {rate !== null && <span className="text-lg opacity-70">%</span>}
            </span>
          </span>
        </div>
        <p className="eyebrow mt-2 text-brand-200">{termLabel}</p>

        <dl className="mt-4 grid w-full grid-cols-4 gap-2 text-center">
          {[
            { label: "Present", value: counts.present },
            { label: "Late", value: counts.late },
            { label: "Absent", value: counts.absent },
            { label: "Excused", value: counts.excused },
          ].map((c) => (
            <div key={c.label}>
              <dd className="figure text-xl text-white">{c.value}</dd>
              <dt className="eyebrow mt-1 text-brand-200">{c.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function BudgetLine({ budget }: { budget: ReturnType<typeof absenceBudget> }) {
  if (budget.exceeded) {
    return (
      <Guidance tone="absent" title="You are past the 20% cap">
        Speak to your program head. An absence explained and approved can still
        be recorded, but it does not remove one already counted.
      </Guidance>
    );
  }
  if (budget.atRisk) {
    return (
      <Guidance title="One more absence hits the 20% cap">
        You have used {budget.used} of {budget.allowed}. Explaining an absence
        you had a reason for is the only way this number moves.
      </Guidance>
    );
  }
  return (
    <Guidance tone="info" title={`${budget.left} absences left this term`}>
      The cap is 20% of your sessions — {budget.allowed} at the moment, and it
      grows as the term does.
    </Guidance>
  );
}

/**
 * Sheet 03.3: the at-risk subject changes card colour and states the
 * consequence in a sentence.
 */
function PerSubject({ subjects, expanded }: { subjects: SubjectRate[]; expanded?: boolean }) {
  if (subjects.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-content-muted">
            Nothing recorded yet. Subjects appear here after your first check-in.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section aria-labelledby="per-subject" className="space-y-2.5">
      <h2 id="per-subject" className="text-[1.0625rem]">
        Per subject
      </h2>

      <div className="space-y-2.5">
        {subjects.map((s) => {
          const rate =
            s.sessions > 0 ? Math.round(((s.present + s.late) / s.sessions) * 100) : 0;
          const budget = absenceBudget(s.sessions, s.absent);
          const risk = budget.exceeded || budget.atRisk;

          return (
            <div
              key={s.code}
              className={cn(
                "rounded-card border bg-surface p-4 shadow-card",
                risk ? "border-absent-300 dark:border-absent-800" : "border-hairline"
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate font-semibold">{s.title}</p>
                <p
                  className={cn(
                    "figure shrink-0 text-lg",
                    risk ? "text-absent-600" : "text-content"
                  )}
                >
                  {rate}
                  <span className="text-xs opacity-60">%</span>
                </p>
              </div>
              <p className="eyebrow mt-1">
                {s.code} · {s.sessions} {s.sessions === 1 ? "session" : "sessions"}
              </p>

              <div
                aria-hidden
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-sunk"
              >
                <div
                  className={cn(
                    "h-full rounded-full",
                    risk ? "bg-absent-500" : "bg-present-500"
                  )}
                  style={{ width: `${rate}%` }}
                />
              </div>

              {risk && (
                <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-absent-700 dark:text-absent-300">
                  <StatusPill variant="absent">At risk</StatusPill>
                  {budget.exceeded
                    ? "Already past the 20% cap"
                    : "1 more absence hits the 20% cap"}
                </p>
              )}

              {expanded && (
                <dl className="mt-3 grid grid-cols-4 gap-2 border-t border-hairline pt-3 text-center">
                  {[
                    { label: "Present", value: s.present },
                    { label: "Late", value: s.late },
                    { label: "Absent", value: s.absent },
                    { label: "Excused", value: s.excused },
                  ].map((c) => (
                    <div key={c.label}>
                      <dd className="data text-sm font-semibold">{c.value}</dd>
                      <dt className="eyebrow">{c.label}</dt>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Sheet 03.3: the heatmap gives the shape of a term at a glance — clusters of
 * absence are a wellbeing signal, not just a number.
 */
function Heatmap({
  days,
  monthLabel,
  startsOn,
}: {
  days: CalendarDay[];
  monthLabel: string;
  startsOn: number;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="eyebrow">{monthLabel}</p>
        <AttendanceCalendar days={days} startsOn={startsOn} className="mt-3" />
      </CardContent>
    </Card>
  );
}

/** Sheet 03.3: dispute entry sits at the bottom of the evidence, where it belongs. */
function DisputeEntry() {
  return (
    <Link
      href="/dashboard/attend/explain"
      className="flex items-center justify-between rounded-card border border-hairline bg-surface p-4 shadow-card transition-colors hover:border-brand-300"
    >
      <span>
        <span className="block text-sm font-semibold">Explain an absence</span>
        <span className="mt-0.5 block text-xs text-content-muted">
          Medical, family, transport, weather, or a school activity
        </span>
      </span>
      <span aria-hidden className="text-content-faint">
        →
      </span>
    </Link>
  );
}
