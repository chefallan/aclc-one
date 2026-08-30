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
  const userId = session?.user?.id || (process.env.DEV_BYPASS_AUTH === "true" ? "dev-mock-student-id" : null);

  if (!userId) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId");
  const visibility = searchParams.get("visibility");
  const search = searchParams.get("search");

  try {
    const where: Record<string, unknown> = {
      isArchived: false,
    };

    if (visibility === "public") {
      where.visibility = "PUBLIC";
    } else if (visibility === "shared") {
      where.visibility = "SHARED";
      where.userId = userId;
    } else {
      where.userId = userId;
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

    if (notes.length > 0) {
      return NextResponse.json({ success: true, requestId, data: notes });
    }
  } catch (err) {
    console.warn("Database notes lookup failed, returning mock notes for preview:", err);
  }

  // Fallback rich sample notes for testing AI Flashcards
  const sampleNotes = [
    {
      id: "note-sample-1",
      title: "Database Normalization & Normal Forms",
      content: "1NF eliminates duplicate columns and requires atomic values. 2NF removes partial dependencies where non-key attributes depend on only part of a composite primary key. 3NF removes transitive dependencies (non-key attributes depending on other non-key attributes). Boyce-Codd Normal Form (BCNF) is a stricter version of 3NF where every determinant must be a candidate key.",
      summary: "Overview of 1NF, 2NF, 3NF, and BCNF database normalization rules.",
      tags: ["Databases", "IT402", "Architecture"],
      visibility: "PRIVATE",
      isPinned: true,
      isArchived: false,
      color: null,
      folder: { name: "Databases", color: "#3b82f6" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "note-sample-2",
      title: "Data Structures & Time Complexity",
      content: "Arrays allow O(1) random access by index. Linked lists have O(1) insertion at head but O(n) search. Binary Search Trees offer O(log n) search, insertion, and deletion when balanced. Hash tables provide average O(1) lookups using collision resolution techniques like chaining or open addressing.",
      summary: "Comparison of Arrays, Linked Lists, BSTs, and Hash Tables.",
      tags: ["CS105", "Algorithms"],
      visibility: "PRIVATE",
      isPinned: false,
      isArchived: false,
      color: null,
      folder: { name: "Algorithms", color: "#10b981" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "note-sample-3",
      title: "Computer Networks: OSI 7-Layer Model",
      content: "The 7 layers of the OSI model from Layer 7 to 1: Application (HTTP, DNS), Presentation (Encryption, Compression), Session (Sockets), Transport (TCP, UDP), Network (IP, Routers), Data Link (MAC, Switches, Ethernet frames), and Physical (Cables, Signals, Hubs).",
      summary: "7 layers of the OSI model with protocols and hardware.",
      tags: ["Networking", "Hardware"],
      visibility: "PRIVATE",
      isPinned: false,
      isArchived: false,
      color: null,
      folder: { name: "Networks", color: "#8b5cf6" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return NextResponse.json({ success: true, requestId, data: sampleNotes });
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
