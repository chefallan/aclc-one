import { describe, it, expect } from "vitest";
import { hasPermission, hasAnyPermission, getRolePermissions } from "@/lib/permissions";
import { UserRole } from "@prisma/client";

describe("hasPermission", () => {
  it("gives the administrator the permissions that run the school", () => {
    expect(hasPermission("ADMIN", "account:approve")).toBe(true);
    expect(hasPermission("ADMIN", "user:manage")).toBe(true);
    expect(hasPermission("ADMIN", "student:import")).toBe(true);
  });

  it("allows student only student permissions", () => {
    expect(hasPermission("STUDENT", "time_in")).toBe(true);
    expect(hasPermission("STUDENT", "org:manage")).toBe(false);
  });

  it("allows teacher review permissions", () => {
    expect(hasPermission("FACULTY", "log:review")).toBe(true);
    expect(hasPermission("FACULTY", "time_in")).toBe(false);
  });

  it("allows org admin management permissions", () => {
    expect(hasPermission("ADMIN", "student:manage")).toBe(true);
    expect(hasPermission("ADMIN", "time_in")).toBe(false);
  });
});

describe("hasAnyPermission", () => {
  it("returns true if any permission matches", () => {
    expect(hasAnyPermission("FACULTY", ["log:review", "time_in"])).toBe(true);
  });
});

describe("getRolePermissions", () => {
  it("returns permissions for each role", () => {
    expect(getRolePermissions("STUDENT").length).toBeGreaterThan(0);
    expect(getRolePermissions("ADMIN").length).toBeGreaterThan(0);
  });
});
