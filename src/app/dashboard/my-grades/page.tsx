import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { Printer } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGradingRules } from "@/lib/grade-sheet";
import {
  PERIODS,
  PERIOD_LABEL,
  formatScore,
  averageOfPeriods,
  weightedAverage,
  remarkFor,
} from "@/lib/grading";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { Guidance } from "@/components/ui/guidance";
import { LiveRefresh } from "@/components/live-refresh";
import type { GradingPeriod } from "@prisma/client";

export const metadata = { title: "My grades" };

/**
 * A student's own grades.
 *
 * Only POSTED marks appear. A draft is an instructor still deciding, and
 * showing it would turn every working note into a promise — so the filter is
 * on the query rather than on the rendering, where a future change could
 * quietly undo it.
 */
export default async function MyGradesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const student = await prisma.studentProfile.findFirst({
    where: { userId: session.user.id },
    select: { id: true, studentNumber: true, firstName: true, lastName: true },
  });

  if (!student) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <header>
          <h1 className="text-2xl">Grades</h1>
        </header>
        <Card>
          <CardContent className="p-6 text-sm text-content-muted">
            Only students have grades. If you are one, your student record has not been set up
            yet — an administrator can finish that from Requests.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [rules, grades] = await Promise.all([
    getGradingRules(),
    prisma.grade.findMany({
      where: { studentId: student.id, status: "POSTED" },
      select: {
        period: true,
        score: true,
        subject: { select: { id: true, code: true, title: true, units: true } },
        academicYear: { select: { id: true, name: true } },
      },
      orderBy: { subject: { code: "asc" } },
    }),
  ]);

  // Group by year, then subject, so a returning student sees their history.
  const byYear = new Map<
    string,
    {
      name: string;
      subjects: Map<
        string,
        { code: string; title: string; units: number; scores: Record<string, number | null> }
      >;
    }
  >();

  for (const g of grades) {
    const year = byYear.get(g.academicYear.id) ?? { name: g.academicYear.name, subjects: new Map() };
    const subject = year.subjects.get(g.subject.id) ?? {
      code: g.subject.code,
      title: g.subject.title,
      units: Number(g.subject.units),
      scores: {} as Record<string, number | null>,
    };
    subject.scores[g.period] = g.score === null ? null : Number(g.score);
    year.subjects.set(g.subject.id, subject);
    byYear.set(g.academicYear.id, year);
  }

  const years = [...byYear.entries()].reverse();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <LiveRefresh scope="my-schedule" />

      <header data-print="hide">
        <h1 className="text-2xl">Grades</h1>
        <p className="data mt-1 text-xs text-content-faint">{student.studentNumber}</p>
        <p className="mt-2 text-sm text-content-muted">
          Read-only, and only what your instructor has released. This is not an
          official transcript — the registrar issues that.
        </p>
      </header>

      {years.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <p className="font-medium">No grades released yet</p>
            <p className="mt-1 text-sm text-content-muted">
              They appear as each instructor posts them, period by period.
            </p>
          </CardContent>
        </Card>
      ) : (
        years.map(([yearId, year]) => {
          const subjects = [...year.subjects.values()].sort((a, b) => a.code.localeCompare(b.code));
          const rows = subjects.map((s) => {
            const average = averageOfPeriods(PERIODS.map((p) => s.scores[p] ?? null));
            return { ...s, average };
          });
          const gwa = weightedAverage(rows.map((r) => ({ score: r.average, units: r.units })));
          const atRisk = rows.filter(
            (r) => r.average !== null && !remarkFor(r.average, rules).toLowerCase().includes("pass")
          );

          return (
            <section key={yearId} data-print="sheet" className="space-y-3">
              {/* Sheet 08.1 · the GWA hero. Grades are set in mono at a large
                  size because they are official data, and they should look
                  issued rather than styled. */}
              <div
                data-print="hide"
                className="relative overflow-hidden rounded-hero bg-brand-600 p-5 text-white shadow-hero"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-14 size-44 rounded-full bg-brand-400/25 blur-2xl"
                />
                <div className="relative flex items-center gap-4">
                  <span className="shrink-0">
                    <span className="data block text-[2.25rem] font-semibold leading-none tracking-tight">
                      {formatScore(gwa, rules.scale)}
                    </span>
                    <span className="eyebrow mt-1.5 block text-brand-200">
                      Weighted average
                    </span>
                  </span>
                  <p className="text-[0.8125rem] leading-snug text-brand-100">
                    Across {rows.length} {rows.length === 1 ? "subject" : "subjects"} in{" "}
                    {year.name}. Only released marks are counted, so this moves
                    as each instructor posts.
                  </p>
                </div>
              </div>

              {/* Sheet 08.1: the causal link between attendance and a grade is
                  invisible on a paper card and obvious here. */}
              {atRisk.length > 0 && (
                <Guidance data-print="hide" tone="absent">
                  {atRisk.length === 1
                    ? `${atRisk[0].title} is below passing.`
                    : `${atRisk.length} subjects are below passing.`}{" "}
                  Check your attendance record — it is the most common reason a
                  mark slips, and the only one you can still change.
                </Guidance>
              )}

              <div data-print="hide" className="space-y-2">
                <h2 className="text-[1.0625rem]">{year.name}</h2>
                <div className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card [&>*+*]:border-t [&>*+*]:border-hairline">
                  {rows.map((r) => {
                    const remark = remarkFor(r.average, rules);
                    const failing =
                      r.average !== null && !remark.toLowerCase().includes("pass");
                    return (
                      <div key={r.code} className="flex items-center gap-3 px-4 py-3">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.9375rem] font-semibold leading-tight">
                            {r.title}
                          </span>
                          <span className="eyebrow mt-1 block truncate">
                            {r.code} · {r.units} {r.units === 1 ? "unit" : "units"}
                          </span>
                        </span>
                        {r.average === null ? (
                          <StatusPill variant="excused" className="shrink-0">
                            No grade yet
                          </StatusPill>
                        ) : (
                          <span className="shrink-0 text-right">
                            <span
                              className={
                                failing
                                  ? "data block text-xl font-semibold leading-none text-absent-600"
                                  : "data block text-xl font-semibold leading-none"
                              }
                            >
                              {formatScore(r.average, rules.scale)}
                            </span>
                            <span
                              className={
                                failing
                                  ? "mt-1 block text-[0.6875rem] text-absent-600"
                                  : "mt-1 block text-[0.6875rem] text-content-faint"
                              }
                            >
                              {remark}
                            </span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* The full period breakdown. Kept as a table because a grade
                  sheet gets printed and initialled, and the print stylesheet is
                  built around one. */}
              <div className="hidden overflow-x-auto rounded-card border border-hairline bg-surface print:block">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-hairline">
                      <th className="px-3 py-2 text-left font-medium">Subject</th>
                      <th className="px-2 py-2 text-center text-xs font-medium">Units</th>
                      {PERIODS.map((p) => (
                        <th key={p} className="px-2 py-2 text-center text-xs font-medium">
                          {PERIOD_LABEL[p]}
                        </th>
                      ))}
                      <th className="px-2 py-2 text-center text-xs font-medium">Average</th>
                      <th className="px-2 py-2 text-center text-xs font-medium">Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.code} className="border-b border-hairline last:border-b-0">
                        <td className="px-3 py-2">
                          <span className="data font-medium">{r.code}</span>
                          <span className="ml-2 text-content-muted">{r.title}</span>
                        </td>
                        <td className="data px-2 py-2 text-center text-xs">{r.units}</td>
                        {PERIODS.map((p) => (
                          <td key={p} className="data px-2 py-2 text-center text-xs">
                            {formatScore(r.scores[p as GradingPeriod] ?? null, rules.scale)}
                          </td>
                        ))}
                        <td className="data px-2 py-2 text-center text-xs font-semibold">
                          {formatScore(r.average, rules.scale)}
                        </td>
                        <td className="px-2 py-2 text-center text-xs">
                          {remarkFor(r.average, rules)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      )}

      {years.length > 0 && (
        <p data-print="hide" className="text-xs text-content-faint">
          <Printer className="mr-1 inline size-3.5" />
          Use your browser&rsquo;s print option to save a copy. This is not an official
          transcript — ask the registrar for that.
        </p>
      )}
    </div>
  );
}
