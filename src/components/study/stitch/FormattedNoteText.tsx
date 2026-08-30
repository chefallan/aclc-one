"use client";

import * as React from "react";

export function FormattedNoteText({ text }: { text: string }) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  if (lines.length <= 1 && !text.includes("•") && !text.includes("|") && !text.includes(";")) {
    return (
      <div className="text-sm text-content-muted leading-relaxed">
        {text}
      </div>
    );
  }

  const items: string[] = [];
  for (const line of lines) {
    if (line.includes("•")) {
      const parts = line.split("•").map((p) => p.trim()).filter(Boolean);
      items.push(...parts);
    } else {
      items.push(line);
    }
  }

  return (
    <div className="space-y-2 pt-1">
      {items.map((item, idx) => {
        const segments = item.split("|").map((s) => s.trim()).filter(Boolean);

        return (
          <div key={idx} className="flex items-start gap-2 text-sm text-content-muted leading-relaxed">
            <span className="text-brand-500 font-bold select-none">•</span>
            <div className="flex-1 flex flex-wrap gap-x-3 gap-y-1">
              {segments.map((seg, sIdx) => {
                const colonIdx = seg.indexOf(":");
                const dashIdx = seg.indexOf(" – ") !== -1 ? seg.indexOf(" – ") : seg.indexOf(" - ");

                if (colonIdx > 0 && colonIdx < 30) {
                  const label = seg.slice(0, colonIdx).trim();
                  const value = seg.slice(colonIdx + 1).trim();
                  return (
                    <span key={sIdx} className="inline-flex items-baseline gap-1">
                      <strong className="text-content font-bold">{label}:</strong>
                      <span>{value}</span>
                    </span>
                  );
                } else if (dashIdx > 0) {
                  const label = seg.slice(0, dashIdx).trim();
                  const value = seg.slice(dashIdx + 3).trim();
                  return (
                    <span key={sIdx} className="inline-flex items-baseline gap-1">
                      <strong className="text-content font-bold">{label} –</strong>
                      <span>{value}</span>
                    </span>
                  );
                }

                return <span key={sIdx}>{seg}</span>;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
