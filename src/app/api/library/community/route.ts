import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRequestId } from "@/lib/utils";
import { getCommunityDecks, PublishedDeckItem } from "@/lib/study/communityStore";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const { searchParams } = new URL(req.url);

  const program = searchParams.get("program");
  const yearLevel = searchParams.get("yearLevel");
  const semester = searchParams.get("semester");
  const subject = searchParams.get("subject");
  const search = searchParams.get("search");

  let allDecks: PublishedDeckItem[] = [];

  // 1. Fetch from PostgreSQL database first
  try {
    const dbNotes = await prisma.note.findMany({
      where: {
        visibility: "PUBLIC",
        isArchived: false,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            studentProfile: { select: { studentNumber: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    for (const note of dbNotes) {
      let meta: any = {};
      try {
        if (note.summary && note.summary.startsWith("{")) {
          meta = JSON.parse(note.summary);
        }
      } catch {}

      allDecks.push({
        id: note.id,
        title: note.title,
        content: note.content,
        summary: note.content.slice(0, 160) + "...",
        tags: note.tags || [],
        program: meta.program || "BSIT",
        yearLevel: meta.yearLevel || 4,
        semester: meta.semester || 1,
        subjectCode: meta.subjectCode || "GENERAL",
        authorId: note.userId,
        authorName: meta.authorName || `${note.user?.firstName || "Student"} ${note.user?.lastName || ""}`.trim(),
        authorRole: note.user?.role || "STUDENT",
        authorSection: meta.authorSection || (note.user?.studentProfile?.studentNumber ? `ID: ${note.user.studentProfile.studentNumber}` : "BSIT-4A"),
        cardCount: meta.cardCount || 5,
        cardsCsv: meta.cardsCsv || "",
        createdAt: note.createdAt.toISOString(),
        likesCount: 0,
        forksCount: 0,
      });
    }
  } catch (dbErr) {
    console.warn("PostgreSQL community fetch warning (falling back to memory decks):", dbErr);
  }

  // 2. Merge with fallback demo decks
  const memoryDecks = getCommunityDecks();
  const existingIds = new Set(allDecks.map((d) => d.id));
  for (const m of memoryDecks) {
    if (!existingIds.has(m.id)) {
      allDecks.push(m);
    }
  }

  // 3. Apply Filters
  let filtered = allDecks;

  if (program && program !== "ALL") {
    filtered = filtered.filter((d) => d.program === program.toUpperCase());
  }

  if (yearLevel && yearLevel !== "ALL") {
    filtered = filtered.filter((d) => d.yearLevel === Number(yearLevel));
  }

  if (semester && semester !== "ALL") {
    filtered = filtered.filter((d) => d.semester === Number(semester));
  }

  if (subject && subject !== "ALL") {
    const s = subject.toLowerCase();
    filtered = filtered.filter((d) => d.subjectCode.toLowerCase().includes(s));
  }

  if (search) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q) ||
        d.authorName.toLowerCase().includes(q) ||
        d.subjectCode.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  return NextResponse.json({
    success: true,
    requestId,
    data: filtered,
    total: filtered.length,
  });
}
