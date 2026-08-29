"use client";

import * as React from "react";
import { StatusPill } from "@/components/ui/badge";
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
  /** The floor being highlighted — the one gold surface on this screen. */
  destinationLevel?: number;
  onSelect?: (floor: FloorSummary) => void;
  className?: string;
}

/**
 * Concept sheet 04.3 · The floor stack. The signature element.
 *
 * A cutaway of the building rather than a top-down map, because indoors the
 * useful axis is vertical: the only question that matters is how many flights
 * up. Slabs are stacked highest-first and skewed slightly so the thing reads as
 * a building in section, not a list.
 *
 * Each slab carries what is on that floor and how many people are available on
 * it — the dots read before the text does. The destination floor is the only
 * gold surface here; everything else recedes.
 *
 * The dark ground is deliberate. This is the one screen that behaves like a
 * map, and it should feel like a different mode.
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
        "surface-ink overflow-hidden rounded-card border border-ink-800 p-4 sm:p-5",
        className
      )}
    >
      <p className="eyebrow mb-4 text-ink-300">{onSelect ? "Tap a floor" : "The building"}</p>

      <ol className="space-y-2">
        {floors.map((floor) => {
          const isDestination = floor.level === destinationLevel;
          const isYou = floor.level === youAreOnLevel;
          const Tag = onSelect ? "button" : "div";

          return (
            <li key={floor.id} className="relative">
              <Tag
                {...(onSelect ? { type: "button" as const, onClick: () => onSelect(floor) } : {})}
                aria-current={isDestination ? "location" : undefined}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-[0.6rem] border px-3.5 py-3 text-left transition-colors",
                  // A slight skew reads as a slab seen in section.
                  "[transform:perspective(900px)_rotateX(3deg)]",
                  isDestination
                    ? "border-gold-400 bg-gold-500 text-ink-900 shadow-raised"
                    : "border-ink-700 bg-ink-800/80 text-ink-50 hover:border-brand-500",
                  onSelect && "cursor-pointer"
                )}
              >
                <span
                  className={cn(
                    "figure w-9 shrink-0 text-lg",
                    isDestination ? "text-ink-900" : "text-ink-300"
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
                      isDestination ? "text-ink-800" : "text-ink-400"
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
                    <span key={`b${i}`} className="size-1.5 rounded-full bg-gold-400" />
                  ))}
                  {Array.from({ length: Math.min(floor.away, 2) }).map((_, i) => (
                    <span key={`w${i}`} className="size-1.5 rounded-full bg-absent-400" />
                  ))}
                </span>

                {isYou && (
                  <span
                    className={cn(
                      "data shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.1em]",
                      isDestination ? "bg-ink-900/15 text-ink-900" : "bg-white/15 text-ink-50"
                    )}
                  >
                    You
                  </span>
                )}
              </Tag>
            </li>
          );
        })}
      </ol>

      {/* Sheet 04.3 · "WHO IS ON EACH FLOOR". Hidden is a designed-in state, not
          an omission: who visits guidance is nobody else's business. */}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-700 pt-3.5">
        <StatusPill variant="present" dot>
          {totals.available} available
        </StatusPill>
        <StatusPill variant="late" dot>
          {totals.busy} in class
        </StatusPill>
        <StatusPill variant="absent" dot>
          {totals.away} out
        </StatusPill>
        {totals.hidden > 0 && (
          <StatusPill variant="excused" dot>
            {totals.hidden} hidden
          </StatusPill>
        )}
      </div>
    </div>
  );
}

function describe(floor: FloorSummary): string {
  const parts: string[] = [];
  if (floor.available > 0) parts.push(`${floor.available} in`);
  if (floor.busy > 0) parts.push(`${floor.busy} in class`);
  if (floor.away > 0) parts.push(`${floor.away} out`);
  if (parts.length === 0) parts.push("nobody sharing");
  return parts.join(" · ");
}
