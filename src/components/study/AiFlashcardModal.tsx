"use client";

import * as React from "react";
import { Sparkles, X, Download, Copy, Check, Play, BookOpen, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import type { Deck, Card as FlashcardItem } from "@/lib/study/types";

interface AiFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
  initialTitle?: string;
  onCardsGenerated?: (cards: FlashcardItem[], deck: Deck) => void;
}

export function AiFlashcardModal({
  isOpen,
  onClose,
  initialText = "",
  initialTitle = "",
  onCardsGenerated,
}: AiFlashcardModalProps) {
  const router = useRouter();
  const [topic, setTopic] = React.useState(initialTitle || "Study Notes");
  const [notesText, setNotesText] = React.useState(initialText);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState<{
    csvText: string;
    deck: Deck;
    cards: FlashcardItem[];
    totalCards: number;
    remainingGenerations?: number;
  } | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (initialText) setNotesText(initialText);
    if (initialTitle) setTopic(initialTitle);
  }, [initialText, initialTitle]);

  if (!isOpen) return null;

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!notesText.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/study/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notesText,
          topic: topic.trim() || "Study Notes",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to generate flashcards.");
        return;
      }

      setResult(data);
    } catch {
      setError("Connection failed. Please check your network and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopyCSV() {
    if (!result?.csvText) return;
    navigator.clipboard.writeText(result.csvText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadCSV() {
    if (!result?.csvText) return;
    const blob = new Blob([result.csvText], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(topic || "flashcards").toLowerCase().replace(/\s+/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleStartStudying() {
    if (!result?.deck) return;
    // Save to local storage for flashcard runner
    if (typeof window !== "undefined") {
      localStorage.setItem("active_deck", JSON.stringify(result.deck));
      localStorage.setItem("active_cards", JSON.stringify(result.cards));
    }
    if (onCardsGenerated) {
      onCardsGenerated(result.cards, result.deck);
    }
    onClose();
    router.push("/dashboard/flashcards");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-card border border-hairline bg-surface shadow-modal overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">AI Flashcard Generator</h2>
              <p className="text-xs text-content-muted">Convert class notes into instant 15-column flashcards & quizzes</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs text-content-muted bg-surface-sunk p-2.5 rounded-lg border border-hairline">
            <Clock className="size-3.5 shrink-0 text-brand-600 dark:text-brand-400" />
            <span>Rate Limit: <strong>4 AI generations per 5 hours</strong> per student account.</span>
            {result?.remainingGenerations !== undefined && (
              <Badge variant="outline" className="ml-auto text-[0.68rem]">
                {result.remainingGenerations} left
              </Badge>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-field border border-absent-500/40 bg-absent-50 px-3.5 py-3 text-sm text-absent-700 dark:bg-absent-900/30 dark:text-absent-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {!result ? (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="eyebrow block mb-1.5">Deck Topic / Title</label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. IT 402 - Database Systems Normalization"
                  required
                />
              </div>

              <div>
                <label className="eyebrow block mb-1.5">Study Notes Content</label>
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="Paste your lecture notes, summaries, or key terms here..."
                  rows={8}
                  className="w-full rounded-field border border-hairline bg-surface p-3 text-sm placeholder:text-content-faint focus:border-brand-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !notesText.trim()}>
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Analyzing & Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4 mr-2" />
                      Generate Cards
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between rounded-lg bg-surface-sunk p-4 border border-hairline">
                <div>
                  <h3 className="font-semibold text-base">{result.deck.title}</h3>
                  <p className="text-xs text-content-muted mt-0.5">
                    Generated {result.totalCards} cards across multiple study modes (Definitions, Multiple Choice, True/False, Enumeration, Identification)
                  </p>
                </div>
                <Badge variant="default" className="text-xs">
                  {result.totalCards} Cards Ready
                </Badge>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 rounded-lg border border-hairline bg-surface-sunk p-3">
                {result.cards.slice(0, 8).map((card, i) => (
                  <div key={i} className="rounded-md border border-hairline bg-surface p-2.5 text-xs flex justify-between gap-3">
                    <span className="font-medium text-content line-clamp-1">{card.front}</span>
                    <Badge variant="outline" className="shrink-0 text-[0.65rem] capitalize">
                      {card.type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
                {result.cards.length > 8 && (
                  <p className="text-center text-xs text-content-muted pt-1">
                    + {result.cards.length - 8} more cards in deck
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-hairline">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleCopyCSV}>
                    {copied ? <Check className="size-3.5 mr-1.5 text-green-600" /> : <Copy className="size-3.5 mr-1.5" />}
                    {copied ? "Copied CSV" : "Copy CSV"}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleDownloadCSV}>
                    <Download className="size-3.5 mr-1.5" />
                    Download CSV
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setResult(null)}>
                    Generate Another
                  </Button>
                  <Button type="button" size="sm" onClick={handleStartStudying}>
                    <Play className="size-3.5 mr-1.5" />
                    Study Now
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
