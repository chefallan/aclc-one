"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Section and date range for a printable sheet.
 *
 * The choice lives in the URL rather than component state, so a particular
 * sheet can be linked, bookmarked and reloaded — which matters when the thing
 * on screen is about to be printed and signed.
 */
export function SheetControls({
  sections,
  sectionId,
  from,
  to,
}: {
  sections: Array<{ id: string; name: string; programCode: string }>;
  sectionId: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function set(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    router.push(`?${next.toString()}`);
  }

  const field =
    "h-10 rounded-field border border-hairline-strong bg-surface px-3 text-sm outline-none focus-visible:border-brand-600";

  return (
    <Card>
      <CardContent className="flex flex-wrap items-end gap-3 p-4">
        <label className="space-y-1.5">
          <span className="block text-xs font-medium text-content-muted">Section</span>
          <select
            className={field}
            value={sectionId}
            onChange={(e) => set("section", e.target.value)}
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.programCode}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="block text-xs font-medium text-content-muted">From</span>
          <input
            type="date"
            className={field}
            value={from}
            onChange={(e) => set("from", e.target.value)}
          />
        </label>

        <label className="space-y-1.5">
          <span className="block text-xs font-medium text-content-muted">To</span>
          <input
            type="date"
            className={field}
            value={to}
            onChange={(e) => set("to", e.target.value)}
          />
        </label>

        <Button onClick={() => window.print()} className="ml-auto">
          <Printer className="size-4" />
          Print
        </Button>
      </CardContent>
    </Card>
  );
}
