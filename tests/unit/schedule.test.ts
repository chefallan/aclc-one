import { describe, it, expect } from "vitest";
import {
  overlaps,
  findClashes,
  isValidRange,
  toMinutes,
  formatTime,
  formatRange,
  durationHours,
  weeklyHours,
  todayWeekday,
  findUpNext,
} from "@/lib/schedule";
import { scheduleEntrySchema } from "@/lib/validation";

const mon = (startTime: string, endTime: string, subjectCode = "IT 402") => ({
  day: "MONDAY" as const,
  startTime,
  endTime,
  subjectCode,
});

describe("clash detection", () => {
  it("catches a class that starts inside another", () => {
    expect(overlaps(mon("13:00", "16:00"), mon("14:00", "15:00"))).toBe(true);
  });

  it("catches partial overlap from either side", () => {
    expect(overlaps(mon("13:00", "15:00"), mon("14:00", "16:00"))).toBe(true);
    expect(overlaps(mon("14:00", "16:00"), mon("13:00", "15:00"))).toBe(true);
  });

  it("catches an identical slot", () => {
    expect(overlaps(mon("08:00", "09:30"), mon("08:00", "09:30"))).toBe(true);
  });

  it("allows back-to-back classes", () => {
    // Ending at 10:00 and starting at 10:00 is the normal case, not a clash.
    expect(overlaps(mon("08:00", "10:00"), mon("10:00", "11:30"))).toBe(false);
  });

  it("allows the same time on a different day", () => {
    expect(
      overlaps(mon("13:00", "16:00"), {
        day: "TUESDAY",
        startTime: "13:00",
        endTime: "16:00",
      })
    ).toBe(false);
  });

  it("reports every class a new one would sit on", () => {
    const existing = [
      mon("08:00", "09:30", "CC 105"),
      mon("09:00", "10:30", "GE 8"),
      mon("13:00", "16:00", "IT 402"),
    ];
    const { clashes, hasClash } = findClashes(mon("08:30", "11:00"), existing);

    expect(hasClash).toBe(true);
    expect(clashes.map((c) => c.subjectCode)).toEqual(["CC 105", "GE 8"]);
  });

  it("reports nothing when the slot is free", () => {
    const { hasClash } = findClashes(mon("11:00", "12:00"), [mon("08:00", "10:00")]);
    expect(hasClash).toBe(false);
  });
});

describe("time handling", () => {
  it("converts to minutes for comparison", () => {
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("13:45")).toBe(825);
    expect(toMinutes("23:59")).toBe(1439);
  });

  it("formats to the 12-hour clock people speak in", () => {
    expect(formatTime("00:00")).toBe("12:00 AM");
    expect(formatTime("09:05")).toBe("9:05 AM");
    expect(formatTime("12:00")).toBe("12:00 PM");
    expect(formatTime("13:00")).toBe("1:00 PM");
    expect(formatRange("13:00", "16:00")).toBe("1:00 PM–4:00 PM");
  });

  it("rejects an end time at or before the start", () => {
    expect(isValidRange("13:00", "16:00")).toBe(true);
    expect(isValidRange("13:00", "13:00")).toBe(false);
    expect(isValidRange("16:00", "13:00")).toBe(false);
  });

  it("measures duration in hours", () => {
    expect(durationHours("13:00", "16:00")).toBe(3);
    expect(durationHours("08:00", "09:30")).toBe(1.5);
  });

  it("totals a week, rounded to one decimal", () => {
    expect(weeklyHours([mon("08:00", "09:30"), mon("13:00", "16:00")])).toBe(4.5);
    expect(weeklyHours([])).toBe(0);
  });
});

describe("todayWeekday", () => {
  it("maps JS days onto a week that starts on Monday", () => {
    // 2026-08-17 is a Monday.
    expect(todayWeekday(new Date("2026-08-17T09:00:00"))).toBe("MONDAY");
    expect(todayWeekday(new Date("2026-08-22T09:00:00"))).toBe("SATURDAY");
    expect(todayWeekday(new Date("2026-08-23T09:00:00"))).toBe("SUNDAY");
  });
});

describe("what's next", () => {
  const week = [
    { day: "MONDAY" as const, startTime: "08:00", endTime: "09:30", subjectCode: "CC 105" },
    { day: "MONDAY" as const, startTime: "13:00", endTime: "16:00", subjectCode: "IT 402" },
    { day: "TUESDAY" as const, startTime: "10:00", endTime: "11:30", subjectCode: "GE 8" },
  ];

  const monday = (h: number, m = 0) => new Date(2026, 7, 17, h, m);

  it("returns the class in progress", () => {
    const next = findUpNext(week, monday(14));
    expect(next?.entry.subjectCode).toBe("IT 402");
    expect(next?.inProgress).toBe(true);
  });

  it("returns the next class with minutes until it starts", () => {
    const next = findUpNext(week, monday(12, 20));
    expect(next?.entry.subjectCode).toBe("IT 402");
    expect(next?.inProgress).toBe(false);
    expect(next?.minutesUntil).toBe(40);
  });

  it("picks the earliest remaining class, not just any", () => {
    expect(findUpNext(week, monday(7))?.entry.subjectCode).toBe("CC 105");
  });

  it("returns nothing once the day is finished", () => {
    // Tomorrow's first class is not "up next" at nine in the evening.
    expect(findUpNext(week, monday(21))).toBeNull();
  });

  it("ignores other days", () => {
    const wednesday = new Date(2026, 7, 19, 9, 0);
    expect(findUpNext(week, wednesday)).toBeNull();
  });

  it("returns nothing when nothing is plotted", () => {
    expect(findUpNext([], monday(9))).toBeNull();
  });
});

describe("what the form accepts", () => {
  const valid = {
    subjectCode: "IT 402",
    subjectTitle: "Systems Integration",
    day: "MONDAY",
    startTime: "13:00",
    endTime: "16:00",
    room: "RM 304",
    instructor: "Sir Jomar Bactol",
  };

  it("accepts a complete entry", () => {
    expect(scheduleEntrySchema.safeParse(valid).success).toBe(true);
  });

  it("accepts one with only the required parts", () => {
    expect(
      scheduleEntrySchema.safeParse({
        subjectCode: "CC 105",
        day: "TUESDAY",
        startTime: "08:00",
        endTime: "09:30",
      }).success
    ).toBe(true);
  });

  it("refuses an end time before the start, and says which field is wrong", () => {
    const result = scheduleEntrySchema.safeParse({ ...valid, startTime: "16:00", endTime: "13:00" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["endTime"]);
      expect(result.error.issues[0].message).toMatch(/end after it starts/);
    }
  });

  it("refuses times that are not 24-hour HH:mm", () => {
    for (const bad of ["1:00 PM", "25:00", "13:60", "1300", ""]) {
      expect(scheduleEntrySchema.safeParse({ ...valid, startTime: bad }).success).toBe(false);
    }
  });

  it("refuses a day that is not a day", () => {
    expect(scheduleEntrySchema.safeParse({ ...valid, day: "FUNDAY" }).success).toBe(false);
  });

  it("requires a subject code", () => {
    expect(scheduleEntrySchema.safeParse({ ...valid, subjectCode: "  " }).success).toBe(false);
  });
});
