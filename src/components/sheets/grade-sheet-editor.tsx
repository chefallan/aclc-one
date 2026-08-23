"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, TriangleAlert, CircleCheckBig } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { GradeSheet } from "@/lib/grade-sheet";
import { PERIODS, PERIOD_LABEL, formatScore, averageOfPeriods, remarkFor } from "@/lib/grading";
import type { GradingPeriod } from "@prisma/client";

/**
 * Entering and printing a subject's grades for one section.
 *
 * The whole sheet is edited at once and saved as one column per period, which
 * is how a grade sheet is actually filled in. Averages update as you type so
 * the person entering can see a wrong digit immediately, rather than after a
 * round trip.
 *
 * Draft and posted are separate on purpose. Marks are worked on for weeks
 * before anyone should see them, and a student refreshing their grades while
 * the instructor is still deciding is its own kind of harm.
 */
export function GradeSheetEditor({
  sheet,
  schoolName,
}: {
  sheet: GradeSheet;
  schoolName: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { section, academicYear, subject, subjects, rules } = sheet;

  const [draft, setDraft] = React.useState<Record<string, Record<string, string>>>({});
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);

  // The server is the authority: switching subject re-renders with new rows.
  const [renderedFor, setRenderedFor] = React.useState(sheet.rows);
  if (renderedFor !== sheet.rows) {
    setRenderedFor(sheet.rows);
    setDraft({});
    setNotice(null);
  }

  function valueFor(studentId: string, period: GradingPeriod): string {
    const edited = draft[studentId]?.[period];
    if (edited !== undefined) return edited;
    const stored = sheet.rows.find((r) => r.studentId === studentId)?.scores[period];
    return stored === null || stored === undefined ? "" : String(stored);
  }

  function set(studentId: string, period: GradingPeriod, value: string) {
    setDraft((d) => ({ ...d, [studentId]: { ...d[studentId], [period]: value } }));
    setNotice(null);
  }

  /** Live average from what is on screen, not what is stored. */
  function liveAverage(studentId: string): number | null {
    return averageOfPeriods(
      PERIODS.map((p) => {
        const raw = valueFor(studentId, p);
        if (raw.trim() === "") return null;
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
      })
    );
  }

  async function save(period: GradingPeriod, post: boolean) {
    if (!section || !subject) return;
    setBusy(true);
    setNotice(null);
    try {
      const scores = sheet.rows.map((r) => {
        const raw = valueFor(r.studentId, period).trim();
        return { studentId: r.studentId, score: raw === "" ? null : Number(raw) };
      });

      const res = await fetch("/api/admin/grades", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: section.id, subjectId: subject.id, period, scores, post }),
      });
      const body = await res.json();

      if (!res.ok || !body.success) {
        setNotice({ tone: "error", text: body.error ?? "Couldn't save those grades." });
        return;
      }
      setNotice({ tone: "ok", text: body.message });
      setDraft({});
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function switchSubject(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("subject", id);
    router.push(`?${next.toString()}`);
  }

  const field =
    "h-10 rounded-field border border-hairline-strong bg-surface px-3 text-sm outline-none focus-visible:border-brand-600";

  if (!section) return null;

  return (
    <div className="space-y-4">
      <div data-print="hide" className="space-y-3">
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 p-4">
            <label className="space-y-1.5">
              <span className="block text-xs font-medium text-content-muted">Subject</span>
              <select
                className={field}
                value={subject?.id ?? ""}
                onChange={(e) => switchSubject(e.target.value)}
                disabled={subjects.length === 0}
              >
                {subjects.length === 0 && <option value="">No subjects yet</option>}
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.title}
                  </option>
                ))}
              </select>
            </label>

            <p className="text-xs text-content-muted">
              Marked on{" "}
              <span className="font-medium">
                {rules.scale === "POINT_SCALE" ? "the 1.00–5.00 point scale" : "a percentage"}
              </span>
              , passing at {formatScore(rules.passing, rules.scale)}.
            </p>

            <Button onClick={() => window.print()} variant="outline" className="ml-auto">
              <Printer className="size-4" />
              Print
            </Button>
          </CardContent>
        </Card>

        {notice && (
          <p
            role="status"
            className={
              notice.tone === "ok"
                ? "flex items-start gap-2 rounded-field border border-present-500/40 bg-present-50 px-3 py-2 text-sm text-present-700 dark:bg-present-700/20 dark:text-present-50"
                : "flex items-start gap-2 rounded-field border border-late-500/40 bg-late-50 px-3 py-2 text-sm text-late-700 dark:bg-late-700/20 dark:text-late-50"
            }
          >
            {notice.tone === "ok" ? (
              <CircleCheckBig className="mt-0.5 size-4 shrink-0" />
            ) : (
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            )}
            {notice.text}
          </p>
        )}
      </div>

      {!subject ? (
        <Card data-print="hide">
          <CardContent className="p-10 text-center text-sm text-content-muted">
            This section has no subjects yet. Use <strong>Import from timetable</strong> above the
            section&rsquo;s schedule to create them from the codes already on it.
          </CardContent>
        </Card>
      ) : (
        <div data-print="sheet" className="space-y-3">
          <header className="space-y-0.5">
            <p className="text-sm font-semibold">{schoolName}</p>
            <h2 className="text-lg font-semibold">
              {subject.code} — {subject.title}
            </h2>
            <p className="text-xs text-content-muted">
              {section.name} · {section.programCode} · Year {section.yearLevel}
              {academicYear ? ` · ${academicYear.name}` : ""} · {subject.units} units
            </p>
          </header>

          <div className="overflow-x-auto rounded-card border border-hairline bg-surface">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="px-2 py-2 text-left font-medium">#</th>
                  <th className="px-2 py-2 text-left font-medium">Student</th>
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
                {sheet.rows.map((r, i) => {
                  const avg = liveAverage(r.studentId);
                  return (
                    <tr key={r.studentId} className="border-b border-hairline last:border-b-0">
                      <td className="data px-2 py-1.5 text-xs text-content-faint">{i + 1}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">
                        <span className="font-medium">{r.name}</span>
                        <span className="data ml-2 text-[0.65rem] text-content-faint">
                          {r.studentNumber}
                        </span>
                      </td>
                      {PERIODS.map((p) => (
                        <td key={p} className="px-1 py-1">
                          <input
                            inputMode="decimal"
                            aria-label={`${PERIOD_LABEL[p]} for ${r.name}`}
                            value={valueFor(r.studentId, p)}
                            onChange={(e) => set(r.studentId, p, e.target.value)}
                            className="data h-8 w-16 rounded border border-hairline bg-surface px-1 text-center text-xs outline-none focus-visible:border-brand-600"
                          />
                        </td>
                      ))}
                      <td className="data px-2 py-1.5 text-center text-xs font-semibold">
                        {formatScore(avg, rules.scale)}
                      </td>
                      <td className="px-2 py-1.5 text-center text-xs">
                        {remarkFor(avg, rules)}
                      </td>
                    </tr>
                  );
                })}
                {sheet.rows.length === 0 && (
                  <tr>
                    <td colSpan={PERIODS.length + 4} className="p-6 text-center text-sm text-content-muted">
                      Nobody is enrolled in this section yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <footer className="flex flex-wrap items-end justify-between gap-6 pt-2 text-xs text-content-muted">
            <p className="max-w-md">
              An empty box is an unmarked period, not a zero, and is left out of the average.
            </p>
            <div className="min-w-[16rem]">
              <div className="mt-8 border-t border-content-faint pt-1 text-center">
                Instructor&rsquo;s signature over printed name
              </div>
            </div>
          </footer>
        </div>
      )}

      {subject && sheet.rows.length > 0 && (
        <Card data-print="hide">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-medium">Save a period</p>
            <p className="text-sm text-content-muted">
              Saving keeps it as a draft only you can see. Posting releases that period to the
              students.
            </p>
            <div className="flex flex-wrap gap-2">
              {PERIODS.map((p) => (
                <span key={p} className="inline-flex overflow-hidden rounded-field border border-hairline-strong">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => save(p, false)}
                    className="rounded-none"
                  >
                    Save {PERIOD_LABEL[p]}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => save(p, true)}
                    className="rounded-none border-l border-hairline text-brand-700 dark:text-brand-300"
                  >
                    Post
                  </Button>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
