"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, PlusCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudyTabsProps {
  className?: string;
  activeTab?: "library" | "create" | "buddies";
  onTabChange?: (tab: "library" | "create" | "buddies") => void;
}

export function StudyTabs({ className, activeTab, onTabChange }: StudyTabsProps) {
  const pathname = usePathname();

  const isLibrary = activeTab ? activeTab === "library" : pathname.startsWith("/dashboard/library");
  const isCreate = activeTab ? activeTab === "create" : pathname.startsWith("/dashboard/create-deck") || pathname.startsWith("/dashboard/notes");
  const isBuddies = activeTab ? activeTab === "buddies" : pathname.startsWith("/dashboard/study-buddy");

  return (
    <nav
      aria-label="Study"
      className={cn(
        "flex gap-1 rounded-field border border-hairline bg-surface-sunk p-1 w-full",
        className
      )}
    >
      {/* 1. Library Tab */}
      {onTabChange ? (
        <button
          type="button"
          onClick={() => onTabChange("library")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-[0.4rem] px-3 py-2 text-center text-sm font-medium transition-colors squishy-btn",
            isLibrary
              ? "bg-surface text-brand-800 shadow-card dark:text-brand-200"
              : "text-content-muted hover:text-content"
          )}
        >
          <BookOpen className="size-4" />
          <span>Library</span>
        </button>
      ) : (
        <Link
          href="/dashboard/library"
          aria-current={isLibrary ? "page" : undefined}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-[0.4rem] px-3 py-2 text-center text-sm font-medium transition-colors",
            isLibrary
              ? "bg-surface text-brand-800 shadow-card dark:text-brand-200"
              : "text-content-muted hover:text-content"
          )}
        >
          <BookOpen className="size-4" />
          <span>Library</span>
        </Link>
      )}

      {/* 2. Create Flashcards Tab (In the Middle) */}
      {onTabChange ? (
        <button
          type="button"
          onClick={() => onTabChange("create")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-[0.4rem] px-3 py-2 text-center text-sm font-medium transition-colors squishy-btn",
            isCreate
              ? "bg-surface text-brand-800 shadow-card dark:text-brand-200"
              : "text-content-muted hover:text-content"
          )}
        >
          <PlusCircle className="size-4" />
          <span>Create Flashcards</span>
        </button>
      ) : (
        <Link
          href="/dashboard/notes"
          aria-current={isCreate ? "page" : undefined}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-[0.4rem] px-3 py-2 text-center text-sm font-medium transition-colors",
            isCreate
              ? "bg-surface text-brand-800 shadow-card dark:text-brand-200"
              : "text-content-muted hover:text-content"
          )}
        >
          <PlusCircle className="size-4" />
          <span>Create Flashcards</span>
        </Link>
      )}

      {/* 3. Buddies Tab */}
      {onTabChange ? (
        <button
          type="button"
          onClick={() => onTabChange("buddies")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-[0.4rem] px-3 py-2 text-center text-sm font-medium transition-colors squishy-btn",
            isBuddies
              ? "bg-surface text-brand-800 shadow-card dark:text-brand-200"
              : "text-content-muted hover:text-content"
          )}
        >
          <Users className="size-4" />
          <span>Buddies</span>
        </button>
      ) : (
        <Link
          href="/dashboard/study-buddy"
          aria-current={isBuddies ? "page" : undefined}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-[0.4rem] px-3 py-2 text-center text-sm font-medium transition-colors",
            isBuddies
              ? "bg-surface text-brand-800 shadow-card dark:text-brand-200"
              : "text-content-muted hover:text-content"
          )}
        >
          <Users className="size-4" />
          <span>Buddies</span>
        </Link>
      )}
    </nav>
  );
}
