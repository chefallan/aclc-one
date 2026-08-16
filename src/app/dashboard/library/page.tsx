"use client";

import * as React from "react";
import {
  Search,
  BookOpen,
  BookMarked,
  Headphones,
  Video,
  Newspaper,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LibraryItem {
  id: string;
  title: string;
  author: string | null;
  type: string;
  status: string;
  coverImage: string | null;
  category: { name: string; color: string } | null;
  tags: string[];
  yearPublished: number | null;
}

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  EBOOK: BookOpen,
  VIDEO: Video,
  AUDIO: Headphones,
  JOURNAL: Newspaper,
  THESIS: GraduationCap,
};

const FILTERS = ["All", "EBOOK", "BOOK", "THESIS", "JOURNAL", "VIDEO", "AUDIO"];

export default function LibraryPage() {
  const [items, setItems] = React.useState<LibraryItem[]>([]);
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState("All");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/library/items");
        const data = await res.json();
        if (cancelled) return;
        if (data.success) setItems(data.data);
        else setError("The catalog didn't load. Pull down to try again.");
      } catch {
        if (!cancelled) setError("You appear to be offline. The catalog needs a connection.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const query = search.trim().toLowerCase();
  const filtered = items.filter((i) => {
    const matchesType = type === "All" || i.type === type;
    if (!matchesType) return false;
    if (!query) return true;
    return (
      i.title.toLowerCase().includes(query) ||
      (i.author?.toLowerCase() ?? "").includes(query) ||
      i.tags.some((t) => t.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-5">
      <header>
        <p className="eyebrow">Study</p>
        <h1 className="mt-1 text-2xl font-semibold">Library</h1>
        <p className="mt-1 text-sm text-content-muted">
          The catalog, the ebooks, and every capstone ACLC has defended.
        </p>
      </header>

      <div className="space-y-3">
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

        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setType(f)}
              aria-pressed={type === f}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                type === f
                  ? "border-brand-700 bg-brand-700 text-white"
                  : "border-hairline-strong text-content-muted hover:border-brand-300 hover:text-content"
              )}
            >
              {f === "All" ? "All" : titleCase(f)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          <p className="data text-xs text-content-faint">
            {filtered.length} of {items.length} items
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => {
              const Icon = TYPE_ICON[item.type] ?? BookMarked;
              const available = item.status === "AVAILABLE";
              return (
                <li key={item.id}>
                  <Card className="h-full transition-colors hover:border-brand-300">
                    <CardContent className="flex h-full gap-3.5 p-4">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-field bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-snug">{item.title}</p>
                        <p className="mt-0.5 truncate text-sm text-content-muted">
                          {item.author ?? "Unknown author"}
                          {item.yearPublished ? (
                            <span className="data"> · {item.yearPublished}</span>
                          ) : null}
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <Badge variant={available ? "present" : "outline"} dot={available}>
                            {available ? "On the shelf" : titleCase(item.status)}
                          </Badge>
                          <Badge variant="outline">{titleCase(item.type)}</Badge>
                          {item.category && (
                            <Badge variant="secondary">{item.category.name}</Badge>
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
  );
}

function titleCase(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}
