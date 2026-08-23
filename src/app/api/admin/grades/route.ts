import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { idSchema } from "@/lib/validation";
import { generateRequestId } from "@/lib/utils";
import { getGradingRules, importSubjectsFromTimetable } from "@/lib/grade-sheet";
import { isValidScore, scoreRange } from "@/lib/grading";
import { logAudit } from "@/lib/audit";

/**
 * Recording grades.
 *
 * A whole column at a time - one period, one subject, a section's worth of
 * students - because that is how a grade sheet is filled in. Sending them one
 * at a time would make a half-saved sheet the normal case.
 *
 * Marks are checked against the school's scale before anything is written. On
 * the point scale 85 is not a low grade, it is not a grade at all, and storing
 * it would quietly corrupt every average it touches.
 */
const saveSchema = z.object({
  sectionId: idSchema,
  subjectId: idSchema,
  period: z.enum(["PRELIM", "MIDTERM", "SEMIFINAL", "FINAL"]),
  /** Null clears a mark; a blank cell is not a zero. */
  scores: z
    .array(z.object({ studentId: idSchema, score: z.number().nullable() }))
    .max(300),
  post: z.boolean().optional(),
});

export async function PUT(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }
  // The same people who take attendance for a class record its grades.
  if (!hasPermission(session.user.role as never, "attendance:view_class")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = saveSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: parsed.error.issues[0]?.message ?? "Check the form." },
        { status: 400 }
      );
    }

    const { sectionId, subjectId, period, scores, post } = parsed.data;
    const rules = await getGradingRules();

    const bad = scores.find((s) => s.score !== null && !isValidScore(s.score, rules.scale));
    if (bad) {
      const { min, max } = scoreRange(rules.scale);
      return NextResponse.json(
        {
          success: false,
          requestId,
          error: `${bad.score} is not a valid mark. This school grades on ${
            rules.scale === "POINT_SCALE" ? "the 1.00-5.00 point scale" : "a percentage"
          }, so marks run from ${min} to ${max}.`,
        },
        { status: 400 }
      );
    }

    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      select: { id: true, academicYearId: true },
    });
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true },
    });
    if (!section || !subject) {
      return NextResponse.json({ success: false, requestId, error: "Not found" }, { status: 404 });
    }

    // Only students actually enrolled in this section. Without this, a crafted
    // request could write a grade against anyone in the school.
    const enrolled = await prisma.studentEnrollment.findMany({
      where: { sectionId, enrollmentStatus: "ENROLLED" },
      select: { studentId: true },
    });
    const allowed = new Set(enrolled.map((e) => e.studentId));
    const writes = scores.filter((s) => allowed.has(s.studentId));

    await prisma.$transaction(
      writes.map((s) =>
        prisma.grade.upsert({
          where: {
            studentId_subjectId_academicYearId_period: {
              studentId: s.studentId,
              subjectId,
              academicYearId: section.academicYearId,
              period,
            },
          },
          create: {
            studentId: s.studentId,
            subjectId,
            academicYearId: section.academicYearId,
            sectionId,
            period,
            score: s.score,
            status: post ? "POSTED" : "DRAFT",
            recordedById: session.user.id,
          },
          update: {
            score: s.score,
            sectionId,
            ...(post ? { status: "POSTED" as const } : {}),
            recordedById: session.user.id,
          },
        })
      )
    );

    await logAudit({
      action: "UPDATE",
      actorId: session.user.id,
      entity: "grade",
      entityId: `${sectionId}:${subjectId}:${period}`,
      metadata: { saved: writes.length, posted: Boolean(post) },
    });

    return NextResponse.json({
      success: true,
      requestId,
      message: post
        ? `${writes.length} ${writes.length === 1 ? "grade" : "grades"} posted. Students can see them now.`
        : `${writes.length} ${writes.length === 1 ? "grade" : "grades"} saved as a draft.`,
      data: { saved: writes.length, skipped: scores.length - writes.length },
    });
  } catch (error) {
    console.error("Grade save error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "Couldn't save those grades. Try again." },
      { status: 500 }
    );
  }
}

/** Promotes a section's timetable subject codes into real Subject records. */
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.role as never, "section:manage")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const { sectionId } = z.object({ sectionId: idSchema }).parse(await req.json());
    const created = await importSubjectsFromTimetable(sectionId);
    return NextResponse.json({
      success: true,
      requestId,
      message:
        created === 0
          ? "Every subject on this timetable already exists."
          : `Created ${created} ${created === 1 ? "subject" : "subjects"} from the timetable.`,
      data: { created },
    });
  } catch (error) {
    console.error("Subject import error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "Couldn't import those subjects." },
      { status: 500 }
    );
  }
}
