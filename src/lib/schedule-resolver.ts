import { prisma } from "@/lib/prisma";
import type { ScheduleSource, Weekday } from "@prisma/client";

export interface ResolvedEntry {
  id: string;
  subjectCode: string;
  subjectTitle: string | null;
  day: Weekday;
  startTime: string;
  endTime: string;
  room: string | null;
  instructor: string | null;
}

export interface ResolvedSchedule {
  source: ScheduleSource;
  entries: ResolvedEntry[];
  /** The section they belong to, whether or not they are following it. */
  section: { id: string; name: string } | null;
  /** How many entries the section's official timetable holds. */
  sectionEntryCount: number;
  /** True when they are reading a timetable they cannot edit. */
  readOnly: boolean;
  /**
   * Whether this person is a student at all. Faculty also have no section, so
   * without this the two cases are indistinguishable and a teacher gets told
   * to wait for the registrar to enrol them.
   */
  isStudent: boolean;
}

const ENTRY_SELECT = {
  id: true,
  subjectCode: true,
  subjectTitle: true,
  day: true,
  startTime: true,
  endTime: true,
  room: true,
  instructor: true,
} as const;

const ORDER = [{ day: "asc" }, { startTime: "asc" }] as const;

/**
 * The one place that answers "which timetable does this person see?".
 *
 * A student follows their section unless they have switched to a personal
 * one. Following keeps them in step when the registrar moves a class, which
 * is why it is the default; a personal timetable exists for irregular
 * students and anyone whose electives differ from the block.
 *
 * Faculty have no section, so they always read their own.
 */
export async function resolveScheduleForUser(userId: string): Promise<ResolvedSchedule> {
  const student = await prisma.studentProfile.findFirst({
    where: { userId },
    select: {
      scheduleSource: true,
      enrollments: {
        where: { enrollmentStatus: "ENROLLED" },
        orderBy: { enrolledAt: "desc" },
        take: 1,
        select: { section: { select: { id: true, name: true } } },
      },
    },
  });

  const section = student?.enrollments[0]?.section ?? null;

  const sectionEntryCount = section
    ? await prisma.sectionScheduleEntry.count({ where: { sectionId: section.id } })
    : 0;

  // Faculty, or a student who has opted out of the block schedule.
  if (!student || student.scheduleSource === "PERSONAL") {
    const entries = await prisma.scheduleEntry.findMany({
      where: { userId },
      select: ENTRY_SELECT,
      orderBy: [...ORDER],
    });
    return {
      source: "PERSONAL",
      entries,
      section,
      sectionEntryCount,
      readOnly: false,
      isStudent: Boolean(student),
    };
  }

  if (!section) {
    // Enrolled in nothing yet: there is no section timetable to fall back to,
    // so their own is the only thing they can build.
    const entries = await prisma.scheduleEntry.findMany({
      where: { userId },
      select: ENTRY_SELECT,
      orderBy: [...ORDER],
    });
    return {
      source: "PERSONAL",
      entries,
      section: null,
      sectionEntryCount: 0,
      readOnly: false,
      isStudent: true,
    };
  }

  const entries = await prisma.sectionScheduleEntry.findMany({
    where: { sectionId: section.id },
    select: ENTRY_SELECT,
    orderBy: [...ORDER],
  });

  return {
    source: "SECTION",
    entries,
    section,
    sectionEntryCount,
    // The registrar owns this one; a student reads it.
    readOnly: true,
    isStudent: true,
  };
}

/**
 * The school year the calendar should stop at.
 *
 * Read as UTC date keys, not local ones: startDate and endDate are date-only
 * columns stored at midnight UTC, so a server anywhere behind Manila would
 * otherwise report the term opening a day early.
 */
export async function getActiveTerm(): Promise<{ start: string; end: string } | null> {
  const year = await prisma.academicYear.findFirst({
    where: { status: "ACTIVE" },
    select: { startDate: true, endDate: true },
  });
  if (!year) return null;
  return {
    start: year.startDate.toISOString().slice(0, 10),
    end: year.endDate.toISOString().slice(0, 10),
  };
}

/**
 * Copies a section's timetable into a student's own, so "customise" starts
 * from what they already have rather than a blank week.
 *
 * Replaces whatever personal entries exist: this is an explicit "start from
 * my section" action, not a merge, and a half-merged timetable would be worse
 * than either.
 */
export async function adoptSectionSchedule(userId: string, sectionId: string): Promise<number> {
  const sectionEntries = await prisma.sectionScheduleEntry.findMany({
    where: { sectionId },
    select: ENTRY_SELECT,
  });

  if (sectionEntries.length === 0) return 0;

  await prisma.$transaction([
    prisma.scheduleEntry.deleteMany({ where: { userId } }),
    prisma.scheduleEntry.createMany({
      data: sectionEntries.map((e) => ({
        userId,
        subjectCode: e.subjectCode,
        subjectTitle: e.subjectTitle,
        day: e.day,
        startTime: e.startTime,
        endTime: e.endTime,
        room: e.room,
        instructor: e.instructor,
      })),
    }),
  ]);

  return sectionEntries.length;
}
