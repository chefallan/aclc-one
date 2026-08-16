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
  if (!hasPermission(session.user.role as never, "study_buddy:view_own_history")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  // userId and organizationId together: someone else's conversation id reads
  // as not found rather than forbidden, which leaks nothing about whether it
  // exists.
  const conversation = await prisma.conversation.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, citations: true, createdAt: true },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json({ success: false, requestId, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, requestId, data: conversation });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  // deleteMany with the full scope in the filter: a mismatched owner deletes
  // zero rows instead of erroring on someone else's record.
  const deleted = await prisma.conversation.deleteMany({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ success: false, requestId, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, requestId });
}
