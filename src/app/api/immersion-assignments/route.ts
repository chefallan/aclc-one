import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { immersionAssignmentSchema, paginationSchema } from "@/lib/validation";
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
      search: searchParams.get("search") || undefined,
    });

    const where: any = {};

    // Role-based filtering
    if (session.user.role === "STUDENT" && session.user.studentProfileId) {
      where.studentId = session.user.studentProfileId;
    } else if (session.user.role === "TEACHER") {
      where.teacherId = session.user.id;
    } else if (session.user.role === "SUPERVISOR" && session.user.supervisorRecordId) {
      where.supervisorId = session.user.supervisorRecordId;
    }

    if (parsed.search) {
      where.student = {
        OR: [
          { firstName: { contains: parsed.search, mode: "insensitive" } },
          { lastName: { contains: parsed.search, mode: "insensitive" } },
        ],
      };
    }

    const [assignments, total] = await Promise.all([
      prisma.immersionAssignment.findMany({
        where,
        skip: (parsed.page - 1) * parsed.limit,
        take: parsed.limit,
        orderBy: { createdAt: "desc" },
        include: {
          student: true,
          enrollment: { include: { program: true, section: true } },
          immersionProgram: true,
          workplace: true,
          supervisor: { include: { user: { select: { firstName: true, lastName: true } } } },
          teacher: { select: { id: true, firstName: true, lastName: true } },
          coordinator: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.immersionAssignment.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      requestId,
      data: assignments,
      pagination: { page: parsed.page, limit: parsed.limit, total, pages: Math.ceil(total / parsed.limit) },
    });
  } catch (error) {
    console.error("List immersion assignments error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to list immersion assignments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role as any, "immersion:assign")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = immersionAssignmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const enrollment = await prisma.studentEnrollment.findUnique({
      where: { id: data.enrollmentId },
      include: { academicYear: true },
    });

    if (!enrollment) {
      return NextResponse.json(
        { success: false, requestId, error: "Invalid enrollment" },
        { status: 400 }
      );
    }

    const assignment = await prisma.immersionAssignment.create({
      data: {
        ...data,
        academicYearId: enrollment.academicYearId,
        status: "NOT_STARTED",
      },
    });

    return NextResponse.json({ success: true, requestId, data: assignment }, { status: 201 });
  } catch (error) {
    console.error("Create immersion assignment error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to create immersion assignment" }, { status: 500 });
  }
}
