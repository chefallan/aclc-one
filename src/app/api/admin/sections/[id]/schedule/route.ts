import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { scheduleEntrySchema, idSchema } from "@/lib/validation";
import { findClashes, formatRange } from "@/lib/schedule";
import { generateRequestId } from "@/lib/utils";

/**
 * A section's official timetable — the one the registrar maintains and every
 * student in the block reads.
 *
 * This is the counterpart to /api/schedule, which is a single person's own.
 * The difference matters: editing here changes what a whole section sees, so
 * it is gated on schedule:manage_section rather than on ownership.
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role as never, "schedule:view_any")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  const section = await prisma.section.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      yearLevel: true,
      program: { select: { code: true, name: true } },
      academicYear: { select: { name: true } },
      scheduleEntries: { select: SELECT, orderBy: [{ day: "asc" }, { startTime: "asc" }] },
      _count: { select: { studentEnrollments: true } },
    },
  });

  if (!section) {
    return NextResponse.json({ success: false, requestId, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, requestId, data: section });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role as never, "schedule:manage_section")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
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

    const section = await prisma.section.findUnique({ where: { id }, select: { id: true } });
    if (!section) {
      return NextResponse.json({ success: false, requestId, error: "Not found" }, { status: 404 });
    }

    const entry = parsed.data;

    // A block schedule that double-books its own section is always a mistake —
    // the same students cannot be in two rooms — so this warns before saving.
    // It is still overridable, because a split class genuinely happens.
    const sameDay = await prisma.sectionScheduleEntry.findMany({
      where: { sectionId: id, day: entry.day },
      select: { id: true, day: true, startTime: true, endTime: true, subjectCode: true },
    });

    const { clashes, hasClash } = findClashes(entry, sameDay);

    if (hasClash && body?.allowClash !== true) {
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

    const created = await prisma.sectionScheduleEntry.create({
      data: {
        sectionId: id,
        subjectCode: entry.subjectCode,
        subjectTitle: entry.subjectTitle || null,
        day: entry.day,
        startTime: entry.startTime,
        endTime: entry.endTime,
        room: entry.room || null,
        instructor: entry.instructor || null,
      },
      select: SELECT,
    });

    return NextResponse.json({ success: true, requestId, data: created }, { status: 201 });
  } catch (error) {
    console.error("Section schedule create error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "Couldn't save that class. Try again." },
      { status: 500 }
    );
  }
}

const deleteSchema = z.object({ entryId: idSchema });

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

  if (!hasPermission(session.user.role as never, "schedule:manage_section")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = deleteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: "Say which class to remove." },
        { status: 400 }
      );
    }

    // sectionId in the filter, so an entry id from another section removes
    // nothing even if someone guesses one.
    const removed = await prisma.sectionScheduleEntry.deleteMany({
      where: { id: parsed.data.entryId, sectionId: id },
    });

    if (removed.count === 0) {
      return NextResponse.json({ success: false, requestId, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, requestId });
  } catch (error) {
    console.error("Section schedule delete error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "Couldn't remove that class. Try again." },
      { status: 500 }
    );
  }
}

const updateSchema = scheduleEntrySchema.and(
  z.object({ entryId: idSchema, allowClash: z.boolean().optional() })
);

/**
 * Change one class in the block.
 *
 * A timetable is corrected far more often than it is built - a room moves, an
 * instructor changes - and without this the only way to fix a typo was to
 * delete the entry and retype it.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.role as never, "schedule:manage_section")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: parsed.error.issues[0]?.message ?? "Check the form." },
        { status: 400 }
      );
    }

    const { entryId, ...entry } = parsed.data;

    const existing = await prisma.sectionScheduleEntry.findFirst({
      where: { id: entryId, sectionId: id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, requestId, error: "Not found" }, { status: 404 });
    }

    // The entry being edited is excluded, or moving a class by ten minutes
    // would report it as clashing with itself.
    const sameDay = await prisma.sectionScheduleEntry.findMany({
      where: { sectionId: id, day: entry.day, NOT: { id: entryId } },
      select: { id: true, day: true, startTime: true, endTime: true, subjectCode: true },
    });

    const { clashes, hasClash } = findClashes(entry, sameDay);

    if (hasClash && body?.allowClash !== true) {
      const first = clashes[0];
      return NextResponse.json(
        {
          success: false,
          requestId,
          error: `That overlaps ${first.subjectCode} (${formatRange(first.startTime, first.endTime)}). Save it anyway?`,
        },
        { status: 409 }
      );
    }

    const updated = await prisma.sectionScheduleEntry.update({
      where: { id: entryId },
      data: {
        subjectCode: entry.subjectCode,
        subjectTitle: entry.subjectTitle || null,
        day: entry.day,
        startTime: entry.startTime,
        endTime: entry.endTime,
        room: entry.room || null,
        instructor: entry.instructor || null,
      },
      select: SELECT,
    });

    return NextResponse.json({ success: true, requestId, data: updated });
  } catch (error) {
    console.error("Section schedule update error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "Couldn't save that change. Try again." },
      { status: 500 }
    );
  }
}
