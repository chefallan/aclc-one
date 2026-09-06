"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, Loader2, AlertCircle, FileText, X, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";

const SUPPORTED_EXTENSIONS = [
  ".pdf", ".docx", ".doc", ".pptx", ".ppt", ".txt", ".csv",
  ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"
];

interface LessonNotesDropZoneProps {
  value: string;
  onChange: (text: string) => void;
  onTitleChange?: (title: string) => void;
  onImagesExtracted?: (images: any[]) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
  className?: string;
}

export function LessonNotesDropZone({
  value,
  onChange,
  onTitleChange,
  onImagesExtracted,
  placeholder = "Paste your lesson notes, definitions, or drop a file here...",
  rows = 7,
  label = "Lesson Notes",
  className = "",
}: LessonNotesDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    setError(null);

    // Validate file extension
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      setError(`Unsupported file format (${ext}). Please upload a PDF, Word document, PowerPoint, text, or image file.`);
      return;
    }

    setFileName(file.name);
    const autoTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    if (onTitleChange) {
      onTitleChange(autoTitle);
    }

    // Direct text / CSV
    if (file.name.endsWith(".txt") || file.name.endsWith(".csv")) {
      try {
        const text = await file.text();
        onChange(text);
        return;
      } catch (err) {
        setError("Could not read text file. Please try copy-pasting the text instead.");
        return;
      }
    }

    // Transcribe document / image via backend
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/study/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to read document.");
      }

      const data = await res.json();
      if (data.text) {
        onChange(data.text);
      }
      if (data.images && data.images.length > 0 && onImagesExtracted) {
        onImagesExtracted(data.images);
      }
    } catch (err: any) {
      console.error("Transcription error:", err);
      setError("Could not read this file format automatically. Please paste your lesson text directly.");
    } finally {
      setUploading(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase text-content-muted">
          {label}
        </label>
        {fileName && !uploading && (
          <div className="inline-flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400">
            <FileText className="size-3.5" />
            <span className="truncate max-w-[200px]">{fileName}</span>
            <button
              type="button"
              onClick={() => {
                setFileName(null);
                setError(null);
              }}
              className="text-content-faint hover:text-content"
            >
              <X className="size-3" />
            </button>
          </div>
        )}
      </div>

      {/* Unified Drag & Drop Textarea Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-xl border transition-all ${
          isDragging
            ? "border-brand-500 bg-brand-500/10 ring-2 ring-brand-500/30"
            : "border-hairline-strong bg-surface-sunk"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.csv,.png,.jpg,.jpeg,.webp"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-brand-600 dark:text-brand-400">
            <Loader2 className="size-6 animate-spin" />
            <p className="text-xs font-medium">Reading file & extracting notes...</p>
          </div>
        ) : (
          <>
            <textarea
              rows={rows}
              value={value}
              onChange={(e) => {
                setError(null);
                onChange(e.target.value);
              }}
              placeholder={placeholder}
              className="w-full resize-y rounded-t-xl bg-transparent p-3.5 text-sm font-sans focus:outline-none text-content placeholder:text-content-faint leading-relaxed"
            />

            {/* Bottom Action Bar */}
            <div className="flex items-center justify-between border-t border-hairline px-3 py-2 text-xs text-content-muted">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-content-muted hover:text-content hover:bg-surface transition-colors font-medium"
              >
                <Paperclip className="size-3.5" />
                <span>Attach or drop file</span>
              </button>

              <span className="text-[11px] text-content-faint">
                {isDragging ? "Drop your file here" : "or paste text directly"}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Only show error when something actually goes wrong */}
      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs animate-in fade-in">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
