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

const FORMAT_FILTERS = ["All", "EBOOK", "BOOK", "THESIS", "JOURNAL", "VIDEO", "AUDIO"];
const COURSES = ["All Courses", "BSIT", "BSCS", "BSBA", "SHS TVL", "SHS HUMSS", "SHS STEM"];
const YEAR_LEVELS = ["All Years", "1st Year", "2nd Year", "3rd Year", "4th Year", "Grade 11", "Grade 12"];
const SEMESTERS = ["All Semesters", "1st Sem", "2nd Sem", "Summer"];

export default function LibraryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"library" | "create" | "buddies">("library");

  const [items, setItems] = React.useState<LibraryItem[]>([]);
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState("All");
  const [selectedCourse, setSelectedCourse] = React.useState("All Courses");
  const [selectedYear, setSelectedYear] = React.useState("All Years");
  const [selectedSem, setSelectedSem] = React.useState("All Semesters");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  // In-slider Create Flashcards State
  const [notesInput, setNotesInput] = React.useState("");
  const [deckTitle, setDeckTitle] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      try {
        const res = await fetch("/api/library/items");
        const data = await res.json();
        
        const commRes = await fetch("/api/library/community");
        const commData = await commRes.json();

        if (cancelled) return;

        let combined: LibraryItem[] = [];
        if (data.success && data.data?.length > 0) {
          combined = data.data.map((item: any) => ({
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
        }

        if (commData.success && commData.data?.length > 0) {
          const commItems: LibraryItem[] = commData.data.map((d: any) => ({
            id: d.id,
            title: d.title,
            author: d.authorName || "ACLC Student",
            type: "FLASHCARD",
            status: "AVAILABLE",
            course: d.course || "BSIT",
            yearLevel: d.yearLevel || "2nd Year",
            semester: d.semester || "1st Sem",
            tags: d.tags || ["Flashcards", "Review"],
            cardCount: d.cardCount || 10,
            cardsCsv: d.cardsCsv,
          }));
          combined = [...commItems, ...combined];
        }

        if (combined.length === 0) {
          combined = [
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
        }

        setItems(combined);
      } catch (e) {
        if (!cancelled) setError("Offline or loading error. Showing local study decks.");
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
    }
    router.push(`/dashboard/study/${item.id}`);
  }

  async function handleCreateDeck() {
    if (!notesInput.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesInput, title: deckTitle || "Generated Deck" }),
      });
      const data = await res.json();
      if (data.cardsCsv) {
        const { deck, cards } = parseCSVFile(data.cardsCsv, deckTitle || "Generated Deck");
        localStorage.setItem("active_deck", JSON.stringify(deck));
        localStorage.setItem("active_cards", JSON.stringify(cards));
        router.push(`/dashboard/study/${deck.id}`);
      } else {
        const { deck, cards } = parseCSVFile(notesInput, deckTitle || "Study Deck");
        localStorage.setItem("active_deck", JSON.stringify(deck));
        localStorage.setItem("active_cards", JSON.stringify(cards));
        router.push(`/dashboard/study/${deck.id}`);
      }
    } catch {
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
    const matchesType = type === "All" || i.type === type;
    const matchesCourse = selectedCourse === "All Courses" || i.course === selectedCourse;
    const matchesYear = selectedYear === "All Years" || i.yearLevel === selectedYear;
    const matchesSem = selectedSem === "All Semesters" || i.semester === selectedSem;

    if (!matchesType || !matchesCourse || !matchesYear || !matchesSem) return false;
    if (!query) return true;
    return (
      i.title.toLowerCase().includes(query) ||
      (i.author?.toLowerCase() ?? "").includes(query) ||
      i.tags.some((t) => t.toLowerCase().includes(query))
    );
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Header from Authentic Snapshot */}
      <header>
        <h1 className="text-2xl">Study</h1>
        <p className="mt-1 text-sm text-content-muted">
          The catalog, the ebooks, and every capstone ACLC has defended.
        </p>
      </header>

      {/* 3-Tab Slider */}
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

      {/* ─── TAB 1: LIBRARY CATALOG & FILTER VIEW ─── */}
      {activeTab === "library" && (
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-content-faint" />
            <Input
              type="search"
              placeholder="Search titles, authors, tags"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search the catalog"
            />
          </div>

          {/* Academic Course, Year, and Semester Filters */}
          <div className="grid grid-cols-3 gap-2">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="h-9 rounded-md border border-hairline-strong bg-surface px-2 text-xs font-medium text-content focus:outline-none focus:border-brand-600 cursor-pointer"
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
              className="h-9 rounded-md border border-hairline-strong bg-surface px-2 text-xs font-medium text-content focus:outline-none focus:border-brand-600 cursor-pointer"
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
              className="h-9 rounded-md border border-hairline-strong bg-surface px-2 text-xs font-medium text-content focus:outline-none focus:border-brand-600 cursor-pointer"
            >
              {SEMESTERS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Format / Type Pills */}
          <div className="flex flex-wrap gap-1.5">
            {FORMAT_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setType(f)}
                aria-pressed={type === f}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors squishy-btn",
                  type === f
                    ? "border-ink-900 bg-ink-900 text-white"
                    : "border-hairline-strong text-content-muted hover:border-brand-300 hover:text-content"
                )}
              >
                {f === "All" ? "All" : titleCase(f)}
              </button>
            ))}
          </div>

          {/* Item Catalog List */}
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-card border border-hairline bg-surface-sunk"
                />
              ))}
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-sm text-content-muted">{error}</p>
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center">
                <BookMarked className="mx-auto size-8 text-content-faint" />
                <p className="mt-3 font-medium">Nothing matches that</p>
                <p className="mt-1 text-sm text-content-muted">
                  {query ? "Try a different title or author." : "The catalog is empty for now."}
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
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-field bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 group-hover:scale-105 transition-transform">
                            <Icon className="size-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium leading-snug group-hover:text-brand-600 transition-colors line-clamp-2">
                              {item.title}
                            </p>
                            <p className="mt-0.5 truncate text-sm text-content-muted">
                              {item.author ?? "Unknown author"}
                              {item.yearPublished ? (
                                <span className="data"> · {item.yearPublished}</span>
                              ) : null}
                            </p>
                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                              {item.course && (
                                <Badge variant="secondary" className="text-[0.68rem]">
                                  {item.course}
                                </Badge>
                              )}
                              {item.yearLevel && (
                                <Badge variant="outline" className="text-[0.68rem]">
                                  {item.yearLevel}
                                </Badge>
                              )}
                              {item.semester && (
                                <span className="text-[0.68rem] text-content-faint px-1.5 py-0.5 rounded border border-hairline bg-surface-sunk">
                                  {item.semester}
                                </span>
                              )}
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

      {/* ─── TAB 2: IN-SLIDER CREATE DECK PANEL ─── */}
      {activeTab === "create" && (
        <div className="space-y-4 pt-1">
          <Card className="p-6 space-y-5 shadow-sm border-hairline bg-surface">
            <div className="space-y-1">
              <h2 className="text-xl font-bold">Create Study Deck</h2>
              <p className="text-xs text-content-muted">
                Paste your lesson notes, definitions, or CSV to instantly generate active recall modes.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-content-muted">Deck Title / Subject</label>
              <Input
                placeholder="e.g. IT 301 - Database Systems & SQL"
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
              label="Lesson Notes or CSV Content"
              placeholder="Paste lesson notes, definitions, or drop a PDF / Word / PPTX document to transcribe automatically..."
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
                    <Loader2 className="size-4 animate-spin mr-2" /> Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 mr-2" /> Build Deck & Study
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
