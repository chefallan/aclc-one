import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adoptSectionSchedule } from "@/lib/schedule-resolver";
import { generateRequestId } from "@/lib/utils";

/**
 * Which timetable a student reads: their section's, or one of their own.
 *
 * Switching away from the section is the interesting direction. It can start
 * from a copy of the block schedule, because "my section's, minus one elective"
 * is the common case and retyping eleven slots to change one is not a feature.
 */
const schema = z.object({
  source: z.enum(["SECTION", "PERSONAL"]),
  /**
   * Only meaningful when moving to PERSONAL. Replaces whatever personal
   * entries exist with a copy of the section's.
   */
  copyFromSection: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: "Say which timetable to follow." },
        { status: 400 }
      );
    }

    const { source, copyFromSection } = parsed.data;

    const student = await prisma.studentProfile.findFirst({
      where: { userId: session.user.id },
      select: {
        id: true,
        enrollments: {
          where: { enrollmentStatus: "ENROLLED" },
          orderBy: { enrolledAt: "desc" },
          take: 1,
          select: { sectionId: true },
        },
      },
    });

    // Faculty and anyone else without a student record have only ever had one
    // timetable, so there is nothing to switch between.
    if (!student) {
      return NextResponse.json(
        { success: false, requestId, error: "Only students follow a section timetable." },
        { status: 400 }
      );
    }

    const sectionId = student.enrollments[0]?.sectionId ?? null;

    if (source === "SECTION" && !sectionId) {
      return NextResponse.json(
        {
          success: false,
          requestId,
          error: "You aren't enrolled in a section yet, so there's no block schedule to follow.",
        },
        { status: 409 }
      );
    }

    let copied = 0;
    if (source === "PERSONAL" && copyFromSection && sectionId) {
      copied = await adoptSectionSchedule(session.user.id, sectionId);
    }

    await prisma.studentProfile.update({
      where: { id: student.id },
      data: { scheduleSource: source },
    });

    return NextResponse.json({ success: true, requestId, data: { source, copied } });
  } catch (error) {
    console.error("Schedule source error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "Couldn't switch your timetable. Try again." },
      { status: 500 }
    );
  }
}
