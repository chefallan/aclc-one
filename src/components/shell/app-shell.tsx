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
  CircleCheck,
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
import { AvatarBlock } from "@/components/ui/list-row";
import { NotificationBell } from "@/components/notifications/notification-bell";

type Role = "ADMIN" | "FACULTY" | "STUDENT" | "SUPERVISOR";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Raised centre action in the student tab bar. */
  primary?: boolean;
};

const NAV: Record<Role, NavItem[]> = {
  STUDENT: [
    { href: "/dashboard", label: "Home", icon: House },
    { href: "/dashboard/attend", label: "Attend", icon: CircleCheck },
    { href: "/dashboard/scan", label: "Check in", icon: QrCode, primary: true },
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

function greeting(now: Date = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

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
  const [topHovered, setTopHovered] = React.useState(false);
  const [bottomHovered, setBottomHovered] = React.useState(false);

  const isStudyMode = pathname?.startsWith("/dashboard/study") ?? false;
  const items = NAV[role] ?? NAV.STUDENT;
  const isStudent = role === "STUDENT";
  const hasSidebar = !isStudent;

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const onHome = isStudent && pathname === "/dashboard";

  return (
    <div className={cn("flex min-h-dvh flex-col", hasSidebar && !isStudyMode && "md:pl-60")}>
      {hasSidebar && !isStudyMode && <Sidebar items={items} isActive={isActive} />}

      {/* Top Edge Hover Sensor for Study Focus Mode */}
      {isStudyMode && (
        <div
          onMouseEnter={() => setTopHovered(true)}
          className="fixed top-0 inset-x-0 h-4 z-50 pointer-events-auto"
          aria-hidden="true"
        />
      )}

      {/* Top Header - Slides down on hover in Study Mode */}
      <header
        data-print="hide"
        onMouseEnter={() => isStudyMode && setTopHovered(true)}
        onMouseLeave={() => isStudyMode && setTopHovered(false)}
        className={cn(
          "z-40 border-b border-hairline bg-surface/95 backdrop-blur transition-transform duration-300 ease-in-out",
          hasSidebar && !isStudyMode && "md:hidden",
          !isStudyMode && "sticky top-0",
          isStudyMode && (
            topHovered
              ? "fixed inset-x-0 top-0 translate-y-0 shadow-2xl pointer-events-auto visible"
              : "fixed inset-x-0 top-0 -translate-y-full pointer-events-none invisible"
          )
        )}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-gutter">
          {onHome ? (
            <div className="flex min-w-0 items-center gap-2.5">
              <AvatarBlock name={name} size="sm" />
              <div className="min-w-0">
                <p className="text-[0.7rem] leading-none text-content-faint">
                  {greeting()}
                </p>
                <p className="truncate text-sm font-semibold tracking-tight text-content">
                  {name}
                </p>
              </div>
            </div>
          ) : (
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <Mark />
              <span className="text-[0.95rem] font-semibold tracking-tight">
                ACLC One
              </span>
            </Link>
          )}

          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />

            {hasSidebar ? (
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-label="Navigation menu"
                className="inline-flex size-11 items-center justify-center rounded-field text-content-muted transition-colors hover:bg-surface-sunk hover:text-content md:hidden"
              >
                {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            ) : (
              <Link
                href="/dashboard/settings"
                className="mx-1 flex items-center gap-2 rounded-field px-1.5 py-1 transition-colors hover:bg-surface-sunk"
              >
                <span className="hidden text-right sm:block">
                  <span className="block text-sm font-medium leading-tight">
                    {name}
                  </span>
                  <span className="block text-[0.7rem] leading-tight text-content-faint">
                    <span className="data">{identifier ?? ROLE_LABEL[role]}</span>
                  </span>
                </span>
                <CircleUser className="size-5 text-content-muted sm:hidden" />
                <span className="sr-only">Your account</span>
              </Link>
            )}
          </div>
        </div>

        {hasSidebar && menuOpen && (
          <nav
            aria-label="Mobile"
            className="border-t border-hairline bg-surface px-gutter py-2 md:hidden"
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-field px-3 py-3 text-sm font-medium",
                  isActive(item.href)
                    ? "bg-brand-50 text-brand-800 dark:bg-brand-900 dark:text-brand-100"
                    : "text-content-muted"
                )}
              >
                <item.icon className="size-4.5" strokeWidth={1.8} />
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              className="flex w-full items-center gap-3 rounded-field px-3 py-3 text-sm font-medium text-absent-600"
            >
              <LogOut className="size-4.5" strokeWidth={1.8} />
              Sign out
            </button>
          </nav>
        )}
      </header>

      {/* Main Content Area */}
      <main
        id="main"
        className={cn(
          "mx-auto w-full flex-1 transition-all duration-300",
          isStudyMode
            ? "max-w-none p-0"
            : cn(
                "px-gutter py-5",
                hasSidebar ? "max-w-6xl md:max-w-none md:pr-6" : "max-w-6xl",
                isStudent && "pb-28"
              )
        )}
      >
        {children}
      </main>

      {/* Bottom Edge Hover Sensor for Study Focus Mode */}
      {isStudent && isStudyMode && (
        <div
          onMouseEnter={() => setBottomHovered(true)}
          className="fixed bottom-0 inset-x-0 h-4 z-50 pointer-events-auto"
          aria-hidden="true"
        />
      )}

      {/* Student Bottom Navigation Tab Bar */}
      {isStudent && (
        <div
          onMouseEnter={() => isStudyMode && setBottomHovered(true)}
          onMouseLeave={() => isStudyMode && setBottomHovered(false)}
          className={cn(
            "transition-transform duration-300 ease-in-out z-40",
            !isStudyMode && "fixed inset-x-0 bottom-0 pointer-events-auto",
            isStudyMode && (
              bottomHovered
                ? "fixed inset-x-0 bottom-0 translate-y-0 shadow-2xl pointer-events-auto visible"
                : "fixed inset-x-0 bottom-0 translate-y-full pointer-events-none invisible"
            )
          )}
        >
          <StudentTabBar items={items} isActive={isActive} />
        </div>
      )}
    </div>
  );
}

function Sidebar({
  items,
  isActive,
}: {
  items: NavItem[];
  isActive: (href: string) => boolean;
}) {
  return (
    <aside
      data-print="hide"
      className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-hairline bg-surface md:flex"
    >
      <Link
        href="/dashboard"
        className="flex h-14 shrink-0 items-center gap-2.5 border-b border-hairline px-4"
      >
        <Mark />
        <span className="text-[0.95rem] font-semibold tracking-tight">ACLC One</span>
      </Link>

      <nav aria-label="Main" className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-field px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand-50 text-brand-800 dark:bg-brand-900 dark:text-brand-100"
                      : "text-content-muted hover:bg-surface-sunk hover:text-content"
                  )}
                >
                  <item.icon className="size-4.5 shrink-0" strokeWidth={1.8} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-hairline p-2">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="flex w-full items-center gap-3 rounded-field px-3 py-2 text-sm font-medium text-content-muted transition-colors hover:bg-surface-sunk hover:text-absent-600"
        >
          <LogOut className="size-4.5 shrink-0" strokeWidth={1.8} />
          Sign out
        </button>
      </div>
    </aside>
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
      data-print="hide"
      className="safe-bottom w-full border-t border-hairline bg-surface/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-lg items-end justify-around px-2 pt-1.5">
        {items.map((item) => {
          const active = isActive(item.href);

          if (item.primary) {
            return (
              <li key={item.href} className="-mt-6">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="flex flex-col items-center gap-1"
                >
                  <span className="flex size-14 items-center justify-center rounded-full bg-gold-500 text-ink-900 shadow-raised ring-4 ring-surface transition-colors hover:bg-gold-400">
                    <item.icon className="size-6" strokeWidth={1.8} />
                  </span>
                  <span className="text-[0.65rem] font-medium text-gold-700 dark:text-gold-300">
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
                  active
                    ? "text-brand-600 dark:text-brand-300"
                    : "text-content-faint hover:text-content"
                )}
              >
                <item.icon className="size-5.5" strokeWidth={1.8} />
                <span className="text-[0.65rem] font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Mark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex size-8 items-center justify-center overflow-hidden rounded-[0.5rem] bg-brand-600 text-white",
        className
      )}
    >
      <span className="text-[0.8rem] font-bold leading-none tracking-tight">A1</span>
      <span className="absolute inset-x-0 bottom-0 h-[3px] bg-gold-500" />
    </span>
  );
}
