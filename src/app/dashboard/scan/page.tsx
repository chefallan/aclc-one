import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CheckInPanel } from "@/components/class/check-in-panel";

export const metadata = { title: "Check in" };

export default async function CheckInPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect("/auth/signin");
  if (!session.user.studentProfileId) redirect("/dashboard");

  const profile = await prisma.studentProfile.findUnique({
    where: { id: session.user.studentProfileId },
    select: { qrCodeToken: true, studentNumber: true, firstName: true, lastName: true },
  });

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 59, 999);

  const [openSessions, todayAttendance] = await Promise.all([
    prisma.classSession.findMany({
      where: {
        date: { gte: dayStart, lte: dayEnd },
        status: { in: ["SCHEDULED", "ACTIVE"] },
      },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        subject: true,
        room: true,
        startTime: true,
        endTime: true,
        status: true,
        teacher: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.classAttendance.findMany({
      where: {
        studentId: session.user.studentProfileId,
        scannedAt: { gte: dayStart, lte: dayEnd },
      },
      select: { classSessionId: true, status: true, scannedAt: true },
    }),
  ]);

  return (
    <CheckInPanel
      qrCodeToken={profile?.qrCodeToken ?? ""}
      studentNumber={profile?.studentNumber ?? ""}
      studentName={[profile?.firstName, profile?.lastName].filter(Boolean).join(" ")}
      openSessions={openSessions.map((s) => ({
        id: s.id,
        subject: s.subject,
        room: s.room,
        startTime: s.startTime.toISOString(),
        endTime: s.endTime.toISOString(),
        status: s.status,
        teacher: s.teacher ? `${s.teacher.firstName} ${s.teacher.lastName}` : null,
      }))}
      todayAttendance={todayAttendance.map((a) => ({
        classSessionId: a.classSessionId,
        status: a.status,
        scannedAt: a.scannedAt.toISOString(),
      }))}
    />
  );
}
