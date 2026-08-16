import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { derivePresence } from "@/lib/campus/presence";
import { generateRequestId } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

const presenceSchema = z.object({
  status: z.enum(["AT_DESK", "STEPPED_OUT", "LUNCH", "IN_MEETING", "IN_CLASS", "OFF_CAMPUS"]),
  /** "Lunch till 1:00" — an absence needs a return time to be useful. */
  until: z.coerce.date().optional().nullable(),
  note: z.string().trim().max(120).optional().nullable(),
});

const visibilitySchema = z.object({
  visibility: z.enum(["VISIBLE", "HIDDEN"]),
});

/** A staff member's own desk: their state, their queue, their switch. */
export async function GET() {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  const entry = await prisma.staffDirectoryEntry.findFirst({
    where: { userId: session.user.id },
    select: {
      id: true,
      position: true,
      visibility: true,
      presenceStatus: true,
      presenceUntil: true,
      presenceNote: true,
      presenceUpdatedAt: true,
      avgServiceMinutes: true,
      office: {
        select: {
          id: true,
          name: true,
          room: true,
          floor: { select: { label: true, name: true } },
        },
      },
    },
  });

  if (!entry) {
    return NextResponse.json(
      { success: false, requestId, error: "You don't have a desk in the campus directory yet." },
      { status: 404 }
    );
  }

  const [waiting, servedToday] = await Promise.all([
    entry.office
      ? prisma.queueEntry.findMany({
          where: { officeId: entry.office.id, status: "WAITING" },
          orderBy: { joinedAt: "asc" },
          select: {
            id: true,
            errand: true,
            joinedAt: true,
            student: { select: { firstName: true, lastName: true, studentNumber: true } },
          },
          take: 25,
        })
      : Promise.resolve([]),
    entry.office
      ? prisma.queueEntry.count({
          where: {
            officeId: entry.office.id,
            status: "SERVED",
            servedAt: { gte: startOfToday() },
          },
        })
      : Promise.resolve(0),
  ]);

  return NextResponse.json({
    success: true,
    requestId,
    data: {
      ...entry,
      derived: derivePresence(entry),
      waiting,
      servedToday,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.role as never, "campus:set_presence")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    // Two shapes on one route: a status change, or the visibility switch.
    // Both are scoped to the caller's own row — there is no way to address
    // another person's presence from here.
    const asVisibility = visibilitySchema.safeParse(body);
    const data = asVisibility.success
      ? { visibility: asVisibility.data.visibility, presenceUpdatedAt: new Date() }
      : null;

    let payload = data;
    if (!payload) {
      const parsed = presenceSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, requestId, error: parsed.error.issues[0]?.message ?? "Check the form." },
          { status: 400 }
        );
      }
      payload = {
        presenceStatus: parsed.data.status,
        presenceUntil: parsed.data.until ?? null,
        presenceNote: parsed.data.note ?? null,
        presenceUpdatedAt: new Date(),
      } as never;
    }

    const updated = await prisma.staffDirectoryEntry.updateMany({
      where: { userId: session.user.id },
      data: payload,
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { success: false, requestId, error: "You don't have a desk in the campus directory yet." },
        { status: 404 }
      );
    }

    await logAudit({
      action: "UPDATE",
      actorId: session.user.id,
      entity: "staff_presence",
      entityId: session.user.id,
      metadata: asVisibility.success
        ? { visibility: asVisibility.data.visibility }
        : { status: (payload as { presenceStatus?: string }).presenceStatus },
    });

    return NextResponse.json({ success: true, requestId });
  } catch (error) {
    console.error("Presence update error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "Couldn't update your status. Try again." },
      { status: 500 }
    );
  }
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
