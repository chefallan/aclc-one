"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DAY_SHORT, formatRange, formatTime, weeklyHours } from "@/lib/schedule";
import {
  CALENDAR_DAYS,
  addMonths,
  daysInMonth,
  entriesOn,
  formatDayLong,
  formatMonth,
  fromDateKey,
  isInTerm,
  isSameDay,
  monthMatrix,
  subjectTotals,
  toDateKey,
  type Term,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";
import type { Entry } from "@/components/schedule/week-view";

/**
 * The timetable projected onto real dates.
 *
 * The week grid answers "what is my Tuesday". This answers the questions a
 * week cannot: which dates are free, how much of a subject falls in a month,
 * and what a particular date looks like weeks from now.
 *
 * Term bounds matter here in a way they never did on the week grid. A weekly
 * pattern repeats forever; a calendar has to stop at the end of the school
 * year or it shows classes in the middle of the break.
 */
export function ScheduleCalendar({
  entries,
  term,
  /** How many chips fit in a cell before the rest collapse into a count. */
  maxPerCell = 3,
}: {
  entries: Entry[];
  term?: Term | null;
  maxPerCell?: number;
}) {
  const today = React.useMemo(() => new Date(), []);
  const [cursor, setCursor] = React.useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = React.useState<string | null>(() => toDateKey(today));
  /** The one day that is tab-reachable; arrow keys move it. */
  const [focusKey, setFocusKey] = React.useState<string | null>(null);

  const cells = React.useRef(new Map<string, HTMLButtonElement | null>());
  /**
   * Set only by the arrow keys. Focus must not be moved for any other reason —
   * a month changed by the mouse should leave the caret where the person put
   * it — and it cannot be decided by reading document.activeElement, because
   * arrowing off the month unmounts the focused button first and focus has
   * already fallen back to the body by the time this runs.
   */
  const takeFocus = React.useRef(false);

  const weeks = React.useMemo(
    () => monthMatrix(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  );

  React.useEffect(() => {
    if (!focusKey || !takeFocus.current) return;
    takeFocus.current = false;
    cells.current.get(focusKey)?.focus();
  }, [focusKey, weeks]);

  function goTo(date: Date, keepSelection = false) {
    setCursor(new Date(date.getFullYear(), date.getMonth(), 1));
    if (!keepSelection) setSelected(null);
  }

  function moveFocus(from: string, days: number) {
    takeFocus.current = true;
    const next = fromDateKey(from);
    next.setDate(next.getDate() + days);
    const key = toDateKey(next);
    setFocusKey(key);
    if (next.getMonth() !== cursor.getMonth() || next.getFullYear() !== cursor.getFullYear()) {
      setCursor(new Date(next.getFullYear(), next.getMonth(), 1));
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const from = focusKey ?? selected ?? toDateKey(today);
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };

    if (e.key in moves) {
      e.preventDefault();
      moveFocus(from, moves[e.key]);
      return;
    }
    if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      takeFocus.current = true;
      const delta = e.key === "PageUp" ? -1 : 1;
      const target = addMonths(fromDateKey(from), delta);
      // Clamp: 31 March back a month is 28 February, not 3 March.
      const day = Math.min(fromDateKey(from).getDate(), daysInMonth(target.getFullYear(), target.getMonth()));
      const next = new Date(target.getFullYear(), target.getMonth(), day);
      setFocusKey(toDateKey(next));
      setCursor(new Date(next.getFullYear(), next.getMonth(), 1));
    }
  }

  const selectedDate = selected ? fromDateKey(selected) : null;
  const selectedEntries = selectedDate ? entriesOn(entries, selectedDate, term) : [];

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth(), daysInMonth(cursor.getFullYear(), cursor.getMonth()));
  const totals = React.useMemo(
    () => subjectTotals(entries, monthStart, monthEnd, term),
    // monthStart/monthEnd are derived from cursor, so cursor is the real input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, cursor, term]
  );

  const showingThisMonth =
    cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth();

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <CalendarDays className="mx-auto size-8 text-content-faint" />
          <p className="mt-3 font-medium">Nothing to put on a calendar yet</p>
          <p className="mt-1 text-sm text-content-muted">
            Once the week has subjects on it, they appear here on their real dates.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold" aria-live="polite">
          {formatMonth(cursor)}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goTo(addMonths(cursor, -1))}
            aria-label={`Previous month, ${formatMonth(addMonths(cursor, -1))}`}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={showingThisMonth && selected === toDateKey(today)}
            onClick={() => {
              goTo(today, true);
              setSelected(toDateKey(today));
              setFocusKey(toDateKey(today));
            }}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goTo(addMonths(cursor, 1))}
            aria-label={`Next month, ${formatMonth(addMonths(cursor, 1))}`}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
        <div className="grid grid-cols-7 border-b border-hairline">
          {CALENDAR_DAYS.map((d) => (
            <div
              key={d}
              className="px-1 py-2 text-center text-[0.68rem] font-medium uppercase tracking-wide text-content-faint sm:text-xs"
            >
              {DAY_SHORT[d]}
            </div>
          ))}
        </div>

        <div data-calendar-grid role="grid" aria-label={formatMonth(cursor)} onKeyDown={onKeyDown}>
          {weeks.map((week, i) => (
            <div key={i} role="row" className="grid grid-cols-7 border-b border-hairline last:border-b-0">
              {week.map((day) => {
                const dayEntries = entriesOn(entries, day.date, term);
                const isToday = isSameDay(day.date, today);
                const isSelected = selected === day.key;
                const outOfTerm = term ? !isInTerm(day.date, term) : false;
                const shown = dayEntries.slice(0, maxPerCell);
                const hidden = dayEntries.length - shown.length;

                return (
                  <div key={day.key} role="gridcell" className="border-r border-hairline last:border-r-0">
                    <button
                      type="button"
                      ref={(el) => {
                        cells.current.set(day.key, el);
                      }}
                      tabIndex={day.key === (focusKey ?? selected ?? toDateKey(today)) ? 0 : -1}
                      onClick={() => {
                        setSelected(day.key);
                        setFocusKey(day.key);
                        if (!day.inMonth) goTo(day.date, true);
                      }}
                      aria-pressed={isSelected}
                      aria-current={isToday ? "date" : undefined}
                      aria-label={`${formatDayLong(day.date)}${
                        dayEntries.length === 0
                          ? ", no classes"
                          : `, ${dayEntries.length} ${dayEntries.length === 1 ? "class" : "classes"}: ${dayEntries
                              .map((e) => `${e.subjectCode} at ${formatTime(e.startTime)}`)
                              .join(", ")}`
                      }`}
                      className={cn(
                        "flex h-16 w-full flex-col items-stretch gap-0.5 p-1 text-left transition-colors sm:h-24 sm:p-1.5",
                        "focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-brand-600",
                        !day.inMonth && "opacity-40",
                        isSelected ? "bg-brand-50 dark:bg-brand-950" : "hover:bg-surface-sunk"
                      )}
                    >
                      <span
                        className={cn(
                          "data self-start text-[0.7rem] leading-none sm:text-xs",
                          isToday
                            ? "rounded-full bg-brand-600 px-1.5 py-1 font-semibold text-white"
                            : outOfTerm
                              ? "px-1.5 py-1 text-content-faint"
                              : "px-1.5 py-1 text-content-muted"
                        )}
                      >
                        {day.date.getDate()}
                      </span>

                      {/* Chips on a wide screen; dots where a code would not fit. */}
                      <span className="hidden min-w-0 flex-1 flex-col gap-0.5 sm:flex">
                        {shown.map((e) => (
                          <span
                            key={e.id}
                            className="data truncate rounded-[0.25rem] border-l-2 border-brand-600 bg-surface-sunk px-1 py-px text-[0.6rem] leading-tight text-content"
                          >
                            {formatTime(e.startTime).replace(":00", "")} {e.subjectCode}
                          </span>
                        ))}
                        {hidden > 0 && (
                          <span className="px-1 text-[0.6rem] leading-tight text-content-faint">
                            +{hidden} more
                          </span>
                        )}
                      </span>

                      <span className="flex flex-1 items-end gap-0.5 px-1 sm:hidden" aria-hidden="true">
                        {dayEntries.slice(0, 4).map((e) => (
                          <span key={e.id} className="size-1 rounded-full bg-brand-600" />
                        ))}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {selectedDate ? (
        <DayDetail
          date={selectedDate}
          entries={selectedEntries}
          outOfTerm={term ? !isInTerm(selectedDate, term) : false}
        />
      ) : (
        <MonthSummary month={formatMonth(cursor)} totals={totals} />
      )}
    </div>
  );
}

function DayDetail({
  date,
  entries,
  outOfTerm,
}: {
  date: Date;
  entries: Entry[];
  outOfTerm: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-medium">{formatDayLong(date)}</p>
          <p className="data text-xs text-content-faint">
            {entries.length === 0
              ? outOfTerm
                ? "Outside the school year"
                : "No classes"
              : `${entries.length} ${entries.length === 1 ? "class" : "classes"} · ${weeklyHours(entries)} h`}
          </p>
        </div>

        {entries.length > 0 && (
          <ul className="mt-3 space-y-2">
            {entries.map((e) => (
              <li key={e.id} className="flex gap-3 border-l-2 border-brand-600 pl-3">
                <div className="min-w-0 flex-1">
                  <p className="data text-sm font-semibold">{e.subjectCode}</p>
                  {e.subjectTitle && (
                    <p className="truncate text-sm text-content-muted">{e.subjectTitle}</p>
                  )}
                  <p className="data mt-0.5 text-xs text-content-faint">
                    {formatRange(e.startTime, e.endTime)}
                    {e.room ? ` · ${e.room}` : ""}
                  </p>
                  {e.instructor && (
                    <p className="mt-0.5 truncate text-xs text-content-muted">{e.instructor}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * What a month adds up to. Shown instead of a day's detail once the person
 * has paged away from any particular date — "how much CC 105 is in October"
 * is the question a month view is uniquely able to answer.
 */
function MonthSummary({
  month,
  totals,
}: {
  month: string;
  totals: Array<{ subjectCode: string; meetings: number; hours: number }>;
}) {
  const hours = Math.round(totals.reduce((sum, t) => sum + t.hours, 0) * 10) / 10;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-medium">{month}</p>
          <p className="data text-xs text-content-faint">
            {totals.length === 0 ? "No classes this month" : `${hours} hours in total`}
          </p>
        </div>

        {totals.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {totals.map((t) => (
              <li key={t.subjectCode} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="data font-medium">{t.subjectCode}</span>
                <span className="data text-xs text-content-muted">
                  {t.meetings} {t.meetings === 1 ? "meeting" : "meetings"} · {t.hours} h
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-xs text-content-faint">Pick a date to see that day.</p>
      </CardContent>
    </Card>
  );
}
