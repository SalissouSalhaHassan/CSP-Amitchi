"use client";

import React from "react";
import { Download, CheckCircle2, Smartphone } from "lucide-react";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { cn } from "@/lib/utils";

interface PWAInstallButtonProps {
  variant?: "header" | "sidebar" | "badge" | "compact";
  className?: string;
  showWhenInstalled?: boolean;
}

export function PWAInstallButton({
  variant = "compact",
  className,
  showWhenInstalled = false,
}: PWAInstallButtonProps) {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();

  if (isInstalled) {
    if (!showWhenInstalled) return null;
    return (
      <div className={cn("inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium", className)}>
        <CheckCircle2 className="w-4 h-4" />
        <span>Installée</span>
      </div>
    );
  }

  if (!canInstall && !isIOS) {
    return null;
  }

  if (variant === "sidebar") {
    return (
      <button
        onClick={() => promptInstall()}
        className={cn(
          "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 dark:text-indigo-300 border border-indigo-500/20 transition-all text-xs font-semibold cursor-pointer",
          className
        )}
      >
        <Download className="w-4 h-4 text-indigo-400 animate-pulse" />
        <span className="flex-1 text-left">Installer l'application</span>
        <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 uppercase font-mono">PWA</span>
      </button>
    );
  }

  if (variant === "header") {
    return (
      <button
        onClick={() => promptInstall()}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer",
          className
        )}
        title="Installer Edut Pro"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Installer l'app</span>
      </button>
    );
  }

  // Compact fallback
  return (
    <button
      onClick={() => promptInstall()}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-all cursor-pointer",
        className
      )}
      title="Installer Edut Pro sur votre appareil"
    >
      <Download className="w-3.5 h-3.5 text-indigo-400" />
      <span>Installer</span>
    </button>
  );
}
