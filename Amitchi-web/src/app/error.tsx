"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError] Global uncaught application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
      <div className="bg-slate-800/90 rounded-3xl border border-slate-700 shadow-2xl max-w-md w-full p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto shadow-sm">
          <AlertTriangle size={32} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black text-white tracking-tight">
            Une erreur inattendue est survenue
          </h1>
          <p className="text-xs font-medium text-slate-400 leading-relaxed">
            L'application a rencontré un problème temporaire. Cliquez sur Réessayer ou retournez à l'accueil.
          </p>
          {error?.message && (
            <div className="mt-3 p-3 bg-slate-900/80 rounded-xl text-left text-[11px] font-mono text-rose-300 overflow-x-auto border border-slate-700">
              {error.message}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw size={15} />
            Réessayer
          </button>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Home size={15} />
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
