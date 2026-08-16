import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import path from "path";
import { hasPermission } from "@/lib/permissions";

/**
 * Attendance may only be recorded by someone standing in the room.
 *
 * A session-side code — projected on the board for students to scan — cannot
 * distinguish the classroom from the canteen. Photograph it, send it to a
 * friend at home, and they are marked present. These tests exist so that
 * pathway cannot be reintroduced without someone deliberately deleting them.
 */

const root = path.resolve(__dirname, "..", "..");

describe("the student-scans-the-room pathway stays removed", () => {
  it("has no route a student could post a session code to", () => {
    expect(existsSync(path.join(root, "src/app/api/class-sessions/[id]/attend"))).toBe(false);
  });

  it("has no route that mints a projectable session code", () => {
    expect(existsSync(path.join(root, "src/app/api/class-sessions/[id]/qr"))).toBe(false);
  });

  it("keeps the instructor-side scan route, which is the safe direction", () => {
    expect(existsSync(path.join(root, "src/app/api/class-sessions/[id]/scan-student"))).toBe(true);
  });

  it("no longer ships a component that displays a session code", () => {
    expect(existsSync(path.join(root, "src/components/class/qr-display.tsx"))).toBe(false);
  });
});

describe("only an instructor may record someone else's attendance", () => {
  it("students cannot scan", () => {
    // A student presents a code; they never submit one.
    expect(hasPermission("STUDENT", "attendance:scan")).toBe(false);
  });

  it("faculty can", () => {
    expect(hasPermission("FACULTY", "attendance:scan")).toBe(true);
  });

  it("supervisors and admins do not scan class attendance", () => {
    expect(hasPermission("SUPERVISOR", "attendance:scan")).toBe(false);
    expect(hasPermission("ADMIN", "attendance:scan")).toBe(false);
  });

  it("students keep the things that are genuinely theirs to do", () => {
    for (const p of ["time_in", "log:create", "photo:upload"] as const) {
      expect(hasPermission("STUDENT", p)).toBe(true);
    }
  });
});
