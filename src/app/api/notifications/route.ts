import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateRequestId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        body: true,
        type: true,
        isRead: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, requestId, data: notifications });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, message, type = "info" } = await req.json();

    const notification = await prisma.notification.create({
      data: {
        userId: session.user.id,
        title,
        body: message,
        type: type as any,
        channel: "IN_APP",
        isRead: false,
      },
    });

    return NextResponse.json({ success: true, requestId, data: notification });
  } catch (error) {
    console.error("Create notification error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to create notification" }, { status: 500 });
  }
}
