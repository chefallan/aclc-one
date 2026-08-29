"use client";

import * as React from "react";
import { Search, Layers, Users, Footprints } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Guidance } from "@/components/ui/guidance";
import { ListGroup, ListRow, AvatarBlock } from "@/components/ui/list-row";
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

/** The initial block takes the row state, so the list is scannable before it is read. */
const AVATAR_TONE = {
  available: "present",
  waiting: "gold",
  away: "absent",
  unknown: "neutral",
} as const;

/**
 * Concept sheet 04.1 · Campus — search by errand.
 *
 * Errand chips come first because students know what they need done, not who
 * does it. The answer is delivered as a floor you can act on, plus whether it
 * is worth walking up at all — which is what the queue length is for.
 */
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
  const availableNow = staff.filter((p) => p.presence.available).length;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Campus</h1>
          <p className="mt-1 text-sm text-content-muted">
            Which floor is Ma&apos;am on? Search by what you need done, not by
            who does it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowStack((v) => !v)}
          aria-pressed={showStack}
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded-field border transition-colors",
            showStack
              ? "border-ink-900 bg-ink-900 text-white"
              : "border-hairline-strong text-content-muted hover:border-brand-300"
          )}
        >
          <Layers className="size-4.5" strokeWidth={1.8} />
          <span className="sr-only">The building</span>
        </button>
      </header>

      {showStack && (
        <div className="space-y-2.5">
          <FloorStack floors={floors} youAreOnLevel={0} />
          {/* Sheet 04.3: "No stairs needed" is the payoff line. On a four-storey
              campus, saving a climb is the whole value proposition. */}
          <Guidance
            icon={<Footprints strokeWidth={1.8} />}
            title={
              availableNow > 0
                ? `${availableNow} ${availableNow === 1 ? "person is" : "people are"} at a desk right now`
                : "Nobody is at a desk right now"
            }
          >
            Tap a floor to see who is on it, or a name below for directions.
          </Guidance>
        </div>
      )}

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-content-faint"
          strokeWidth={1.8}
        />
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
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-ink-900 bg-ink-900 text-white"
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
          <h2 id="results-heading" className="text-[1.0625rem]">
            {chosenErrand ? `For ${chosenErrand.label.toLowerCase()}` : "Everyone you can find"}
          </h2>
          <span className="data text-xs text-content-faint">
            {loading
              ? "searching…"
              : chosenErrand
                ? `${staff.length} ${staff.length === 1 ? "office" : "offices"}`
                : `All ${staff.length}`}
          </span>
        </div>

        {staff.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <Users className="mx-auto size-8 text-content-faint" strokeWidth={1.8} />
              <p className="mt-3 font-medium">Nobody matches that</p>
              <p className="mt-1 text-sm text-content-muted">
                {errand
                  ? "No office has been set up to handle this errand yet."
                  : "Try a different name, office, or room."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <ListGroup>
            {staff.map((person) => (
              <ListRow
                key={person.id}
                href={`/dashboard/campus/${person.id}`}
                leading={
                  <AvatarBlock
                    label={person.initials}
                    tone={AVATAR_TONE[person.presence.tone]}
                  />
                }
                title={person.name}
                subtitle={
                  <>
                    {person.position}
                    {person.office ? ` · ${person.office.name}` : ""}
                    {person.floor ? (
                      <span className="data">
                        {" · "}
                        {person.floor.label}
                        {person.office?.room ? ` · ${person.office.room}` : ""}
                      </span>
                    ) : null}
                  </>
                }
                trailing={
                  <span className="flex flex-col items-end gap-1">
                    <PresencePill presence={person.presence} />
                    {/* Sheet 04.1: queue length is the detail that changes
                        behaviour — go now, or go after lunch. */}
                    {person.waiting > 0 ? (
                      <span className="data text-[0.7rem] text-content-faint">
                        {person.waiting} waiting
                      </span>
                    ) : person.presence.available ? (
                      <span className="data text-[0.7rem] text-present-600">no queue</span>
                    ) : null}
                  </span>
                }
              />
            ))}
          </ListGroup>
        )}
      </section>

      {/* Sheet 00 · Presence, not tracking. Stated on the screen the data
          appears on, not in a policy document nobody opens. */}
      <p className="text-xs text-content-faint">
        Status comes from each person&apos;s own check-in and their timetable —
        never from tracking. Anyone can hide themselves, and some people here
        have.
      </p>
    </div>
  );
}
