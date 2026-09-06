interface QuizProgressBarProps {
  current: number;
  total: number;
  correct?: number;
  wrong?: number;
  score?: number;
}

export function QuizProgressBar({
  current,
  total,
  correct = 0,
  wrong = 0,
  score,
}: QuizProgressBarProps) {
  const displayScore = score !== undefined ? score : correct;
  const progressPct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs font-semibold">
        <span className="text-[#9ba3b8]">
          Question <span className="text-[#eef0f6]">{current}</span> of{" "}
          <span className="text-[#eef0f6]">{total}</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[#34d399] font-bold">✓ {displayScore} correct</span>
          {wrong > 0 && <span className="text-[#f87171] font-bold">✗ {wrong} wrong</span>}
        </div>
      </div>
      <div className="w-full h-2 bg-[#1a1e28] rounded-full overflow-hidden border border-[rgba(255,255,255,0.06)]">
        <div
          className="h-full bg-gradient-to-r from-[#4f8ef7] to-[#34d399] rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
        />
      </div>
    </div>
  );
}
