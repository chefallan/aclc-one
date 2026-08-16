"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface FloorSummary {
  id: string;
  label: string;
  level: number;
  name: string | null;
  offices: string[];
  available: number;
  busy: number;
  away: number;
  hidden: number;
}

interface FloorStackProps {
  floors: FloorSummary[];
  /** Where the reader is standing. Ground unless we know better. */
  youAreOnLevel?: number;
  /** The floor being highlighted — the one crimson surface on this screen. */
  destinationLevel?: number;
  onSelect?: (floor: FloorSummary) => void;
  className?: string;
}

/**
 * A cutaway of the building rather than a top-down map.
 *
 * Indoors the useful axis is vertical: the only question that matters is how
 * many flights up. Slabs are stacked highest-first and skewed slightly so the
 * thing reads as a building in section, not a list.
 *
 * This is the one screen allowed to be dramatic, and the only place the app
 * goes dark — it behaves like a map, so it should feel like a different mode.
 */
export function FloorStack({
  floors,
  youAreOnLevel = 0,
  destinationLevel,
  onSelect,
  className,
}: FloorStackProps) {
  const totals = floors.reduce(
    (acc, f) => ({
      available: acc.available + f.available,
      busy: acc.busy + f.busy,
      away: acc.away + f.away,
      hidden: acc.hidden + f.hidden,
    }),
    { available: 0, busy: 0, away: 0, hidden: 0 }
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-card border border-navy-900 bg-navy-950 p-4 text-white sm:p-5",
        className
      )}
    >
      <p className="data mb-4 text-[0.68rem] uppercase tracking-[0.16em] text-navy-300">
        {onSelect ? "Tap a floor" : "The building"}
      </p>

      <ol className="space-y-2">
        {floors.map((floor) => {
          const isDestination = floor.level === destinationLevel;
          const isYou = floor.level === youAreOnLevel;
          const Tag = onSelect ? "button" : "div";

          return (
            <li key={floor.id} className="relative">
              <Tag
                {...(onSelect
                  ? { type: "button" as const, onClick: () => onSelect(floor) }
                  : {})}
                aria-current={isDestination ? "location" : undefined}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-[0.6rem] border px-3.5 py-3 text-left transition-colors",
                  // A slight skew reads as a slab seen in section.
                  "[transform:perspective(900px)_rotateX(3deg)]",
                  isDestination
                    ? "border-brand-500 bg-brand-600 text-white shadow-raised"
                    : "border-brand-800 bg-brand-900/70 hover:border-brand-600",
                  onSelect && "cursor-pointer"
                )}
              >
                <span
                  className={cn(
                    "data w-9 shrink-0 text-lg font-bold leading-none tracking-tight",
                    isDestination ? "text-white" : "text-navy-300"
                  )}
                >
                  {floor.label}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {floor.name ?? floor.offices.slice(0, 3).join(" · ") ?? "—"}
                  </span>
                  <span
                    className={cn(
                      "data mt-0.5 block text-[0.7rem]",
                      isDestination ? "text-brand-100" : "text-navy-400"
                    )}
                  >
                    {describe(floor)}
                  </span>
                </span>

                {/* Dots read before the text does. */}
                <span className="flex shrink-0 items-center gap-1" aria-hidden>
                  {Array.from({ length: Math.min(floor.available, 5) }).map((_, i) => (
                    <span key={`a${i}`} className="size-1.5 rounded-full bg-present-500" />
                  ))}
                  {Array.from({ length: Math.min(floor.busy, 3) }).map((_, i) => (
                    <span key={`b${i}`} className="size-1.5 rounded-full bg-late-500" />
                  ))}
                  {Array.from({ length: Math.min(floor.away, 2) }).map((_, i) => (
                    <span key={`w${i}`} className="size-1.5 rounded-full bg-absent-400/70" />
                  ))}
                </span>

                {isYou && (
                  <span className="data shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.1em]">
                    You
                  </span>
                )}
              </Tag>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-navy-800 pt-3.5">
        <Legend tone="bg-present-500" label="available" value={totals.available} />
        <Legend tone="bg-late-500" label="busy" value={totals.busy} />
        <Legend tone="bg-absent-400/70" label="out" value={totals.away} />
        {totals.hidden > 0 && (
          <Legend tone="bg-navy-500" label="not sharing" value={totals.hidden} />
        )}
      </div>
    </div>
  );
}

function Legend({ tone, label, value }: { tone: string; label: string; value: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", tone)} aria-hidden />
      <span className="data text-[0.68rem] uppercase tracking-[0.12em] text-navy-300">
        {value} {label}
      </span>
    </span>
  );
}

function describe(floor: FloorSummary): string {
  const parts: string[] = [];
  if (floor.available > 0) parts.push(`${floor.available} in`);
  if (floor.busy > 0) parts.push(`${floor.busy} busy`);
  if (floor.away > 0) parts.push(`${floor.away} out`);
  if (parts.length === 0) parts.push("nobody sharing");
  return parts.join(" · ");
}
