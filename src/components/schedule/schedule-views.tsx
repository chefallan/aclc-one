"use client";

import * as React from "react";
import { CalendarRange, CalendarDays } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScheduleWeek, type Entry } from "@/components/schedule/week-view";
import { ScheduleCalendar } from "@/components/schedule/schedule-calendar";
import type { Term } from "@/lib/calendar";

/**
 * The two ways to read the same timetable.
 *
 * Week is the default because it is the one a student recognises from their
 * enrolment slip and the one they use daily. Month is for the questions a
 * week cannot answer — which dates are free, how much of a subject falls in
 * October, what a date three weeks out looks like.
 *
 * Editing lives on the week only. A class belongs to a weekday, not to the
 * 14th of the month, and offering a delete on one date of a repeating class
 * would promise something the data cannot do.
 */
export function ScheduleViews({
  entries,
  term,
  onRemove,
  onEdit,
  busy = false,
  emptyTitle,
  emptyBody,
}: {
  entries: Entry[];
  term?: Term | null;
  onRemove?: (id: string) => void;
  onEdit?: (entry: Entry) => void;
  busy?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  return (
    <Tabs defaultValue="week">
      <TabsList aria-label="How to view the schedule">
        <TabsTrigger value="week" className="gap-1.5">
          <CalendarRange className="size-4" />
          Week
        </TabsTrigger>
        <TabsTrigger value="month" className="gap-1.5">
          <CalendarDays className="size-4" />
          Month
        </TabsTrigger>
      </TabsList>

      <TabsContent value="week">
        <ScheduleWeek
          entries={entries}
          onRemove={onRemove}
          onEdit={onEdit}
          busy={busy}
          emptyTitle={emptyTitle}
          emptyBody={emptyBody}
        />
      </TabsContent>

      <TabsContent value="month">
        <ScheduleCalendar entries={entries} term={term} />
      </TabsContent>
    </Tabs>
  );
}

export type { Entry };
