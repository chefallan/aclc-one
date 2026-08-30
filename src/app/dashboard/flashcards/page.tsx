"use client";

import * as React from "react";
import { StudyTabs } from "@/components/study/study-tabs";
import { Card as UICard, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Layers,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Play,
  Upload,
  HelpCircle,
  Check,
  X,
  Share2,
} from "lucide-react";
import { AiFlashcardModal } from "@/components/study/AiFlashcardModal";
import { PublishDeckModal } from "@/components/study/PublishDeckModal";
import { parseCSVFile } from "@/lib/study/csvParser";
import { buildMCQuestion } from "@/lib/study/distractorEngine";
import { checkIdentificationAnswer } from "@/lib/study/answerChecker";
import type { Deck, Card as FlashcardItem, QuizMode } from "@/lib/study/types";

export default function FlashcardsPage() {
  const [deck, setDeck] = React.useState<Deck | null>(null);
  const [cards, setCards] = React.useState<FlashcardItem[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isFlipped, setIsFlipped] = React.useState(false);
  const [mode, setMode] = React.useState<QuizMode>("flashcard");
  const [aiModalOpen, setAiModalOpen] = React.useState(false);
  const [publishModalOpen, setPublishModalOpen] = React.useState(false);
  const [pastedCSV, setPastedCSV] = React.useState("");
  const [csvImportOpen, setCsvImportOpen] = React.useState(false);

  // Quiz state
  const [selectedMCOption, setSelectedMCOption] = React.useState<number | null>(null);
  const [tfAnswer, setTfAnswer] = React.useState<boolean | null>(null);
  const [idInput, setIdInput] = React.useState("");
  const [idSubmitted, setIdSubmitted] = React.useState(false);
  const [idResult, setIdResult] = React.useState<{ isCorrect: boolean; matchedVariant: string | null } | null>(null);
  const [score, setScore] = React.useState({ correct: 0, total: 0 });

  // Default demo deck for instant play/testing
  const DEFAULT_SAMPLE_CSV = [
    "front,back,chapter,subject,lesson,type,mc_correct,mc_distractor1,mc_distractor2,mc_distractor3,tf_answer,explanation,enum_items,id_answer,id_variants",
    '"What is 1NF (First Normal Form)?","A relation where all attributes are atomic and duplicates are removed.",Ch1,Databases,L1,definition,,,,,,,,,',
    '"Which normal form eliminates partial key dependencies?","",Ch1,Databases,L1,multiple_choice,"Second Normal Form (2NF)","First Normal Form (1NF)","Third Normal Form (3NF)","Boyce-Codd Normal Form",,,,',
    '"A relation in 3NF has no transitive dependencies.","",Ch1,Databases,L1,true_false,,,,,true,"3NF removes transitive dependencies among non-key attributes.",,,',
    '"Who is considered the father of computer science?","",Ch1,CS,L1,identification,,,,,,,,,"Alan Turing","alan turing;turing;alan mathison turing"',
    '"Evaluate the expression: (2^3) + 4","",Ch1,Math,L1,identification,,,,,,,,,"12","12;twelve"',
  ].join("\n");

  // Load saved deck from localStorage or fallback to demo deck
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const savedDeck = localStorage.getItem("active_deck");
      const savedCards = localStorage.getItem("active_cards");
      if (savedDeck && savedCards) {
        try {
          setDeck(JSON.parse(savedDeck));
          setCards(JSON.parse(savedCards));
          return;
        } catch {}
      }

      // Load default demo cards
      const { deck: demoDeck, cards: demoCards } = parseCSVFile(DEFAULT_SAMPLE_CSV, "Demo Deck: Databases & Computing");
      setDeck(demoDeck);
      setCards(demoCards);
    }
  }, []);

  function handleImportCSV(e: React.FormEvent) {
    e.preventDefault();
    if (!pastedCSV.trim()) return;

    const { deck: parsedDeck, cards: parsedCards } = parseCSVFile(pastedCSV, "Imported Deck");
    setDeck(parsedDeck);
    setCards(parsedCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setScore({ correct: 0, total: 0 });
    setCsvImportOpen(false);

    if (typeof window !== "undefined") {
      localStorage.setItem("active_deck", JSON.stringify(parsedDeck));
      localStorage.setItem("active_cards", JSON.stringify(parsedCards));
    }
  }

  const currentCard = cards[currentIndex];
  const mcQuestion = currentCard && mode === "multiple_choice" ? buildMCQuestion(currentCard, cards) : null;

  function nextCard() {
    setIsFlipped(false);
    setSelectedMCOption(null);
    setTfAnswer(null);
    setIdInput("");
    setIdSubmitted(false);
    setIdResult(null);
    setCurrentIndex((prev) => (prev + 1) % (cards.length || 1));
  }

  function prevCard() {
    setIsFlipped(false);
    setSelectedMCOption(null);
    setTfAnswer(null);
    setIdInput("");
    setIdSubmitted(false);
    setIdResult(null);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % (cards.length || 1));
  }

  function handleIdentificationCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!currentCard || !idInput.trim()) return;

    const variants = currentCard.id_variants
      ? currentCard.id_variants.split(";").map((v) => v.trim())
      : [];

    const res = checkIdentificationAnswer(idInput, currentCard.back, variants);
    setIdResult(res);
    setIdSubmitted(true);
    setScore((s) => ({
      correct: s.correct + (res.isCorrect ? 1 : 0),
      total: s.total + 1,
    }));
  }

  function getGeneratedCsvFromCards(): string {
    const headers = "front,back,chapter,subject,lesson,type,mc_correct,mc_distractor1,mc_distractor2,mc_distractor3,tf_answer,explanation,enum_items,id_answer,id_variants";
    const rows = cards.map((c) => {
      const escape = (val?: string | null) => (val ? `"${val.replace(/"/g, '""')}"` : "");
      return [
        escape(c.front),
        escape(c.back),
        escape(c.chapter),
        escape(c.subject),
        escape(c.lesson),
        c.type,
        escape(c.mc_correct),
        escape(c.mc_distractor1),
        escape(c.mc_distractor2),
        escape(c.mc_distractor3),
        escape(c.tf_answer),
        escape(c.explanation),
        escape(c.enum_items),
        escape(c.id_answer),
        escape(c.id_variants),
      ].join(",");
    });
    return [headers, ...rows].join("\n");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Study Flashcards</h1>
          <p className="mt-1 text-sm text-content-muted">
            Active recall, Leitner spaced repetition & instant quiz practice.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setCsvImportOpen(true)}>
            <Upload className="size-4 mr-1.5" />
            Import CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPublishModalOpen(true)}
            disabled={cards.length === 0}
          >
            <Share2 className="size-4 mr-1.5" />
            Publish Deck
          </Button>
          <Button size="sm" onClick={() => setAiModalOpen(true)}>
            <Sparkles className="size-4 mr-1.5" />
            AI Flashcards
          </Button>
        </div>
      </header>

      <StudyTabs />

      {csvImportOpen && (
        <UICard className="border-brand-300">
          <CardContent className="p-4">
            <form onSubmit={handleImportCSV} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-content-muted">Paste 15-Column CSV Deck</span>
                <Button type="button" variant="ghost" size="icon" onClick={() => setCsvImportOpen(false)}>
                  <X className="size-4" />
                </Button>
              </div>
              <textarea
                value={pastedCSV}
                onChange={(e) => setPastedCSV(e.target.value)}
                placeholder="Paste CSV headers and rows here..."
                rows={6}
                className="w-full rounded-field border border-hairline bg-surface p-3 text-xs font-mono placeholder:text-content-faint focus:border-brand-500 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setCsvImportOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Load Deck</Button>
              </div>
            </form>
          </CardContent>
        </UICard>
      )}

      {/* Deck Header & Study Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-hairline bg-surface p-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg">{deck?.title || "Active Deck"}</h2>
            <Badge variant="outline">{cards.length} cards</Badge>
          </div>
          <p className="text-xs text-content-muted mt-0.5">
            Card {cards.length > 0 ? currentIndex + 1 : 0} of {cards.length}
            {score.total > 0 && (
              <span className="ml-2 font-medium text-brand-600 dark:text-brand-400">
                · Score: {score.correct}/{score.total} ({Math.round((score.correct / score.total) * 100)}%)
              </span>
            )}
          </p>
        </div>

        {/* Study Mode Selector */}
        <div className="flex flex-wrap gap-1 rounded-md border border-hairline bg-surface-sunk p-1">
          {(
            [
              { id: "flashcard", label: "Flip" },
              { id: "multiple_choice", label: "MC Quiz" },
              { id: "true_false", label: "True/False" },
              { id: "identification", label: "Identification" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMode(m.id);
                setIsFlipped(false);
                setSelectedMCOption(null);
                setTfAnswer(null);
                setIdInput("");
                setIdSubmitted(false);
              }}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                mode === m.id
                  ? "bg-surface shadow-sm text-brand-700 dark:text-brand-300 font-semibold"
                  : "text-content-muted hover:text-content"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Flashcard & Quiz Player Area */}
      {cards.length === 0 ? (
        <UICard>
          <CardContent className="p-12 text-center space-y-3">
            <Layers className="mx-auto size-10 text-content-faint" />
            <p className="font-medium text-base">No cards loaded</p>
            <p className="text-sm text-content-muted max-w-sm mx-auto">
              Generate flashcards from your notes with AI, import a CSV, or study community decks from the Library!
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <Button onClick={() => setAiModalOpen(true)}>
                <Sparkles className="size-4 mr-1.5" />
                Generate from Notes
              </Button>
            </div>
          </CardContent>
        </UICard>
      ) : (
        <div className="space-y-4">
          {/* Mode 1: Classic Flashcard Flip */}
          {mode === "flashcard" && (
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="cursor-pointer select-none min-h-[260px] rounded-card border border-hairline bg-surface p-8 shadow-sm transition-all hover:border-brand-300 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs text-content-faint">
                <span className="uppercase tracking-wider font-semibold">
                  {isFlipped ? "Answer / Back" : "Question / Front"}
                </span>
                <span className="flex items-center gap-1 text-brand-600">
                  <RotateCcw className="size-3" /> Click to flip
                </span>
              </div>

              <div className="my-auto py-6 text-center">
                <p className="text-xl font-medium leading-relaxed">
                  {isFlipped ? currentCard.back || currentCard.id_answer : currentCard.front}
                </p>
                {isFlipped && currentCard.explanation && (
                  <p className="mt-4 text-xs text-content-muted italic">
                    💡 {currentCard.explanation}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-content-muted">
                <span>Type: {currentCard.type}</span>
                {currentCard.subject && <span>Subject: {currentCard.subject}</span>}
              </div>
            </div>
          )}

          {/* Mode 2: Multiple Choice Quiz */}
          {mode === "multiple_choice" && mcQuestion && (
            <UICard>
              <CardContent className="p-6 space-y-4">
                <div className="text-xs uppercase tracking-wider font-semibold text-content-faint">
                  Multiple Choice Question
                </div>
                <p className="text-lg font-medium">{mcQuestion.question}</p>

                <div className="grid gap-2 sm:grid-cols-2">
                  {mcQuestion.options.map((opt, idx) => {
                    const isSelected = selectedMCOption === idx;
                    const isCorrect = idx === mcQuestion.correctIndex;
                    let style = "border-hairline hover:border-brand-300 bg-surface";

                    if (selectedMCOption !== null) {
                      if (isCorrect) {
                        style = "border-present-500 bg-present-50 text-present-900 dark:bg-present-950/40 dark:text-present-200 font-semibold";
                      } else if (isSelected) {
                        style = "border-absent-500 bg-absent-50 text-absent-900 dark:bg-absent-950/40 dark:text-absent-200";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={selectedMCOption !== null}
                        onClick={() => {
                          setSelectedMCOption(idx);
                          setScore((s) => ({
                            correct: s.correct + (isCorrect ? 1 : 0),
                            total: s.total + 1,
                          }));
                        }}
                        className={`p-4 rounded-field border text-left text-sm transition-colors flex items-center justify-between ${style}`}
                      >
                        <span>{opt.text}</span>
                        {selectedMCOption !== null && isCorrect && (
                          <CheckCircle2 className="size-4 text-present-600 shrink-0 ml-2" />
                        )}
                        {selectedMCOption !== null && isSelected && !isCorrect && (
                          <XCircle className="size-4 text-absent-600 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </UICard>
          )}

          {/* Mode 3: True / False Quiz */}
          {mode === "true_false" && (
            <UICard>
              <CardContent className="p-6 space-y-6 text-center">
                <div className="text-xs uppercase tracking-wider font-semibold text-content-faint">
                  True or False Statement
                </div>
                <p className="text-xl font-medium leading-relaxed max-w-lg mx-auto">
                  "{currentCard.front}"
                </p>

                <div className="flex justify-center gap-4">
                  <Button
                    type="button"
                    size="lg"
                    variant={tfAnswer === true ? (currentCard.tf_answer?.toLowerCase() === "true" ? "default" : "destructive") : "outline"}
                    disabled={tfAnswer !== null}
                    onClick={() => {
                      setTfAnswer(true);
                      const isCorrect = currentCard.tf_answer?.toLowerCase() === "true";
                      setScore((s) => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
                    }}
                    className="w-32"
                  >
                    <Check className="size-4 mr-1.5" /> True
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant={tfAnswer === false ? (currentCard.tf_answer?.toLowerCase() === "false" ? "default" : "destructive") : "outline"}
                    disabled={tfAnswer !== null}
                    onClick={() => {
                      setTfAnswer(false);
                      const isCorrect = currentCard.tf_answer?.toLowerCase() === "false";
                      setScore((s) => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
                    }}
                    className="w-32"
                  >
                    <X className="size-4 mr-1.5" /> False
                  </Button>
                </div>

                {tfAnswer !== null && (
                  <p className="text-xs text-content-muted">
                    {currentCard.explanation || `The statement is ${currentCard.tf_answer ?? "true"}.`}
                  </p>
                )}
              </CardContent>
            </UICard>
          )}

          {/* Mode 4: Identification (Fuzzy String & Math Evaluator) */}
          {mode === "identification" && (
            <UICard>
              <CardContent className="p-6 space-y-4">
                <div className="text-xs uppercase tracking-wider font-semibold text-content-faint">
                  Identification
                </div>
                <p className="text-lg font-medium">{currentCard.front}</p>

                <form onSubmit={handleIdentificationCheck} className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={idInput}
                      onChange={(e) => setIdInput(e.target.value)}
                      placeholder="Type your answer (supports fuzzy spelling & math)..."
                      disabled={idSubmitted}
                      className="text-base"
                    />
                    <Button type="submit" disabled={idSubmitted || !idInput.trim()}>
                      Check
                    </Button>
                  </div>

                  {idSubmitted && idResult && (
                    <div
                      className={`p-3 rounded-md text-sm flex items-start gap-2.5 ${
                        idResult.isCorrect
                          ? "bg-present-50 text-present-800 dark:bg-present-950/40 dark:text-present-200 border border-present-200"
                          : "bg-absent-50 text-absent-800 dark:bg-absent-950/40 dark:text-absent-200 border border-absent-200"
                      }`}
                    >
                      {idResult.isCorrect ? (
                        <CheckCircle2 className="size-5 shrink-0 text-present-600" />
                      ) : (
                        <XCircle className="size-5 shrink-0 text-absent-600" />
                      )}
                      <div>
                        <p className="font-semibold">{idResult.isCorrect ? "Correct!" : "Incorrect."}</p>
                        <p className="text-xs mt-0.5">
                          Correct Answer: <strong>{currentCard.back || currentCard.id_answer}</strong>
                          {idResult.matchedVariant && <span> (Matched variant: {idResult.matchedVariant})</span>}
                        </p>
                      </div>
                    </div>
                  )}
                </form>
              </CardContent>
            </UICard>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={prevCard} disabled={cards.length <= 1}>
              <ArrowLeft className="size-4 mr-1.5" />
              Previous
            </Button>
            <Button onClick={nextCard} disabled={cards.length <= 1}>
              Next
              <ArrowRight className="size-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* AI Card Generator Modal */}
      <AiFlashcardModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onCardsGenerated={(newCards, newDeck) => {
          setDeck(newDeck);
          setCards(newCards);
          setCurrentIndex(0);
          setIsFlipped(false);
          setScore({ correct: 0, total: 0 });
          if (typeof window !== "undefined") {
            localStorage.setItem("active_deck", JSON.stringify(newDeck));
            localStorage.setItem("active_cards", JSON.stringify(newCards));
          }
        }}
      />

      {/* Publish Deck Modal */}
      <PublishDeckModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        title={deck?.title || "Flashcard Deck"}
        content={cards.map((c) => `• ${c.front}: ${c.back || c.id_answer || c.mc_correct || ""}`).join("\n")}
        cardsCsv={getGeneratedCsvFromCards()}
      />
    </div>
  );
}
