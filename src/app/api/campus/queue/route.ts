import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { isErrandKey } from "@/lib/campus/errands";
import { generateRequestId } from "@/lib/utils";

const joinSchema = z.object({
  officeId: z.string().cuid(),
  errand: z.string().refine(isErrandKey, "Pick an errand from the list."),
});

/** Join a queue so the wait shown to everyone else stays honest. */
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.studentProfileId) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.role as never, "campus:join_queue")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }
  const studentId = session.user.studentProfileId;

  try {
    const parsed = joinSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: parsed.error.issues[0]?.message ?? "Check the form." },
        { status: 400 }
      );
    }

    // The office id comes from the client, so confirm it is this school's.
    const office = await prisma.office.findFirst({
      where: { id: parsed.data.officeId },
      select: { id: true },
    });
    if (!office) {
      return NextResponse.json(
        { success: false, requestId, error: "That office isn't on this campus." },
        { status: 404 }
      );
    }

    const alreadyWaiting = await prisma.queueEntry.findFirst({
      where: { officeId: office.id, studentId, status: "WAITING" },
      select: { id: true },
    });
    if (alreadyWaiting) {
      return NextResponse.json(
        { success: false, requestId, error: "You're already in this queue." },
        { status: 409 }
      );
    }

    const entry = await prisma.queueEntry.create({
      data: { officeId: office.id, studentId, errand: parsed.data.errand },
      select: { id: true, joinedAt: true, errand: true },
    });

    const ahead = await prisma.queueEntry.count({
      where: { officeId: office.id, status: "WAITING", joinedAt: { lt: entry.joinedAt } },
    });

    return NextResponse.json(
      { success: true, requestId, data: { ...entry, ahead } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Queue join error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "Couldn't join that queue. Try again." },
      { status: 500 }
    );
  }
}

/** Leave the queue, or — for the staff member at that desk — mark one served. */
export async function PATCH(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { entryId, action } = (await req.json()) as { entryId?: string; action?: string };
    if (!entryId || (action !== "SERVED" && action !== "CANCELLED")) {
      return NextResponse.json(
        { success: false, requestId, error: "Say which entry and what happened to it." },
        { status: 400 }
      );
    }

    // A student may only withdraw their own entry. Marking someone served is
    // the desk's call, so it requires a staff row at that same office.
    const scope =
      action === "CANCELLED" && session.user.studentProfileId
        ? { id: entryId, studentId: session.user.studentProfileId }
        : {
            id: entryId,
            office: { staff: { some: { userId: session.user.id } } },
          };

    const updated = await prisma.queueEntry.updateMany({
      where: scope,
      data: {
        status: action,
        ...(action === "SERVED" ? { servedAt: new Date() } : {}),
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ success: false, requestId, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, requestId });
  } catch (error) {
    console.error("Queue update error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "Couldn't update the queue. Try again." },
      { status: 500 }
    );
  }
}
