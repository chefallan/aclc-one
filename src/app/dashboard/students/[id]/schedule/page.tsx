import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft, Lock, PencilLine } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { resolveScheduleForUser, getActiveTerm } from "@/lib/schedule-resolver";
import { weeklyHours } from "@/lib/schedule";
import { Card, CardContent } from "@/components/ui/card";
import { ScheduleViews } from "@/components/schedule/schedule-views";
import { EnrolStudent } from "@/components/admin/enrol-student";

export const metadata = { title: "Student schedule" };

/**
 * A student's week, as staff see it — read-only.
 *
 * Nothing here can edit: a personal timetable belongs to the student, and a
 * section's belongs on the section screen where changing it is obviously a
 * change for everyone.
 */
export default async function StudentSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");
  if (!hasPermission(session.user.role as never, "schedule:view_any")) redirect("/dashboard");

  const student = await prisma.studentProfile.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      studentNumber: true,
      firstName: true,
      lastName: true,
    },
  });

  if (!student) notFound();

  const canManage = hasPermission(session.user.role as never, "student:manage");

  const [schedule, term, sections] = await Promise.all([
    resolveScheduleForUser(student.userId),
    getActiveTerm(),
    canManage
      ? prisma.section.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, name: true, program: { select: { code: true } } },
          orderBy: [{ yearLevel: "asc" }, { name: "asc" }],
        })
      : Promise.resolve([]),
  ]);
  const hours = weeklyHours(schedule.entries);
  const following = schedule.source === "SECTION";

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/students"
        className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content"
      >
        <ChevronLeft className="size-4" />
        All students
      </Link>

      <header>
        <p className="eyebrow">{student.studentNumber}</p>
        <h1 className="mt-1 text-2xl font-semibold">
          {student.firstName} {student.lastName}
        </h1>
        <p className="mt-1 text-sm text-content-muted">
          {schedule.entries.length === 0
            ? "No classes on this student's week."
            : `${schedule.entries.length} ${schedule.entries.length === 1 ? "class" : "classes"} · ${hours} hours a week`}
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          {following ? (
            <Lock className="size-4 shrink-0 text-content-faint" />
          ) : (
            <PencilLine className="size-4 shrink-0 text-content-faint" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {following ? (
                <>
                  Following <span className="data">{schedule.section?.name}</span>
                </>
              ) : (
                "Own timetable"
              )}
            </p>
            <p className="mt-0.5 text-sm text-content-muted">
              {following
                ? "This is the section's block schedule, so it changes when the section's does."
                : schedule.section
                  ? `Built by the student. ${schedule.section.name}'s block schedule has ${schedule.sectionEntryCount} ${schedule.sectionEntryCount === 1 ? "class" : "classes"}.`
                  : "Not enrolled in a section, so there is no block schedule to follow."}
            </p>
            {canManage && (
              <div className="mt-3">
                <EnrolStudent
                  studentId={student.id}
                  sections={sections.map((s) => ({
                    id: s.id,
                    name: s.name,
                    programCode: s.program.code,
                  }))}
                  currentSectionId={schedule.section?.id ?? null}
                />
              </div>
            )}
          </div>
          {schedule.section && hasPermission(session.user.role as never, "schedule:manage_section") && (
            <Link
              href={`/dashboard/sections/${schedule.section.id}/schedule`}
              className="text-sm text-brand-600 hover:underline dark:text-brand-300"
            >
              Open {schedule.section.name}
            </Link>
          )}
        </CardContent>
      </Card>

      <ScheduleViews
        entries={schedule.entries}
        term={term}
        emptyTitle="Nothing on this week"
        emptyBody={
          following
            ? "The section's block schedule hasn't been published yet."
            : "This student hasn't set up their own schedule."
        }
      />
    </div>
  );
}
