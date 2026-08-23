import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { buildGradeSheet } from "@/lib/grade-sheet";
import { GradeSheetEditor } from "@/components/sheets/grade-sheet-editor";
import { SectionPicker } from "@/components/sheets/section-picker";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Grade sheet" };

export default async function GradesPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; subject?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");
  if (!hasPermission(session.user.role as never, "attendance:view_class")) redirect("/dashboard");

  const params = await searchParams;

  const sections = await prisma.section.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, program: { select: { code: true } } },
    orderBy: [{ yearLevel: "asc" }, { name: "asc" }],
  });

  const sectionId = params.section || sections[0]?.id;
  const sheet = sectionId ? await buildGradeSheet(sectionId, params.subject) : null;

  return (
    <div className="space-y-4">
      <div data-print="hide">
        <header>
          <p className="eyebrow">Records</p>
          <h1 className="mt-1 text-2xl font-semibold">Grade sheet</h1>
          <p className="mt-1 text-sm text-content-muted">
            Enter marks by period, print the sheet, and post when they are ready for students.
          </p>
        </header>
        <div className="mt-4">
          <SectionPicker
            sections={sections.map((s) => ({ id: s.id, name: s.name, programCode: s.program.code }))}
            sectionId={sectionId ?? ""}
            showImport={hasPermission(session.user.role as never, "section:manage")}
          />
        </div>
      </div>

      {!sheet || !sheet.section ? (
        <Card data-print="hide">
          <CardContent className="p-10 text-center text-sm text-content-muted">
            {sections.length === 0
              ? "No sections yet. Create one under Sections first."
              : "Pick a section."}
          </CardContent>
        </Card>
      ) : (
        <GradeSheetEditor sheet={sheet} schoolName="ACLC College of Ormoc" />
      )}
    </div>
  );
}
