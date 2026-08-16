import type { Weekday } from "@prisma/client";

export const WEEKDAYS: Weekday[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

/** Saturday classes are normal here, so the grid runs Monday to Saturday. */
export const TEACHING_DAYS: Weekday[] = WEEKDAYS.slice(0, 6);

export const DAY_LABEL: Record<Weekday, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

export const DAY_SHORT: Record<Weekday, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

export interface TimeRange {
  day: Weekday;
  startTime: string;
  endTime: string;
}

/** "13:45" → 825. Lets times be compared as plain numbers. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)}–${formatTime(endTime)}`;
}

/** Duration in hours, for the height of a block in the week grid. */
export function durationHours(startTime: string, endTime: string): number {
  return (toMinutes(endTime) - toMinutes(startTime)) / 60;
}

/**
 * Two classes clash when they share a day and their times overlap at all.
 *
 * Touching edges are fine: a class ending at 10:00 and another starting at
 * 10:00 is the normal back-to-back case, not a conflict. Hence strict
 * inequalities on both sides.
 */
export function overlaps(a: TimeRange, b: TimeRange): boolean {
  if (a.day !== b.day) return false;
  return toMinutes(a.startTime) < toMinutes(b.endTime)
    && toMinutes(b.startTime) < toMinutes(a.endTime);
}

export interface ClashCheck<T extends TimeRange> {
  clashes: T[];
  hasClash: boolean;
}

/** Everything already plotted that the candidate would sit on top of. */
export function findClashes<T extends TimeRange>(candidate: TimeRange, existing: T[]): ClashCheck<T> {
  const clashes = existing.filter((e) => overlaps(candidate, e));
  return { clashes, hasClash: clashes.length > 0 };
}

export function isValidRange(startTime: string, endTime: string): boolean {
  return toMinutes(endTime) > toMinutes(startTime);
}

/** Today, as the enum. Sunday is 0 in JS, which is not where the week starts. */
export function todayWeekday(now: Date = new Date()): Weekday {
  return WEEKDAYS[(now.getDay() + 6) % 7];
}

export interface UpNext<T extends TimeRange> {
  entry: T;
  minutesUntil: number;
  inProgress: boolean;
}

/**
 * The class the home screen should lead with: the one happening now, or else
 * the next one still to come today. Returns null once the day is done —
 * "nothing left today" is more useful than tomorrow's first class at 9pm.
 */
export function findUpNext<T extends TimeRange>(entries: T[], now: Date = new Date()): UpNext<T> | null {
  const day = todayWeekday(now);
  const minutesNow = now.getHours() * 60 + now.getMinutes();

  const todays = entries
    .filter((e) => e.day === day)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

  const current = todays.find(
    (e) => toMinutes(e.startTime) <= minutesNow && minutesNow < toMinutes(e.endTime)
  );
  if (current) return { entry: current, minutesUntil: 0, inProgress: true };

  const upcoming = todays.find((e) => toMinutes(e.startTime) > minutesNow);
  if (!upcoming) return null;

  return {
    entry: upcoming,
    minutesUntil: toMinutes(upcoming.startTime) - minutesNow,
    inProgress: false,
  };
}

/** Total plotted hours in a week — the number a student sanity-checks. */
export function weeklyHours(entries: TimeRange[]): number {
  const total = entries.reduce((sum, e) => sum + durationHours(e.startTime, e.endTime), 0);
  return Math.round(total * 10) / 10;
}
