import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Concept sheet 01 · Components · Status pills.
 *
 * Two shapes, because the design uses two and conflating them loses the point:
 *
 *   Badge       a readable label — a category, a section name, a type. Sans,
 *               sentence case, because it carries words a person wrote.
 *   StatusPill  a state — IN OFFICE, IN CLASS, OUT, AT RISK, FLAG. Mono,
 *               uppercase, tracked out, because it is a fixed vocabulary and
 *               it should read before the text beside it does.
 *
 * Colour is not free here. Green and red belong to attendance and presence and
 * nothing else may use them; gold means something needs you; purple means
 * study-buddy, so social never reads as official.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand-600 text-white",
        secondary:
          "border-transparent bg-brand-50 text-brand-800 dark:bg-brand-900 dark:text-brand-100",
        outline: "border-hairline-strong text-content-muted",
        destructive:
          "border-absent-200 bg-absent-50 text-absent-700 dark:border-absent-800 dark:bg-absent-900/40 dark:text-absent-200",
        success:
          "border-transparent bg-present-50 text-present-700 dark:bg-present-700/25 dark:text-present-50",
        warning:
          "border-transparent bg-gold-50 text-gold-800 dark:bg-gold-700/25 dark:text-gold-100",

        /* Attendance vocabulary, mapped to the states the engine records. */
        present:
          "border-transparent bg-present-50 text-present-700 dark:bg-present-700/25 dark:text-present-50",
        late: "border-transparent bg-gold-50 text-gold-800 dark:bg-gold-700/25 dark:text-gold-100",
        absent:
          "border-absent-200 bg-absent-50 text-absent-700 dark:border-absent-800 dark:bg-absent-900/40 dark:text-absent-200",
        excused:
          "border-transparent bg-slab-100 text-slab-600 dark:bg-slab-800 dark:text-slab-300",

        /* A room, a floor, a shelf — issued by the school, so it is blue and
           it is mono. Sheet 01 shows this as "2F · RM 204". */
        room: "border-transparent bg-brand-50 font-mono text-brand-700 dark:bg-brand-900 dark:text-brand-200",
        /* Study-buddy activity. */
        buddy:
          "border-transparent bg-buddy-50 text-buddy-700 dark:bg-buddy-800/50 dark:text-buddy-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Small filled circle before the label, for at-a-glance scanning. */
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot ? <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

/**
 * The state pill. Same palette as the badge, different typography: mono,
 * uppercase, tracked, so a column of them reads as a column of states rather
 * than as a column of words.
 */
function StatusPill({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        badgeVariants({ variant }),
        "font-mono text-[0.6875rem] uppercase leading-5 tracking-[0.08em]",
        className
      )}
      {...props}
    >
      {dot ? <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

export { Badge, StatusPill, badgeVariants };
