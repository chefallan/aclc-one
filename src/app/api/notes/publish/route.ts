import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateRequestId } from "@/lib/utils";
import { addCommunityDeck, PublishedDeckItem } from "@/lib/study/communityStore";

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);
  const user = session?.user || (process.env.DEV_BYPASS_AUTH === "true" ? {
    id: "dev-mock-student-id",
    name: "Juan Dela Cruz",
    role: "STUDENT",
  } : null);

  if (!user) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized. Please sign in." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      noteId,
      title,
      content,
      tags = [],
      program = "BSIT",
      yearLevel = 4,
      semester = 1,
      subjectCode = "IT 402",
      cardsCsv = "",
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, requestId, error: "Title and content are required to publish." },
        { status: 400 }
      );
    }

    const cardLines = (cardsCsv || "").split("\n").filter((l: string) => l.trim().length > 0);
    const cardCount = Math.max(1, cardLines.length > 1 ? cardLines.length - 1 : 1);

    const deckMeta = {
      isDeck: true,
      program: String(program).toUpperCase(),
      yearLevel: Number(yearLevel) || 1,
      semester: Number(semester) || 1,
      subjectCode: String(subjectCode || "GENERAL").toUpperCase(),
      authorName: user.name || "Juan Dela Cruz",
      authorSection: `${String(program).toUpperCase()}-${yearLevel}A`,
      cardCount,
      cardsCsv: cardsCsv || "",
      publishedAt: new Date().toISOString(),
    };

    const serializedSummary = JSON.stringify(deckMeta);
    const formattedTags = Array.from(new Set([
      ...tags,
      `PROGRAM:${deckMeta.program}`,
      `YEAR:${deckMeta.yearLevel}`,
      `SEM:${deckMeta.semester}`,
      `SUBJECT:${deckMeta.subjectCode}`,
      "FLASHCARDS",
    ]));

    let savedDbNoteId = noteId;

    // Persist directly to PostgreSQL database via Prisma
    try {
      if (noteId) {
        const updated = await prisma.note.update({
          where: { id: noteId },
          data: {
            title: title.trim(),
            content: content.trim(),
            summary: serializedSummary,
            tags: formattedTags,
            visibility: "PUBLIC",
          },
        });
        savedDbNoteId = updated.id;
      } else {
        // Try finding existing user in DB or use first user
        let realUserId = user.id;
        const dbUser = await prisma.user.findFirst({ select: { id: true, firstName: true, lastName: true } });
        if (dbUser) realUserId = dbUser.id;

        const created = await prisma.note.create({
          data: {
            title: title.trim(),
            content: content.trim(),
            summary: serializedSummary,
            tags: formattedTags,
            visibility: "PUBLIC",
            userId: realUserId,
          },
        });
        savedDbNoteId = created.id;
      }
      console.log("Successfully saved published deck to PostgreSQL database:", savedDbNoteId);
    } catch (dbErr) {
      console.warn("PostgreSQL save warning (using memory cache fallback):", dbErr);
    }

    const newItem: PublishedDeckItem = {
      id: savedDbNoteId || `pub-${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      summary: content.slice(0, 160) + "...",
      tags: formattedTags,
      program: deckMeta.program,
      yearLevel: deckMeta.yearLevel,
      semester: deckMeta.semester,
      subjectCode: deckMeta.subjectCode,
      authorId: user.id,
      authorName: user.name || "Juan Dela Cruz",
      authorRole: (user as { role?: string }).role || "STUDENT",
      authorSection: deckMeta.authorSection,
      cardCount,
      cardsCsv: cardsCsv || "",
      createdAt: new Date().toISOString(),
      likesCount: 0,
      forksCount: 0,
    };

    addCommunityDeck(newItem);

    return NextResponse.json({ success: true, requestId, data: newItem }, { status: 201 });
  } catch (error) {
    console.error("Publish note error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "Failed to publish deck to library." },
      { status: 500 }
    );
  }
}
