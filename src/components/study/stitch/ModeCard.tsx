"use client";

import * as React from "react";
import { LucideIcon } from "lucide-react";

export interface ModeCardProps {
  icon: React.ReactNode | LucideIcon;
  title?: string;
  label?: string;
  description: string;
  color?: string;
  href?: string;
  count?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function ModeCard({
  icon,
  title,
  label,
  description,
  color = "#4f8ef7",
  count,
  disabled = false,
  onClick,
}: ModeCardProps) {
  const displayTitle = title || label || "Study Mode";

  // Check if icon is an already instantiated React element vs a component function/class
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    const IconComponent = icon as React.ComponentType<{ size?: number; className?: string }>;
    return <IconComponent size={24} />;
  };

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`group select-none cursor-pointer rounded-2xl p-5 border transition-all duration-300 glass-panel border-[rgba(255,255,255,0.07)] flex flex-col justify-between h-full hover:scale-[1.02] active:scale-[0.98] ${
        disabled
          ? "opacity-40 pointer-events-none bg-[#12151c]/50"
          : "hover:border-[#4f8ef7]/50 hover:shadow-[0_0_20px_rgba(79,142,247,0.15)] bg-[#12151c]/80"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="size-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-sm text-[#4f8ef7]"
          style={{ backgroundColor: `${color}18`, color }}
        >
          {renderIcon()}
        </div>
        {count && (
          <span className="text-[0.68rem] font-bold px-2.5 py-1 rounded-full bg-[#1a1e28] border border-[rgba(255,255,255,0.07)] text-[#9ba3b8]">
            {count}
          </span>
        )}
      </div>

      <div className="mt-4 space-y-1">
        <h3 className="font-bold text-base leading-snug text-[#eef0f6] group-hover:text-[#4f8ef7] transition-colors">
          {displayTitle}
        </h3>
        <p className="text-xs text-[#9ba3b8] line-clamp-2 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="pt-3 mt-3 border-t border-[rgba(255,255,255,0.07)] flex items-center justify-between text-xs font-bold text-[#4f8ef7]">
        <span>Start Mode</span>
        <span className="group-hover:translate-x-1 transition-transform">→</span>
      </div>
    </div>
  );
}
