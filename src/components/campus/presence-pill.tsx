import { cn } from "@/lib/utils";

export interface PresenceView {
  status: string;
  label: string;
  detail: string;
  tone: "available" | "waiting" | "away" | "unknown";
  updatedAt: string | null;
  available: boolean;
}

const TONE_CLASS: Record<PresenceView["tone"], string> = {
  available: "bg-present-50 text-present-700 dark:bg-present-700/25 dark:text-present-50",
  waiting: "bg-late-50 text-late-700 dark:bg-late-700/25 dark:text-late-50",
  away: "bg-absent-100 text-absent-700 dark:bg-absent-900/40 dark:text-absent-300",
  unknown: "bg-slab-100 text-slab-600 dark:bg-slab-800 dark:text-slab-300",
};

export function PresencePill({
  presence,
  showDetail = false,
  className,
}: {
  presence: PresenceView;
  showDetail?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-col items-end gap-0.5", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
          TONE_CLASS[presence.tone]
        )}
      >
        <span aria-hidden className="size-1.5 rounded-full bg-current" />
        {presence.label}
      </span>
      {showDetail && presence.detail && (
        <span className="data text-[0.7rem] text-content-faint">{presence.detail}</span>
      )}
    </span>
  );
}
