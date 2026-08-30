"use client";

import { CheckCircle2, XCircle } from "lucide-react";

export type MCOptionState = "default" | "selected" | "correct" | "wrong" | "reveal";

interface MCOptionProps {
  label: string;
  text: string;
  state: MCOptionState;
  onClick: () => void;
  disabled: boolean;
}

const stateStyles: Record<MCOptionState, string> = {
  default: "bg-surface border-hairline text-content hover:border-brand-400",
  selected: "bg-brand-50/70 dark:bg-brand-950/40 border-brand-500 text-content",
  correct: "bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold",
  wrong: "bg-rose-500/15 border-rose-500 text-rose-900 dark:text-rose-200",
  reveal: "bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold",
};

export function MCOption({
  label,
  text,
  state,
  onClick,
  disabled,
}: MCOptionProps) {
  const showIcon = state === "correct" || state === "reveal" || state === "wrong";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl p-4 flex items-center gap-3.5 border-2 transition-all duration-200 text-left squishy-btn ${
        stateStyles[state]
      } ${disabled ? "pointer-events-none" : ""}`}
    >
      <span className="w-8 h-8 rounded-full bg-surface-sunk border border-hairline flex items-center justify-center text-xs font-bold shrink-0">
        {label}
      </span>
      <span className="flex-1 text-sm font-medium leading-snug">
        {text}
      </span>
      {showIcon && (state === "correct" || state === "reveal") && (
        <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
      )}
      {state === "wrong" && (
        <XCircle size={20} className="text-rose-500 shrink-0" />
      )}
    </button>
  );
}
