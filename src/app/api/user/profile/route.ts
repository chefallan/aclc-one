import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateRequestId } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, "Use at least 8 characters"),
  })
  .strict();

export async function PUT(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = profileSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: parsed.error.issues[0]?.message ?? "Check the form." },
        { status: 400 }
      );
    }

    // Scoped to the caller's own id — there is no way to address another user
    // from this route.
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone || null,
      },
      select: { id: true, firstName: true, lastName: true, phone: true, email: true },
    });

    await logAudit({
        action: "UPDATE",
        actorId: session.user.id,
        entity: "user",
        entityId: session.user.id,
        metadata: { fields: ["firstName", "lastName", "phone"] },
      });

    return NextResponse.json({ success: true, requestId, data: user });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "Couldn't save your profile. Try again." },
      { status: 500 }
    );
  }
}

/** Password change for a signed-in user. Distinct from the reset-by-email flow. */
export async function PATCH(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = passwordSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: parsed.error.issues[0]?.message ?? "Check the form." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      return NextResponse.json(
        { success: false, requestId, error: "This account signs in another way." },
        { status: 400 }
      );
    }

    const matches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!matches) {
      return NextResponse.json(
        { success: false, requestId, error: "That current password isn't right." },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        passwordHash: await bcrypt.hash(parsed.data.newPassword, 12),
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    await logAudit({
      action: "UPDATE",
      actorId: session.user.id,
      entity: "user",
      entityId: session.user.id,
      metadata: { fields: ["password"] },
    });

    return NextResponse.json({ success: true, requestId, message: "Password changed." });
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "Couldn't change your password. Try again." },
      { status: 500 }
    );
  }
}
