import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { generateRequestId } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

const borrowSchema = z.object({
  itemId: z.string().cuid(),
  dueDate: z.coerce.date().refine((d) => d.getTime() > Date.now(), {
    message: "The due date has to be in the future.",
  }),
});

export async function GET() {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  // What a person is reading is their own business. Only librarians and
  // administrators see the whole desk; everyone else sees their own loans.
  // This previously returned every borrower's name, student number, and title
  // to any signed-in account, students included.
  const canSeeEveryone = hasPermission(session.user.role as never, "library:manage");

  const records = await prisma.libraryBorrowRecord.findMany({
    where: {
      ...(canSeeEveryone
        ? {}
        : { studentId: session.user.studentProfileId ?? "__no_student_profile__" }),
    },
    include: {
      item: { select: { title: true, type: true, coverImage: true } },
      // Borrower identity is only meaningful on the librarian's view.
      ...(canSeeEveryone
        ? {
            student: {
              select: { firstName: true, lastName: true, studentNumber: true },
            },
          }
        : {}),
    },
    orderBy: { borrowedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ success: true, requestId, data: records });
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.studentProfileId) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.role as never, "library:borrow")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  const studentId = session.user.studentProfileId;

  try {
    const parsed = borrowSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: parsed.error.issues[0]?.message ?? "Check the form." },
        { status: 400 }
      );
    }

    const { itemId, dueDate } = parsed.data;

    // Read-then-write across two statements let two requests for the last copy
    // both succeed and drive availableCopies negative. The decrement is now
    // conditional and inside a transaction: whoever loses the race updates
    // zero rows and is told the copy has gone.
    const record = await prisma.$transaction(async (tx) => {
      const claimed = await tx.libraryItem.updateMany({
        where: { id: itemId, availableCopies: { gt: 0 } },
        data: { availableCopies: { decrement: 1 } },
      });

      if (claimed.count === 0) return null;

      const existing = await tx.libraryBorrowRecord.findFirst({
        where: { itemId, studentId, returnedAt: null },
        select: { id: true },
      });
      if (existing) {
        // Give the copy back rather than letting one student hold two.
        throw new AlreadyBorrowedError();
      }

      const created = await tx.libraryBorrowRecord.create({
        data: { itemId, studentId, dueDate },
        include: { item: { select: { title: true, type: true } } },
      });

      const remaining = await tx.libraryItem.findUnique({
        where: { id: itemId },
        select: { availableCopies: true },
      });
      if (remaining && remaining.availableCopies <= 0) {
        await tx.libraryItem.update({
          where: { id: itemId },
          data: { status: "BORROWED" },
        });
      }

      return created;
    });

    if (!record) {
      return NextResponse.json(
        { success: false, requestId, error: "The last copy has just gone out. Try a reservation." },
        { status: 409 }
      );
    }

    await logAudit({
      action: "CREATE",
      actorId: session.user.id,
      entity: "library_borrow_record",
      entityId: record.id,
      metadata: { itemId },
    });

    return NextResponse.json({ success: true, requestId, data: record }, { status: 201 });
  } catch (error) {
    if (error instanceof AlreadyBorrowedError) {
      return NextResponse.json(
        { success: false, requestId, error: "You already have this one out." },
        { status: 409 }
      );
    }
    console.error("Borrow error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "That loan didn't go through. Try again." },
      { status: 500 }
    );
  }
}

class AlreadyBorrowedError extends Error {
  constructor() {
    super("Already borrowed");
    this.name = "AlreadyBorrowedError";
  }
}
