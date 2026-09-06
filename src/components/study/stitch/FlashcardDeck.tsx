"use client";

import * as React from "react";
import { Star, RotateCcw, Mic, MicOff, AlertCircle, ChevronLeft, ChevronRight, Keyboard } from "lucide-react";
import type { Card } from "@/lib/study/types";
import { StatBadge } from "./StatBadge";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import MathFormattedText from "@/components/study/MathFormattedText";

interface FlashcardDeckProps {
  card?: Card;
  cards?: Card[];
  currentIndex?: number;
  isFlipped?: boolean;
  onFlip?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export function FlashcardDeck({
  card: propCard,
  cards,
  currentIndex = 0,
  isFlipped = false,
  onFlip,
  onNext,
  onPrev,
}: FlashcardDeckProps) {
  const card = propCard || (cards && cards.length > 0 ? cards[Math.min(currentIndex, cards.length - 1)] : undefined);

  // Directional slide tracking
  const prevIndexRef = React.useRef(currentIndex);
  const [slideDirection, setSlideDirection] = React.useState<"next" | "prev" | "none">("none");

  React.useEffect(() => {
    if (currentIndex > prevIndexRef.current) {
      setSlideDirection("next");
    } else if (currentIndex < prevIndexRef.current) {
      setSlideDirection("prev");
    }
    prevIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Keyboard navigation listener (ArrowLeft, ArrowRight, Space/Enter)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.isContentEditable)) {
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (onNext) onNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (onPrev) onPrev();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (onFlip) onFlip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNext, onPrev, onFlip]);

  const {
    isListening,
    transcript,
    interimTranscript,
    permissionError,
    toggleListening,
    stopListening,
    setTranscript,
  } = useSpeechRecognition();

  const [userAnswer, setUserAnswer] = React.useState("");
  const [isCorrectState, setIsCorrectState] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (isFlipped) {
      stopListening();
    }
  }, [isFlipped, stopListening]);

  React.useEffect(() => {
    if (transcript || interimTranscript) {
      const combined = (transcript + " " + interimTranscript).trim();
      setUserAnswer(combined);
    }
  }, [transcript, interimTranscript]);

  React.useEffect(() => {
    setUserAnswer("");
    setTranscript("");
    setIsCorrectState(null);
  }, [card?.id, setTranscript]);

  React.useEffect(() => {
    if (!userAnswer || isCorrectState === true || !card) return;
    const timeout = setTimeout(() => {
      const u = userAnswer.trim().toLowerCase();
      const target = (card.back || card.id_answer || "").trim().toLowerCase();
      if (u.length > 2 && (target.includes(u) || u.includes(target))) {
        setIsCorrectState(true);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [userAnswer, isCorrectState, card]);

  if (!card) {
    return (
      <div className="glass-panel p-8 text-center rounded-2xl border border-white/10 text-slate-400">
        <p>No cards available for this mode.</p>
      </div>
    );
  }

  const badgeCategory = card.chapter || card.subject || (card.tags && card.tags[0]) || "Flashcard";

  return (
    <div className="w-full space-y-4" style={{ perspective: "1000px" }}>
      {/* Animated Card Container with Directional Slide */}
      <div
        key={card.id || currentIndex}
        className={`w-full transition-all duration-300 ease-out ${
          slideDirection === "next"
            ? "animate-in fade-in slide-in-from-right-16 duration-300"
            : slideDirection === "prev"
            ? "animate-in fade-in slide-in-from-left-16 duration-300"
            : "animate-in fade-in duration-200"
        }`}
      >
        <div
          className="w-full transition-transform duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] grid cursor-pointer"
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front Face: Question / Term */}
          <div
            className={`col-start-1 row-start-1 min-h-[25rem] md:min-h-[29rem] h-full glass-panel rounded-2xl border ${
              isCorrectState === true
                ? "border-[#34d399] shadow-[0_0_25px_rgba(52,211,153,0.35)]"
                : isCorrectState === false
                ? "border-[#f87171] shadow-[0_0_25px_rgba(248,113,113,0.35)]"
                : "border-[rgba(255,255,255,0.07)] shadow-2xl"
            } p-6 md:p-8 flex flex-col justify-between transition-all duration-300 cyber-glow bg-[#12151c]/90`}
            style={{ backfaceVisibility: "hidden" }}
            onClick={onFlip}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-[#5e6880]">
                  {badgeCategory}
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/10 text-zinc-300">
                  {card.type}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={
                      i < (card.mastery || 3)
                        ? "fill-[#fbbf24] text-[#fbbf24]"
                        : "text-[#5e6880]"
                    }
                  />
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-auto py-6 flex items-center justify-center">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-[#eef0f6] break-words leading-relaxed px-4">
                <MathFormattedText text={card.front} />
              </div>
            </div>

            {/* Voice Mic & Self-Recall Area */}
            <div className="mt-2 w-full flex flex-col items-center gap-3 relative">
              <input
                type="text"
                className="w-full max-w-md text-center bg-[#1a1e28] border-b-2 border-[rgba(255,255,255,0.1)] px-4 py-2.5 text-base font-semibold text-[#eef0f6] focus:outline-none focus:border-b-[#4f8ef7] transition-colors rounded-t-lg"
                placeholder="Type or speak answer to test recall..."
                value={userAnswer}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  setUserAnswer(e.target.value);
                  setTranscript(e.target.value);
                }}
              />

              {/* Voice Dictation Mic */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleListening();
                  }}
                  className={`p-4 rounded-full transition-all duration-300 shadow-lg ${
                    isListening
                      ? "bg-[#34d399] text-[#0a0c10] scale-110 shadow-[0_0_25px_rgba(52,211,153,0.6)] animate-pulse"
                      : "bg-[#1a1e28] text-[#eef0f6] hover:bg-[#222733] hover:scale-105 border border-[rgba(255,255,255,0.1)]"
                  }`}
                  title={isListening ? "Listening... tap to stop" : "Tap microphone to speak answer"}
                >
                  {isListening ? <Mic size={26} /> : <MicOff size={26} />}
                </button>
              </div>

              {permissionError && (
                <p className="text-xs text-[#f87171] flex items-center gap-1 font-medium bg-[#f87171]/10 px-3 py-1 rounded-full border border-[#f87171]/20">
                  <AlertCircle size={13} /> {permissionError}
                </p>
              )}

              <div className="flex flex-col items-center h-6">
                <span className="text-xs text-[#34d399] font-bold">
                  {isListening ? "🎙️ Listening... speak clearly now" : ""}
                </span>
                {!isListening && (
                  <p className="text-xs text-[#5e6880] text-center flex items-center gap-1 cursor-pointer hover:text-[#4f8ef7] transition-colors" onClick={onFlip}>
                    <RotateCcw className="size-3" /> Tap card or press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono text-[10px]">Space</kbd> to reveal
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Back Face: Answer / Definition */}
          <div
            className="col-start-1 row-start-1 min-h-[25rem] md:min-h-[29rem] h-full glass-panel rounded-2xl border border-[rgba(255,255,255,0.07)] shadow-2xl p-6 md:p-8 flex flex-col justify-between bg-[#12151c]/90"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
            onClick={onFlip}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs uppercase tracking-wider font-bold text-[#5e6880]">
                {badgeCategory}
              </span>
              <StatBadge label="Definition" value="" color="know" />
            </div>

            <div className="flex-1 overflow-auto py-6 flex items-center justify-center flex-col gap-4">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-center text-[#eef0f6] break-words leading-relaxed px-4">
                <MathFormattedText text={card.back || card.id_answer || ""} />
              </div>

              {card.explanation && (
                <p className="text-xs sm:text-sm text-[#9ba3b8] italic text-center max-w-md bg-[#1a1e28] p-3 rounded-xl border border-[rgba(255,255,255,0.05)]">
                  💡 <MathFormattedText text={card.explanation} />
                </p>
              )}
            </div>

            <p className="text-xs text-[#5e6880] text-center">
              ↩ Tap to flip back
            </p>
          </div>
        </div>
      </div>

      {/* Prev / Next Navigation Controls & Shortcuts Indicator */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!onPrev || currentIndex <= 0}
          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-sm font-medium flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <ChevronLeft size={16} /> Previous <span className="hidden sm:inline text-xs text-zinc-500 font-mono">[←]</span>
        </button>

        <div className="hidden md:flex items-center gap-2 text-xs text-zinc-500">
          <Keyboard size={14} className="text-zinc-400" />
          <span><kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px]">←</kbd> Prev</span>
          <span>•</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px]">Space</kbd> Flip</span>
          <span>•</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px]">→</kbd> Next</span>
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={!onNext || (cards && currentIndex >= cards.length - 1)}
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-md"
        >
          Next <span className="hidden sm:inline text-xs text-white/70 font-mono">[→]</span> <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
