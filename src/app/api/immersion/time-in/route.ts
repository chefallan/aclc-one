import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { timeInSchema } from "@/lib/validation";
import { hasPermission } from "@/lib/permissions";
import { generateRequestId } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.studentProfileId) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role as any, "time_in")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = timeInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { assignmentId, latitude, longitude, locationAccuracy, notes } = parsed.data;

    // Verify assignment belongs to this student and org
    const assignment = await prisma.immersionAssignment.findFirst({
      where: {
        id: assignmentId,
        studentId: session.user.studentProfileId,
        status: { in: ["NOT_STARTED", "ACTIVE"] },
      },
    });

    if (!assignment) {
      return NextResponse.json({ success: false, requestId, error: "Invalid or inactive immersion assignment" }, { status: 400 });
    }

    // Check for existing active session
    const activeSession = await prisma.workSession.findFirst({
      where: {
        studentId: session.user.studentProfileId,
        assignmentId,
        status: "ACTIVE",
      },
    });

    if (activeSession) {
      return NextResponse.json({ success: false, requestId, error: "Already clocked in" }, { status: 409 });
    }

    const now = new Date();

    const session_record = await prisma.$transaction(async (tx) => {
      // Create work session
      const ws = await tx.workSession.create({
        data: {
          timeIn: now,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          latitude: latitude ? BigInt(Math.round(latitude * 100000000)).toString() as unknown as any : undefined,
          longitude: longitude ? BigInt(Math.round(longitude * 100000000)).toString() as unknown as any : undefined,
          locationAccuracy: locationAccuracy ? BigInt(Math.round(locationAccuracy * 100)).toString() as unknown as any : undefined,
          notes,
          studentId: session.user.studentProfileId!,
          assignmentId,
        },
      });

      // Update assignment status if NOT_STARTED
      if (assignment.status === "NOT_STARTED") {
        await tx.immersionAssignment.update({
          where: { id: assignmentId },
          data: { status: "ACTIVE" },
        });
      }

      // Create or update attendance record
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      await tx.attendanceRecord.upsert({
        where: {
          studentId_date: {
            studentId: session.user.studentProfileId!,
            date: today,
          },
        },
        create: {
          date: today,
          timeIn: now,
          status: "PRESENT",
          studentId: session.user.studentProfileId!,
          assignmentId,
          academicYearId: assignment.academicYearId,
          workSessionId: ws.id,
        },
        update: {
          timeIn: now,
          status: "PRESENT",
          workSessionId: ws.id,
        },
      });

      return ws;
    });

    return NextResponse.json({
      success: true,
      requestId,
      data: {
        sessionId: session_record.id,
        timeIn: session_record.timeIn,
        message: "Clocked in successfully",
      },
    });
  } catch (error) {
    console.error("Time in error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to clock in" }, { status: 500 });
  }
}
