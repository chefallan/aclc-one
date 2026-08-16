"use client";

import * as React from "react";
import {
  ArrowUp,
  Sparkles,
  NotebookPen,
  BookOpen,
  Plus,
  Square,
  TriangleAlert,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Citation {
  kind: "note" | "library";
  id: string;
  label: string;
  detail?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  streaming?: boolean;
}

interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  _count: { messages: number };
}

const OPENERS = [
  "Explain this like I'm behind",
  "Quiz me on my notes",
  "What did I write about last week?",
  "Help me plan a reflection",
];

export default function StudyBuddyPage() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [conversations, setConversations] = React.useState<ConversationSummary[]>([]);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const abortRef = React.useRef<AbortController | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/study-buddy/conversations");
        const data = await res.json();
        if (!cancelled && data.success) setConversations(data.data);
      } catch {
        /* The chat still works without the history list. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function openConversation(id: string) {
    setError("");
    try {
      const res = await fetch(`/api/study-buddy/conversations/${id}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError("That conversation couldn't be opened.");
        return;
      }
      setConversationId(id);
      setMessages(
        data.data.messages.map((m: { id: string; role: string; content: string; citations?: Citation[] }) => ({
          id: m.id,
          role: m.role === "ASSISTANT" ? "assistant" : "user",
          content: m.content,
          citations: m.citations ?? undefined,
        }))
      );
    } catch {
      setError("That conversation couldn't be opened.");
    }
  }

  function newChat() {
    abortRef.current?.abort();
    setConversationId(null);
    setMessages([]);
    setError("");
    textareaRef.current?.focus();
  }

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;

    setError("");
    setInput("");
    setBusy(true);

    const userMessage: Message = { id: `local-${Date.now()}`, role: "user", content: question };
    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/study-buddy/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Omit the key entirely on a new chat rather than sending null.
        body: JSON.stringify(
          conversationId ? { message: question, conversationId } : { message: question }
        ),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Study Buddy couldn't answer.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Newline-delimited JSON: first line is metadata, the rest are deltas.
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let event: {
            type: string;
            conversationId?: string;
            title?: string;
            citations?: Citation[];
            delta?: string;
            error?: string;
          };
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }

          if (event.type === "meta") {
            if (event.conversationId) {
              setConversationId(event.conversationId);
              setConversations((prev) =>
                prev.some((c) => c.id === event.conversationId)
                  ? prev
                  : [
                      {
                        id: event.conversationId!,
                        title: event.title ?? "New chat",
                        updatedAt: new Date().toISOString(),
                        _count: { messages: 0 },
                      },
                      ...prev,
                    ]
              );
            }
            if (event.citations?.length) {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, citations: event.citations } : m))
              );
            }
          } else if (event.type === "delta" && event.delta) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + event.delta } : m
              )
            );
          } else if (event.type === "error") {
            setError(event.error ?? "Study Buddy stopped mid-answer.");
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message || "Study Buddy couldn't answer. Try again.");
      }
    } finally {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
      );
      setBusy(false);
      abortRef.current = null;
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="mx-auto flex h-[calc(100dvh-9rem)] max-w-3xl flex-col md:h-[calc(100dvh-7rem)]">
      <header className="flex items-center justify-between gap-3 pb-3">
        <div>
          <p className="eyebrow">Study</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
            Study Buddy
            <Sparkles className="size-4.5 text-brand-600 dark:text-brand-400" aria-hidden />
          </h1>
        </div>
        {!empty && (
          <Button variant="outline" size="sm" onClick={newChat}>
            <Plus className="size-4" />
            New chat
          </Button>
        )}
      </header>

      <div
        className="flex-1 space-y-4 overflow-y-auto pb-4"
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        {empty ? (
          <Empty
            conversations={conversations}
            onPick={send}
            onOpen={openConversation}
          />
        ) : (
          messages.map((m) => <Bubble key={m.id} message={m} />)
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2.5 rounded-field border border-absent-500/40 bg-absent-50 px-3.5 py-3 text-sm text-absent-700 dark:bg-absent-900/30 dark:text-absent-200"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-0 rounded-card border border-hairline bg-surface p-2 shadow-raised"
      >
        <div className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Ask Study Buddy
          </label>
          <textarea
            id="chat-input"
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask anything about your subjects…"
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-base text-content placeholder:text-content-faint focus-visible:outline-none sm:text-sm"
          />
          {busy ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => abortRef.current?.abort()}
              aria-label="Stop generating"
            >
              <Square className="size-4" />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send">
              <ArrowUp className="size-4.5" />
            </Button>
          )}
        </div>
        <p className="px-2 pb-1 pt-1.5 text-[0.7rem] text-content-faint">
          Study Buddy can be wrong. Check anything that matters against your notes.
        </p>
      </form>
    </div>
  );
}

function Empty({
  conversations,
  onPick,
  onOpen,
}: {
  conversations: ConversationSummary[];
  onPick: (text: string) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="space-y-6 pt-6">
      <div className="text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-field bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          <Sparkles className="size-6" />
        </span>
        <h2 className="mt-4 font-display text-xl font-semibold">What are you working on?</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-content-muted">
          Study Buddy can read your own notes and search the library to answer. Nobody else&apos;s
          notes, and nobody else can see this chat.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {OPENERS.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onPick(o)}
            className="rounded-card border border-hairline bg-surface p-3.5 text-left text-sm font-medium shadow-card transition-colors hover:border-brand-300 hover:bg-brand-50/40"
          >
            {o}
          </button>
        ))}
      </div>

      {conversations.length > 0 && (
        <section aria-labelledby="history-heading">
          <h3 id="history-heading" className="eyebrow mb-2">
            Earlier
          </h3>
          <ul className="divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
            {conversations.slice(0, 6).map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onOpen(c.id)}
                  className="flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-surface-sunk"
                >
                  <MessageSquare className="size-4 shrink-0 text-content-faint" />
                  <span className="min-w-0 flex-1 truncate text-sm">{c.title}</span>
                  <span className="data shrink-0 text-xs text-content-faint">
                    {new Date(c.updatedAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] space-y-2", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-card px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-brand-700 text-white"
              : "border border-hairline bg-surface text-content shadow-card"
          )}
        >
          {message.content ? (
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          ) : (
            <TypingDots />
          )}
          {message.streaming && message.content && (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-current align-text-bottom" />
          )}
        </div>

        {message.citations && message.citations.length > 0 && (
          <Card className="w-full">
            <CardContent className="p-3">
              <p className="eyebrow mb-2">Drawn from</p>
              <ul className="space-y-1.5">
                {message.citations.map((c) => (
                  <li key={`${c.kind}-${c.id}`} className="flex items-start gap-2 text-xs">
                    {c.kind === "note" ? (
                      <NotebookPen className="mt-0.5 size-3.5 shrink-0 text-brand-600 dark:text-brand-400" />
                    ) : (
                      <BookOpen className="mt-0.5 size-3.5 shrink-0 text-brand-600 dark:text-brand-400" />
                    )}
                    <span className="min-w-0">
                      <span className="font-medium">{c.label}</span>
                      {c.detail && <span className="data text-content-faint"> · {c.detail}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1" aria-label="Thinking">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-1.5 animate-bounce rounded-full bg-content-faint"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}
