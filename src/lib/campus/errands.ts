/**
 * Students know what they need done, not who does it. The search starts from
 * the errand and resolves to a person, which is the opposite of a staff
 * directory and the whole point of this screen.
 */
export const ERRANDS = [
  { key: "CLEARANCE", label: "Clearance signature" },
  { key: "ASSESSMENT", label: "Assessment & payment" },
  { key: "ENROLLMENT", label: "Enrollment" },
  { key: "GRADE_CORRECTION", label: "Grade correction" },
  { key: "GOOD_MORAL", label: "Good moral" },
  { key: "GUIDANCE", label: "Guidance" },
  { key: "CAPSTONE_ADVISER", label: "Capstone adviser" },
  { key: "ID_REPLACEMENT", label: "ID replacement" },
  { key: "TOR", label: "TOR request" },
] as const;

export type ErrandKey = (typeof ERRANDS)[number]["key"];

const BY_KEY = new Map(ERRANDS.map((e) => [e.key, e.label]));

export function errandLabel(key: string): string {
  return BY_KEY.get(key as ErrandKey) ?? key;
}

export function isErrandKey(value: string): value is ErrandKey {
  return BY_KEY.has(value as ErrandKey);
}
