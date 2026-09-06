"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  BookOpen,
  BookMarked,
  Headphones,
  Video,
  Newspaper,
  GraduationCap,
  Layers,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StudyTabs } from "@/components/study/study-tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { parseCSVFile } from "@/lib/study/csvParser";
import { LessonNotesDropZone } from "@/components/study/LessonNotesDropZone";

interface LibraryItem {
  id: string;
  title: string;
  author: string | null;
  type: string;
  status: string;
  coverImage?: string | null;
  course?: string | null;
  yearLevel?: string | null;
  semester?: string | null;
  category?: { name: string; color: string } | null;
  tags: string[];
  yearPublished?: number | null;
  cardsCsv?: string;
  cardCount?: number;
}

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  EBOOK: BookOpen,
  VIDEO: Video,
  AUDIO: Headphones,
  JOURNAL: Newspaper,
  THESIS: GraduationCap,
  FLASHCARD: Layers,
  BOOK: BookMarked,
};

const FORMAT_FILTERS = ["All", "EBOOK", "BOOK", "THESIS", "JOURNAL", "VIDEO", "AUDIO", "FLASHCARD"];
const COURSES = ["All Courses", "BSIT", "BSCS", "BSBA", "SHS TVL", "SHS HUMSS", "SHS STEM"];
const YEAR_LEVELS = ["All Years", "1st Year", "2nd Year", "3rd Year", "4th Year", "Grade 11", "Grade 12"];
const SEMESTERS = ["All Semesters", "1st Sem", "2nd Sem", "Summer"];

const DEFAULT_STUDY_DECKS: LibraryItem[] = [
  {
    id: "pub-deck-cats",
    title: "What Are Cats by Lawrence",
    author: "Lawrence · Student Author",
    type: "FLASHCARD",
    status: "AVAILABLE",
    course: "BSIT",
    yearLevel: "2nd Year",
    semester: "1st Sem",
    tags: ["BSIT 2-1", "Biology", "Document Review", "Cats"],
    yearPublished: 2026,
    cardCount: 6,
    cardsCsv: `deck_title,card_type,front,back,explanation,tags,mc_distractor_1,mc_distractor_2,mc_distractor_3,tf_correct,id_answer,id_acceptable_variants,enum_items,notes_content,image_keywords\n"What Are Cats by Lawrence","definition","What is a Cat (Felis catus)?","A small, carnivorous mammal belonging to the family Felidae, known for agility, retractable claws, and keen senses.","Domestic cats are the only domesticated species in the family Felidae.","Biology;Cats;Mammals","","","","","","","","","cat;feline;mammal"\n"What Are Cats by Lawrence","true_false","Cats are obligate carnivores, meaning their bodies require nutrients only found in animal meat.","True","Cats cannot synthesize certain essential nutrients like taurine without meat.","Biology;Diet","","","","True","","","","","carnivore;meat"\n"What Are Cats by Lawrence","multiple_choice","Which sensory organ in cats enables them to detect vibrations and navigate in the dark?","Whiskers (Vibrissae)","Whiskers are deeply embedded and connected to the nervous system.","Anatomy;Senses","Retractable Claws","Tapetum Lucidum","Jacobson's Organ","","","","","","whiskers;vibrissae"\n"What Are Cats by Lawrence","identification","The reflective layer of tissue behind a cat's retina that enhances night vision.","Tapetum Lucidum","Tapetum Lucidum reflects light back through the retina, improving night vision.","Anatomy;Vision","","","","","Tapetum Lucidum","tapetum, tapetum lucidum, feline retina","","","eye;retina;vision"\n"What Are Cats by Lawrence","enumeration","List 4 primary communication methods used by cats.","Purring; Meowing; Tail Posture; Scent Marking","Cats communicate using vocalizations, body language, and olfactory scent marks.","Behavior;Communication","","","","","","","Purring; Meowing; Tail Posture; Scent Marking","","purr;meow;tail"\n"What Are Cats by Lawrence","keyword","Feline Anatomy & Locomotion","Cats have **flexible spines**, **retractable claws**, and **specialized clavicles** that allow them to squeeze through any space larger than their head.","Their unique skeletal structure grants exceptional jumping ability.","Anatomy;Locomotion","","","","","","","","Feline anatomy features highly flexible vertebrae and specialized footpads.","skeleton;anatomy"`,
  },
  {
    id: "pub-deck-1",
    title: "IT 301 - Database Systems & SQL Queries",
    author: "Prof. Cruz · CCIS Faculty",
    type: "FLASHCARD",
    status: "AVAILABLE",
    course: "BSIT",
    yearLevel: "3rd Year",
    semester: "2nd Sem",
    tags: ["Database", "SQL", "Midterm Review"],
    yearPublished: 2026,
    cardCount: 6,
    cardsCsv: `deck_title,card_type,front,back,explanation,tags,mc_distractor_1,mc_distractor_2,mc_distractor_3,tf_correct,id_answer,id_acceptable_variants,enum_items,notes_content,image_keywords\n"IT 301 - Database Systems & SQL Queries","definition","What is a Primary Key?","A column or set of columns that uniquely identifies each row in a database table.","Primary keys enforce entity integrity.","Database;SQL","","","","","","","","","primary;key;sql"`,
  },
  {
    id: "pub-deck-2",
    title: "CS 202 - Data Structures & Algorithms",
    author: "Prof. Mendoza · Faculty",
    type: "FLASHCARD",
    status: "AVAILABLE",
    course: "BSCS",
    yearLevel: "2nd Year",
    semester: "1st Sem",
    tags: ["Algorithms", "Trees", "Sorting"],
    yearPublished: 2026,
    cardCount: 12,
  },
  {
    id: "pub-deck-3",
    title: "GE 104 - Mathematics in the Modern World",
    author: "General Education Dept",
    type: "EBOOK",
    status: "AVAILABLE",
    course: "BSIT",
    yearLevel: "1st Year",
    semester: "1st Sem",
    tags: ["Math", "Logic", "Patterns"],
    yearPublished: 2025,
    cardCount: 8,
  },
];

export default function LibraryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"library" | "create" | "buddies">("library");

  const [items, setItems] = React.useState<LibraryItem[]>(DEFAULT_STUDY_DECKS);
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState("All");
  const [selectedCourse, setSelectedCourse] = React.useState("All Courses");
  const [selectedYear, setSelectedYear] = React.useState("All Years");
  const [selectedSem, setSelectedSem] = React.useState("All Semesters");
  const [loading, setLoading] = React.useState(false);

  // In-slider Create Flashcards State
  const [notesInput, setNotesInput] = React.useState("");
  const [deckTitle, setDeckTitle] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      try {
        let loadedItems: LibraryItem[] = [...DEFAULT_STUDY_DECKS];

        // Fetch catalog items if available
        try {
          const res = await fetch("/api/library/items");
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data?.length > 0) {
              const apiCatalog = data.data.map((item: any) => ({
                id: item.id,
                title: item.title,
                author: item.author,
                type: item.type || "BOOK",
                status: item.status || "AVAILABLE",
                course: item.course || "BSIT",
                yearLevel: item.yearLevel || "3rd Year",
                semester: item.semester || "2nd Sem",
                tags: item.tags || [],
                yearPublished: item.yearPublished,
              }));
              loadedItems = [...loadedItems, ...apiCatalog];
            }
          }
        } catch (e) {
          // ignore API error and keep defaults
        }

        // Fetch community decks if available
        try {
          const commRes = await fetch("/api/library/community");
          if (commRes.ok) {
            const commData = await commRes.json();
            if (commData.success && commData.data?.length > 0) {
              const formatYear = (y: any) => {
                if (y === 1 || y === "1" || y === "1st Year") return "1st Year";
                if (y === 2 || y === "2" || y === "2nd Year") return "2nd Year";
                if (y === 3 || y === "3" || y === "3rd Year") return "3rd Year";
                if (y === 4 || y === "4" || y === "4th Year") return "4th Year";
                return String(y || "2nd Year");
              };
              const formatSem = (s: any) => {
                if (s === 1 || s === "1" || s === "1st Sem") return "1st Sem";
                if (s === 2 || s === "2" || s === "2nd Sem") return "2nd Sem";
                return String(s || "1st Sem");
              };

              const commItems: LibraryItem[] = commData.data.map((d: any) => ({
                id: d.id,
                title: d.title,
                author: d.authorName ? `${d.authorName} · Student Author` : "ACLC Student",
                type: "FLASHCARD",
                status: "AVAILABLE",
                course: d.program || d.course || "BSIT",
                yearLevel: formatYear(d.yearLevel),
                semester: formatSem(d.semester),
                tags: d.tags || ["Flashcards", "Review"],
                cardCount: d.cardCount || 6,
                cardsCsv: d.cardsCsv,
              }));

              // Merge without duplicates by ID
              const seen = new Set(loadedItems.map(i => i.id));
              for (const ci of commItems) {
                if (!seen.has(ci.id)) {
                  loadedItems.unshift(ci);
                  seen.add(ci.id);
                }
              }
            }
          }
        } catch (e) {
          // ignore community error and keep defaults
        }

        if (!cancelled) {
          setItems(loadedItems);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleOpenItem(item: LibraryItem) {
    if (item.cardsCsv) {
      const { deck, cards } = parseCSVFile(item.cardsCsv, item.title);
      localStorage.setItem("active_deck", JSON.stringify(deck));
      localStorage.setItem("active_cards", JSON.stringify(cards));
      router.push(`/dashboard/study/${item.id}`);
      return;
    }

    // Default demo cards fallback
    router.push(`/dashboard/study/${item.id}`);
  }

  async function handleCreateDeck() {
    if (!notesInput.trim()) return;
    setIsGenerating(true);

    try {
      // Direct CSV parser or AI generation
      if (notesInput.includes(",") && notesInput.includes("\n")) {
        const { deck, cards } = parseCSVFile(notesInput, deckTitle || "Study Deck");
        localStorage.setItem("active_deck", JSON.stringify(deck));
        localStorage.setItem("active_cards", JSON.stringify(cards));
        router.push(`/dashboard/study/${deck.id}`);
        return;
      }

      // Try AI generation endpoint
      const res = await fetch("/api/study/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notesText: notesInput,
          topic: deckTitle || "Study Notes",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.cardsCsv) {
          const { deck, cards } = parseCSVFile(data.cardsCsv, deckTitle || "Generated Deck");
          localStorage.setItem("active_deck", JSON.stringify(deck));
          localStorage.setItem("active_cards", JSON.stringify(cards));
          router.push(`/dashboard/study/${deck.id}`);
          return;
        }
      }

      // Fallback
      const { deck, cards } = parseCSVFile(notesInput, deckTitle || "Study Deck");
      localStorage.setItem("active_deck", JSON.stringify(deck));
      localStorage.setItem("active_cards", JSON.stringify(cards));
      router.push(`/dashboard/study/${deck.id}`);
    } catch (err) {
      console.warn("Generation fallback triggered:", err);
      const { deck, cards } = parseCSVFile(notesInput, deckTitle || "Study Deck");
      localStorage.setItem("active_deck", JSON.stringify(deck));
      localStorage.setItem("active_cards", JSON.stringify(cards));
      router.push(`/dashboard/study/${deck.id}`);
    } finally {
      setIsGenerating(false);
    }
  }

  const query = search.trim().toLowerCase();
  const filtered = items.filter((i) => {
    // 1. Text Search Filter
    if (query) {
      const matchTitle = i.title.toLowerCase().includes(query);
      const matchAuthor = (i.author ?? "").toLowerCase().includes(query);
      const matchTag = i.tags.some((t) => t.toLowerCase().includes(query));
      if (!matchTitle && !matchAuthor && !matchTag) return false;
    }

    // 2. Type/Format Filter
    if (type !== "All" && i.type !== type) {
      return false;
    }

    // 3. Course/Program Filter
    if (selectedCourse !== "All Courses") {
      if ((i.course || "").toUpperCase() !== selectedCourse.toUpperCase()) {
        return false;
      }
    }

    // 4. Year Level Filter
    if (selectedYear !== "All Years") {
      const itemYear = (i.yearLevel || "").toLowerCase();
      const selYear = selectedYear.toLowerCase();
      if (!itemYear.includes(selYear) && !selYear.includes(itemYear)) {
        return false;
      }
    }

    // 5. Semester Filter
    if (selectedSem !== "All Semesters") {
      const itemSem = (i.semester || "").toLowerCase();
      const selSem = selectedSem.toLowerCase();
      if (!itemSem.includes(selSem) && !selSem.includes(itemSem)) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* ─── HEADER & TABS ─── */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Study</h1>
          <p className="text-sm text-content-muted">
            The catalog, the ebooks, and flashcards across ACLC programs.
          </p>
        </div>

        {/* 3 Unified Tabs: Library | Create Flashcards | Buddies */}
        <StudyTabs
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === "buddies") {
              router.push("/dashboard/study-buddy");
            } else {
              setActiveTab(tab);
            }
          }}
        />
      </div>

      {/* ─── TAB 1: LIBRARY CATALOG ─── */}
      {activeTab === "library" && (
        <div className="space-y-4">
          {/* SEARCH & FILTERS BAR */}
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-content-faint" />
              <Input
                type="search"
                placeholder="Search titles, authors, tags"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                aria-label="Search catalog"
              />
            </div>

            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="h-9 rounded-md border border-hairline-strong bg-surface px-3 text-xs font-medium text-content focus:outline-none focus:ring-2 focus:ring-brand-600"
              aria-label="Filter by course"
            >
              {COURSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-9 rounded-md border border-hairline-strong bg-surface px-3 text-xs font-medium text-content focus:outline-none focus:ring-2 focus:ring-brand-600"
              aria-label="Filter by year level"
            >
              {YEAR_LEVELS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <select
              value={selectedSem}
              onChange={(e) => setSelectedSem(e.target.value)}
              className="h-9 rounded-md border border-hairline-strong bg-surface px-3 text-xs font-medium text-content focus:outline-none focus:ring-2 focus:ring-brand-600"
              aria-label="Filter by semester"
            >
              {SEMESTERS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* TYPE PILLS */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {FORMAT_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setType(f)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors squishy-btn",
                  type === f
                    ? "bg-brand-800 text-white dark:bg-brand-200 dark:text-brand-950"
                    : "bg-surface-sunk text-content-muted hover:text-content"
                )}
              >
                {f === "All" ? "All Formats" : titleCase(f)}
              </button>
            ))}
          </div>

          {/* CATALOG ITEMS LIST */}
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-card border border-hairline bg-surface-sunk"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center">
                <BookMarked className="mx-auto size-8 text-content-faint" />
                <p className="mt-3 font-medium">Nothing matches that filter</p>
                <p className="mt-1 text-sm text-content-muted">
                  {query ? "Try a different search keyword." : "Try resetting your course or semester filters."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="data text-xs text-content-faint pt-1">
                {filtered.length} of {items.length} items
              </p>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((item) => {
                  const Icon = TYPE_ICON[item.type] ?? BookMarked;
                  const available = item.status === "AVAILABLE";
                  return (
                    <li key={item.id}>
                      <Card
                        onClick={() => handleOpenItem(item)}
                        className="h-full transition-all duration-200 hover:border-brand-400 hover:shadow-md cursor-pointer squishy-btn group select-none"
                      >
                        <CardContent className="flex h-full gap-3.5 p-4">
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-field bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300 group-hover:scale-105 transition-transform">
                            <Icon className="size-5" />
                          </div>

                          <div className="flex flex-1 flex-col justify-between min-w-0">
                            <div>
                              <div className="flex items-start justify-between gap-1.5">
                                <p className="font-semibold text-sm leading-snug line-clamp-2 text-content group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                  {item.title}
                                </p>
                                <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                                  {item.course || "BSIT"}
                                </Badge>
                              </div>

                              {item.author && (
                                <p className="mt-0.5 text-xs text-content-muted truncate">
                                  {item.author}
                                </p>
                              )}
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-1.5 text-content-faint text-[11px]">
                                <span>{item.yearLevel || "2nd Year"}</span>
                                <span>•</span>
                                <span>{item.semester || "1st Sem"}</span>
                              </div>
                              <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                                Study →
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}

      {/* ─── TAB 2: IN-SLIDER CREATE FLASHCARDS PANEL ─── */}
      {activeTab === "create" && (
        <div className="space-y-4 pt-1 animate-in fade-in duration-150">
          <Card className="p-6 space-y-5 shadow-sm border-hairline bg-surface">
            <div className="space-y-1">
              <h2 className="text-xl font-bold">Create Flashcards</h2>
              <p className="text-xs text-content-muted">
                Paste your lesson notes or drop a file to start studying.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-content-muted">Title</label>
              <Input
                placeholder="e.g. Science Chapter 1"
                value={deckTitle}
                onChange={(e) => setDeckTitle(e.target.value)}
              />
            </div>

            <LessonNotesDropZone
              value={notesInput}
              onChange={setNotesInput}
              onTitleChange={(title) => {
                if (!deckTitle) setDeckTitle(title);
              }}
              label="Lesson Notes"
              placeholder="Paste lesson notes, definitions, or drop a file to transcribe automatically..."
              rows={7}
            />

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={() => setActiveTab("library")}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateDeck}
                disabled={isGenerating || !notesInput.trim()}
                className="bg-brand-600 hover:bg-brand-700 text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" /> Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 mr-2" /> Create Flashcards
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function titleCase(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}
