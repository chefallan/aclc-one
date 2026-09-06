"use client";

import * as React from "react";
import { Star, RotateCcw, Mic, MicOff, AlertCircle } from "lucide-react";
import type { Card } from "@/lib/study/types";
import { StatBadge } from "./StatBadge";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface FlashcardDeckProps {
  card: Card;
  isFlipped: boolean;
  onFlip: () => void;
}

import MathFormattedText from "@/components/study/MathFormattedText";

export function FlashcardDeck({
  card,
  isFlipped,
  onFlip,
}: FlashcardDeckProps) {
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
  }, [card.id, setTranscript]);

  React.useEffect(() => {
    if (!userAnswer || isCorrectState === true) return;
    const timeout = setTimeout(() => {
      const u = userAnswer.trim().toLowerCase();
      const target = (card.back || card.id_answer || card.mc_correct || card.tf_answer || "").trim().toLowerCase();
      if (u.length > 2 && (target.includes(u) || u.includes(target))) {
        setIsCorrectState(true);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [userAnswer, isCorrectState, card]);

  // Determine back answer text
  const isTrueFalse = card.type === "true_false" || typeof card.tf_answer === "boolean" || Boolean(card.tf_answer);
  const tfVal = String(card.tf_answer).toLowerCase() === "true";

  return (
    <div className="w-full" style={{ perspective: "1000px" }}>
      <div
        className="w-full transition-transform duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] grid cursor-pointer"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front face */}
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
                {card.chapter || "Chapter 1"}
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
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-[#eef0f6] break-words leading-relaxed">
              <MathFormattedText text={card.front} />
            </div>
          </div>

          {/* Interactive Voice Mic & Typing Area */}
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

            {/* Voice Dictation Mic Button */}
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
                  <RotateCcw className="size-3" /> Tap card to reveal answer
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Back face */}
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
              {card.chapter || "Chapter 1"}
            </span>
            <StatBadge label="Answer" value="" color="know" />
          </div>

          <div className="flex-1 overflow-auto py-6 flex items-center justify-center flex-col gap-3">
            {isTrueFalse ? (
              <div className="flex flex-col items-center gap-3">
                <span
                  className={`px-5 py-2 rounded-xl text-lg font-extrabold uppercase tracking-wider ${
                    tfVal
                      ? "bg-[#34d399]/20 text-[#34d399] border border-[#34d399]/40"
                      : "bg-[#f87171]/20 text-[#f87171] border border-[#f87171]/40"
                  }`}
                >
                  {tfVal ? "TRUE" : "FALSE"}
                </span>
                {card.explanation && (
                  <p className="text-sm text-[#eef0f6] text-center max-w-md bg-[#1a1e28] p-4 rounded-xl border border-[rgba(255,255,255,0.05)]">
                    <MathFormattedText text={card.explanation} />
                  </p>
                )}
              </div>
            ) : card.enum_items ? (
              <div className="text-left w-full max-w-md bg-[#1a1e28] p-4 rounded-xl border border-[rgba(255,255,255,0.05)] space-y-2">
                <p className="text-xs uppercase text-zinc-400 font-semibold mb-1">Items:</p>
                {card.enum_items.split(";").map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-[#eef0f6]">
                    <span className="text-[#34d399] font-bold">•</span>
                    <MathFormattedText text={item.trim()} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-center text-[#eef0f6] break-words leading-relaxed">
                <MathFormattedText text={card.back || card.id_answer || card.mc_correct || ""} />
              </div>
            )}

            {!isTrueFalse && card.explanation && (
              <p className="text-xs text-[#9ba3b8] italic text-center max-w-md bg-[#1a1e28] p-3 rounded-xl border border-[rgba(255,255,255,0.05)]">
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
  );
}
