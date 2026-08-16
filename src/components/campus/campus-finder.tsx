"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Layers, ChevronRight, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FloorStack, type FloorSummary } from "@/components/campus/floor-stack";
import { PresencePill } from "@/components/campus/presence-pill";
import { ERRANDS } from "@/lib/campus/errands";
import { cn } from "@/lib/utils";

interface DirectoryEntry {
  id: string;
  name: string;
  position: string;
  initials: string;
  office: { id: string; name: string; room: string | null } | null;
  floor: { label: string; level: number; name: string | null } | null;
  handles: string[];
  presence: {
    status: string;
    label: string;
    detail: string;
    tone: "available" | "waiting" | "away" | "unknown";
    updatedAt: string | null;
    available: boolean;
  };
  waiting: number;
  estimatedWaitMinutes: number | null;
}

interface CampusFinderProps {
  initialStaff: DirectoryEntry[];
  floors: FloorSummary[];
  canJoinQueue: boolean;
}

export function CampusFinder({ initialStaff, floors }: CampusFinderProps) {
  const [staff, setStaff] = React.useState(initialStaff);
  const [errand, setErrand] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showStack, setShowStack] = React.useState(false);

  // Debounced so typing a name does not fire a request per keystroke.
  React.useEffect(() => {
    const handle = setTimeout(async () => {
      if (!errand && !query.trim()) {
        setStaff(initialStaff);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (errand) params.set("errand", errand);
        if (query.trim()) params.set("q", query.trim());
        const res = await fetch(`/api/campus/directory?${params}`);
        const data = await res.json();
        if (data.success) setStaff(data.data.staff);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(handle);
  }, [errand, query, initialStaff]);

  const chosenErrand = ERRANDS.find((e) => e.key === errand);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Campus</p>
          <h1 className="mt-1 text-2xl font-semibold">Which floor is Ma&apos;am on?</h1>
          <p className="mt-1 text-sm text-content-muted">
            Search by what you need done, not by who does it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowStack((v) => !v)}
          aria-pressed={showStack}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-field border px-3.5 text-sm font-medium transition-colors",
            showStack
              ? "border-brand-700 bg-brand-700 text-white"
              : "border-hairline-strong hover:border-brand-300"
          )}
        >
          <Layers className="size-4" />
          The building
        </button>
      </header>

      {showStack && <FloorStack floors={floors} youAreOnLevel={0} />}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-content-faint" />
        <Input
          type="search"
          placeholder="Search a name, office, or room"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          aria-label="Search the directory"
        />
      </div>

      <section aria-labelledby="errands-heading">
        <h2 id="errands-heading" className="eyebrow mb-2.5">
          What do you need?
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {ERRANDS.map((e) => {
            const active = errand === e.key;
            return (
              <button
                key={e.key}
                type="button"
                onClick={() => setErrand(active ? null : e.key)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-hairline-strong text-content-muted hover:border-brand-300 hover:text-content"
                )}
              >
                {e.label}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="results-heading" className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="results-heading" className="text-lg font-semibold">
            {chosenErrand ? `For ${chosenErrand.label.toLowerCase()}` : "Everyone you can find"}
          </h2>
          <span className="data text-xs text-content-faint">
            {loading ? "searching…" : `${staff.length} ${staff.length === 1 ? "person" : "people"}`}
          </span>
        </div>

        {staff.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <Users className="mx-auto size-8 text-content-faint" />
              <p className="mt-3 font-medium">Nobody matches that</p>
              <p className="mt-1 text-sm text-content-muted">
                {errand
                  ? "No office has been set up to handle this errand yet."
                  : "Try a different name, office, or room."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
            {staff.map((person) => (
              <li key={person.id}>
                <Link
                  href={`/dashboard/campus/${person.id}`}
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-sunk"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-field bg-brand-50 text-sm font-semibold text-brand-800 dark:bg-brand-950 dark:text-brand-200">
                    {person.initials}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{person.name}</span>
                    <span className="block truncate text-sm text-content-muted">
                      {person.position}
                      {person.office ? ` · ${person.office.name}` : ""}
                    </span>
                    {person.floor && (
                      <span className="data block text-xs text-content-faint">
                        {person.floor.label}
                        {person.office?.room ? ` · ${person.office.room}` : ""}
                      </span>
                    )}
                  </span>

                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <PresencePill presence={person.presence} />
                    {person.waiting > 0 ? (
                      <span className="data text-[0.7rem] text-content-faint">
                        {person.waiting} waiting
                      </span>
                    ) : person.presence.available ? (
                      <span className="data text-[0.7rem] text-present-600">no queue</span>
                    ) : null}
                  </span>

                  <ChevronRight className="size-4 shrink-0 text-content-faint" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-content-faint">
        Status comes from each person&apos;s own check-in — never from tracking. Anyone can hide
        themselves, and some people here have.
      </p>
    </div>
  );
}
