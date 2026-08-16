import { prisma } from "@/lib/prisma";

export interface Citation {
  kind: "note" | "library";
  id: string;
  label: string;
  detail?: string;
}

export interface GroundingContext {
  citations: Citation[];
  /** Rendered block handed to the model. Empty when nothing relevant was found. */
  contextText: string;
}

const MAX_NOTES = 4;
const MAX_LIBRARY = 3;
const MAX_NOTE_CHARS = 1200;
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "for", "with",
  "is", "are", "was", "were", "be", "been", "what", "why", "how", "when", "who",
  "does", "do", "did", "can", "could", "should", "would", "explain", "about",
  "me", "my", "i", "you", "it", "this", "that", "again", "please", "tell",
]);

/**
 * Pulls the material an answer may be grounded in.
 *
 * Two rules hold here and are covered by tests:
 *  - Notes are filtered by userId. A student's notes are private; the
 *    assistant must never surface a classmate's.
 *  - Library items are not, because the catalogue belongs to the school.
 *
 * Retrieval is keyword-based rather than vector search. There is no pgvector
 * in this database and no embedding pipeline, and pretending otherwise would
 * mean shipping a similarity search that is really a LIKE query. When the
 * corpus outgrows this, add embeddings deliberately.
 */
export async function buildGrounding(
  query: string,
  scope: { userId: string }
): Promise<GroundingContext> {
  const terms = extractTerms(query);
  if (terms.length === 0) {
    return { citations: [], contextText: "" };
  }

  const [notes, libraryItems] = await Promise.all([
    prisma.note.findMany({
      where: {
        userId: scope.userId,
        isArchived: false,
        OR: terms.flatMap((term) => [
          { title: { contains: term, mode: "insensitive" as const } },
          { content: { contains: term, mode: "insensitive" as const } },
          { tags: { has: term } },
        ]),
      },
      select: {
        id: true,
        title: true,
        content: true,
        updatedAt: true,
        folder: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: MAX_NOTES,
    }),
    prisma.libraryItem.findMany({
      where: {
        OR: terms.flatMap((term) => [
          { title: { contains: term, mode: "insensitive" as const } },
          { author: { contains: term, mode: "insensitive" as const } },
          { tags: { has: term } },
        ]),
      },
      select: { id: true, title: true, author: true, type: true, availableCopies: true },
      take: MAX_LIBRARY,
    }),
  ]);

  const citations: Citation[] = [
    ...notes.map((n) => ({
      kind: "note" as const,
      id: n.id,
      label: n.title,
      detail: [n.folder?.name, formatDate(n.updatedAt)].filter(Boolean).join(" · "),
    })),
    ...libraryItems.map((item) => ({
      kind: "library" as const,
      id: item.id,
      label: item.title,
      detail: [item.author, item.availableCopies > 0 ? "on the shelf" : "all copies out"]
        .filter(Boolean)
        .join(" · "),
    })),
  ];

  if (citations.length === 0) {
    return { citations: [], contextText: "" };
  }

  const sections: string[] = [];

  if (notes.length > 0) {
    sections.push(
      "THE STUDENT'S OWN NOTES:\n" +
        notes
          .map(
            (n, i) =>
              `[note ${i + 1}] "${n.title}"${n.folder ? ` (${n.folder.name})` : ""}\n${truncate(
                n.content,
                MAX_NOTE_CHARS
              )}`
          )
          .join("\n\n")
    );
  }

  if (libraryItems.length > 0) {
    sections.push(
      "IN THE SCHOOL LIBRARY:\n" +
        libraryItems
          .map(
            (item) =>
              `- "${item.title}"${item.author ? ` by ${item.author}` : ""} (${item.type}) — ${
                item.availableCopies > 0 ? "available" : "all copies out"
              }`
          )
          .join("\n")
    );
  }

  return { citations, contextText: sections.join("\n\n") };
}

/** Words worth searching on: long enough to be meaningful, not filler. */
export function extractTerms(query: string): string[] {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, " ")
        .split(/\s+/)
        .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
    )
  ).slice(0, 8);
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}
