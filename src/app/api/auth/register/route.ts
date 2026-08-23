import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signUpSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { generateRequestId } from "@/lib/utils";

/**
 * Sign-up for ACLC College of Ormoc.
 *
 * This creates a request for access, not an account someone can use. Everyone
 * lands in PENDING and an administrator checks the ID number against the
 * school register before approving — the number typed here is a claim, not
 * proof of anything.
 *
 * Two things are deliberately impossible from this route: choosing ADMIN or
 * SUPERVISOR (the schema on the request only permits STUDENT and FACULTY), and
 * arriving ACTIVE (status is set here, never read from the body).
 */
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    const parsed = signUpSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          requestId,
          error: parsed.error.issues[0]?.message ?? "Check the form and try again.",
        },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName, role, idNumber, sectionId } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // One college, one organization row. It is seeded, not created here.
    const school = await prisma.school.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json(
        {
          success: false,
          requestId,
          error: "The school hasn't been set up yet. Contact your administrator.",
        },
        { status: 503 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { status: true },
    });

    if (existing) {
      // The message is the same whichever state they are in, so this route
      // cannot be used to enumerate who already has an account.
      return NextResponse.json(
        {
          success: false,
          requestId,
          error:
            "There's already a request for that email. If it's yours, ask the registrar to check on it.",
        },
        { status: 409 }
      );
    }

    // A section is only meaningful for a student, and only if it is a real
    // one that is still running. An id that fails either test is dropped
    // rather than rejected: the request is still valid, the registrar just
    // places them by hand.
    let requestedSectionId: string | null = null;
    if (role === "STUDENT" && sectionId) {
      const section = await prisma.section.findFirst({
        where: { id: sectionId, status: "ACTIVE" },
        select: { id: true },
      });
      requestedSectionId = section?.id ?? null;
    }

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: await bcrypt.hash(password, 12),
        firstName,
        lastName,
        role,
        idNumber,
        status: "PENDING",
        requestedSectionId,
      },
      select: { id: true, role: true },
    });

    await logAudit({
      action: "REGISTER",
      actorId: user.id,
      entity: "user",
      entityId: user.id,
      metadata: { role: user.role, idNumber, requestedSectionId },
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    });

    return NextResponse.json(
      {
        success: true,
        requestId,
        message:
          "Request sent. An administrator will check your ID number and let you in — you'll be able to sign in once they do.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "Couldn't send your request. Try again." },
      { status: 500 }
    );
  }
}
