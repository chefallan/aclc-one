import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { Weekday } from "@prisma/client";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";

/**
 * What the home screen is allowed to claim is "up next".
 *
 * Reported by a student: the schedule screen said "nothing plotted yet" while
 * the home screen advertised a class as up next. It came from a ClassSession —
 * an instructor opening attendance — being used as a stand-in for a timetable.
 * Two separate things went wrong, and both are pinned here:
 *
 *   1. The session query had no section filter, so a student could be shown
 *      another year level's class entirely.
 *   2. Even the right session is not a schedule. "Up next" must come from the
 *      timetable or not appear at all.
 */

const entry = (day: Weekday, startTime: string, endTime: string, subjectCode: string) => ({
  id: `${subjectCode}-${day}`,
  subjectCode,
  subjectTitle: `${subjectCode} title`,
  day,
  startTime,
  endTime,
  room: "RM 304",
  instructor: "Sir Jomar Bactol",
});

const SESSION = {
  id: "s1",
  subject: "Systems Integration & Architecture",
  room: "RM 304",
  startTime: new Date(2026, 7, 17, 13, 0),
  endTime: new Date(2026, 7, 17, 16, 0),
  status: "ACTIVE",
  section: { name: "BSIT-4A" },
  teacher: { firstName: "Ana", lastName: "Cruz" },
};

const base = {
  user: { name: "Juan Dela Cruz" },
  classAttendances: [],
  todaySessions: [],
  qrCodeToken: "tok",
};

/** Monday, 17 August 2026, 9am — before the 1pm class. */
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 7, 17, 9, 0));
});

afterEach(() => vi.useRealTimers());

describe("up next", () => {
  it("does not invent one from an open class session", () => {
    // The exact reported case: no schedule, but a session is open.
    render(<StudentDashboard {...base} todaySessions={[SESSION]} schedule={[]} />);

    expect(screen.queryByText(/Up next/)).not.toBeInTheDocument();
    expect(screen.getByText("No class schedule yet")).toBeInTheDocument();
  });

  it("still says attendance is open, as itself", () => {
    render(<StudentDashboard {...base} todaySessions={[SESSION]} schedule={[]} />);

    // Useful information, honestly labelled — not dressed up as a timetable.
    expect(screen.getByText("Attendance is open")).toBeInTheDocument();
    expect(screen.getByText("Systems Integration & Architecture")).toBeInTheDocument();
  });

  const MONDAY = [
    entry("MONDAY", "08:00", "09:30", "CC 105"),
    entry("MONDAY", "13:00", "16:00", "IT 402"),
  ];

  it("reads the timetable when there is one", () => {
    // 12:20 — IT 402 starts in forty minutes.
    vi.setSystemTime(new Date(2026, 7, 17, 12, 20));
    render(<StudentDashboard {...base} schedule={MONDAY} />);

    const hero = screen.getByText("Up next · 40 min").closest("div")!;
    expect(within(hero).getByText("IT 402 title")).toBeInTheDocument();
  });

  it("says a class is happening rather than counting down to it", () => {
    // 09:00 — CC 105 runs 08:00 to 09:30, so it is in progress.
    render(<StudentDashboard {...base} schedule={MONDAY} />);

    const hero = screen.getByText("Happening now").closest("div")!;
    expect(within(hero).getByText("CC 105 title")).toBeInTheDocument();
  });

  it("says the day is done rather than reaching for a session", () => {
    vi.setSystemTime(new Date(2026, 7, 17, 20, 0));
    render(
      <StudentDashboard
        {...base}
        todaySessions={[SESSION]}
        schedule={[entry("MONDAY", "08:00", "09:30", "CC 105")]}
      />
    );

    expect(screen.queryByText(/Up next/)).not.toBeInTheDocument();
    expect(screen.getByText("That's your last class today")).toBeInTheDocument();
  });

  it("does not offer a check-in for a class the instructor has closed", () => {
    render(
      <StudentDashboard
        {...base}
        todaySessions={[{ ...SESSION, status: "CLOSED" }]}
        schedule={[]}
      />
    );

    expect(screen.queryByText("Attendance is open")).not.toBeInTheDocument();
  });

  it("counts a closed class as one of the day's, not as a check-in", () => {
    // This replaces a "Today 1/1" tile that concept sheet 02.3 does not have —
    // the two tiles there are the term rate and the absence budget. The rule it
    // was guarding still holds and is still worth pinning: a closed session is
    // part of the day, so it must not be filtered out of todaySessions, but it
    // must not offer a check-in either.
    render(
      <StudentDashboard
        {...base}
        todaySessions={[{ ...SESSION, status: "CLOSED" }]}
        classAttendances={[
          {
            id: "a1",
            scannedAt: new Date(2026, 7, 17, 13, 2),
            status: "PRESENT",
            classSession: { subject: SESSION.subject, room: "RM 304", startTime: SESSION.startTime },
          },
        ]}
        schedule={[]}
      />
    );

    expect(screen.queryByText("Attendance is open")).not.toBeInTheDocument();
    expect(screen.getByText("Present")).toBeInTheDocument();
  });

  it("frames absences as a budget against the 20% cap", () => {
    // Sheet 02.3: absences-left is framed as a budget, not a percentage,
    // because that is how students actually think about it. Ten sessions allow
    // two absences under the cap; one used leaves one.
    const marks = (n: number, status: string) =>
      Array.from({ length: n }, (_, i) => ({
        id: `${status}-${i}`,
        scannedAt: new Date(2026, 7, 10 + i, 9, 0),
        status,
        classSession: { subject: "CC 105", room: "RM 304", startTime: SESSION.startTime },
      }));

    render(
      <StudentDashboard
        {...base}
        classAttendances={[...marks(9, "PRESENT"), ...marks(1, "ABSENT")]}
        schedule={[]}
      />
    );

    const tile = screen.getByText("Absences left").closest("div")!;
    expect(tile.textContent).toMatch(/1\s*\/2/);
    expect(tile.textContent).toContain("Cap is 20%");
  });

  it("does not offer a check-in for a session already attended", () => {
    render(
      <StudentDashboard
        {...base}
        todaySessions={[SESSION]}
        classAttendances={[
          {
            id: "a1",
            scannedAt: new Date(2026, 7, 17, 13, 2),
            status: "PRESENT",
            classSession: {
              subject: SESSION.subject,
              room: "RM 304",
              startTime: SESSION.startTime,
            },
          },
        ]}
        schedule={[]}
      />
    );

    expect(screen.queryByText("Attendance is open")).not.toBeInTheDocument();
  });
});

describe("the schedule is fixed for the term", () => {
  it("never asks for it weekly", () => {
    render(<StudentDashboard {...base} schedule={[]} />);

    const body = document.body.textContent ?? "";
    expect(body).toMatch(/stays put for the whole term/);
    // "Plot your week" read as a chore due again next Monday.
    expect(body).not.toMatch(/plot your week/i);
  });
});
