import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Concept sheet 01 · Components · "LIST ROW — THE WORKHORSE".
 *
 * Nearly every screen in this app is a list of people, or of things attached to
 * people. One row shape carries all of them: a square initial block, a name, a
 * line of context underneath, and a state on the right.
 *
 * The initial block is not decoration. On a directory of thirty-four staff it is
 * the thing the eye lands on first, and its tone is the row's state — green for
 * available, gold for occupied, red for out — so the list is scannable before a
 * single word is read.
 */

const avatarVariants = cva(
  "flex shrink-0 items-center justify-center rounded-[0.625rem] font-semibold uppercase leading-none tracking-tight",
  {
    variants: {
      tone: {
        brand: "bg-brand-600 text-white",
        gold: "bg-gold-500 text-ink-900",
        present: "bg-present-500 text-white",
        absent: "bg-absent-500 text-white",
        buddy: "bg-buddy-500 text-white",
        neutral: "bg-slab-200 text-slab-700 dark:bg-slab-700 dark:text-slab-100",
        /* A rank rather than a person: the queue positions on sheet 08.3. */
        rank: "bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-100",
      },
      size: {
        sm: "size-8 text-[0.6875rem]",
        default: "size-10 text-xs",
        lg: "size-14 text-base",
        xl: "size-16 text-lg",
      },
    },
    defaultVariants: { tone: "brand", size: "default" },
  }
);

export interface AvatarBlockProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof avatarVariants> {
  /** The person's name; initials are derived from it. */
  name?: string;
  /** An explicit label when the block is not standing in for a name. */
  label?: React.ReactNode;
}

/** "Rhea Salvatierra" → "RS". Two letters, because three stops being a glance. */
export function initialsOf(name: string): string {
  const parts = name
    .replace(/[^\p{L}\p{N}\s.'-]/gu, " ")
    .split(/\s+/)
    .filter((p) => p && !/^(ma'?am|sir|mr\.?|ms\.?|mrs\.?|dr\.?|engr\.?)$/i.test(p));
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AvatarBlock({
  name,
  label,
  tone,
  size,
  className,
  ...props
}: AvatarBlockProps) {
  return (
    <span aria-hidden className={cn(avatarVariants({ tone, size }), className)} {...props}>
      {label ?? (name ? initialsOf(name) : "?")}
    </span>
  );
}

export interface ListRowProps {
  /** Rendered at the left. Usually an AvatarBlock, sometimes an icon tile. */
  leading?: React.ReactNode;
  title: React.ReactNode;
  /** The line of context under the name: role, floor, section, student number. */
  subtitle?: React.ReactNode;
  /** The state, on the right. Usually a StatusPill, sometimes a time. */
  trailing?: React.ReactNode;
  /** Turns the row into a link and adds the chevron. */
  href?: string;
  onClick?: () => void;
  /** Shows the chevron without a href, for rows that open a sheet. */
  chevron?: boolean;
  className?: string;
}

export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  href,
  onClick,
  chevron,
  className,
}: ListRowProps) {
  const interactive = Boolean(href || onClick);

  const body = (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-semibold leading-tight">
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-[0.8125rem] leading-tight text-content-muted">
            {subtitle}
          </span>
        ) : null}
      </span>
      {trailing ? <span className="shrink-0 text-right">{trailing}</span> : null}
      {(href || chevron) && (
        <ChevronRight aria-hidden className="size-4 shrink-0 text-content-faint" />
      )}
    </>
  );

  // 44px minimum tap target, per the grid note on sheet 01.
  const classes = cn(
    "flex w-full min-h-11 items-center gap-3 px-4 py-3 text-left",
    interactive && "transition-colors hover:bg-surface-sunk",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {body}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {body}
      </button>
    );
  }

  return <div className={classes}>{body}</div>;
}

/**
 * The container the rows live in: one card, hairlines between rows rather than
 * around each of them, so a directory reads as one object.
 */
export function ListGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-card border border-hairline bg-surface shadow-card [&>*+*]:border-t [&>*+*]:border-hairline",
        className
      )}
    >
      {children}
    </div>
  );
}
