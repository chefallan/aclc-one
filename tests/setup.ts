import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Prisma for unit tests
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    $transaction: vi.fn((fn) => fn({})),
    user: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    organization: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    studentProfile: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    immersionAssignment: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    workSession: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    activityLog: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    academicYear: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    program: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    section: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    workplace: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    immersionProgram: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    attendanceRecord: { findMany: vi.fn(), upsert: vi.fn(), update: vi.fn(), count: vi.fn() },
    supervisorVerification: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    teacherReview: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    aiSummary: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    subscription: { findMany: vi.fn(), create: vi.fn() },
    plan: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    auditLog: { create: vi.fn() },
    notification: { create: vi.fn(), findMany: vi.fn() },
    report: { findMany: vi.fn(), create: vi.fn() },
    studentEnrollment: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    workplaceSupervisor: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    photoEvidence: { findMany: vi.fn(), create: vi.fn() },
  },
}));
