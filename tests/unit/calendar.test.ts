import { describe, it, expect } from "vitest";
import {
  toDateKey,
  fromDateKey,
  isSameDay,
  weekdayOf,
  addMonths,
  daysInMonth,
  monthMatrix,
  entriesOn,
  isInTerm,
  formatMonth,
  formatDayLong,
  subjectTotals,
} from "@/lib/calendar";

import type { Weekday } from "@prisma/client";

const entry = (day: Weekday, startTime: string, endTime: string, subjectCode = "IT 402") => ({
  day,
  startTime,
  endTime,
  subjectCode,
});

const WEEK = [
  entry("MONDAY", "13:00", "16:00", "IT 402"),
  entry("MONDAY", "08:00", "09:30", "CC 105"),
  entry("WEDNESDAY", "13:00", "16:00", "IT 402"),
  entry("SATURDAY", "08:00", "10:00", "PE 4"),
];

describe("date keys", () => {
  it("uses the local date, not the UTC one", () => {
    // Late evening in a timezone behind UTC is already tomorrow in UTC. The
    // key has to stay on the day the student is living in.
    expect(toDateKey(new Date(2026, 7, 15, 23, 30))).toBe("2026-08-15");
    expect(toDateKey(new Date(2026, 0, 1, 0, 15))).toBe("2026-01-01");
  });

  it("pads to a sortable string", () => {
    expect(toDateKey(new Date(2026, 8, 5))).toBe("2026-09-05");
    expect("2026-09-05" < "2026-09-12").toBe(true);
  });

  it("round-trips", () => {
    const d = fromDateKey("2026-08-15");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(15);
    expect(toDateKey(d)).toBe("2026-08-15");
  });

  it("compares days without the time of day getting in the way", () => {
    expect(isSameDay(new Date(2026, 7, 15, 1), new Date(2026, 7, 15, 23))).toBe(true);
    expect(isSameDay(new Date(2026, 7, 15), new Date(2026, 7, 16))).toBe(false);
  });
});

describe("weekdays", () => {
  it("maps a date onto a week that starts on Monday", () => {
    expect(weekdayOf(new Date(2026, 7, 17))).toBe("MONDAY");
    expect(weekdayOf(new Date(2026, 7, 22))).toBe("SATURDAY");
    expect(weekdayOf(new Date(2026, 7, 23))).toBe("SUNDAY");
  });
});

describe("month arithmetic", () => {
  it("does not skip a month when the current one is longer", () => {
    // 31 January + 1 month is February, not March.
    const next = addMonths(new Date(2026, 0, 31), 1);
    expect(next.getMonth()).toBe(1);
    expect(next.getFullYear()).toBe(2026);
  });

  it("crosses the year boundary in both directions", () => {
    expect(addMonths(new Date(2026, 11, 15), 1).getFullYear()).toBe(2027);
    expect(addMonths(new Date(2026, 0, 15), -1).getFullYear()).toBe(2025);
  });

  it("knows how long a month is, leap years included", () => {
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2028, 1)).toBe(29);
    expect(daysInMonth(2026, 3)).toBe(30);
    expect(daysInMonth(2026, 0)).toBe(31);
  });
});

describe("the month grid", () => {
  it("starts every row on a Monday", () => {
    for (const week of monthMatrix(2026, 7)) {
      expect(weekdayOf(week[0].date)).toBe("MONDAY");
      expect(week).toHaveLength(7);
    }
  });

  it("pads the first week with the previous month's days", () => {
    // 1 August 2026 is a Saturday, so the first row runs 27 July – 2 August.
    const first = monthMatrix(2026, 7)[0];
    expect(toDateKey(first[0].date)).toBe("2026-07-27");
    expect(first[0].inMonth).toBe(false);
    expect(toDateKey(first[5].date)).toBe("2026-08-01");
    expect(first[5].inMonth).toBe(true);
  });

  it("holds every day of the month exactly once", () => {
    const inMonth = monthMatrix(2026, 7)
      .flat()
      .filter((d) => d.inMonth)
      .map((d) => d.key);
    expect(inMonth).toHaveLength(31);
    expect(new Set(inMonth).size).toBe(31);
    expect(inMonth[0]).toBe("2026-08-01");
    expect(inMonth[30]).toBe("2026-08-31");
  });

  it("does not add a whole empty week to a short month", () => {
    // February 2027 is 28 days starting on a Monday: four rows, no more.
    expect(monthMatrix(2027, 1)).toHaveLength(4);
    // August 2026 starts on a Saturday and needs six.
    expect(monthMatrix(2026, 7)).toHaveLength(6);
  });
});

describe("classes on a date", () => {
  const term = { start: "2026-06-01", end: "2027-03-31" };

  it("returns that weekday's classes, earliest first", () => {
    const monday = entriesOn(WEEK, new Date(2026, 7, 17), term);
    expect(monday.map((e) => e.subjectCode)).toEqual(["CC 105", "IT 402"]);
  });

  it("returns nothing on a day with no classes", () => {
    // Sunday, and the timetable has nothing on it.
    expect(entriesOn(WEEK, new Date(2026, 7, 23), term)).toEqual([]);
  });

  it("returns nothing outside the term", () => {
    // A Monday in May, before the academic year opens. The pattern repeats
    // forever on its own; the term is what stops it.
    const may = new Date(2026, 4, 11);
    expect(weekdayOf(may)).toBe("MONDAY");
    expect(entriesOn(WEEK, may, term)).toEqual([]);
    // Without a term, the same date does repeat.
    expect(entriesOn(WEEK, may).map((e) => e.subjectCode)).toEqual(["CC 105", "IT 402"]);
  });

  it("includes the first and last day of term", () => {
    expect(isInTerm(new Date(2026, 5, 1), term)).toBe(true);
    expect(isInTerm(new Date(2027, 2, 31), term)).toBe(true);
    expect(isInTerm(new Date(2026, 4, 31), term)).toBe(false);
    expect(isInTerm(new Date(2027, 3, 1), term)).toBe(false);
  });
});

describe("month labels", () => {
  it("names the month and the day", () => {
    expect(formatMonth(new Date(2026, 7, 15))).toBe("August 2026");
    expect(formatDayLong(new Date(2026, 7, 17))).toBe("Monday, 17 August");
  });
});

describe("what a month adds up to", () => {
  it("counts meetings and hours per subject", () => {
    // 1–31 August 2026: five Mondays (3, 10, 17, 24, 31), four Wednesdays,
    // five Saturdays.
    const totals = subjectTotals(WEEK, new Date(2026, 7, 1), new Date(2026, 7, 31), {
      start: "2026-06-01",
      end: "2027-03-31",
    });
    const by = Object.fromEntries(totals.map((t) => [t.subjectCode, t]));

    expect(by["IT 402"].meetings).toBe(9); // 5 Mondays + 4 Wednesdays
    expect(by["IT 402"].hours).toBe(27); // 3 hours each
    expect(by["CC 105"].meetings).toBe(5);
    expect(by["CC 105"].hours).toBe(7.5);
    expect(by["PE 4"].meetings).toBe(5);

    // Busiest first, so the heaviest subject is the one you see.
    expect(totals[0].subjectCode).toBe("IT 402");
  });

  it("counts nothing for a month outside the term", () => {
    expect(
      subjectTotals(WEEK, new Date(2026, 4, 1), new Date(2026, 4, 31), {
        start: "2026-06-01",
        end: "2027-03-31",
      })
    ).toEqual([]);
  });

  it("does not lose a day to the loop", () => {
    // One single Monday, inclusive at both ends.
    const totals = subjectTotals(WEEK, new Date(2026, 7, 17), new Date(2026, 7, 17));
    expect(totals.map((t) => t.subjectCode).sort()).toEqual(["CC 105", "IT 402"]);
    expect(totals.every((t) => t.meetings === 1)).toBe(true);
  });
});
