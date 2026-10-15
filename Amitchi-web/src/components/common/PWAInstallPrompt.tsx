"use client";

import React, { useState, useEffect } from "react";
import { 
  Download, 
  Smartphone, 
  X, 
  Share2, 
  PlusSquare, 
  Zap, 
  WifiOff, 
  Bell, 
  ArrowRight,
  Sparkles,
  ChevronUp
} from "lucide-react";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { cn } from "@/lib/utils";

export function PWAInstallPrompt() {
  const {
    canInstall,
    isInstalled,
    isIOS,
    showBanner,
    showIOSGuide,
    promptInstall,
    snooze,
    dismissPermanently,
    setShowIOSGuide,
  } = usePWAInstall();

  const [isArabic, setIsArabic] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const lang = document.documentElement.lang || "";
      const dir = document.documentElement.dir || "";
      setIsArabic(lang.startsWith("ar") || dir === "rtl");
    }
  }, []);

  if (isInstalled || !showBanner) {
    return null;
  }

  return (
    <>
      {/* ── Main PWA Floating Installation Banner ── */}
      <div 
        className={cn(
          "fixed bottom-6 left-6 z-50 max-w-md w-[calc(100vw-3rem)] sm:w-[420px] transition-all duration-500 print:hidden",
          "animate-in slide-in-from-bottom-6 fade-in-0 duration-300"
        )}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="relative overflow-hidden rounded-3xl bg-slate-900/90 dark:bg-[#0f131f]/95 backdrop-blur-2xl border border-indigo-500/30 dark:border-indigo-500/20 shadow-2xl shadow-indigo-950/60 p-5 text-slate-100">
          {/* Ambient glowing accent behind banner */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Header Row */}
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              {/* Brand App Icon */}
              <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 shadow-lg shadow-indigo-500/30 shrink-0 ring-2 ring-white/10">
                <span className="text-xl font-black text-white tracking-wider">E</span>
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-slate-900">
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-white tracking-tight">
                    Edut Pro
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    PWA App
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  {isArabic ? "تطبيق الويب التقدمي المعتمد" : "Application Web Progressive Officielle"}
                </p>
              </div>
            </div>

            {/* Close & Minimize buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
                title={isMinimized ? "Agrandir" : "Réduire"}
              >
                <ChevronUp className={cn("w-4 h-4 transition-transform duration-300", !isMinimized && "rotate-180")} />
              </button>
              <button
                onClick={() => snooze(3)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
                title={isArabic ? "إغلاق مؤقتاً" : "Fermer temporairement"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Expandable Content Body */}
          {!isMinimized && (
            <div className="mt-3.5 space-y-3 relative z-10">
              <p className="text-xs text-slate-300 leading-relaxed">
                {isArabic
                  ? "ثبّت التطبيق على جهازك للوصول السريع، والعمل بسلاسة دون اتصال بالإنترنت، وتلقي الإشعارات الفورية."
                  : "Installez l'application sur votre écran d'accueil pour un accès instantané, une utilisation fluide hors-ligne et des alertes directes."}
              </p>

              {/* Benefit Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium bg-white/5 border border-white/10 text-slate-300">
                  <Zap className="w-3 h-3 text-amber-400" />
                  {isArabic ? "وصول فوري" : "Accès instantané"}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium bg-white/5 border border-white/10 text-slate-300">
                  <WifiOff className="w-3 h-3 text-emerald-400" />
                  {isArabic ? "يعمل دون إنترنت" : "Mode hors-ligne"}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium bg-white/5 border border-white/10 text-slate-300">
                  <Bell className="w-3 h-3 text-blue-400" />
                  {isArabic ? "تنبيهات فورية" : "Notifications"}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => promptInstall()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isArabic ? "تثبيت التطبيق الآن" : "Installer l'application"}</span>
                </button>

                <button
                  onClick={() => snooze(3)}
                  className="px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                >
                  {isArabic ? "لاحقاً" : "Plus tard"}
                </button>
              </div>

              {/* Subtle permanent dismissal option */}
              <div className="flex justify-center pt-0.5">
                <button
                  onClick={dismissPermanently}
                  className="text-[10px] text-slate-500 hover:text-slate-400 underline transition-colors cursor-pointer"
                >
                  {isArabic ? "عدم العرض مجدداً على هذا الجهاز" : "Ne plus me proposer sur cet appareil"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── iOS Safari Step-by-Step Installation Modal ── */}
      {showIOSGuide && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in-0 duration-200"
          dir={isArabic ? "rtl" : "ltr"}
        >
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-indigo-500/30 shadow-2xl p-6 text-slate-100 animate-in slide-in-from-bottom-10 duration-300">
            {/* Close Button */}
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {isArabic ? "تثبيت Edut Pro على iPhone / iPad" : "Installer Edut Pro sur iOS"}
                </h3>
                <p className="text-xs text-slate-400">
                  {isArabic ? "اتبع الخطوات البسيطة التالية عبر متصفح Safari:" : "Suivez ces 3 étapes simples dans Safari :"}
                </p>
              </div>
            </div>

            {/* 3 Step Visual Guide */}
            <div className="space-y-3.5 my-5">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold text-sm shrink-0">
                  1
                </div>
                <div className="flex-1 text-xs text-slate-300">
                  {isArabic ? (
                    <>اضغط على زر <strong>المشاركة</strong> <Share2 className="inline w-3.5 h-3.5 mx-1 text-indigo-400" /> في أسفل شاشة Safari.</>
                  ) : (
                    <>Appuyez sur le bouton <strong>Partager</strong> <Share2 className="inline w-3.5 h-3.5 mx-1 text-indigo-400" /> en bas de l'écran.</>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold text-sm shrink-0">
                  2
                </div>
                <div className="flex-1 text-xs text-slate-300">
                  {isArabic ? (
                    <>مرر للأسفل واختر <strong>«إضافة إلى الشاشة الرئيسية»</strong> <PlusSquare className="inline w-3.5 h-3.5 mx-1 text-indigo-400" />.</>
                  ) : (
                    <>Faites défiler puis choisissez <strong>« Sur l'écran d'accueil »</strong> <PlusSquare className="inline w-3.5 h-3.5 mx-1 text-indigo-400" />.</>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold text-sm shrink-0">
                  3
                </div>
                <div className="flex-1 text-xs text-slate-300">
                  {isArabic ? (
                    <>اضغط على <strong>«إضافة»</strong> (Ajouter) في الزاوية العلوية لتثبيت التطبيق.</>
                  ) : (
                    <>Appuyez sur <strong>« Ajouter »</strong> en haut à droite pour finaliser l'installation.</>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              {isArabic ? "فهمت، شكراً" : "J'ai compris"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
