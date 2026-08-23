import { prisma } from "@/lib/prisma";

/**
 * The data behind a printed attendance sheet.
 *
 * A sheet is a grid: students down the side, the dates the class actually met
 * across the top, and a mark in each cell. Sessions come from ClassSession
 * rather than the timetable, because the sheet records what happened, not what
 * was scheduled - a cancelled class should not appear as a column of absences.
 */
export interface SheetCell {
  status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED" | null;
}

export interface SheetRow {
  studentId: string;
  studentNumber: string;
  name: string;
  cells: SheetCell[];
  present: number;
  late: number;
  absent: number;
  excused: number;
  /** Of the sessions held, the share where they turned up at all. */
  rate: number | null;
}

export interface AttendanceSheet {
  section: { id: string; name: string; programCode: string; yearLevel: number } | null;
  academicYear: string | null;
  sessions: Array<{ id: string; date: Date; subject: string | null; room: string | null }>;
  rows: SheetRow[];
  from: Date;
  to: Date;
}

const MARK: Record<string, SheetCell["status"]> = {
  PRESENT: "PRESENT",
  LATE: "LATE",
  ABSENT: "ABSENT",
  EXCUSED: "EXCUSED",
};

export async function buildAttendanceSheet(
  sectionId: string,
  from: Date,
  to: Date
): Promise<AttendanceSheet> {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: {
      id: true,
      name: true,
      yearLevel: true,
      program: { select: { code: true } },
      academicYear: { select: { name: true } },
    },
  });

  if (!section) {
    return { section: null, academicYear: null, sessions: [], rows: [], from, to };
  }

  const [sessions, enrollments] = await Promise.all([
    prisma.classSession.findMany({
      where: { sectionId, date: { gte: from, lte: to } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      select: { id: true, date: true, subject: true, room: true },
    }),
    // The roster, not whoever happens to have attended. A student who missed
    // every session must still appear, as a row of absences - that is the
    // point of the sheet.
    prisma.studentEnrollment.findMany({
      where: { sectionId, enrollmentStatus: "ENROLLED" },
      select: {
        student: { select: { id: true, studentNumber: true, firstName: true, lastName: true } },
      },
    }),
  ]);

  const sessionIds = sessions.map((s) => s.id);
  const attendance = sessionIds.length
    ? await prisma.classAttendance.findMany({
        where: { classSessionId: { in: sessionIds } },
        select: { classSessionId: true, studentId: true, status: true },
      })
    : [];

  const marks = new Map<string, string>();
  for (const a of attendance) marks.set(`${a.studentId}:${a.classSessionId}`, a.status);

  const rows: SheetRow[] = enrollments
    .map(({ student }) => {
      const cells: SheetCell[] = sessions.map((s) => {
        const raw = marks.get(`${student.id}:${s.id}`);
        // No record against a session that was held is an absence, not a gap.
        // Leaving it blank would quietly forgive it.
        return { status: raw ? MARK[raw] ?? null : sessions.length ? "ABSENT" : null };
      });

      const count = (k: SheetCell["status"]) => cells.filter((c) => c.status === k).length;
      const present = count("PRESENT");
      const late = count("LATE");
      const absent = count("ABSENT");
      const excused = count("EXCUSED");
      const held = present + late + absent + excused;

      return {
        studentId: student.id,
        studentNumber: student.studentNumber,
        name: `${student.lastName}, ${student.firstName}`,
        cells,
        present,
        late,
        absent,
        excused,
        // Excused days are removed from the denominator rather than counted
        // against them; an approved absence is not a poor attendance record.
        rate: held - excused > 0 ? Math.round(((present + late) / (held - excused)) * 100) : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    section: {
      id: section.id,
      name: section.name,
      programCode: section.program.code,
      yearLevel: section.yearLevel,
    },
    academicYear: section.academicYear.name,
    sessions,
    rows,
    from,
    to,
  };
}
