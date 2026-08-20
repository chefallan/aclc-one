"use client";

import * as React from "react";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Entry } from "@/components/schedule/week-view";
import { ScheduleViews } from "@/components/schedule/schedule-views";
import type { Term } from "@/lib/calendar";
import { ClassForm, type ClassFormValues, type SaveResult } from "@/components/schedule/class-form";
import { TEACHING_DAYS, weeklyHours, toMinutes } from "@/lib/schedule";

/**
 * The registrar's view of a section's block schedule.
 *
 * Every student in the section who hasn't switched to a personal timetable
 * reads what is edited here, which is why the header says how many that is.
 */
export function SectionScheduleEditor({
  sectionId,
  sectionName,
  programCode,
  academicYear,
  enrolledCount,
  initialEntries,
  term,
}: {
  sectionId: string;
  sectionName: string;
  programCode: string;
  academicYear: string;
  enrolledCount: number;
  initialEntries: Entry[];
  term: Term | null;
}) {
  const [entries, setEntries] = React.useState(initialEntries);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  /** The entry being edited, or null when adding. */
  const [editing, setEditing] = React.useState<Entry | null>(null);

  const url = `/api/admin/sections/${sectionId}/schedule`;

  async function save(values: ClassFormValues, allowClash: boolean): Promise<SaveResult> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(allowClash ? { ...values, allowClash: true } : values),
    });
    const body = await res.json();

    if (res.status === 409) return { ok: false, clash: true, error: body.error };
    if (!res.ok || !body.success) return { ok: false, error: body.error };

    setEntries((prev) =>
      [...prev, body.data].sort(
        (a, b) =>
          TEACHING_DAYS.indexOf(a.day) - TEACHING_DAYS.indexOf(b.day) ||
          toMinutes(a.startTime) - toMinutes(b.startTime)
      )
    );
    return { ok: true };
  }

  async function saveEdit(values: ClassFormValues, allowClash: boolean): Promise<SaveResult> {
    if (!editing) return { ok: false, error: "Nothing being edited." };

    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, entryId: editing.id, allowClash }),
    });
    const body = await res.json();

    if (res.status === 409) return { ok: false, clash: true, error: body.error };
    if (!res.ok || !body.success) return { ok: false, error: body.error };

    setEntries((prev) =>
      prev
        .map((e) => (e.id === editing.id ? body.data : e))
        .sort(
          (a, b) =>
            TEACHING_DAYS.indexOf(a.day) - TEACHING_DAYS.indexOf(b.day) ||
            toMinutes(a.startTime) - toMinutes(b.startTime)
        )
    );
    setEditing(null);
    return { ok: true };
  }

  async function remove(entryId: string) {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId }),
      });
      if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } finally {
      setBusy(false);
    }
  }

  const hours = weeklyHours(entries);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">
            {programCode} · {academicYear}
          </p>
          <h1 className="data mt-1 text-2xl font-semibold">{sectionName}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-content-muted">
            <span>
              {entries.length === 0
                ? "No block schedule yet"
                : `${entries.length} ${entries.length === 1 ? "class" : "classes"} · ${hours} hours a week`}
            </span>
            <span className="text-content-faint">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" />
              {enrolledCount} enrolled
            </span>
          </p>
        </div>
        {!open && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Add a class
          </Button>
        )}
      </header>

      {editing && (
        <ClassForm
          key={editing.id}
          heading={`Edit ${editing.subjectCode}`}
          submitLabel="Save changes"
          keepOpenAfterSave={false}
          initial={{
            subjectCode: editing.subjectCode,
            subjectTitle: editing.subjectTitle ?? "",
            day: editing.day,
            startTime: editing.startTime,
            endTime: editing.endTime,
            room: editing.room ?? "",
            instructor: editing.instructor ?? "",
          }}
          onSave={saveEdit}
          onCancel={() => setEditing(null)}
        />
      )}

      {open && !editing && (
        <ClassForm
          heading={`New class for ${sectionName}`}
          submitLabel="Add to the block schedule"
          onSave={save}
          onCancel={() => setOpen(false)}
        />
      )}

      <ScheduleViews
        entries={entries}
        term={term}
        onRemove={remove}
        onEdit={(e) => {
          setOpen(false);
          setEditing(e);
        }}
        busy={busy}
        emptyTitle="No block schedule yet"
        emptyBody={`Add ${sectionName}'s subjects and every student following the section sees them straight away.`}
      />
    </div>
  );
}
