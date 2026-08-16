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

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1 p-5", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-lg font-semibold leading-tight tracking-[-0.006em]", className)}
      {...props}
    />
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
    <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-2 border-t border-hairline p-5", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

/**
 * A single number that matters, with its unit and the sentence that explains it.
 * Figures are mono because they come off an official record.
 */
interface MetricProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  unit?: string;
  caption?: string;
  tone?: "neutral" | "present" | "late" | "absent";
}

const toneRing: Record<NonNullable<MetricProps["tone"]>, string> = {
  neutral: "border-hairline",
  present: "border-present-500/40",
  late: "border-late-500/40",
  absent: "border-absent-500/50",
};

const toneText: Record<NonNullable<MetricProps["tone"]>, string> = {
  neutral: "text-content",
  present: "text-present-600",
  late: "text-late-600",
  absent: "text-absent-600",
};

function Metric({ label, value, unit, caption, tone = "neutral", className, ...props }: MetricProps) {
  return (
    <div
      className={cn(
        "rounded-card border bg-surface p-4 shadow-card",
        toneRing[tone],
        className
      )}
      {...props}
    >
      <p className="eyebrow">{label}</p>
      <p className={cn("mt-1.5 flex items-baseline gap-0.5", toneText[tone])}>
        <span className="data text-3xl font-semibold leading-none tracking-tight">{value}</span>
        {unit ? <span className="data text-base font-medium opacity-70">{unit}</span> : null}
      </p>
      {caption ? <p className="mt-1.5 text-xs text-content-faint">{caption}</p> : null}
    </div>
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  Metric,
};
