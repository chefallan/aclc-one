import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-24 w-full rounded-field border border-hairline-strong bg-surface px-3 py-2.5 text-base text-content",
          "placeholder:text-content-faint",
          "transition-colors hover:border-brand-300",
          "focus-visible:border-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/25",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-sunk",
          "aria-[invalid=true]:border-absent-500 aria-[invalid=true]:ring-absent-500/25",
          "sm:text-sm",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
