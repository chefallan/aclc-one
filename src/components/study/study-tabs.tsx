"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Concept sheet 05.1 · "Study is a hub of three: Library, Notes, Buddies. One
 * tab, three related jobs, so the tab bar stays at five."
 *
 * The three are separate routes rather than one page with client state, because
 * each is worth a URL a student can send to a classmate. The control is the
 * hub — it just navigates instead of switching a panel.
 */
const TABS = [
  { href: "/dashboard/library", label: "Library" },
  { href: "/dashboard/notes", label: "Notes" },
  { href: "/dashboard/study-buddy", label: "Buddies" },
];

export function StudyTabs({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Study"
      className={cn(
        "flex gap-1 rounded-field border border-hairline bg-surface-sunk p-1",
        className
      )}
    >
      {TABS.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex-1 rounded-[0.4rem] px-3 py-2 text-center text-sm font-medium transition-colors",
              active
                ? "bg-surface text-brand-800 shadow-card dark:text-brand-200"
                : "text-content-muted hover:text-content"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
