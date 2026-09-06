'use client';

import React, { useState } from 'react';
import { Image as ImageIcon, Search, ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface DeckImage {
  id?: string;
  title: string;
  caption?: string;
  dataUrl: string;
}

interface DeckImageGalleryProps {
  images: DeckImage[];
  deckTitle?: string;
}

export function DeckImageGallery({ images, deckTitle }: DeckImageGalleryProps) {
  const [search, setSearch] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const safeImages = images || [];
  const filtered = safeImages.filter(
    (img) =>
      !search ||
      img.title.toLowerCase().includes(search.toLowerCase()) ||
      (img.caption && img.caption.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h2 className="text-lg font-bold text-content flex items-center gap-2">
            <ImageIcon className="size-5 text-brand-600" />
            <span>Diagram & Figure Gallery</span>
          </h2>
          <p className="text-xs text-content-muted">
            {images.length} extracted visual diagrams and uploaded illustrations
          </p>
        </div>

        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search figures..."
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-hairline rounded-card text-content-muted text-sm">
          {images.length === 0
            ? 'No visual diagrams extracted for this deck yet. Upload a PPTX, DOCX, or image to generate diagrams.'
            : `No figures matching "${search}"`}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((img, idx) => (
            <div
              key={idx}
              onClick={() => {
                setLightboxIndex(idx);
                setZoomLevel(1);
              }}
              className="group rounded-card border border-hairline bg-surface overflow-hidden shadow-card hover:border-brand-500 transition-all cursor-pointer flex flex-col"
            >
              <div className="relative aspect-video bg-surface-sunk overflow-hidden flex items-center justify-center">
                <img
                  src={img.dataUrl}
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                  <ZoomIn size={16} />
                  <span>View Figure</span>
                </div>
              </div>
              <div className="p-3">
                <h4 className="text-sm font-semibold text-content truncate">{img.title}</h4>
                {img.caption && (
                  <p className="text-xs text-content-muted truncate mt-0.5">{img.caption}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && filtered[lightboxIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={20} />
          </button>

          <div className="relative max-w-4xl max-h-[85vh] flex flex-col items-center">
            <img
              src={filtered[lightboxIndex].dataUrl}
              alt={filtered[lightboxIndex].title}
              style={{ transform: `scale(${zoomLevel})` }}
              className="max-h-[70vh] max-w-full object-contain rounded-lg transition-transform duration-200"
            />
            <div className="mt-4 text-center text-white space-y-1">
              <h3 className="text-base font-bold">{filtered[lightboxIndex].title}</h3>
              {filtered[lightboxIndex].caption && (
                <p className="text-xs text-zinc-400">{filtered[lightboxIndex].caption}</p>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 mt-4 bg-white/10 px-4 py-2 rounded-full">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                className="text-white hover:text-brand-300 transition-colors p-1"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs text-white font-mono">{Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                className="text-white hover:text-brand-300 transition-colors p-1"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
