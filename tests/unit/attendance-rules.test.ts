import { describe, it, expect } from "vitest";
import { resolveAttendanceStatus, DEFAULT_ATTENDANCE_RULES } from "@/lib/attendance-rules";

const start = new Date("2026-08-17T13:00:00.000Z");

describe("resolveAttendanceStatus", () => {
  it("marks an on-time arrival present", () => {
    const arrived = new Date("2026-08-17T13:00:00.000Z");
    expect(resolveAttendanceStatus(start, arrived, DEFAULT_ATTENDANCE_RULES)).toBe("PRESENT");
  });

  it("marks an arrival inside the grace window present", () => {
    const arrived = new Date("2026-08-17T13:14:59.000Z");
    expect(resolveAttendanceStatus(start, arrived, DEFAULT_ATTENDANCE_RULES)).toBe("PRESENT");
  });

  it("treats the grace boundary itself as present, not late", () => {
    const arrived = new Date("2026-08-17T13:15:00.000Z");
    expect(resolveAttendanceStatus(start, arrived, DEFAULT_ATTENDANCE_RULES)).toBe("PRESENT");
  });

  it("marks an arrival past the grace window late", () => {
    const arrived = new Date("2026-08-17T13:15:01.000Z");
    expect(resolveAttendanceStatus(start, arrived, DEFAULT_ATTENDANCE_RULES)).toBe("LATE");
  });

  it("honours a school's own grace period rather than the default", () => {
    const arrived = new Date("2026-08-17T13:20:00.000Z");

    expect(resolveAttendanceStatus(start, arrived, { ...DEFAULT_ATTENDANCE_RULES, lateGraceMinutes: 30 })).toBe(
      "PRESENT"
    );
    expect(resolveAttendanceStatus(start, arrived, { ...DEFAULT_ATTENDANCE_RULES, lateGraceMinutes: 5 })).toBe(
      "LATE"
    );
  });

  it("marks everything after the start late when grace is zero", () => {
    const rules = { ...DEFAULT_ATTENDANCE_RULES, lateGraceMinutes: 0 };
    expect(resolveAttendanceStatus(start, start, rules)).toBe("PRESENT");
    expect(resolveAttendanceStatus(start, new Date(start.getTime() + 1000), rules)).toBe("LATE");
  });

  it("does not mark an early arrival late", () => {
    const arrived = new Date("2026-08-17T12:45:00.000Z");
    expect(resolveAttendanceStatus(start, arrived, DEFAULT_ATTENDANCE_RULES)).toBe("PRESENT");
  });
});

