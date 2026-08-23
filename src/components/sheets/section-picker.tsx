"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Section chooser for the grade sheet, plus the one-off that turns a section's
 * timetable subject codes into real subjects.
 *
 * The import lives here rather than on a curriculum screen because this is
 * where you notice it is missing: you open the grade sheet, there are no
 * subjects, and the fix should be within reach rather than somewhere else.
 */
export function SectionPicker({
  sections,
  sectionId,
  showImport,
}: {
  sections: Array<{ id: string; name: string; programCode: string }>;
  sectionId: string;
  showImport: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState("");

  function pick(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("section", id);
    // The old subject belongs to the old section.
    next.delete("subject");
    router.push(`?${next.toString()}`);
  }

  async function importSubjects() {
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch("/api/admin/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId }),
      });
      const body = await res.json();
      setNotice(body.message ?? (body.success ? "Done." : "Couldn't import."));
      if (body.success) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-end gap-3 p-4">
        <label className="space-y-1.5">
          <span className="block text-xs font-medium text-content-muted">Section</span>
          <select
            className="h-10 rounded-field border border-hairline-strong bg-surface px-3 text-sm outline-none focus-visible:border-brand-600"
            value={sectionId}
            onChange={(e) => pick(e.target.value)}
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.programCode}
              </option>
            ))}
          </select>
        </label>

        {showImport && sectionId && (
          <Button variant="outline" onClick={importSubjects} disabled={busy}>
            <Download className="size-4" />
            {busy ? "Importing…" : "Import from timetable"}
          </Button>
        )}

        {notice && <p className="text-sm text-content-muted">{notice}</p>}
      </CardContent>
    </Card>
  );
}
