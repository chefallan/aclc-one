"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface TopBarProps {
  title: string;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
}

export function TopBar({ title, onBack, rightSlot }: TopBarProps) {
  const router = useRouter();

  return (
    <header className="h-14 rounded-lg border border-hairline bg-surface/90 backdrop-blur-md px-4 flex items-center gap-3 sticky top-2 z-40 shadow-sm">
      <button
        type="button"
        onClick={onBack || (() => router.back())}
        className="flex items-center gap-1 text-sm text-content-muted hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft size={18} />
        <span className="font-medium">Back</span>
      </button>
      <h1 className="text-base font-semibold truncate flex-1 text-content">
        {title}
      </h1>
      {rightSlot && <div className="flex items-center gap-1">{rightSlot}</div>}
    </header>
  );
}
