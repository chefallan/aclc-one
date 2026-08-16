import { UserRole } from "@prisma/client";

/**
 * ACLC One serves one college, so these are school permissions rather than
 * tenant tiers. Four roles, only two of which anyone can sign up as:
 *
 *   ADMIN       Runs the app. Approves accounts, manages the academic
 *               structure, the directory, and the library.
 *   FACULTY     Teachers and school employees — registrar, librarian,
 *               guidance. Self-registers with a faculty ID, then waits.
 *   STUDENT     Self-registers with a student number, then waits.
 *   SUPERVISOR  External staff at a host company. Created by an admin when a
 *               workplace is assigned; never self-registers, and sees only
 *               the students attached to them.
 */
export type Permission =
  | "account:approve"
  | "org:manage"
  | "org:view_metrics"
  | "academic_year:manage"
  | "program:manage"
  | "section:manage"
  | "student:manage"
  | "student:import"
  | "teacher:manage"
  | "workplace:manage"
  | "supervisor:manage"
  | "immersion:configure"
  | "immersion:assign"
  | "immersion:monitor"
  | "class_session:create"
  | "class_session:manage"
  | "attendance:view"
  | "attendance:manage"
  /** Maintain the official timetable for a section. */
  | "schedule:manage_section"
  /** Read another person's timetable. Staff-side; students see only their own. */
  | "schedule:view_any"
  | "attendance:view_class"
  /**
   * Scanning someone else's code. Instructor-side only, and deliberately not
   * held by STUDENT: attendance is only ever recorded by a person who is in
   * the room looking at the student in front of them.
   */
  | "attendance:scan"
  | "campus:find_staff"
  | "campus:join_queue"
  | "campus:set_presence"
  | "campus:manage_directory"
  | "library:manage"
  | "library:borrow"
  | "library:view"
  | "notes:create"
  | "notes:manage"
  | "notes:view_shared"
  | "study_buddy:chat"
  | "study_buddy:view_own_history"
  | "log:review"
  | "log:approve"
  | "supervisor:verify"
  | "report:generate"
  | "report:view"
  | "dashboard:view"
  | "ai:configure"
  | "ai:generate"
  | "user:manage"
  | "settings:manage"
  | "audit:view"
  | "time_in"
  | "time_out"
  | "log:create"
  | "log:edit_own"
  | "photo:upload"
  | "profile:view_own"
  | "progress:view_own"
  | "summary:view_own";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    // The one permission that gates the front door.
    "account:approve",
    "org:manage", "org:view_metrics", "user:manage", "settings:manage", "audit:view",
    "academic_year:manage", "program:manage", "section:manage",
    "student:manage", "student:import", "teacher:manage",
    "workplace:manage", "supervisor:manage",
    "immersion:configure", "immersion:assign", "immersion:monitor",
    "class_session:create", "class_session:manage",
    "attendance:view", "attendance:manage", "attendance:view_class",
    "schedule:manage_section", "schedule:view_any",
    "campus:find_staff", "campus:manage_directory", "campus:set_presence",
    "library:manage", "library:view", "notes:create", "notes:manage",
    "log:review", "log:approve", "supervisor:verify",
    "report:generate", "report:view", "dashboard:view",
    "ai:configure", "ai:generate",
    "study_buddy:chat", "study_buddy:view_own_history",
  ],

  FACULTY: [
    "class_session:create", "class_session:manage",
    "attendance:view", "attendance:view_class", "attendance:scan",
    "log:review", "log:approve",
    "immersion:monitor", "schedule:view_any",
    "report:view", "report:generate", "dashboard:view",
    "campus:find_staff", "campus:set_presence",
    "library:view", "notes:create", "notes:manage",
    "study_buddy:chat", "study_buddy:view_own_history",
    "progress:view_own",
  ],

  STUDENT: [
    // No "attendance:scan". A student presents their code; they never submit
    // one. Letting a student send a code they scanned is what made remote
    // check-in possible: photograph the board, message it to a friend at
    // home, and the friend is marked present.
    "time_in", "time_out", "log:create", "log:edit_own", "photo:upload",
    "profile:view_own", "progress:view_own", "summary:view_own",
    "campus:find_staff", "campus:join_queue",
    "library:borrow", "library:view",
    "notes:create", "notes:manage",
    "study_buddy:chat", "study_buddy:view_own_history",
    "dashboard:view",
  ],

  SUPERVISOR: [
    // Deliberately narrow: an external company employee sees the students
    // attached to them and nothing else about the school.
    "supervisor:verify", "log:review",
    "attendance:view", "dashboard:view", "progress:view_own",
    "notes:view_shared",
  ],
};

/** Roles a person may choose when signing up. Everything else is admin-created. */
export const SELF_REGISTERABLE_ROLES = ["STUDENT", "FACULTY"] as const;
export type SelfRegisterableRole = (typeof SELF_REGISTERABLE_ROLES)[number];

export function isSelfRegisterable(role: string): role is SelfRegisterableRole {
  return (SELF_REGISTERABLE_ROLES as readonly string[]).includes(role);
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Administrator",
  FACULTY: "Faculty & staff",
  STUDENT: "Student",
  SUPERVISOR: "Workplace supervisor",
};
