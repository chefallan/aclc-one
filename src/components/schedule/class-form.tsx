"use client";

import * as React from "react";
import type { Weekday } from "@prisma/client";
import { X, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TEACHING_DAYS, DAY_SHORT, todayWeekday } from "@/lib/schedule";
import { cn } from "@/lib/utils";

export interface ClassFormValues {
  subjectCode: string;
  subjectTitle: string;
  day: Weekday;
  startTime: string;
  endTime: string;
  room: string;
  instructor: string;
}

/**
 * What the caller's save returned. A clash is deliberately its own outcome
 * rather than an error: the form re-offers the save with allowClash set, which
 * is the only way to plot a genuine overlap.
 */
export interface SaveResult {
  ok: boolean;
  error?: string;
  clash?: boolean;
}

/**
 * Adding one class to a timetable. Used for a student's own week and for a
 * section's official block — the shape of a class does not change with who
 * owns it, only where it is posted.
 */
export function ClassForm({
  heading,
  submitLabel,
  onSave,
  onCancel,
}: {
  heading: string;
  submitLabel: string;
  onSave: (values: ClassFormValues, allowClash: boolean) => Promise<SaveResult>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  /** True once the server has reported a clash and we are offering it anyway. */
  const [clash, setClash] = React.useState(false);

  const [form, setForm] = React.useState<ClassFormValues>({
    subjectCode: "",
    subjectTitle: "",
    day: todayWeekday(),
    startTime: "08:00",
    endTime: "09:30",
    room: "",
    instructor: "",
  });

  function update<K extends keyof ClassFormValues>(key: K, value: ClassFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // A changed field invalidates the clash we were asking about.
    if (clash) {
      setClash(false);
      setError("");
    }
  }

  async function submit(e: React.FormEvent, allowClash = false) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const result = await onSave(form, allowClash);

      if (result.clash) {
        setError(result.error ?? "That overlaps another class.");
        setClash(true);
        return;
      }
      if (!result.ok) {
        setError(result.error ?? "Couldn't save that class.");
        return;
      }

      setClash(false);
      setError("");
      // Day and times stay put: the next class is usually the same day, and
      // retyping them for every slot is the whole tedium of enrolment week.
      setForm((prev) => ({ ...prev, subjectCode: "", subjectTitle: "", room: "" }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-brand-300">
      <CardContent className="p-4">
        <form onSubmit={(e) => submit(e)} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="eyebrow">{heading}</p>
            <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
              <X className="size-4" />
              <span className="sr-only">Cancel</span>
            </Button>
          </div>

          {error && (
            <div
              role="alert"
              className="flex flex-col gap-2 rounded-field border border-late-500/40 bg-late-50 px-3.5 py-3 text-sm text-late-700 dark:bg-late-700/20 dark:text-late-50"
            >
              <span className="flex items-start gap-2.5">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </span>
              {clash && (
                <span className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={(e) => submit(e as unknown as React.FormEvent, true)}
                  >
                    Add it anyway
                  </Button>
                </span>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="subjectCode" className="text-sm font-medium">
                Subject code
              </label>
              <Input
                id="subjectCode"
                value={form.subjectCode}
                onChange={(e) => update("subjectCode", e.target.value)}
                placeholder="IT 402"
                issued
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="subjectTitle" className="text-sm font-medium">
                Subject name
              </label>
              <Input
                id="subjectTitle"
                value={form.subjectTitle}
                onChange={(e) => update("subjectTitle", e.target.value)}
                placeholder="Systems Integration"
              />
            </div>
          </div>

          <fieldset>
            <legend className="text-sm font-medium">Day</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TEACHING_DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => update("day", d)}
                  aria-pressed={form.day === d}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    form.day === d
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-hairline-strong text-content-muted hover:border-brand-300"
                  )}
                >
                  {DAY_SHORT[d]}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-content-faint">
              A subject that meets on more than one day gets one entry per day.
            </p>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="startTime" className="text-sm font-medium">
                Starts
              </label>
              <Input
                id="startTime"
                type="time"
                value={form.startTime}
                onChange={(e) => update("startTime", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="endTime" className="text-sm font-medium">
                Ends
              </label>
              <Input
                id="endTime"
                type="time"
                value={form.endTime}
                onChange={(e) => update("endTime", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="room" className="text-sm font-medium">
                Room
              </label>
              <Input
                id="room"
                value={form.room}
                onChange={(e) => update("room", e.target.value)}
                placeholder="RM 304"
                issued
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="instructor" className="text-sm font-medium">
                Instructor
              </label>
              <Input
                id="instructor"
                value={form.instructor}
                onChange={(e) => update("instructor", e.target.value)}
                placeholder="Sir Jomar Bactol"
              />
            </div>
          </div>

          <Button type="submit" disabled={busy} block>
            {busy ? "Saving…" : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
