import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Buttons say what happens: "Check in", never "Submit". Sentence case
 * everywhere. (Concept sheet 01 · Components · Voice.)
 *
 * Three shapes carry almost every screen:
 *
 *   default   institutional blue, for the primary action of a card or a form
 *   accent    Ormoc gold, for the one thing a screen exists for
 *   outline   white with a hairline, for Cancel and for the second choice
 *
 * The accent is rationed on purpose. Gold means "this needs you" — the check-in
 * on the home hero, the sign-in, "Walk me there", "Show the code". If two gold
 * buttons ever appear on one screen, one of them is wrong.
 */
const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-field font-medium transition-[background-color,border-color,color,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-brand-600 text-white shadow-card hover:bg-brand-700 active:bg-brand-800",
        /* Sheet 02.1: "Gold on the primary action: the only thing to do on
           this screen." Ink on gold, never white — white on #F2B233 fails
           contrast at every size the app uses. */
        accent:
          "bg-gold-500 text-ink-900 shadow-card hover:bg-gold-400 active:bg-gold-600",
        destructive:
          "bg-absent-500 text-white shadow-card hover:bg-absent-600 active:bg-absent-700",
        outline:
          "border border-hairline-strong bg-surface text-content hover:bg-surface-sunk hover:border-brand-300",
        secondary:
          "bg-brand-50 text-brand-800 hover:bg-brand-100 dark:bg-brand-900 dark:text-brand-100 dark:hover:bg-brand-800",
        ghost: "text-content-muted hover:bg-surface-sunk hover:text-content",
        link: "text-brand-600 underline-offset-4 hover:underline dark:text-brand-300",
        /* Study-buddy activity. Purple so social never reads as official. */
        buddy:
          "bg-buddy-500 text-white shadow-card hover:bg-buddy-400 active:bg-buddy-600",
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
  /**
   * The work has started and has not finished. A tap on a phone gives no
   * pressed-state feedback worth the name, so without this the person cannot
   * tell whether the button registered at all and taps it again.
   *
   * The spinner is the signal; `loadingText` replaces the label when there is
   * something more useful to say than the label itself ("Signing you in…").
   * Disabling is automatic — a submit that fires twice is a duplicate request.
   */
  loading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      block,
      asChild = false,
      loading = false,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    // Slot forwards to exactly one child, so a spinner cannot be added
    // alongside it. `asChild` is used for links, which have nothing to wait for.
    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, block, className }))}
          ref={ref}
          disabled={disabled}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, block, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
        {loading && loadingText ? loadingText : children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
