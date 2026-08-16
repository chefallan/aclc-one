import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scheduleEntrySchema } from "@/lib/validation";
import { findClashes, formatRange } from "@/lib/schedule";
import { generateRequestId } from "@/lib/utils";

/**
 * A person's own weekly timetable.
 *
 * Every query is scoped to the signed-in user — a timetable is nobody else's
 * business, and there is no administrator view of one.
 */
const SELECT = {
  id: true,
  subjectCode: true,
  subjectTitle: true,
  day: true,
  startTime: true,
  endTime: true,
  room: true,
  instructor: true,
} as const;

export async function GET() {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.scheduleEntry.findMany({
    where: { userId: session.user.id },
    select: SELECT,
    orderBy: [{ day: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json({ success: true, requestId, data: entries });
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = scheduleEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: parsed.error.issues[0]?.message ?? "Check the form." },
        { status: 400 }
      );
    }

    const entry = parsed.data;

    // Plotting two classes on top of each other is nearly always a mistake at
    // enrolment, so it is reported rather than silently accepted. It is still
    // allowed on a second attempt: timetables do genuinely clash sometimes,
    // and the person plotting knows their situation better than we do.
    const sameDay = await prisma.scheduleEntry.findMany({
      where: { userId: session.user.id, day: entry.day },
      select: { id: true, day: true, startTime: true, endTime: true, subjectCode: true },
    });

    const { clashes, hasClash } = findClashes(entry, sameDay);
    const allowClash = body?.allowClash === true;

    if (hasClash && !allowClash) {
      const first = clashes[0];
      return NextResponse.json(
        {
          success: false,
          requestId,
          error: `That overlaps ${first.subjectCode} (${formatRange(first.startTime, first.endTime)}). Add it anyway?`,
          clash: clashes.map((c) => ({
            subjectCode: c.subjectCode,
            startTime: c.startTime,
            endTime: c.endTime,
          })),
        },
        { status: 409 }
      );
    }

    const created = await prisma.scheduleEntry.create({
      data: {
        subjectCode: entry.subjectCode,
        subjectTitle: entry.subjectTitle || null,
        day: entry.day,
        startTime: entry.startTime,
        endTime: entry.endTime,
        room: entry.room || null,
        instructor: entry.instructor || null,
        userId: session.user.id,
      },
      select: SELECT,
    });

    return NextResponse.json({ success: true, requestId, data: created }, { status: 201 });
  } catch (error) {
    console.error("Schedule create error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "Couldn't save that class. Try again." },
      { status: 500 }
    );
  }
}

const deleteSchema = z.object({ id: z.string().cuid() });

export async function DELETE(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = deleteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: "Say which class to remove." },
        { status: 400 }
      );
    }

    // userId in the filter, so another person's id deletes nothing.
    const removed = await prisma.scheduleEntry.deleteMany({
      where: { id: parsed.data.id, userId: session.user.id },
    });

    if (removed.count === 0) {
      return NextResponse.json({ success: false, requestId, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, requestId });
  } catch (error) {
    console.error("Schedule delete error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "Couldn't remove that class. Try again." },
      { status: 500 }
    );
  }
}
