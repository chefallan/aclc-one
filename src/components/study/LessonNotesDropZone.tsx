"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  Loader2,
  AlertCircle,
  FileText,
  X,
  PenLine,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractSmartTitle } from "@/lib/study/titleExtractor";

const SUPPORTED_EXTENSIONS = [
  ".pdf", ".docx", ".doc", ".pptx", ".ppt", ".txt", ".csv",
  ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"
];

interface LessonNotesDropZoneProps {
  value: string;
  onChange: (val: string) => void;
  onTitleChange?: (title: string) => void;
  onImagesExtracted?: (images: any[]) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function LessonNotesDropZone({
  value,
  onChange,
  onTitleChange,
  onImagesExtracted,
  placeholder = "Type or paste your lesson notes here...",
  rows = 7,
  className = "",
}: LessonNotesDropZoneProps) {
  // Two distinct panels: default is "file" (Upload File), alternative is "paste" (Paste Notes)
  const [panel, setPanel] = useState<"file" | "paste">("file");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    setError(null);

    // Check extension
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      setError(`Wrong file format (${ext}). Please upload a PDF, Word document, PowerPoint, text, or image file.`);
      return;
    }

    setFileName(file.name);
    const autoTitle = extractSmartTitle("", file.name);
    if (onTitleChange) {
      onTitleChange(autoTitle);
    }

    // Read plain text / CSV
    if (file.name.endsWith(".txt") || file.name.endsWith(".csv")) {
      try {
        const text = await file.text();
        onChange(text);
        return;
      } catch (err) {
        setError("Could not read text file. Please try pasting the notes instead.");
        return;
      }
    }

    // Transcribe multi-format document
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
        if (onTitleChange) {
          onTitleChange(extractSmartTitle(data.text, file.name));
        }
      }
      if (data.images && data.images.length > 0 && onImagesExtracted) {
        onImagesExtracted(data.images);
      }
    } catch (err: any) {
      console.error("Transcription error:", err);
      setError("Could not read this file format automatically. Please paste your lesson text in the Paste Notes tab.");
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
    <div className={`space-y-3 ${className}`}>
      {/* Two-Panel Selector Buttons */}
      <div className="flex rounded-lg border border-hairline bg-surface-sunk p-1 gap-1 w-full max-w-sm">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setPanel("file");
          }}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
            panel === "file"
              ? "bg-surface text-brand-800 dark:text-brand-300 shadow-sm font-bold"
              : "text-content-muted hover:text-content"
          }`}
        >
          <UploadCloud className="size-3.5" />
          <span>Upload File</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setPanel("paste");
          }}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
            panel === "paste"
              ? "bg-surface text-brand-800 dark:text-brand-300 shadow-sm font-bold"
              : "text-content-muted hover:text-content"
          }`}
        >
          <PenLine className="size-3.5" />
          <span>Paste Notes</span>
        </button>
      </div>

      {/* PANEL 1: UPLOAD FILE (DEFAULT) */}
      {panel === "file" && (
        <div className="space-y-2 animate-in fade-in duration-150">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.csv,.png,.jpg,.jpeg,.webp"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all flex flex-col items-center justify-center min-h-[160px] ${
              isDragging
                ? "border-brand-500 bg-brand-500/10 scale-[0.99]"
                : "border-hairline hover:border-brand-400 bg-surface-sunk/60 hover:bg-surface-sunk"
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2 text-brand-600 dark:text-brand-400">
                <Loader2 className="size-8 animate-spin" />
                <p className="text-sm font-medium">Reading your file...</p>
              </div>
            ) : fileName ? (
              <div className="flex flex-col items-center gap-2">
                <div className="size-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-content">{fileName}</p>
                  <p className="text-xs text-content-muted mt-0.5">File attached successfully. Click to replace file.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="size-10 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                  <UploadCloud className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-content">
                    {isDragging ? "Drop your file here" : "Click to upload or drag & drop a file"}
                  </p>
                  <p className="text-xs text-content-muted mt-0.5">
                    Supports PDF, Word, PowerPoint, Text, and Images
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PANEL 2: PASTE NOTES */}
      {panel === "paste" && (
        <div className="space-y-2 animate-in fade-in duration-150">
          <textarea
            rows={rows}
            value={value}
            onChange={(e) => {
              setError(null);
              onChange(e.target.value);
            }}
            placeholder={placeholder}
            className="w-full rounded-xl border border-hairline-strong bg-surface-sunk p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 font-sans text-content placeholder:text-content-faint leading-relaxed"
          />
        </div>
      )}

      {/* Error banner - only shown on invalid format or read error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs animate-in fade-in">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
