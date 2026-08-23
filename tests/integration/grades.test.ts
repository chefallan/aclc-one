// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Recording grades.
 *
 * Three things must hold, and none of them are visible from reading the happy
 * path:
 *
 *   1. A mark is checked against the school's scale before it is stored. On
 *      the point scale 85 is not a low grade, it is not a grade, and storing
 *      it corrupts every average it touches.
 *   2. Only students enrolled in the section can be written to. Otherwise a
 *      crafted request sets a grade for anyone in the school.
 *   3. Saving is a draft. Releasing is a separate act, because a student
 *      reading an instructor's working notes is its own kind of harm.
 */

const session = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("next-auth/next", () => ({ getServerSession: vi.fn(async () => session.current) }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(async () => undefined) }));

const db = vi.hoisted(() => ({
  school: { findFirst: vi.fn() },
  section: { findUnique: vi.fn() },
  subject: { findUnique: vi.fn(), findMany: vi.fn(), createMany: vi.fn() },
  studentEnrollment: { findMany: vi.fn() },
  grade: { upsert: vi.fn() },
  sectionScheduleEntry: { findMany: vi.fn() },
  $transaction: vi.fn(async (ops: unknown[]) => ops),
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const grades = await import("@/app/api/admin/grades/route");

const SECTION = "clzz1111111111111111111a";
const SUBJECT = "clzz2222222222222222222b";
const IN_SECTION = "clzz3333333333333333333c";
const OUTSIDER = "clzz4444444444444444444d";

const put = (body: unknown) =>
  new NextRequest("http://localhost/api/admin/grades", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const base = { sectionId: SECTION, subjectId: SUBJECT, period: "PRELIM" as const };

beforeEach(() => {
  vi.clearAllMocks();
  session.current = { user: { id: "u-teacher", role: "FACULTY" } };
  db.school.findFirst.mockResolvedValue({ gradingScale: "PERCENTAGE", passingGrade: 75 });
  db.section.findUnique.mockResolvedValue({ id: SECTION, academicYearId: "ay-1" });
  db.subject.findUnique.mockResolvedValue({ id: SUBJECT });
  db.studentEnrollment.findMany.mockResolvedValue([{ studentId: IN_SECTION }]);
  db.$transaction.mockImplementation(async (ops: unknown[]) => ops);
});

describe("who may record grades", () => {
  it("refuses a student", async () => {
    session.current = { user: { id: "u-1", role: "STUDENT" } };
    const res = await grades.PUT(put({ ...base, scores: [{ studentId: IN_SECTION, score: 90 }] }));
    expect(res.status).toBe(403);
    expect(db.grade.upsert).not.toHaveBeenCalled();
  });

  it("refuses a workplace supervisor", async () => {
    session.current = { user: { id: "u-2", role: "SUPERVISOR" } };
    const res = await grades.PUT(put({ ...base, scores: [{ studentId: IN_SECTION, score: 90 }] }));
    expect(res.status).toBe(403);
  });

  it("refuses someone signed out", async () => {
    session.current = null;
    const res = await grades.PUT(put({ ...base, scores: [] }));
    expect(res.status).toBe(401);
  });
});

describe("marks are read against the school's scale", () => {
  it("accepts a percentage in range", async () => {
    const res = await grades.PUT(put({ ...base, scores: [{ studentId: IN_SECTION, score: 88 }] }));
    expect(res.status).toBe(200);
    expect(db.grade.upsert).toHaveBeenCalledTimes(1);
  });

  it("refuses a percentage above 100", async () => {
    const res = await grades.PUT(put({ ...base, scores: [{ studentId: IN_SECTION, score: 150 }] }));
    expect(res.status).toBe(400);
    expect(db.grade.upsert).not.toHaveBeenCalled();
  });

  it("refuses a percentage mark at a point-scale school", async () => {
    // 85 is a fine percentage and meaningless on a 1.00-5.00 scale. Storing it
    // would drag every average that touches it into nonsense.
    db.school.findFirst.mockResolvedValue({ gradingScale: "POINT_SCALE", passingGrade: 3 });
    const res = await grades.PUT(put({ ...base, scores: [{ studentId: IN_SECTION, score: 85 }] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/1\.00-5\.00|point scale/i);
    expect(db.grade.upsert).not.toHaveBeenCalled();
  });

  it("accepts a point-scale mark at a point-scale school", async () => {
    db.school.findFirst.mockResolvedValue({ gradingScale: "POINT_SCALE", passingGrade: 3 });
    const res = await grades.PUT(put({ ...base, scores: [{ studentId: IN_SECTION, score: 1.25 }] }));
    expect(res.status).toBe(200);
  });

  it("accepts null as clearing a mark, not as a zero", async () => {
    const res = await grades.PUT(put({ ...base, scores: [{ studentId: IN_SECTION, score: null }] }));
    expect(res.status).toBe(200);
    expect(db.grade.upsert.mock.calls[0][0].create.score).toBeNull();
  });

  it("rejects the whole column if one mark is impossible", async () => {
    // Partially saving a column would leave a sheet nobody can trust.
    const res = await grades.PUT(
      put({
        ...base,
        scores: [
          { studentId: IN_SECTION, score: 90 },
          { studentId: IN_SECTION, score: 500 },
        ],
      })
    );
    expect(res.status).toBe(400);
    expect(db.grade.upsert).not.toHaveBeenCalled();
  });
});

describe("who can be graded", () => {
  it("writes only students enrolled in that section", async () => {
    const res = await grades.PUT(
      put({
        ...base,
        scores: [
          { studentId: IN_SECTION, score: 90 },
          { studentId: OUTSIDER, score: 100 },
        ],
      })
    );

    expect(res.status).toBe(200);
    expect(db.grade.upsert).toHaveBeenCalledTimes(1);
    expect(db.grade.upsert.mock.calls[0][0].create.studentId).toBe(IN_SECTION);
    expect((await res.json()).data).toEqual({ saved: 1, skipped: 1 });
  });
});

describe("draft and posted", () => {
  it("saves as a draft by default", async () => {
    await grades.PUT(put({ ...base, scores: [{ studentId: IN_SECTION, score: 90 }] }));
    expect(db.grade.upsert.mock.calls[0][0].create.status).toBe("DRAFT");
  });

  it("does not silently re-draft a posted grade on a later save", async () => {
    await grades.PUT(put({ ...base, scores: [{ studentId: IN_SECTION, score: 90 }] }));
    // An update without post must leave status alone, or correcting a typo in
    // a released grade would quietly withdraw it from the student.
    expect(db.grade.upsert.mock.calls[0][0].update).not.toHaveProperty("status");
  });

  it("posts only when asked", async () => {
    await grades.PUT(put({ ...base, scores: [{ studentId: IN_SECTION, score: 90 }], post: true }));
    expect(db.grade.upsert.mock.calls[0][0].create.status).toBe("POSTED");
    expect(db.grade.upsert.mock.calls[0][0].update.status).toBe("POSTED");
  });
});
