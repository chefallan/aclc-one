"use client";

import * as React from "react";
import type { Weekday } from "@prisma/client";
import { X, Trash2, Pencil, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  TEACHING_DAYS,
  DAY_LABEL,
  DAY_SHORT,
  formatRange,
  todayWeekday,
  toMinutes,
  durationHours,
} from "@/lib/schedule";
import { cn } from "@/lib/utils";

export interface Entry {
  id: string;
  subjectCode: string;
  subjectTitle: string | null;
  day: Weekday;
  startTime: string;
  endTime: string;
  room: string | null;
  instructor: string | null;
}

/** The grid runs 7am to 9pm, which covers a Philippine college day. */
const GRID_START = 7;
const GRID_END = 21;

/**
 * One week, rendered the same way everywhere it appears — a student's own, a
 * section's official block, or an administrator reading someone else's.
 *
 * `onRemove` is what separates editing from reading. Leave it off and the
 * component has no way to change anything, which is stronger than passing a
 * flag someone can forget to check.
 */
export function ScheduleWeek({
  entries,
  onRemove,
  onEdit,
  busy = false,
  emptyTitle = "No schedule set yet",
  emptyBody,
}: {
  entries: Entry[];
  onRemove?: (id: string) => void;
  /** Supplied only where editing is allowed; absent means read-only. */
  onEdit?: (entry: Entry) => void;
  busy?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  const [selectedDay, setSelectedDay] = React.useState<Weekday>(todayWeekday());
  const today = todayWeekday();
  const dayEntries = entries.filter((e) => e.day === selectedDay);

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <CalendarDays className="mx-auto size-8 text-content-faint" />
          <p className="mt-3 font-medium">{emptyTitle}</p>
          {emptyBody && <p className="mt-1 text-sm text-content-muted">{emptyBody}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Mobile: one day at a time. A week grid is unreadable at 390px. */}
      <div className="lg:hidden">
        <div
          role="tablist"
          aria-label="Day"
          className="flex gap-1 overflow-x-auto rounded-field border border-hairline bg-surface-sunk p-1"
        >
          {TEACHING_DAYS.map((d) => {
            const count = entries.filter((e) => e.day === d).length;
            return (
              <button
                key={d}
                role="tab"
                aria-selected={selectedDay === d}
                type="button"
                onClick={() => setSelectedDay(d)}
                className={cn(
                  "flex-1 whitespace-nowrap rounded-[0.4rem] px-3 py-2 text-sm font-medium transition-colors",
                  selectedDay === d
                    ? "bg-surface text-brand-800 shadow-card dark:text-brand-200"
                    : "text-content-muted"
                )}
              >
                {DAY_SHORT[d]}
                {count > 0 && <span className="data ml-1 text-[0.62rem] opacity-70">{count}</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-3 space-y-2">
          {dayEntries.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-content-muted">
                No classes on {DAY_LABEL[selectedDay]}.
              </CardContent>
            </Card>
          ) : (
            dayEntries.map((e) => (
              <EntryRow key={e.id} entry={e} onRemove={onRemove} onEdit={onEdit} busy={busy} />
            ))
          )}
        </div>
      </div>

      {/* Desktop: the whole week at once, which is the point of plotting. */}
      <div className="hidden lg:block">
        <WeekGrid entries={entries} today={today} onRemove={onRemove} onEdit={onEdit} busy={busy} />
      </div>
    </>
  );
}

function EntryRow({
  entry,
  onRemove,
  onEdit,
  busy,
}: {
  entry: Entry;
  onRemove?: (id: string) => void;
  onEdit?: (entry: Entry) => void;
  busy: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="data text-sm font-semibold">{entry.subjectCode}</p>
          {entry.subjectTitle && (
            <p className="truncate text-sm text-content-muted">{entry.subjectTitle}</p>
          )}
          <p className="data mt-0.5 text-xs text-content-faint">
            {formatRange(entry.startTime, entry.endTime)}
            {entry.room ? ` · ${entry.room}` : ""}
          </p>
          {entry.instructor && (
            <p className="mt-0.5 truncate text-xs text-content-muted">{entry.instructor}</p>
          )}
        </div>
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(entry)}
            disabled={busy}
            aria-label={`Edit ${entry.subjectCode}`}
          >
            <Pencil className="size-4 text-content-faint" />
          </Button>
        )}
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(entry.id)}
            disabled={busy}
            aria-label={`Remove ${entry.subjectCode}`}
          >
            <Trash2 className="size-4 text-content-faint" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function WeekGrid({
  entries,
  today,
  onRemove,
  onEdit,
  busy,
}: {
  entries: Entry[];
  today: Weekday;
  onRemove?: (id: string) => void;
  onEdit?: (entry: Entry) => void;
  busy: boolean;
}) {
  const hours = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i);
  const rowHeight = 3.25; // rem per hour

  return (
    <div className="overflow-x-auto rounded-card border border-hairline bg-surface shadow-card">
      <div className="min-w-[52rem]">
        <div className="grid grid-cols-[4rem_repeat(6,1fr)] border-b border-hairline">
          <div />
          {TEACHING_DAYS.map((d) => (
            <div
              key={d}
              className={cn(
                "border-l border-hairline px-3 py-2.5 text-center text-sm font-medium",
                d === today && "bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200"
              )}
            >
              {DAY_SHORT[d]}
            </div>
          ))}
        </div>

        <div className="relative grid grid-cols-[4rem_repeat(6,1fr)]">
          <div>
            {hours.map((h) => (
              <div
                key={h}
                className="data border-b border-hairline pr-2 pt-1 text-right text-[0.66rem] text-content-faint"
                style={{ height: `${rowHeight}rem` }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {TEACHING_DAYS.map((day) => (
            <div key={day} className="relative border-l border-hairline">
              {hours.map((h) => (
                <div key={h} className="border-b border-hairline" style={{ height: `${rowHeight}rem` }} />
              ))}

              {entries
                .filter((e) => e.day === day)
                .map((e) => {
                  const top = ((toMinutes(e.startTime) - GRID_START * 60) / 60) * rowHeight;
                  const height = durationHours(e.startTime, e.endTime) * rowHeight;
                  return (
                    <div
                      key={e.id}
                      className="group absolute inset-x-1 overflow-hidden rounded-[0.4rem] border border-brand-600 bg-brand-600 p-1.5 text-white"
                      style={{ top: `${top}rem`, height: `${Math.max(height, 1.6)}rem` }}
                    >
                      <p className="data truncate text-[0.68rem] font-semibold leading-tight">
                        {e.subjectCode}
                      </p>
                      <p className="data truncate text-[0.6rem] leading-tight opacity-80">
                        {formatRange(e.startTime, e.endTime)}
                      </p>
                      {e.room && (
                        <p className="data truncate text-[0.6rem] leading-tight opacity-80">
                          {e.room}
                        </p>
                      )}
                      {(onRemove || onEdit) && (
                        <span className="absolute right-1 top-1 hidden gap-0.5 group-hover:flex">
                          {onEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(e)}
                              disabled={busy}
                              aria-label={`Edit ${e.subjectCode}`}
                              className="rounded bg-white/20 p-0.5"
                            >
                              <Pencil className="size-3" />
                            </button>
                          )}
                          {onRemove && (
                            <button
                              type="button"
                              onClick={() => onRemove(e.id)}
                              disabled={busy}
                              aria-label={`Remove ${e.subjectCode}`}
                              className="rounded bg-white/20 p-0.5"
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
