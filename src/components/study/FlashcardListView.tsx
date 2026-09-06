'use client';

import React, { useState } from 'react';
import { Search, Eye, EyeOff, Trash2, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import MathFormattedText from '@/components/study/MathFormattedText';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Card } from '@/lib/study/types';

interface FlashcardListViewProps {
  cards: Card[];
  onCardDeleted?: (cardId: string) => void;
  onCardDelete?: (cardId: string) => void;
  onBulkDelete?: (cardIds: string[]) => void;
  onCardUpdated?: (card: Card) => void;
}

export function FlashcardListView({ cards: initialCards, onCardDeleted, onCardDelete, onBulkDelete, onCardUpdated }: FlashcardListViewProps) {
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [search, setSearch] = useState('');
  const [hideAnswers, setHideAnswers] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    cardIds: string[];
    description: string;
  } | null>(null);

  const toggleSelectCard = (cardId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const toggleSelectAll = (filteredCards: Card[]) => {
    const allFilteredIds = filteredCards.map((c) => c.id);
    const allSelected = allFilteredIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        allFilteredIds.forEach((id) => next.delete(id));
      } else {
        allFilteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const promptDeleteSingle = (card: Card) => {
    setConfirmModal({
      isOpen: true,
      cardIds: [card.id],
      description: `"${card.front.length > 50 ? card.front.slice(0, 50) + '...' : card.front}"`,
    });
  };

  const promptDeleteBulk = () => {
    if (selectedIds.size === 0) return;
    setConfirmModal({
      isOpen: true,
      cardIds: Array.from(selectedIds),
      description: `${selectedIds.size} selected card${selectedIds.size !== 1 ? 's' : ''}`,
    });
  };

  const executeDelete = () => {
    if (!confirmModal || confirmModal.cardIds.length === 0) return;
    const ids = confirmModal.cardIds;
    setCards((prev) => prev.filter((c) => !ids.includes(c.id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    if (onCardDeleted) {
      ids.forEach((id) => onCardDeleted(id));
    }
    setConfirmModal(null);
  };

  const toggleAnswer = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = cards.filter(
    (c) =>
      !search ||
      c.front.toLowerCase().includes(search.toLowerCase()) ||
      c.back.toLowerCase().includes(search.toLowerCase()) ||
      c.chapter?.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, Card[]>>((acc, card) => {
    const ch = card.chapter || 'General';
    if (!acc[ch]) acc[ch] = [];
    acc[ch].push(card);
    return acc;
  }, {});

  const chapters = Object.keys(grouped);

  return (
    <div className="flex-1 overflow-auto flex flex-col w-full">
      {/* Search & Bulk Action Bar */}
      <div className="px-4 py-3 border-b border-hairline bg-surface/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <div className="relative flex-1 min-w-[140px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search flashcards..."
              className="pl-9 h-9 text-xs sm:text-sm bg-surface-sunk"
            />
          </div>

          {filtered.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSelectAll(filtered)}
              className="text-xs h-9"
              title="Select / Deselect all"
            >
              <CheckSquare size={14} className="mr-1.5" />
              <span className="hidden sm:inline">Select All</span>
            </Button>
          )}

          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={promptDeleteBulk}
              className="text-xs h-9"
            >
              <Trash2 size={14} className="mr-1.5" />
              <span>Delete ({selectedIds.size})</span>
            </Button>
          )}

          <Button
            variant={hideAnswers ? "accent" : "outline"}
            size="sm"
            onClick={() => {
              setHideAnswers(!hideAnswers);
              setRevealedIds(new Set());
            }}
            className="text-xs h-9"
          >
            {hideAnswers ? <EyeOff size={14} className="mr-1.5" /> : <Eye size={14} className="mr-1.5" />}
            <span>{hideAnswers ? "Answers Hidden" : "Hide Answers"}</span>
          </Button>
        </div>
      </div>

      {/* Cards List */}
      <div className="flex-1 overflow-auto px-4 pb-12 pt-4 max-w-3xl mx-auto w-full space-y-6">
        {chapters.map((chapter) => (
          <div key={chapter} className="space-y-3">
            {chapters.length > 1 && (
              <h3 className="text-xs uppercase tracking-wider text-content-muted font-bold px-1 flex items-center gap-2">
                <span className="size-2 rounded-full bg-brand-600 dark:bg-brand-400" />
                {chapter}
              </h3>
            )}
            <div className="flex flex-col gap-3">
              {grouped[chapter].map((card, i) => {
                const isHidden = hideAnswers && !revealedIds.has(card.id);
                const isSelected = selectedIds.has(card.id);

                return (
                  <div
                    key={card.id}
                    className={`rounded-card border overflow-hidden shadow-card transition-all ${
                      isSelected
                        ? "border-brand-500 ring-2 ring-brand-500/20"
                        : "border-hairline bg-surface hover:border-brand-300"
                    }`}
                  >
                    {/* Front Question */}
                    <div className="p-4 bg-surface">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleSelectCard(card.id)}
                            className="text-content-muted hover:text-brand-600 transition-colors p-0.5"
                          >
                            {isSelected ? (
                              <CheckSquare size={16} className="text-brand-600" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                          <Badge variant="outline" className="text-[10px] font-mono uppercase">
                            #{i + 1} • {card.type}
                          </Badge>
                          {card.lesson && (
                            <span className="text-xs text-content-muted truncate max-w-[150px]">
                              {card.lesson}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => promptDeleteSingle(card)}
                          className="p-1 rounded text-content-muted hover:text-danger-600 hover:bg-danger-50 transition-colors"
                          title="Delete card"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="text-sm sm:text-base font-medium text-content leading-snug">
                        <MathFormattedText text={card.front} />
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-hairline" />

                    {/* Back Answer */}
                    <div
                      onClick={() => isHidden && toggleAnswer(card.id)}
                      className={`p-4 bg-surface-sunk transition-colors ${
                        isHidden ? "cursor-pointer hover:bg-surface-sunk/80" : ""
                      }`}
                    >
                      <p className="text-[11px] uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-1 font-bold flex items-center justify-between">
                        <span>Answer / Definition</span>
                        {isHidden && (
                          <span className="text-xs text-brand-500 font-normal">
                            Click to reveal
                          </span>
                        )}
                      </p>

                      {isHidden ? (
                        <p className="text-sm text-transparent select-none blur-[6px]">
                          {card.back}
                        </p>
                      ) : (
                        <div className="text-sm text-content-muted leading-relaxed whitespace-pre-line">
                          <MathFormattedText text={card.back} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-content-muted text-sm">
            No cards found matching "{search}"
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="rounded-card border border-hairline bg-surface w-full max-w-sm p-6 shadow-hero space-y-4">
            <div className="flex items-center gap-3 text-danger-600">
              <div className="p-2.5 rounded-card bg-danger-50 dark:bg-danger-950/40">
                <AlertTriangle size={22} />
              </div>
              <h3 className="text-base font-bold text-content">
                Delete {confirmModal.cardIds.length === 1 ? "Card" : `${confirmModal.cardIds.length} Cards`}?
              </h3>
            </div>

            <p className="text-sm text-content-muted leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-content">{confirmModal.description}</span>?
            </p>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={executeDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
