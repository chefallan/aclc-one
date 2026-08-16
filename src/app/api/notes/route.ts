import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { noteSchema } from "@/lib/validation";
import { generateRequestId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId");
  const visibility = searchParams.get("visibility");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {
    isArchived: false,
  };

  if (visibility === "public") {
    // PUBLIC means readable by the school, which is what the name promises.
    where.visibility = "PUBLIC";
  } else if (visibility === "shared") {
    // There is no share-target relation on Note, so there is no way to ask who
    // a note was shared *with*. Until a NoteShare join table exists this must
    // stay owner-scoped — the previous version returned every SHARED note in
    // the organization to anyone who passed this parameter.
    where.visibility = "SHARED";
    where.userId = session.user.id;
  } else {
    where.userId = session.user.id;
  }

  if (folderId) where.folderId = folderId;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
      { tags: { has: search } },
    ];
  }

  const notes = await prisma.note.findMany({
    where,
    include: { folder: { select: { name: true, color: true } } },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });

  return NextResponse.json({ success: true, requestId, data: notes });
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.role as never, "notes:create")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = noteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: parsed.error.issues[0]?.message ?? "Check the form." },
        { status: 400 }
      );
    }

    // A folder id from the client is not proof of ownership. Filing into
    // someone else's notebook has to be impossible, not merely unlikely.
    if (parsed.data.folderId) {
      const folder = await prisma.noteFolder.findFirst({
        where: {
          id: parsed.data.folderId,
          userId: session.user.id,
        },
        select: { id: true },
      });
      if (!folder) {
        return NextResponse.json(
          { success: false, requestId, error: "That notebook isn't one of yours." },
          { status: 404 }
        );
      }
    }

    const note = await prisma.note.create({
      data: {
        title: parsed.data.title,
        content: parsed.data.content,
        summary: parsed.data.summary ?? null,
        tags: parsed.data.tags,
        visibility: parsed.data.visibility,
        folderId: parsed.data.folderId ?? null,
        color: parsed.data.color ?? null,
        userId: session.user.id,
      },
      include: { folder: { select: { name: true, color: true } } },
    });
    return NextResponse.json({ success: true, requestId, data: note }, { status: 201 });
  } catch (error) {
    console.error("Note create error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "That note didn't save. Try again." },
      { status: 500 }
    );
  }
}
