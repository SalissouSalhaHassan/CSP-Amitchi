"use client";

import * as React from "react";
import {
  Wallet, TrendingUp, TrendingDown, Target, Users, CheckCircle2,
  XCircle, Calendar, Clock, BarChart3, PieChart, Activity, DollarSign,
  ArrowUpRight, ArrowDownRight, Minus, Bell, FileText, Printer, Download
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdvancedStats {
  totalExpected: number;
  totalPaid: number;
  totalDebts: number;
  totalReductions: number;
  currentBalance: number;
  recoveryRate: number;
  totalPaymentsCount: number;
  countPaid: number;
  countPartial: number;
  countUnpaid: number;
  totalStudents: number;
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  revenueYear: number;
  monthlyData: { month: string; amount: number; count: number }[];
  classSummary: { className: string; expected: number; paid: number; unpaid: number; count: number; rate: number }[];
}

interface FinanceDashboardProps {
  stats: AdvancedStats;
  isMounted: boolean;
}

// Reusable stat card
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  trend,
  trendUp,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
  trend?: string;
  trendUp?: boolean | null;
}) {
  return (
    <div className={cn(
      "bg-white dark:bg-[#131622]/90 rounded-[22px] border p-5 min-h-[118px] space-y-3 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all group cursor-default",
      color === "indigo" && "border-indigo-100 dark:border-indigo-900/40 hover:border-indigo-200 dark:hover:border-indigo-800",
      color === "emerald" && "border-emerald-100 dark:border-emerald-900/40 hover:border-emerald-200 dark:hover:border-emerald-800",
      color === "rose" && "border-rose-100 dark:border-rose-900/40 hover:border-rose-200 dark:hover:border-rose-800",
      color === "violet" && "border-violet-100 dark:border-violet-900/40 hover:border-violet-200 dark:hover:border-violet-800",
      color === "amber" && "border-amber-100 dark:border-amber-900/40 hover:border-amber-200 dark:hover:border-amber-800",
      color === "sky" && "border-sky-100 dark:border-sky-900/40 hover:border-sky-200 dark:hover:border-sky-800",
      color === "teal" && "border-teal-100 dark:border-teal-900/40 hover:border-teal-200 dark:hover:border-teal-800",
      color === "orange" && "border-orange-100 dark:border-orange-900/40 hover:border-orange-200 dark:hover:border-orange-800",
      (!color || color === "slate") && "border-slate-100 dark:border-slate-800"
    )}>
      <div className="flex items-center justify-between">
        <div className={cn(
          "w-10 h-10 rounded-2xl flex items-center justify-center",
          color === "indigo" && "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 dark:text-indigo-400",
          color === "emerald" && "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 dark:text-emerald-400",
          color === "rose" && "bg-rose-50 dark:bg-rose-950/50 text-rose-500 dark:text-rose-400",
          color === "violet" && "bg-violet-50 dark:bg-violet-950/50 text-violet-500 dark:text-violet-400",
          color === "amber" && "bg-amber-50 dark:bg-amber-950/50 text-amber-500 dark:text-amber-400",
          color === "sky" && "bg-sky-50 dark:bg-sky-950/50 text-sky-500 dark:text-sky-400",
          color === "teal" && "bg-teal-50 dark:bg-teal-950/50 text-teal-500 dark:text-teal-400",
          color === "orange" && "bg-orange-50 dark:bg-orange-950/50 text-orange-500 dark:text-orange-400",
          (!color || color === "slate") && "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
        )}>
          <Icon size={18} />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full",
            trendUp === true && "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50",
            trendUp === false && "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50",
            trendUp === null && "text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800"
          )}>
            {trendUp === true ? <ArrowUpRight size={10} /> : trendUp === false ? <ArrowDownRight size={10} /> : <Minus size={10} />}
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">{label}</p>
        <p className={cn(
          "text-xl font-black mt-1 leading-none",
          color === "indigo" && "text-indigo-700 dark:text-indigo-300",
          color === "emerald" && "text-emerald-700 dark:text-emerald-300",
          color === "rose" && "text-rose-700 dark:text-rose-300",
          color === "violet" && "text-violet-700 dark:text-violet-300",
          color === "amber" && "text-amber-700 dark:text-amber-300",
          color === "sky" && "text-sky-700 dark:text-sky-300",
          color === "teal" && "text-teal-700 dark:text-teal-300",
          color === "orange" && "text-orange-700 dark:text-orange-300",
          (!color || color === "slate") && "text-slate-900 dark:text-white"
        )}>{value}</p>
        {sub && <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// SVG Bar Chart
function BarChartSVG({ data, isMounted }: { data: { month: string; amount: number }[]; isMounted: boolean }) {
  if (!isMounted || !data?.length) {
    return <div className="h-40 flex items-center justify-center text-slate-200 text-xs">Chargement...</div>;
  }
  const max = Math.max(...data.map(d => d.amount), 1);
  const W = 520, H = 130, barW = 36, gap = 16;
  const total = data.length;
  const step = W / total;

  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full h-auto">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(v => (
        <line key={v} x1={0} y1={H * (1 - v)} x2={W} y2={H * (1 - v)}
          stroke="#f1f5f9" strokeWidth="1" />
      ))}
      {data.map((d, i) => {
        const x = i * step + step / 2;
        const barH = max > 0 ? (d.amount / max) * H : 0;
        const barX = x - barW / 2;
        const barY = H - barH;
        const isActive = d.amount > 0;
        return (
          <g key={i}>
            {/* Bar shadow */}
            <rect x={barX + 2} y={barY + 2} width={barW} height={barH} rx={6} fill="#e0e7ff" opacity={0.4} />
            {/* Bar gradient fill */}
            <defs>
              <linearGradient id={`bar-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isActive ? "#6366f1" : "#e2e8f0"} />
                <stop offset="100%" stopColor={isActive ? "#818cf8" : "#f1f5f9"} />
              </linearGradient>
            </defs>
            <rect x={barX} y={barY} width={barW} height={barH} rx={6}
              fill={`url(#bar-grad-${i})`} />
            {/* Month label */}
            <text x={x} y={H + 16} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="700" fontFamily="sans-serif">
              {d.month}
            </text>
            {/* Amount on hover via title */}
            {d.amount > 0 && (
              <text x={x} y={barY - 4} textAnchor="middle" fontSize="8" fill="#6366f1" fontWeight="800" fontFamily="sans-serif">
                {(d.amount / 1000).toFixed(0)}k
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// SVG Donut Chart
function DonutChart({
  paid, partial, unpaid, total, isMounted
}: { paid: number; partial: number; unpaid: number; total: number; isMounted: boolean }) {
  if (!isMounted || total === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-24 h-24 rounded-full border-8 border-slate-100 flex items-center justify-center">
          <span className="text-xs text-slate-300 font-bold">—</span>
        </div>
      </div>
    );
  }

  const R = 50, cx = 60, cy = 60, stroke = 16;
  const circ = 2 * Math.PI * R;
  const paidPct = paid / total;
  const partialPct = partial / total;
  const unpaidPct = unpaid / total;

  const paidDash = circ * paidPct;
  const partialDash = circ * partialPct;
  const unpaidDash = circ * unpaidPct;

  // Offsets: start at top (-PI/2)
  const paidOffset = 0;
  const partialOffset = -(paidDash);
  const unpaidOffset = -(paidDash + partialDash);

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 120 120" className="w-28 h-28 shrink-0">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        {/* Paid - emerald */}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#10b981" strokeWidth={stroke}
          strokeDasharray={`${paidDash} ${circ}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
        {/* Partial - amber */}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f59e0b" strokeWidth={stroke}
          strokeDasharray={`${partialDash} ${circ}`}
          strokeDashoffset={circ / 4 - paidDash}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
        {/* Unpaid - rose */}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f43f5e" strokeWidth={stroke}
          strokeDasharray={`${unpaidDash} ${circ}`}
          strokeDashoffset={circ / 4 - paidDash - partialDash}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="800" fill="#1e293b" fontFamily="sans-serif">
          {total}
        </text>
        <text x={cx} y={cy + 17} textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="700" fontFamily="sans-serif">
          ÉLÈVES
        </text>
      </svg>
      <div className="space-y-2 flex-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-wide">Soldé</span>
          <span className="ml-auto text-[11px] font-black text-emerald-600">{paid}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-wide">Partiel</span>
          <span className="ml-auto text-[11px] font-black text-amber-600">{partial}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0" />
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-wide">Impayé</span>
          <span className="ml-auto text-[11px] font-black text-rose-600">{unpaid}</span>
        </div>
      </div>
    </div>
  );
}

// Recovery Rate gauge
function RecoveryGauge({ rate, isMounted }: { rate: number; isMounted: boolean }) {
  if (!isMounted) return null;
  const angle = (rate / 100) * 180 - 90;
  const rad = (angle * Math.PI) / 180;
  const needleX = 60 + 38 * Math.cos(rad);
  const needleY = 60 + 38 * Math.sin(rad);
  const color = rate >= 80 ? "#10b981" : rate >= 50 ? "#f59e0b" : "#f43f5e";

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 70" className="w-32 h-auto">
        {/* Background arc */}
        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="#f1f5f9" strokeWidth="10" strokeLinecap="round" />
        {/* Colored arc */}
        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${(rate / 100) * 157} 157`}
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
        {/* Needle */}
        <line x1={60} y1={60} x2={needleX} y2={needleY} stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
        <circle cx={60} cy={60} r={4} fill="#1e293b" />
        {/* Labels */}
        <text x={12} y={68} fontSize="7" fill="#94a3b8" fontWeight="700" fontFamily="sans-serif">0%</text>
        <text x={97} y={68} fontSize="7" fill="#94a3b8" fontWeight="700" fontFamily="sans-serif">100%</text>
      </svg>
      <p className="text-2xl font-black mt-1" style={{ color }}>{rate}%</p>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TAUX DE RECOUVREMENT</p>
    </div>
  );
}

export default function FinanceDashboard({ stats, isMounted }: FinanceDashboardProps) {
  const fmt = (v: number) => typeof v === "number" && !isNaN(v) ? `${Math.round(v).toLocaleString("fr-FR")} CFA` : "0 CFA";
  const fmtN = (v: number) => typeof v === "number" && !isNaN(v) ? v.toLocaleString("fr-FR") : "0";
  const topClasses = (stats?.classSummary || []).slice(0, 5);
  const maxClassRate = Math.max(...topClasses.map((c) => c.rate || 0), 1);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-6">
      {/* ROW 1 — Core Financials */}
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">
          💰 Financier Global
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={Wallet} label="Total Attendu" value={fmt(stats?.totalExpected || 0)} color="indigo"
            sub="Frais de scolarité" trend="+0%" trendUp={null} />
          <StatCard icon={TrendingUp} label="Total Encaissé" value={fmt(stats?.totalPaid || 0)} color="emerald"
            sub="Paiements validés" trend={`${stats?.recoveryRate || 0}%`} trendUp={true} />
          <StatCard icon={TrendingDown} label="Total Impayé" value={fmt(stats?.totalDebts || 0)} color="rose"
            sub="Soldes en attente" trendUp={false} />
          <StatCard icon={DollarSign} label="Solde Actuel" value={fmt(stats?.currentBalance || 0)} color="violet"
            sub="Encaissé net" trendUp={true} />
        </div>
      </div>

      {/* ROW 2 — Indicators */}
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">
          📊 Indicateurs de Performance
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={Target} label="Taux de Recouvrement" value={`${stats?.recoveryRate || 0}%`} color="teal"
            sub="Objectif: 100%" trendUp={(stats?.recoveryRate || 0) >= 80} />
          <StatCard icon={BarChart3} label="Nombre de Paiements" value={fmtN(stats?.totalPaymentsCount || 0)} color="sky"
            sub="Transactions enregistrées" />
          <StatCard icon={CheckCircle2} label="Élèves Payés" value={fmtN(stats?.countPaid || 0)} color="emerald"
            sub={`sur ${fmtN(stats?.totalStudents || 0)} élèves`} trendUp={true} />
          <StatCard icon={XCircle} label="Élèves Impayés" value={fmtN((stats?.countUnpaid || 0) + (stats?.countPartial || 0))} color="rose"
            sub={`dont ${fmtN(stats?.countPartial || 0)} partiels`} trendUp={false} />
        </div>
      </div>

      {/* ROW 3 — Temporal */}
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">
          📅 Revenus par Période
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={Clock} label="Revenus Aujourd'hui" value={fmt(stats?.revenueToday || 0)} color="amber"
            sub="Paiements du jour" />
          <StatCard icon={Calendar} label="Revenus Cette Semaine" value={fmt(stats?.revenueWeek || 0)} color="orange"
            sub="7 derniers jours" />
          <StatCard icon={Activity} label="Revenus Ce Mois" value={fmt(stats?.revenueMonth || 0)} color="indigo"
            sub="Mois en cours" trendUp={true} />
          <StatCard icon={TrendingUp} label="Revenus Cette Année" value={fmt(stats?.revenueYear || 0)} color="emerald"
            sub="Depuis janvier" trendUp={true} />
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart - monthly revenue */}
        <div className="lg:col-span-2 bg-white dark:bg-[#131622]/90 rounded-[22px] border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Revenus Mensuels</p>
              <p className="text-sm font-black text-slate-800 dark:text-white mt-0.5">Encaissements • Année Scolaire</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 dark:text-indigo-400 flex items-center justify-center">
              <BarChart3 size={16} />
            </div>
          </div>
          <BarChartSVG data={stats?.monthlyData || []} isMounted={isMounted} />
        </div>

        {/* Donut + gauge */}
        <div className="bg-white dark:bg-[#131622]/90 rounded-[22px] border border-slate-100 dark:border-slate-800 p-6 space-y-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Répartition Statuts</p>
              <p className="text-sm font-black text-slate-800 dark:text-white mt-0.5">Distribution élèves</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 dark:text-rose-400 flex items-center justify-center">
              <PieChart size={16} />
            </div>
          </div>
          <DonutChart
            paid={stats?.countPaid || 0}
            partial={stats?.countPartial || 0}
            unpaid={stats?.countUnpaid || 0}
            total={stats?.totalStudents || 0}
            isMounted={isMounted}
          />
          <div className="border-t border-slate-50 dark:border-slate-800 pt-4">
            <RecoveryGauge rate={stats?.recoveryRate || 0} isMounted={isMounted} />
          </div>
        </div>
      </div>

      {/* Class Summary Table */}
      {stats?.classSummary && stats.classSummary.length > 0 && (
        <div className="bg-white dark:bg-[#131622]/90 rounded-[22px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all">
          <div className="p-6 border-b border-slate-50 dark:border-slate-800">
            <p className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Récapitulatif par Classe</p>
            <p className="text-sm font-black text-slate-800 dark:text-white mt-0.5">Performance de recouvrement</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900">
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-left">Classe</th>
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-left">Élèves</th>
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-right">Attendu</th>
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-right">Encaissé</th>
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-right">Impayé</th>
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-left">Taux</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {stats.classSummary.map((cls) => (
                  <tr key={cls.className} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-3">
                      <span className="text-[11px] font-black text-slate-800 dark:text-white">{cls.className}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{cls.count}</span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400">{isMounted ? cls.expected.toLocaleString("fr-FR") : "—"}</span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">{isMounted ? cls.paid.toLocaleString("fr-FR") : "—"}</span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className="text-[11px] font-black text-rose-500 dark:text-rose-400">{isMounted ? cls.unpaid.toLocaleString("fr-FR") : "—"}</span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", cls.rate >= 80 ? "bg-emerald-400" : cls.rate >= 50 ? "bg-amber-400" : "bg-rose-400")}
                            style={{ width: `${cls.rate}%` }}
                          />
                        </div>
                        <span className={cn(
                          "text-[10px] font-black w-8 text-right",
                          cls.rate >= 80 ? "text-emerald-600 dark:text-emerald-400" : cls.rate >= 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                        )}>{cls.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>

      <aside className="space-y-4">
        <div className="rounded-[22px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#131622]/90 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Alertes financières</h3>
            <Bell size={17} className="text-amber-500" />
          </div>
          <div className="space-y-3">
            {[
              { label: "élèves avec retards", value: stats?.countUnpaid || 0, amount: stats?.totalDebts || 0, color: "rose" },
              { label: "paiements partiels", value: stats?.countPartial || 0, amount: stats?.totalDebts || 0, color: "amber" },
              { label: "échéances proches", value: Math.max(0, Math.round((stats?.countPartial || 0) / 2)), amount: 0, color: "indigo" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-3">
                <div className="flex items-start gap-2">
                  <span className={cn("mt-1 h-2 w-2 rounded-full", item.color === "rose" && "bg-rose-500", item.color === "amber" && "bg-amber-500", item.color === "indigo" && "bg-indigo-500")} />
                  <div>
                    <p className="text-[11px] font-black text-slate-800 dark:text-slate-200">{item.value} {item.label}</p>
                    <p className="mt-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">{item.amount > 0 ? `Montant total: ${fmt(item.amount)}` : "À surveiller cette semaine"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[22px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#131622]/90 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Top Classes</h3>
            <BarChart3 size={17} className="text-indigo-500" />
          </div>
          <div className="space-y-3">
            {topClasses.length === 0 ? (
              <p className="py-6 text-center text-xs font-bold text-slate-400 dark:text-slate-400">Aucune donnée classe</p>
            ) : topClasses.map((cls) => (
              <div key={cls.className}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">{cls.className}</span>
                  <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400">{cls.rate}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500" style={{ width: `${Math.max(6, (cls.rate / maxClassRate) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[22px] border border-emerald-100 dark:border-emerald-900/50 bg-white dark:bg-[#131622]/90 p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">Prévision de trésorerie</p>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{fmt((stats?.revenueMonth || 0) + Math.round((stats?.revenueWeek || 0) * 2))}</p>
          <div className="mt-4 h-20 rounded-xl bg-gradient-to-t from-emerald-50 dark:from-emerald-950/40 to-transparent" />
        </div>

        <div className="rounded-[22px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#131622]/90 p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-black text-slate-900 dark:text-white">Actions rapides</h3>
          <div className="space-y-2">
            {[
              { label: "Générer un rapport", icon: FileText },
              { label: "Export Excel", icon: Download },
              { label: "Impression", icon: Printer },
            ].map((action) => (
              <button key={action.label} className="flex w-full items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-left text-[11px] font-black text-slate-700 dark:text-slate-200 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400">
                <action.icon size={15} />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
