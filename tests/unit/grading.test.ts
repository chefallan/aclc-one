import { describe, it, expect } from "vitest";
import {
  isBetter,
  hasPassed,
  isValidScore,
  scoreRange,
  formatScore,
  averageOfPeriods,
  weightedAverage,
  remarkFor,
  PERIODS,
} from "@/lib/grading";

/**
 * Grading arithmetic, in both directions.
 *
 * The point scale runs backwards - 1.00 is the best mark and 5.00 the worst -
 * so every one of these has a percentage case and a point-scale case. A bare
 * `score >= passing` is correct in one and silently inverted in the other,
 * which would quietly pass every failing student in a school using the scale.
 */

const PERCENT = { scale: "PERCENTAGE" as const, passing: 75, periods: PERIODS };
const POINTS = { scale: "POINT_SCALE" as const, passing: 3.0, periods: PERIODS };

describe("which of two marks is better", () => {
  it("is the higher one on a percentage", () => {
    expect(isBetter(90, 80, "PERCENTAGE")).toBe(true);
    expect(isBetter(80, 90, "PERCENTAGE")).toBe(false);
  });

  it("is the lower one on the point scale", () => {
    expect(isBetter(1.25, 2.0, "POINT_SCALE")).toBe(true);
    expect(isBetter(2.0, 1.25, "POINT_SCALE")).toBe(false);
  });
});

describe("passing", () => {
  it("needs the pass mark or above on a percentage", () => {
    expect(hasPassed(75, PERCENT)).toBe(true);
    expect(hasPassed(74.99, PERCENT)).toBe(false);
    expect(hasPassed(100, PERCENT)).toBe(true);
  });

  it("needs the pass mark or below on the point scale", () => {
    expect(hasPassed(3.0, POINTS)).toBe(true);
    expect(hasPassed(1.0, POINTS)).toBe(true);
    expect(hasPassed(3.25, POINTS)).toBe(false);
    expect(hasPassed(5.0, POINTS)).toBe(false);
  });

  it("does not treat a good point-scale mark as a failure", () => {
    // The bug this whole module exists to prevent: 1.00 is the best possible
    // grade, and a naive `score >= 75` check would fail it.
    expect(hasPassed(1.0, POINTS)).toBe(true);
    expect(remarkFor(1.0, POINTS)).toBe("Passed");
  });
});

describe("what counts as a real mark", () => {
  it("bounds a percentage to 0-100", () => {
    expect(scoreRange("PERCENTAGE")).toEqual({ min: 0, max: 100 });
    expect(isValidScore(0, "PERCENTAGE")).toBe(true);
    expect(isValidScore(100, "PERCENTAGE")).toBe(true);
    expect(isValidScore(101, "PERCENTAGE")).toBe(false);
    expect(isValidScore(-1, "PERCENTAGE")).toBe(false);
  });

  it("bounds the point scale to 1.00-5.00", () => {
    expect(scoreRange("POINT_SCALE")).toEqual({ min: 1, max: 5 });
    expect(isValidScore(1, "POINT_SCALE")).toBe(true);
    expect(isValidScore(5, "POINT_SCALE")).toBe(true);
    expect(isValidScore(0.99, "POINT_SCALE")).toBe(false);
    expect(isValidScore(5.01, "POINT_SCALE")).toBe(false);
    // 85 is a plausible percentage and nonsense on the point scale.
    expect(isValidScore(85, "POINT_SCALE")).toBe(false);
  });

  it("refuses anything that is not a number", () => {
    expect(isValidScore(NaN, "PERCENTAGE")).toBe(false);
    expect(isValidScore(Infinity, "PERCENTAGE")).toBe(false);
  });
});

describe("formatting", () => {
  it("keeps two decimals on the point scale", () => {
    expect(formatScore(1.25, "POINT_SCALE")).toBe("1.25");
    expect(formatScore(2, "POINT_SCALE")).toBe("2.00");
  });

  it("does not pad a percentage", () => {
    expect(formatScore(88, "PERCENTAGE")).toBe("88");
    expect(formatScore(88.5, "PERCENTAGE")).toBe("88.5");
  });

  it("shows an unmarked grade as a dash, not a zero", () => {
    expect(formatScore(null, "PERCENTAGE")).toBe("—");
    expect(formatScore(undefined, "POINT_SCALE")).toBe("—");
  });
});

describe("averaging the periods", () => {
  it("averages the marks that exist", () => {
    expect(averageOfPeriods([80, 90])).toBe(85);
  });

  it("skips unmarked periods instead of counting them as zero", () => {
    // Mid-term: two periods marked, two not. Counting the blanks as nil would
    // report 42.5 and show a passing student as failing.
    expect(averageOfPeriods([80, 90, null, undefined])).toBe(85);
  });

  it("returns nothing when nothing is marked", () => {
    expect(averageOfPeriods([null, null])).toBeNull();
    expect(averageOfPeriods([])).toBeNull();
  });

  it("rounds to two decimals", () => {
    expect(averageOfPeriods([80, 85, 91])).toBe(85.33);
  });
});

describe("weighted average across subjects", () => {
  it("weights by units", () => {
    // A 3-unit at 90 and a 1-unit at 70 is not 80.
    expect(weightedAverage([{ score: 90, units: 3 }, { score: 70, units: 1 }])).toBe(85);
  });

  it("ignores unmarked subjects", () => {
    expect(
      weightedAverage([
        { score: 90, units: 3 },
        { score: null, units: 3 },
      ])
    ).toBe(90);
  });

  it("ignores zero-unit subjects rather than dividing by zero", () => {
    expect(weightedAverage([{ score: 90, units: 0 }])).toBeNull();
  });

  it("returns nothing with nothing to average", () => {
    expect(weightedAverage([])).toBeNull();
  });

  it("works on the point scale too", () => {
    // 1.25 over 3 units and 2.00 over 1 unit.
    expect(weightedAverage([{ score: 1.25, units: 3 }, { score: 2.0, units: 1 }])).toBe(1.44);
  });
});
