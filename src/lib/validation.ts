import { z } from "zod";
import { UserRole, AcademicYearStatus, ProgramStatus, SectionStatus, EnrollmentStatus, WorkplaceStatus, ImmersionStatus, TaskCategory, AttendanceStatus, ActivityLogStatus, VerificationStatus, ReviewStatus, AiSummaryType, AuditAction, NotificationType, ReportType, ReportFormat } from "@prisma/client";

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Sign-up for the one college this app serves. No organisation is created —
 * the school already exists — and the role is limited to the two a person may
 * claim for themselves. An administrator checks the ID number before the
 * account can be used.
 */
export const signUpSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters"),
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  role: z.enum(["STUDENT", "FACULTY"], {
    message: "Choose whether you are a student or faculty",
  }),
  idNumber: z
    .string()
    .trim()
    .min(3, "Enter your student number or faculty ID")
    .max(40)
    .regex(/^[A-Za-z0-9][A-Za-z0-9-]*$/, "Use only letters, numbers and dashes"),
});

export const accountDecisionSchema = z.object({
  userId: z.string().cuid(),
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().max(240).optional(),
});

export const passwordResetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// ─── ORGANIZATION ────────────────────────────────────────────────────────────

// ─── ACADEMIC ────────────────────────────────────────────────────────────────

export const academicYearSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: z.nativeEnum(AcademicYearStatus).default("ACTIVE"),
});

export const programSchema = z.object({
  code: z.string().min(1, "Code is required").max(50),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
});

export const sectionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  yearLevel: z.coerce.number().int().min(1).max(10),
  academicYearId: z.string().cuid(),
  programId: z.string().cuid(),
  adviserId: z.string().cuid().optional(),
});

// ─── STUDENT ─────────────────────────────────────────────────────────────────

export const studentProfileSchema = z.object({
  studentNumber: z.string().min(1, "Student number is required").max(50),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  middleName: z.string().max(100).optional(),
  suffix: z.string().max(20).optional(),
  dateOfBirth: z.coerce.date().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  emergencyRelation: z.string().optional(),
});

export const studentEnrollmentSchema = z.object({
  studentId: z.string().cuid(),
  academicYearId: z.string().cuid(),
  programId: z.string().cuid(),
  sectionId: z.string().cuid(),
  yearLevel: z.coerce.number().int().min(1).max(10),
});

// ─── WORKPLACE ─────────────────────────────────────────────────────────────────

export const workplaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  industry: z.string().optional(),
  address: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  contactPerson: z.string().optional(),
  notes: z.string().optional(),
});

export const supervisorSchema = z.object({
  userId: z.string().cuid(),
  workplaceId: z.string().cuid(),
  position: z.string().min(1, "Position is required").max(200),
});

// ─── IMMERSION ───────────────────────────────────────────────────────────────

export const immersionProgramSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  requiredHours: z.coerce.number().int().min(1).max(10000),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  academicYearId: z.string().cuid(),
  rules: z.object({
    breakMinutes: z.number().int().default(60),
    minSessionMinutes: z.number().int().default(30),
    maxDailyHours: z.number().default(8),
    roundingMinutes: z.number().int().default(15),
    overtimeThreshold: z.number().default(8),
  }).optional(),
});

export const immersionAssignmentSchema = z.object({
  studentId: z.string().cuid(),
  enrollmentId: z.string().cuid(),
  immersionProgramId: z.string().cuid(),
  workplaceId: z.string().cuid(),
  supervisorId: z.string().cuid().optional(),
  coordinatorId: z.string().cuid().optional(),
  teacherId: z.string().cuid().optional(),
  startDate: z.coerce.date(),
  expectedEndDate: z.coerce.date(),
  requiredHours: z.coerce.number().int().min(1),
});

// ─── TIME TRACKING ───────────────────────────────────────────────────────────

export const timeInSchema = z.object({
  assignmentId: z.string().cuid(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  locationAccuracy: z.number().optional(),
  notes: z.string().optional(),
});

export const timeOutSchema = z.object({
  sessionId: z.string().cuid(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional(),
});

// ─── ACTIVITY LOGS ───────────────────────────────────────────────────────────

export const activityLogSchema = z.object({
  assignmentId: z.string().cuid(),
  workSessionId: z.string().cuid(),
  taskDescription: z.string().min(1, "Task description is required").max(2000),
  learningDescription: z.string().max(2000).optional(),
  taskCategory: z.nativeEnum(TaskCategory),
  timestamp: z.coerce.date(),
});

// ─── VERIFICATION & REVIEW ─────────────────────────────────────────────────────

export const supervisorVerificationSchema = z.object({
  assignmentId: z.string().cuid(),
  date: z.coerce.date(),
  hours: z.coerce.number().min(0).max(24),
  logCount: z.coerce.number().int().min(0),
  remarks: z.string().max(2000).optional(),
  status: z.nativeEnum(VerificationStatus),
});

export const teacherReviewSchema = z.object({
  assignmentId: z.string().cuid(),
  date: z.coerce.date(),
  remarks: z.string().max(2000).optional(),
  status: z.nativeEnum(ReviewStatus),
});

// ─── CLASS SESSIONS ────────────────────────────────────────────────────────────

export const classSessionSchema = z.object({
  sectionId: z.string().cuid(),
  subject: z.string().min(1, "Subject is required").max(200),
  room: z.string().min(1, "Room is required").max(100),
  date: z.coerce.date(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});

// ─── LIBRARY ───────────────────────────────────────────────────────────────────

export const libraryItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  author: z.string().max(200).optional(),
  publisher: z.string().max(200).optional(),
  description: z.string().optional(),
  type: z.enum(["BOOK", "EBOOK", "JOURNAL", "THESIS", "MODULE", "HANDOUT", "VIDEO", "AUDIO", "LINK"]),
  categoryId: z.string().cuid(),
  fileUrl: z.string().url().optional().or(z.literal("")),
  externalUrl: z.string().url().optional().or(z.literal("")),
  tags: z.array(z.string()).default([]),
  yearPublished: z.coerce.number().int().min(1900).max(2100).optional(),
  totalCopies: z.coerce.number().int().min(1).default(1),
});

export const libraryCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  color: z.string().default("#3b82f6"),
});

// ─── NOTES ─────────────────────────────────────────────────────────────────────

export const noteSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(1, "Content is required"),
  summary: z.string().optional(),
  tags: z.array(z.string()).default([]),
  visibility: z.enum(["PRIVATE", "SHARED", "PUBLIC"]).default("PRIVATE"),
  folderId: z.string().cuid().optional(),
  color: z.string().optional(),
});

export const noteFolderSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  color: z.string().default("#f59e0b"),
});

// ─── STUDY BUDDY ───────────────────────────────────────────────────────────────

export const studyBuddyProfileSchema = z.object({
  bio: z.string().optional(),
  subjects: z.array(z.string()).default([]),
  studyGoals: z.string().optional(),
  preferredLocation: z.string().optional(),
  availability: z.record(z.string(), z.array(z.object({ start: z.string(), end: z.string() }))).optional(),
});

export const studyBuddyMatchSchema = z.object({
  receiverId: z.string().cuid(),
  message: z.string().optional(),
});

export const studySessionSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  topic: z.string().optional(),
  scheduledAt: z.coerce.date(),
  durationMinutes: z.coerce.number().int().min(15).max(480).default(60),
  location: z.string().optional(),
  notes: z.string().optional(),
});

// ─── SEARCH / FILTER ─────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// ─── PERSONAL TIMETABLE ──────────────────────────────────────────────────────

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const scheduleEntrySchema = z
  .object({
    subjectCode: z.string().trim().min(1, "Enter the subject code").max(20),
    subjectTitle: z.string().trim().max(120).optional().or(z.literal("")),
    day: z.enum([
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY",
    ]),
    startTime: z.string().regex(HHMM, "Use a 24-hour time like 13:00"),
    endTime: z.string().regex(HHMM, "Use a 24-hour time like 16:00"),
    room: z.string().trim().max(40).optional().or(z.literal("")),
    instructor: z.string().trim().max(80).optional().or(z.literal("")),
  })
  .refine((v) => v.endTime > v.startTime, {
    message: "The class has to end after it starts",
    path: ["endTime"],
  });

export const scheduleEntryUpdateSchema = z.object({
  id: z.string().cuid(),
  /** Set when the person has seen the clash and wants it anyway. */
  allowClash: z.boolean().optional(),
});
