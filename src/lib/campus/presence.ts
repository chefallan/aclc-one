import type { PresenceStatus, StaffVisibility } from "@prisma/client";

/**
 * A state older than this is not trusted. The deck's rule: a stale state
 * expires to "unknown" rather than lying. Two hours is roughly one class
 * block — long enough that a morning toggle survives lunch, short enough that
 * yesterday's never shows as today's.
 */
export const PRESENCE_STALE_AFTER_MS = 2 * 60 * 60 * 1000;

export interface RawPresence {
  visibility: StaffVisibility;
  presenceStatus: PresenceStatus;
  presenceUntil: Date | null;
  presenceNote: string | null;
  presenceUpdatedAt: Date | null;
}

export interface DerivedPresence {
  status: PresenceStatus;
  /** Short label for a pill: "In office", "Lunch", "Out". */
  label: string;
  /** The sentence under it: "back 1:00", "updated 9:38 AM". Never empty. */
  detail: string;
  /** Green / amber / red / grey. Drives the dot, not the meaning. */
  tone: "available" | "waiting" | "away" | "unknown";
  /** Surfaced verbatim so a student can judge freshness themselves. */
  updatedAt: string | null;
  available: boolean;
}

const LABELS: Record<PresenceStatus, string> = {
  AT_DESK: "In office",
  STEPPED_OUT: "Stepped out",
  LUNCH: "Lunch",
  IN_MEETING: "In a meeting",
  IN_CLASS: "In class",
  OFF_CAMPUS: "Out",
  UNKNOWN: "Unknown",
};

const TONES: Record<PresenceStatus, DerivedPresence["tone"]> = {
  AT_DESK: "available",
  STEPPED_OUT: "waiting",
  LUNCH: "waiting",
  IN_MEETING: "away",
  IN_CLASS: "away",
  OFF_CAMPUS: "away",
  UNKNOWN: "unknown",
};

/**
 * Resolves what a student is allowed to see about someone's whereabouts.
 *
 * Order, highest first:
 *   1. HIDDEN — the person opted out; callers must drop them entirely.
 *   2. A state whose `until` has passed lapses rather than persisting.
 *   3. A state older than PRESENCE_STALE_AFTER_MS becomes UNKNOWN.
 *   4. Otherwise the state they set, with its timestamp.
 *
 * "Lunch · back 1:00" beats "Unavailable" — an absence needs a return time to
 * be useful, which is why `until` is carried into the detail line.
 */
export function derivePresence(raw: RawPresence, now: Date = new Date()): DerivedPresence {
  const updatedAt = raw.presenceUpdatedAt?.toISOString() ?? null;

  if (raw.visibility === "HIDDEN") {
    return unknown(updatedAt, "Not shared");
  }

  const untilPassed = raw.presenceUntil !== null && raw.presenceUntil.getTime() <= now.getTime();
  const stale =
    raw.presenceUpdatedAt === null ||
    now.getTime() - raw.presenceUpdatedAt.getTime() > PRESENCE_STALE_AFTER_MS;

  if (raw.presenceStatus === "UNKNOWN" || stale || untilPassed) {
    return unknown(updatedAt, stale || !updatedAt ? "No recent update" : "Status has lapsed");
  }

  const detail =
    raw.presenceNote?.trim() ||
    (raw.presenceUntil ? `back ${formatClock(raw.presenceUntil)}` : `updated ${formatClock(raw.presenceUpdatedAt!)}`);

  return {
    status: raw.presenceStatus,
    label: LABELS[raw.presenceStatus],
    detail,
    tone: TONES[raw.presenceStatus],
    updatedAt,
    available: raw.presenceStatus === "AT_DESK",
  };
}

function unknown(updatedAt: string | null, detail: string): DerivedPresence {
  return {
    status: "UNKNOWN",
    label: LABELS.UNKNOWN,
    detail,
    tone: "unknown",
    updatedAt,
    available: false,
  };
}

/** Minutes a queue of this length is likely to take. */
export function estimateWait(waiting: number, avgServiceMinutes: number): number {
  return waiting * Math.max(1, avgServiceMinutes);
}

/**
 * How many flights lie between two floors, and which way.
 * "No stairs needed" is the payoff line on a four-storey campus.
 */
export function flightsBetween(fromLevel: number, toLevel: number) {
  const delta = toLevel - fromLevel;
  return {
    flights: Math.abs(delta),
    direction: delta === 0 ? ("same" as const) : delta > 0 ? ("up" as const) : ("down" as const),
    summary:
      delta === 0
        ? "No stairs needed"
        : `${Math.abs(delta)} ${Math.abs(delta) === 1 ? "flight" : "flights"} ${delta > 0 ? "up" : "down"}`,
  };
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  });
}
