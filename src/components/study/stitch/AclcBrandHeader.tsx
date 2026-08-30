"use client";

import React from "react";
import { ShieldCheck, GraduationCap } from "lucide-react";

export function AclcBrandHeader() {
  return (
    <div className="rounded-[2.5rem] bg-[#0B1A2E] text-white p-6 md:p-8 shadow-xl relative overflow-hidden border border-[#132340]">
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#C9922A]/20 via-[#0052ff]/15 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-[#C9922A]/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-gradient-to-br from-[#132340] to-[#0B1A2E] border-2 border-[#C9922A] p-2 flex items-center justify-center shadow-lg shrink-0">
            <GraduationCap className="size-8 text-[#E8B44A]" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[0.68rem] font-bold uppercase tracking-widest bg-[#C9922A]/20 text-[#E8B44A] px-2.5 py-0.5 rounded-full border border-[#C9922A]/40">
                ACLC College of Ormoc
              </span>
              <span className="text-xs text-slate-400 font-medium">· Academic Study Portal</span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white">
              Integrated StudyUp & Active Recall System
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#132340]/90 px-3.5 py-2 rounded-2xl border border-slate-700/60 text-xs">
          <ShieldCheck className="size-4 text-emerald-400" />
          <span className="text-slate-300 font-semibold">Faculty Verified 2026</span>
        </div>
      </div>
    </div>
  );
}
