"use client";

import * as React from "react";
import { Eye, EyeOff, CircleCheckBig } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, Metric } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PresencePill, type PresenceView } from "@/components/campus/presence-pill";
import { errandLabel } from "@/lib/campus/errands";
import { cn } from "@/lib/utils";

interface QueuePerson {
  id: string;
  errand: string;
  joinedAt: string;
  student: { firstName: string; lastName: string; studentNumber: string };
}

interface Desk {
  id: string;
  position: string;
  visibility: "VISIBLE" | "HIDDEN";
  presenceStatus: string;
  derived: PresenceView;
  avgServiceMinutes: number;
  office: { id: string; name: string; room: string | null; floor: { label: string; name: string | null } } | null;
  waiting: QueuePerson[];
  servedToday: number;
}

/** One tap, from a short list of true situations. "Lunch till 1:00" is what people say. */
const QUICK_STATUS = [
  { status: "AT_DESK", label: "At the window" },
  { status: "STEPPED_OUT", label: "Stepped out" },
  { status: "LUNCH", label: "Lunch till 1:00", untilHour: 13 },
  { status: "IN_MEETING", label: "In a meeting" },
  { status: "IN_CLASS", label: "In class" },
  { status: "OFF_CAMPUS", label: "Off campus" },
] as const;

export function StaffDesk() {
  const [desk, setDesk] = React.useState<Desk | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await fetch("/api/campus/presence");
    const body = await res.json();
    if (!res.ok || !body.success) {
      setError(body.error ?? "Couldn't load your desk.");
      setDesk(null);
    } else {
      setDesk(body.data);
      setError("");
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/campus/presence");
      const body = await res.json();
      if (cancelled) return;
      if (!res.ok || !body.success) setError(body.error ?? "Couldn't load your desk.");
      else setDesk(body.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function setStatus(status: string, untilHour?: number) {
    setBusy(true);
    setNotice("");
    try {
      let until: string | null = null;
      if (untilHour !== undefined) {
        const d = new Date();
        d.setHours(untilHour, 0, 0, 0);
        if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
        until = d.toISOString();
      }
      const res = await fetch("/api/campus/presence", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, until }),
      });
      if (res.ok) {
        setNotice("Status updated.");
        await load();
      } else {
        const body = await res.json();
        setError(body.error ?? "Couldn't update your status.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleVisibility() {
    if (!desk) return;
    setBusy(true);
    try {
      const next = desk.visibility === "VISIBLE" ? "HIDDEN" : "VISIBLE";
      const res = await fetch("/api/campus/presence", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: next }),
      });
      if (res.ok) {
        setNotice(
          next === "HIDDEN"
            ? "You're hidden. Students won't see you in the finder today."
            : "You're visible again."
        );
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function markServed(entryId: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/campus/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, action: "SERVED" }),
      });
      if (res.ok) await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="py-16 text-center text-sm text-content-muted">Loading your desk…</p>;
  }

  if (!desk) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="p-8 text-center">
          <p className="font-medium">No desk yet</p>
          <p className="mt-1 text-sm text-content-muted">
            {error || "Ask your administrator to add you to the campus directory."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const hidden = desk.visibility === "HIDDEN";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Concept sheet 08.3 · Staff view — the other half.

          The staff finder only works if staff want to be found, so this screen
          trades something back: a queue they can see and clear. */}
      <header>
        <h1 className="text-2xl">{desk.office?.name ?? "Your desk"}</h1>
        <p className="eyebrow mt-1.5">
          Staff view · {desk.office?.floor.label}
          {desk.office?.room ? ` · ${desk.office.room}` : ""} · {desk.position}
        </p>
      </header>

      {notice && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-field border border-present-500/40 bg-present-50 px-3.5 py-3 text-sm text-present-700 dark:bg-present-700/20 dark:text-present-50"
        >
          <CircleCheckBig className="mt-0.5 size-4 shrink-0" />
          <p>{notice}</p>
        </div>
      )}

      <Card className={cn(hidden ? "border-slab-300" : "border-present-500/40")}>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-medium">
              {hidden ? "You're hidden from students" : "Students can see you as"}
            </p>
            {!hidden && (
              <div className="mt-1.5">
                <PresencePill presence={desk.derived} showDetail />
              </div>
            )}
          </div>
          <Button variant={hidden ? "default" : "outline"} onClick={toggleVisibility} disabled={busy}>
            {hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            {hidden ? "Show me again" : "Hide me today"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Metric
          label="Waiting now"
          value={desk.waiting.length}
          caption={desk.waiting.length > 0 ? `~${desk.avgServiceMinutes} min each` : "Nobody in line"}
          tone={desk.waiting.length > 4 ? "late" : "neutral"}
        />
        <Metric label="Served today" value={desk.servedToday} tone="present" />
      </div>

      <section aria-labelledby="status-heading">
        <h2 id="status-heading" className="eyebrow mb-2.5">
          Quick status
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_STATUS.map((s) => {
            const active = desk.presenceStatus === s.status && !hidden;
            return (
              <button
                key={s.status}
                type="button"
                disabled={busy}
                onClick={() => setStatus(s.status, "untilHour" in s ? s.untilHour : undefined)}
                aria-pressed={active}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                  active
                    ? "border-ink-900 bg-ink-900 text-white"
                    : "border-hairline-strong text-content-muted hover:border-brand-300 hover:text-content"
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="queue-heading" className="space-y-2.5">
        <h2 id="queue-heading" className="text-lg font-semibold">
          Your queue
        </h2>

        {desk.waiting.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-content-muted">
              Nobody is waiting.
            </CardContent>
          </Card>
        ) : (
          <ul className="divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
            {desk.waiting.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 p-4">
                <span className="data flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-100">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {p.student.lastName}, {p.student.firstName}
                  </p>
                  <p className="data text-xs text-content-faint">
                    {p.student.studentNumber} · {errandLabel(p.errand)}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => markServed(p.id)} disabled={busy}>
                  Served
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Consent on the same screen as the toggle, not in a policy document. */}
      <Card>
        <CardContent className="p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Eye className="size-4 text-content-faint" />
            What students can see
          </p>
          <p className="mt-1.5 text-sm text-content-muted">
            Your office, your status, your window hours, and how many people are waiting. Never
            your exact position, and never a history of where you have been.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Badge variant="outline">Office &amp; floor</Badge>
            <Badge variant="outline">Status</Badge>
            <Badge variant="outline">Queue length</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
