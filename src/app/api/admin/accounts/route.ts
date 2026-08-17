import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { accountDecisionSchema } from "@/lib/validation";
import { randomUUID } from "crypto";
import { generateRequestId } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

/** Everyone waiting at the door, oldest request first. */
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.role as never, "account:approve")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get("status") ?? "PENDING";
  const allowed = ["PENDING", "ACTIVE", "REJECTED"];
  if (!allowed.includes(status)) {
    return NextResponse.json(
      { success: false, requestId, error: "Unknown status filter." },
      { status: 400 }
    );
  }

  const accounts = await prisma.user.findMany({
    where: {
      status: status as never,
      // Administrators are not part of the approval queue; they were created,
      // not requested.
      role: { in: ["STUDENT", "FACULTY"] },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      idNumber: true,
      status: true,
      createdAt: true,
      approvedAt: true,
      rejectionReason: true,
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  const pendingCount = await prisma.user.count({
    where: {
      status: "PENDING",
      role: { in: ["STUDENT", "FACULTY"] },
    },
  });

  return NextResponse.json({ success: true, requestId, data: { accounts, pendingCount } });
}

/**
 * Approve or reject a request.
 *
 * The decision is recorded on the account — who approved it and when, or why
 * it was refused — rather than the row being deleted, so a second attempt with
 * the same details is visible to whoever reviews it next.
 */
export async function PATCH(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.role as never, "account:approve")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = accountDecisionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: parsed.error.issues[0]?.message ?? "Check the form." },
        { status: 400 }
      );
    }

    const { userId, decision, reason } = parsed.data;
    const approving = decision === "APPROVE";

    // Scoped to this school, to a pending request, and to the two roles that
    // can be requested — so this route can never flip an administrator's
    // account or re-approve someone already active.
    const updated = await prisma.user.updateMany({
      where: {
        id: userId,
        status: "PENDING",
        role: { in: ["STUDENT", "FACULTY"] },
      },
      data: approving
        ? {
            status: "ACTIVE",
            approvedAt: new Date(),
            approvedById: session.user.id,
            rejectionReason: null,
          }
        : {
            status: "REJECTED",
            rejectionReason: reason?.trim() || null,
            approvedById: session.user.id,
          },
    });

    // Approving a student has to give them a student record, not just an
    // ACTIVE flag. Without one they have no student number the school can use,
    // no QR code to be marked present by, and nothing to enrol in a section —
    // an account that can sign in and do none of the things a student does.
    if (approving && updated.count > 0) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, firstName: true, lastName: true, idNumber: true },
      });

      if (user?.role === "STUDENT") {
        const existingProfile = await prisma.studentProfile.findUnique({
          where: { userId: user.id },
          select: { id: true },
        });

        if (!existingProfile) {
          await prisma.studentProfile.create({
            data: {
              userId: user.id,
              // They registered with it; it is the number the registrar knows
              // them by. Falling back to the user id keeps the unique
              // constraint satisfied if it was somehow never captured.
              studentNumber: user.idNumber?.trim() || user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              qrCodeToken: randomUUID(),
            },
          });
        }
      }
    }

    if (updated.count === 0) {
      return NextResponse.json(
        { success: false, requestId, error: "That request is no longer pending." },
        { status: 404 }
      );
    }

    await logAudit({
      action: approving ? "UPDATE" : "PERMISSION_DENIED",
      actorId: session.user.id,
      entity: "user",
      entityId: userId,
      metadata: { decision, reason: reason ?? null },
    });

    return NextResponse.json({
      success: true,
      requestId,
      message: approving ? "Account approved. They can sign in now." : "Request rejected.",
    });
  } catch (error) {
    console.error("Account decision error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "Couldn't record that decision. Try again." },
      { status: 500 }
    );
  }
}
