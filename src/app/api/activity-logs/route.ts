import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activityLogSchema, paginationSchema } from "@/lib/validation";
import { hasPermission } from "@/lib/permissions";
import { generateRequestId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const parsed = paginationSchema.parse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
    });

    const where: any = {};

    if (session.user.role === "STUDENT" && session.user.studentProfileId) {
      where.studentId = session.user.studentProfileId;
    } else if (session.user.role === "TEACHER") {
      where.assignment = { teacherId: session.user.id };
    } else if (session.user.role === "SUPERVISOR" && session.user.supervisorRecordId) {
      where.assignment = { supervisorId: session.user.supervisorRecordId };
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip: (parsed.page - 1) * parsed.limit,
        take: parsed.limit,
        orderBy: { timestamp: "desc" },
        include: {
          student: true,
          assignment: { include: { workplace: true, immersionProgram: true } },
          workSession: true,
          photos: true,
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      requestId,
      data: logs,
      pagination: { page: parsed.page, limit: parsed.limit, total, pages: Math.ceil(total / parsed.limit) },
    });
  } catch (error) {
    console.error("List activity logs error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to list activity logs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.studentProfileId) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role as any, "log:create")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = activityLogSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { assignmentId, workSessionId, taskDescription, learningDescription, taskCategory, timestamp } = parsed.data;

    // Verify session belongs to student
    const ws = await prisma.workSession.findFirst({
      where: {
        id: workSessionId,
        studentId: session.user.studentProfileId,
      },
    });

    if (!ws) {
      return NextResponse.json({ success: false, requestId, error: "Invalid work session" }, { status: 400 });
    }

    const log = await prisma.activityLog.create({
      data: {
        assignmentId,
        workSessionId,
        studentId: session.user.studentProfileId,
        taskDescription,
        learningDescription,
        taskCategory,
        timestamp,
        status: "SUBMITTED",
      },
    });

    return NextResponse.json({ success: true, requestId, data: log }, { status: 201 });
  } catch (error) {
    console.error("Create activity log error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to create activity log" }, { status: 500 });
  }
}
