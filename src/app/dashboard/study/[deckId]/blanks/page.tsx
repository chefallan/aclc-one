"use client";

import React, { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowLeft, RotateCcw, FileText } from "lucide-react";
import { parseBlanks, TextToken } from "@/lib/study/parseBlanks";
import { FillInTheBlanksUI } from "@/components/study/stitch/FillInTheBlanksUI";
import { PastePopup } from "@/components/study/stitch/PastePopup";
import { Card, Deck } from "@/lib/study/types";

export default function BlanksPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const resolvedParams = use(params);
  const deckId = resolvedParams.deckId;
  const router = useRouter();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [tokens, setTokens] = useState<TextToken[]>([]);
  const [activeTitle, setActiveTitle] = useState("Fill-in-the-Blanks Session");
  const [isPastePopupOpen, setPastePopupOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const activeDeckRaw = localStorage.getItem("active_deck");
      const activeCardsRaw = localStorage.getItem("active_cards");

      if (activeDeckRaw) {
        const parsedDeck = JSON.parse(activeDeckRaw);
        setDeck(parsedDeck);
      }

      if (activeCardsRaw) {
        const parsedCards: Card[] = JSON.parse(activeCardsRaw);
        if (parsedCards.length > 0) {
          // Combine card questions and answers into a rich study text
          const combinedText = parsedCards
            .map((c) => `${c.front}: ${c.back || c.id_answer || ""}. ${c.explanation || ""}`)
            .join("\n\n");
          const parsedTokens = parseBlanks(combinedText, 0.25);
          setTokens(parsedTokens);
          setActiveTitle(parsedCards[0]?.chapter || "Deck Smart Blanks");
        }
      } else {
        // Default demo text
        const sampleText =
          "Virtual Memory creates the illusion of a very large main memory for user programs. Paging is a memory management scheme where secondary storage is divided into fixed-size blocks called page frames. The Operating System uses a Page Table to translate virtual addresses into physical memory addresses.";
        setTokens(parseBlanks(sampleText, 0.25));
        setActiveTitle("Virtual Memory & Paging Blanks");
      }
    } catch (err) {
      console.warn("Error loading blanks data:", err);
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  const handleCustomSubmit = (title: string, text: string) => {
    setPastePopupOpen(false);
    const parsedTokens = parseBlanks(text, 0.25);
    setTokens(parsedTokens);
    setActiveTitle(title);
  };

  const handleReset = () => {
    if (tokens.length > 0) {
      // Re-parse to get fresh randomized blanks
      const originalText = tokens.map((t) => t.text).join("");
      setTokens(parseBlanks(originalText, 0.25));
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-[#eef0f6] flex flex-col">
      {/* Top Header */}
      <div className="sticky top-0 z-40 bg-[#12151c]/90 border-b border-white/10 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/study/${deckId}`)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-[#eef0f6]">
              {deck ? `${deck.title} — Fill in Blanks` : "Fill in the Blanks"}
            </h1>
            <p className="text-xs text-[#5e6880]">Compromise NLP Smart Cloze Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPastePopupOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-md"
          >
            <Plus size={15} />
            <span>Paste Notes</span>
          </button>
        </div>
      </div>

      {/* Main Blanks Arena */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="size-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            <p className="text-xs text-slate-400">Extracting prime entities and nouns...</p>
          </div>
        ) : tokens.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl border border-white/10 bg-[#12151c] text-center max-w-md mx-auto flex flex-col items-center gap-3">
            <FileText size={36} className="text-brand-400" />
            <h2 className="text-lg font-bold text-[#eef0f6]">No Blanks Generated</h2>
            <p className="text-xs text-[#9ba3b8]">
              Paste custom notes or lecture text to generate smart fill-in-the-blanks.
            </p>
            <button
              onClick={() => setPastePopupOpen(true)}
              className="mt-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium shadow-md"
            >
              Paste Notes
            </button>
          </div>
        ) : (
          <FillInTheBlanksUI
            tokens={tokens}
            documentTitle={activeTitle}
            onReset={handleReset}
          />
        )}
      </div>

      <PastePopup
        isOpen={isPastePopupOpen}
        onClose={() => setPastePopupOpen(false)}
        onSubmit={handleCustomSubmit}
      />
    </div>
  );
}
