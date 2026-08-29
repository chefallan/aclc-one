"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bell,
  Check,
  CircleCheck,
  Clock,
  FileText,
  Flag,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * Concept sheet 02.4 · Notifications.
 *
 * Four classes, each with a colour, so the type is readable before the text is:
 *
 *   blue    attendance and anything else official
 *   gold    time-sensitive — a check-in window, a reminder with a clock on it
 *   coral   a deadline that can cost money or a record
 *   purple  social, so it never reads as school business
 *
 * The mapping is by notification type rather than by a severity field, because
 * severity is a property of the message and class is a property of the thing it
 * is about — and it is the second one a student is scanning for.
 */
const CLASSES = {
  official: {
    tone: "bg-brand-600 text-white",
    icon: MapPin,
  },
  timely: {
    tone: "bg-gold-500 text-ink-900",
    icon: Clock,
  },
  deadline: {
    tone: "bg-absent-500 text-white",
    icon: FileText,
  },
  done: {
    tone: "bg-present-500 text-white",
    icon: CircleCheck,
  },
  social: {
    tone: "bg-buddy-500 text-white",
    icon: Flag,
  },
} as const;

type ClassKey = keyof typeof CLASSES;

const BY_TYPE: Record<string, ClassKey> = {
  CLASS_SESSION_STARTED: "timely",
  TIME_OUT_REMINDER: "timely",
  HOURLY_LOG_REMINDER: "timely",
  ATTENDANCE_MARKED: "done",
  CLASS_SESSION_ENDED: "done",
  REPORT_GENERATED: "done",
  ATTENDANCE_MISSING: "deadline",
  MISSING_LOG: "deadline",
  CORRECTION_REQUEST: "deadline",
  SUPERVISOR_VERIFICATION_REQUEST: "official",
  TEACHER_REVIEW_REQUEST: "official",
};

function classOf(type: string): ClassKey {
  return BY_TYPE[type] ?? "official";
}

/** "2m", "18m", "1h", then the weekday, then the date. Sheet 02.4 shows all four. */
function ago(iso: string): string {
  const then = new Date(iso);
  const mins = Math.round((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return then.toLocaleDateString([], { weekday: "short" });
  return then.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Escape closes it. A panel that can only be dismissed by tapping the scrim
  // is unreachable from a keyboard.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotifications(data.data);
          setUnreadCount(data.data.filter((n: Notification) => !n.isRead).length);
        }
      }
    } catch {
      // A dead network leaves the last known list on screen, which is more
      // useful than an empty panel claiming there is nothing.
    }
  }

  async function markAsRead(id: string) {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      /* leave it unread; the next fetch will settle it */
    }
  }

  async function markAllAsRead() {
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch {
      /* leave them unread */
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) fetchNotifications();
        }}
        aria-expanded={open}
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
        }
        className="relative inline-flex size-11 items-center justify-center rounded-field text-content-muted transition-colors hover:bg-surface-sunk hover:text-content"
      >
        <Bell className="size-5" strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="data absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-absent-500 px-1 text-[0.625rem] font-semibold leading-4 text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Notifications"
            className="absolute right-0 top-12 z-50 w-[21rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-card border border-hairline bg-surface shadow-raised"
          >
            <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
              <p className="font-semibold">Notifications</p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[26rem] overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-content-muted">
                  Wala pa. Nothing needs you right now.
                </p>
              ) : (
                <ul className="[&>*+*]:border-t [&>*+*]:border-hairline">
                  {notifications.slice(0, 12).map((n) => {
                    const cls = CLASSES[classOf(n.type)];
                    const Icon = cls.icon;
                    return (
                      <li
                        key={n.id}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3",
                          !n.isRead && "bg-brand-50/50 dark:bg-brand-900/25"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-[0.625rem]",
                            cls.tone
                          )}
                        >
                          <Icon className="size-4" strokeWidth={1.8} aria-hidden />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-[0.875rem] font-semibold leading-snug">
                            {n.title}
                          </span>
                          <span className="mt-0.5 block text-[0.8125rem] leading-snug text-content-muted">
                            {n.body}
                          </span>
                        </span>

                        <span className="flex shrink-0 flex-col items-end gap-1.5">
                          <span className="data text-[0.6875rem] text-content-faint">
                            {ago(n.createdAt)}
                          </span>
                          {!n.isRead && (
                            <button
                              type="button"
                              onClick={() => markAsRead(n.id)}
                              aria-label="Mark as read"
                              className="rounded p-1 text-content-faint transition-colors hover:bg-surface-sunk hover:text-content"
                            >
                              <Check className="size-3.5" strokeWidth={2} />
                            </button>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Sheet 02.4 closes the panel with the control over what gets to
                interrupt you. */}
            <a
              href="/dashboard/settings"
              className="flex items-center justify-between border-t border-hairline px-4 py-3 text-sm font-medium transition-colors hover:bg-surface-sunk"
            >
              Choose what interrupts you
              <span aria-hidden className="text-content-faint">
                →
              </span>
            </a>
          </div>
        </>
      )}
    </div>
  );
}
