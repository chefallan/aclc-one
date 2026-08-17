import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { generateRequestId } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

/**
 * Putting a student in a section.
 *
 * This is the join everything else hangs off. Without it a student has no
 * block schedule to follow, no section for an instructor's class session to
 * match against, and nothing for a report to group them under - which is why
 * an approved student with no enrolment sees an empty app and no explanation.
 *
 * The academic year, programme and year level are read from the section
 * rather than accepted from the caller. They are facts about the section;
 * taking them from the request would let the three disagree.
 */
const schema = z.object({
  studentId: z.string().cuid(),
  sectionId: z.string().cuid(),
});

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.role as never, "student:manage")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: "Pick a student and a section." },
        { status: 400 }
      );
    }

    const { studentId, sectionId } = parsed.data;

    const [student, section] = await Promise.all([
      prisma.studentProfile.findUnique({ where: { id: studentId }, select: { id: true } }),
      prisma.section.findUnique({
        where: { id: sectionId },
        select: { id: true, name: true, yearLevel: true, academicYearId: true, programId: true },
      }),
    ]);

    if (!student) {
      return NextResponse.json({ success: false, requestId, error: "No such student." }, { status: 404 });
    }
    if (!section) {
      return NextResponse.json({ success: false, requestId, error: "No such section." }, { status: 404 });
    }

    // One enrolment per student per year, so moving someone between sections
    // is an update rather than a second row that quietly wins or loses.
    const enrollment = await prisma.studentEnrollment.upsert({
      where: {
        studentId_academicYearId: {
          studentId,
          academicYearId: section.academicYearId,
        },
      },
      create: {
        studentId,
        sectionId: section.id,
        academicYearId: section.academicYearId,
        programId: section.programId,
        yearLevel: section.yearLevel,
        enrollmentStatus: "ENROLLED",
      },
      update: {
        sectionId: section.id,
        programId: section.programId,
        yearLevel: section.yearLevel,
        enrollmentStatus: "ENROLLED",
      },
      select: { id: true },
    });

    await logAudit({
      action: "UPDATE",
      actorId: session.user.id,
      entity: "student_enrollment",
      entityId: enrollment.id,
      metadata: { studentId, sectionId },
    });

    return NextResponse.json({
      success: true,
      requestId,
      message: `Enrolled in ${section.name}.`,
      data: { enrollmentId: enrollment.id },
    });
  } catch (error) {
    console.error("Enrollment error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "Couldn't enrol that student. Try again." },
      { status: 500 }
    );
  }
}
