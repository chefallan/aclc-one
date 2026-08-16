import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Status reads before the text does. Attendance states get their own variants
 * so "present" is never a hand-picked green somewhere in a page.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand-700 text-white",
        secondary: "border-transparent bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200",
        outline: "border-hairline-strong text-content-muted",
        destructive: "border-absent-300 bg-absent-50 text-absent-700 dark:border-absent-700 dark:bg-absent-900/30 dark:text-absent-200",
        success: "border-transparent bg-present-50 text-present-700 dark:bg-present-700/25 dark:text-present-50",
        warning: "border-transparent bg-late-50 text-late-700 dark:bg-late-700/25 dark:text-late-50",

        /* Attendance vocabulary, mapped to the states the engine records. */
        present: "border-transparent bg-present-50 text-present-700 dark:bg-present-700/25 dark:text-present-50",
        late: "border-transparent bg-late-50 text-late-700 dark:bg-late-700/25 dark:text-late-50",
        absent: "border-absent-300 bg-absent-50 text-absent-700 dark:border-absent-700 dark:bg-absent-900/30 dark:text-absent-200",
        excused: "border-transparent bg-slab-100 text-slab-600 dark:bg-slab-800 dark:text-slab-300",
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
      {dot ? <span aria-hidden className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
