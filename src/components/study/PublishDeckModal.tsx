"use client";

import * as React from "react";
import type { Deck } from "@/lib/study/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Share2, Check, Sparkles, GraduationCap, Calendar, BookOpen, AlertCircle, X } from "lucide-react";

interface PublishDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  deckId?: string;
  deck?: Deck | null;
  title?: string;
  content?: string;
  cardsCsv?: string | string[];
  noteId?: string;
  onPublished?: () => void;
  initialTitle?: string;
  initialSummary?: string;
  initialSubject?: string;
  initialTags?: string[];
  initialProgram?: string;
  initialYearLevel?: number;
  initialSemester?: number;
  initialSubjectCode?: string;
}

const PROGRAMS = ["BSIT", "BSCS", "BSBA", "BSHM", "WADT"];
const YEARS = [
  { value: 1, label: "1st Year" },
  { value: 2, label: "2nd Year" },
  { value: 3, label: "3rd Year" },
  { value: 4, label: "4th Year" },
];
const SEMESTERS = [
  { value: 1, label: "1st Semester" },
  { value: 2, label: "2nd Semester" },
];

export function PublishDeckModal({
  isOpen,
  onClose,
  title,
  content,
  cardsCsv = "",
  noteId,
  onPublished,
}: PublishDeckModalProps) {
  const [deckTitle, setDeckTitle] = React.useState(title || "Study Deck");
  const [program, setProgram] = React.useState("BSIT");
  const [yearLevel, setYearLevel] = React.useState(4);
  const [semester, setSemester] = React.useState(1);
  const [subjectCode, setSubjectCode] = React.useState("IT 402");
  const [publishing, setPublishing] = React.useState(false);
  const [published, setPublished] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (title) setDeckTitle(title);
  }, [title]);

  if (!isOpen) return null;

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!deckTitle.trim()) return;

    setPublishing(true);
    setError("");

    try {
      const res = await fetch("/api/notes/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId,
          title: deckTitle.trim(),
          content,
          program,
          yearLevel,
          semester,
          subjectCode: subjectCode.trim(),
          cardsCsv: cardsCsvText,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to publish deck.");
      }

      setPublished(true);
      setTimeout(() => {
        setPublished(false);
        onClose();
        if (onPublished) onPublished();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to publish deck. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  const cardsCsvText = Array.isArray(cardsCsv) ? cardsCsv.join("\n") : (cardsCsv || "");
  const cardLines = cardsCsvText.split("\n").filter((l: any) => l.trim().length > 0);
  const cardCount = Math.max(0, cardLines.length > 1 ? cardLines.length - 1 : (cardsCsv ? 1 : 0));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-card border border-hairline bg-surface p-6 shadow-modal space-y-4 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-xl font-bold">
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              <Share2 className="size-4" />
            </div>
            <span>Publish to Community Library</span>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} className="shrink-0 -mr-2 -mt-2">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <p className="text-xs text-content-muted">
          Share your notes & flashcards globally with other students at ACLC College of Ormoc.
        </p>

        {published ? (
          <div className="py-8 text-center space-y-2 animate-in fade-in zoom-in-95">
            <div className="mx-auto size-12 rounded-full bg-present-100 dark:bg-present-900/40 text-present-600 flex items-center justify-center">
              <Check className="size-6" />
            </div>
            <h3 className="font-semibold text-lg">Published Globally to Database!</h3>
            <p className="text-sm text-content-muted">
              Your deck is now available in the Community Library under {program} ({yearLevel}th Year).
            </p>
          </div>
        ) : (
          <form onSubmit={handlePublish} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-xs rounded-md bg-absent-50 border border-absent-200 text-absent-700">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold uppercase text-content-muted">Deck / Note Title</label>
              <Input
                value={deckTitle}
                onChange={(e) => setDeckTitle(e.target.value)}
                placeholder="e.g. Systems Integration - Midterm Review"
                required
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-content-muted flex items-center gap-1">
                  <GraduationCap className="size-3.5" /> Program
                </label>
                <select
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  className="mt-1 w-full rounded-field border border-hairline bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {PROGRAMS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-content-muted flex items-center gap-1">
                  <Calendar className="size-3.5" /> Year Level
                </label>
                <select
                  value={yearLevel}
                  onChange={(e) => setYearLevel(Number(e.target.value))}
                  className="mt-1 w-full rounded-field border border-hairline bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {YEARS.map((y) => (
                    <option key={y.value} value={y.value}>{y.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-content-muted">Semester</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  className="mt-1 w-full rounded-field border border-hairline bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {SEMESTERS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-content-muted flex items-center gap-1">
                  <BookOpen className="size-3.5" /> Subject Code
                </label>
                <Input
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  placeholder="e.g. IT 402, CC 105"
                  required
                  className="mt-1"
                />
              </div>
            </div>

            {cardCount > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-brand-50/50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-800 text-xs text-brand-700 dark:text-brand-300">
                <Sparkles className="size-4 shrink-0" />
                <span>Includes <strong>{cardCount} Flashcards</strong> saved to global database</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
              <Button type="button" variant="ghost" onClick={onClose} disabled={publishing}>
                Cancel
              </Button>
              <Button type="submit" disabled={publishing || !deckTitle.trim()}>
                {publishing ? "Publishing to DB…" : "Publish Deck"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
