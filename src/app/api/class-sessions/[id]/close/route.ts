import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { generateRequestId } from "@/lib/utils";
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

  if (!hasPermission(session.user.role as never, "class_session:manage")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const classSession = await prisma.classSession.findFirst({
      where: {
        id,
        teacherId: session.user.id,
      },
    });

    if (!classSession) {
      return NextResponse.json({ success: false, requestId, error: "Class session not found" }, { status: 404 });
    }

    if (classSession.status === "CLOSED") {
      return NextResponse.json({ success: false, requestId, error: "Class session already closed" }, { status: 400 });
    }

    const updated = await prisma.classSession.update({
      where: { id },
      data: { status: "CLOSED" },
    });

    await logAudit({
      action: "UPDATE",
      actorId: session.user.id,
      entity: "class_session",
      entityId: id,
      metadata: { action: "closed" },
    });

    return NextResponse.json({
      success: true,
      requestId,
      data: updated,
      message: "Class session closed successfully",
    });
  } catch (error) {
    console.error("Close session error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to close class session" }, { status: 500 });
  }
}
