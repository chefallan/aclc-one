"use client";

import * as React from "react";
import QRCode from "qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
 * Attendance goes one way only: the student shows a code and the instructor
 * scans it.
 *
 * The reverse — a code on the board that students scan — was removed because
 * it cannot tell the room from the canteen. Anyone can photograph the
 * projected code and send it to a friend at home, who is then marked present.
 * Scanning from the instructor's side keeps a person in the loop who can see
 * whose face is attached to the phone.
 */
export function CheckInPanel({
  qrCodeToken,
  studentNumber,
  studentName,
  openSessions,
  todayAttendance,
}: CheckInPanelProps) {
  const checkedIn = new Set(todayAttendance.map((a) => a.classSessionId));

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <p className="eyebrow">Check in</p>
        <h1 className="mt-1 text-2xl font-semibold">Show this to your instructor</h1>
        <p className="mt-1 text-sm text-content-muted">
          They scan it and you&apos;re marked present. You never scan anything yourself.
        </p>
      </div>

      <StudentCode token={qrCodeToken} name={studentName} studentNumber={studentNumber} />

      <section aria-labelledby="today-heading" className="space-y-2">
        <h2 id="today-heading" className="eyebrow">
          Today&apos;s classes
        </h2>

        {openSessions.length === 0 ? (
          <Card>
            <CardContent className="p-5 text-center">
              <p className="text-sm text-content-muted">No classes scheduled today.</p>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {openSessions.map((s) => {
              const done = checkedIn.has(s.id);
              const record = todayAttendance.find((a) => a.classSessionId === s.id);
              return (
                <li key={s.id}>
                  <Card className={cn(done && "border-present-500/40")}>
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{s.subject ?? "Class session"}</p>
                        <p className="data mt-0.5 text-xs text-content-faint">
                          {formatTime(s.startTime)}–{formatTime(s.endTime)}
                          {s.room ? ` · ${s.room}` : ""}
                        </p>
                        {s.teacher && (
                          <p className="mt-0.5 truncate text-xs text-content-muted">{s.teacher}</p>
                        )}
                      </div>
                      {done ? (
                        <Badge variant={record?.status === "LATE" ? "late" : "present"} dot>
                          {record?.status === "LATE" ? "Late" : "Present"}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not yet</Badge>
                      )}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-xs leading-relaxed text-content-faint">
        Your code identifies you, not the room. Only an instructor can record attendance with it,
        and only while you are standing in front of them.
      </p>
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
      color: { dark: "#6d1021", light: "#ffffff" },
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
            <div className="flex size-60 items-center justify-center text-sm text-[#7d6f72] sm:size-64">
              {failed ? "Code unavailable" : "Generating…"}
            </div>
          )}
        </div>
        <div className="text-center">
          <p className="font-medium">{name}</p>
          <p className="data mt-0.5 text-sm text-content-faint">{studentNumber}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
