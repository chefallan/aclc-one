'use client';

import React, { useState, useRef } from 'react';
import { Upload, Loader2, Sparkles, X, CheckCircle2, FileText, Image as ImageIcon, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CLAUDE_PROMPT_TEMPLATE, CLAUDE_NOTES_PROMPT_TEMPLATE } from '@/lib/study/claude-prompts';
import { parseCSVFile } from '@/lib/study/csvParser';
import type { Deck, Card } from '@/lib/study/types';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeckCreated: (deck: Deck, cards: Card[]) => void;
}

export function DocumentUploadModal({ isOpen, onClose, onDeckCreated }: DocumentUploadModalProps) {
  const [tab, setTab] = useState<'upload' | 'ai_prompt' | 'notes_prompt'>('upload');
  const [deckTitle, setDeckTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [extractedImages, setExtractedImages] = useState<any[]>([]);
  const [csvContent, setCsvContent] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedNotesPrompt, setCopiedNotesPrompt] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  async function handleFileUpload(selectedFile: File) {
    setFile(selectedFile);
    setError('');
    const autoName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    if (!deckTitle) setDeckTitle(autoName);

    // If it's directly a CSV file, parse instantly
    if (selectedFile.name.endsWith('.csv')) {
      const text = await selectedFile.text();
      setCsvContent(text);
      return;
    }

    // Transcribe .docx, .pdf, .pptx, images via backend transcriber
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/study/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setTranscribedText(data.text || '');
        setExtractedImages(data.images || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Transcription failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateAI() {
    if (!transcribedText && !csvContent) {
      setError('Please upload a document or paste text first');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/study/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: transcribedText || csvContent,
          title: deckTitle || 'Generated Study Deck',
          mode: 'flashcards',
        }),
      });

      const data = await res.json();
      if (!data.success || !data.cards) {
        throw new Error(data.error || 'Generation failed');
      }

      const deck: Deck = {
        id: `deck-${Date.now()}`,
        title: deckTitle || 'AI Study Deck',
        subject: 'General',
        totalCards: data.cards.length,
        createdAt: new Date().toISOString(),
        images: extractedImages,
      };

      onDeckCreated(deck, data.cards);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'AI Generation failed. Check API key or paste generated CSV.');
    } finally {
      setLoading(false);
    }
  }

  function handleImportCSV() {
    if (!csvContent.trim()) {
      setError('Please paste CSV content');
      return;
    }

    try {
      const { deck, cards } = parseCSVFile(csvContent, deckTitle || 'Imported Deck');
      if (extractedImages.length > 0) {
        deck.images = extractedImages;
      }
      onDeckCreated(deck, cards);
      onClose();
    } catch (err: any) {
      setError('Failed to parse CSV: ' + err.message);
    }
  }

  const copyToClipboard = (text: string, isNotes = false) => {
    navigator.clipboard.writeText(text);
    if (isNotes) {
      setCopiedNotesPrompt(true);
      setTimeout(() => setCopiedNotesPrompt(false), 2000);
    } else {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="rounded-card border border-hairline bg-surface w-full max-w-2xl max-h-[90vh] flex flex-col shadow-hero">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-field bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-content">Create Flashcards & Study Deck</h2>
              <p className="text-xs text-content-muted">
                Transcribe documents, parse CSV, or prompt AI into flashcards
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-field text-content-muted hover:text-content hover:bg-surface-sunk transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-hairline bg-surface-sunk/50 px-6 pt-2 gap-2">
          <button
            onClick={() => setTab('upload')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
              tab === 'upload'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            📄 Upload & Transcribe
          </button>
          <button
            onClick={() => setTab('ai_prompt')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
              tab === 'ai_prompt'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            ✨ Full Quiz Prompt (Claude/GPT)
          </button>
          <button
            onClick={() => setTab('notes_prompt')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
              tab === 'notes_prompt'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            📝 Notes Only Prompt
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-field bg-danger-50 dark:bg-danger-950/40 border border-danger-200 text-xs text-danger-700 dark:text-danger-300">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="eyebrow block">Deck Title</label>
            <Input
              type="text"
              value={deckTitle}
              onChange={(e) => setDeckTitle(e.target.value)}
              placeholder="e.g. Web Development - Chapter 4"
              className="h-10 text-sm"
            />
          </div>

          {tab === 'upload' && (
            <div className="space-y-4">
              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-hairline rounded-card p-6 text-center hover:border-brand-500 hover:bg-brand-50/20 transition-all cursor-pointer bg-surface-sunk/30"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.pdf,.docx,.doc,.pptx,.ppt,.txt,image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400">
                    <Upload className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-content">
                      {file ? file.name : 'Click or drop document to transcribe'}
                    </p>
                    <p className="text-xs text-content-muted mt-1">
                      Supports PDF, PPTX (with diagrams), DOCX, CSV, TXT, and Images
                    </p>
                  </div>
                </div>
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-2 p-4 text-sm text-brand-600">
                  <Loader2 className="size-5 animate-spin" />
                  <span>Transcribing document and extracting diagrams...</span>
                </div>
              )}

              {extractedImages.length > 0 && (
                <div className="p-3 rounded-card bg-surface-sunk border border-hairline">
                  <p className="text-xs font-semibold text-content flex items-center gap-1.5 mb-2">
                    <ImageIcon className="size-4 text-brand-600" />
                    <span>Extracted {extractedImages.length} figures & diagrams into gallery</span>
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {extractedImages.slice(0, 5).map((img, i) => (
                      <img
                        key={i}
                        src={img.dataUrl}
                        alt={img.title}
                        className="size-14 rounded object-cover border border-hairline"
                      />
                    ))}
                  </div>
                </div>
              )}

              {transcribedText && (
                <div className="space-y-1.5">
                  <label className="eyebrow block">Transcribed Text Preview</label>
                  <textarea
                    value={transcribedText}
                    onChange={(e) => setTranscribedText(e.target.value)}
                    rows={4}
                    className="w-full text-xs font-mono p-3 rounded-field border border-hairline bg-surface-sunk text-content focus:outline-none focus:border-brand-500"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="eyebrow block">Or Paste CSV / Text Directly</label>
                <textarea
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder="front,back,chapter,subject,lesson,type..."
                  rows={4}
                  className="w-full text-xs font-mono p-3 rounded-field border border-hairline bg-surface-sunk text-content focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          )}

          {tab === 'ai_prompt' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-content">
                  Claude / GPT-4 15-Column Full Quiz Prompt
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(CLAUDE_PROMPT_TEMPLATE)}
                  className="text-xs h-7"
                >
                  {copiedPrompt ? <Check className="size-3.5 mr-1" /> : <Copy className="size-3.5 mr-1" />}
                  {copiedPrompt ? 'Copied!' : 'Copy Prompt'}
                </Button>
              </div>
              <textarea
                readOnly
                value={CLAUDE_PROMPT_TEMPLATE}
                rows={10}
                className="w-full text-[11px] font-mono p-3 rounded-field border border-hairline bg-surface-sunk text-content-muted select-all"
              />
            </div>
          )}

          {tab === 'notes_prompt' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-content">
                  Claude / GPT-4 Notes Only Active Recall Prompt
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(CLAUDE_NOTES_PROMPT_TEMPLATE, true)}
                  className="text-xs h-7"
                >
                  {copiedNotesPrompt ? <Check className="size-3.5 mr-1" /> : <Copy className="size-3.5 mr-1" />}
                  {copiedNotesPrompt ? 'Copied!' : 'Copy Prompt'}
                </Button>
              </div>
              <textarea
                readOnly
                value={CLAUDE_NOTES_PROMPT_TEMPLATE}
                rows={10}
                className="w-full text-[11px] font-mono p-3 rounded-field border border-hairline bg-surface-sunk text-content-muted select-all"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-hairline bg-surface-sunk/30">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {csvContent ? (
              <Button variant="accent" size="sm" onClick={handleImportCSV}>
                Import CSV
              </Button>
            ) : (
              <Button
                variant="accent"
                size="sm"
                onClick={handleGenerateAI}
                disabled={loading || (!transcribedText && !file)}
              >
                {loading ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Sparkles className="size-4 mr-1.5" />}
                Generate Flashcards with AI
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
