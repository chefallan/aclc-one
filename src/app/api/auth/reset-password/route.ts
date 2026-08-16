import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { passwordResetSchema } from "@/lib/validation";
import { emailService } from "@/lib/email";
import { generateRequestId } from "@/lib/utils";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await req.json();
    const parsed = passwordResetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: "Invalid email address" },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json(
        { success: true, requestId, message: "If an account exists, a reset email has been sent" },
        { status: 200 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Build reset URL
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/auth/reset-password?token=${resetToken}`;

    // Send email (non-blocking)
    emailService.sendPasswordReset(user.email, resetToken, resetUrl).catch(() => {
      // Email failure should not break the flow
    });

    return NextResponse.json(
      { success: true, requestId, message: "If an account exists, a reset email has been sent" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "Failed to process request" },
      { status: 500 }
    );
  }
}
