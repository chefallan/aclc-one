"use client";

import * as React from "react";
import { Star, RotateCcw, ChevronLeft, ChevronRight, Keyboard, CheckCircle2, Sparkles } from "lucide-react";
import type { Card } from "@/lib/study/types";
import { StatBadge } from "./StatBadge";
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

  // Physical X-axis slide state: 'idle' | 'exit-left' | 'exit-right' | 'enter-from-right' | 'enter-from-left'
  const [animState, setAnimState] = React.useState<"idle" | "exit-left" | "exit-right" | "enter-from-right" | "enter-from-left">("idle");
  const isTransitioningRef = React.useRef(false);

  const [userAnswer, setUserAnswer] = React.useState("");
  const [isCorrectState, setIsCorrectState] = React.useState<boolean | null>(null);

  const handleNextWithAnim = React.useCallback(() => {
    if (isTransitioningRef.current || !onNext) return;
    if (cards && currentIndex >= cards.length - 1) return;

    isTransitioningRef.current = true;
    setAnimState("exit-left");

    setTimeout(() => {
      onNext();
      setAnimState("enter-from-right");

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimState("idle");
          setTimeout(() => {
            isTransitioningRef.current = false;
          }, 300);
        });
      });
    }, 220);
  }, [onNext, cards, currentIndex]);

  const handlePrevWithAnim = React.useCallback(() => {
    if (isTransitioningRef.current || !onPrev) return;
    if (currentIndex <= 0) return;

    isTransitioningRef.current = true;
    setAnimState("exit-right");

    setTimeout(() => {
      onPrev();
      setAnimState("enter-from-left");

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimState("idle");
          setTimeout(() => {
            isTransitioningRef.current = false;
          }, 300);
        });
      });
    }, 220);
  }, [onPrev, currentIndex]);

  // Keyboard navigation listener (ArrowLeft, ArrowRight, Space/Enter)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.isContentEditable)) {
        if (e.key === "Enter" && onFlip) {
          e.preventDefault();
          onFlip();
        }
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextWithAnim();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevWithAnim();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (onFlip) onFlip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNextWithAnim, handlePrevWithAnim, onFlip]);

  // Reset answer when card changes
  React.useEffect(() => {
    setUserAnswer("");
    setIsCorrectState(null);
  }, [card?.id]);

  // Active recall fuzzy matching
  React.useEffect(() => {
    if (!userAnswer || isCorrectState === true || !card) return;
    const timeout = setTimeout(() => {
      const u = userAnswer.trim().toLowerCase();
      const target = (card.back || card.id_answer || "").trim().toLowerCase();
      if (u.length > 2 && (target.includes(u) || u.includes(target))) {
        setIsCorrectState(true);
      }
    }, 400);
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

  // Compute transform & opacity styles based on physical X-axis position
  const getSlideStyle = () => {
    switch (animState) {
      case "exit-left":
        return {
          transform: "translateX(-120%) scale(0.92) rotate(-3deg)",
          opacity: 0,
          transition: "transform 220ms cubic-bezier(0.4, 0, 1, 1), opacity 220ms ease-in",
        };
      case "exit-right":
        return {
          transform: "translateX(120%) scale(0.92) rotate(3deg)",
          opacity: 0,
          transition: "transform 220ms cubic-bezier(0.4, 0, 1, 1), opacity 220ms ease-in",
        };
      case "enter-from-right":
        return {
          transform: "translateX(120%) scale(0.92) rotate(3deg)",
          opacity: 0,
          transition: "none",
        };
      case "enter-from-left":
        return {
          transform: "translateX(-120%) scale(0.92) rotate(-3deg)",
          opacity: 0,
          transition: "none",
        };
      case "idle":
      default:
        return {
          transform: "translateX(0) scale(1) rotate(0deg)",
          opacity: 1,
          transition: "transform 280ms cubic-bezier(0.16, 1, 0.3, 1), opacity 240ms ease-out",
        };
    }
  };

  return (
    <div className="w-full space-y-4 overflow-hidden py-2" style={{ perspective: "1200px" }}>
      {/* Physical X-axis animated wrapper */}
      <div
        className="w-full will-change-transform"
        style={getSlideStyle()}
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
                ? "border-[#34d399] shadow-[0_0_30px_rgba(52,211,153,0.4)]"
                : "border-[rgba(255,255,255,0.07)] shadow-2xl"
            } p-6 md:p-8 flex flex-col justify-between transition-all duration-300 cyber-glow bg-[#12151c]/90 select-none`}
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

            {/* Self-Recall Testing Area */}
            <div className="mt-2 w-full flex flex-col items-center gap-3 relative">
              <div className="relative w-full max-w-md">
                <input
                  type="text"
                  className={`w-full text-center bg-[#1a1e28] border-2 ${
                    isCorrectState === true
                      ? "border-[#34d399] text-[#34d399]"
                      : "border-[rgba(255,255,255,0.1)] focus:border-[#4f8ef7] text-[#eef0f6]"
                  } px-4 py-2.5 text-base font-semibold focus:outline-none transition-all rounded-xl shadow-inner`}
                  placeholder="Type your answer to test recall..."
                  value={userAnswer}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setUserAnswer(e.target.value)}
                />
                {isCorrectState === true && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#34d399] flex items-center gap-1 text-xs font-bold animate-in fade-in">
                    <CheckCircle2 size={16} /> Correct!
                  </span>
                )}
              </div>

              <div className="flex flex-col items-center h-6">
                <p className="text-xs text-[#5e6880] text-center flex items-center gap-1.5 cursor-pointer hover:text-[#4f8ef7] transition-colors" onClick={onFlip}>
                  <RotateCcw className="size-3" /> Tap card or press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono text-[10px]">Space</kbd> to reveal answer
                </p>
              </div>
            </div>
          </div>

          {/* Back Face: Answer / Definition */}
          <div
            className="col-start-1 row-start-1 min-h-[25rem] md:min-h-[29rem] h-full glass-panel rounded-2xl border border-[rgba(255,255,255,0.07)] shadow-2xl p-6 md:p-8 flex flex-col justify-between bg-[#12151c]/90 select-none"
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
          onClick={handlePrevWithAnim}
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
          onClick={handleNextWithAnim}
          disabled={!onNext || (cards && currentIndex >= cards.length - 1)}
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-md"
        >
          Next <span className="hidden sm:inline text-white/70 font-mono">[→]</span> <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
