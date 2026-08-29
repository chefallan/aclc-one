"use client";

import * as React from "react";
import { Plus, ScanLine, X, CircleCheckBig, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Metric } from "@/components/ui/card";
import { Badge, StatusPill } from "@/components/ui/badge";
import { AvatarBlock } from "@/components/ui/list-row";
import { Input } from "@/components/ui/input";
import { QrScanner } from "@/components/class/qr-scanner";
import { cn } from "@/lib/utils";

interface Attendance {
  id: string;
  status: string;
  scannedAt: string | Date;
  student: { firstName: string; lastName: string; studentNumber: string };
}

interface Session {
  id: string;
  date: string | Date;
  startTime: string | Date;
  endTime: string | Date;
  subject: string | null;
  room: string | null;
  status: string;
  section?: { name: string; program?: { name: string } | null } | null;
  attendances?: Attendance[];
}

interface SectionOption {
  id: string;
  name: string;
  programName?: string | null;
}

interface TeacherDashboardProps {
  classSessions: Session[];
  sections: SectionOption[];
  user: { name?: string | null };
}

export function TeacherDashboard({ classSessions, sections }: TeacherDashboardProps) {
  const [sessions, setSessions] = React.useState<Session[]>(classSessions);
  const [active, setActive] = React.useState<Session | null>(
    classSessions.find((s) => s.status === "ACTIVE") ?? null
  );
  const [creating, setCreating] = React.useState(false);
  const [scanning, setScanning] = React.useState(false);
  const [notice, setNotice] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function createSession(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/class-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: form.get("sectionId"),
          date: form.get("date"),
          startTime: form.get("startTime"),
          endTime: form.get("endTime"),
          room: form.get("room"),
          subject: form.get("subject"),
        }),
      });
      const body = await res.json();

      if (!res.ok || !body.success) {
        setNotice({ tone: "error", text: body.error ?? "That session could not be started." });
        return;
      }

      setSessions((prev) => [body.data, ...prev]);
      setActive(body.data);
      setCreating(false);
    } finally {
      setBusy(false);
    }
  }

  async function closeSession(sessionId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/class-sessions/${sessionId}/close`, { method: "POST" });
      const body = await res.json();
      if (body.success) {
        setActive(null);
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, status: "CLOSED" } : s))
        );
        setNotice({ tone: "ok", text: "Session closed. The sheet is submitted." });
      }
    } finally {
      setBusy(false);
    }
  }

  async function scanStudent(payload: string) {
    if (!active) return;
    try {
      const parsed = JSON.parse(payload) as { token?: string };
      const res = await fetch(`/api/class-sessions/${active.id}/scan-student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentQrToken: parsed.token }),
      });
      const body = await res.json();

      setNotice({
        tone: body.success ? "ok" : "error",
        text: body.message ?? body.error ?? "That code could not be read.",
      });

      if (body.success) {
        const refresh = await fetch(`/api/class-sessions/${active.id}`);
        if (refresh.ok) {
          const refreshed = await refresh.json();
          if (refreshed.success) {
            setActive(refreshed.data);
            setSessions((prev) =>
              prev.map((s) => (s.id === active.id ? refreshed.data : s))
            );
          }
        }
      }
    } catch {
      setNotice({ tone: "error", text: "That code could not be read." });
    }
  }

  const today = new Date().toDateString();
  const todayCount = sessions.filter((s) => new Date(s.date).toDateString() === today).length;
  const markedToday = sessions
    .filter((s) => new Date(s.date).toDateString() === today)
    .reduce((sum, s) => sum + (s.attendances?.length ?? 0), 0);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Faculty</p>
          <h1 className="mt-1 text-2xl font-semibold">Your sessions</h1>
        </div>
        {!creating && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            Start a session
          </Button>
        )}
      </header>

      {notice && (
        <div
          role="status"
          className={cn(
            "flex items-start gap-2.5 rounded-card border px-4 py-3 text-sm",
            notice.tone === "ok"
              ? "border-present-500/40 bg-present-50 text-present-700 dark:bg-present-700/20 dark:text-present-50"
              : "border-absent-500/40 bg-absent-50 text-absent-700 dark:bg-absent-900/30 dark:text-absent-200"
          )}
        >
          {notice.tone === "ok" ? (
            <CircleCheckBig className="mt-0.5 size-4 shrink-0" />
          ) : (
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          )}
          <p>{notice.text}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Sessions today" value={todayCount} />
        <Metric label="Checked in today" value={markedToday} tone="present" />
        <Metric label="All sessions" value={sessions.length} />
        <Metric
          label="Live now"
          value={sessions.filter((s) => s.status === "ACTIVE").length}
          tone={sessions.some((s) => s.status === "ACTIVE") ? "present" : "neutral"}
        />
      </div>

      {creating && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Start a class session</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCreating(false)}>
              <X className="size-4" />
              <span className="sr-only">Cancel</span>
            </Button>
          </CardHeader>
          <CardContent>
            {sections.length === 0 ? (
              <p className="text-sm text-content-muted">
                You have no sections assigned yet. Ask your coordinator to add you to one.
              </p>
            ) : (
              <form onSubmit={createSession} className="grid gap-4 sm:grid-cols-2">
                <Field label="Section" htmlFor="sectionId">
                  {/* Was a free-text box asking for an internal id. Nobody
                      should have to know what a CUID is. */}
                  <select
                    id="sectionId"
                    name="sectionId"
                    required
                    className="h-11 w-full rounded-field border border-hairline-strong bg-surface px-3 text-base text-content focus-visible:border-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/25 sm:text-sm"
                  >
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.programName ? ` — ${s.programName}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Subject" htmlFor="subject">
                  <Input id="subject" name="subject" placeholder="Systems Integration" />
                </Field>

                <Field label="Date" htmlFor="date">
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                  />
                </Field>

                <Field label="Room" htmlFor="room">
                  <Input id="room" name="room" placeholder="RM 304" issued />
                </Field>

                <Field label="Starts" htmlFor="startTime">
                  <Input id="startTime" name="startTime" type="datetime-local" required />
                </Field>

                <Field label="Ends" htmlFor="endTime">
                  <Input id="endTime" name="endTime" type="datetime-local" required />
                </Field>

                <div className="sm:col-span-2">
                  <Button type="submit" disabled={busy} block>
                    {busy ? "Starting…" : "Start session"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {active && (
        <Card className="border-brand-300">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle>{active.subject ?? "Class session"}</CardTitle>
                <p className="data mt-1 text-sm text-content-faint">
                  {active.section?.name ?? "Section"}
                  {active.room ? ` · ${active.room}` : ""} · {formatTime(active.startTime)}–
                  {formatTime(active.endTime)}
                </p>
              </div>
              <Badge variant={active.status === "ACTIVE" ? "present" : "secondary"} dot>
                {titleCase(active.status)}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="relative overflow-hidden rounded-hero bg-brand-600 p-4 text-white shadow-hero">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full bg-gold-400/20 blur-2xl"
              />
              <div className="relative flex items-center gap-4">
                <span className="shrink-0">
                  <span className="figure text-[2rem] text-white">
                    {active.attendances?.length ?? 0}
                  </span>
                  <span className="eyebrow mt-1 block text-brand-200">Checked in</span>
                </span>
                <p className="text-[0.8125rem] leading-snug text-brand-100">
                  Newest arrival first, matching what you watch during the first
                  ten minutes. A mismatch is a prompt for judgement, never an
                  automatic mark.
                </p>
              </div>
            </div>

            {/* One way to record attendance: scan the student in front of you.
                There is no code to project — a code on the board can be
                photographed and used from anywhere.

                Gold, because it is the one thing this screen exists to do. */}
            <Button onClick={() => setScanning((v) => !v)} variant="accent" size="lg" block>
              <ScanLine className="size-4" strokeWidth={1.8} />
              {scanning ? "Stop scanning" : "Scan student codes"}
            </Button>

            {scanning && <QrScanner onScan={scanStudent} />}

            <Roster attendances={active.attendances ?? []} />

            {/* Sheet 03.4: "Submit sheet" is the familiar mental model, so
                adoption does not require re-learning the job. */}
            <Button variant="outline" onClick={() => closeSession(active.id)} disabled={busy} block>
              Submit sheet and close
            </Button>
          </CardContent>
        </Card>
      )}

      <section aria-labelledby="recent-sessions" className="space-y-2.5">
        <h2 id="recent-sessions" className="text-lg font-semibold">
          Recent sessions
        </h2>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-content-muted">
              No sessions yet. Start one and the roster fills itself.
            </CardContent>
          </Card>
        ) : (
          <ul className="divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
            {sessions.slice(0, 10).map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setActive(s)}
                  className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-sunk"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.subject ?? "Class session"}</p>
                    <p className="data mt-0.5 text-xs text-content-faint">
                      {formatDate(s.date)}
                      {s.room ? ` · ${s.room}` : ""}
                      {s.section?.name ? ` · ${s.section.name}` : ""}
                    </p>
                  </div>
                  <span className="data text-sm text-content-muted">
                    {s.attendances?.length ?? 0}
                  </span>
                  <Badge
                    variant={
                      s.status === "ACTIVE" ? "present" : s.status === "CLOSED" ? "secondary" : "outline"
                    }
                  >
                    {titleCase(s.status)}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Newest arrival first — that is what an instructor watches in the first ten minutes. */
function Roster({ attendances }: { attendances: Attendance[] }) {
  if (attendances.length === 0) {
    return (
      <p className="rounded-field bg-surface-sunk p-4 text-center text-sm text-content-muted">
        Nobody has checked in yet.
      </p>
    );
  }

  const ordered = [...attendances].sort(
    (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
  );

  return (
    <div>
      <p className="eyebrow mb-2">Arrived · newest first</p>
      <ul className="divide-y divide-hairline overflow-hidden rounded-field border border-hairline">
        {ordered.map((a) => (
          <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
            <AvatarBlock
              label={initials(a.student.firstName, a.student.lastName)}
              tone={a.status === "LATE" ? "gold" : "present"}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {a.student.lastName}, {a.student.firstName}
              </p>
              <p className="data text-xs text-content-faint">{a.student.studentNumber}</p>
            </div>
            <StatusPill variant={a.status === "LATE" ? "late" : "present"}>
              {formatTime(a.scannedAt)}
            </StatusPill>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function initials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function formatTime(value: string | Date) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString([], { month: "short", day: "numeric" });
}

function titleCase(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
