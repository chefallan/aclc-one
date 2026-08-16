import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { timeOutSchema } from "@/lib/validation";
import { hasPermission } from "@/lib/permissions";
import { generateRequestId } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.studentProfileId) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role as any, "time_out")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = timeOutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId, latitude, longitude, notes } = parsed.data;

    const workSession = await prisma.workSession.findFirst({
      where: {
        id: sessionId,
        studentId: session.user.studentProfileId,
        status: "ACTIVE",
      },
      include: { assignment: true },
    });

    if (!workSession) {
      return NextResponse.json({ success: false, requestId, error: "No active session found" }, { status: 404 });
    }

    const now = new Date();
    const durationMs = now.getTime() - workSession.timeIn.getTime();
    const durationMinutes = Math.floor(durationMs / 60000);

    // Get immersion rules
    const program = await prisma.immersionProgram.findUnique({
      where: { id: workSession.assignment.immersionProgramId },
    });

    const rules = (program?.rules as any) || {};
    const minSessionMinutes = rules.minSessionMinutes || 30;
    const breakMinutes = rules.breakMinutes || 60;
    const roundingMinutes = rules.roundingMinutes || 15;
    const maxDailyHours = rules.maxDailyHours || 8;

    if (durationMinutes < minSessionMinutes) {
      return NextResponse.json(
        { success: false, requestId, error: `Session must be at least ${minSessionMinutes} minutes` },
        { status: 400 }
      );
    }

    // Calculate effective hours with breaks and rounding
    let effectiveMinutes = durationMinutes;
    if (durationMinutes > breakMinutes) {
      effectiveMinutes -= breakMinutes;
    }
    // Round to nearest configured interval
    effectiveMinutes = Math.round(effectiveMinutes / roundingMinutes) * roundingMinutes;

    const effectiveHours = Math.min(effectiveMinutes / 60, maxDailyHours);

    const result = await prisma.$transaction(async (tx) => {
      // Update work session
      const updated = await tx.workSession.update({
        where: { id: sessionId },
        data: {
          timeOut: now,
          durationMinutes: effectiveMinutes,
          status: "COMPLETED",
          notes: notes ? `${workSession.notes || ""}\n${notes}`.trim() : workSession.notes,
        },
      });

      // Update assignment completed hours
      await tx.immersionAssignment.update({
        where: { id: workSession.assignmentId },
        data: {
          completedHours: { increment: effectiveHours },
        },
      });

      // Update attendance record
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      await tx.attendanceRecord.update({
        where: {
          studentId_date: {
            studentId: session.user.studentProfileId!,
            date: today,
          },
        },
        data: {
          timeOut: now,
          workedMinutes: effectiveMinutes,
          status: "PRESENT",
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      requestId,
      data: {
        sessionId: result.id,
        timeOut: result.timeOut,
        durationMinutes: result.durationMinutes,
        effectiveHours,
        message: "Clocked out successfully",
      },
    });
  } catch (error) {
    console.error("Time out error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to clock out" }, { status: 500 });
  }
}
