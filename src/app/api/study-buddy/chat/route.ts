import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { buildGrounding } from "@/lib/study-buddy/retrieval";
import {
  buildSystemPrompt,
  streamChat,
  deriveTitle,
  ChatUnavailableError,
  type ChatTurn,
} from "@/lib/study-buddy/chat";
import { generateRequestId } from "@/lib/utils";

/**
 * A grounded answer streams token by token and routinely runs past the ten
 * seconds a serverless function gets by default, which would cut the reply off
 * mid-sentence. Sixty is the ceiling on Vercel's Hobby plan.
 */
export const maxDuration = 60;

const chatSchema = z.object({
  message: z.string().trim().min(1, "Type a question first.").max(4000),
  // nullish, not optional: starting a new chat sends conversationId: null,
  // and `.optional()` accepts undefined only — which rejected every first
  // message with "expected string, received null".
  conversationId: z.string().cuid().nullish(),
});

/** How much prior conversation is replayed to the model. */
const HISTORY_TURNS = 12;

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.role as never, "study_buddy:chat")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  const userId = session.user.id;

  try {
    const parsed = chatSchema.safeParse(await req.json());
    if (!parsed.success) {
      // Only the message field is something the student can fix; anything
      // else is our bug, so it is logged rather than shown.
      const onMessage = parsed.error.issues.find((i) => i.path[0] === "message");
      if (!onMessage) {
        console.error("Study Buddy rejected a malformed request:", parsed.error.issues);
      }
      return NextResponse.json(
        {
          success: false,
          requestId,
          error: onMessage?.message ?? "Study Buddy couldn't read that. Try asking again.",
        },
        { status: 400 }
      );
    }

    const { message, conversationId } = parsed.data;

    // An existing conversation must belong to this user in this school.
    // Scoping on both means another student's conversation id is a 404.
    let conversation = conversationId
      ? await prisma.conversation.findFirst({
          where: { id: conversationId, userId },
          select: { id: true, title: true },
        })
      : null;

    if (conversationId && !conversation) {
      return NextResponse.json(
        { success: false, requestId, error: "That conversation isn't yours." },
        { status: 404 }
      );
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { title: deriveTitle(message), userId },
        select: { id: true, title: true },
      });
    }

    const priorMessages = await prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: HISTORY_TURNS,
      select: { role: true, content: true },
    });

    // Retrieval runs before generation, so citations are known up front and
    // can be sent to the client immediately rather than guessed afterwards.
    const grounding = await buildGrounding(message, { userId });

    const history: ChatTurn[] = [
      ...priorMessages.map((m) => ({
        role: m.role === "ASSISTANT" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    await prisma.chatMessage.create({
      data: { role: "USER", content: message, conversationId: conversation.id },
    });

    const systemPrompt = buildSystemPrompt(session.user.name ?? "a student", grounding.contextText);
    const encoder = new TextEncoder();
    const conversationRef = conversation;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        // Line one is metadata; every later line is a text delta. Newline
        // delimited so the client can parse without a framing library.
        controller.enqueue(
          encoder.encode(
            `${JSON.stringify({
              type: "meta",
              conversationId: conversationRef.id,
              title: conversationRef.title,
              citations: grounding.citations,
            })}\n`
          )
        );

        let answer = "";
        try {
          for await (const delta of streamChat({
            messages: history,
            systemPrompt,
            signal: req.signal,
          })) {
            answer += delta;
            controller.enqueue(encoder.encode(`${JSON.stringify({ type: "delta", delta })}\n`));
          }
        } catch (error) {
          const text =
            error instanceof ChatUnavailableError
              ? error.message
              : "Study Buddy stopped mid-answer. Your question is saved — try asking again.";
          controller.enqueue(encoder.encode(`${JSON.stringify({ type: "error", error: text })}\n`));
          console.error("Study Buddy stream error:", error);
        }

        // Persist whatever was produced, including a partial answer, so the
        // transcript matches what the student actually saw.
        if (answer.trim()) {
          await prisma.chatMessage.create({
            data: {
              role: "ASSISTANT",
              content: answer,
              // Citation[] is a fixed shape; Prisma's Json input wants an
              // index signature, so widen it at the boundary only.
              citations:
                grounding.citations.length > 0
                  ? (grounding.citations as unknown as Prisma.InputJsonValue)
                  : undefined,
              conversationId: conversationRef.id,
            },
          });
          await prisma.conversation.update({
            where: { id: conversationRef.id },
            data: { updatedAt: new Date() },
          });
        }

        controller.enqueue(encoder.encode(`${JSON.stringify({ type: "done" })}\n`));
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
        "x-request-id": requestId,
      },
    });
  } catch (error) {
    console.error("Study Buddy chat error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "Study Buddy couldn't answer. Try again." },
      { status: 500 }
    );
  }
}
