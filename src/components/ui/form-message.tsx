import * as React from "react";
import { CircleCheckBig, LoaderCircle, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The banner a form uses to say what just happened.
 *
 * Three pages had this markup copied out by hand, which is how one of them
 * ended up with no failure branch at all. It lives here now so that "the form
 * told me nothing" cannot be reintroduced one page at a time.
 *
 * The live-region wiring is the part that is easy to get wrong and matters
 * most: a failure interrupts ("assertive"), progress and confirmation wait
 * their turn ("polite"). A screen reader announces all three without the
 * person having to go looking for the message.
 */
type Tone = "error" | "success" | "working";

const TONES: Record<Tone, { className: string; Icon: typeof TriangleAlert; spin?: boolean }> = {
  error: {
    className:
      "border-absent-500/40 bg-absent-50 text-absent-700 dark:bg-absent-900/30 dark:text-absent-200",
    Icon: TriangleAlert,
  },
  success: {
    className:
      "border-present-500/40 bg-present-50 text-present-700 dark:bg-present-700/25 dark:text-present-50",
    Icon: CircleCheckBig,
  },
  working: {
    className: "border-hairline bg-surface-sunk text-content-muted",
    Icon: LoaderCircle,
    spin: true,
  },
};

export function FormMessage({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  const { className: toneClass, Icon, spin } = TONES[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={cn(
        "flex items-start gap-2.5 rounded-field border px-3.5 py-3 text-sm",
        toneClass,
        className
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", spin && "animate-spin")} aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}
