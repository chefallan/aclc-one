"use client";

interface QuizProgressBarProps {
  current: number;
  total: number;
  correct: number;
  wrong: number;
}

export function QuizProgressBar({
  current,
  total,
  correct,
  wrong,
}: QuizProgressBarProps) {
  const progressPct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="w-full space-y-1.5 px-1">
      <div className="flex justify-between text-xs font-bold text-content-muted">
        <span>Question {current} of {total}</span>
        <div className="flex gap-3">
          <span className="text-emerald-600">✓ {correct}</span>
          <span className="text-rose-600">✗ {wrong}</span>
        </div>
      </div>
      <div className="w-full h-2 rounded-full bg-surface-sunk overflow-hidden border border-hairline">
        <div
          className="h-full bg-brand-500 transition-all duration-300 rounded-full"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}
