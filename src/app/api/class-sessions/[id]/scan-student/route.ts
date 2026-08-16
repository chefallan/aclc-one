import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { generateRequestId } from "@/lib/utils";
import { getAttendanceRules, resolveAttendanceStatus } from "@/lib/attendance-rules";
import { logAudit } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role as never, "attendance:scan")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const { studentQrToken } = await req.json();

    if (!studentQrToken) {
      return NextResponse.json({ success: false, requestId, error: "Student QR token required" }, { status: 400 });
    }

    // Find the class session
    const classSession = await prisma.classSession.findFirst({
      where: {
        id,
        status: { in: ["SCHEDULED", "ACTIVE"] },
      },
    });

    if (!classSession) {
      return NextResponse.json(
        { success: false, requestId, error: "Class session not found or not active" },
        { status: 404 }
      );
    }

    // Find student by QR token
    const student = await prisma.studentProfile.findFirst({
      where: {
        qrCodeToken: studentQrToken,
      },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, requestId, error: "Invalid student QR code" },
        { status: 400 }
      );
    }

    // Check if student already has attendance for this session
    const existingAttendance = await prisma.classAttendance.findFirst({
      where: {
        classSessionId: id,
        studentId: student.id,
      },
    });

    if (existingAttendance) {
      return NextResponse.json(
        { success: false, requestId, error: "Attendance already recorded for this session" },
        { status: 409 }
      );
    }

    const now = new Date();
    const rules = await getAttendanceRules();
    const attendanceStatus = resolveAttendanceStatus(classSession.startTime, now, rules);

    // Record attendance
    const attendance = await prisma.classAttendance.create({
      data: {
        classSessionId: id,
        studentId: student.id,
        method: "QR",
        status: attendanceStatus,
      },
      include: {
        student: { select: { firstName: true, lastName: true, studentNumber: true } },
        classSession: { select: { subject: true, room: true } },
      },
    });

    // Update session status to ACTIVE if it was SCHEDULED
    if (classSession.status === "SCHEDULED") {
      await prisma.classSession.update({
        where: { id },
        data: { status: "ACTIVE" },
      });
    }

    await logAudit({
      action: "CREATE",
      actorId: session.user.id,
      entity: "class_attendance",
      entityId: attendance.id,
      metadata: { classSessionId: id, studentId: student.id, status: attendanceStatus },
    });

    return NextResponse.json({
      success: true,
      requestId,
      data: attendance,
      message: `${student.firstName} ${student.lastName} marked as ${attendanceStatus.toLowerCase()}`,
    });
  } catch (error) {
    console.error("Student scan error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to record attendance" }, { status: 500 });
  }
}
