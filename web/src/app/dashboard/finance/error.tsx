"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, RefreshCw, ArrowLeft, Banknote, Database } from "lucide-react";
import Link from "next/link";
import { localDb } from "@/infrastructure/local-db/dexie";
import { getCachedStudentFees } from "@/infrastructure/local-db/cache";
import FinanceClient from "./finance-client";

export default function FinanceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [cachedFees, setCachedFees] = useState<any[] | null>(null);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [useOfflineView, setUseOfflineView] = useState(false);

  useEffect(() => {
    console.error("[FinanceError] Unhandled finance module error:", error);

    // Automatically inspect local IndexedDB cache to offer immediate recovery
    async function checkLocalCache() {
      try {
        const fees = await getCachedStudentFees();
        if (fees && fees.length > 0) {
          setCachedFees(fees);
        }
      } catch (e) {
        console.warn("[FinanceError] Failed to read local cache:", e);
      } finally {
        setLoadingLocal(false);
      }
    }

    checkLocalCache();
  }, [error]);

  // If user chooses or local data is ready, render the local offline view seamlessly
  if (useOfflineView && cachedFees && cachedFees.length > 0) {
    const totalExpected = cachedFees.reduce((s, f) => s + (Number(f.totalExpected) || 0), 0);
    const totalPaid = cachedFees.reduce((s, f) => s + (Number(f.totalPaid) || 0), 0);
    const totalDebts = cachedFees.reduce((s, f) => s + Math.max(0, Number(f.balance) || 0), 0);

    return (
      <FinanceClient
        fees={cachedFees}
        stats={{ totalExpected, totalCollected: totalPaid, totalDebts }}
        classes={[]}
        advancedStats={null}
        headerConfig={null}
        activeSessionName="Mode Hors-ligne"
        schoolName="Données Locales Sécurisées"
        currentUser={null}
        currentSchoolId={null}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#0A0C10] flex items-center justify-center p-6">
      <div className="bg-white dark:bg-[#131622] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl max-w-lg w-full p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-sm">
          <Banknote size={32} />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Gestion Financière
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
            Une interruption temporaire de connexion est survenue avec le serveur distant. Vos données locales restent sécurisées.
          </p>
          {error?.message && (
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-left text-[11px] font-mono text-slate-600 dark:text-slate-400 overflow-x-auto border border-slate-200/60 dark:border-slate-800">
              {error.message}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {cachedFees && cachedFees.length > 0 && (
            <button
              onClick={() => setUseOfflineView(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-100 dark:shadow-none flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Database size={15} />
              Consulter en mode local ({cachedFees.length} élèves)
            </button>
          )}

          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw size={15} />
            Réessayer
          </button>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft size={15} />
            Tableau de Bord
          </Link>
        </div>
      </div>
    </div>
  );
}
