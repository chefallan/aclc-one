/**
 * The absence cap, and nothing else.
 *
 * Concept sheet 03.3 is built around one number: distance from the 20% absence
 * cap. It is the figure that can end a semester, and the sheet is explicit that
 * no student should have to do the arithmetic — so the arithmetic lives here,
 * once, rather than in each view that wants to show it.
 *
 * This is a separate module from `attendance-rules` on purpose. The home screen
 * and the record screen are client components, and `attendance-rules` reaches
 * for Prisma; importing the budget from there dragged the Postgres driver into
 * the browser bundle. Pure arithmetic with no server imports has to stay
 * reachable from both sides.
 */
export const ABSENCE_CAP_RATIO = 0.2;

export interface AbsenceBudget {
  /** Absences allowed across the whole term at the current session count. */
  allowed: number;
  /** Absences already recorded. */
  used: number;
  /** What is left. Never negative — past the cap the answer is zero, not -2. */
  left: number;
  /** Already over the cap. */
  exceeded: boolean;
  /** One more absence reaches the cap. Sheet 03.3 calls this AT RISK. */
  atRisk: boolean;
}

export function absenceBudget(totalSessions: number, absences: number): AbsenceBudget {
  const allowed = Math.floor(totalSessions * ABSENCE_CAP_RATIO);
  const left = Math.max(0, allowed - absences);
  return {
    allowed,
    used: absences,
    left,
    exceeded: absences > allowed,
    atRisk: left === 1,
  };
}
