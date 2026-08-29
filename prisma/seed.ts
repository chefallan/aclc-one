// Loads .env before anything reads process.env. Without this, the documented
// `npm run db:seed` fails with "DATABASE_URL is required" even when .env is
// present, because tsx does not load dotenv on its own.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { seedCampus } from "./seed-campus";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const STUDENTS = [
  { studentNumber: "02-2223-04891", firstName: "Juan", lastName: "Dela Cruz", email: "juan.delacruz@student.aclcormoc.edu.ph" },
  { studentNumber: "02-2223-04892", firstName: "Maria", lastName: "Garcia", email: "maria.garcia@student.aclcormoc.edu.ph" },
  { studentNumber: "02-2223-04893", firstName: "Pedro", lastName: "Reyes", email: "pedro.reyes@student.aclcormoc.edu.ph" },
  { studentNumber: "02-2223-04894", firstName: "Ana", lastName: "Santos", email: "ana.santos@student.aclcormoc.edu.ph" },
  { studentNumber: "02-2223-04895", firstName: "Miguel", lastName: "Lim", email: "miguel.lim@student.aclcormoc.edu.ph" },
  { studentNumber: "02-2223-04896", firstName: "Sofia", lastName: "Tan", email: "sofia.tan@student.aclcormoc.edu.ph" },
  { studentNumber: "02-2223-04897", firstName: "Carlos", lastName: "Bautista", email: "carlos.bautista@student.aclcormoc.edu.ph" },
  { studentNumber: "02-2223-04898", firstName: "Isabella", lastName: "Ramos", email: "isabella.ramos@student.aclcormoc.edu.ph" },
  { studentNumber: "02-2223-04899", firstName: "Rafael", lastName: "Flores", email: "rafael.flores@student.aclcormoc.edu.ph" },
  { studentNumber: "02-2223-04900", firstName: "Carmen", lastName: "Villanueva", email: "carmen.villanueva@student.aclcormoc.edu.ph" },
];

/**
 * Is this a database it is safe to fill with demo data?
 *
 * Only a local one. NODE_ENV is the wrong question: it reads "development" on
 * a laptop whose DATABASE_URL points at the live Supabase, which is exactly
 * how this seed once ran against a real school's database and created an
 * administrator whose password is published in this file.
 *
 * The host is the honest signal.
 */
function isLocalDatabase(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "db";
  } catch {
    return false;
  }
}

function refuseInProduction() {
  if (process.env.SEED_ANYWAY === "1") return;

  if (!isLocalDatabase(process.env.DATABASE_URL)) {
    let where = "an unreadable DATABASE_URL";
    try {
      where = new URL(process.env.DATABASE_URL ?? "").hostname;
    } catch {
      /* keep the fallback */
    }
    console.error("");
    console.error(`  Refusing to seed: DATABASE_URL points at ${where}, which is not local.`);
    console.error("  This seed creates accounts sharing one published password,");
    console.error("  including an administrator. It belongs on a local database only.");
    console.error("");
    console.error("  If you genuinely mean it, re-run with SEED_ANYWAY=1.");
    console.error("");
    process.exit(1);
  }

  if (process.env.NODE_ENV !== "production") return;
  console.error("");
  console.error("  Refusing to seed: NODE_ENV=production.");
  console.error("  These accounts share one published password and include an admin.");
  console.error("  If you really mean it, re-run with SEED_ANYWAY=1.");
  console.error("");
  process.exit(1);
}

async function main() {
  refuseInProduction();
  console.log("Seeding ACLC College of Ormoc…");

  // One school. Not a tenant — the row that holds the profile and the rules
  // the college configures for itself.
  const school = await prisma.school.create({
    data: {
      name: "ACLC College of Ormoc",
      legalName: "ACLC College of Ormoc",
      address: "ACLC Bldg., Aviles St., Ormoc City, Leyte, Philippines",
      contactEmail: "admin@aclcormoc.edu.ph",
      contactPhone: "+63 53 561 1234",
      timezone: "Asia/Manila",
    },
  });
  console.log(`Created school: ${school.name}`);

  const passwordHash = await bcrypt.hash("password123", 12);
  // Seeded accounts are pre-approved so a developer can sign in immediately.
  const approved = {
    status: "ACTIVE" as const,
    approvedAt: new Date(),
    emailVerifiedAt: new Date(),
  };

  await prisma.user.create({
    data: {
      email: "admin@aclcormoc.edu.ph",
      passwordHash,
      firstName: "Maria",
      lastName: "Santos",
      role: "ADMIN",
      idNumber: "F-2015-0001",
      ...approved,
    },
  });

  const faculty = await prisma.user.create({
    data: {
      email: "teacher@aclcormoc.edu.ph",
      passwordHash,
      firstName: "Ana",
      lastName: "Cruz",
      role: "FACULTY",
      idNumber: "F-2018-0044",
      ...approved,
    },
  });

  console.log("Created admin and faculty accounts");

  const academicYear = await prisma.academicYear.create({
    data: {
      name: "2026-2027",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2027-03-31"),
      status: "ACTIVE",
    },
  });

  const programs = await Promise.all([
    prisma.program.create({ data: { code: "BSIT", name: "BS Information Technology" } }),
    prisma.program.create({ data: { code: "BSCS", name: "BS Computer Science" } }),
    prisma.program.create({ data: { code: "BSBA", name: "BS Business Administration" } }),
    prisma.program.create({ data: { code: "BSHM", name: "BS Hospitality Management" } }),
    prisma.program.create({ data: { code: "WADT", name: "Web & App Development Technology" } }),
  ]);

  const sections = await Promise.all([
    prisma.section.create({
      data: {
        name: "BSIT-4A",
        yearLevel: 4,
        academicYearId: academicYear.id,
        programId: programs[0].id,
        adviserId: faculty.id,
      },
    }),
    prisma.section.create({
      data: {
        name: "BSIT-4B",
        yearLevel: 4,
        academicYearId: academicYear.id,
        programId: programs[0].id,
      },
    }),
    prisma.section.create({
      data: {
        name: "BSCS-4A",
        yearLevel: 4,
        academicYearId: academicYear.id,
        programId: programs[1].id,
      },
    }),
    prisma.section.create({
      data: {
        name: "WADT-1C",
        yearLevel: 1,
        academicYearId: academicYear.id,
        programId: programs[4].id,
      },
    }),
  ]);

  const wadt1c = sections[3];

  console.log("Created academic structure");

  const students: Array<{ id: string; enrollmentId: string; name: string }> = [];
  for (const s of STUDENTS) {
    const user = await prisma.user.create({
      data: {
        email: s.email,
        passwordHash,
        firstName: s.firstName,
        lastName: s.lastName,
        role: "STUDENT",
        idNumber: s.studentNumber,
        ...approved,
      },
    });

    const profile = await prisma.studentProfile.create({
      data: {
        studentNumber: s.studentNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        userId: user.id,
        qrCodeToken: crypto.randomUUID(),
      },
    });

    const enrollment = await prisma.studentEnrollment.create({
      data: {
        studentId: profile.id,
        academicYearId: academicYear.id,
        programId: programs[0].id,
        sectionId: sections[0].id,
        yearLevel: 4,
      },
    });

    students.push({
      id: profile.id,
      enrollmentId: enrollment.id,
      name: `${s.firstName} ${s.lastName}`,
    });
  }

  console.log(`Created ${students.length} students`);

  // A session running this afternoon, with the first six students marked.
  const today = new Date();
  const at = (hour: number, minute = 0) => {
    const d = new Date(today);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  const classSession = await prisma.classSession.create({
    data: {
      date: new Date(today.toDateString()),
      startTime: at(13, 0),
      endTime: at(16, 0),
      room: "RM 304",
      subject: "Systems Integration & Architecture",
      status: "ACTIVE",
      sectionId: sections[0].id,
      teacherId: faculty.id,
    },
  });

  for (const [i, student] of students.slice(0, 6).entries()) {
    await prisma.classAttendance.create({
      data: {
        classSessionId: classSession.id,
        studentId: student.id,
        method: "QR",
        status: i === 5 ? "LATE" : "PRESENT",
        scannedAt: at(13, i * 3),
      },
    });
  }

  console.log("Created a class session with 6 attendance records");

  await seedCampus({ prisma, passwordHash, students });

  // ── Work immersion ──────────────────────────────────────────────────────
  // A host company, its supervisor, and three students placed there. Without
  // this the SUPERVISOR role has no demo account and no data to sign in to.
  const workplace = await prisma.workplace.create({
    data: {
      name: "Tech Solutions Ormoc",
      industry: "Information Technology",
      address: "Real St., Ormoc City, Leyte",
      contactEmail: "hr@techsolutions.ph",
      contactPhone: "+63 53 255 7788",
      contactPerson: "John_Smith",
    },
  });

  const supervisorUser = await prisma.user.create({
    data: {
      email: "supervisor@techsolutions.ph",
      passwordHash,
      firstName: "John",
      lastName: "Smith",
      role: "SUPERVISOR",
      ...approved,
    },
  });

  const supervisor = await prisma.workplaceSupervisor.create({
    data: {
      userId: supervisorUser.id,
      workplaceId: workplace.id,
      position: "IT Operations Lead",
    },
  });

  const immersionProgram = await prisma.immersionProgram.create({
    data: {
      name: "Work Immersion 2026–2027",
      description: "BSIT fourth-year work immersion.",
      requiredHours: 80,
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-10-31"),
      status: "ACTIVE",
      academicYearId: academicYear.id,
    },
  });

  const placed = students.slice(0, 3);
  const assignments = [];
  for (const [i, student] of placed.entries()) {
    const assignment = await prisma.immersionAssignment.create({
      data: {
        studentId: student.id,
        enrollmentId: student.enrollmentId,
        immersionProgramId: immersionProgram.id,
        workplaceId: workplace.id,
        supervisorId: supervisor.id,
        teacherId: faculty.id,
        academicYearId: academicYear.id,
        startDate: new Date("2026-08-01"),
        expectedEndDate: new Date("2026-10-31"),
        requiredHours: 80,
        // Three students at different points, so progress bars are not all
        // the same number.
        completedHours: [62.5, 41, 8][i],
        status: "ACTIVE",
      },
    });
    assignments.push(assignment);
  }

  // One completed day for the first student, with the hourly logs a
  // supervisor would be verifying.
  const dayStart = new Date(today);
  dayStart.setDate(dayStart.getDate() - 1);
  const on = (hour: number) => {
    const d = new Date(dayStart);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  const workSession = await prisma.workSession.create({
    data: {
      studentId: placed[0].id,
      assignmentId: assignments[0].id,
      timeIn: on(8),
      timeOut: on(17),
      durationMinutes: 8 * 60,
      timezone: "Asia/Manila",
      status: "COMPLETED",
    },
  });

  const LOGS: Array<[number, string, string, "TASK" | "TRAINING" | "MEETING" | "DOCUMENTATION"]> = [
    [9, "Set up three workstations for the accounting team.", "How to image a machine from a master build.", "TASK"],
    [10, "Shadowed the helpdesk queue.", "Most tickets are password resets — the fix is process, not tech.", "TRAINING"],
    [11, "Traced a network fault to a faulty patch cable.", "Check layer one before blaming the switch.", "TASK"],
    [13, "Sat in on the sprint stand-up.", "How the team splits work when a deadline moves.", "MEETING"],
    [14, "Wrote up the workstation build steps.", "Documentation is what makes the second time faster.", "DOCUMENTATION"],
    [15, "Helped migrate mailboxes for two staff.", "Backups get taken before, not after.", "TASK"],
  ];

  for (const [hour, task, learning, category] of LOGS) {
    await prisma.activityLog.create({
      data: {
        studentId: placed[0].id,
        assignmentId: assignments[0].id,
        workSessionId: workSession.id,
        timestamp: on(hour),
        taskDescription: task,
        learningDescription: learning,
        taskCategory: category,
        status: "SUBMITTED",
      },
    });
  }

  console.log(
    `Created work immersion: 1 workplace, 1 supervisor, ${assignments.length} placements, ${LOGS.length} activity logs`
  );

  // Juan has plotted his week, so the home screen and the grid have something
  // to show. MWF and TTh are how subjects actually meet here, which is why a
  // subject becomes one entry per day.
  const juan = await prisma.user.findUnique({
    where: { email: "juan.delacruz@student.aclcormoc.edu.ph" },
    select: { id: true },
  });

  if (juan) {
    const MWF = ["MONDAY", "WEDNESDAY", "FRIDAY"] as const;
    const TTH = ["TUESDAY", "THURSDAY"] as const;

    const plotted: Array<{
      subjectCode: string;
      subjectTitle: string;
      days: readonly ("MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY")[];
      startTime: string;
      endTime: string;
      room: string;
      instructor: string;
    }> = [
      { subjectCode: "CC 105", subjectTitle: "Data Structures", days: MWF, startTime: "08:00", endTime: "09:30", room: "COMLAB 2", instructor: "Sir Ryan Cabahug" },
      { subjectCode: "GE 8", subjectTitle: "Ethics", days: TTH, startTime: "10:00", endTime: "11:30", room: "RM 208", instructor: "Ma'am Aleli Lumapas" },
      { subjectCode: "IT 402", subjectTitle: "Systems Integration & Architecture", days: MWF, startTime: "13:00", endTime: "16:00", room: "RM 304", instructor: "Sir Jomar Bactol" },
      { subjectCode: "IT 401", subjectTitle: "Capstone 2", days: TTH, startTime: "13:00", endTime: "16:00", room: "RM 301", instructor: "Sir Jomar Bactol" },
      { subjectCode: "PE 4", subjectTitle: "Physical Education 4", days: ["SATURDAY"], startTime: "08:00", endTime: "10:00", room: "GYM", instructor: "Sir Dennis Amper" },
    ];

    let count = 0;
    for (const subject of plotted) {
      for (const day of subject.days) {
        await prisma.scheduleEntry.create({
          data: {
            userId: juan.id,
            subjectCode: subject.subjectCode,
            subjectTitle: subject.subjectTitle,
            day,
            startTime: subject.startTime,
            endTime: subject.endTime,
            room: subject.room,
            instructor: subject.instructor,
          },
        });
        count += 1;
      }
    }
    console.log(`Plotted a schedule for Juan: ${plotted.length} subjects, ${count} weekly slots`);

    // Juan is the one student who has stepped off the block schedule, so both
    // paths are visible in a fresh database: everyone else in BSIT-4A reads
    // the section's timetable, Juan reads his own.
    await prisma.studentProfile.update({
      where: { userId: juan.id },
      data: { scheduleSource: "PERSONAL" },
    });
  }

  // The official block schedules. These are what a student sees by default —
  // the registrar maintains them and the whole section stays in step.
  const BLOCKS: Array<{
    sectionId: string;
    label: string;
    subjects: Array<{
      subjectCode: string;
      subjectTitle: string;
      days: readonly ("MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY")[];
      startTime: string;
      endTime: string;
      room: string;
      instructor: string;
    }>;
  }> = [
    {
      sectionId: sections[0].id,
      label: "BSIT-4A",
      subjects: [
        { subjectCode: "CC 105", subjectTitle: "Data Structures", days: ["MONDAY", "WEDNESDAY", "FRIDAY"], startTime: "08:00", endTime: "09:30", room: "COMLAB 2", instructor: "Sir Ryan Cabahug" },
        { subjectCode: "GE 8", subjectTitle: "Ethics", days: ["TUESDAY", "THURSDAY"], startTime: "10:00", endTime: "11:30", room: "RM 208", instructor: "Ma'am Aleli Lumapas" },
        { subjectCode: "IT 402", subjectTitle: "Systems Integration & Architecture", days: ["MONDAY", "WEDNESDAY", "FRIDAY"], startTime: "13:00", endTime: "16:00", room: "RM 304", instructor: "Sir Jomar Bactol" },
        { subjectCode: "IT 401", subjectTitle: "Capstone 2", days: ["TUESDAY", "THURSDAY"], startTime: "13:00", endTime: "16:00", room: "RM 301", instructor: "Sir Jomar Bactol" },
      ],
    },
    {
      sectionId: wadt1c.id,
      label: "WADT-1C",
      subjects: [
        { subjectCode: "WD 101", subjectTitle: "Web Fundamentals", days: ["MONDAY", "WEDNESDAY"], startTime: "07:30", endTime: "09:00", room: "COMLAB 1", instructor: "Sir Ryan Cabahug" },
        { subjectCode: "PROG 101", subjectTitle: "Introduction to Programming", days: ["MONDAY", "WEDNESDAY", "FRIDAY"], startTime: "09:00", endTime: "10:30", room: "COMLAB 3", instructor: "Sir Jomar Bactol" },
        { subjectCode: "GE 1", subjectTitle: "Understanding the Self", days: ["TUESDAY", "THURSDAY"], startTime: "08:00", endTime: "09:30", room: "RM 105", instructor: "Ma'am Aleli Lumapas" },
        { subjectCode: "GE 3", subjectTitle: "Mathematics in the Modern World", days: ["TUESDAY", "THURSDAY"], startTime: "10:00", endTime: "11:30", room: "RM 106", instructor: "Ma'am Rhea Salvatierra" },
        { subjectCode: "WD 102", subjectTitle: "Front-End Development", days: ["FRIDAY"], startTime: "13:00", endTime: "16:00", room: "COMLAB 1", instructor: "Sir Ryan Cabahug" },
        { subjectCode: "PE 1", subjectTitle: "Physical Education 1", days: ["SATURDAY"], startTime: "08:00", endTime: "10:00", room: "GYM", instructor: "Sir Dennis Amper" },
      ],
    },
  ];

  for (const block of BLOCKS) {
    let slots = 0;
    for (const subject of block.subjects) {
      for (const day of subject.days) {
        await prisma.sectionScheduleEntry.create({
          data: {
            sectionId: block.sectionId,
            subjectCode: subject.subjectCode,
            subjectTitle: subject.subjectTitle,
            day,
            startTime: subject.startTime,
            endTime: subject.endTime,
            room: subject.room,
            instructor: subject.instructor,
          },
        });
        slots += 1;
      }
    }
    console.log(
      `Published ${block.label}'s block schedule: ${block.subjects.length} subjects, ${slots} weekly slots`
    );
  }

  // Two first-years in WADT-1C, so the block schedule has someone reading it
  // who is not also carrying an immersion placement.
  const WADT_STUDENTS = [
    { email: "liza.montero@student.aclcormoc.edu.ph", firstName: "Liza", lastName: "Montero", studentNumber: "02-2627-01188" },
    { email: "ben.solano@student.aclcormoc.edu.ph", firstName: "Ben", lastName: "Solano", studentNumber: "02-2627-01204" },
  ];

  for (const s of WADT_STUDENTS) {
    const user = await prisma.user.create({
      data: {
        email: s.email,
        passwordHash,
        firstName: s.firstName,
        lastName: s.lastName,
        role: "STUDENT",
        idNumber: s.studentNumber,
        ...approved,
      },
    });

    const profile = await prisma.studentProfile.create({
      data: {
        studentNumber: s.studentNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        userId: user.id,
        qrCodeToken: crypto.randomUUID(),
      },
    });

    await prisma.studentEnrollment.create({
      data: {
        studentId: profile.id,
        academicYearId: academicYear.id,
        programId: programs[4].id,
        sectionId: wadt1c.id,
        yearLevel: 1,
      },
    });
  }

  console.log(`Enrolled ${WADT_STUDENTS.length} students in WADT-1C`);

  // Two accounts sitting in the approval queue, so the admin screen has
  // something real to act on the first time it is opened.
  await prisma.user.createMany({
    data: [
      {
        email: "kim.aguilar@student.aclcormoc.edu.ph",
        passwordHash,
        firstName: "Kim",
        lastName: "Aguilar",
        role: "STUDENT",
        idNumber: "02-2223-04902",
        status: "PENDING",
      },
      {
        email: "marc.tabudlong@aclcormoc.edu.ph",
        passwordHash,
        firstName: "Marc",
        lastName: "Tabudlong",
        role: "FACULTY",
        idNumber: "F-2021-0088",
        status: "PENDING",
      },
    ],
  });

  console.log("Created 2 pending account requests");

  const blank = () => console.log("");

  blank();
  console.log("------------------------------------------------------------------");
  console.log("  DEMO ACCOUNTS - password123 for every one of them");
  console.log("  Development only. Never seed these into a real deployment.");
  console.log("------------------------------------------------------------------");

  blank();
  console.log("  ADMIN - runs the app, approves accounts");
  console.log("    admin@aclcormoc.edu.ph");

  blank();
  console.log("  FACULTY & STAFF");
  console.log("    teacher@aclcormoc.edu.ph           Ana Cruz, adviser of BSIT-4A");
  console.log("    rhea.salvatierra@aclcormoc.edu.ph  Registrar, has a live queue");
  console.log("    ivy.gantalao@aclcormoc.edu.ph      Librarian, 2F");
  console.log("    jomar.bactol@aclcormoc.edu.ph      Program Head, in class");
  console.log("    aleli.lumapas@aclcormoc.edu.ph     Guidance, hidden from the finder");

  blank();
  console.log("  STUDENTS");
  console.log("    juan.delacruz@student.aclcormoc.edu.ph  on immersion, 62.5/80 h; own timetable");
  console.log("    maria.garcia@student.aclcormoc.edu.ph   on immersion, 41/80 h; follows BSIT-4A");
  console.log("    pedro.reyes@student.aclcormoc.edu.ph    on immersion, 8/80 h");
  console.log("    ana.santos@student.aclcormoc.edu.ph     no placement yet");
  console.log("    liza.montero@student.aclcormoc.edu.ph   1st year, follows WADT-1C");
  console.log("    ben.solano@student.aclcormoc.edu.ph     1st year, follows WADT-1C");

  blank();
  console.log("  WORKPLACE SUPERVISOR - external, sees only his own students");
  console.log("    supervisor@techsolutions.ph");

  blank();
  console.log("  WAITING FOR APPROVAL - sign in refused until an admin approves");
  console.log("    kim.aguilar@student.aclcormoc.edu.ph    student, 02-2223-04902");
  console.log("    marc.tabudlong@aclcormoc.edu.ph         faculty, F-2021-0088");

  blank();
  console.log("  Try: sign in as admin, open Requests, approve one,");
  console.log("       then sign in as that person.");
  console.log("  Or:  admin > Sections > WADT-1C, add a class, then sign in as");
  console.log("       liza.montero and watch it appear on her week.");
  blank();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
