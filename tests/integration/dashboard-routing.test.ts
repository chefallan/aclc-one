// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Who gets the administrator's dashboard.
 *
 * Reported by a student: signed in as STUDENT, shown the school overview -
 * roll counts, faculty counts, "Import students", "School settings".
 *
 * Two faults, one visible and one underneath it:
 *
 *   1. The admin dashboard was the fall-through case. Anyone matching no
 *      earlier branch got it, and a STUDENT with no studentProfileId matches
 *      no earlier branch.
 *   2. Nothing ever created a StudentProfile. Registration makes only a User,
 *      and approval only flipped status - so *every* approved student had a
 *      null studentProfileId and hit fault 1.
 */

const session = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(async () => session.current),
}));

vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(async () => undefined) }));

const db = vi.hoisted(() => ({
  user: { updateMany: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  studentProfile: { findUnique: vi.fn(), create: vi.fn(), count: vi.fn() },
  // The admin branch reads these before rendering its overview.
  classSession: { count: vi.fn(), findMany: vi.fn() },
  classAttendance: { count: vi.fn(), findMany: vi.fn() },
  studentEnrollment: { count: vi.fn() },
  section: { findMany: vi.fn() },
  $transaction: vi.fn(async (ops) => Promise.all(ops)),
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));

const accounts = await import("@/app/api/admin/accounts/route");

const patch = (body: unknown) =>
  new NextRequest("http://localhost/api/admin/accounts", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const ADMIN = { user: { id: "u-admin", role: "ADMIN" } };

/** Real cuids: accountDecisionSchema rejects anything else with a 400,
 *  which would make every "did not create a profile" assertion pass
 *  without the handler ever running. */
const STUDENT_ID = "clzz1111111111111111111a";
const FACULTY_ID = "clzz2222222222222222222b";

beforeEach(() => {
  vi.clearAllMocks();
  session.current = ADMIN;
  db.user.updateMany.mockResolvedValue({ count: 1 });
  db.studentProfile.findUnique.mockResolvedValue(null);
  db.studentProfile.create.mockResolvedValue({ id: "sp-new" });
});

describe("approving a student", () => {
  it("creates the student record, not just an ACTIVE flag", async () => {
    db.user.findUnique.mockResolvedValue({
      id: STUDENT_ID,
      role: "STUDENT",
      firstName: "Allan",
      lastName: "Catayoc",
      idNumber: "02-2223-04891",
    });

    const res = await accounts.PATCH(patch({ userId: STUDENT_ID, decision: "APPROVE" }));
    expect(res.status).toBe(200);

    expect(db.studentProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: STUDENT_ID,
        studentNumber: "02-2223-04891",
        firstName: "Allan",
        lastName: "Catayoc",
      }),
    });
  });

  it("issues a QR token, or they can never be marked present", async () => {
    db.user.findUnique.mockResolvedValue({
      id: STUDENT_ID, role: "STUDENT", firstName: "A", lastName: "B", idNumber: "02-1",
    });

    await accounts.PATCH(patch({ userId: STUDENT_ID, decision: "APPROVE" }));

    const token = db.studentProfile.create.mock.calls[0][0].data.qrCodeToken;
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);
  });

  it("does not duplicate a profile when one already exists", async () => {
    db.user.findUnique.mockResolvedValue({
      id: STUDENT_ID, role: "STUDENT", firstName: "A", lastName: "B", idNumber: "02-1",
    });
    db.studentProfile.findUnique.mockResolvedValue({ id: "sp-existing" });

    const res = await accounts.PATCH(patch({ userId: STUDENT_ID, decision: "APPROVE" }));

    expect(res.status).toBe(200);
    expect(db.studentProfile.create).not.toHaveBeenCalled();
  });

  it("falls back to the user id when no student number was captured", async () => {
    // studentNumber is unique and not nullable, so an empty one would throw
    // and the approval would fail outright.
    db.user.findUnique.mockResolvedValue({
      id: STUDENT_ID, role: "STUDENT", firstName: "A", lastName: "B", idNumber: null,
    });

    await accounts.PATCH(patch({ userId: STUDENT_ID, decision: "APPROVE" }));

    expect(db.studentProfile.create.mock.calls[0][0].data.studentNumber).toBe(STUDENT_ID);
  });
});

describe("approving faculty", () => {
  it("creates no student record", async () => {
    db.user.findUnique.mockResolvedValue({
      id: FACULTY_ID, role: "FACULTY", firstName: "Ana", lastName: "Cruz", idNumber: "F-1",
    });

    const res = await accounts.PATCH(patch({ userId: FACULTY_ID, decision: "APPROVE" }));

    expect(res.status).toBe(200);
    expect(db.studentProfile.create).not.toHaveBeenCalled();
  });
});

describe("rejecting", () => {
  it("creates no student record", async () => {
    db.user.findUnique.mockResolvedValue({
      id: STUDENT_ID, role: "STUDENT", firstName: "A", lastName: "B", idNumber: "02-1",
    });

    const res = await accounts.PATCH(
      patch({ userId: STUDENT_ID, decision: "REJECT", reason: "Not enrolled" })
    );

    expect(res.status).toBe(200);
    expect(db.studentProfile.create).not.toHaveBeenCalled();
  });

  it("creates nothing when the request was already handled", async () => {
    db.user.updateMany.mockResolvedValue({ count: 0 });

    const res = await accounts.PATCH(patch({ userId: STUDENT_ID, decision: "APPROVE" }));

    expect(res.status).toBe(404);
    expect(db.studentProfile.create).not.toHaveBeenCalled();
  });
});

/**
 * The page itself. It is an async server component, so it can be called
 * directly and the element it returns inspected - no DOM needed.
 *
 * The dashboards are stubbed so the assertion is "which one did it choose",
 * not "did that component render".
 */
vi.mock("@/components/dashboard/admin-dashboard", () => ({
  AdminDashboard: function AdminDashboard() { return null; },
}));
vi.mock("@/components/dashboard/student-dashboard", () => ({
  StudentDashboard: function StudentDashboard() { return null; },
}));
vi.mock("@/components/dashboard/teacher-dashboard", () => ({
  TeacherDashboard: function TeacherDashboard() { return null; },
}));
vi.mock("@/components/dashboard/supervisor-dashboard", () => ({
  SupervisorDashboard: function SupervisorDashboard() { return null; },
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => { throw new Error(`redirect:${to}`); },
}));
vi.mock("@/lib/schedule-resolver", () => ({
  resolveScheduleForUser: vi.fn(async () => ({
    entries: [], source: "PERSONAL", section: null, sectionEntryCount: 0,
    readOnly: false, isStudent: true,
  })),
}));

const { default: DashboardPage } = await import("@/app/dashboard/page");
const { AdminDashboard } = await import("@/components/dashboard/admin-dashboard");

/** The component a render of the page resolved to. */
async function chosen(user: Record<string, unknown>) {
  session.current = { user };
  const el = (await DashboardPage()) as { type: unknown };
  return el.type;
}

describe("which dashboard the page hands back", () => {
  beforeEach(() => {
    db.user.count.mockResolvedValue(0);
    db.studentProfile.count.mockResolvedValue(0);
    db.classSession.count.mockResolvedValue(0);
    db.classSession.findMany.mockResolvedValue([]);
    db.classAttendance.count.mockResolvedValue(0);
    db.classAttendance.findMany.mockResolvedValue([]);
    db.studentEnrollment.count.mockResolvedValue(0);
    db.section.findMany.mockResolvedValue([]);
    db.$transaction.mockImplementation(async (ops) => Promise.all(ops));
  });

  it("does not give a student the administrator's dashboard", async () => {
    // The reported case: role STUDENT, studentProfileId null.
    const type = await chosen({ id: "u-1", role: "STUDENT", studentProfileId: null });
    expect(type).not.toBe(AdminDashboard);
    // And specifically: the "not set up yet" page, a plain element rather than
    // any dashboard. Without this the test would accept the student dashboard
    // being rendered against a null profile id, which queries on null.
    expect(type).toBe("div");
  });

  it("does not give a supervisor the administrator's dashboard either", async () => {
    const type = await chosen({ id: "u-3", role: "SUPERVISOR", supervisorRecordId: null });
    expect(type).not.toBe(AdminDashboard);
  });

  it("gives it only to an actual admin", async () => {
    const type = await chosen({ id: "u-admin", role: "ADMIN", studentProfileId: null });
    expect(type).toBe(AdminDashboard);
  });
});
