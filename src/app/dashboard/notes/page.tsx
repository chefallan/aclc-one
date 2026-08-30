"use client";

import * as React from "react";
import { NotebookPen, Search, Plus, Pin, X, TriangleAlert, Sparkles, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudyTabs } from "@/components/study/study-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AiFlashcardModal } from "@/components/study/AiFlashcardModal";
import { PublishDeckModal } from "@/components/study/PublishDeckModal";

interface Note {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  tags: string[];
  visibility: string;
  isPinned: boolean;
  isArchived: boolean;
  color: string | null;
  folder: { name: string; color: string } | null;
  createdAt: string;
  updatedAt: string;
}

export default function NotesPage() {
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [tags, setTags] = React.useState("");

  // AI Modal state
  const [aiModalOpen, setAiModalOpen] = React.useState(false);
  const [modalInitialText, setModalInitialText] = React.useState("");
  const [modalInitialTitle, setModalInitialTitle] = React.useState("");

  // Publish Modal state
  const [publishModalOpen, setPublishModalOpen] = React.useState(false);
  const [publishNote, setPublishNote] = React.useState<{ id?: string; title: string; content: string }>({
    title: "",
    content: "",
  });

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/notes");
        const data = await res.json();
        if (cancelled) return;
        if (data.success) setNotes(data.data);
        else setError("Your notes didn't load.");
      } catch {
        if (!cancelled) {
          setError("You appear to be offline. Notes you write are kept on this device.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Untitled",
          content,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "That note didn't save. Your text is still here — try again.");
        return;
      }

      setNotes((prev) => [data.data, ...prev]);
      setTitle("");
      setContent("");
      setTags("");
      setEditorOpen(false);
    } catch {
      setError("That note didn't save. Your text is still here — try again.");
    } finally {
      setSaving(false);
    }
  }

  function openAiWithNote(noteTitle: string, noteContent: string) {
    setModalInitialTitle(noteTitle);
    setModalInitialText(noteContent);
    setAiModalOpen(true);
  }

  function openPublishWithNote(noteTitle: string, noteContent: string, noteId?: string) {
    setPublishNote({ id: noteId, title: noteTitle, content: noteContent });
    setPublishModalOpen(true);
  }

  const query = search.trim().toLowerCase();
  const filtered = notes.filter(
    (n) =>
      !query ||
      n.title.toLowerCase().includes(query) ||
      n.content.toLowerCase().includes(query) ||
      n.tags.some((t) => t.toLowerCase().includes(query))
  );
  const pinned = filtered.filter((n) => n.isPinned);
  const rest = filtered.filter((n) => !n.isPinned);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Study Notes</h1>
          <p className="mt-1 text-sm text-content-muted">
            Write notes, convert to flashcards with AI, or publish to the community library.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openAiWithNote(title, content)}>
            <Sparkles className="size-4 mr-1.5" />
            AI Flashcards
          </Button>
          {!editorOpen && (
            <Button onClick={() => setEditorOpen(true)}>
              <Plus className="size-4 mr-1.5" />
              New note
            </Button>
          )}
        </div>
      </header>

      <StudyTabs />

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-field border border-absent-500/40 bg-absent-50 px-3.5 py-3 text-sm text-absent-700 dark:bg-absent-900/30 dark:text-absent-200"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {editorOpen && (
        <Card className="border-brand-300">
          <CardContent className="p-4">
            <form onSubmit={saveNote} className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="note-title" className="text-xs font-semibold uppercase text-content-muted">
                  New note
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditorOpen(false)}
                >
                  <X className="size-4" />
                  <span className="sr-only">Close editor</span>
                </Button>
              </div>

              <Input
                id="note-title"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="font-medium"
              />
              <Textarea
                aria-label="Note body"
                placeholder="Write here. Photograph the board and type the key points that matter."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={7}
                required
              />
              <Input
                aria-label="Tags"
                placeholder="Tags, separated by commas"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!content.trim()}
                    onClick={() => openAiWithNote(title, content)}
                  >
                    <Sparkles className="size-3.5 mr-1.5" />
                    Convert to Cards
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!content.trim()}
                    onClick={() => openPublishWithNote(title || "Untitled Note", content)}
                  >
                    <Share2 className="size-3.5 mr-1.5" />
                    Publish to Library
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setEditorOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving…" : "Save note"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-content-faint" />
        <Input
          type="search"
          placeholder="Search your notes"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Search notes"
        />
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-card border border-hairline bg-surface-sunk"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <NotebookPen className="mx-auto size-8 text-content-faint" />
            <p className="mt-3 font-medium">
              {query ? "Nothing matches that" : "No notes yet. Create your first note above."}
            </p>
            <p className="mt-1 text-sm text-content-muted">
              {query
                ? "Try a different word."
                : "Notes you write here can be converted to flashcards with AI or published to the library."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {pinned.length > 0 && (
            <section aria-labelledby="pinned-heading">
              <h2 id="pinned-heading" className="text-xs font-semibold uppercase text-content-muted mb-2.5">
                Pinned
              </h2>
              <NoteGrid
                notes={pinned}
                onGenerateCards={openAiWithNote}
                onPublish={openPublishWithNote}
              />
            </section>
          )}
          <section aria-labelledby="all-heading">
            {pinned.length > 0 && (
              <h2 id="all-heading" className="text-xs font-semibold uppercase text-content-muted mb-2.5">
                Everything else
              </h2>
            )}
            <NoteGrid
              notes={rest}
              onGenerateCards={openAiWithNote}
              onPublish={openPublishWithNote}
            />
          </section>
        </div>
      )}

      {/* AI Card Generator Modal */}
      <AiFlashcardModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        initialText={modalInitialText}
        initialTitle={modalInitialTitle}
      />

      {/* Publish to Library Modal */}
      <PublishDeckModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        title={publishNote.title}
        content={publishNote.content}
        noteId={publishNote.id}
      />
    </div>
  );
}

function NoteGrid({
  notes,
  onGenerateCards,
  onPublish,
}: {
  notes: Note[];
  onGenerateCards: (title: string, content: string) => void;
  onPublish: (title: string, content: string, noteId?: string) => void;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => (
        <li key={note.id}>
          <Card className="h-full flex flex-col justify-between transition-colors hover:border-brand-300">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-1 font-medium">{note.title}</p>
                {note.isPinned && (
                  <Pin className="size-3.5 shrink-0 text-brand-600 dark:text-brand-400" />
                )}
              </div>
              <p className="mt-1.5 line-clamp-3 text-sm text-content-muted">{note.content}</p>

              {note.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {note.tags.slice(0, 4).map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>

            <div className="flex items-center justify-between border-t border-hairline px-4 py-2 text-[0.68rem] text-content-faint">
              <button
                type="button"
                onClick={() => onPublish(note.title, note.content, note.id)}
                className="flex items-center gap-1 font-medium text-content-muted hover:text-content transition-colors"
              >
                <Share2 className="size-3" />
                Publish
              </button>

              <button
                type="button"
                onClick={() => onGenerateCards(note.title, note.content)}
                className="flex items-center gap-1 font-medium text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-200 transition-colors"
              >
                <Sparkles className="size-3" />
                Make Cards
              </button>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
