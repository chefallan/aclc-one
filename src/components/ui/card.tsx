import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-card border border-hairline bg-surface text-content shadow-card",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

/**
 * The hero card: 20px radius rather than 14, per the grid note on sheet 01.
 * There is at most one on a screen — "Up next" on home, the term rate on the
 * attendance record, the live session on the faculty roster.
 */
const HeroCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-hero bg-brand-600 text-white shadow-hero",
        className
      )}
      {...props}
    />
  )
);
HeroCard.displayName = "HeroCard";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1 p-4", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-[1.0625rem] leading-tight", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-content-muted", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-4 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-2 border-t border-hairline p-4", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

/**
 * Concept sheet 01 · Components · "METRIC TILE".
 *
 * A single number that matters, its unit, and the sentence that explains it.
 *
 * The figure is in the display face rather than the mono, and the distinction
 * is deliberate: mono marks what the school issued — a student number, a room,
 * a grade — while a term rate or an absence budget is something this app worked
 * out. Sheet 08.1 is the exception that proves it, where grades are set in mono
 * at a large size precisely because they were issued rather than derived.
 */
interface MetricProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  unit?: string;
  caption?: React.ReactNode;
  tone?: "neutral" | "present" | "late" | "absent" | "accent" | "brand";
}

const toneRing: Record<NonNullable<MetricProps["tone"]>, string> = {
  neutral: "border-hairline",
  present: "border-present-500/40",
  late: "border-gold-500/50",
  absent: "border-absent-500/50",
  accent: "border-gold-500/50",
  brand: "border-brand-500/40",
};

const toneText: Record<NonNullable<MetricProps["tone"]>, string> = {
  neutral: "text-content",
  present: "text-present-600",
  late: "text-gold-700",
  absent: "text-absent-600",
  accent: "text-gold-700",
  brand: "text-brand-600",
};

function Metric({
  label,
  value,
  unit,
  caption,
  tone = "neutral",
  className,
  ...props
}: MetricProps) {
  return (
    <div
      className={cn("rounded-card border bg-surface p-4 shadow-card", toneRing[tone], className)}
      {...props}
    >
      <p className="eyebrow">{label}</p>
      <p className={cn("mt-2 flex items-baseline gap-0.5", toneText[tone])}>
        <span className="figure text-[1.75rem]">{value}</span>
        {unit ? <span className="figure text-base opacity-60">{unit}</span> : null}
      </p>
      {caption ? <p className="mt-1.5 text-xs text-content-faint">{caption}</p> : null}
    </div>
  );
}

export {
  Card,
  HeroCard,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  Metric,
};
