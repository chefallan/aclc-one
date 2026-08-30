"use client";

interface StatBadgeProps {
  label: string;
  value: string | number;
  color: "know" | "dontknow" | "mastered" | "new" | "accent" | "muted";
}

const colorMap: Record<StatBadgeProps["color"], { bg: string; text: string }> = {
  know: { bg: "rgba(52, 211, 153, 0.13)", text: "#34d399" },
  dontknow: { bg: "rgba(248, 113, 113, 0.13)", text: "#f87171" },
  mastered: { bg: "rgba(251, 191, 36, 0.13)", text: "#fbbf24" },
  new: { bg: "rgba(129, 140, 248, 0.13)", text: "#818cf8" },
  accent: { bg: "rgba(79, 142, 247, 0.12)", text: "#4f8ef7" },
  muted: { bg: "rgba(255, 255, 255, 0.05)", text: "#9ba3b8" },
};

export function StatBadge({ label, value, color }: StatBadgeProps) {
  const colors = colorMap[color] || colorMap.muted;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {value !== "" && value !== undefined && value !== null && <strong>{value}</strong>}
      <span>{label}</span>
    </span>
  );
}
