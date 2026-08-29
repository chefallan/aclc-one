import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Concept sheet 01 · Components · "ATTENDANCE CALENDAR", and the heatmap on
 * sheet 03.3.
 *
 * Sheet 03.3 states the reason it exists rather than a bare percentage: the
 * shape of a term at a glance, because clusters of absence are a wellbeing
 * signal and not just a number. Three absences in one week and three spread
 * across a semester are the same figure and completely different situations.
 */

export type DayState = "present" | "late" | "absent" | "excused" | "none";

export interface CalendarDay {
  /** Day of month, as printed in the cell. */
  day: number;
  state: DayState;
  /** Read out by screen readers in place of the bare number. */
  label?: string;
}

const CELL: Record<DayState, string> = {
  present: "bg-present-50 text-present-700 dark:bg-present-700/25 dark:text-present-50",
  late: "bg-gold-50 text-gold-800 dark:bg-gold-700/25 dark:text-gold-100",
  absent: "bg-absent-50 text-absent-700 dark:bg-absent-900/40 dark:text-absent-200",
  excused: "bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-100",
  none: "text-content-faint",
};

const KEY: { state: DayState; label: string }[] = [
  { state: "present", label: "Present" },
  { state: "late", label: "Late" },
  { state: "absent", label: "Absent" },
  { state: "none", label: "No class" },
];

export function AttendanceCalendar({
  days,
  /** Weekday index the first cell falls on, 0 = Sunday. */
  startsOn = 0,
  showKey = true,
  className,
}: {
  days: CalendarDay[];
  startsOn?: number;
  showKey?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: startsOn }).map((_, i) => (
          <span key={`pad-${i}`} aria-hidden />
        ))}
        {days.map((d) => (
          <span
            key={d.day}
            title={d.label}
            className={cn(
              "data flex h-9 items-center justify-center rounded-md text-xs font-medium",
              CELL[d.state]
            )}
          >
            <span className="sr-only">{d.label ?? `Day ${d.day}: ${d.state}`}</span>
            <span aria-hidden>{d.day}</span>
          </span>
        ))}
      </div>

      {showKey && (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-muted">
          {KEY.map((k) => (
            <span key={k.state} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className={cn(
                  "size-2.5 rounded-[3px]",
                  k.state === "none" ? "border border-hairline-strong" : CELL[k.state]
                )}
              />
              {k.label}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
