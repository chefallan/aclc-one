"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ScheduleSource } from "@prisma/client";
import { Plus, Lock, PencilLine, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Entry } from "@/components/schedule/week-view";
import { ScheduleViews } from "@/components/schedule/schedule-views";
import type { Term } from "@/lib/calendar";
import { ClassForm, type ClassFormValues, type SaveResult } from "@/components/schedule/class-form";
import { TEACHING_DAYS, weeklyHours, toMinutes } from "@/lib/schedule";

export type { Entry };

export interface SchedulePlotterProps {
  initialEntries: Entry[];
  /** Which timetable these entries came from. */
  source: ScheduleSource;
  /** The section they belong to, whether or not they are following it. */
  section: { id: string; name: string } | null;
  /** How many classes the section's official timetable holds. */
  sectionEntryCount: number;
  /** True while reading the section's block, which the registrar owns. */
  readOnly: boolean;
  /** School year bounds, so the calendar stops at the end of the term. */
  term: Term | null;
  /** Faculty keep a timetable too, but they are never enrolled in a section. */
  isStudent: boolean;
}

export function SchedulePlotter({
  initialEntries,
  source,
  section,
  sectionEntryCount,
  readOnly,
  term,
  isStudent,
}: SchedulePlotterProps) {
  const router = useRouter();
  const [entries, setEntries] = React.useState(initialEntries);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [switching, setSwitching] = React.useState(false);

  // The server is the authority on which timetable this is. After a switch,
  // router.refresh() sends down a different set and the local copy has to give
  // way — otherwise the banner says "your own timetable" over the section's
  // rows. Adjusted during render rather than in an effect, so there is no
  // frame where the two disagree.
  const [renderedFor, setRenderedFor] = React.useState(initialEntries);
  if (renderedFor !== initialEntries) {
    setRenderedFor(initialEntries);
    setEntries(initialEntries);
  }

  async function save(values: ClassFormValues, allowClash: boolean): Promise<SaveResult> {
    const res = await fetch("/api/schedule", {
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

  async function remove(id: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
    } finally {
      setBusy(false);
    }
  }

  async function switchSource(next: ScheduleSource, copyFromSection = false) {
    setSwitching(true);
    try {
      const res = await fetch("/api/schedule/source", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: next, copyFromSection }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setSwitching(false);
    }
  }

  const hours = weeklyHours(entries);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">My schedule</p>
          <h1 className="mt-1 text-2xl font-semibold">
            {readOnly ? `${section?.name ?? "Section"} timetable` : "My class schedule"}
          </h1>
          <p className="mt-1 text-sm text-content-muted">
            {entries.length === 0
              ? readOnly
                ? "Your section's timetable hasn't been published yet."
                : "Set once for the term. It repeats every week — you never enter it again."
              : `${entries.length} ${entries.length === 1 ? "class" : "classes"} · ${hours} hours a week, every week this term`}
          </p>
        </div>
        {!readOnly && !open && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Add a class
          </Button>
        )}
      </header>

      {section ? (
        <SourceBanner
          source={source}
          sectionName={section.name}
          sectionEntryCount={sectionEntryCount}
          personalCount={source === "PERSONAL" ? entries.length : 0}
          busy={switching}
          onSwitch={switchSource}
        />
      ) : isStudent ? (
        // Without this, a student not yet in a section just sees "Add a class"
        // and reasonably concludes the app expects them to keep a timetable by
        // hand. It doesn't: their section's schedule arrives on its own.
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <Users className="size-4 shrink-0 text-content-faint" />
            <p className="min-w-0 flex-1 text-sm text-content-muted">
              You&rsquo;re not in a section yet. Once the registrar enrols you, your
              section&rsquo;s official schedule appears here on its own — nothing to type. Until
              then you can keep your own.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {open && !readOnly && (
        <ClassForm
          heading="New class"
          submitLabel="Add to my schedule"
          onSave={save}
          onCancel={() => setOpen(false)}
        />
      )}

      <ScheduleViews
        entries={entries}
        term={term}
        onRemove={readOnly ? undefined : remove}
        busy={busy}
        emptyTitle={readOnly ? "No classes published yet" : "No schedule set yet"}
        emptyBody={
          readOnly
            ? "The registrar hasn't posted this section's block schedule. You can build your own in the meantime."
            : "Copy the subjects off your enrolment slip once. The same week then repeats for the whole term — there is nothing to update weekly."
        }
      />
    </div>
  );
}

/**
 * Where the timetable comes from, and how to change that.
 *
 * Following the section is the default because it stays right on its own when
 * the registrar moves a class. Switching away is a real choice — irregular
 * students exist — so it says plainly what will happen either way.
 */
function SourceBanner({
  source,
  sectionName,
  sectionEntryCount,
  personalCount,
  busy,
  onSwitch,
}: {
  source: ScheduleSource;
  sectionName: string;
  sectionEntryCount: number;
  personalCount: number;
  busy: boolean;
  onSwitch: (next: ScheduleSource, copyFromSection?: boolean) => void;
}) {
  if (source === "SECTION") {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Lock className="size-4 shrink-0 text-content-faint" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              Following <span className="data">{sectionName}</span>
            </p>
            <p className="mt-0.5 text-sm text-content-muted">
              Maintained by the registrar, so it updates itself when a class moves. Switch to your
              own if your subjects differ from the block.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sectionEntryCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => onSwitch("PERSONAL", true)}
              >
                <PencilLine className="size-4" />
                Customise from this
              </Button>
            )}
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => onSwitch("PERSONAL")}>
              Start blank
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <PencilLine className="size-4 shrink-0 text-content-faint" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Your own timetable</p>
          <p className="mt-0.5 text-sm text-content-muted">
            {personalCount === 0
              ? `Nothing of your own yet. ${sectionName}'s official schedule has ${sectionEntryCount} ${sectionEntryCount === 1 ? "class" : "classes"} ready to copy.`
              : `Changes to ${sectionName}'s block schedule won't reach this one.`}
          </p>
        </div>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => onSwitch("SECTION")}>
          <Users className="size-4" />
          Follow {sectionName}
        </Button>
      </CardContent>
    </Card>
  );
}
