import { prisma } from "@/lib/prisma";
import type { GradingPeriod } from "@prisma/client";
import { PERIODS, averageOfPeriods, remarkFor, type GradingRules } from "@/lib/grading";

/**
 * The data behind a grade sheet, and the settings that decide how to read it.
 */
export async function getGradingRules(): Promise<GradingRules> {
  const school = await prisma.school.findFirst({
    select: { gradingScale: true, passingGrade: true },
  });
  return {
    scale: school?.gradingScale ?? "PERCENTAGE",
    passing: school ? Number(school.passingGrade) : 75,
    periods: PERIODS,
  };
}

/**
 * Turns the subject codes already sitting in a section's timetable into real
 * Subject records.
 *
 * The codes exist as free text on the block schedule, which is enough to print
 * a timetable and not enough to hold a grade. Rather than make someone retype
 * a curriculum that is already in the system, this promotes what is there.
 * Idempotent: a code that already has a subject is left alone, including its
 * unit count, which someone may have corrected by hand.
 */
export async function importSubjectsFromTimetable(sectionId: string): Promise<number> {
  const entries = await prisma.sectionScheduleEntry.findMany({
    where: { sectionId },
    select: { subjectCode: true, subjectTitle: true },
  });

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { programId: true },
  });

  // A subject that meets twice a week is one subject, and LEC and LAB of the
  // same code are one subject with one grade.
  const byCode = new Map<string, string | null>();
  for (const e of entries) {
    const code = e.subjectCode.trim();
    if (!code) continue;
    const title = (e.subjectTitle ?? "").replace(/\s*\((LEC|LAB)\)\s*$/i, "").trim();
    if (!byCode.has(code) || (!byCode.get(code) && title)) byCode.set(code, title || null);
  }

  const existing = await prisma.subject.findMany({
    where: { code: { in: [...byCode.keys()] } },
    select: { code: true },
  });
  const known = new Set(existing.map((s) => s.code));

  const toCreate = [...byCode.entries()].filter(([code]) => !known.has(code));
  if (toCreate.length === 0) return 0;

  await prisma.subject.createMany({
    data: toCreate.map(([code, title]) => ({
      code,
      title: title || code,
      programId: section?.programId ?? null,
    })),
    skipDuplicates: true,
  });

  return toCreate.length;
}

export interface GradeSheetRow {
  studentId: string;
  studentNumber: string;
  name: string;
  scores: Record<GradingPeriod, number | null>;
  average: number | null;
  remark: string;
}

export interface GradeSheet {
  section: { id: string; name: string; programCode: string; yearLevel: number } | null;
  academicYear: { id: string; name: string } | null;
  subject: { id: string; code: string; title: string; units: number } | null;
  subjects: Array<{ id: string; code: string; title: string }>;
  rows: GradeSheetRow[];
  rules: GradingRules;
}

export async function buildGradeSheet(
  sectionId: string,
  subjectId: string | undefined
): Promise<GradeSheet> {
  const rules = await getGradingRules();

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: {
      id: true,
      name: true,
      yearLevel: true,
      programId: true,
      program: { select: { code: true } },
      academicYear: { select: { id: true, name: true } },
      scheduleEntries: { select: { subjectCode: true } },
    },
  });

  if (!section) {
    return { section: null, academicYear: null, subject: null, subjects: [], rows: [], rules };
  }

  // Only the subjects this section actually takes, read off its timetable.
  const codes = [...new Set(section.scheduleEntries.map((e) => e.subjectCode.trim()))];
  const subjects = await prisma.subject.findMany({
    where: { code: { in: codes } },
    select: { id: true, code: true, title: true, units: true },
    orderBy: { code: "asc" },
  });

  const subject = subjectId
    ? subjects.find((s) => s.id === subjectId) ?? null
    : subjects[0] ?? null;

  if (!subject) {
    return {
      section: {
        id: section.id,
        name: section.name,
        programCode: section.program.code,
        yearLevel: section.yearLevel,
      },
      academicYear: section.academicYear,
      subject: null,
      subjects: subjects.map((s) => ({ id: s.id, code: s.code, title: s.title })),
      rows: [],
      rules,
    };
  }

  const [enrollments, grades] = await Promise.all([
    prisma.studentEnrollment.findMany({
      where: { sectionId, enrollmentStatus: "ENROLLED" },
      select: {
        student: { select: { id: true, studentNumber: true, firstName: true, lastName: true } },
      },
    }),
    prisma.grade.findMany({
      where: {
        subjectId: subject.id,
        academicYearId: section.academicYear.id,
        student: { enrollments: { some: { sectionId } } },
      },
      select: { studentId: true, period: true, score: true },
    }),
  ]);

  const marks = new Map<string, number | null>();
  for (const g of grades) {
    marks.set(`${g.studentId}:${g.period}`, g.score === null ? null : Number(g.score));
  }

  const rows: GradeSheetRow[] = enrollments
    .map(({ student }) => {
      const scores = Object.fromEntries(
        PERIODS.map((p) => [p, marks.get(`${student.id}:${p}`) ?? null])
      ) as Record<GradingPeriod, number | null>;

      const average = averageOfPeriods(PERIODS.map((p) => scores[p]));

      return {
        studentId: student.id,
        studentNumber: student.studentNumber,
        name: `${student.lastName}, ${student.firstName}`,
        scores,
        average,
        remark: remarkFor(average, rules),
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
    academicYear: section.academicYear,
    subject: {
      id: subject.id,
      code: subject.code,
      title: subject.title,
      units: Number(subject.units),
    },
    subjects: subjects.map((s) => ({ id: s.id, code: s.code, title: s.title })),
    rows,
    rules,
  };
}
