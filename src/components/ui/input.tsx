import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Renders the value in mono — use for student numbers, room codes, times. */
  issued?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, issued, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-field border border-hairline-strong bg-surface px-3 text-base text-content",
          "placeholder:text-content-faint",
          "transition-colors hover:border-brand-300",
          "focus-visible:border-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/25",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-sunk",
          "aria-[invalid=true]:border-absent-500 aria-[invalid=true]:ring-absent-500/25",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-brand-700",
          // 16px on mobile stops iOS Safari zooming the viewport on focus.
          "sm:text-sm",
          issued && "data tracking-tight",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
