"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export interface NamedRef {
  id: string;
  name: string;
}

/**
 * Creating a section, and whatever has to exist first.
 *
 * A section cannot exist without an academic year and a programme, so on a
 * fresh deployment "create a section" is really three steps. Presenting only
 * the last one is how an administrator ends up staring at an empty list with
 * no way forward - which is exactly what happened.
 */
export function SectionSetup({
  academicYears,
  programs,
}: {
  academicYears: NamedRef[];
  programs: Array<NamedRef & { code: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const needsYear = academicYears.length === 0;
  const needsProgram = programs.length === 0;

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          New section
        </Button>
        {(needsYear || needsProgram) && (
          <p className="text-sm text-content-muted">
            {needsYear && needsProgram
              ? "You'll need an academic year and a programme first — both are in here."
              : needsYear
                ? "You'll need an academic year first — it's in here."
                : "You'll need a programme first — it's in here."}
          </p>
        )}
      </div>
    );
  }

  return (
    <Card className="border-brand-300">
      <CardContent className="space-y-6 p-4">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Set up a section</p>
          <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)}>
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <Step
          n={1}
          title="Academic year"
          done={!needsYear}
          summary={academicYears.map((y) => y.name).join(", ")}
        >
          <AcademicYearForm onDone={() => router.refresh()} />
        </Step>

        <Step
          n={2}
          title="Programme"
          done={!needsProgram}
          summary={programs.map((p) => p.code).join(", ")}
        >
          <ProgramForm onDone={() => router.refresh()} />
        </Step>

        <Step n={3} title="Section" done={false} blocked={needsYear || needsProgram}>
          <SectionForm
            academicYears={academicYears}
            programs={programs}
            onDone={() => {
              setOpen(false);
              router.refresh();
            }}
          />
        </Step>
      </CardContent>
    </Card>
  );
}

function Step({
  n,
  title,
  done,
  blocked,
  summary,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  blocked?: boolean;
  summary?: string;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = React.useState(!done && !blocked);

  return (
    <section className="border-t border-hairline pt-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">
          <span className="data mr-2 text-content-faint">{n}</span>
          {title}
          {done && <span className="ml-2 text-xs font-normal text-present-700">already set up</span>}
        </h3>
        {done && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-brand-600 hover:underline dark:text-brand-300"
          >
            {expanded ? "Hide" : "Add another"}
          </button>
        )}
      </div>

      {done && summary && (
        <p className="data mt-1 text-xs text-content-faint">{summary}</p>
      )}

      {blocked ? (
        <p className="mt-2 text-sm text-content-muted">
          Finish the steps above and this opens.
        </p>
      ) : (
        expanded && <div className="mt-3">{children}</div>
      )}
    </section>
  );
}

/** Shared submit plumbing: one place that knows how these APIs answer. */
function useCreate(url: string, onDone: () => void) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  async function submit(body: unknown) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        setError(
          json.details?.fieldErrors
            ? Object.values(json.details.fieldErrors).flat().join(" ")
            : json.error || "That didn't save."
        );
        return false;
      }
      onDone();
      return true;
    } finally {
      setBusy(false);
    }
  }

  return { submit, busy, error };
}

function Problem({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-field border border-late-500/40 bg-late-50 px-3 py-2 text-sm text-late-700 dark:bg-late-700/20 dark:text-late-50"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function AcademicYearForm({ onDone }: { onDone: () => void }) {
  const { submit, busy, error } = useCreate("/api/academic-years", onDone);
  const thisYear = new Date().getFullYear();
  const [name, setName] = React.useState(`${thisYear}-${thisYear + 1}`);
  const [startDate, setStartDate] = React.useState(`${thisYear}-06-01`);
  const [endDate, setEndDate] = React.useState(`${thisYear + 1}-03-31`);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await submit({ name, startDate, endDate, status: "ACTIVE" });
      }}
    >
      <Problem message={error} />
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="2026-2027" issued required />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Starts">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </Field>
        <Field label="Ends">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </Field>
      </div>
      <p className="text-xs text-content-faint">
        These dates bound the calendar — classes stop repeating outside them.
      </p>
      <Button type="submit" disabled={busy} size="sm">
        {busy ? "Saving…" : "Create academic year"}
      </Button>
    </form>
  );
}

function ProgramForm({ onDone }: { onDone: () => void }) {
  const { submit, busy, error } = useCreate("/api/programs", onDone);
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await submit({ code, name })) {
          setCode("");
          setName("");
        }
      }}
    >
      <Problem message={error} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Code">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="BSIT" issued required />
        </Field>
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="BS Information Technology"
            required
          />
        </Field>
      </div>
      <Button type="submit" disabled={busy} size="sm">
        {busy ? "Saving…" : "Create programme"}
      </Button>
    </form>
  );
}

function SectionForm({
  academicYears,
  programs,
  onDone,
}: {
  academicYears: NamedRef[];
  programs: Array<NamedRef & { code: string }>;
  onDone: () => void;
}) {
  const { submit, busy, error } = useCreate("/api/sections", onDone);
  const [name, setName] = React.useState("");
  const [yearLevel, setYearLevel] = React.useState("1");
  const [programId, setProgramId] = React.useState(programs[0]?.id ?? "");
  const [academicYearId, setAcademicYearId] = React.useState(academicYears[0]?.id ?? "");

  const select =
    "h-11 w-full rounded-field border border-hairline-strong bg-surface px-3 text-sm outline-none focus-visible:border-brand-600";

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await submit({ name, yearLevel, programId, academicYearId });
      }}
    >
      <Problem message={error} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Section name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="WADT-1C" issued required />
        </Field>
        <Field label="Year level">
          <select className={select} value={yearLevel} onChange={(e) => setYearLevel(e.target.value)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                Year {n}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Programme">
          <select className={select} value={programId} onChange={(e) => setProgramId(e.target.value)} required>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Academic year">
          <select
            className={select}
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
            required
          >
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Button type="submit" disabled={busy} size="sm">
        {busy ? "Saving…" : "Create section"}
      </Button>
    </form>
  );
}
