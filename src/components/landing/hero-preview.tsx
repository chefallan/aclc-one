import { MapPin, BookOpen, NotebookPen, Sparkles, Briefcase, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The home screen as the objective image.
 *
 * This is a picture of the product, so it does not follow the reader's theme —
 * a photograph of a screen does not invert when you turn the lights off. Every
 * colour inside the plate is a fixed literal forming one self-contained light
 * palette, which is why they are written as hex rather than theme tokens.
 *
 * The earlier version mixed the two: a hardcoded white ground with themed
 * `text-content` on top. That reads correctly in light mode and turns into
 * white-on-white the moment the reader's OS is set to dark.
 *
 * Only the caption below the plate uses a theme token, because it sits on the
 * page rather than inside the figure.
 *
 * Static and illustrative. The landing page is public, so there is no session
 * and nothing live to read.
 */
const INK = "#0a1b33";
const INK_MUTED = "#4c586d";
const INK_FAINT = "#7c88a0";

const SHORTCUTS = [
  { icon: MapPin, label: "Find a staff" },
  { icon: BookOpen, label: "Library" },
  { icon: NotebookPen, label: "Notes" },
  { icon: Sparkles, label: "Study Buddy" },
  { icon: Briefcase, label: "Immersion" },
  { icon: QrCode, label: "My code" },
];

export function HeroPreview({ className }: { className?: string }) {
  return (
    <figure className={cn("m-0", className)}>
      <div className="border bg-white" style={{ borderColor: INK, color: INK }}>
        <div
          className="flex items-center justify-between border-b px-3 py-2"
          style={{ borderColor: INK }}
        >
          <span className="data text-[0.6rem] uppercase tracking-[0.16em]">Student · Home</span>
          <span className="data text-[0.6rem]" style={{ color: INK_FAINT }}>
            09:41
          </span>
        </div>

        <div className="space-y-2.5 p-3">
          {/* Up next owns the top, with the single action attached to it. */}
          <div className="border p-3 text-white" style={{ backgroundColor: INK, borderColor: INK }}>
            <p className="data text-[0.58rem] uppercase tracking-[0.16em] text-white/70">
              Up next · 40 min
            </p>
            <p className="mt-1.5 text-[0.95rem] font-semibold leading-tight">
              Systems Integration &amp; Architecture
            </p>
            <p className="data mt-1 text-[0.66rem] text-white/70">1:00–4:00 PM · RM 304</p>
            <div className="mt-3 flex h-9 items-center justify-center gap-1.5 bg-brand-600 text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-white">
              <QrCode className="size-3.5" />
              Check in
            </div>
          </div>

          <div className="grid grid-cols-3 border-l border-t" style={{ borderColor: INK }}>
            {SHORTCUTS.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center gap-1 border-b border-r px-1 py-2.5 text-center"
                style={{ borderColor: INK }}
              >
                <s.icon className="size-4" strokeWidth={1.75} style={{ color: INK }} />
                <span
                  className="text-[0.58rem] font-medium leading-tight"
                  style={{ color: INK_MUTED }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 border-l border-t" style={{ borderColor: INK }}>
            <div className="border-b border-r p-2.5" style={{ borderColor: INK }}>
              <p
                className="data text-[0.55rem] uppercase tracking-[0.14em]"
                style={{ color: INK_MUTED }}
              >
                Attendance
              </p>
              <p className="data mt-1 text-xl font-semibold leading-none">
                94<span className="text-[0.7rem]">%</span>
              </p>
            </div>
            <div className="border-b border-r p-2.5" style={{ borderColor: INK }}>
              <p
                className="data text-[0.55rem] uppercase tracking-[0.14em]"
                style={{ color: INK_MUTED }}
              >
                Immersion hours
              </p>
              <p className="data mt-1 text-xl font-semibold leading-none">
                62.5<span className="text-[0.7rem]" style={{ color: INK_FAINT }}>/80</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <figcaption className="data mt-2 text-[0.6rem] uppercase tracking-[0.16em] text-content-muted">
        Fig. 1 — Student home screen, illustrative
      </figcaption>
    </figure>
  );
}
