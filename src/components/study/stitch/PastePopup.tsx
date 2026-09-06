"use client";

import React, { useState } from "react";
import { X, ClipboardPaste, Sparkles } from "lucide-react";

interface PastePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, text: string) => void;
}

export function PastePopup({ isOpen, onClose, onSubmit }: PastePopupProps) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#12151c] border border-[rgba(255,255,255,0.1)] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#161a23]">
          <h2 className="text-base font-bold text-[#eef0f6] flex items-center gap-2">
            <ClipboardPaste size={18} className="text-brand-400" />
            <span>Generate Smart Blanks from Notes</span>
          </h2>
          <button
            onClick={onClose}
            className="text-[#5e6880] hover:text-[#eef0f6] transition-colors p-1.5 rounded-lg hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex-1 flex flex-col min-h-0 gap-4 overflow-y-auto">
          <div>
            <label className="block text-xs uppercase font-bold tracking-wider text-[#5e6880] mb-1.5">
              Document / Chapter Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Operating Systems - Paging & Virtual Memory"
              className="w-full bg-[#1a1e28] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#eef0f6] focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <label className="block text-xs uppercase font-bold tracking-wider text-[#5e6880] mb-1">
              Lecture Notes or Study Text
            </label>
            <p className="text-xs text-[#9ba3b8] mb-2">
              Paste paragraphs of notes or study text. The Compromise NLP entity detector will intelligently locate prime concepts, dates, acronyms, and subject terms to blank out.
            </p>
            <textarea
              className="w-full flex-1 bg-[#1a1e28] border border-white/10 rounded-xl p-4 text-sm text-[#eef0f6] resize-none focus:outline-none focus:border-brand-500 transition-colors min-h-[220px]"
              placeholder="Paste text or lecture notes here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        </div>

        <div className="p-4 border-t border-white/10 bg-[#161a23] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (text.trim() && title.trim()) {
                onSubmit(title.trim(), text.trim());
                setText("");
                setTitle("");
              }
            }}
            disabled={!text.trim() || !title.trim()}
            className="px-5 py-2 rounded-xl text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md flex items-center gap-1.5"
          >
            <Sparkles size={16} />
            <span>Generate Smart Blanks</span>
          </button>
        </div>
      </div>
    </div>
  );
}
