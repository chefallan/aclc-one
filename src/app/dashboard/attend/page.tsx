import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MyRecord, type SubjectRate } from "@/components/attendance/my-record";
import type { CalendarDay, DayState } from "@/components/ui/attendance-calendar";

export const metadata = { title: "Attendance" };

const STATE: Record<string, DayState> = {
  PRESENT: "present",
  LATE: "late",
  ABSENT: "absent",
  EXCUSED: "excused",
};

/**
 * Concept sheet 03.3 · My record — the student half of attendance.
 *
 * Deliberately not the same screen as /dashboard/attendance-reports, which is
 * the staff view and is gated on report:view. A student needs their own record
 * and nobody else, and the two answer different questions: one is "am I going
 * to fail this subject on attendance", the other is "how is the cohort doing".
 */
export default async function AttendPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  // Staff have their own reports screen; this one is the student record.
  if (!session.user.studentProfileId) redirect("/dashboard/attendance-reports");

  const attendances = await prisma.classAttendance.findMany({
    where: { studentId: session.user.studentProfileId },
    orderBy: { scannedAt: "desc" },
    include: {
      classSession: { select: { subject: true, date: true, room: true } },
    },
  });

  const counts = { present: 0, late: 0, absent: 0, excused: 0 };
  for (const a of attendances) {
    if (a.status === "PRESENT") counts.present += 1;
    else if (a.status === "LATE") counts.late += 1;
    else if (a.status === "ABSENT") counts.absent += 1;
    else counts.excused += 1;
  }

  // Grouped on the session subject, because that is the only subject a class
  // attendance actually carries. A student following a section timetable sees
  // the same codes here as on their schedule.
  const bySubject = new Map<string, SubjectRate>();
  for (const a of attendances) {
    const code = a.classSession?.subject ?? "Unassigned";
    const row =
      bySubject.get(code) ??
      ({ code, title: code, sessions: 0, present: 0, late: 0, absent: 0, excused: 0 } as SubjectRate);
    row.sessions += 1;
    if (a.status === "PRESENT") row.present += 1;
    else if (a.status === "LATE") row.late += 1;
    else if (a.status === "ABSENT") row.absent += 1;
    else row.excused += 1;
    bySubject.set(code, row);
  }

  // The worst rate first: the subject that can end a semester should not be
  // the one a student has to scroll to find.
  const subjects = [...bySubject.values()].sort((a, b) => {
    const ra = a.sessions ? (a.present + a.late) / a.sessions : 1;
    const rb = b.sessions ? (b.present + b.late) / b.sessions : 1;
    return ra - rb;
  });

  // The current month, one cell per day. A day with no session is "none"
  // rather than absent — an empty Saturday is not a wellbeing signal.
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDay = new Map<number, DayState>();
  for (const a of attendances) {
    const when = a.classSession?.date ?? a.scannedAt;
    const d = new Date(when);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const state = STATE[a.status] ?? "excused";
    const existing = byDay.get(d.getDate());
    // An absence anywhere in a day outranks a present elsewhere in it: the
    // heatmap is looking for trouble, not for an average.
    const rank: Record<DayState, number> = {
      none: 0,
      excused: 1,
      present: 2,
      late: 3,
      absent: 4,
    };
    if (!existing || rank[state] > rank[existing]) byDay.set(d.getDate(), state);
  }

  const days: CalendarDay[] = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const state = byDay.get(day) ?? "none";
    return {
      day,
      state,
      label: `${new Date(year, month, day).toLocaleDateString([], {
        month: "long",
        day: "numeric",
      })}: ${state === "none" ? "no class" : state}`,
    };
  });

  const activeYear = await prisma.academicYear.findFirst({
    where: { status: "ACTIVE" },
    select: { name: true },
  });

  return (
    <MyRecord
      termLabel={activeYear?.name ? `AY ${activeYear.name}` : "This term"}
      counts={counts}
      subjects={subjects}
      days={days}
      monthLabel={now.toLocaleDateString([], { month: "long", year: "numeric" })}
      startsOn={new Date(year, month, 1).getDay()}
    />
  );
}
