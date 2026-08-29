"use client";

import * as React from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { Check, ScanLine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { Guidance } from "@/components/ui/guidance";
import { ListGroup, ListRow } from "@/components/ui/list-row";
import { cn } from "@/lib/utils";

interface OpenSession {
  id: string;
  subject: string | null;
  room: string | null;
  startTime: string;
  endTime: string;
  status: string;
  teacher: string | null;
}

interface TodayAttendance {
  classSessionId: string;
  status: string;
  scannedAt: string;
}

interface CheckInPanelProps {
  qrCodeToken: string;
  studentNumber: string;
  studentName: string;
  openSessions: OpenSession[];
  todayAttendance: TodayAttendance[];
}

/**
 * Concept sheets 03.1 and 03.2, against this school's own check-in.
 *
 * The deck describes a rotating code on the board that the student scans, with
 * a beacon and a bound device as the other two proofs. Attendance here goes the
 * other way — the student shows a code and the instructor scans it — and that
 * is deliberate, not an omission: a code on the board cannot tell the room from
 * the canteen, because anyone can photograph it and send it to a friend at
 * home, who is then marked present. Scanning from the instructor side keeps a
 * person in the loop who can see whose face is attached to the phone.
 *
 * So the design is the deck and the mechanism is this school's: the same
 * verified receipt, the same green spent once and only here, the same streak in
 * gold, the same next action into the notes for that class.
 */
export function CheckInPanel({
  qrCodeToken,
  studentNumber,
  studentName,
  openSessions,
  todayAttendance,
}: CheckInPanelProps) {
  const checkedIn = new Set(todayAttendance.map((a) => a.classSessionId));

  // The most recent mark today is the receipt. Sheet 03.2: the receipt is the
  // point — evidence on both sides of a disputed record.
  const latest = [...todayAttendance].sort(
    (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
  )[0];
  const latestSession = latest && openSessions.find((s) => s.id === latest.classSessionId);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <header>
        <h1 className="text-2xl">Check in</h1>
        <p className="mt-1 text-sm text-content-muted">
          Show this to your instructor. They scan it and you are marked present —
          you never scan anything yourself.
        </p>
      </header>

      {latest && latestSession && <VerifiedReceipt record={latest} session={latestSession} />}

      <StudentCode token={qrCodeToken} name={studentName} studentNumber={studentNumber} />

      <section aria-labelledby="today-heading" className="space-y-2.5">
        <h2 id="today-heading" className="text-[1.0625rem]">
          Today&apos;s classes
        </h2>

        {openSessions.length === 0 ? (
          <Card>
            <CardContent className="p-5 text-center">
              <p className="text-sm text-content-muted">No classes scheduled today.</p>
            </CardContent>
          </Card>
        ) : (
          <ListGroup>
            {openSessions.map((s) => {
              const done = checkedIn.has(s.id);
              const record = todayAttendance.find((a) => a.classSessionId === s.id);
              return (
                <ListRow
                  key={s.id}
                  leading={
                    <span className="data flex w-14 shrink-0 flex-col items-start text-[0.6875rem] leading-tight text-content-muted">
                      <span className="font-medium text-content">{formatTime(s.startTime)}</span>
                      <span>{formatTime(s.endTime)}</span>
                    </span>
                  }
                  title={s.subject ?? "Class session"}
                  subtitle={
                    <>
                      {s.room ? <span className="data">{s.room}</span> : null}
                      {s.room && s.teacher ? " · " : ""}
                      {s.teacher}
                    </>
                  }
                  trailing={
                    done ? (
                      <StatusPill variant={record?.status === "LATE" ? "late" : "present"} dot>
                        {record?.status === "LATE" ? "Late" : "Present"}
                      </StatusPill>
                    ) : (
                      <StatusPill variant="outline">Not yet</StatusPill>
                    )
                  }
                />
              );
            })}
          </ListGroup>
        )}
      </section>

      <Guidance>
        Your code identifies you, not the room. Only an instructor can record
        attendance with it, and only while you are standing in front of them.
      </Guidance>
    </div>
  );
}

/**
 * Concept sheet 03.2 · Verified.
 *
 * Green is spent here and only here. The ticks carry their evidence next to
 * them — what was checked, and what it resolved to — so a disputed record has
 * something on both sides of it. The primary next action is the notes for this
 * class, which is the hinge that makes the notes feature get used at all.
 */
function VerifiedReceipt({
  record,
  session,
}: {
  record: TodayAttendance;
  session: OpenSession;
}) {
  const late = record.status === "LATE";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-hero p-5 text-white shadow-hero",
        late ? "bg-gold-600" : "bg-present-600"
      )}
    >
      <div className="flex flex-col items-center text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-white/20">
          <Check className="size-7" strokeWidth={2.2} aria-hidden="true" />
        </span>
        <h2 className="mt-3 text-[1.375rem] text-white">
          {late ? "Marked late" : "You are marked present"}
        </h2>
        <p className="mt-1 text-sm text-white/80">{session.subject ?? "Class session"}</p>
      </div>

      <dl className="mt-4 space-y-px overflow-hidden rounded-[0.625rem] bg-white/10">
        <Proof label="Instructor scanned your code" value={formatTime(record.scannedAt)} />
        <Proof label="Room matched" value={session.room ?? "Not recorded"} />
        <Proof label="Marked against" value={session.subject ?? "Class session"} />
      </dl>

      <Link
        href="/dashboard/notes"
        className="mt-4 flex h-12 items-center justify-center gap-2 rounded-field bg-white font-medium text-ink-900 transition-colors hover:bg-white/90"
      >
        Open notes for this class
      </Link>

      {/* Sheet 03.2: the correction window is stated up front rather than
          buried in policy. */}
      <p className="mt-3 text-center text-xs text-white/75">
        Wrong? Tell your instructor within 24 hours and it can still be
        corrected.
      </p>
    </div>
  );
}

function Proof({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5">
      <span className="flex size-4 shrink-0 items-center justify-center rounded-[3px] bg-white/25">
        <Check className="size-3" strokeWidth={3} aria-hidden="true" />
      </span>
      <dt className="min-w-0 flex-1 truncate text-[0.8125rem]">{label}</dt>
      <dd className="data shrink-0 text-[0.6875rem] uppercase tracking-[0.08em] text-white/80">
        {value}
      </dd>
    </div>
  );
}

function StudentCode({
  token,
  name,
  studentNumber,
}: {
  token: string;
  name: string;
  studentNumber: string;
}) {
  const [dataUrl, setDataUrl] = React.useState("");
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (!token) return;
    QRCode.toDataURL(JSON.stringify({ type: "aclc-student", token }), {
      width: 560,
      margin: 1,
      // Ink on white. A code has to survive a cheap camera in a bright room,
      // so it stays maximum contrast rather than taking the brand blue.
      color: { dark: "#0a1b33", light: "#ffffff" },
    })
      .then(setDataUrl)
      .catch(() => setFailed(true));
  }, [token]);

  if (!token) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="font-medium">No attendance code yet</p>
          <p className="mt-1 text-sm text-content-muted">
            Ask the registrar to issue your code. It takes one visit.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 p-6">
        <div className="rounded-card bg-white p-3 ring-1 ring-hairline">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="Your attendance code" className="size-60 sm:size-64" />
          ) : (
            <div className="flex size-60 items-center justify-center text-sm text-content-faint sm:size-64">
              {failed ? (
                "Code unavailable"
              ) : (
                <span className="inline-flex items-center gap-2">
                  <ScanLine className="size-4 animate-pulse" strokeWidth={1.8} />
                  Generating…
                </span>
              )}
            </div>
          )}
        </div>
        <div className="text-center">
          <p className="font-semibold">{name}</p>
          <p className="data mt-0.5 text-sm text-content-faint">{studentNumber}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
