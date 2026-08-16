import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { Search, Upload, ChevronRight, Users } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Prisma } from "@prisma/client";

export const metadata = { title: "Students" };

const PAGE_SIZE = 50;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");
  if (!hasPermission(session.user.role as never, "schedule:view_any")) redirect("/dashboard");

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  // Name or student number — the two things staff have in front of them.
  const where: Prisma.StudentProfileWhereInput = query
    ? {
        OR: [
          { studentNumber: { contains: query, mode: "insensitive" } },
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};

  const [students, total] = await Promise.all([
    prisma.studentProfile.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: PAGE_SIZE,
      select: {
        id: true,
        studentNumber: true,
        firstName: true,
        lastName: true,
        scheduleSource: true,
        enrollments: {
          where: { enrollmentStatus: "ENROLLED" },
          orderBy: { enrolledAt: "desc" },
          take: 1,
          select: { section: { select: { name: true } } },
        },
      },
    }),
    prisma.studentProfile.count({ where }),
  ]);

  const canImport = hasPermission(session.user.role as never, "student:import");

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Roster</p>
          <h1 className="mt-1 text-2xl font-semibold">Students</h1>
          <p className="mt-1 text-sm text-content-muted">
            {total} {total === 1 ? "student" : "students"}
            {query ? ` matching “${query}”` : ""}
            {total > PAGE_SIZE ? ` · showing the first ${PAGE_SIZE}` : ""}
          </p>
        </div>
        {canImport && (
          <Link
            href="/dashboard/students/import"
            className="inline-flex items-center gap-1.5 text-sm text-content-muted hover:text-content"
          >
            <Upload className="size-4" />
            Import
          </Link>
        )}
      </header>

      <form className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-content-faint" />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Name or student number"
          aria-label="Search students"
          className="h-11 w-full rounded-field border border-hairline-strong bg-surface pl-9 pr-3 text-sm outline-none placeholder:text-content-faint focus-visible:border-brand-600"
        />
      </form>

      {students.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Users className="mx-auto size-8 text-content-faint" />
            <p className="mt-3 font-medium">
              {query ? "Nobody matches that" : "No students yet"}
            </p>
            <p className="mt-1 text-sm text-content-muted">
              {query
                ? "Try a student number, or part of a surname."
                : "Students appear here once their sign-up is approved."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {students.map((s) => {
            const section = s.enrollments[0]?.section.name;
            return (
              <li key={s.id}>
                <Link
                  href={`/dashboard/students/${s.id}/schedule`}
                  className="block rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                  <Card className="transition-colors hover:border-brand-300">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {s.lastName}, {s.firstName}
                        </p>
                        <p className="data mt-0.5 text-xs text-content-faint">
                          {s.studentNumber}
                          {section ? ` · ${section}` : " · not enrolled"}
                        </p>
                      </div>
                      <Badge variant={s.scheduleSource === "SECTION" ? "secondary" : "outline"}>
                        {s.scheduleSource === "SECTION" ? "Follows section" : "Own timetable"}
                      </Badge>
                      <ChevronRight className="size-4 shrink-0 text-content-faint" />
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
