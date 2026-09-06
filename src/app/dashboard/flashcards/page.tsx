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
  Shuffle,
  TableProperties,
  UploadCloud,
  ImageIcon,
} from "lucide-react";
import { AiFlashcardModal } from "@/components/study/AiFlashcardModal";
import { DocumentUploadModal } from "@/components/study/DocumentUploadModal";
import { FlashcardListView } from "@/components/study/FlashcardListView";
import { DeckImageGallery } from "@/components/study/DeckImageGallery";
import { PublishDeckModal } from "@/components/study/PublishDeckModal";
import { MathFormattedText } from "@/components/study/MathFormattedText";
import { parseCSVFile } from "@/lib/study/csvParser";
import { buildMCQuestion } from "@/lib/study/distractorEngine";
import { checkIdentificationAnswer } from "@/lib/study/answerChecker";
import type { Deck, Card as FlashcardItem, QuizMode } from "@/lib/study/types";

export default function FlashcardsPage() {
  const [deck, setDeck] = React.useState<Deck | null>(null);
  const [cards, setCards] = React.useState<FlashcardItem[]>([]);
  const [displayCards, setDisplayCards] = React.useState<FlashcardItem[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isFlipped, setIsFlipped] = React.useState(false);
  const [mode, setMode] = React.useState<QuizMode>("flashcard");
  const [aiModalOpen, setAiModalOpen] = React.useState(false);
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);
  const [publishModalOpen, setPublishModalOpen] = React.useState(false);
  const [pastedCSV, setPastedCSV] = React.useState("");
  const [csvImportOpen, setCsvImportOpen] = React.useState(false);
  const [isShuffled, setIsShuffled] = React.useState(false);
  const [isListView, setIsListView] = React.useState(false);

  // Quiz state
  const [selectedMCOption, setSelectedMCOption] = React.useState<number | null>(null);
  const [tfAnswer, setTfAnswer] = React.useState<boolean | null>(null);
  const [idInput, setIdInput] = React.useState("");
  const [idSubmitted, setIdSubmitted] = React.useState(false);
  const [idResult, setIdResult] = React.useState<{ isCorrect: boolean; matchedVariant: string | null } | null>(null);
  const [score, setScore] = React.useState({ correct: 0, total: 0 });

  // Default demo deck for instant play/testing
  React.useEffect(() => {
    const demoCards: FlashcardItem[] = [
      {
        id: "1",
        deckId: "demo-deck",
        type: "definition",
        front: "What is an Operating System Kernel?",
        back: "The central core component of an operating system that manages system resources and hardware communication.",
        explanation: "Runs in privileged kernel mode and controls CPU, memory, and devices.",
        tags: ["OS", "Kernel"],
        displayOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        deckId: "demo-deck",
        type: "multiple_choice",
        front: "Which layer of the OSI model does the TCP protocol operate at?",
        back: "Transport Layer",
        mc_distractor_1: "Network Layer",
        mc_distractor_2: "Data Link Layer",
        mc_distractor_3: "Application Layer",
        explanation: "Layer 4 (Transport) is responsible for host-to-host flow control and reliability.",
        tags: ["Networking", "OSI"],
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "3",
        deckId: "demo-deck",
        type: "true_false",
        front: "Virtual memory allows the execution of processes that are not completely in memory.",
        back: "True",
        tf_correct: "True",
        explanation: "Virtual memory maps virtual addresses to physical memory or secondary storage.",
        tags: ["OS", "Memory"],
        displayOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "4",
        deckId: "demo-deck",
        type: "identification",
        front: "The mathematical formula for calculating standard deviation from variance \u03c3\u00b2 is \u221a\u03c3\u00b2.",
        back: "Standard Deviation",
        id_answer: "Standard Deviation",
        id_acceptable_variants: "std dev, sigma, standard dev",
        explanation: "Standard deviation represents the square root of variance.",
        tags: ["Math", "Statistics"],
        displayOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const demoDeck: Deck = {
      id: "demo-deck",
      userId: "demo-user",
      title: "Computer Science & Operating Systems",
      description: "Sample study deck with definition, multiple choice, true/false, and identification cards.",
      subject: "Computer Science",
      visibility: "PUBLIC",
      isPublished: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setDeck(demoDeck);
    setCards(demoCards);
    setDisplayCards(demoCards);
  }, []);

  function toggleShuffle() {
    if (!isShuffled) {
      const shuffled = [...cards].sort(() => Math.random() - 0.5);
      setDisplayCards(shuffled);
      setIsShuffled(true);
      setCurrentIndex(0);
    } else {
      setDisplayCards(cards);
      setIsShuffled(false);
      setCurrentIndex(0);
    }
  }

  function handleImportCSV(e: React.FormEvent) {
    e.preventDefault();
    if (!pastedCSV.trim()) return;
    try {
      const parsedCards = parseCSVFile(pastedCSV);
      if (parsedCards.length > 0) {
        setCards(parsedCards);
        setDisplayCards(parsedCards);
        setCurrentIndex(0);
        setIsFlipped(false);
        setCsvImportOpen(false);
        setPastedCSV("");
      }
    } catch (err) {
      alert("Failed to parse CSV. Please check formatting.");
    }
  }

  const currentCard = displayCards[currentIndex] || displayCards[0];

  function nextCard() {
    setIsFlipped(false);
    setSelectedMCOption(null);
    setTfAnswer(null);
    setIdInput("");
    setIdSubmitted(false);
    setIdResult(null);
    if (currentIndex < displayCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  }

  function prevCard() {
    setIsFlipped(false);
    setSelectedMCOption(null);
    setTfAnswer(null);
    setIdInput("");
    setIdSubmitted(false);
    setIdResult(null);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(displayCards.length - 1);
    }
  }

  function handleIdentificationCheck(e: React.FormEvent) {
    e.preventDefault();
    if (idSubmitted || !currentCard || !idInput.trim()) return;
    const variants = currentCard.id_acceptable_variants
      ? currentCard.id_acceptable_variants.split(",").map((s) => s.trim())
      : [];
    const res = checkIdentificationAnswer(idInput, currentCard.back || currentCard.id_answer || "", variants);
    setIdResult(res);
    setIdSubmitted(true);
    setScore((prev) => ({
      correct: prev.correct + (res.isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-6xl mx-auto">
      {/* Navigation & Header */}
      <div className="space-y-4">
        <StudyTabs activeTab="create" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
              <Sparkles className="size-6 text-indigo-400" />
              Create Flashcards & Study Hub
            </h1>
            <p className="text-xs text-slate-400">
              Generate AI flashcards from lesson notes, transcribe documents, or study with active recall.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => setUploadModalOpen(true)}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border-indigo-500/30"
            >
              <UploadCloud className="size-4" />
              Transcribe Document
            </Button>
            <Button
              onClick={() => setAiModalOpen(true)}
              size="sm"
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              <Sparkles className="size-4" />
              AI Flashcards Generator
            </Button>
            <Button
              onClick={() => setCsvImportOpen(!csvImportOpen)}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
            >
              <Upload className="size-4" />
              Import CSV
            </Button>
            <Button
              onClick={() => setPublishModalOpen(true)}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
            >
              <Share2 className="size-4" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* CSV Import Drawer */}
      {csvImportOpen && (
        <form
          onSubmit={handleImportCSV}
          className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">Paste 15-Column Claude CSV Content</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCsvImportOpen(false)}
              className="size-6 p-0"
            >
              <X className="size-4" />
            </Button>
          </div>
          <textarea
            value={pastedCSV}
            onChange={(e) => setPastedCSV(e.target.value)}
            placeholder="deck_title,card_type,front,back,explanation,tags,mc_distractor_1,mc_distractor_2,mc_distractor_3,tf_correct,id_answer,id_acceptable_variants,enum_items,notes_content,image_keywords..."
            rows={4}
            className="w-full p-3 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setCsvImportOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-500">
              Load Flashcards
            </Button>
          </div>
        </form>
      )}

      {/* View Switcher Bar */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={!isListView ? "default" : "outline"}
            onClick={() => setIsListView(false)}
            className="text-xs gap-1.5"
          >
            <Layers className="size-4" /> Flip Cards
          </Button>
          <Button
            size="sm"
            variant={isListView ? "default" : "outline"}
            onClick={() => setIsListView(true)}
            className="text-xs gap-1.5"
          >
            <TableProperties className="size-4" /> List View
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={toggleShuffle}
            className={`text-xs gap-1.5 ${isShuffled ? "border-purple-500 text-purple-300 bg-purple-500/10" : ""}`}
          >
            <Shuffle className="size-4" /> {isShuffled ? "Shuffled" : "Shuffle"}
          </Button>
          <Badge variant="secondary" className="text-xs font-mono">
            {displayCards.length} Flashcards
          </Badge>
        </div>
      </div>

      {/* Main Content Area */}
      {isListView ? (
        <FlashcardListView
          cards={displayCards}
          onCardDelete={(id) => {
            setCards((prev) => prev.filter((c) => c.id !== id));
            setDisplayCards((prev) => prev.filter((c) => c.id !== id));
          }}
          onBulkDelete={(ids) => {
            const idSet = new Set(ids);
            setCards((prev) => prev.filter((c) => !idSet.has(c.id)));
            setDisplayCards((prev) => prev.filter((c) => !idSet.has(c.id)));
          }}
        />
      ) : (
        currentCard && (
          <div className="space-y-6">
            {/* Flashcard Flip Card */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="min-h-[260px] p-8 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 hover:border-indigo-500/40 transition-all cursor-pointer flex flex-col justify-between shadow-xl"
            >
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs font-mono uppercase bg-white/5 text-slate-300">
                  {currentCard.type || "Definition"}
                </Badge>
                <span className="text-xs text-slate-500 font-mono">
                  Card {currentIndex + 1} of {displayCards.length}
                </span>
              </div>

              <div className="py-6 text-center">
                {!isFlipped ? (
                  <div className="text-lg md:text-xl font-medium text-slate-100">
                    <MathFormattedText text={currentCard.front} />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-lg md:text-xl font-semibold text-indigo-300">
                      <MathFormattedText text={currentCard.back || currentCard.id_answer || currentCard.tf_correct || ""} />
                    </div>
                    {currentCard.explanation && (
                      <p className="text-xs text-slate-400 max-w-lg mx-auto">
                        💡 {currentCard.explanation}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="text-center text-[11px] text-slate-500">
                Click anywhere to flip card
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between">
              <Button onClick={prevCard} variant="outline" size="sm" className="gap-1 text-xs">
                <ArrowLeft className="size-4" /> Previous
              </Button>
              <Button onClick={nextCard} size="sm" className="gap-1 text-xs bg-indigo-600 hover:bg-indigo-500">
                Next <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )
      )}

      {/* AI Generator Modal */}
      <AiFlashcardModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onCardsGenerated={(newCards, newDeck) => {
          setCards(newCards);
          setDisplayCards(newCards);
          setDeck(newDeck);
          setCurrentIndex(0);
          setIsFlipped(false);
        }}
      />

      {/* Document Transcriber Modal */}
      <DocumentUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onTranscriptionComplete={(text, images) => {
          console.log("Transcribed text:", text.slice(0, 100), "Images:", images.length);
        }}
      />

      {/* Share / Publish Modal */}
      <PublishDeckModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        deck={deck}
        content={cards.map((c) => `• ${c.front}: ${c.back || c.id_answer || ""}`).join("\n")}
      />
    </div>
  );
}
