"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, RotateCcw, Sparkles, CheckCircle2, ChevronRight, FileText } from "lucide-react";
import { TextToken } from "@/lib/study/parseBlanks";
import { areMathExpressionsEquivalent } from "@/lib/study/mathEvaluator";
import confetti from "canvas-confetti";

interface FillInTheBlanksUIProps {
  tokens: TextToken[];
  onReset: () => void;
  documentTitle?: string;
}

// Simple fuzzy match: normalize and check similarity
function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function isMatch(spoken: string, expected: string): boolean {
  if (areMathExpressionsEquivalent(spoken, expected)) return true;

  const a = normalize(spoken);
  const b = normalize(expected);
  if (!a || !b) return false;
  if (a === b) return true;
  // Allow 1-char edit distance for short words, 2 for longer
  const maxDist = b.length <= 5 ? 1 : 2;
  return levenshtein(a, b) <= maxDist;
}

export function FillInTheBlanksUI({
  tokens,
  onReset,
  documentTitle = "Fill-in-the-Blanks Session",
}: FillInTheBlanksUIProps) {
  const wordTokens = tokens.filter((t) => t.isWord);
  const blankTokens = tokens.filter((t) => t.isBlank);

  const [cursor, setCursor] = useState(0);
  const [correct, setCorrect] = useState<Set<string>>(new Set());
  const [filled, setFilled] = useState<Record<string, string>>({});
  const [activeInputText, setActiveInputText] = useState("");
  const [hasWon, setHasWon] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<any>(null);
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;
  const correctRef = useRef(correct);
  correctRef.current = correct;
  const filledRef = useRef(filled);
  filledRef.current = filled;

  const skipNonBlanks = useCallback(
    (from: number): number => {
      let i = from;
      while (i < wordTokens.length && !wordTokens[i].isBlank) i++;
      return i;
    },
    [wordTokens]
  );

  useEffect(() => {
    setCursor(skipNonBlanks(0));
  }, [tokens, skipNonBlanks]);

  const processWords = useCallback(
    (spokenWords: string[]) => {
      let cur = cursorRef.current;
      const newCorrect = new Set(correctRef.current);
      const newFilled = { ...filledRef.current };

      for (const word of spokenWords) {
        if (cur >= wordTokens.length) break;
        const expected = wordTokens[cur];

        if (expected.isBlank) {
          if (isMatch(word, expected.text)) {
            newCorrect.add(expected.id);
            newFilled[expected.id] = expected.text;
            cur++;
            cur = skipNonBlanks(cur);
          }
        } else {
          if (isMatch(word, expected.text)) {
            cur++;
            cur = skipNonBlanks(cur) <= wordTokens.length ? skipNonBlanks(cur) : cur;
          }
        }
      }

      setCorrect(newCorrect);
      setFilled(newFilled);
      setCursor(cur);

      if (
        blankTokens.length > 0 &&
        blankTokens.every((t) => newCorrect.has(t.id)) &&
        !hasWon
      ) {
        setHasWon(true);
        try {
          confetti({ particleCount: 180, spread: 80, origin: { y: 0.6 } });
        } catch (_) {}
      }
    },
    [wordTokens, blankTokens, skipNonBlanks, hasWon]
  );

  const startListening = useCallback(() => {
    const SR =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;
    if (!SR) return;

    try {
      const r = new SR();
      r.continuous = true;
      r.interimResults = true;
      r.lang = "en-US";

      r.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const words = event.results[i][0].transcript.trim().split(/\s+/);
            processWords(words);
          }
        }
      };

      r.onerror = () => setIsListening(false);
      r.onend = () => setIsListening(false);
      recognitionRef.current = r;
      r.start();
      setIsListening(true);
    } catch (_) {
      setIsListening(false);
    }
  }, [processWords]);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch (_) {}
    setIsListening(false);
  }, []);

  const toggleListening = () => {
    if (isListening) stopListening();
    else startListening();
  };

  // Handle typed answer submission on the current active blank
  const handleTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInputText.trim() || cursor >= wordTokens.length) return;

    const currentToken = wordTokens[cursor];
    if (currentToken && currentToken.isBlank) {
      if (isMatch(activeInputText.trim(), currentToken.text)) {
        const newCorrect = new Set(correct);
        newCorrect.add(currentToken.id);
        const newFilled = { ...filled, [currentToken.id]: currentToken.text };
        setCorrect(newCorrect);
        setFilled(newFilled);
        setActiveInputText("");

        let nextCur = cursor + 1;
        nextCur = skipNonBlanks(nextCur);
        setCursor(nextCur);

        if (blankTokens.every((t) => newCorrect.has(t.id)) && !hasWon) {
          setHasWon(true);
          try {
            confetti({ particleCount: 180, spread: 80, origin: { y: 0.6 } });
          } catch (_) {}
        }
      } else {
        // Wrong answer visual feedback
        setActiveInputText("");
      }
    }
  };

  const progressPercent =
    blankTokens.length > 0 ? Math.round((correct.size / blankTokens.length) * 100) : 100;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 p-4 sm:p-6 select-none animate-in fade-in">
      {/* Header Info & Progress Bar */}
      <div className="glass-panel p-5 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#12151c]/90 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
            <FileText size={22} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#eef0f6]">{documentTitle}</h2>
            <p className="text-xs text-[#5e6880]">
              {correct.size} of {blankTokens.length} blanks completed ({progressPercent}%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Progress Pill */}
          <div className="flex-1 sm:w-44 h-3 rounded-full bg-[#1a1e28] overflow-hidden border border-white/5 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-600 to-[#34d399] transition-all duration-300 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <button
            type="button"
            onClick={onReset}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
            title="Reset Blanks"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Main Cloze Paragraph Interactive Surface */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#12151c]/95 shadow-2xl leading-loose text-base sm:text-lg text-[#eef0f6]">
        <div className="flex flex-wrap items-center gap-y-3 gap-x-1.5 leading-relaxed">
          {tokens.map((token, i) => {
            if (!token.isWord) {
              return (
                <span key={token.id} className="text-[#9ba3b8] whitespace-pre-wrap">
                  {token.text}
                </span>
              );
            }

            const isBlank = token.isBlank;
            const isCorrect = correct.has(token.id);
            const isCurrentTarget = wordTokens[cursor]?.id === token.id;

            if (!isBlank) {
              return (
                <span key={token.id} className="text-[#eef0f6] font-normal">
                  {token.text}
                </span>
              );
            }

            return (
              <span
                key={token.id}
                className={`inline-flex items-center justify-center px-3 py-0.5 rounded-lg font-mono font-semibold transition-all duration-200 border text-sm sm:text-base ${
                  isCorrect
                    ? "bg-[#34d399]/15 text-[#34d399] border-[#34d399]/40 shadow-[0_0_10px_rgba(52,211,153,0.2)]"
                    : isCurrentTarget
                    ? "bg-brand-500/20 text-brand-300 border-brand-500 shadow-[0_0_15px_rgba(99,102,241,0.4)] animate-pulse"
                    : "bg-[#1a1e28] text-transparent border-dashed border-white/20 min-w-[3.5rem] selection:bg-none"
                }`}
              >
                {isCorrect ? filled[token.id] || token.text : isCurrentTarget ? "???" : "____"}
              </span>
            );
          })}
        </div>
      </div>

      {/* Interactive Input Bar & Voice Controls */}
      {!hasWon ? (
        <form
          onSubmit={handleTypeSubmit}
          className="glass-panel p-4 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#12151c]/90 shadow-xl flex items-center gap-3"
        >
          <input
            type="text"
            value={activeInputText}
            onChange={(e) => setActiveInputText(e.target.value)}
            placeholder={`Type answer for current blank [${wordTokens[cursor]?.text?.length || 4} letters] or click mic...`}
            className="flex-1 bg-[#1a1e28] border border-white/10 rounded-xl px-4 py-3 text-base text-[#eef0f6] focus:outline-none focus:border-brand-500 transition-colors shadow-inner"
          />

          <button
            type="button"
            onClick={toggleListening}
            className={`p-3.5 rounded-xl transition-all duration-300 shadow-md ${
              isListening
                ? "bg-[#34d399] text-[#0a0c10] shadow-[0_0_20px_rgba(52,211,153,0.7)] animate-pulse"
                : "bg-[#1a1e28] text-[#eef0f6] hover:bg-[#222733] border border-white/10"
            }`}
            title={isListening ? "Listening... click to stop" : "Speak answer"}
          >
            {isListening ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          <button
            type="submit"
            disabled={!activeInputText.trim()}
            className="px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:pointer-events-none text-white font-medium flex items-center gap-1.5 transition-all shadow-md"
          >
            <span>Submit</span>
            <ChevronRight size={16} />
          </button>
        </form>
      ) : (
        <div className="glass-panel p-6 rounded-2xl border border-[#34d399]/30 bg-[#34d399]/10 shadow-2xl flex flex-col items-center text-center gap-3 animate-in zoom-in-95">
          <div className="p-3 rounded-full bg-[#34d399]/20 text-[#34d399]">
            <CheckCircle2 size={36} />
          </div>
          <h3 className="text-xl font-bold text-[#eef0f6]">Complete! All Blanks Mastered</h3>
          <p className="text-sm text-[#9ba3b8] max-w-md">
            You successfully recalled all prime entities and concepts in this document.
          </p>
          <button
            type="button"
            onClick={onReset}
            className="mt-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium shadow-lg transition-all"
          >
            Practice Again
          </button>
        </div>
      )}
    </div>
  );
}
