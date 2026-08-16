"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Footprints, Clock, CircleCheckBig, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, Metric } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FloorStack, type FloorSummary } from "@/components/campus/floor-stack";
import { PresencePill, type PresenceView } from "@/components/campus/presence-pill";
import { errandLabel } from "@/lib/campus/errands";
import { flightsBetween } from "@/lib/campus/presence";
import { cn } from "@/lib/utils";

interface StaffPerson {
  id: string;
  name: string;
  initials: string;
  position: string;
  handles: string[];
  presence: PresenceView;
  waiting: number;
  avgServiceMinutes: number;
  estimatedWaitMinutes: number | null;
  office: {
    id: string;
    name: string;
    room: string | null;
    opensAt: string | null;
    closesAt: string | null;
    lunchStart: string | null;
    lunchEnd: string | null;
    directions: string | null;
    floor: { label: string; level: number; name: string | null };
  } | null;
}

export function StaffProfile({
  person,
  floors,
  canJoinQueue,
}: {
  person: StaffPerson;
  floors: FloorSummary[];
  canJoinQueue: boolean;
}) {
  const [notice, setNotice] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [waiting, setWaiting] = React.useState(person.waiting);
  const [joined, setJoined] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [showRoute, setShowRoute] = React.useState(false);

  // You are at the lobby unless we know otherwise. Ground floor, level 0.
  const walk = flightsBetween(0, person.office?.floor.level ?? 0);

  async function joinQueue() {
    if (!person.office) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/campus/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officeId: person.office.id,
          errand: person.handles[0] ?? "CLEARANCE",
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setNotice({ tone: "error", text: body.error ?? "Couldn't join that queue." });
        return;
      }
      setJoined(true);
      setWaiting((w) => w + 1);
      setNotice({
        tone: "ok",
        text: `You're in the queue — ${body.data.ahead} ahead of you.`,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/dashboard/campus"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
      >
        <ArrowLeft className="size-4" />
        Campus
      </Link>

      {notice && (
        <div
          role="status"
          className={cn(
            "flex items-start gap-2.5 rounded-field border px-3.5 py-3 text-sm",
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

      <Card>
        <CardContent className="p-5 text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-field bg-brand-50 font-display text-xl font-bold text-brand-800 dark:bg-brand-950 dark:text-brand-200">
            {person.initials}
          </span>
          <h1 className="mt-3 font-display text-xl font-semibold">{person.name}</h1>
          <p className="text-sm text-content-muted">{person.position}</p>

          <div className="mt-3 flex justify-center">
            <PresencePill presence={person.presence} showDetail />
          </div>

          {person.office && (
            <p className="data mt-3 text-[0.7rem] uppercase tracking-[0.12em] text-content-faint">
              {person.office.floor.label}
              {person.office.room ? ` · ${person.office.room}` : ""}
              {person.presence.updatedAt
                ? ` · updated ${new Date(person.presence.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                : ""}
            </p>
          )}
        </CardContent>
      </Card>

      {/* "Waiting: 4 · ~12 min each" turns a queue into a decision. */}
      <div className="grid grid-cols-2 gap-3">
        <Metric
          label="Waiting"
          value={waiting}
          caption={`~${person.avgServiceMinutes} min each`}
          tone={waiting > 4 ? "late" : "neutral"}
        />
        <Metric
          label="Window closes"
          value={person.office?.closesAt ?? "—"}
          caption={
            person.office?.lunchStart && person.office?.lunchEnd
              ? `Lunch ${person.office.lunchStart}–${person.office.lunchEnd}`
              : "No published break"
          }
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button onClick={() => setShowRoute((v) => !v)} variant="outline">
          <Footprints className="size-4" />
          {showRoute ? "Hide directions" : "Walk me there"}
        </Button>
        {canJoinQueue && person.office && (
          <Button onClick={joinQueue} disabled={busy || joined}>
            {joined ? "You're in the queue" : busy ? "Joining…" : "Join the queue"}
          </Button>
        )}
      </div>

      {showRoute && person.office && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-baseline gap-3">
              <span className="data text-2xl font-bold text-absent-600">
                {person.office.floor.label}
              </span>
              <div>
                <p className="font-medium">{person.office.name}</p>
                <p className="data text-xs text-content-faint">{walk.summary}</p>
              </div>
            </div>

            {/* Text steps, not a blue line on a floor plan. Indoor positioning
                is unreliable; landmarks are free and students already use them. */}
            {person.office.directions ? (
              <ol className="mt-4 space-y-2.5">
                {person.office.directions
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="data flex size-6 shrink-0 items-center justify-center rounded-[0.4rem] border border-hairline bg-surface-sunk text-xs font-semibold text-brand-700 dark:text-brand-300">
                        {i + 1}
                      </span>
                      <span className="text-sm text-content-muted">{step}</span>
                    </li>
                  ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm text-content-muted">
                No written directions for this office yet.{" "}
                {walk.flights === 0
                  ? "It's on your floor."
                  : `Take the stairs ${walk.direction} ${walk.flights}.`}
              </p>
            )}

            {!person.presence.available && (
              <div className="mt-4 flex items-start gap-2.5 rounded-field border border-late-500/40 bg-late-50 px-3.5 py-3 text-sm text-late-700 dark:bg-late-700/20 dark:text-late-50">
                <Clock className="mt-0.5 size-4 shrink-0" />
                <p>
                  {person.presence.label} right now — {person.presence.detail}. Worth checking
                  before you climb.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {person.handles.length > 0 && (
        <section aria-labelledby="handles-heading">
          <h2 id="handles-heading" className="eyebrow mb-2">
            Handles
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {person.handles.map((h) => (
              <Badge key={h} variant="secondary">
                {errandLabel(h)}
              </Badge>
            ))}
          </div>
        </section>
      )}

      <FloorStack
        floors={floors}
        youAreOnLevel={0}
        destinationLevel={person.office?.floor.level}
      />
    </div>
  );
}
