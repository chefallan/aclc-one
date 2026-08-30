import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { limiters, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { generateFlashcardsFromNotes } from "@/lib/study/generate-cards";
import { generateRequestId } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);
  const user = session?.user || (process.env.DEV_BYPASS_AUTH === "true" ? { id: "dev-mock-student-id", email: "student@aclc.edu.ph" } : null);

  if (!user) {
    return NextResponse.json(
      { success: false, requestId, error: "Unauthorized. Please sign in." },
      { status: 401 }
    );
  }

  // Rate Limiting: 4 generations per 5 hours per user
  const userKey = user.id || user.email || "anonymous";
  const rateLimitResult = await rateLimit(req, limiters.aiFlashcards, userKey);

  if (!rateLimitResult.allowed) {
    const retryAfter = rateLimitResult.headers["Retry-After"] || "18000";
    const hours = Math.ceil(Number(retryAfter) / 3600);
    return NextResponse.json(
      {
        success: false,
        requestId,
        error: `Generation limit reached (maximum 4 AI flashcard generations per 5 hours). Please retry in approximately ${hours} hour(s).`,
        resetSeconds: Number(retryAfter),
      },
      { status: 429, headers: rateLimitResult.headers }
    );
  }

  try {
    const body = await req.json();
    const { notesText, topic, subject, chapter, lesson } = body;

    if (!notesText || typeof notesText !== "string" || !notesText.trim()) {
      return NextResponse.json(
        { success: false, requestId, error: "Please provide notes text to convert into flashcards." },
        { status: 400 }
      );
    }

    const result = await generateFlashcardsFromNotes({
      notesText,
      topic: topic || "Study Notes",
      subject: subject || "General",
      chapter: chapter || "Chapter 1",
      lesson: lesson || "Lesson 1",
    });

    return NextResponse.json(
      {
        success: true,
        requestId,
        ...result,
        remainingGenerations: Number(rateLimitResult.headers["X-RateLimit-Remaining"] || "0"),
      },
      { status: 200, headers: rateLimitResult.headers }
    );
  } catch (error: any) {
    console.error("AI Flashcard Generation Error:", error);
    return NextResponse.json(
      {
        success: false,
        requestId,
        error: error?.message || "Failed to generate flashcards from notes. Please try again.",
      },
      { status: 500 }
    );
  }
}
