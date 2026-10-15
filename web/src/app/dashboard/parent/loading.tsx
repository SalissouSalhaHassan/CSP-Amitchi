import React from "react";
import { Smartphone } from "lucide-react";

export default function Loading() {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-[#131622] rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-2">
            <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-3 w-64 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
          </div>
        </div>
        <div className="h-10 w-40 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-2">
        <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>

      {/* Hero Banner Skeleton */}
      <div className="h-40 rounded-[2.5rem] bg-indigo-200 dark:bg-indigo-950/40" />

      {/* Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-3xl bg-white dark:bg-[#131622] border border-slate-100 dark:border-slate-800 p-5 space-y-3">
            <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-6 w-16 bg-slate-300 dark:bg-slate-700 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
