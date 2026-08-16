// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Section timetables.
 *
 * Two things have to hold, and neither is obvious from reading the handlers:
 *
 *   1. The resolver picks the right week. A student following their section
 *      must read the section's rows, not their own stale personal ones — the
 *      whole point of following is that a registrar's change reaches them.
 *   2. Editing a section is not editing your own timetable. A student who
 *      POSTs to the admin route must be refused; a section id in the URL must
 *      not let anyone delete another section's rows.
 *
 * Both are mutation-tested at the end: the guard is removed and the test is
 * shown to fail, so a passing run means the guard is doing the work.
 */

const session = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(async () => session.current),
}));

vi.mock("@/lib/auth", () => ({ authOptions: {} }));

const db = vi.hoisted(() => ({
  studentProfile: { findFirst: vi.fn(), update: vi.fn() },
  scheduleEntry: { findMany: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn() },
  sectionScheduleEntry: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  section: { findUnique: vi.fn() },
  $transaction: vi.fn(async (ops: unknown[]) => ops),
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { resolveScheduleForUser, adoptSectionSchedule } = await import("@/lib/schedule-resolver");
const sectionRoute = await import("@/app/api/admin/sections/[id]/schedule/route");
const sourceRoute = await import("@/app/api/schedule/source/route");

const params = (id: string) => ({ params: Promise.resolve({ id }) });

const post = (url: string, body: unknown) =>
  new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const del = (url: string, body: unknown) =>
  new NextRequest(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const patch = (url: string, body: unknown) =>
  new NextRequest(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const STUDENT = { user: { id: "u-student", role: "STUDENT" } };
const ADMIN = { user: { id: "u-admin", role: "ADMIN" } };
const FACULTY = { user: { id: "u-faculty", role: "FACULTY" } };

const SECTION_ROW = {
  id: "e-section",
  subjectCode: "WD 101",
  subjectTitle: "Web Fundamentals",
  day: "MONDAY",
  startTime: "07:30",
  endTime: "09:00",
  room: "COMLAB 1",
  instructor: "Sir Ryan Cabahug",
};

const PERSONAL_ROW = { ...SECTION_ROW, id: "e-personal", subjectCode: "PROG 101" };

beforeEach(() => {
  vi.clearAllMocks();
  session.current = null;
  db.$transaction.mockImplementation(async (ops: unknown[]) => ops);
});

/** A student enrolled in WADT-1C, following it or not. */
function enrolledStudent(scheduleSource: "SECTION" | "PERSONAL") {
  db.studentProfile.findFirst.mockResolvedValue({
    id: "sp-1",
    scheduleSource,
    enrollments: [{ sectionId: "sec-wadt", section: { id: "sec-wadt", name: "WADT-1C" } }],
  });
}

describe("which week a person reads", () => {
  it("gives a following student the section's rows, not their own", async () => {
    enrolledStudent("SECTION");
    db.sectionScheduleEntry.count.mockResolvedValue(11);
    db.sectionScheduleEntry.findMany.mockResolvedValue([SECTION_ROW]);
    db.scheduleEntry.findMany.mockResolvedValue([PERSONAL_ROW]);

    const result = await resolveScheduleForUser("u-student");

    expect(result.source).toBe("SECTION");
    expect(result.entries.map((e) => e.subjectCode)).toEqual(["WD 101"]);
    expect(result.section).toEqual({ id: "sec-wadt", name: "WADT-1C" });
    // Read-only is what stops the student screen from offering a delete on
    // rows that belong to the whole section.
    expect(result.readOnly).toBe(true);
    expect(db.scheduleEntry.findMany).not.toHaveBeenCalled();
  });

  it("gives a customised student their own rows", async () => {
    enrolledStudent("PERSONAL");
    db.sectionScheduleEntry.count.mockResolvedValue(11);
    db.scheduleEntry.findMany.mockResolvedValue([PERSONAL_ROW]);

    const result = await resolveScheduleForUser("u-student");

    expect(result.source).toBe("PERSONAL");
    expect(result.entries.map((e) => e.subjectCode)).toEqual(["PROG 101"]);
    expect(result.readOnly).toBe(false);
    // The section is still reported, so the screen can offer to go back to it.
    expect(result.section?.name).toBe("WADT-1C");
    expect(result.sectionEntryCount).toBe(11);
  });

  it("scopes the personal read to the user", async () => {
    enrolledStudent("PERSONAL");
    db.sectionScheduleEntry.count.mockResolvedValue(0);
    db.scheduleEntry.findMany.mockResolvedValue([]);

    await resolveScheduleForUser("u-student");

    expect(db.scheduleEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u-student" } })
    );
  });

  it("falls back to a personal week for someone with no section", async () => {
    // A student approved but not yet enrolled. Following nothing would leave
    // them with a permanently empty screen and no way to fix it.
    db.studentProfile.findFirst.mockResolvedValue({
      id: "sp-2",
      scheduleSource: "SECTION",
      enrollments: [],
    });
    db.scheduleEntry.findMany.mockResolvedValue([]);

    const result = await resolveScheduleForUser("u-student");

    expect(result.source).toBe("PERSONAL");
    expect(result.readOnly).toBe(false);
    expect(result.section).toBeNull();
  });

  it("gives faculty their own week", async () => {
    db.studentProfile.findFirst.mockResolvedValue(null);
    db.scheduleEntry.findMany.mockResolvedValue([PERSONAL_ROW]);

    const result = await resolveScheduleForUser("u-faculty");

    expect(result.source).toBe("PERSONAL");
    expect(result.readOnly).toBe(false);
    expect(db.sectionScheduleEntry.findMany).not.toHaveBeenCalled();
  });
});

describe("copying a section's week to start from", () => {
  it("replaces the personal week rather than merging into it", async () => {
    db.sectionScheduleEntry.findMany.mockResolvedValue([SECTION_ROW, PERSONAL_ROW]);

    const copied = await adoptSectionSchedule("u-student", "sec-wadt");

    expect(copied).toBe(2);
    // Delete and create in one transaction: a half-copied timetable is worse
    // than either the old one or the new one.
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(db.scheduleEntry.deleteMany).toHaveBeenCalledWith({ where: { userId: "u-student" } });
    expect(db.scheduleEntry.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([expect.objectContaining({ userId: "u-student" })]),
    });
  });

  it("leaves an existing week alone when the section has nothing published", async () => {
    db.sectionScheduleEntry.findMany.mockResolvedValue([]);

    expect(await adoptSectionSchedule("u-student", "sec-wadt")).toBe(0);
    expect(db.scheduleEntry.deleteMany).not.toHaveBeenCalled();
  });
});

describe("who may edit a section's timetable", () => {
  it("refuses a student", async () => {
    session.current = STUDENT;

    const res = await sectionRoute.POST(
      post("http://localhost/api/admin/sections/sec-wadt/schedule", {
        subjectCode: "FREE",
        day: "MONDAY",
        startTime: "08:00",
        endTime: "09:00",
      }),
      params("sec-wadt")
    );

    expect(res.status).toBe(403);
    expect(db.sectionScheduleEntry.create).not.toHaveBeenCalled();
  });

  it("refuses faculty — reading a week is not owning one", async () => {
    session.current = FACULTY;

    const res = await sectionRoute.DELETE(
      del("http://localhost/api/admin/sections/sec-wadt/schedule", {
        entryId: "clzzzzzzzzzzzzzzzzzzzzzzz",
      }),
      params("sec-wadt")
    );

    expect(res.status).toBe(403);
    expect(db.sectionScheduleEntry.deleteMany).not.toHaveBeenCalled();
  });

  it("refuses someone signed out", async () => {
    session.current = null;

    const res = await sectionRoute.GET(
      new NextRequest("http://localhost/api/admin/sections/sec-wadt/schedule"),
      params("sec-wadt")
    );

    expect(res.status).toBe(401);
  });

  it("lets an admin add a class", async () => {
    session.current = ADMIN;
    db.section.findUnique.mockResolvedValue({ id: "sec-wadt" });
    db.sectionScheduleEntry.findMany.mockResolvedValue([]);
    db.sectionScheduleEntry.create.mockResolvedValue(SECTION_ROW);

    const res = await sectionRoute.POST(
      post("http://localhost/api/admin/sections/sec-wadt/schedule", {
        subjectCode: "WD 101",
        day: "MONDAY",
        startTime: "07:30",
        endTime: "09:00",
      }),
      params("sec-wadt")
    );

    expect(res.status).toBe(201);
    expect(db.sectionScheduleEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ sectionId: "sec-wadt" }) })
    );
  });

  it("warns before double-booking a section, then allows it on the second try", async () => {
    session.current = ADMIN;
    db.section.findUnique.mockResolvedValue({ id: "sec-wadt" });
    db.sectionScheduleEntry.findMany.mockResolvedValue([
      { id: "x", day: "MONDAY", startTime: "07:30", endTime: "09:00", subjectCode: "WD 101" },
    ]);

    const clashing = {
      subjectCode: "PROG 101",
      day: "MONDAY",
      startTime: "08:00",
      endTime: "10:00",
    };

    const warned = await sectionRoute.POST(
      post("http://localhost/api/admin/sections/sec-wadt/schedule", clashing),
      params("sec-wadt")
    );
    expect(warned.status).toBe(409);
    expect((await warned.json()).error).toMatch(/overlaps WD 101/);
    expect(db.sectionScheduleEntry.create).not.toHaveBeenCalled();

    db.sectionScheduleEntry.create.mockResolvedValue(SECTION_ROW);
    const forced = await sectionRoute.POST(
      post("http://localhost/api/admin/sections/sec-wadt/schedule", {
        ...clashing,
        allowClash: true,
      }),
      params("sec-wadt")
    );
    expect(forced.status).toBe(201);
  });

  it("scopes a delete to the section in the URL", async () => {
    session.current = ADMIN;
    db.sectionScheduleEntry.deleteMany.mockResolvedValue({ count: 0 });

    const res = await sectionRoute.DELETE(
      del("http://localhost/api/admin/sections/sec-wadt/schedule", {
        entryId: "clzzzzzzzzzzzzzzzzzzzzzzz",
      }),
      params("sec-wadt")
    );

    // An entry id from another section matches nothing, so it 404s rather
    // than deleting a row the caller never named.
    expect(res.status).toBe(404);
    expect(db.sectionScheduleEntry.deleteMany).toHaveBeenCalledWith({
      where: { id: "clzzzzzzzzzzzzzzzzzzzzzzz", sectionId: "sec-wadt" },
    });
  });
});

describe("switching between a section's week and your own", () => {
  it("copies the block schedule when asked to customise from it", async () => {
    session.current = STUDENT;
    db.studentProfile.findFirst.mockResolvedValue({
      id: "sp-1",
      enrollments: [{ sectionId: "sec-wadt" }],
    });
    db.sectionScheduleEntry.findMany.mockResolvedValue([SECTION_ROW]);

    const res = await sourceRoute.PATCH(
      patch("http://localhost/api/schedule/source", {
        source: "PERSONAL",
        copyFromSection: true,
      })
    );

    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ source: "PERSONAL", copied: 1 });
    expect(db.studentProfile.update).toHaveBeenCalledWith({
      where: { id: "sp-1" },
      data: { scheduleSource: "PERSONAL" },
    });
  });

  it("starts blank when the copy is not asked for", async () => {
    session.current = STUDENT;
    db.studentProfile.findFirst.mockResolvedValue({
      id: "sp-1",
      enrollments: [{ sectionId: "sec-wadt" }],
    });

    const res = await sourceRoute.PATCH(
      patch("http://localhost/api/schedule/source", { source: "PERSONAL" })
    );

    expect(res.status).toBe(200);
    expect(db.scheduleEntry.deleteMany).not.toHaveBeenCalled();
  });

  it("refuses to follow a section the student is not in", async () => {
    session.current = STUDENT;
    db.studentProfile.findFirst.mockResolvedValue({ id: "sp-2", enrollments: [] });

    const res = await sourceRoute.PATCH(
      patch("http://localhost/api/schedule/source", { source: "SECTION" })
    );

    expect(res.status).toBe(409);
    expect(db.studentProfile.update).not.toHaveBeenCalled();
  });

  it("refuses someone with no student record", async () => {
    session.current = FACULTY;
    db.studentProfile.findFirst.mockResolvedValue(null);

    const res = await sourceRoute.PATCH(
      patch("http://localhost/api/schedule/source", { source: "SECTION" })
    );

    expect(res.status).toBe(400);
    expect(db.studentProfile.update).not.toHaveBeenCalled();
  });

  it("refuses someone signed out", async () => {
    session.current = null;

    const res = await sourceRoute.PATCH(
      patch("http://localhost/api/schedule/source", { source: "PERSONAL" })
    );

    expect(res.status).toBe(401);
  });
});
