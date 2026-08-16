import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRequestId } from "@/lib/utils";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    const { token, password } = await req.json();

    if (!token || !password || password.length < 8) {
      return NextResponse.json(
        { success: false, requestId, error: "Invalid token or password too short" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, requestId, error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
        failedLoginAttempts: 0,
      },
    });

    return NextResponse.json(
      { success: true, requestId, message: "Password reset successful" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password reset confirm error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
