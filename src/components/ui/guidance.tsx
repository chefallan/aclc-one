import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Concept sheet 01 · Components · "INLINE GUIDANCE", and the gold interruption
 * on sheet 04.4.
 *
 * A sentence that arrives at the moment it is useful, attached to the thing it
 * is about, rather than a policy the person is expected to have read. Sheet 01
 * on voice: errors say what to do next, never sorry.
 *
 * Gold is the default because guidance is by definition something that needs
 * you. The other tones exist for the two cases where a state is already being
 * communicated in colour and the sentence should agree with it.
 */
const guidanceVariants = cva(
  "flex gap-2.5 rounded-r-[0.625rem] border-l-[3px] px-3.5 py-3 text-[0.8125rem] leading-snug",
  {
    variants: {
      tone: {
        accent: "border-gold-500 bg-gold-50 text-gold-900 dark:bg-gold-900/25 dark:text-gold-100",
        info: "border-brand-600 bg-brand-50 text-brand-900 dark:bg-brand-900/40 dark:text-brand-100",
        present:
          "border-present-500 bg-present-50 text-present-800 dark:bg-present-900/30 dark:text-present-100",
        absent:
          "border-absent-500 bg-absent-50 text-absent-800 dark:bg-absent-900/30 dark:text-absent-100",
        buddy:
          "border-buddy-500 bg-buddy-50 text-buddy-800 dark:bg-buddy-900/40 dark:text-buddy-100",
      },
    },
    defaultVariants: { tone: "accent" },
  }
);

export interface GuidanceProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof guidanceVariants> {
  icon?: React.ReactNode;
  /** A short bold lead-in above the sentence, as on sheet 04.4. */
  title?: React.ReactNode;
}

export function Guidance({
  tone,
  icon,
  title,
  children,
  className,
  ...props
}: GuidanceProps) {
  return (
    <div className={cn(guidanceVariants({ tone }), className)} {...props}>
      {icon ? <span className="mt-px shrink-0 [&_svg]:size-4">{icon}</span> : null}
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={cn(title && "mt-0.5 opacity-90")}>{children}</div>
      </div>
    </div>
  );
}
