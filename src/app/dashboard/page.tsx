import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveScheduleForUser } from "@/lib/schedule-resolver";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { SupervisorDashboard } from "@/components/dashboard/supervisor-dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { ROLE_LABEL } from "@/lib/permissions";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const role = session.user.role;

  // Fetch data based on role
  if (role === "STUDENT" && session.user.studentProfileId) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const classAttendances = await prisma.classAttendance.findMany({
      where: {
        studentId: session.user.studentProfileId,
      },
      orderBy: { scannedAt: "desc" },
      take: 20,
      include: {
        classSession: { select: { subject: true, room: true, startTime: true } },
      },
    });

    // The timetable answers "what do I have next?". It is the only thing that
    // can: a ClassSession exists only once an instructor opens one, which is
    // both too late and not a schedule.
    //
    // Resolved rather than read straight from scheduleEntry, so a student
    // following their section's block sees the same week here as on /schedule.
    const { entries: schedule, section } = await resolveScheduleForUser(session.user.id);

    // Today's sessions for their own section. This used to have no section
    // filter at all, so a first-year saw a fourth-year class advertised on
    // their home screen and was invited to check in to it.
    //
    // Every status, not just ACTIVE: the "Today x/y" metric counts the day's
    // sessions, and a class the instructor has already closed still happened.
    // Which of these is open for check-in is the component's decision.
    const todaySessions = section
      ? await prisma.classSession.findMany({
          where: {
            date: { gte: todayStart, lte: todayEnd },
            sectionId: section.id,
          },
          orderBy: { startTime: "asc" },
          include: {
            section: { select: { name: true } },
            teacher: { select: { firstName: true, lastName: true } },
          },
        })
      : [];

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: session.user.studentProfileId },
      select: { qrCodeToken: true, studentNumber: true },
    });

    return (
      <StudentDashboard
        user={session.user}
        classAttendances={classAttendances}
        todaySessions={todaySessions}
        qrCodeToken={studentProfile?.qrCodeToken || ""}
        studentNumber={studentProfile?.studentNumber || undefined}
        schedule={schedule}
      />
    );
  }

  if (role === "FACULTY") {
    // The session form needs real sections to choose from. Advised sections
    // first; if none are advised, any section in the school so a substitute
    // instructor is not blocked.
    const advised = await prisma.section.findMany({
      where: {
        status: "ACTIVE",
        adviserId: session.user.id,
      },
      select: { id: true, name: true, program: { select: { name: true } } },
      orderBy: { name: "asc" },
    });

    const sections =
      advised.length > 0
        ? advised
        : await prisma.section.findMany({
            where: {
              status: "ACTIVE",
            },
            select: { id: true, name: true, program: { select: { name: true } } },
            orderBy: { name: "asc" },
            take: 100,
          });

    const classSessions = await prisma.classSession.findMany({
      where: {
        teacherId: session.user.id,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        section: { select: { name: true, program: { select: { name: true } } } },
        attendances: {
          include: {
            student: { select: { firstName: true, lastName: true, studentNumber: true } },
          },
        },
      },
    });

    return (
      <TeacherDashboard
        classSessions={classSessions as never}
        sections={sections.map((s) => ({
          id: s.id,
          name: s.name,
          programName: s.program?.name ?? null,
        }))}
        user={session.user}
      />
    );
  }

  if (role === "SUPERVISOR" && session.user.supervisorRecordId) {
    const classSessions = await prisma.classSession.findMany({
      where: {
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        section: { select: { name: true, program: { select: { name: true } } } },
        teacher: { select: { firstName: true, lastName: true } },
        attendances: {
          include: {
            student: { select: { firstName: true, lastName: true, studentNumber: true } },
          },
        },
      },
    });

    return (
      <SupervisorDashboard
        classSessions={classSessions}
        user={session.user}
      />
    );
  }

  // Everything above returns for its own role. Reaching here used to mean
  // "must be an admin", which was wrong in the one way that matters: a STUDENT
  // whose studentProfileId is null matched no branch and was handed the
  // administrator's school overview, complete with roll counts.
  //
  // Admin is now something you must be, not something you become by not
  // matching anything else.
  if (role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <header>
          <p className="eyebrow">{ROLE_LABEL[role as keyof typeof ROLE_LABEL] ?? role}</p>
          <h1 className="mt-1 text-2xl font-semibold">Your account isn&rsquo;t set up yet</h1>
        </header>
        <Card>
          <CardContent className="p-5 text-sm text-content-muted">
            <p>
              Your sign-in works, but the school record behind it is incomplete, so there is
              nothing to show here yet.
            </p>
            <p className="mt-2">
              An administrator can finish this from Requests. Until then the rest of the app —
              your schedule, the library, campus — still works from the menu.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const stats = await prisma.$transaction([
    prisma.studentProfile.count(),
    prisma.user.count({ where: { role: "FACULTY" } }),
    prisma.classSession.count({
      where: { date: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.classAttendance.count({
      where: { scannedAt: { gte: todayStart, lte: todayEnd } },
    }),
  ]);

  const totalEnrolled = await prisma.studentEnrollment.count({
    where: { enrollmentStatus: "ENROLLED" },
  });

  const avgAttendanceRate = totalEnrolled > 0 && stats[3] > 0
    ? Math.round((stats[3] / totalEnrolled) * 100)
    : 0;

  const recentSessions = await prisma.classSession.findMany({
    include: {
      section: { select: { name: true } },
      teacher: { select: { firstName: true, lastName: true } },
      attendances: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <AdminDashboard
      stats={{
        totalStudents: stats[0],
        totalTeachers: stats[1],
        todaysSessions: stats[2],
        avgAttendanceRate,
      }}
      recentSessions={recentSessions}
      user={session.user}
    />
  );
}
