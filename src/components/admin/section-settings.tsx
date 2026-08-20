"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Archive, Trash2, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/**
 * Renaming, archiving and deleting a section.
 *
 * Delete and archive are deliberately not the same button. Deleting cascades
 * to the timetable, so it is offered only for a section nobody is in; anything
 * with students is archived, which keeps the record and takes it out of the
 * lists. The server enforces that too - this only makes the choice legible.
 */
export function SectionSettings({
  sectionId,
  name,
  yearLevel,
  status,
  enrolledCount,
}: {
  sectionId: string;
  name: string;
  yearLevel: number;
  status: "ACTIVE" | "INACTIVE";
  enrolledCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const [form, setForm] = React.useState({ name, yearLevel: String(yearLevel) });

  const url = `/api/admin/sections/${sectionId}`;

  async function call(method: "PATCH" | "DELETE", body?: unknown) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        setError(json.error || "That didn't work.");
        return false;
      }
      return true;
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-4" />
        Section settings
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Section settings</p>
          <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)}>
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-field border border-late-500/40 bg-late-50 px-3 py-2 text-sm text-late-700 dark:bg-late-700/20 dark:text-late-50"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await call("PATCH", { name: form.name, yearLevel: form.yearLevel })) {
              router.refresh();
              setOpen(false);
            }
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Name</span>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                issued
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Year level</span>
              <select
                value={form.yearLevel}
                onChange={(e) => setForm((f) => ({ ...f, yearLevel: e.target.value }))}
                className="h-11 w-full rounded-field border border-hairline-strong bg-surface px-3 text-sm outline-none focus-visible:border-brand-600"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    Year {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </form>

        <div className="space-y-3 border-t border-hairline pt-4">
          <div>
            <p className="text-sm font-medium">
              {status === "ACTIVE" ? "Archive this section" : "Restore this section"}
            </p>
            <p className="mt-0.5 text-sm text-content-muted">
              {status === "ACTIVE"
                ? "Takes it out of the lists and off new enrolments. Nothing is lost, and you can restore it."
                : "Puts it back in the active lists."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              disabled={busy}
              onClick={async () => {
                const next = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
                if (await call("PATCH", { status: next })) router.refresh();
              }}
            >
              <Archive className="size-4" />
              {status === "ACTIVE" ? "Archive" : "Restore"}
            </Button>
          </div>

          <div>
            <p className="text-sm font-medium">Delete permanently</p>
            <p className="mt-0.5 text-sm text-content-muted">
              {enrolledCount > 0
                ? `${enrolledCount} ${enrolledCount === 1 ? "student is" : "students are"} enrolled, so this is refused — archive instead, or move them first.`
                : "Removes the section and its timetable. This cannot be undone."}
            </p>
            {confirmDelete ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    if (await call("DELETE")) {
                      router.replace("/dashboard/sections");
                      router.refresh();
                    }
                  }}
                >
                  {busy ? "Deleting…" : `Yes, delete ${name}`}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                disabled={busy || enrolledCount > 0}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
