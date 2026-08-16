import type { PrismaClient } from "@prisma/client";

/**
 * ACLC Ormoc is a vertical school: one building, four floors, a registrar on
 * one level and a program head on another. Levels are ground-first so the
 * number of flights between two offices is a subtraction.
 */
const FLOORS = [
  { level: 0, label: "G", name: "Registrar · Cashier · Guidance · Clinic" },
  { level: 1, label: "2F", name: "Library · Comlab 1–3" },
  { level: 2, label: "3F", name: "Faculty Room · Rm 301–306" },
  { level: 3, label: "4F", name: "Dean · Student Affairs · AVR" },
];

const OFFICES = [
  {
    key: "registrar",
    level: 0,
    name: "Registrar",
    room: "Window 2",
    opensAt: "08:00",
    closesAt: "17:00",
    lunchStart: "12:00",
    lunchEnd: "13:00",
    handles: ["CLEARANCE", "TOR", "ENROLLMENT", "GOOD_MORAL"],
    directions: [
      "Enter the main lobby and keep the guard's desk on your right.",
      "The registrar counter is straight ahead, past the bulletin board.",
      "Queue at Window 2 — Window 1 is for new enrollees only.",
    ],
  },
  {
    key: "accounting",
    level: 0,
    name: "Accounting",
    room: "Window 4",
    opensAt: "08:00",
    closesAt: "17:00",
    lunchStart: "12:00",
    lunchEnd: "13:00",
    handles: ["ASSESSMENT", "CLEARANCE"],
    directions: [
      "From the lobby, walk past the registrar counter.",
      "Accounting is the last two windows before the stairwell.",
    ],
  },
  {
    key: "guidance",
    level: 0,
    name: "Guidance Office",
    room: "Rm 104",
    opensAt: "08:00",
    closesAt: "17:00",
    handles: ["GUIDANCE", "GOOD_MORAL"],
    directions: [
      "Take the corridor left of the guard's desk.",
      "Guidance is the third door, past the clinic.",
    ],
  },
  {
    key: "library",
    level: 1,
    name: "Library",
    room: "2F",
    opensAt: "07:30",
    closesAt: "18:00",
    handles: ["CLEARANCE"],
    directions: [
      "Take the main stairs up one floor, right of the guard's desk.",
      "At 2F, turn right. The library is the glass door at the end.",
    ],
  },
  {
    key: "faculty",
    level: 2,
    name: "Faculty Room",
    room: "Rm 301",
    opensAt: "08:00",
    closesAt: "17:00",
    handles: ["GRADE_CORRECTION", "CAPSTONE_ADVISER", "CLEARANCE"],
    directions: [
      "Take the main stairs up two floors. The elevator is for faculty and PWD use.",
      "At 3F, turn left — you'll pass Rm 301 and Rm 302 on your right.",
      "The Faculty Room is the glass door at the end.",
    ],
  },
  {
    key: "affairs",
    level: 3,
    name: "Student Affairs",
    room: "Rm 402",
    opensAt: "08:00",
    closesAt: "17:00",
    handles: ["ID_REPLACEMENT", "GOOD_MORAL"],
    directions: [
      "Take the main stairs to the top floor.",
      "Student Affairs shares the landing with the Dean's office — it's the door on the right.",
    ],
  },
];

export async function seedCampus({
  prisma,
  passwordHash,
  students,
}: {
  prisma: PrismaClient;
  passwordHash: string;
  students: Array<{ id: string }>;
}) {
  const now = new Date();
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

  /**
   * Return times are relative to the seed run, not fixed wall-clock hours.
   * A hardcoded "back at 1:00 PM" is already in the past by mid-afternoon, so
   * the demo would show every absence as lapsed depending on when you seeded.
   */
  const minutesFromNow = (m: number) => new Date(now.getTime() + m * 60_000);

  const floorIds: Record<number, string> = {};
  for (const spec of FLOORS) {
    const floor = await prisma.floor.create({ data: spec });
    floorIds[spec.level] = floor.id;
  }

  const officeIds: Record<string, string> = {};
  for (const { key, level, directions, ...rest } of OFFICES) {
    const office = await prisma.office.create({
      data: {
        ...rest,
        directions: directions.join("\n"),
        floorId: floorIds[level],
            },
    });
    officeIds[key] = office.id;
  }

  const staff = [
    {
      email: "rhea.salvatierra@aclcormoc.edu.ph",
      firstName: "Rhea",
      lastName: "Salvatierra",
      position: "College Registrar",
      office: "registrar",
      handles: ["CLEARANCE", "TOR", "ENROLLMENT"],
      presenceStatus: "AT_DESK" as const,
      presenceUpdatedAt: minutesAgo(12),
      avgServiceMinutes: 12,
      queue: 4,
    },
    {
      email: "cleo.tabudlong@aclcormoc.edu.ph",
      firstName: "Cleo",
      lastName: "Tabudlong",
      position: "Accounting Clerk",
      office: "accounting",
      handles: ["ASSESSMENT", "CLEARANCE"],
      presenceStatus: "LUNCH" as const,
      presenceUntil: minutesFromNow(40),
      presenceUpdatedAt: minutesAgo(35),
      avgServiceMinutes: 8,
      queue: 1,
    },
    {
      email: "ivy.gantalao@aclcormoc.edu.ph",
      firstName: "Ivy",
      lastName: "Gantalao",
      position: "Librarian",
      office: "library",
      handles: ["CLEARANCE"],
      presenceStatus: "AT_DESK" as const,
      presenceUpdatedAt: minutesAgo(5),
      avgServiceMinutes: 5,
      queue: 0,
    },
    {
      email: "jomar.bactol@aclcormoc.edu.ph",
      firstName: "Jomar",
      lastName: "Bactol",
      position: "Program Head, BSIT",
      office: "faculty",
      handles: ["GRADE_CORRECTION", "CAPSTONE_ADVISER"],
      presenceStatus: "IN_CLASS" as const,
      presenceUntil: minutesFromNow(95),
      presenceUpdatedAt: minutesAgo(50),
      avgServiceMinutes: 15,
      queue: 0,
    },
    {
      email: "dennis.amper@aclcormoc.edu.ph",
      firstName: "Dennis",
      lastName: "Amper",
      position: "Student Affairs Officer",
      office: "affairs",
      handles: ["ID_REPLACEMENT", "GOOD_MORAL"],
      presenceStatus: "STEPPED_OUT" as const,
      presenceUpdatedAt: minutesAgo(20),
      avgServiceMinutes: 10,
      queue: 0,
    },
    {
      // Hidden by choice. Who visits guidance is nobody's business, and the
      // seed should exercise the hidden path rather than leave it untested.
      email: "aleli.lumapas@aclcormoc.edu.ph",
      firstName: "Aleli",
      lastName: "Lumapas",
      position: "Guidance Counselor",
      office: "guidance",
      handles: ["GUIDANCE"],
      presenceStatus: "AT_DESK" as const,
      presenceUpdatedAt: minutesAgo(8),
      avgServiceMinutes: 30,
      queue: 0,
      hidden: true,
    },
    {
      // Deliberately stale: last update was this morning, so the finder must
      // show UNKNOWN rather than claiming they are still at their desk.
      email: "ryan.cabahug@aclcormoc.edu.ph",
      firstName: "Ryan",
      lastName: "Cabahug",
      position: "Faculty, Data Structures",
      office: "faculty",
      handles: ["GRADE_CORRECTION"],
      presenceStatus: "AT_DESK" as const,
      presenceUpdatedAt: minutesAgo(60 * 6),
      avgServiceMinutes: 10,
      queue: 0,
    },
  ];

  for (const spec of staff) {
    const user = await prisma.user.create({
      data: {
        email: spec.email,
        passwordHash,
        firstName: spec.firstName,
        lastName: spec.lastName,
        // Registrar, librarian, guidance — school employees, not administrators
        // of the app itself.
        role: "FACULTY",
        status: "ACTIVE",
        approvedAt: new Date(),
        emailVerifiedAt: new Date(),
            },
    });

    await prisma.staffDirectoryEntry.create({
      data: {
        userId: user.id,
              officeId: officeIds[spec.office],
        position: spec.position,
        handles: spec.handles,
        visibility: spec.hidden ? "HIDDEN" : "VISIBLE",
        presenceStatus: spec.presenceStatus,
        presenceUntil: spec.presenceUntil ?? null,
        presenceUpdatedAt: spec.presenceUpdatedAt,
        avgServiceMinutes: spec.avgServiceMinutes,
      },
    });

    for (let i = 0; i < spec.queue; i += 1) {
      await prisma.queueEntry.create({
        data: {
          officeId: officeIds[spec.office],
          studentId: students[i % students.length].id,
          errand: spec.handles[0],
                  joinedAt: minutesAgo(30 - i * 5),
        },
      });
    }
  }

  console.log(
    `Created campus: ${FLOORS.length} floors, ${OFFICES.length} offices, ${staff.length} staff`
  );
}
