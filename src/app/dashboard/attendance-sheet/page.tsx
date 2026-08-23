import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { buildAttendanceSheet } from "@/lib/attendance-sheet";
import { SheetControls } from "@/components/sheets/sheet-controls";
import { AttendanceSheetTable } from "@/components/sheets/attendance-sheet-table";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Attendance sheet" };

/** Default range: the current month, which is what a sheet is usually for. */
function defaultRange() {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
  };
}

function parseDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return fallback;
  return new Date(y, m - 1, d);
}

export default async function AttendanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; from?: string; to?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");
  // view_class, not view: a workplace supervisor holds attendance:view for
  // their own placements, and a section roster is not theirs to read.
  if (!hasPermission(session.user.role as never, "attendance:view_class")) redirect("/dashboard");

  const params = await searchParams;
  const range = defaultRange();
  const from = parseDate(params.from, range.from);
  const to = parseDate(params.to, range.to);

  const sections = await prisma.section.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, program: { select: { code: true } } },
    orderBy: [{ yearLevel: "asc" }, { name: "asc" }],
  });

  const sectionId = params.section || sections[0]?.id;
  const sheet = sectionId ? await buildAttendanceSheet(sectionId, from, to) : null;

  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      <div data-print="hide">
        <header>
          <p className="eyebrow">Records</p>
          <h1 className="mt-1 text-2xl font-semibold">Attendance sheet</h1>
          <p className="mt-1 text-sm text-content-muted">
            The roster against the sessions actually held. Print it for signing, or keep it on
            screen.
          </p>
        </header>

        <div className="mt-4">
          <SheetControls
            sections={sections.map((s) => ({ id: s.id, name: s.name, programCode: s.program.code }))}
            sectionId={sectionId ?? ""}
            from={iso(from)}
            to={iso(to)}
          />
        </div>
      </div>

      {!sheet || !sheet.section ? (
        <Card data-print="hide">
          <CardContent className="p-10 text-center text-sm text-content-muted">
            {sections.length === 0
              ? "No sections yet. Create one under Sections first."
              : "Pick a section to build a sheet."}
          </CardContent>
        </Card>
      ) : (
        <AttendanceSheetTable sheet={sheet} schoolName="ACLC College of Ormoc" />
      )}
    </div>
  );
}
