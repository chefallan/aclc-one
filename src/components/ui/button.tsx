import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Buttons say what happens: "Check in", never "Submit".
 *
 * Blue is the primary action everywhere. Red is reserved for destructive work
 * so that seeing it always means the same thing.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-field font-medium transition-[background-color,border-color,color,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-brand-700 text-white shadow-card hover:bg-brand-800 active:bg-brand-900",
        destructive:
          "bg-absent-600 text-white shadow-card hover:bg-absent-700 active:bg-absent-800",
        outline:
          "border border-hairline-strong bg-surface text-content hover:bg-surface-sunk hover:border-brand-300",
        secondary:
          "bg-brand-50 text-brand-800 hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-200 dark:hover:bg-brand-900",
        ghost: "text-content-muted hover:bg-surface-sunk hover:text-content",
        link: "text-brand-700 underline-offset-4 hover:underline dark:text-brand-300",
      },
      size: {
        // 44px minimum — students tap these one-handed on the stairs.
        default: "h-11 px-4 text-sm",
        sm: "h-9 px-3 text-sm",
        lg: "h-13 px-6 text-base",
        icon: "h-11 w-11",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, block, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
