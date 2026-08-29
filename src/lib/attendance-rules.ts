import { prisma } from "@/lib/prisma";
import type { AttendanceStatus } from "@prisma/client";

export interface AttendanceRules {
  lateGraceMinutes: number;
}

/**
 * Fallbacks for the window between this code shipping and the organization
 * row being read — they match the column defaults, which in turn match the
 * constants these rules replaced.
 */
export const DEFAULT_ATTENDANCE_RULES: AttendanceRules = {
  lateGraceMinutes: 15,
};

/** Reads the one school row. Falls back to the defaults if it is missing. */
export async function getAttendanceRules(): Promise<AttendanceRules> {
  const school = await prisma.school.findFirst({
    select: { lateGraceMinutes: true },
  });

  if (!school) return DEFAULT_ATTENDANCE_RULES;

  return { lateGraceMinutes: school.lateGraceMinutes };
}

/**
 * Single definition of when an arrival counts as late.
 *
 * This lived twice — once in the student check-in route and once in the
 * teacher scan route — with the same magic number copy-pasted into both. Two
 * copies of a rule drift, and attendance is the one record here that can end a
 * semester.
 */
export function resolveAttendanceStatus(
  sessionStart: Date,
  arrivedAt: Date,
  rules: AttendanceRules
): AttendanceStatus {
  const cutoff = sessionStart.getTime() + rules.lateGraceMinutes * 60_000;
  return arrivedAt.getTime() > cutoff ? "LATE" : "PRESENT";
}


/**
 * The absence cap lives in its own module because the screens that show it are
 * client components and this file reaches for Prisma. Re-exported here so
 * server code that already imports the attendance rules keeps one entry point.
 */
export { ABSENCE_CAP_RATIO, absenceBudget, type AbsenceBudget } from "@/lib/attendance-cap";
