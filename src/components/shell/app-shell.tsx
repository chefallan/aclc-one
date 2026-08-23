"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  House,
  QrCode,
  BookOpen,
  CircleUser,
  ClipboardCheck,
  Settings,
  ChartNoAxesColumn,
  CalendarDays,
  UserCheck,
  Users,
  Printer,
  GraduationCap,
  MapPin,
  NotebookPen,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/notification-bell";

type Role = "ADMIN" | "FACULTY" | "STUDENT" | "SUPERVISOR";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Raised centre action in the student tab bar. */
  primary?: boolean;
};

/**
 * Navigation is per role rather than one menu with things greyed out — a
 * supervisor should never see the shape of the admin app.
 *
 * Nothing here links to a screen that does not exist yet. A tab that leads
 * nowhere is worse than a missing tab.
 */
const NAV: Record<Role, NavItem[]> = {
  STUDENT: [
    { href: "/dashboard", label: "Home", icon: House },
    { href: "/dashboard/schedule", label: "Schedule", icon: CalendarDays },
    { href: "/dashboard/scan", label: "Check in", icon: QrCode, primary: true },
    { href: "/dashboard/my-grades", label: "Grades", icon: GraduationCap },
    { href: "/dashboard/library", label: "Study", icon: BookOpen },
    { href: "/dashboard/campus", label: "Campus", icon: MapPin },
  ],
  FACULTY: [
    { href: "/dashboard", label: "Dashboard", icon: House },
    { href: "/dashboard/schedule", label: "Schedule", icon: CalendarDays },
    { href: "/dashboard/attendance-reports", label: "Attendance", icon: ClipboardCheck },
    { href: "/dashboard/attendance-sheet", label: "Sheets", icon: Printer },
    { href: "/dashboard/grades", label: "Grades", icon: GraduationCap },
    { href: "/dashboard/students", label: "Students", icon: Users },
    { href: "/dashboard/library", label: "Library", icon: BookOpen },
    { href: "/dashboard/notes", label: "Notes", icon: NotebookPen },
    { href: "/dashboard/campus", label: "Campus", icon: MapPin },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ],
  ADMIN: [
    { href: "/dashboard", label: "Dashboard", icon: House },
    { href: "/dashboard/accounts", label: "Requests", icon: UserCheck },
    { href: "/dashboard/attendance-reports", label: "Reports", icon: ChartNoAxesColumn },
    { href: "/dashboard/attendance-sheet", label: "Sheets", icon: Printer },
    { href: "/dashboard/grades", label: "Grades", icon: GraduationCap },
    { href: "/dashboard/sections", label: "Sections", icon: CalendarDays },
    { href: "/dashboard/students", label: "Students", icon: Users },
    { href: "/dashboard/campus", label: "Campus", icon: MapPin },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ],
  SUPERVISOR: [
    { href: "/dashboard", label: "Dashboard", icon: House },
    { href: "/dashboard/attendance-reports", label: "Attendance", icon: ClipboardCheck },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  FACULTY: "Faculty & staff",
  STUDENT: "Student",
  SUPERVISOR: "Workplace supervisor",
};

export interface AppShellProps {
  role: Role;
  name: string;
  /** Student number, or the role label for staff. Shown in mono when issued. */
  identifier?: string;
  children: React.ReactNode;
}

export function AppShell({ role, name, identifier, children }: AppShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const items = NAV[role] ?? NAV.STUDENT;
  const isStudent = role === "STUDENT";

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="flex min-h-dvh flex-col">
      <header data-print="hide" className="sticky top-0 z-40 border-b border-hairline bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Mark />
            <span className="text-[0.95rem] font-semibold tracking-tight">ACLC One</span>
          </Link>

          {/* Desktop nav for staff; students navigate from the tab bar. */}
          {!isStudent && (
            <nav className="ml-4 hidden items-center gap-0.5 md:flex">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "rounded-field px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200"
                      : "text-content-muted hover:bg-surface-sunk hover:text-content"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <Link
              href="/dashboard/settings"
              className="mx-1 flex items-center gap-2 rounded-field px-1.5 py-1 transition-colors hover:bg-surface-sunk"
            >
              <span className="hidden text-right sm:block">
                <span className="block text-sm font-medium leading-tight">{name}</span>
                <span className="block text-[0.7rem] leading-tight text-content-faint">
                  {identifier ? <span className="data">{identifier}</span> : ROLE_LABEL[role]}
                </span>
              </span>
              <CircleUser className="size-5 text-content-muted sm:hidden" />
              <span className="sr-only">Your account</span>
            </Link>
            {!isStudent && (
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-controls="mobile-nav"
                className="inline-flex size-11 items-center justify-center rounded-field text-content-muted hover:bg-surface-sunk md:hidden"
              >
                {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              className="hidden size-11 items-center justify-center rounded-field text-content-muted hover:bg-surface-sunk hover:text-absent-600 md:inline-flex"
            >
              <LogOut className="size-4.5" />
              <span className="sr-only">Sign out</span>
            </button>
          </div>
        </div>

        {!isStudent && menuOpen && (
          <nav id="mobile-nav" className="border-t border-hairline px-2 py-2 md:hidden">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-field px-3 py-3 text-sm font-medium",
                  isActive(item.href)
                    ? "bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200"
                    : "text-content-muted"
                )}
              >
                <item.icon className="size-4.5" />
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              className="flex w-full items-center gap-3 rounded-field px-3 py-3 text-sm font-medium text-absent-600"
            >
              <LogOut className="size-4.5" />
              Sign out
            </button>
          </nav>
        )}
      </header>

      <main id="main" className={cn("mx-auto w-full max-w-6xl flex-1 px-4 py-5", isStudent && "pb-28")}>
        {children}
      </main>

      {isStudent && <StudentTabBar items={items} isActive={isActive} />}
    </div>
  );
}

function StudentTabBar({
  items,
  isActive,
}: {
  items: NavItem[];
  isActive: (href: string) => boolean;
}) {
  return (
    <nav
      aria-label="Main"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-lg items-end justify-around px-2 pt-1.5">
        {items.map((item) => {
          const active = isActive(item.href);

          // The raised centre action. Check in is the one thing a student opens
          // the app to do, so it is reachable from every screen without aiming.
          if (item.primary) {
            return (
              <li key={item.href} className="-mt-6">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="flex flex-col items-center gap-1"
                >
                  <span className="flex size-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-raised ring-4 ring-surface transition-colors hover:bg-brand-800">
                    <item.icon className="size-6" />
                  </span>
                  <span className="text-[0.65rem] font-medium text-brand-800 dark:text-brand-300">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          }

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-16 flex-col items-center gap-1 rounded-field px-2 py-2 transition-colors",
                  active ? "text-brand-700 dark:text-brand-300" : "text-content-faint hover:text-content"
                )}
              >
                <item.icon className="size-5.5" />
                <span className="text-[0.65rem] font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** The mark: institutional blue slab, red rule. The only place the two meet. */
export function Mark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex size-8 items-center justify-center overflow-hidden rounded-[0.5rem] bg-brand-700 text-white",
        className
      )}
    >
      <span className="text-[0.8rem] font-bold leading-none tracking-tight">A1</span>
      <span className="absolute inset-x-0 bottom-0 h-[3px] bg-navy-700" />
    </span>
  );
}
