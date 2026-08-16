import type { Weekday } from "@prisma/client";
import { WEEKDAYS, toMinutes, type TimeRange } from "@/lib/schedule";

/**
 * Projecting a weekly timetable onto real dates.
 *
 * A schedule entry has a weekday and no date — it repeats. A calendar has
 * dates and no weekday pattern. Everything here is the translation between
 * the two, kept pure so it can be tested without a browser or a database.
 *
 * All of it works in local time. The college is in one timezone and a class
 * at 08:00 means eight in the morning where the student is standing; running
 * any of this through UTC would shift a Monday class onto Sunday for anyone
 * west of Manila.
 */

/** Sunday is included: a calendar with six columns is not a calendar. */
export const CALENDAR_DAYS: Weekday[] = WEEKDAYS;

/** "2026-08-15" from a local date, with no UTC round-trip to shift the day. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** The inverse, at local midnight. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Which of our Monday-first weekdays a date falls on. */
export function weekdayOf(date: Date): Weekday {
  return WEEKDAYS[(date.getDay() + 6) % 7];
}

export function addMonths(date: Date, delta: number): Date {
  // Day 1 first: adding a month to the 31st would otherwise skip a month
  // entirely when the next one is shorter.
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export interface CalendarDay {
  date: Date;
  key: string;
  /** False for the leading and trailing days borrowed from adjacent months. */
  inMonth: boolean;
}

/**
 * The weeks a month occupies, Monday-first, padded out with the neighbouring
 * days that share those weeks.
 *
 * The row count follows the month rather than being fixed at six, so a short
 * February doesn't render a whole empty week of March underneath it.
 */
export function monthMatrix(year: number, month: number): CalendarDay[][] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const total = daysInMonth(year, month);
  const rows = Math.ceil((lead + total) / 7);

  const weeks: CalendarDay[][] = [];
  for (let row = 0; row < rows; row++) {
    const week: CalendarDay[] = [];
    for (let col = 0; col < 7; col++) {
      const dayOfMonth = row * 7 + col - lead + 1;
      const date = new Date(year, month, dayOfMonth);
      week.push({ date, key: toDateKey(date), inMonth: dayOfMonth >= 1 && dayOfMonth <= total });
    }
    weeks.push(week);
  }
  return weeks;
}

/**
 * The classes that meet on a given date, earliest first.
 *
 * Dates outside the term return nothing — the timetable repeats forever on
 * its own, and a calendar that shows classes in the middle of the summer
 * break is lying.
 */
export function entriesOn<T extends TimeRange & { day: Weekday }>(
  entries: T[],
  date: Date,
  term?: Term | null
): T[] {
  if (term && !isInTerm(date, term)) return [];
  const day = weekdayOf(date);
  return entries
    .filter((e) => e.day === day)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
}

/** Term bounds as date keys, which is how they cross the server boundary. */
export interface Term {
  start: string;
  end: string;
}

export function isInTerm(date: Date, term: Term): boolean {
  const key = toDateKey(date);
  return key >= term.start && key <= term.end;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatMonth(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "Monday, 17 August" — how a date is said out loud here. */
export function formatDayLong(date: Date): string {
  const day = WEEKDAYS[(date.getDay() + 6) % 7];
  const label = day.charAt(0) + day.slice(1).toLowerCase();
  return `${label}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/**
 * How many times each subject meets between two dates, busiest first.
 *
 * The number a student actually wants from a month view is "how much of this
 * subject am I in this month", which the grid itself cannot show.
 */
export function subjectTotals<T extends TimeRange & { day: Weekday; subjectCode: string }>(
  entries: T[],
  from: Date,
  to: Date,
  term?: Term | null
): Array<{ subjectCode: string; meetings: number; hours: number }> {
  const totals = new Map<string, { meetings: number; minutes: number }>();

  for (const date = new Date(from); date <= to; date.setDate(date.getDate() + 1)) {
    for (const entry of entriesOn(entries, date, term)) {
      const current = totals.get(entry.subjectCode) ?? { meetings: 0, minutes: 0 };
      current.meetings += 1;
      current.minutes += toMinutes(entry.endTime) - toMinutes(entry.startTime);
      totals.set(entry.subjectCode, current);
    }
  }

  return [...totals.entries()]
    .map(([subjectCode, t]) => ({
      subjectCode,
      meetings: t.meetings,
      hours: Math.round((t.minutes / 60) * 10) / 10,
    }))
    .sort((a, b) => b.hours - a.hours || a.subjectCode.localeCompare(b.subjectCode));
}
