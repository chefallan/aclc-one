"use client";

import * as React from "react";
import MathFormattedText from "@/components/study/MathFormattedText";

export function FormattedNoteText({ text, hideBold = false }: { text: string; hideBold?: boolean }) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  if (lines.length <= 1 && !text.includes("•") && !text.includes("|") && !text.includes(";")) {
    return (
      <div className="text-sm text-content-muted leading-relaxed">
        <MathFormattedText text={text} hideBold={hideBold} />
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
                const dashEnIdx = seg.indexOf(" – ");
                const dashHyIdx = seg.indexOf(" - ");
                const equalIdx = seg.indexOf(" = ");

                let label = "";
                let value = "";
                let separator = "";

                if (colonIdx > 0 && colonIdx < 40) {
                  label = seg.slice(0, colonIdx).trim();
                  value = seg.slice(colonIdx + 1).trim();
                  separator = ":";
                } else if (dashEnIdx > 0 && dashEnIdx < 40) {
                  label = seg.slice(0, dashEnIdx).trim();
                  value = seg.slice(dashEnIdx + 3).trim();
                  separator = "–";
                } else if (dashHyIdx > 0 && dashHyIdx < 40) {
                  label = seg.slice(0, dashHyIdx).trim();
                  value = seg.slice(dashHyIdx + 3).trim();
                  separator = "-";
                } else if (equalIdx > 0 && equalIdx < 40) {
                  label = seg.slice(0, equalIdx).trim();
                  value = seg.slice(equalIdx + 3).trim();
                  separator = "=";
                }

                if (label && value) {
                  const boldLabelText = label.includes("**") ? label : `**${label}**`;
                  return (
                    <span key={sIdx} className="inline-flex items-baseline gap-1">
                      <span className="font-semibold text-content">
                        <MathFormattedText text={boldLabelText} hideBold={hideBold} /> {separator}
                      </span>
                      <span>
                        <MathFormattedText text={value} hideBold={hideBold} />
                      </span>
                    </span>
                  );
                }

                return (
                  <span key={sIdx}>
                    <MathFormattedText text={seg} hideBold={hideBold} />
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

