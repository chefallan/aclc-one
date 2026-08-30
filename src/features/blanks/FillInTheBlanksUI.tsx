"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Mic, MicOff, RotateCcw, CheckCircle2, Sparkles } from "lucide-react";
import type { Card } from "@/lib/study/types";

export interface Token {
  id: string;
  text: string;
  isWord: boolean;
  isBlank: boolean;
}

interface FillInTheBlanksUIProps {
  card: Card;
  onComplete?: () => void;
}

function tokenizeText(text: string, targetBlankWords: string[]): Token[] {
  const rawParts = text.split(/(\s+|[.,!?;:()"]+)/g).filter(Boolean);
  const targets = new Set(targetBlankWords.map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, "")));

  return rawParts.map((part, idx) => {
    const clean = part.toLowerCase().replace(/[^a-z0-9]/g, "");
    const isWord = /[a-zA-Z0-9]/.test(part);
    const isBlank = isWord && (targets.has(clean) || (clean.length > 5 && idx % 4 === 1));

    return {
      id: `tok-${idx}`,
      text: part,
      isWord,
      isBlank,
    };
  });
}

function isWordMatch(spoken: string, expected: string): boolean {
  const s = spoken.toLowerCase().replace(/[^a-z0-9]/g, "");
  const e = expected.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!s || !e) return false;
  if (s === e) return true;
  if (s.length >= 3 && (e.startsWith(s) || s.startsWith(e))) return true;
  return false;
}

export function FillInTheBlanksUI({ card, onComplete }: FillInTheBlanksUIProps) {
  const blankTargets = useMemo(() => {
    const raw = (card.back || card.id_answer || card.front || "").split(/[,;\s]+/);
    return raw.filter((w) => w.length >= 4).slice(0, 4);
  }, [card]);

  const tokens = useMemo(() => {
    return tokenizeText(card.front + " — " + (card.back || card.explanation || ""), blankTargets);
  }, [card, blankTargets]);

  const wordTokens = useMemo(() => tokens.filter((t) => t.isWord), [tokens]);

  const skipNonBlanks = useCallback(
    (fromIdx: number): number => {
      let cur = fromIdx;
      while (cur < wordTokens.length && !wordTokens[cur].isBlank) {
        cur++;
      }
      return cur;
    },
    [wordTokens]
  );

  const [cursor, setCursor] = useState(0);
  const [correct, setCorrect] = useState<Set<string>>(new Set());
  const [filled, setFilled] = useState<Record<string, string>>({});
  const [hasWon, setHasWon] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setCursor(skipNonBlanks(0));
    setCorrect(new Set());
    setFilled({});
    setHasWon(false);
    setManualInput("");
  }, [card.id, skipNonBlanks]);

  const processSpokenWords = useCallback(
    (spokenWords: string[]) => {
      let cur = cursor;
      const newCorrect = new Set(correct);
      const newFilled = { ...filled };

      for (const word of spokenWords) {
        if (cur >= wordTokens.length) break;
        const expected = wordTokens[cur];

        if (expected.isBlank) {
          if (isWordMatch(word, expected.text)) {
            newCorrect.add(expected.id);
            newFilled[expected.id] = expected.text;
            cur++;
            cur = skipNonBlanks(cur);
          }
        } else {
          if (isWordMatch(word, expected.text)) {
            cur++;
            cur = skipNonBlanks(cur) <= wordTokens.length ? skipNonBlanks(cur) : cur;
          }
        }
      }

      setCorrect(newCorrect);
      setFilled(newFilled);
      setCursor(cur);

      const allBlanks = tokens.filter((t) => t.isBlank);
      if (allBlanks.length > 0 && allBlanks.every((t) => newCorrect.has(t.id)) && !hasWon) {
        setHasWon(true);
        if (onComplete) onComplete();
      }
    },
    [cursor, correct, filled, wordTokens, tokens, skipNonBlanks, hasWon, onComplete]
  );

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";

    r.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const words = event.results[i][0].transcript.trim().split(/\s+/);
          processSpokenWords(words);
        }
      }
    };

    r.onerror = () => setIsListening(false);
    r.onend = () => setIsListening(false);
    recognitionRef.current = r;
    r.start();
    setIsListening(true);
  }, [processSpokenWords]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  const handleReset = () => {
    stopListening();
    setCursor(skipNonBlanks(0));
    setCorrect(new Set());
    setFilled({});
    setHasWon(false);
    setManualInput("");
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    processSpokenWords([manualInput.trim()]);
    setManualInput("");
  };

  const currentBlankId =
    cursor < wordTokens.length && wordTokens[cursor].isBlank ? wordTokens[cursor].id : null;

  return (
    <div className="rounded-[2.5rem] border border-hairline glass-card p-6 md:p-8 space-y-6 ambient-shadow cyber-glow">
      <div className="flex items-center justify-between border-b border-hairline/60 pb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
          <span className="font-bold uppercase tracking-wider text-content-faint">
            Interactive Cloze Reading · StitchApp Engine
          </span>
        </div>
        <span className="text-brand-600 font-bold">
          {tokens.filter((t) => t.isBlank && correct.has(t.id)).length} /{" "}
          {tokens.filter((t) => t.isBlank).length} Blanks Filled
        </span>
      </div>

      {/* Interactive Tokenized Document View */}
      <div className="p-6 md:p-8 rounded-[2rem] bg-surface-sunk/80 border border-hairline leading-[2.2] text-lg text-content select-none">
        {tokens.map((token) => {
          if (!token.isWord) {
            return <span key={token.id}>{token.text}</span>;
          }

          if (token.isBlank) {
            const isCorr = correct.has(token.id);
            const isCur = token.id === currentBlankId;
            const answer = filled[token.id] || "";

            return (
              <span
                key={token.id}
                onClick={() => {
                  if (!isCorr) {
                    const idx = wordTokens.findIndex((w) => w.id === token.id);
                    if (idx !== -1) setCursor(idx);
                  }
                }}
                className={`
                  inline-flex items-center justify-center mx-1 px-3 py-0.5 rounded-xl
                  border-b-2 font-bold min-w-[4rem] text-center transition-all duration-300 cursor-pointer
                  ${
                    isCorr
                      ? "border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 scale-105 shadow-sm"
                      : isCur
                      ? "border-brand-500 text-brand-600 bg-brand-500/15 animate-pulse shadow-md"
                      : "border-hairline text-content-muted bg-surface hover:border-brand-300"
                  }
                `}
              >
                {isCorr ? (
                  <span className="flex items-center gap-1">
                    {answer} <CheckCircle2 size={15} className="text-emerald-500 inline" />
                  </span>
                ) : isCur ? (
                  <span className="min-w-[2.5rem] text-brand-500 font-extrabold">___?___</span>
                ) : (
                  <span className="opacity-40">{"_".repeat(Math.max(4, token.text.length))}</span>
                )}
              </span>
            );
          }

          const tokenWordIdx = wordTokens.findIndex((w) => w.id === token.id);
          const isPassed = tokenWordIdx < cursor;
          return (
            <span
              key={token.id}
              className={`transition-opacity duration-200 ${isPassed ? "opacity-50 font-normal" : "opacity-100 font-medium"}`}
            >
              {token.text}
            </span>
          );
        })}
      </div>

      {hasWon && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-center text-emerald-700 dark:text-emerald-300 font-bold text-base animate-bounce flex items-center justify-center gap-2">
          <Sparkles className="size-5" /> 🎉 Excellent! All blanks filled correctly!
        </div>
      )}

      {/* Voice Dictation & Quick-Type Controls from StitchApp */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={toggleListening}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all flex-1 sm:flex-initial squishy-btn ${
              isListening
                ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(52,211,153,0.5)] animate-pulse"
                : "bg-brand-600 text-white hover:bg-brand-700 shadow-sm"
            }`}
          >
            {isListening ? <Mic size={18} className="animate-pulse" /> : <MicOff size={18} />}
            <span>{isListening ? "Reading… keep speaking!" : "Read Aloud (Voice Mic)"}</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            title="Restart from beginning"
            className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-xs font-bold border border-hairline bg-surface hover:bg-surface-sunk text-content transition-colors squishy-btn"
          >
            <RotateCcw size={15} /> Restart
          </button>
        </div>

        <form onSubmit={handleManualSubmit} className="flex gap-2 w-full sm:w-72">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Or type highlighted word..."
            className="flex-1 rounded-xl border border-hairline bg-surface px-3 py-2 text-xs focus:outline-none focus:border-brand-500"
          />
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-surface-sunk border border-hairline hover:bg-surface text-content squishy-btn"
          >
            Fill
          </button>
        </form>
      </div>
    </div>
  );
}
