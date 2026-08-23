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
          <p className="eyebrow">Records</p>
          <h1 className="mt-1 text-2xl font-semibold">My grades</h1>
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
        <p className="eyebrow">{student.studentNumber}</p>
        <h1 className="mt-1 text-2xl font-semibold">My grades</h1>
        <p className="mt-1 text-sm text-content-muted">
          Only grades your instructor has released appear here.
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

          return (
            <section key={yearId} data-print="sheet" className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">{year.name}</h2>
                <p className="text-sm text-content-muted">
                  Weighted average{" "}
                  <span className="data font-semibold text-content">
                    {formatScore(gwa, rules.scale)}
                  </span>
                </p>
              </div>

              <div className="overflow-x-auto rounded-card border border-hairline bg-surface">
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
