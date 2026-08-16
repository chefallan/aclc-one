// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Ownership guards.
 *
 * ACLC One serves one college, so there is no tenant to scope by any more. The
 * boundary that still matters is between *people*: a student must not read
 * another student's notes, another student's chat, or the whole school's
 * borrowing history. That protection used to ride along with the tenant filter
 * and now has to stand on its own, which is exactly why these tests exist.
 *
 * Every case below covers something that was once a real defect:
 *   - notes accepted a folderId belonging to another user
 *   - library/borrow returned every borrower's name to any student
 *   - Study Buddy retrieval could reach a classmate's notes
 */

const session = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(async () => session.current),
}));

vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(async () => undefined) }));

const db = vi.hoisted(() => ({
  staffDirectoryEntry: { findMany: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
  floor: { findMany: vi.fn() },
  office: { findFirst: vi.fn() },
  queueEntry: {
    groupBy: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn(),
  },
  conversation: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  chatMessage: { findMany: vi.fn(), create: vi.fn() },
  noteFolder: { findFirst: vi.fn() },
  note: { findMany: vi.fn(), create: vi.fn() },
  libraryBorrowRecord: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
  libraryItem: { updateMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));

const STUDENT_A = "cl00000000000000000000stu";
const CONVO_A = "cl00000000000000000000cva";

function studentSession() {
  return { user: { id: "user-a", role: "STUDENT", studentProfileId: STUDENT_A } };
}

function post(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  session.current = studentSession();
});

describe("notes belong to one person", () => {
  it("refuses a folder that belongs to someone else", async () => {
    const { POST } = await import("@/app/api/notes/route");

    db.noteFolder.findFirst.mockResolvedValue(null);

    const res = await POST(
      post("http://localhost/api/notes", {
        title: "Routers",
        content: "three questions",
        folderId: "cl00000000000000000000fld",
      })
    );

    expect(res.status).toBe(404);
    expect(db.note.create).not.toHaveBeenCalled();
  });

  it("checks folder ownership by the signed-in user", async () => {
    const { POST } = await import("@/app/api/notes/route");

    db.noteFolder.findFirst.mockResolvedValue({ id: "cl00000000000000000000fld" });
    db.note.create.mockResolvedValue({ id: "note-1" });

    await POST(
      post("http://localhost/api/notes", {
        title: "Routers",
        content: "three questions",
        folderId: "cl00000000000000000000fld",
      })
    );

    expect(db.noteFolder.findFirst.mock.calls[0][0].where.userId).toBe("user-a");
  });

  it("does not let a client choose the owning user", async () => {
    const { POST } = await import("@/app/api/notes/route");

    db.note.create.mockResolvedValue({ id: "note-1" });

    await POST(
      post("http://localhost/api/notes", {
        title: "Routers",
        content: "three questions",
        userId: "somebody-else",
        isArchived: true,
      })
    );

    const data = db.note.create.mock.calls[0][0].data;
    expect(data.userId).toBe("user-a");
    expect(data.isArchived).toBeUndefined();
  });

  it("keeps SHARED notes owner-scoped, since there is no share-target model", async () => {
    const { GET } = await import("@/app/api/notes/route");

    db.note.findMany.mockResolvedValue([]);

    await GET(new NextRequest("http://localhost/api/notes?visibility=shared"));

    const where = db.note.findMany.mock.calls[0][0].where;
    expect(where.visibility).toBe("SHARED");
    expect(where.userId).toBe("user-a");
  });
});

describe("what a person is reading is their own business", () => {
  it("shows a student only their own loans", async () => {
    const { GET } = await import("@/app/api/library/borrow/route");

    db.libraryBorrowRecord.findMany.mockResolvedValue([]);

    await GET();

    const call = db.libraryBorrowRecord.findMany.mock.calls[0][0];
    expect(call.where.studentId).toBe(STUDENT_A);
    // Borrower identity is not even selected for a non-librarian.
    expect(call.include.student).toBeUndefined();
  });

  it("shows the whole desk to someone who manages the library", async () => {
    const { GET } = await import("@/app/api/library/borrow/route");

    session.current = { user: { id: "user-lib", role: "ADMIN" } };
    db.libraryBorrowRecord.findMany.mockResolvedValue([]);

    await GET();

    const call = db.libraryBorrowRecord.findMany.mock.calls[0][0];
    expect(call.where.studentId).toBeUndefined();
    expect(call.include.student).toBeDefined();
  });
});

describe("Study Buddy reaches only the asker's own material", () => {
  it("filters notes by the signed-in user", async () => {
    const { buildGrounding } = await import("@/lib/study-buddy/retrieval");

    db.note.findMany.mockResolvedValue([]);
    db.libraryItem.findMany.mockResolvedValue([]);

    await buildGrounding("explain AVL rotations", { userId: "user-a" });

    const where = db.note.findMany.mock.calls[0][0].where;
    expect(where.userId).toBe("user-a");
    expect(where.isArchived).toBe(false);
  });

  it("does not query at all when the question has no searchable terms", async () => {
    const { buildGrounding } = await import("@/lib/study-buddy/retrieval");

    const result = await buildGrounding("why is it?", { userId: "user-a" });

    expect(db.note.findMany).not.toHaveBeenCalled();
    expect(result.citations).toEqual([]);
  });

  it("returns no context when nothing matched, rather than an empty scaffold", async () => {
    const { buildGrounding } = await import("@/lib/study-buddy/retrieval");

    db.note.findMany.mockResolvedValue([]);
    db.libraryItem.findMany.mockResolvedValue([]);

    const result = await buildGrounding("rotations", { userId: "user-a" });

    expect(result.contextText).toBe("");
    expect(result.citations).toHaveLength(0);
  });
});

describe("conversations belong to one person", () => {
  it("refuses to continue a conversation that belongs to someone else", async () => {
    const { POST } = await import("@/app/api/study-buddy/chat/route");

    db.conversation.findFirst.mockResolvedValue(null);

    const res = await POST(
      post("http://localhost/api/study-buddy/chat", {
        message: "carry on",
        conversationId: CONVO_A,
      })
    );

    expect(res.status).toBe(404);
    expect(db.chatMessage.create).not.toHaveBeenCalled();
  });

  it("scopes the conversation lookup to the signed-in user", async () => {
    const { POST } = await import("@/app/api/study-buddy/chat/route");

    db.conversation.findFirst.mockResolvedValue(null);

    await POST(
      post("http://localhost/api/study-buddy/chat", {
        message: "carry on",
        conversationId: CONVO_A,
      })
    );

    expect(db.conversation.findFirst.mock.calls[0][0].where.userId).toBe("user-a");
  });

  it("rejects anonymous callers before creating anything", async () => {
    const { POST } = await import("@/app/api/study-buddy/chat/route");
    session.current = null;

    const res = await POST(post("http://localhost/api/study-buddy/chat", { message: "hello" }));

    expect(res.status).toBe(401);
    expect(db.conversation.create).not.toHaveBeenCalled();
  });

  it("rejects a role without chat permission", async () => {
    const { POST } = await import("@/app/api/study-buddy/chat/route");
    session.current = { user: { id: "sup-1", role: "SUPERVISOR" } };

    const res = await POST(post("http://localhost/api/study-buddy/chat", { message: "hello" }));

    expect(res.status).toBe(403);
  });

  it("deletes only within the caller's own scope", async () => {
    const { DELETE } = await import("@/app/api/study-buddy/conversations/[id]/route");

    db.conversation.deleteMany.mockResolvedValue({ count: 0 });

    const res = await DELETE(
      new NextRequest(`http://localhost/api/study-buddy/conversations/${CONVO_A}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: CONVO_A }) }
    );

    expect(db.conversation.deleteMany.mock.calls[0][0].where.userId).toBe("user-a");
    expect(res.status).toBe(404);
  });
});

describe("staff who opt out stay out of every list", () => {
  it("excludes hidden staff at the query, not in the UI", async () => {
    const { searchDirectory } = await import("@/lib/campus/directory");

    db.staffDirectoryEntry.findMany.mockResolvedValue([]);
    db.queueEntry.groupBy.mockResolvedValue([]);

    await searchDirectory();

    expect(db.staffDirectoryEntry.findMany.mock.calls[0][0].where.visibility).toBe("VISIBLE");
  });

  it("refuses to return a hidden staff member by direct id", async () => {
    const { getStaffMember } = await import("@/lib/campus/directory");

    db.staffDirectoryEntry.findFirst.mockResolvedValue(null);

    const result = await getStaffMember("cl00000000000000000000stf");

    expect(result).toBeNull();
    expect(db.staffDirectoryEntry.findFirst.mock.calls[0][0].where.visibility).toBe("VISIBLE");
  });

  it("counts hidden staff on a floor without naming them", async () => {
    const { buildFloorStack } = await import("@/lib/campus/directory");

    db.floor.findMany.mockResolvedValue([
      {
        id: "floor-g",
        label: "G",
        level: 0,
        name: "Registrar",
        offices: [
          {
            name: "Registrar",
            staff: [
              {
                visibility: "VISIBLE",
                presenceStatus: "AT_DESK",
                presenceUntil: null,
                presenceNote: null,
                presenceUpdatedAt: new Date(),
              },
              {
                visibility: "HIDDEN",
                presenceStatus: "AT_DESK",
                presenceUntil: null,
                presenceNote: null,
                presenceUpdatedAt: new Date(),
              },
            ],
          },
        ],
      },
    ]);

    const [floor] = await buildFloorStack();

    expect(floor.available).toBe(1);
    expect(floor.hidden).toBe(1);
  });
});

describe("Study Buddy accepts the payload the client actually sends", () => {
  it("starts a new chat when conversationId is null", async () => {
    // The regression this guards: the client's "no conversation yet" state is
    // null, the schema only allowed undefined, and every first message came
    // back 400 "expected string, received null".
    const { POST } = await import("@/app/api/study-buddy/chat/route");

    db.conversation.create.mockResolvedValue({ id: CONVO_A, title: "Explain AVL" });
    db.chatMessage.findMany.mockResolvedValue([]);
    db.chatMessage.create.mockResolvedValue({ id: "msg-1" });
    db.note.findMany.mockResolvedValue([]);
    db.libraryItem.findMany.mockResolvedValue([]);

    const res = await POST(
      post("http://localhost/api/study-buddy/chat", {
        message: "Explain AVL rotations",
        conversationId: null,
      })
    );

    expect(res.status).toBe(200);
    expect(db.conversation.create).toHaveBeenCalled();
    // It must not be mistaken for continuing an existing conversation.
    expect(db.conversation.findFirst).not.toHaveBeenCalled();
  });

  it("starts a new chat when conversationId is omitted altogether", async () => {
    const { POST } = await import("@/app/api/study-buddy/chat/route");

    db.conversation.create.mockResolvedValue({ id: CONVO_A, title: "Hello" });
    db.chatMessage.findMany.mockResolvedValue([]);
    db.chatMessage.create.mockResolvedValue({ id: "msg-1" });
    db.note.findMany.mockResolvedValue([]);
    db.libraryItem.findMany.mockResolvedValue([]);

    const res = await POST(post("http://localhost/api/study-buddy/chat", { message: "Hello" }));

    expect(res.status).toBe(200);
    expect(db.conversation.create).toHaveBeenCalled();
  });

  it("still rejects an empty message, and says so in words a student can act on", async () => {
    const { POST } = await import("@/app/api/study-buddy/chat/route");

    const res = await POST(
      post("http://localhost/api/study-buddy/chat", { message: "   ", conversationId: null })
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Type a question first.");
  });

  it("never leaks a raw validator message for a field the student cannot see", async () => {
    const { POST } = await import("@/app/api/study-buddy/chat/route");

    const res = await POST(
      post("http://localhost/api/study-buddy/chat", {
        message: "Explain AVL rotations",
        conversationId: 12345,
      })
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).not.toMatch(/expected|received|string/i);
  });
});
