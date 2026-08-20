import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { SectionScheduleEditor } from "@/components/schedule/section-schedule-editor";
import { SectionSettings } from "@/components/admin/section-settings";
import { LiveRefresh } from "@/components/live-refresh";

export const metadata = { title: "Section timetable" };

export default async function SectionSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");
  if (!hasPermission(session.user.role as never, "schedule:manage_section")) redirect("/dashboard");

  const section = await prisma.section.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      yearLevel: true,
      status: true,
      program: { select: { code: true } },
      academicYear: { select: { name: true, startDate: true, endDate: true } },
      _count: { select: { studentEnrollments: true } },
      scheduleEntries: {
        select: {
          id: true,
          subjectCode: true,
          subjectTitle: true,
          day: true,
          startTime: true,
          endTime: true,
          room: true,
          instructor: true,
        },
        orderBy: [{ day: "asc" }, { startTime: "asc" }],
      },
    },
  });

  if (!section) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/sections"
        className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content"
      >
        <ChevronLeft className="size-4" />
        All sections
      </Link>

      <LiveRefresh scope="section-schedule" id={section.id} />

      <SectionSettings
        sectionId={section.id}
        name={section.name}
        yearLevel={section.yearLevel}
        status={section.status as "ACTIVE" | "INACTIVE"}
        enrolledCount={section._count.studentEnrollments}
      />

      <SectionScheduleEditor
        sectionId={section.id}
        sectionName={section.name}
        programCode={section.program.code}
        academicYear={section.academicYear.name}
        enrolledCount={section._count.studentEnrollments}
        initialEntries={section.scheduleEntries}
        term={{
          start: section.academicYear.startDate.toISOString().slice(0, 10),
          end: section.academicYear.endDate.toISOString().slice(0, 10),
        }}
      />
    </div>
  );
}
