import { describe, it, expect } from "vitest";
import { signUpSchema, accountDecisionSchema } from "@/lib/validation";
import { hasPermission, isSelfRegisterable, SELF_REGISTERABLE_ROLES } from "@/lib/permissions";

const valid = {
  email: "kim.aguilar@student.aclcormoc.edu.ph",
  password: "correct-horse",
  firstName: "Kim",
  lastName: "Aguilar",
  role: "STUDENT" as const,
  idNumber: "02-2223-04902",
};

describe("sign-up: what a person may claim for themselves", () => {
  it("accepts a student with a student number", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts faculty with a faculty ID", () => {
    expect(signUpSchema.safeParse({ ...valid, role: "FACULTY", idNumber: "F-2021-0088" }).success).toBe(
      true
    );
  });

  it("refuses an attempt to sign up as an administrator", () => {
    // The whole privilege model rests on this: the request body cannot name
    // a role that grants approval rights.
    const result = signUpSchema.safeParse({ ...valid, role: "ADMIN" });
    expect(result.success).toBe(false);
  });

  it("refuses an attempt to sign up as a workplace supervisor", () => {
    expect(signUpSchema.safeParse({ ...valid, role: "SUPERVISOR" }).success).toBe(false);
  });

  it("has no way to set a status, so nobody can arrive approved", () => {
    const result = signUpSchema.safeParse({ ...valid, status: "ACTIVE" });
    expect(result.success).toBe(true);
    // Even when the field is sent, it is not in the parsed output the route uses.
    if (result.success) {
      expect("status" in result.data).toBe(false);
    }
  });

  it("requires an ID number", () => {
    expect(signUpSchema.safeParse({ ...valid, idNumber: "" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, idNumber: "ab" }).success).toBe(false);
  });

  it("rejects an ID number with characters a register would never contain", () => {
    for (const bad of ["02/2223", "kim aguilar", "<script>", "-leading"]) {
      expect(signUpSchema.safeParse({ ...valid, idNumber: bad }).success).toBe(false);
    }
  });

  it("keeps the password floor at 8 characters", () => {
    expect(signUpSchema.safeParse({ ...valid, password: "short" }).success).toBe(false);
  });
});

describe("self-registerable roles", () => {
  it("is exactly student and faculty", () => {
    expect([...SELF_REGISTERABLE_ROLES].sort()).toEqual(["FACULTY", "STUDENT"]);
  });

  it("never includes a role that can approve accounts", () => {
    for (const role of SELF_REGISTERABLE_ROLES) {
      expect(hasPermission(role, "account:approve")).toBe(false);
    }
  });

  it("recognises only those two", () => {
    expect(isSelfRegisterable("STUDENT")).toBe(true);
    expect(isSelfRegisterable("FACULTY")).toBe(true);
    expect(isSelfRegisterable("ADMIN")).toBe(false);
    expect(isSelfRegisterable("SUPERVISOR")).toBe(false);
  });
});

describe("who may approve", () => {
  it("only the administrator", () => {
    expect(hasPermission("ADMIN", "account:approve")).toBe(true);
    expect(hasPermission("FACULTY", "account:approve")).toBe(false);
    expect(hasPermission("STUDENT", "account:approve")).toBe(false);
    expect(hasPermission("SUPERVISOR", "account:approve")).toBe(false);
  });
});

describe("approval decisions", () => {
  it("accepts approve and reject", () => {
    const id = "cl00000000000000000000usr";
    expect(accountDecisionSchema.safeParse({ userId: id, decision: "APPROVE" }).success).toBe(true);
    expect(
      accountDecisionSchema.safeParse({ userId: id, decision: "REJECT", reason: "Not on the register" })
        .success
    ).toBe(true);
  });

  it("refuses an invented decision", () => {
    expect(
      accountDecisionSchema.safeParse({ userId: "cl00000000000000000000usr", decision: "PROMOTE" })
        .success
    ).toBe(false);
  });
});

describe("a workplace supervisor stays outside the school", () => {
  it("cannot manage students, the directory, or the library", () => {
    for (const p of ["student:manage", "campus:manage_directory", "library:manage", "user:manage"] as const) {
      expect(hasPermission("SUPERVISOR", p)).toBe(false);
    }
  });

  it("can still verify the immersion hours it exists to verify", () => {
    expect(hasPermission("SUPERVISOR", "supervisor:verify")).toBe(true);
    expect(hasPermission("SUPERVISOR", "log:review")).toBe(true);
  });
});
