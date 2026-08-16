import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { generateRequestId } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createSessionSchema = z.object({
  sectionId: z.string().cuid(),
  date: z.coerce.date(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  room: z.string().optional(),
  subject: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const sectionId = searchParams.get("sectionId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};

    if (date) {
      where.date = new Date(date);
    }
    if (sectionId) {
      where.sectionId = sectionId;
    }
    if (status) {
      where.status = status;
    }

    // Teachers only see their own sessions
    if (session.user.role === "TEACHER") {
      where.teacherId = session.user.id;
    }

    const classSessions = await prisma.classSession.findMany({
      where,
      orderBy: { startTime: "desc" },
      include: {
        section: { include: { program: true, academicYear: true } },
        teacher: { select: { firstName: true, lastName: true } },
        attendances: {
          include: {
            student: { select: { firstName: true, lastName: true, studentNumber: true } },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      requestId,
      data: classSessions,
    });
  } catch (error) {
    console.error("List class sessions error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to list class sessions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role as never, "class_session:create")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = createSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sectionId, date, startTime, endTime, room, subject } = parsed.data;

    // Verify section belongs to this org
    const section = await prisma.section.findFirst({
      where: { id: sectionId },
    });

    if (!section) {
      return NextResponse.json({ success: false, requestId, error: "Invalid section" }, { status: 400 });
    }

    const classSession = await prisma.classSession.create({
      data: {
        date,
        startTime,
        endTime,
        room,
        subject,
        status: "SCHEDULED",
        sectionId,
        teacherId: session.user.id,
      },
      include: {
        section: { include: { program: true } },
        teacher: { select: { firstName: true, lastName: true } },
      },
    });

    await logAudit({
      action: "CREATE",
      actorId: session.user.id,
      entity: "class_session",
      entityId: classSession.id,
      metadata: { sectionId, subject },
    });

    return NextResponse.json(
      { success: true, requestId, data: classSession },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create class session error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to create class session" }, { status: 500 });
  }
}
