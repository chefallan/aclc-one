"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Putting a student into a section, from the screen that just told you they
 * are not in one.
 *
 * Offered inline rather than behind a link because "not enrolled" is not
 * information on its own - it is a thing to fix, and the fix was previously
 * impossible from anywhere in the app.
 */
export function EnrolStudent({
  studentId,
  sections,
  currentSectionId,
}: {
  studentId: string;
  sections: Array<{ id: string; name: string; programCode: string }>;
  currentSectionId?: string | null;
}) {
  const router = useRouter();
  const [sectionId, setSectionId] = React.useState(currentSectionId ?? sections[0]?.id ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  if (sections.length === 0) {
    return (
      <p className="text-sm text-content-muted">
        There are no sections yet. Create one under Sections first.
      </p>
    );
  }

  async function enrol() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, sectionId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        setError(json.error || "Couldn't enrol that student.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-field border border-late-500/40 bg-late-50 px-3 py-2 text-sm text-late-700 dark:bg-late-700/20 dark:text-late-50"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="enrol-section" className="sr-only">
          Section
        </label>
        <select
          id="enrol-section"
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          className="h-10 rounded-field border border-hairline-strong bg-surface px-3 text-sm outline-none focus-visible:border-brand-600"
        >
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.programCode}
            </option>
          ))}
        </select>
        <Button size="sm" onClick={enrol} disabled={busy || !sectionId}>
          {busy ? "Enrolling…" : currentSectionId ? "Move to this section" : "Enrol"}
        </Button>
      </div>
    </div>
  );
}
