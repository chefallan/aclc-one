"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Layers,
  ListChecks,
  ToggleLeft,
  List,
  BarChart2,
  Bell,
  Share2,
  BookOpen,
  HelpCircle,
  Sparkles,
  PenLine,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Check,
  X,
  Search,
  Eye,
  EyeOff,
  Tag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { TopBar } from "@/components/study/stitch/TopBar";
import { ProgressRing } from "@/components/study/stitch/ProgressRing";
import { StatBadge } from "@/components/study/stitch/StatBadge";
import { ModeCard } from "@/components/study/stitch/ModeCard";
import { MCOption, type MCOptionState } from "@/components/study/stitch/MCOption";
import { FormattedNoteText } from "@/components/study/stitch/FormattedNoteText";
import { FlashcardDeck } from "@/components/study/stitch/FlashcardDeck";
import { QuizProgressBar } from "@/components/study/stitch/QuizProgressBar";
import { FillInTheBlanksUI } from "@/features/blanks/FillInTheBlanksUI";
import { PublishDeckModal } from "@/components/study/PublishDeckModal";
import { parseCSVFile } from "@/lib/study/csvParser";
import { buildMCQuestion } from "@/lib/study/distractorEngine";
import { checkIdentificationAnswer } from "@/lib/study/answerChecker";
import type { Deck, Card } from "@/lib/study/types";

type StudyMode =
  | null
  | "flashcards"
  | "multiple_choice"
  | "true_false"
  | "enumeration"
  | "identification"
  | "blanks"
  | "notes"
  | "stats";

export default function StudyDashboard() {
  const params = useParams();
  const router = useRouter();
  const deckId = params?.deckId as string;

  const [deck, setDeck] = React.useState<Deck | null>(null);
  const [cards, setCards] = React.useState<Card[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeMode, setActiveMode] = React.useState<StudyMode>(null);

  // In-place study state
  const [cardIndex, setCardIndex] = React.useState(0);
  const [isFlipped, setIsFlipped] = React.useState(false);
  const [selectedMCOption, setSelectedMCOption] = React.useState<number | null>(null);
  const [mcOptionStates, setMcOptionStates] = React.useState<MCOptionState[]>(["default", "default", "default", "default"]);
  const [tfAnswer, setTfAnswer] = React.useState<boolean | null>(null);
  const [idInput, setIdInput] = React.useState("");
  const [idSubmitted, setIdSubmitted] = React.useState(false);
  const [idResult, setIdResult] = React.useState<{ isCorrect: boolean; matchedVariant: string | null } | null>(null);
  const [enumRevealed, setEnumRevealed] = React.useState(false);
  const [score, setScore] = React.useState({ correct: 0, wrong: 0, total: 0 });

  // Notes view state
  const [noteSearch, setNoteSearch] = React.useState("");
  const [hideKeywords, setHideKeywords] = React.useState(false);
  const [revealedNotes, setRevealedNotes] = React.useState<Set<string>>(new Set());
  const [revealAllNotes, setRevealAllNotes] = React.useState(true);

  // Publish and Edit state
  const [showPublish, setShowPublish] = React.useState(false);
  const [editingTitle, setEditingTitle] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;

    async function loadDeckData() {
      if (typeof window === "undefined") return;

      const savedDeck = localStorage.getItem("active_deck");
      const savedCards = localStorage.getItem("active_cards");

      if (savedDeck && savedCards) {
        try {
          const parsedD = JSON.parse(savedDeck);
          const parsedC = JSON.parse(savedCards);
          if (!cancelled) {
            setDeck(parsedD);
            setCards(parsedC);
            setEditTitle(parsedD.title || "Study Deck");
            setRevealedNotes(new Set(parsedC.map((c: Card) => c.id)));
            setLoading(false);
            return;
          }
        } catch {}
      }

      try {
        const res = await fetch(`/api/library/community?search=${encodeURIComponent(deckId || "")}`);
        const json = await res.json();
        if (json.success && json.data?.length > 0) {
          const item = json.data[0];
          const { deck: d, cards: c } = parseCSVFile(item.cardsCsv, item.title);
          if (!cancelled) {
            setDeck(d);
            setCards(c);
            setEditTitle(item.title);
            setRevealedNotes(new Set(c.map((x) => x.id)));
            localStorage.setItem("active_deck", JSON.stringify(d));
            localStorage.setItem("active_cards", JSON.stringify(c));
          }
        }
      } catch (err) {
        console.error("Failed to load deck from community API:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDeckData();
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  function resetStudyState() {
    setCardIndex(0);
    setIsFlipped(false);
    setSelectedMCOption(null);
    setMcOptionStates(["default", "default", "default", "default"]);
    setTfAnswer(null);
    setIdInput("");
    setIdSubmitted(false);
    setIdResult(null);
    setEnumRevealed(false);
    setScore({ correct: 0, wrong: 0, total: 0 });
  }

  function startMode(mode: StudyMode) {
    resetStudyState();
    setActiveMode(mode);
  }

  function nextCard() {
    setIsFlipped(false);
    setSelectedMCOption(null);
    setMcOptionStates(["default", "default", "default", "default"]);
    setTfAnswer(null);
    setIdInput("");
    setIdSubmitted(false);
    setIdResult(null);
    setEnumRevealed(false);
    setCardIndex((prev) => (prev + 1) % (cards.length || 1));
  }

  function prevCard() {
    setIsFlipped(false);
    setSelectedMCOption(null);
    setMcOptionStates(["default", "default", "default", "default"]);
    setTfAnswer(null);
    setIdInput("");
    setIdSubmitted(false);
    setIdResult(null);
    setEnumRevealed(false);
    setCardIndex((prev) => (prev - 1 + cards.length) % (cards.length || 1));
  }

  const currentCard = cards[cardIndex];

  const mcQuestion = React.useMemo(() => {
    if (!currentCard || activeMode !== "multiple_choice") return null;
    return buildMCQuestion(currentCard, cards);
  }, [currentCard, activeMode, cards]);

  function handleSelectMCOption(index: number) {
    if (selectedMCOption !== null || !mcQuestion) return;
    setSelectedMCOption(index);

    const isCorrect = index === mcQuestion.correctIndex;
    const newStates: MCOptionState[] = mcQuestion.options.map((_, idx) => {
      if (idx === index) return isCorrect ? "correct" : "wrong";
      if (idx === mcQuestion.correctIndex) return "reveal";
      return "default";
    });

    setMcOptionStates(newStates);
    setScore((s) => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      wrong: s.wrong + (isCorrect ? 0 : 1),
      total: s.total + 1,
    }));
  }

  React.useEffect(() => {
    if (activeMode !== "multiple_choice") return;

    function handleKey(e: KeyboardEvent) {
      const map: Record<string, number> = { "1": 0, "a": 0, "A": 0, "2": 1, "b": 1, "B": 1, "3": 2, "c": 2, "C": 2, "4": 3, "d": 3, "D": 3 };
      if (map[e.key] !== undefined) {
        handleSelectMCOption(map[e.key]);
      }
      if (e.key === "Enter" && selectedMCOption !== null) {
        nextCard();
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeMode, selectedMCOption]);

  function handleIdentificationCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!currentCard || !idInput.trim()) return;

    const variants = currentCard.id_variants
      ? currentCard.id_variants.split(";").map((v) => v.trim())
      : [];

    const res = checkIdentificationAnswer(idInput, currentCard.back || currentCard.id_answer || "", variants);
    setIdResult(res);
    setIdSubmitted(true);
    setScore((s) => ({
      correct: s.correct + (res.isCorrect ? 1 : 0),
      wrong: s.wrong + (res.isCorrect ? 0 : 1),
      total: s.total + 1,
    }));
  }

  function toggleNoteReveal(id: string) {
    setRevealedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleToggleAllNotes() {
    if (revealAllNotes) {
      setRevealedNotes(new Set());
      setRevealAllNotes(false);
    } else {
      setRevealedNotes(new Set(cards.map((c) => c.id)));
      setRevealAllNotes(true);
    }
  }

  const flashcardCount = cards.length;
  const mcCount = cards.filter((c) => c.type === "multiple_choice" || c.mc_correct).length || Math.min(cards.length, 5);
  const tfCount = cards.filter((c) => c.type === "true_false" || c.tf_answer).length || Math.min(cards.length, 4);
  const enumCount = cards.filter((c) => c.type === "enumeration" || c.enum_items).length || Math.min(cards.length, 3);
  const idCount = cards.filter((c) => c.type === "identification" || c.id_answer).length || Math.min(cards.length, 5);
  const keywordCount = cards.filter((c) => c.type === "keyword" || c.type === "definition").length || cards.length;

  const progress = 68;
  const masteredCount = Math.round(cards.length * 0.45);
  const learningCount = Math.round(cards.length * 0.35);
  const newCount = Math.max(0, cards.length - masteredCount - learningCount);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
        <div className="animate-pulse text-[#9ba3b8]">Loading deck…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0c10] text-[#eef0f6] px-4 md:px-8 py-6 space-y-6"
         style={{
           backgroundImage: `
             radial-gradient(1200px 800px at 80% -10%, rgba(79, 142, 247, 0.08) 0%, transparent 60%),
             radial-gradient(1000px 700px at -10% 110%, rgba(129, 140, 248, 0.05) 0%, transparent 55%)
           `
         }}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* StitchApp Glass TopBar */}
        <TopBar
          title={
            activeMode
              ? `${deck?.title || "Deck"} · ${
                  activeMode === "flashcards"
                    ? "Flashcards"
                    : activeMode === "multiple_choice"
                    ? "Multiple Choice"
                    : activeMode === "true_false"
                    ? "True / False"
                    : activeMode === "enumeration"
                    ? "Enumeration"
                    : activeMode === "identification"
                    ? "Identification"
                    : activeMode === "blanks"
                    ? "Fill in Blanks"
                    : activeMode === "notes"
                    ? "Study Notes"
                    : "Stats"
                }`
              : deck?.title || "StudyUp Dashboard"
          }
          onBack={activeMode ? () => setActiveMode(null) : () => router.push("/dashboard/library")}
        />

        {/* ─── VIEW A: MAIN STUDY DASHBOARD (When activeMode === null) ─── */}
        {activeMode === null && (
          <>
            {/* StitchApp Glass Header Card */}
            <div className="glass-panel rounded-2xl border border-[rgba(255,255,255,0.07)] p-6 space-y-4 shadow-xl">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1.5 max-w-lg">
                  {editingTitle ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (deck) {
                            const updated: Deck = { ...deck, title: editTitle.trim() };
                            setDeck(updated);
                            localStorage.setItem("active_deck", JSON.stringify(updated));
                          }
                          setEditingTitle(false);
                        }
                        if (e.key === "Escape") setEditingTitle(false);
                      }}
                      onBlur={() => setEditingTitle(false)}
                      autoFocus
                      className="text-2xl font-bold text-[#eef0f6] bg-[#1a1e28] border border-[#4f8ef7] rounded-xl px-3 py-1 focus:outline-none"
                    />
                  ) : (
                    <h1
                      onClick={() => setEditingTitle(true)}
                      className="text-2xl sm:text-3xl font-bold tracking-tight text-[#eef0f6] cursor-pointer hover:text-[#4f8ef7] transition-colors"
                      title="Click to edit title"
                    >
                      {deck?.title || "Study Deck"}
                    </h1>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <StatBadge label={deck?.subject || "General Education"} value="" color="accent" />
                    <span className="text-xs text-[#5e6880]">· {cards.length} Cards</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPublish(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold rounded-xl bg-[#4f8ef7] text-white px-4 py-2.5 hover:bg-[#3d7ce6] transition-colors shadow-sm squishy-btn"
                >
                  <Share2 size={14} /> Publish to Feed
                </button>
              </div>

              {/* Progress & Stats Row */}
              <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-[rgba(255,255,255,0.07)]">
                <div className="flex items-center gap-4">
                  <ProgressRing value={progress} size={76} strokeWidth={7} color="#34d399" />
                  <div className="flex flex-col gap-1.5">
                    <StatBadge label="Mastered" value={masteredCount} color="know" />
                    <StatBadge label="Learning" value={learningCount} color="mastered" />
                    <StatBadge label="New" value={newCount} color="new" />
                  </div>
                </div>

                <div className="ml-auto text-xs font-semibold text-amber-400 flex items-center gap-1.5 bg-amber-400/10 px-3.5 py-2 rounded-full border border-amber-400/20">
                  🔥 4 day study streak
                </div>
              </div>
            </div>

            {/* Daily Review Reminder Banner */}
            <div className="glass-panel rounded-2xl border border-[rgba(79,142,247,0.3)] bg-[rgba(79,142,247,0.06)] p-4 flex items-center justify-between shadow-sm cyber-glow">
              <div className="flex items-center gap-2.5 text-sm font-medium text-[#eef0f6]">
                <Bell size={16} className="text-[#4f8ef7]" />
                <span>{cards.length} cards scheduled for active recall today</span>
              </div>
              <button
                type="button"
                onClick={() => startMode("flashcards")}
                className="text-xs font-bold text-[#4f8ef7] hover:underline"
              >
                Start review →
              </button>
            </div>

            {/* Study Modes Header */}
            <div className="pt-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#5e6880]">
                Study & Quiz Modes
              </h2>
            </div>

            {/* StitchApp 8-Card Grid with exact Colors & Glass-Panel styling */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <div onClick={() => startMode("flashcards")}>
                <ModeCard
                  icon={Layers}
                  label="Flashcards"
                  description="Active recall flip & voice mic"
                  color="#4f8ef7"
                  href="#"
                  count={`${flashcardCount} cards`}
                  disabled={flashcardCount === 0}
                />
              </div>
              <div onClick={() => startMode("multiple_choice")}>
                <ModeCard
                  icon={ListChecks}
                  label="Multiple Choice"
                  description="4-option question drill"
                  color="#818cf8"
                  href="#"
                  count={`${mcCount} questions`}
                  disabled={mcCount === 0}
                />
              </div>
              <div onClick={() => startMode("true_false")}>
                <ModeCard
                  icon={ToggleLeft}
                  label="True / False"
                  description="Speed decision quiz"
                  color="#fbbf24"
                  href="#"
                  count={`${tfCount} items`}
                  disabled={tfCount === 0}
                />
              </div>
              <div onClick={() => startMode("enumeration")}>
                <ModeCard
                  icon={List}
                  label="Enumeration"
                  description="Recall full list items"
                  color="#f87171"
                  href="#"
                  count={`${enumCount} sets`}
                  disabled={enumCount === 0}
                />
              </div>
              <div onClick={() => startMode("identification")}>
                <ModeCard
                  icon={HelpCircle}
                  label="Identification"
                  description="Fuzzy typing & math"
                  color="#34d399"
                  href="#"
                  count={`${idCount} terms`}
                  disabled={idCount === 0}
                />
              </div>
              <div onClick={() => startMode("blanks")}>
                <ModeCard
                  icon={PenLine}
                  label="Fill in Blanks"
                  description="Interactive cloze reading"
                  color="#a855f7"
                  href="#"
                  count={`${cards.length} items`}
                  disabled={cards.length === 0}
                />
              </div>
              <div onClick={() => startMode("notes")}>
                <ModeCard
                  icon={BookOpen}
                  label="Study Notes"
                  description="Terms & definitions"
                  color="#fbbf24"
                  href="#"
                  count={`${keywordCount} notes`}
                  disabled={keywordCount === 0}
                />
              </div>
              <div onClick={() => startMode("stats")}>
                <ModeCard
                  icon={BarChart2}
                  label="Stats & Mastery"
                  description="Retention metrics"
                  color="#38bdf8"
                  href="#"
                  count={`${progress}% accuracy`}
                />
              </div>
            </div>
          </>
        )}

        {/* ─── VIEW B: IN-PLACE STUDY RUNNERS (When activeMode is selected) ─── */}
        {activeMode && (
          <div className="space-y-5 animate-in fade-in zoom-in-95">
            {/* Top Progress & Return Control */}
            <div className="glass-panel flex items-center justify-between rounded-2xl border border-[rgba(255,255,255,0.07)] p-4 text-xs shadow-md">
              <button
                type="button"
                onClick={() => setActiveMode(null)}
                className="text-xs font-bold text-[#4f8ef7] hover:underline flex items-center gap-1.5"
              >
                <ArrowLeft size={15} /> Back to Deck Hub
              </button>
              <div className="flex items-center gap-3 font-semibold text-[#eef0f6]">
                <span>Card {cardIndex + 1} of {cards.length}</span>
                {score.total > 0 && (
                  <span className="text-[#34d399] font-bold">
                    Score: {score.correct}/{score.total} ({Math.round((score.correct / score.total) * 100)}%)
                  </span>
                )}
              </div>
            </div>

            {/* 1. Flashcards 3D Flip Runner with Voice Mic */}
            {activeMode === "flashcards" && currentCard && (
              <FlashcardDeck
                card={currentCard}
                isFlipped={isFlipped}
                onFlip={() => setIsFlipped(!isFlipped)}
              />
            )}

            {/* 2. Multiple Choice Runner with A/B/C/D badges & animated states */}
            {activeMode === "multiple_choice" && mcQuestion && (
              <div className="space-y-4">
                <QuizProgressBar
                  current={cardIndex + 1}
                  total={cards.length}
                  correct={score.correct}
                  wrong={score.wrong}
                />

                <div className="glass-panel rounded-2xl border border-[rgba(255,255,255,0.07)] p-6 shadow-md space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#5e6880]">
                    <span>{currentCard?.chapter || "Chapter 1"}</span>
                    <span>·</span>
                    <span>{currentCard?.subject || deck?.subject || "General"}</span>
                  </div>
                  <h3 className="text-2xl font-bold leading-snug text-[#eef0f6] pt-1">
                    {mcQuestion.question}
                  </h3>
                </div>

                <div className="flex flex-col gap-3">
                  {mcQuestion.options.map((opt, i) => (
                    <MCOption
                      key={i}
                      label={opt.label}
                      text={opt.text}
                      state={mcOptionStates[i] ?? "default"}
                      onClick={() => handleSelectMCOption(i)}
                      disabled={selectedMCOption !== null}
                    />
                  ))}
                </div>

                {selectedMCOption !== null && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={nextCard}
                      className="px-6 py-3 rounded-xl font-bold bg-[#4f8ef7] text-white hover:bg-[#3d7ce6] shadow-md squishy-btn"
                    >
                      Next Question →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 3. True / False Runner */}
            {activeMode === "true_false" && currentCard && (
              <div className="glass-panel rounded-2xl border border-[rgba(255,255,255,0.07)] p-8 space-y-6 text-center shadow-md cyber-glow">
                <div className="text-xs uppercase tracking-wider font-bold text-[#5e6880]">
                  True or False Statement
                </div>
                <p className="text-2xl font-bold leading-relaxed max-w-xl mx-auto text-[#eef0f6]">
                  "{currentCard.front}"
                </p>

                <div className="flex justify-center gap-4 pt-2">
                  <button
                    type="button"
                    disabled={tfAnswer !== null}
                    onClick={() => {
                      setTfAnswer(true);
                      const isCorrect = currentCard.tf_answer?.toLowerCase() === "true";
                      setScore((s) => ({ correct: s.correct + (isCorrect ? 1 : 0), wrong: s.wrong + (isCorrect ? 0 : 1), total: s.total + 1 }));
                    }}
                    className={`w-36 py-3.5 rounded-xl font-bold text-sm border transition-all squishy-btn ${
                      tfAnswer === true
                        ? currentCard.tf_answer?.toLowerCase() === "true"
                          ? "bg-[#34d399] text-[#0a0c10] border-[#34d399]"
                          : "bg-[#f87171] text-white border-[#f87171]"
                        : "border-[rgba(255,255,255,0.1)] hover:border-[#4f8ef7] bg-[#1a1e28] text-[#eef0f6]"
                    }`}
                  >
                    <Check className="inline-block size-4 mr-1.5" /> True
                  </button>
                  <button
                    type="button"
                    disabled={tfAnswer !== null}
                    onClick={() => {
                      setTfAnswer(false);
                      const isCorrect = currentCard.tf_answer?.toLowerCase() === "false";
                      setScore((s) => ({ correct: s.correct + (isCorrect ? 1 : 0), wrong: s.wrong + (isCorrect ? 0 : 1), total: s.total + 1 }));
                    }}
                    className={`w-36 py-3.5 rounded-xl font-bold text-sm border transition-all squishy-btn ${
                      tfAnswer === false
                        ? currentCard.tf_answer?.toLowerCase() === "false"
                          ? "bg-[#34d399] text-[#0a0c10] border-[#34d399]"
                          : "bg-[#f87171] text-white border-[#f87171]"
                        : "border-[rgba(255,255,255,0.1)] hover:border-[#4f8ef7] bg-[#1a1e28] text-[#eef0f6]"
                    }`}
                  >
                    <X className="inline-block size-4 mr-1.5" /> False
                  </button>
                </div>

                {tfAnswer !== null && (
                  <p className="text-xs text-[#9ba3b8] pt-2 italic">
                    💡 {currentCard.explanation || `Statement is ${currentCard.tf_answer ?? "true"}.`}
                  </p>
                )}
              </div>
            )}

            {/* 4. Enumeration Runner */}
            {activeMode === "enumeration" && currentCard && (
              <div className="glass-panel rounded-2xl border border-[rgba(255,255,255,0.07)] p-6 space-y-4 shadow-md">
                <div className="text-xs uppercase tracking-wider font-bold text-[#5e6880]">
                  Enumeration Recall
                </div>
                <p className="text-xl font-bold leading-snug text-[#eef0f6]">{currentCard.front}</p>

                <div className="p-4 rounded-xl bg-[#1a1e28] border border-[rgba(255,255,255,0.07)] space-y-2">
                  <p className="text-xs font-semibold uppercase text-[#9ba3b8]">Expected Items:</p>
                  {enumRevealed ? (
                    <ul className="list-disc list-inside text-sm space-y-1 text-[#eef0f6] font-medium">
                      {(currentCard.enum_items || currentCard.back || "Item 1; Item 2")
                        .split(/[;\n]+/)
                        .map((item, idx) => (
                          <li key={idx}>{item.trim()}</li>
                        ))}
                    </ul>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEnumRevealed(true)}
                      className="text-xs font-bold text-[#4f8ef7] hover:underline"
                    >
                      Tap to reveal items →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 5. Identification Runner */}
            {activeMode === "identification" && currentCard && (
              <div className="glass-panel rounded-2xl border border-[rgba(255,255,255,0.07)] p-6 space-y-4 shadow-md">
                <div className="text-xs uppercase tracking-wider font-bold text-[#5e6880]">
                  Identification (Supports Fuzzy Spelling & Math)
                </div>
                <p className="text-xl font-bold leading-snug text-[#eef0f6]">{currentCard.front}</p>

                <form onSubmit={handleIdentificationCheck} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={idInput}
                      onChange={(e) => setIdInput(e.target.value)}
                      placeholder="Type your answer here..."
                      disabled={idSubmitted}
                      className="flex-1 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#1a1e28] px-4 py-2.5 text-base text-[#eef0f6] focus:outline-none focus:border-[#4f8ef7]"
                    />
                    <button
                      type="submit"
                      disabled={idSubmitted || !idInput.trim()}
                      className="px-5 py-2.5 rounded-xl font-bold bg-[#4f8ef7] text-white hover:bg-[#3d7ce6] disabled:opacity-50 transition-colors squishy-btn"
                    >
                      Check
                    </button>
                  </div>

                  {idSubmitted && idResult && (
                    <div
                      className={`p-3 rounded-xl text-sm flex items-start gap-2.5 ${
                        idResult.isCorrect
                          ? "bg-[#34d399]/15 text-[#34d399] border border-[#34d399]/30"
                          : "bg-[#f87171]/15 text-[#f87171] border border-[#f87171]/30"
                      }`}
                    >
                      {idResult.isCorrect ? (
                        <CheckCircle2 className="size-5 shrink-0 text-[#34d399]" />
                      ) : (
                        <XCircle className="size-5 shrink-0 text-[#f87171]" />
                      )}
                      <div>
                        <p className="font-bold">{idResult.isCorrect ? "Correct!" : "Incorrect."}</p>
                        <p className="text-xs mt-0.5">
                          Answer: <strong>{currentCard.back || currentCard.id_answer}</strong>
                        </p>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* 6. Authentic StitchApp Fill in the Blanks Cloze Reading Runner */}
            {activeMode === "blanks" && currentCard && (
              <FillInTheBlanksUI card={currentCard} onComplete={nextCard} />
            )}

            {/* 7. Authentic StitchApp Notes View */}
            {activeMode === "notes" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl glass-panel border border-[rgba(255,255,255,0.07)]">
                  <div className="relative flex-1 max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5e6880]" />
                    <input
                      type="text"
                      value={noteSearch}
                      onChange={(e) => setNoteSearch(e.target.value)}
                      placeholder="Search keywords, definitions…"
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#1a1e28] border border-[rgba(255,255,255,0.07)] text-xs text-[#eef0f6] focus:outline-none focus:border-[#4f8ef7]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setHideKeywords(!hideKeywords)}
                      className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                        hideKeywords
                          ? "bg-[#4f8ef7] text-white border-[#4f8ef7]"
                          : "text-[#9ba3b8] border-[rgba(255,255,255,0.07)] hover:bg-[#1a1e28]"
                      }`}
                      title="Hide keywords to test yourself"
                    >
                      <Tag size={12} />
                      <span>{hideKeywords ? "Keywords Hidden" : "Hide Keywords"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleAllNotes}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#9ba3b8] border border-[rgba(255,255,255,0.07)] hover:bg-[#1a1e28] rounded-lg transition-colors"
                    >
                      {revealAllNotes ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span>{revealAllNotes ? "Collapse All" : "Expand All"}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {cards
                    .filter(
                      (c) =>
                        !noteSearch ||
                        c.front.toLowerCase().includes(noteSearch.toLowerCase()) ||
                        c.back.toLowerCase().includes(noteSearch.toLowerCase())
                    )
                    .map((card) => {
                      const isRev = revealedNotes.has(card.id);
                      return (
                        <div
                          key={card.id}
                          className="glass-panel rounded-2xl border border-[rgba(255,255,255,0.07)] p-4 transition-all duration-200 shadow-sm"
                        >
                          <div
                            onClick={() => toggleNoteReveal(card.id)}
                            className="flex items-start justify-between gap-3 cursor-pointer select-none group"
                          >
                            <div className="flex-1">
                              {hideKeywords ? (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleNoteReveal(card.id);
                                  }}
                                  className="inline-block px-2 py-0.5 rounded bg-[#1a1e28] text-transparent select-none blur-[5px] hover:blur-none hover:text-[#eef0f6] transition-all cursor-pointer text-sm font-bold"
                                  title="Hover or click to reveal keyword"
                                >
                                  {card.front}
                                </span>
                              ) : (
                                <h4 className="font-bold text-[#eef0f6] text-base tracking-wide leading-snug">
                                  {card.front}
                                </h4>
                              )}
                            </div>
                            <span className="shrink-0 text-[#5e6880] group-hover:text-[#4f8ef7] transition-colors mt-0.5">
                              {isRev ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </span>
                          </div>

                          {isRev && (
                            <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.07)]">
                              <FormattedNoteText text={card.back || card.explanation || ""} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* 8. Stats & Mastery View */}
            {activeMode === "stats" && (
              <div className="glass-panel rounded-2xl border border-[rgba(255,255,255,0.07)] p-6 space-y-5 shadow-md text-center">
                <h3 className="text-lg font-bold text-[#eef0f6]">Deck Mastery & Retention</h3>
                <div className="flex justify-center py-4">
                  <ProgressRing value={progress} size={110} strokeWidth={8} color="#34d399" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-[#1a1e28] border border-[rgba(255,255,255,0.07)]">
                    <p className="text-xs text-[#5e6880]">Mastered</p>
                    <p className="text-xl font-bold text-[#34d399]">{masteredCount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1a1e28] border border-[rgba(255,255,255,0.07)]">
                    <p className="text-xs text-[#5e6880]">Learning</p>
                    <p className="text-xl font-bold text-[#fbbf24]">{learningCount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1a1e28] border border-[rgba(255,255,255,0.07)]">
                    <p className="text-xs text-[#5e6880]">New</p>
                    <p className="text-xl font-bold text-[#818cf8]">{newCount}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Controls for active runner */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={prevCard}
                disabled={cards.length <= 1}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-[rgba(255,255,255,0.1)] bg-[#1a1e28] text-[#eef0f6] hover:border-[#4f8ef7] disabled:opacity-40 transition-colors squishy-btn flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Previous
              </button>
              <button
                type="button"
                onClick={nextCard}
                disabled={cards.length <= 1}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-[#4f8ef7] text-white hover:bg-[#3d7ce6] disabled:opacity-40 transition-colors squishy-btn flex items-center gap-1.5 shadow-sm"
              >
                Next Card →
              </button>
            </div>
          </div>
        )}

        {/* Publish Modal */}
        <PublishDeckModal
          isOpen={showPublish}
          onClose={() => setShowPublish(false)}
          title={deck?.title || "Study Deck"}
          content={cards.map((c) => `• ${c.front}: ${c.back || c.id_answer || ""}`).join("\n")}
        />
      </div>
    </div>
  );
}
