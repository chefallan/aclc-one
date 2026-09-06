"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileUp,
  X,
  FileSpreadsheet,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  placeholder = "Paste lesson notes, definitions, bullet points, or CSV content...",
  rows = 8,
  label = "Lesson Notes or CSV Content",
  className = "",
}: LessonNotesDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    setError(null);
    setFileName(file.name);
    const autoTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    if (onTitleChange) {
      onTitleChange(autoTitle);
    }

    // Direct text / CSV files
    if (file.name.endsWith(".txt") || file.name.endsWith(".csv")) {
      try {
        const text = await file.text();
        onChange(text);
        return;
      } catch (err) {
        setError("Failed to read text file directly.");
        return;
      }
    }

    // Multi-format transcription (PDF, DOCX, PPTX, Images)
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
        throw new Error(errData.error || "Failed to transcribe file.");
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
      setError(err.message || "Failed to transcribe document. You can still paste text manually.");
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
      const droppedFile = e.dataTransfer.files[0];
      processFile(droppedFile);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      processFile(selectedFile);
    }
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase text-content-muted">
          {label}
        </label>
        <div className="flex items-center gap-1.5 text-[11px] text-content-faint font-mono">
          <span>{value.length} chars</span>
          <span>•</span>
          <span>{value.trim() ? value.trim().split(/\s+/).length : 0} words</span>
        </div>
      </div>

      {/* Drop Zone Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition-all ${
          isDragging
            ? "border-brand-500 bg-brand-500/10 scale-[0.99]"
            : "border-hairline hover:border-brand-400 bg-surface-sunk/60 hover:bg-surface-sunk"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center justify-center py-2 gap-2 text-brand-600 dark:text-brand-400">
            <Loader2 className="size-6 animate-spin" />
            <p className="text-xs font-medium">
              Transcribing {fileName || "document"} and extracting diagrams...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-1 gap-1.5">
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
              <UploadCloud className="size-5" />
              <span className="text-xs font-semibold">
                Drop PDF, DOCX, PPTX, Image, TXT, or CSV file here
              </span>
            </div>
            <p className="text-[11px] text-content-muted">
              or <span className="underline font-medium text-content">browse files</span> from your computer to transcribe automatically
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1 pt-1">
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">.PDF</Badge>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">.DOCX</Badge>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">.PPTX</Badge>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">.TXT</Badge>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">.CSV</Badge>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">Images</Badge>
            </div>
          </div>
        )}

        {fileName && !uploading && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
            <CheckCircle2 className="size-3.5" />
            <span className="truncate max-w-[200px]">{fileName}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFileName(null);
              }}
              className="hover:opacity-75"
            >
              <X className="size-3" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Manual Paste Textarea */}
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-hairline-strong bg-surface-sunk p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 font-mono text-content"
      />
    </div>
  );
}
