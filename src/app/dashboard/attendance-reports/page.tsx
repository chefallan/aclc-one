import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { ReportsDashboard } from "@/components/dashboard/reports-dashboard";

export const metadata = { title: "Attendance reports" };

const RANGES: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");
  if (!hasPermission(session.user.role as never, "report:view")) redirect("/dashboard");

  const { range = "7d" } = await searchParams;
  const days = RANGES[range] ?? 7;

  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  // Everything below is a real query. This screen previously rendered invented
  // students and invented rates, which is worse than an empty state — staff
  // would have made decisions on it.
  const [sessionCount, byStatus, attendances] = await Promise.all([
    prisma.classSession.count({
      where: { date: { gte: since } },
    }),
    prisma.classAttendance.groupBy({
      by: ["status"],
      where: { scannedAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.classAttendance.findMany({
      where: { scannedAt: { gte: since } },
      select: { scannedAt: true, status: true },
      orderBy: { scannedAt: "asc" },
    }),
  ]);

  const counts = Object.fromEntries(
    byStatus.map((row) => [row.status, row._count._all])
  ) as Record<string, number>;

  const present = counts.PRESENT ?? 0;
  const late = counts.LATE ?? 0;
  const absent = counts.ABSENT ?? 0;
  const excused = counts.EXCUSED ?? 0;
  const total = present + late + absent + excused;

  // Bucket by weekday across the window.
  const dayBuckets = new Map<string, { present: number; late: number; absent: number }>();
  for (const a of attendances) {
    const key = a.scannedAt.toLocaleDateString([], { month: "short", day: "numeric" });
    const bucket = dayBuckets.get(key) ?? { present: 0, late: 0, absent: 0 };
    if (a.status === "PRESENT") bucket.present += 1;
    else if (a.status === "LATE") bucket.late += 1;
    else if (a.status === "ABSENT") bucket.absent += 1;
    dayBuckets.set(key, bucket);
  }

  return (
    <ReportsDashboard
      range={range}
      days={days}
      totals={{
        sessions: sessionCount,
        present,
        late,
        absent,
        excused,
        rate: total > 0 ? Math.round(((present + late) / total) * 100) : null,
      }}
      byDay={Array.from(dayBuckets, ([day, v]) => ({ day, ...v }))}
    />
  );
}
