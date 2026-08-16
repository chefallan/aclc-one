import { describe, it, expect } from "vitest";
import {
  derivePresence,
  flightsBetween,
  estimateWait,
  PRESENCE_STALE_AFTER_MS,
} from "@/lib/campus/presence";

const NOW = new Date("2026-08-17T09:41:00.000Z");
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

function raw(over: Partial<Parameters<typeof derivePresence>[0]> = {}) {
  return {
    visibility: "VISIBLE" as const,
    presenceStatus: "AT_DESK" as const,
    presenceUntil: null,
    presenceNote: null,
    presenceUpdatedAt: minutesAgo(10),
    ...over,
  };
}

describe("derivePresence — hiding", () => {
  it("never reports a status for someone who opted out", () => {
    const result = derivePresence(raw({ visibility: "HIDDEN" }), NOW);

    // Even though the stored status is AT_DESK, nothing about it escapes.
    expect(result.status).toBe("UNKNOWN");
    expect(result.available).toBe(false);
    expect(result.label).toBe("Unknown");
  });
});

describe("derivePresence — staleness", () => {
  it("reports a recent status as-is", () => {
    const result = derivePresence(raw({ presenceUpdatedAt: minutesAgo(10) }), NOW);
    expect(result.status).toBe("AT_DESK");
    expect(result.available).toBe(true);
  });

  it("expires to unknown rather than lying once stale", () => {
    const stale = new Date(NOW.getTime() - PRESENCE_STALE_AFTER_MS - 1000);
    const result = derivePresence(raw({ presenceUpdatedAt: stale }), NOW);

    expect(result.status).toBe("UNKNOWN");
    expect(result.detail).toBe("No recent update");
  });

  it("treats a never-updated entry as unknown", () => {
    const result = derivePresence(raw({ presenceUpdatedAt: null }), NOW);
    expect(result.status).toBe("UNKNOWN");
  });

  it("lapses a status whose until has passed", () => {
    const result = derivePresence(
      raw({
        presenceStatus: "LUNCH",
        presenceUntil: minutesAgo(30),
        presenceUpdatedAt: minutesAgo(20),
      }),
      NOW
    );

    expect(result.status).toBe("UNKNOWN");
    expect(result.detail).toBe("Status has lapsed");
  });

  it("keeps a status whose until is still ahead", () => {
    const result = derivePresence(
      raw({
        presenceStatus: "LUNCH",
        presenceUntil: new Date(NOW.getTime() + 30 * 60_000),
        presenceUpdatedAt: minutesAgo(20),
      }),
      NOW
    );

    expect(result.status).toBe("LUNCH");
    // An absence needs a return time to be useful — "Lunch · back 1:00"
    // beats "Unavailable".
    expect(result.detail).toMatch(/^back /);
  });
});

describe("derivePresence — what students can judge for themselves", () => {
  it("always carries the timestamp so freshness is visible", () => {
    const at = minutesAgo(10);
    expect(derivePresence(raw({ presenceUpdatedAt: at }), NOW).updatedAt).toBe(at.toISOString());
  });

  it("only counts AT_DESK as available", () => {
    for (const status of ["STEPPED_OUT", "LUNCH", "IN_MEETING", "IN_CLASS", "OFF_CAMPUS"] as const) {
      expect(derivePresence(raw({ presenceStatus: status }), NOW).available).toBe(false);
    }
    expect(derivePresence(raw({ presenceStatus: "AT_DESK" }), NOW).available).toBe(true);
  });

  it("never returns an empty detail line", () => {
    for (const status of ["AT_DESK", "STEPPED_OUT", "LUNCH", "IN_CLASS"] as const) {
      expect(derivePresence(raw({ presenceStatus: status }), NOW).detail).not.toBe("");
    }
  });
});

describe("flightsBetween", () => {
  it("says no stairs are needed on the same floor", () => {
    expect(flightsBetween(0, 0)).toMatchObject({ flights: 0, direction: "same" });
    expect(flightsBetween(0, 0).summary).toBe("No stairs needed");
  });

  it("counts flights up", () => {
    expect(flightsBetween(0, 2)).toMatchObject({ flights: 2, direction: "up" });
    expect(flightsBetween(0, 2).summary).toBe("2 flights up");
  });

  it("counts flights down and uses the singular", () => {
    expect(flightsBetween(3, 2)).toMatchObject({ flights: 1, direction: "down" });
    expect(flightsBetween(3, 2).summary).toBe("1 flight down");
  });
});

describe("estimateWait", () => {
  it("multiplies queue length by service time", () => {
    expect(estimateWait(4, 12)).toBe(48);
  });

  it("never treats a service time as zero minutes", () => {
    expect(estimateWait(3, 0)).toBe(3);
  });
});
