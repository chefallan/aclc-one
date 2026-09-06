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
  Shuffle,
  ImageIcon,
  TableProperties,
  UploadCloud,
  Copy,
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
import { DeckImageGallery } from "@/components/study/DeckImageGallery";
import { FlashcardListView } from "@/components/study/FlashcardListView";
import { DocumentUploadModal } from "@/components/study/DocumentUploadModal";
import { parseCSVFile } from "@/lib/study/csvParser";
import { buildMCQuestion } from "@/lib/study/distractorEngine";
import { checkIdentificationAnswer } from "@/lib/study/answerChecker";
import type { Deck, Card } from "@/lib/study/types";

type StudyMode =
  | null
  | "flashcards"
  | "list_view"
  | "multiple_choice"
  | "true_false"
  | "enumeration"
  | "identification"
  | "blanks"
  | "notes"
  | "gallery"
  | "stats";

export default function StudyDashboard() {
  const params = useParams();
  const router = useRouter();
  const deckId = params?.deckId as string;

  const [deck, setDeck] = React.useState<Deck | null>(null);
  const [cards, setCards] = React.useState<Card[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeMode, setActiveMode] = React.useState<StudyMode>(null);
  const switchMode = (mode: StudyMode) => {
    setCardIndex(0);
    setIsFlipped(false);
    setSelectedMCOption(null);
    setTfAnswer(null);
    setIdInput("");
    setIdSubmitted(false);
    setEnumInputs({});
    setEnumSubmitted(false);
    setActiveMode(mode);
  };


  // In-place study state
  const [cardIndex, setCardIndex] = React.useState(0);
  const [isFlipped, setIsFlipped] = React.useState(false);
  const [selectedMCOption, setSelectedMCOption] = React.useState<number | null>(null);
  const [mcOptionStates, setMcOptionStates] = React.useState<MCOptionState[]>(["default", "default", "default", "default"]);
  const [tfAnswer, setTfAnswer] = React.useState<boolean | null>(null);
  const [idInput, setIdInput] = React.useState("");
  const [idSubmitted, setIdSubmitted] = React.useState(false);
  const [enumInputs, setEnumInputs] = React.useState<Record<number, string>>({});
  const [enumSubmitted, setEnumSubmitted] = React.useState(false);
  const [idResult, setIdResult] = React.useState<{ isCorrect: boolean; matchedVariant: string | null } | null>(null);
  const [enumRevealed, setEnumRevealed] = React.useState(false);
  const [score, setScore] = React.useState({ correct: 0, wrong: 0, total: 0 });

  // Shuffle & Recall Features
  const [isShuffled, setIsShuffled] = React.useState(false);
  const [displayCards, setDisplayCards] = React.useState<Card[]>([]);
  const [hideBold, setHideBold] = React.useState(false);
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);

  // Notes view state
  const [noteSearch, setNoteSearch] = React.useState("");

  // Publish / Share modal state
  const [publishModalOpen, setPublishModalOpen] = React.useState(false);

  // Initial load
  React.useEffect(() => {
    let mounted = true;
    async function loadDeck() {
      // 1. Check if active_deck is stored in localStorage with integrity validation
      try {
        const cachedDeck = localStorage.getItem("active_deck");
        const cachedCards = localStorage.getItem("active_cards");
        if (cachedDeck && cachedCards && deckId !== "pub-deck-cats") {
          const parsedDeck = JSON.parse(cachedDeck);
          const parsedCards = JSON.parse(cachedCards);
          // Verify cards are not corrupted (e.g. front is not the deck title)
          const isCorrupted = Array.isArray(parsedCards) && parsedCards.some(
            (c: any) => c.front === parsedDeck.title || c.chapter === c.front
          );
          if (parsedDeck.id === deckId && !isCorrupted) {
            if (mounted) {
              setDeck(parsedDeck);
              setCards(parsedCards);
              setDisplayCards(parsedCards);
              setLoading(false);
              return;
            }
          } else if (isCorrupted) {
            localStorage.removeItem("active_deck");
            localStorage.removeItem("active_cards");
          }
        }
      } catch (e) {
        // ignore localStorage error
      }

      // 2. Direct resolution for What Are Cats by Lawrence
      if (deckId === "pub-deck-cats") {
        if (mounted) {
          const catsDeck: Deck = {
            id: "pub-deck-cats",
            userId: "lawrence-user",
            title: "What Are Cats by Lawrence",
            description: "Felis catus taxonomy, ancestry, anatomy, obligate carnivore diet, and sensory navigation.",
            subject: "BSIT",
            visibility: "PUBLIC",
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const catsCards: Card[] = [
            {
              id: "cats-1",
              deckId: "pub-deck-cats",
              type: "definition",
              chapter: "Taxonomy",
              subject: "Biology",
              lesson: "Lesson 1",
              front: "What is a Cat (Felis catus)?",
              back: "A small, carnivorous mammal belonging to the family Felidae, known for agility, retractable claws, and keen senses.",
              explanation: "Domestic cats are the only domesticated species in the family Felidae.",
              tags: ["Biology", "Cats", "Mammals"],
              displayOrder: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: "cats-2",
              deckId: "pub-deck-cats",
              type: "true_false",
              chapter: "Metabolism",
              subject: "Biology",
              lesson: "Lesson 2",
              front: "Cats are obligate carnivores, meaning their bodies require nutrients only found in animal meat.",
              back: "True",
              tf_correct: "True",
              explanation: "Cats cannot synthesize certain essential nutrients like taurine without meat.",
              tags: ["Biology", "Diet"],
              displayOrder: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: "cats-3",
              deckId: "pub-deck-cats",
              type: "multiple_choice",
              chapter: "Sensory Organs",
              subject: "Biology",
              lesson: "Lesson 3",
              front: "Which sensory organ in cats enables them to detect vibrations and navigate in the dark?",
              back: "Whiskers (Vibrissae)",
              mc_distractor_1: "Retractable Claws",
              mc_distractor_2: "Tapetum Lucidum",
              mc_distractor_3: "Jacobson's Organ",
              explanation: "Whiskers are deeply embedded and connected to the nervous system.",
              tags: ["Anatomy", "Senses"],
              displayOrder: 2,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: "cats-4",
              deckId: "pub-deck-cats",
              type: "identification",
              chapter: "Vision",
              subject: "Biology",
              lesson: "Lesson 4",
              front: "The reflective layer of tissue behind a cat's retina that enhances night vision.",
              back: "Tapetum Lucidum",
              id_answer: "Tapetum Lucidum",
              id_acceptable_variants: "tapetum, tapetum lucidum, feline retina",
              explanation: "Tapetum Lucidum reflects light back through the retina, improving night vision.",
              tags: ["Anatomy", "Vision"],
              displayOrder: 3,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: "cats-5",
              deckId: "pub-deck-cats",
              type: "enumeration",
              chapter: "Communication",
              subject: "Biology",
              lesson: "Lesson 5",
              front: "List 4 primary communication methods used by cats.",
              back: "Purring; Meowing; Tail Posture; Scent Marking",
              enum_items: "Purring; Meowing; Tail Posture; Scent Marking",
              explanation: "Cats communicate using vocalizations, body language, and olfactory scent marks.",
              tags: ["Behavior", "Communication"],
              displayOrder: 4,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: "cats-6",
              deckId: "pub-deck-cats",
              type: "definition",
              chapter: "Skeletal Structure",
              subject: "Biology",
              lesson: "Lesson 6",
              front: "Feline Anatomy & Locomotion",
              back: "Cats have **flexible spines**, **retractable claws**, and **specialized clavicles** that allow them to squeeze through tight spaces and execute the righting reflex.",
              explanation: "Feline anatomy features highly flexible vertebrae and specialized footpads.",
              tags: ["Anatomy", "Locomotion"],
              displayOrder: 5,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ];

          setDeck(catsDeck);
          setCards(catsCards);
          setDisplayCards(catsCards);
          setLoading(false);
          return;
        }
      }

      // 3. Try fetching from API
      try {
        const res = await fetch(`/api/study/decks/${deckId}`);
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.deck) {
            setDeck(data.deck);
            setCards(data.cards || []);
            setDisplayCards(data.cards || []);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch deck from API, using demo fallback:", err);
      }

      // 4. Demo fallback deck if not found
      if (mounted) {
        const demoDeck: Deck = {
          id: deckId || "demo-deck-1",
          userId: "offline-user",
          title: "Operating Systems & Networking",
          description: "Virtual Memory, Paging, Page Replacement Algorithms & OSI Model Layers",
          subject: "Computer Science",
          visibility: "PUBLIC",
          isPublished: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const demoCards: Card[] = [
          {
            id: "c1",
            deckId: demoDeck.id,
            type: "definition",
            front: "What is Virtual Memory?",
            back: "A memory management capability that provides an 'idealized abstraction of the storage resources' that are actually available on a given machine which **creates the illusion of a very large main memory**.",
            explanation: "Combines active RAM with secondary disk storage to create contiguous address spaces.",
            tags: ["OS", "Memory"],
            displayOrder: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "c2",
            deckId: demoDeck.id,
            type: "true_false",
            front: "Paging is a memory management scheme that eliminates the need for contiguous allocation of physical memory.",
            back: "True",
            tf_correct: "True",
            explanation: "Paging breaks physical memory into fixed-size blocks called frames and logical memory into pages.",
            tags: ["OS", "Paging"],
            displayOrder: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "c3",
            deckId: demoDeck.id,
            type: "multiple_choice",
            front: "Which page replacement algorithm suffers from Belady's Anomaly?",
            back: "FIFO (First In First Out)",
            mc_distractor_1: "LRU (Least Recently Used)",
            mc_distractor_2: "Optimal Algorithm",
            mc_distractor_3: "LFU (Least Frequently Used)",
            explanation: "In FIFO, increasing the number of page frames can unexpectedly increase page faults.",
            tags: ["OS", "Algorithms"],
            displayOrder: 2,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "c4",
            deckId: demoDeck.id,
            type: "identification",
            front: "The layer of the OSI model responsible for end-to-end communication, flow control, and error recovery (e.g., TCP and UDP).",
            back: "Transport Layer",
            id_answer: "Transport Layer",
            id_acceptable_variants: "Layer 4, Transport, OSI Transport Layer",
            explanation: "Transport Layer manages reliable data transmission between applications.",
            tags: ["Networking", "OSI"],
            displayOrder: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "c5",
            deckId: demoDeck.id,
            type: "enumeration",
            front: "List the 7 layers of the OSI Model from Layer 7 down to Layer 1.",
            back: "Application Layer; Presentation Layer; Session Layer; Transport Layer; Network Layer; Data Link Layer; Physical Layer",
            enum_items: "Application Layer; Presentation Layer; Session Layer; Transport Layer; Network Layer; Data Link Layer; Physical Layer",
            explanation: "Mnemonic: All People Seem To Need Data Processing",
            tags: ["Networking", "OSI"],
            displayOrder: 4,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        setDeck(demoDeck);
        setCards(demoCards);
        setDisplayCards(demoCards);
        setLoading(false);
      }
    }

    loadDeck();
    return () => {
      mounted = false;
    };
  }, [deckId]);

  // Shuffle toggle logic
  function toggleShuffle() {
    if (!isShuffled) {
      const shuffled = [...cards].sort(() => Math.random() - 0.5);
      setDisplayCards(shuffled);
      setIsShuffled(true);
      setCardIndex(0);
    } else {
      setDisplayCards(cards);
      setIsShuffled(false);
      setCardIndex(0);
    }
  }

  // Filter cards by mode if applicable
  const currentCardList = React.useMemo(() => {
    if (!activeMode || activeMode === "flashcards" || activeMode === "list_view" || activeMode === "gallery" || activeMode === "notes" || activeMode === "stats") {
      return displayCards;
    }
    if (activeMode === "multiple_choice") {
      return displayCards.filter((c) => c.type === "multiple_choice" || Boolean(c.mc_distractor_1 || c.mc_distractor1));
    }
    if (activeMode === "true_false") {
      return displayCards.filter((c) => c.type === "true_false" || Boolean(c.tf_correct || c.tf_answer));
    }
    if (activeMode === "enumeration") {
      return displayCards.filter((c) => c.type === "enumeration" || Boolean(c.enum_items));
    }
    if (activeMode === "identification") {
      return displayCards.filter((c) => c.type === "identification" || Boolean(c.id_answer));
    }
    return displayCards;
  }, [displayCards, activeMode]);

  const safeCardIndex = currentCardList.length > 0 ? Math.min(Math.max(0, cardIndex), currentCardList.length - 1) : 0;
  const currentCard = currentCardList[safeCardIndex];

  // MC options setup
  const currentMCOptions = React.useMemo(() => {
    if (!currentCard) return [];
    return buildMCQuestion(currentCard, cards).options;
  }, [currentCard, cards]);

  function handleMCSelect(idx: number) {
    if (selectedMCOption !== null || !currentCard) return;
    setSelectedMCOption(idx);
    const selectedText = currentMCOptions[idx];
    const selectedStr = typeof selectedText === "string" ? selectedText : (selectedText as any)?.text || "";
    const isCorrect = selectedStr.trim().toLowerCase() === (currentCard.back || "").trim().toLowerCase();

    const newStates: MCOptionState[] = currentMCOptions.map((opt, i) => {
      const optText = typeof opt === "string" ? opt : (opt as any)?.text || "";
      if (optText.trim().toLowerCase() === (currentCard.back || "").trim().toLowerCase()) {
        return "correct";
      }
      if (i === idx && !isCorrect) {
        return "wrong";
      }
      return "default";
    });
    setMcOptionStates(newStates);
    setScore((prev) => ({
      ...prev,
      correct: prev.correct + (isCorrect ? 1 : 0),
      wrong: prev.wrong + (isCorrect ? 0 : 1),
      total: prev.total + 1,
    }));
  }

  function handleTFSelect(ans: boolean) {
    if (tfAnswer !== null || !currentCard) return;
    setTfAnswer(ans);
    const correctVal =
      currentCard.tf_correct?.toLowerCase() === "true" ||
      (currentCard.back || "").trim().toLowerCase() === "true";
    const isCorrect = ans === correctVal;
    setScore((prev) => ({
      ...prev,
      correct: prev.correct + (isCorrect ? 1 : 0),
      wrong: prev.wrong + (isCorrect ? 0 : 1),
      total: prev.total + 1,
    }));
  }

  function handleIDSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (idSubmitted || !currentCard || !idInput.trim()) return;
    const variants = currentCard.id_acceptable_variants
      ? currentCard.id_acceptable_variants.split(",").map((s) => s.trim())
      : [];
    const res = checkIdentificationAnswer(idInput, currentCard.back || currentCard.id_answer || "", variants);
    setIdResult(res);
    setIdSubmitted(true);
    setScore((prev) => ({
      ...prev,
      correct: prev.correct + (res.isCorrect ? 1 : 0),
      wrong: prev.wrong + (res.isCorrect ? 0 : 1),
      total: prev.total + 1,
    }));
  }

  function nextQuestion() {
    setIsFlipped(false);
    setSelectedMCOption(null);
    setMcOptionStates(["default", "default", "default", "default"]);
    setTfAnswer(null);
    setIdInput("");
    setIdSubmitted(false);
    setIdResult(null);
    setEnumRevealed(false);

    if (cardIndex < currentCardList.length - 1) {
      setCardIndex(cardIndex + 1);
    } else {
      setCardIndex(0);
    }
  }

  function prevQuestion() {
    setIsFlipped(false);
    setSelectedMCOption(null);
    setMcOptionStates(["default", "default", "default", "default"]);
    setTfAnswer(null);
    setIdInput("");
    setIdSubmitted(false);
    setIdResult(null);
    setEnumRevealed(false);

    if (cardIndex > 0) {
      setCardIndex(cardIndex - 1);
    } else {
      setCardIndex(currentCardList.length - 1);
    }
  }

  const modeTitle = React.useMemo(() => {
    switch (activeMode) {
      case "flashcards":
        return "Flashcards";
      case "list_view":
        return "List View";
      case "multiple_choice":
        return "Multiple Choice";
      case "true_false":
        return "True / False";
      case "enumeration":
        return "Enumeration";
      case "identification":
        return "Identification";
      case "blanks":
        return "Fill in Blanks";
      case "notes":
        return "Study Notes";
      case "gallery":
        return "Visual Image Gallery";
      case "stats":
        return "Stats & Mastery";
      default:
        return deck?.title || "Flashcards";
    }
  }, [activeMode, deck?.title]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0c10] text-[#eef0f6]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Loading flashcards and study engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#0a0c10] text-[#eef0f6] px-4 md:px-8 py-6 space-y-6"
      style={{
        backgroundImage: `
          radial-gradient(1200px 800px at 80% -10%, rgba(79, 142, 247, 0.08) 0%, transparent 60%),
          radial-gradient(1000px 700px at -10% 110%, rgba(129, 140, 248, 0.05) 0%, transparent 55%)
        `,
      }}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* StitchApp Glass TopBar - Single clean header & exit */}
        <TopBar
          title={activeMode ? `${deck?.title || "Deck"} · ${modeTitle}` : deck?.title || "Flashcards"}
          onBack={activeMode ? () => setActiveMode(null) : () => router.push("/dashboard/library")}
        />

        {/* ========================================================================= */}
        {/* 1. DECK HUB OVERVIEW (When activeMode === null)                            */}
        {/* ========================================================================= */}
        {!activeMode && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Action Bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {deck?.subject || "General"}
                </span>
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-white/5 text-slate-400 border border-white/10">
                  {cards.length} Cards
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-md"
                >
                  <UploadCloud size={14} /> Transcribe & Extract
                </button>
                <button
                  onClick={toggleShuffle}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
                    isShuffled
                      ? "bg-purple-600/20 text-purple-300 border-purple-500/40"
                      : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <Shuffle size={14} className={isShuffled ? "animate-pulse" : ""} />
                  {isShuffled ? "Shuffled" : "Shuffle"}
                </button>
                <button
                  onClick={() => setPublishModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-all"
                >
                  <Share2 size={14} /> Share
                </button>
              </div>
            </div>

            {/* Description Card */}
            {deck?.description && (
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
                <p className="text-sm text-slate-300 leading-relaxed">{deck.description}</p>
              </div>
            )}

            {/* Mode Counts Calculation */}
            {(() => {
              const mcCount = cards.filter((c) => c.type === "multiple_choice" || Boolean(c.mc_distractor_1 || c.mc_distractor1)).length;
              const tfCount = cards.filter((c) => c.type === "true_false" || Boolean(c.tf_correct || c.tf_answer)).length;
              const idCount = cards.filter((c) => c.type === "identification" || Boolean(c.id_answer)).length;
              const enumCount = cards.filter((c) => c.type === "enumeration" || Boolean(c.enum_items)).length;
              const notesCount = cards.filter((c) => c.type === "keyword" || c.type === "definition" || Boolean(c.back || c.explanation)).length;

              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  <ModeCard
                    title="Flashcards"
                    description="Interactive flip deck with neural voice TTS"
                    count={`${cards.length} Cards`}
                    icon={<Layers className="size-5 text-indigo-400" />}
                    onClick={() => switchMode("flashcards")}
                  />
                  <ModeCard
                    title="List View"
                    description="Browse & bulk manage all cards with answer recall"
                    count={`${cards.length} Cards`}
                    icon={<TableProperties className="size-5 text-purple-400" />}
                    onClick={() => switchMode("list_view")}
                  />
                  <ModeCard
                    title="Multiple Choice"
                    description="AI-generated 4-option smart distractor quiz"
                    count={`${mcCount} Questions`}
                    disabled={mcCount === 0}
                    icon={<ListChecks className="size-5 text-emerald-400" />}
                    onClick={mcCount > 0 ? () => switchMode("multiple_choice") : undefined}
                  />
                  <ModeCard
                    title="True / False"
                    description="Binary factual evaluation and verification"
                    count={`${tfCount} Statements`}
                    disabled={tfCount === 0}
                    icon={<ToggleLeft className="size-5 text-cyan-400" />}
                    onClick={tfCount > 0 ? () => switchMode("true_false") : undefined}
                  />
                  <ModeCard
                    title="Identification"
                    description="Active recall typing with fuzzy Levenshtein match"
                    count={`${idCount} Terms`}
                    disabled={idCount === 0}
                    icon={<PenLine className="size-5 text-amber-400" />}
                    onClick={idCount > 0 ? () => switchMode("identification") : undefined}
                  />
                  <ModeCard
                    title="Enumeration"
                    description="Multi-item structured list and sequential recall"
                    count={`${enumCount} Topics`}
                    disabled={enumCount === 0}
                    icon={<List className="size-5 text-rose-400" />}
                    onClick={enumCount > 0 ? () => switchMode("enumeration") : undefined}
                  />
                  <ModeCard
                    title="Study Notes"
                    description="Rich structured lesson notes with bolded active recall"
                    count={`${notesCount} Notes`}
                    icon={<BookOpen className="size-5 text-sky-400" />}
                    onClick={() => switchMode("notes")}
                  />
                  <ModeCard
                    title="Visual Gallery"
                    description="Document diagrams, figures, and visual OCR gallery"
                    count="Gallery"
                    icon={<ImageIcon className="size-5 text-fuchsia-400" />}
                    onClick={() => switchMode("gallery")}
                  />
                </div>
              );
            })()}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. FLASHCARDS FLIP MODE                                                  */}
        {/* ========================================================================= */}
        {activeMode === "flashcards" && currentCard && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => switchMode("list_view")}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-all"
                >
                  <TableProperties size={14} /> Switch to List View
                </button>
                <button
                  onClick={toggleShuffle}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
                    isShuffled
                      ? "bg-purple-600/20 text-purple-300 border-purple-500/40"
                      : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <Shuffle size={14} className={isShuffled ? "animate-pulse" : ""} />
                  {isShuffled ? "Shuffled" : "Shuffle"}
                </button>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Card {cardIndex + 1} of {currentCardList.length}
              </span>
            </div>

            <FlashcardDeck
              card={currentCard}
              cards={currentCardList}
              currentIndex={safeCardIndex}
              isFlipped={isFlipped}
              onFlip={() => setIsFlipped(!isFlipped)}
              onNext={nextQuestion}
              onPrev={prevQuestion}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. LIST VIEW MODE                                                        */}
        {/* ========================================================================= */}
        {activeMode === "list_view" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <button
                onClick={() => switchMode("flashcards")}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-all"
              >
                <Layers size={14} /> Switch to Flip Cards
              </button>
              <button
                onClick={toggleShuffle}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
                  isShuffled
                    ? "bg-purple-600/20 text-purple-300 border-purple-500/40"
                    : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                }`}
              >
                <Shuffle size={14} /> {isShuffled ? "Shuffled" : "Shuffle"}
              </button>
            </div>

            <FlashcardListView
              cards={displayCards}
              onCardDeleted={(id: string) => {
                setCards((prev) => prev.filter((c) => c.id !== id));
                setDisplayCards((prev) => prev.filter((c) => c.id !== id));
              }}
              onBulkDelete={(ids: string[]) => {
                const idSet = new Set(ids);
                setCards((prev) => prev.filter((c) => !idSet.has(c.id)));
                setDisplayCards((prev) => prev.filter((c) => !idSet.has(c.id)));
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. MULTIPLE CHOICE QUIZ                                                  */}
        {/* ========================================================================= */}
        {activeMode === "multiple_choice" && currentCard && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <QuizProgressBar current={cardIndex + 1} total={currentCardList.length} score={score.correct} />

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-4">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Question {cardIndex + 1}
              </span>
              <h2 className="text-lg font-semibold text-slate-100">{currentCard.front}</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {currentMCOptions.map((option: any, idx: number) => (
                  <MCOption
                    key={idx}
                    index={idx}
                    label={typeof option === "object" && option?.label ? option.label : String.fromCharCode(65 + idx)}
                    text={typeof option === "string" ? option : (option?.text || String(option))}
                    state={mcOptionStates[idx] || "default"}
                    disabled={selectedMCOption !== null}
                    onClick={() => handleMCSelect(idx)}
                  />
                ))}
              </div>

              {selectedMCOption !== null && (
                <div className="pt-4 flex items-center justify-between border-t border-white/10">
                  <p className="text-xs text-slate-400">
                    {currentCard.explanation ? `💡 ${currentCard.explanation}` : "Proceed to next question."}
                  </p>
                  <button
                    onClick={nextQuestion}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                  >
                    Next Question →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. TRUE / FALSE QUIZ                                                     */}
        {/* ========================================================================= */}
        {activeMode === "true_false" && currentCard && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <QuizProgressBar current={cardIndex + 1} total={currentCardList.length} score={score.correct} />

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-5">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                True or False · {cardIndex + 1} / {currentCardList.length}
              </span>
              <h2 className="text-lg font-semibold text-slate-100">{currentCard.front}</h2>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  disabled={tfAnswer !== null}
                  onClick={() => handleTFSelect(true)}
                  className={`p-4 rounded-xl border text-base font-bold flex items-center justify-center gap-2 transition-all ${
                    tfAnswer === null
                      ? "bg-white/5 border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-emerald-400"
                      : currentCard.tf_correct?.toLowerCase() === "true" || (currentCard.back || "").toLowerCase() === "true"
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : tfAnswer === true
                      ? "bg-rose-500/20 border-rose-500 text-rose-300"
                      : "opacity-40 border-white/5 text-slate-500"
                  }`}
                >
                  <Check size={20} /> True
                </button>
                <button
                  disabled={tfAnswer !== null}
                  onClick={() => handleTFSelect(false)}
                  className={`p-4 rounded-xl border text-base font-bold flex items-center justify-center gap-2 transition-all ${
                    tfAnswer === null
                      ? "bg-white/5 border-white/10 hover:bg-rose-500/10 hover:border-rose-500/30 text-rose-400"
                      : currentCard.tf_correct?.toLowerCase() === "false" || (currentCard.back || "").toLowerCase() === "false"
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : tfAnswer === false
                      ? "bg-rose-500/20 border-rose-500 text-rose-300"
                      : "opacity-40 border-white/5 text-slate-500"
                  }`}
                >
                  <X size={20} /> False
                </button>
              </div>

              {tfAnswer !== null && (
                <div className="pt-4 flex items-center justify-between border-t border-white/10">
                  <p className="text-xs text-slate-400">
                    {currentCard.explanation ? `💡 ${currentCard.explanation}` : "Proceed to next question."}
                  </p>
                  <button
                    onClick={nextQuestion}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                  >
                    Next Question →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. IDENTIFICATION ACTIVE RECALL                                           */}
        {/* ========================================================================= */}
        {activeMode === "identification" && currentCard && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <QuizProgressBar current={cardIndex + 1} total={currentCardList.length} score={score.correct} />

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-4">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Identification · Question {cardIndex + 1}
              </span>
              <h2 className="text-lg font-semibold text-slate-100">{currentCard.front}</h2>

              <form onSubmit={handleIDSubmit} className="space-y-3 pt-2">
                <input
                  type="text"
                  disabled={idSubmitted}
                  value={idInput}
                  onChange={(e) => setIdInput(e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
                {!idSubmitted ? (
                  <button
                    type="submit"
                    disabled={!idInput.trim()}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold"
                  >
                    Submit Answer
                  </button>
                ) : (
                  <div className="space-y-3 pt-2">
                    <div
                      className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                        idResult?.isCorrect
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                      }`}
                    >
                      <p className="font-bold">
                        {idResult?.isCorrect ? " Correct!" : " Incorrect"}
                      </p>
                      <p className="mt-1 text-slate-300">
                        Exact Answer: <strong className="text-white">{currentCard.back || currentCard.id_answer}</strong>
                      </p>
                      {currentCard.explanation && (
                        <p className="mt-1 text-slate-400">💡 {currentCard.explanation}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={nextQuestion}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                    >
                      Next Question →
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. ENUMERATION MODE                                                      */}
        {/* ========================================================================= */}
        {activeMode === "enumeration" && currentCard && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-4">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Enumeration · {cardIndex + 1} / {currentCardList.length}
              </span>
              <h2 className="text-lg font-semibold text-slate-100">{currentCard.front}</h2>

              <div className="pt-2">
                {!enumRevealed ? (
                  <button
                    onClick={() => setEnumRevealed(true)}
                    className="w-full py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <Eye size={15} /> Reveal Items
                  </button>
                ) : (
                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
                    <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Required Items:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {(currentCard.enum_items || currentCard.back || "")
                        .split(/[;,|\n]+/)
                        .filter(Boolean)
                        .map((item, idx) => (
                          <div
                            key={idx}
                            className="px-3 py-2 rounded-lg bg-black/40 border border-white/5 text-xs text-slate-200 flex items-center gap-2"
                          >
                            <span className="size-5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span>{item.trim()}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-white/10">
                <button
                  onClick={prevQuestion}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs"
                >
                  ← Previous
                </button>
                <button
                  onClick={nextQuestion}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Next Item →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 8. STUDY NOTES ACTIVE RECALL (hideBold Masking)                          */}
        {/* ========================================================================= */}
        {activeMode === "notes" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 size-4 text-slate-500" />
                <input
                  type="text"
                  value={noteSearch}
                  onChange={(e) => setNoteSearch(e.target.value)}
                  placeholder="Search notes & keywords..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                onClick={() => setHideBold(!hideBold)}
                className={`px-3.5 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
                  hideBold
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                }`}
              >
                {hideBold ? <EyeOff size={14} /> : <Eye size={14} />}
                {hideBold ? "Active Recall: ON (Bold Hidden)" : "Hide Bolded Keywords"}
              </button>
            </div>

            <div className="space-y-4">
              {cards
                .filter(
                  (c) =>
                    !noteSearch ||
                    c.front.toLowerCase().includes(noteSearch.toLowerCase()) ||
                    (c.back || "").toLowerCase().includes(noteSearch.toLowerCase())
                )
                .map((card, idx) => (
                  <div
                    key={card.id || idx}
                    className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-100">{card.front}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 uppercase font-mono">
                        {card.type}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 leading-relaxed pt-1 border-t border-white/5">
                      <FormattedNoteText text={card.back || card.explanation || ""} hideBold={hideBold} />
                    </div>
                    {card.explanation && card.back && (
                      <p className="text-[11px] text-slate-400 pt-1">💡 {card.explanation}</p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 9. VISUAL IMAGE GALLERY                                                  */}
        {/* ========================================================================= */}
        {activeMode === "gallery" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <DeckImageGallery images={[]} deckTitle={deck?.title} />
          </div>
        )}
      </div>

      {/* Document Transcriber Modal */}
      <DocumentUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onTranscriptionComplete={(text, images) => {
          console.log("Transcribed text & images ready:", text.slice(0, 100), images.length);
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
