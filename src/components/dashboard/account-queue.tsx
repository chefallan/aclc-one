"use client";

import * as React from "react";
import { CircleCheckBig, TriangleAlert, UserCheck, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "STUDENT" | "FACULTY";
  idNumber: string | null;
  status: "PENDING" | "ACTIVE" | "REJECTED";
  createdAt: string;
  approvedAt: string | null;
  rejectionReason: string | null;
}

const TABS = [
  { key: "PENDING", label: "Waiting" },
  { key: "ACTIVE", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
] as const;

export function AccountQueue() {
  const [tab, setTab] = React.useState<(typeof TABS)[number]["key"]>("PENDING");
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [rejecting, setRejecting] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("");

  const load = React.useCallback(async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/accounts?status=${status}`);
      const body = await res.json();
      if (body.success) {
        setAccounts(body.data.accounts);
        setPendingCount(body.data.pendingCount);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/accounts?status=${tab}`);
      const body = await res.json();
      if (cancelled) return;
      if (body.success) {
        setAccounts(body.data.accounts);
        setPendingCount(body.data.pendingCount);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  async function decide(id: string, decision: "APPROVE" | "REJECT", why?: string) {
    setBusyId(id);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, decision, reason: why }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setNotice({ tone: "error", text: body.error ?? "That didn't go through." });
        return;
      }
      setNotice({ tone: "ok", text: body.message });
      setRejecting(null);
      setReason("");
      await load(tab);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="eyebrow">Administration</p>
        <h1 className="mt-1 text-2xl font-semibold">Account requests</h1>
        <p className="mt-1 text-sm text-content-muted">
          Check each ID number against the school register before approving. Nobody can sign in
          until you do.
        </p>
      </header>

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

      <div
        role="tablist"
        aria-label="Account status"
        className="inline-flex rounded-field border border-hairline bg-surface-sunk p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 rounded-[0.4rem] px-3.5 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-surface text-brand-800 shadow-card dark:text-brand-200"
                : "text-content-muted hover:text-content"
            )}
          >
            {t.label}
            {t.key === "PENDING" && pendingCount > 0 && (
              <span className="data rounded-full bg-brand-600 px-1.5 py-0.5 text-[0.62rem] text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-card border border-hairline bg-surface-sunk"
            />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Inbox className="mx-auto size-8 text-content-faint" />
            <p className="mt-3 font-medium">
              {tab === "PENDING" ? "Nobody is waiting" : "Nothing here"}
            </p>
            <p className="mt-1 text-sm text-content-muted">
              {tab === "PENDING"
                ? "New sign-ups appear here for checking."
                : "Requests you've handled show up under this tab."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {accounts.map((a) => (
            <li key={a.id}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {a.lastName}, {a.firstName}
                      </p>
                      <p className="truncate text-sm text-content-muted">{a.email}</p>
                      <p className="data mt-1 text-xs text-content-faint">
                        {a.idNumber ?? "no ID given"} · requested {formatDate(a.createdAt)}
                      </p>
                      {a.rejectionReason && (
                        <p className="mt-1.5 text-xs text-absent-700 dark:text-absent-300">
                          Reason: {a.rejectionReason}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge variant={a.role === "FACULTY" ? "secondary" : "outline"}>
                        {a.role === "FACULTY" ? "Faculty & staff" : "Student"}
                      </Badge>
                      {a.status === "ACTIVE" && (
                        <Badge variant="present" dot>
                          Approved
                        </Badge>
                      )}
                      {a.status === "REJECTED" && <Badge variant="absent">Rejected</Badge>}
                    </div>
                  </div>

                  {a.status === "PENDING" && (
                    <div className="mt-4">
                      {rejecting === a.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            decide(a.id, "REJECT", reason);
                          }}
                          className="space-y-2"
                        >
                          <label htmlFor={`reason-${a.id}`} className="text-sm font-medium">
                            Why are you rejecting this?
                          </label>
                          <Input
                            id={`reason-${a.id}`}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="ID number not on the register"
                          />
                          <div className="flex gap-2">
                            <Button type="submit" variant="destructive" size="sm" disabled={busyId === a.id}>
                              Confirm rejection
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRejecting(null);
                                setReason("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => decide(a.id, "APPROVE")}
                            disabled={busyId === a.id}
                          >
                            <UserCheck className="size-4" />
                            {busyId === a.id ? "Approving…" : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRejecting(a.id)}
                            disabled={busyId === a.id}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}
