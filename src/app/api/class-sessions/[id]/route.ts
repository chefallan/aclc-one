import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  try {
    const classSession = await prisma.classSession.findFirst({
      where: {
        id,
      },
      include: {
        section: { select: { name: true, program: { select: { name: true } } } },
        attendances: {
          include: {
            student: { select: { firstName: true, lastName: true, studentNumber: true } },
          },
        },
      },
    });

    if (!classSession) {
      return NextResponse.json({ success: false, requestId, error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, requestId, data: classSession });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to fetch session" }, { status: 500 });
  }
}
