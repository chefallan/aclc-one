import type { AttendanceSheet } from "@/lib/attendance-sheet";

/**
 * The sheet itself, built to survive a printer.
 *
 * One letter per cell, because a month of sessions has to fit across a page.
 * The legend at the foot carries the meaning so the letters do not have to,
 * and the signature line is there because this is a document someone signs.
 */
const LETTER: Record<string, string> = {
  PRESENT: "P",
  LATE: "L",
  ABSENT: "A",
  EXCUSED: "E",
};

function shortDate(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function longDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function AttendanceSheetTable({
  sheet,
  schoolName,
}: {
  sheet: AttendanceSheet;
  schoolName: string;
}) {
  const { section, academicYear, sessions, rows, from, to } = sheet;

  return (
    <div data-print="sheet" className="space-y-3">
      <header className="space-y-0.5">
        <p className="text-sm font-semibold">{schoolName}</p>
        <h2 className="text-lg font-semibold">
          Attendance — {section?.name}
          <span className="ml-2 text-sm font-normal text-content-muted">
            {section?.programCode} · Year {section?.yearLevel}
            {academicYear ? ` · ${academicYear}` : ""}
          </span>
        </h2>
        <p className="text-xs text-content-muted">
          {longDate(from)} to {longDate(to)} · {sessions.length}{" "}
          {sessions.length === 1 ? "session" : "sessions"} held · {rows.length}{" "}
          {rows.length === 1 ? "student" : "students"}
        </p>
      </header>

      {sessions.length === 0 ? (
        <p className="rounded-card border border-hairline bg-surface p-6 text-center text-sm text-content-muted">
          No class sessions were held in this range, so there is nothing to record. Sessions are
          created by an instructor when they open attendance.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-hairline bg-surface">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-hairline">
                <th className="px-2 py-2 text-left font-medium">#</th>
                <th className="px-2 py-2 text-left font-medium">Student</th>
                {sessions.map((s) => (
                  <th key={s.id} className="data px-1 py-2 text-center text-[0.65rem] font-medium">
                    {shortDate(s.date)}
                  </th>
                ))}
                <th className="px-2 py-2 text-center text-xs font-medium">P</th>
                <th className="px-2 py-2 text-center text-xs font-medium">L</th>
                <th className="px-2 py-2 text-center text-xs font-medium">A</th>
                <th className="px-2 py-2 text-center text-xs font-medium">E</th>
                <th className="px-2 py-2 text-center text-xs font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.studentId} className="border-b border-hairline last:border-b-0">
                  <td className="data px-2 py-1.5 text-xs text-content-faint">{i + 1}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    <span className="font-medium">{r.name}</span>
                    <span className="data ml-2 text-[0.65rem] text-content-faint">
                      {r.studentNumber}
                    </span>
                  </td>
                  {r.cells.map((c, j) => (
                    <td key={j} className="data px-1 py-1.5 text-center text-xs">
                      {c.status ? LETTER[c.status] : "—"}
                    </td>
                  ))}
                  <td className="data px-2 py-1.5 text-center text-xs">{r.present}</td>
                  <td className="data px-2 py-1.5 text-center text-xs">{r.late}</td>
                  <td className="data px-2 py-1.5 text-center text-xs">{r.absent}</td>
                  <td className="data px-2 py-1.5 text-center text-xs">{r.excused}</td>
                  <td className="data px-2 py-1.5 text-center text-xs font-semibold">
                    {r.rate === null ? "—" : `${r.rate}%`}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={sessions.length + 7}
                    className="p-6 text-center text-sm text-content-muted"
                  >
                    Nobody is enrolled in this section yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <footer className="flex flex-wrap items-end justify-between gap-6 pt-2 text-xs text-content-muted">
        <p className="max-w-md">
          <span className="font-medium">P</span> present · <span className="font-medium">L</span>{" "}
          late · <span className="font-medium">A</span> absent ·{" "}
          <span className="font-medium">E</span> excused. Excused sessions are left out of the
          percentage — an approved absence is not a poor record.
        </p>
        <div className="min-w-[16rem]">
          <div className="mt-8 border-t border-content-faint pt-1 text-center">
            Instructor&rsquo;s signature over printed name
          </div>
        </div>
      </footer>
    </div>
  );
}
