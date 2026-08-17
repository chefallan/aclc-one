import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { CalendarDays, Users, ChevronRight } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionSetup } from "@/components/admin/section-setup";

export const metadata = { title: "Sections" };

export default async function SectionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");
  if (!hasPermission(session.user.role as never, "schedule:manage_section")) redirect("/dashboard");

  // The two things a section cannot exist without. Fetched so the setup panel
  // can offer to create them rather than failing validation later.
  const [academicYears, programs] = await Promise.all([
    prisma.academicYear.findMany({
      select: { id: true, name: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.program.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const sections = await prisma.section.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ yearLevel: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      yearLevel: true,
      program: { select: { code: true } },
      academicYear: { select: { name: true } },
      _count: { select: { scheduleEntries: true, studentEnrollments: true } },
    },
  });

  return (
    <div className="space-y-5">
      <header>
        <p className="eyebrow">Registrar</p>
        <h1 className="mt-1 text-2xl font-semibold">Section timetables</h1>
        <p className="mt-1 text-sm text-content-muted">
          A section&rsquo;s block schedule is what every student in it reads, unless they&rsquo;ve
          built their own.
        </p>
      </header>

      <SectionSetup academicYears={academicYears} programs={programs} />

      {sections.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <CalendarDays className="mx-auto size-8 text-content-faint" />
            <p className="mt-3 font-medium">No active sections</p>
            <p className="mt-1 text-sm text-content-muted">
              Use New section above. On a fresh install you will be walked through the academic year and programme first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {sections.map((s) => (
            <li key={s.id}>
              <Link
                href={`/dashboard/sections/${s.id}/schedule`}
                className="block rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <Card className="transition-colors hover:border-brand-300">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="data text-sm font-semibold">{s.name}</p>
                      <p className="mt-0.5 text-xs text-content-muted">
                        {s.program.code} · Year {s.yearLevel} · {s.academicYear.name}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-content-faint">
                        <Users className="size-3.5" />
                        {s._count.studentEnrollments} enrolled
                      </p>
                    </div>
                    {s._count.scheduleEntries > 0 ? (
                      <Badge variant="success">
                        {s._count.scheduleEntries}{" "}
                        {s._count.scheduleEntries === 1 ? "class" : "classes"}
                      </Badge>
                    ) : (
                      <Badge variant="outline">No schedule</Badge>
                    )}
                    <ChevronRight className="size-4 shrink-0 text-content-faint" />
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
