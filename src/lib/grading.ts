import type { GradingPeriod, GradingScale } from "@prisma/client";

/**
 * Reading a grade.
 *
 * Two conventions are in use in Philippine colleges and they run in opposite
 * directions: a percentage where 90 beats 80, and the transmuted point scale
 * where 1.25 beats 2.00. Every comparison here goes through `isBetter` and
 * `hasPassed` rather than a bare `>=`, because a bare comparison is right in
 * one convention and silently backwards in the other.
 */

export const PERIODS: GradingPeriod[] = ["PRELIM", "MIDTERM", "SEMIFINAL", "FINAL"];

export const PERIOD_LABEL: Record<GradingPeriod, string> = {
  PRELIM: "Prelim",
  MIDTERM: "Midterm",
  SEMIFINAL: "Semi-final",
  FINAL: "Final",
};

export interface GradingRules {
  scale: GradingScale;
  /** In whatever the scale is. 75 on a percentage, 3.00 on the point scale. */
  passing: number;
  /** Periods this school actually uses, in order. */
  periods: GradingPeriod[];
}

/** Lower is better on the point scale; higher is better on a percentage. */
export function isBetter(a: number, b: number, scale: GradingScale): boolean {
  return scale === "POINT_SCALE" ? a < b : a > b;
}

export function hasPassed(score: number, rules: GradingRules): boolean {
  return rules.scale === "POINT_SCALE" ? score <= rules.passing : score >= rules.passing;
}

/** The bounds a score must sit inside to be a real mark rather than a typo. */
export function scoreRange(scale: GradingScale): { min: number; max: number } {
  return scale === "POINT_SCALE" ? { min: 1, max: 5 } : { min: 0, max: 100 };
}

export function isValidScore(score: number, scale: GradingScale): boolean {
  const { min, max } = scoreRange(scale);
  return Number.isFinite(score) && score >= min && score <= max;
}

/** Two decimals on the point scale (1.25), whole numbers read fine as percent. */
export function formatScore(score: number | null | undefined, scale: GradingScale): string {
  if (score === null || score === undefined) return "—";
  return scale === "POINT_SCALE" ? score.toFixed(2) : String(Math.round(score * 100) / 100);
}

/**
 * The average of the periods that have actually been marked.
 *
 * Unmarked periods are skipped rather than counted as zero. A student halfway
 * through the term has not failed the periods that have not happened yet, and
 * treating a blank as a nil is how a mid-term sheet ends up showing everyone
 * failing.
 */
export function averageOfPeriods(scores: Array<number | null | undefined>): number | null {
  const marked = scores.filter((s): s is number => typeof s === "number");
  if (marked.length === 0) return null;
  return Math.round((marked.reduce((a, b) => a + b, 0) / marked.length) * 100) / 100;
}

/**
 * Units-weighted average across subjects - a GWA.
 *
 * Weighted, because a five-unit major and a one-unit PE class do not carry the
 * same weight in any real school's arithmetic.
 */
export function weightedAverage(
  entries: Array<{ score: number | null; units: number }>
): number | null {
  const usable = entries.filter((e) => typeof e.score === "number" && e.units > 0);
  if (usable.length === 0) return null;
  const totalUnits = usable.reduce((sum, e) => sum + e.units, 0);
  const total = usable.reduce((sum, e) => sum + (e.score as number) * e.units, 0);
  return Math.round((total / totalUnits) * 100) / 100;
}

export function remarkFor(score: number | null, rules: GradingRules): "Passed" | "Failed" | "—" {
  if (score === null) return "—";
  return hasPassed(score, rules) ? "Passed" : "Failed";
}
