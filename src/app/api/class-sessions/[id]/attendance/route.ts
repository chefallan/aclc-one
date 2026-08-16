import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { generateRequestId } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role as never, "attendance:view_class")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const classSession = await prisma.classSession.findFirst({
      where: {
        id,
      },
      include: {
        section: { include: { program: true } },
        teacher: { select: { firstName: true, lastName: true } },
        attendances: {
          orderBy: { scannedAt: "desc" },
          include: {
            student: {
              select: {
                firstName: true,
                lastName: true,
                studentNumber: true,
                profilePhoto: true,
              },
            },
          },
        },
      },
    });

    if (!classSession) {
      return NextResponse.json({ success: false, requestId, error: "Class session not found" }, { status: 404 });
    }

    // Get total enrolled students in section for comparison
    const enrolledCount = await prisma.studentEnrollment.count({
      where: {
        sectionId: classSession.sectionId,
        enrollmentStatus: "ENROLLED",
      },
    });

    const presentCount = classSession.attendances.filter((a) => a.status === "PRESENT").length;
    const lateCount = classSession.attendances.filter((a) => a.status === "LATE").length;
    const absentCount = enrolledCount - presentCount - lateCount;

    return NextResponse.json({
      success: true,
      requestId,
      data: {
        classSession,
        stats: {
          enrolled: enrolledCount,
          present: presentCount,
          late: lateCount,
          absent: absentCount > 0 ? absentCount : 0,
          attendanceRate: enrolledCount > 0 ? Math.round(((presentCount + lateCount) / enrolledCount) * 100) : 0,
        },
      },
    });
  } catch (error) {
    console.error("Get attendance error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to get attendance" }, { status: 500 });
  }
}
