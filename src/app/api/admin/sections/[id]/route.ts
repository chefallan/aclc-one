import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { generateRequestId } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

/**
 * Renaming, archiving and deleting a section.
 *
 * Deleting one is the sharp edge here. The schema cascades from Section to
 * both its timetable and its enrolments, so a delete on a section people are
 * in would silently take those students' enrolment with it. That is offered
 * only for an empty section; anything with students has to be archived, which
 * keeps the record and takes it out of the active lists.
 */
const patchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  yearLevel: z.coerce.number().int().min(1).max(10).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.role as never, "section:manage")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: parsed.error.issues[0]?.message ?? "Check the form." },
        { status: 400 }
      );
    }
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json(
        { success: false, requestId, error: "Nothing to change." },
        { status: 400 }
      );
    }

    const section = await prisma.section.findUnique({ where: { id }, select: { id: true } });
    if (!section) {
      return NextResponse.json({ success: false, requestId, error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.section.update({
      where: { id },
      data: parsed.data,
      select: { id: true, name: true, yearLevel: true, status: true },
    });

    await logAudit({
      action: "UPDATE",
      actorId: session.user.id,
      entity: "section",
      entityId: id,
      metadata: { ...parsed.data },
    });

    return NextResponse.json({ success: true, requestId, data: updated });
  } catch (error) {
    // The schema has a unique on (academicYearId, programId, name).
    if ((error as { code?: string })?.code === "P2002") {
      return NextResponse.json(
        { success: false, requestId, error: "Another section in this programme already has that name." },
        { status: 409 }
      );
    }
    console.error("Section update error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "Couldn't save that change. Try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.role as never, "section:manage")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const section = await prisma.section.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        _count: { select: { studentEnrollments: true, classSessions: true } },
      },
    });

    if (!section) {
      return NextResponse.json({ success: false, requestId, error: "Not found" }, { status: 404 });
    }

    // Deleting would cascade to these. Refuse and say what is in the way.
    const { studentEnrollments, classSessions } = section._count;
    if (studentEnrollments > 0 || classSessions > 0) {
      const parts = [];
      if (studentEnrollments > 0) {
        parts.push(`${studentEnrollments} enrolled ${studentEnrollments === 1 ? "student" : "students"}`);
      }
      if (classSessions > 0) {
        parts.push(`${classSessions} class ${classSessions === 1 ? "session" : "sessions"}`);
      }
      return NextResponse.json(
        {
          success: false,
          requestId,
          error: `${section.name} still has ${parts.join(" and ")}. Archive it instead, or move them first — deleting would take their records with it.`,
        },
        { status: 409 }
      );
    }

    // Only the timetable cascades now, which is the point of deleting it.
    await prisma.section.delete({ where: { id } });

    await logAudit({
      action: "DELETE",
      actorId: session.user.id,
      entity: "section",
      entityId: id,
      metadata: { name: section.name },
    });

    return NextResponse.json({ success: true, requestId, message: `${section.name} deleted.` });
  } catch (error) {
    console.error("Section delete error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "Couldn't delete that section. Try again." },
      { status: 500 }
    );
  }
}
