"use client";

import * as React from "react";
import { AlertTriangle, Bell, Search, Edit, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import PaymentDialog from "./PaymentDialog";

interface Alert {
  id: number;
  studentName: string;
  classe: string;
  photoPath?: string | null;
  balance: number;
  totalExpected: number;
  totalPaid: number;
  status: string | null;
  lastPayment?: Date | null;
}

interface UnpaidAlertsProps {
  alerts: Alert[];
  isMounted: boolean;
  canEdit?: boolean;
  fees: any[];
}

function SeverityBadge({ balance, expected }: { balance: number; expected: number }) {
  const pct = expected > 0 ? (balance / expected) * 100 : 0;
  if (pct >= 80) return (
    <div className="flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full border border-rose-100">
      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
      <span className="text-[9px] font-black uppercase tracking-widest">Critique</span>
    </div>
  );
  if (pct >= 50) return (
    <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      <span className="text-[9px] font-black uppercase tracking-widest">Élevé</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full border border-orange-100">
      <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
      <span className="text-[9px] font-black uppercase tracking-widest">Modéré</span>
    </div>
  );
}

export default function UnpaidAlerts({ alerts, isMounted, canEdit = true, fees }: UnpaidAlertsProps) {
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!search) return alerts;
    const s = search.toLowerCase();
    return alerts.filter(a =>
      a.studentName.toLowerCase().includes(s) ||
      a.classe.toLowerCase().includes(s)
    );
  }, [alerts, search]);

  const fmt = (v: number) => typeof v === "number" && !isNaN(v) ? `${Math.round(v).toLocaleString("fr-FR")} CFA` : "0 CFA";

  const criticalCount = alerts.filter(a => a.totalExpected > 0 && (a.balance / a.totalExpected) >= 0.8).length;
  const totalUnpaid = alerts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <AlertTriangle size={18} />
          </div>
          <div>
            <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Cas Critiques</p>
            <p className="text-2xl font-black text-rose-700 dark:text-rose-300">{criticalCount}</p>
          </div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Bell size={18} />
          </div>
          <div>
            <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Total Alertes</p>
            <p className="text-2xl font-black text-amber-700 dark:text-amber-300">{alerts.length}</p>
          </div>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <TrendingDown size={18} />
          </div>
          <div>
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Montant Total</p>
            <p className="text-xl font-black text-indigo-700 dark:text-indigo-300">{fmt(totalUnpaid)}</p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-[#131622]/90 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500" size={15} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un élève..."
              className="w-full pl-10 pr-4 h-10 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest ml-auto">
            {filtered.length} élève{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-4 opacity-30 dark:opacity-50">
            <Bell size={48} />
            <p className="font-black text-lg">Aucune alerte impayée</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {filtered.map((alert) => {
              const paidPct = alert.totalExpected > 0
                ? Math.round((alert.totalPaid / alert.totalExpected) * 100)
                : 0;
              // Find fee data for PaymentDialog
              const feeData = fees.find(f => f.id === alert.id) || { ...alert, payments: [] };

              return (
                <div key={alert.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center overflow-hidden border border-rose-100 dark:border-rose-900/50 shrink-0">
                    {alert.photoPath && !alert.photoPath.startsWith("file://") ? (
                      <img src={alert.photoPath} alt={alert.studentName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-black text-rose-300 dark:text-rose-400">{alert.studentName?.[0]}</span>
                    )}
                  </div>

                  {/* Name + class */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-black text-slate-900 dark:text-white truncate">{alert.studentName}</p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-tight">{alert.classe}</p>
                  </div>

                  {/* Severity */}
                  <SeverityBadge balance={alert.balance} expected={alert.totalExpected} />

                  {/* Progress bar */}
                  <div className="hidden md:flex flex-col gap-1 w-28">
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", paidPct >= 80 ? "bg-emerald-400" : paidPct >= 50 ? "bg-amber-400" : "bg-rose-400")}
                        style={{ width: `${paidPct}%` }}
                      />
                    </div>
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-400">{paidPct}% payé</p>
                  </div>

                  {/* Balance */}
                  <div className="text-right shrink-0">
                    <p className="text-[12px] font-black text-rose-600 dark:text-rose-400">{fmt(alert.balance)}</p>
                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-400">Solde dû</p>
                  </div>

                  {/* Action */}
                  {canEdit && (
                    <PaymentDialog
                      feeData={feeData}
                      trigger={
                        <button className="opacity-0 group-hover:opacity-100 p-2 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-all">
                          <Edit size={15} />
                        </button>
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
