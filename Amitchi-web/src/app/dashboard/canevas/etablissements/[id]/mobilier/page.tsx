"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, BarChart3, Building2, Download, Printer, Save } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = { niveau: string; type: string; total: number | ""; good: number | ""; bad: number | ""; estimatedNeed: number; observations: string };

const initialRows: Row[] = [
  { niveau: "Prescolaire", type: "Petites tables", total: 38, good: 30, bad: 8, estimatedNeed: 45, observations: "" },
  { niveau: "Prescolaire", type: "Tabourets", total: 70, good: 58, bad: 12, estimatedNeed: 90, observations: "" },
  { niveau: "CI", type: "Tables bancs", total: 42, good: 31, bad: 11, estimatedNeed: 52, observations: "" },
  { niveau: "CP", type: "Tables bancs", total: 46, good: 38, bad: 8, estimatedNeed: 59, observations: "" },
  { niveau: "CE1", type: "Bancs", total: 40, good: 34, bad: 6, estimatedNeed: 56, observations: "" },
  { niveau: "CE2", type: "Tables individuelles", total: 30, good: 24, bad: 6, estimatedNeed: 40, observations: "" },
  { niveau: "CM1", type: "Chaises individuelles", total: 34, good: 29, bad: 5, estimatedNeed: 40, observations: "" },
  { niveau: "CM2", type: "Armoires", total: 8, good: 5, bad: 3, estimatedNeed: 12, observations: "" },
  { niveau: "Tous niveaux", type: "Tableaux", total: 18, good: 15, bad: 3, estimatedNeed: 18, observations: "" },
];

const furnitureTypes = ["Tables bancs", "Bancs", "Tables individuelles", "Chaises individuelles", "Petites tables", "Tabourets", "Armoires", "Tableaux"];
const n = (value: number | "") => (typeof value === "number" && value >= 0 ? value : 0);

export default function MobilierPage() {
  const [rows, setRows] = useState(initialRows);
  const totals = useMemo(() => rows.reduce((acc, row) => ({
    total: acc.total + n(row.total),
    good: acc.good + n(row.good),
    bad: acc.bad + n(row.bad),
    shortage: acc.shortage + Math.max(0, row.estimatedNeed - n(row.good)),
  }), { total: 0, good: 0, bad: 0, shortage: 0 }), [rows]);
  const highBad = rows.filter((row) => n(row.total) > 0 && n(row.bad) / n(row.total) >= 0.25);
  const maxShortage = Math.max(1, ...rows.map((row) => Math.max(0, row.estimatedNeed - n(row.good))));

  const updateRow = (index: number, key: keyof Row, value: string) => {
    setRows((current) => current.map((row, i) => {
      if (i !== index) return row;
      if (["total", "good", "bad"].includes(key)) return { ...row, [key]: value === "" ? "" : Math.max(0, Number(value)) };
      if (key === "estimatedNeed") return { ...row, estimatedNeed: Math.max(0, Number(value)) };
      return { ...row, [key]: value };
    }));
  };

  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8 print:bg-white print:p-0">
      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm print:border-b print:shadow-none">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/canevas/etablissements/ETB-2026-001" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 print:hidden"><ArrowLeft size={19} /></Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100"><Building2 size={26} /></div>
            <div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Fiche Etablissement</p><h1 className="text-3xl font-black tracking-tight text-slate-950">Mobilier</h1><p className="mt-1 text-sm font-bold text-slate-500">Gestion du mobilier par niveau, type et etat</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white"><Save size={16} /> Enregistrer</button>
            <button className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700"><Download size={16} /> Exporter</button>
            <button onClick={() => window.print()} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700"><Printer size={16} /> Imprimer</button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        {[["Total mobilier", totals.total, "bg-indigo-50 text-indigo-700"], ["Bon etat", totals.good, "bg-emerald-50 text-emerald-700"], ["Mauvais etat", totals.bad, "bg-rose-50 text-rose-700"], ["Besoin estime", totals.shortage, "bg-amber-50 text-amber-700"]].map(([label, value, style]) => <div key={label} className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p><p className={cn("mt-2 inline-flex rounded-2xl px-4 py-2 text-3xl font-black", String(style))}>{value}</p></div>)}
      </section>

      {highBad.length > 0 && <div className="flex items-start gap-3 rounded-[24px] border border-amber-100 bg-amber-50 p-5 text-amber-800"><AlertTriangle size={20} /><div><p className="text-sm font-black">Mauvais etat eleve</p><p className="mt-1 text-xs font-bold">Certains mobiliers ont au moins 25% en mauvais etat: {highBad.map((r) => `${r.niveau} - ${r.type}`).join(", ")}.</p></div></div>}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-[30px] border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400"><tr><th className="px-5 py-4">Niveau</th><th className="px-5 py-4">Type mobilier</th><th className="px-5 py-4">Total</th><th className="px-5 py-4">Bon etat</th><th className="px-5 py-4">Mauvais etat</th><th className="px-5 py-4">Besoin estime</th><th className="px-5 py-4">Observations</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, index) => {
                  const shortage = Math.max(0, row.estimatedNeed - n(row.good));
                  return <tr key={`${row.niveau}-${row.type}`} className="text-sm font-bold text-slate-700">
                    <td className="px-5 py-4"><input value={row.niveau} onChange={(e) => updateRow(index, "niveau", e.target.value)} className="h-11 w-36 rounded-2xl border border-slate-200 px-4 font-bold outline-none" /></td>
                    <td className="px-5 py-4"><select value={row.type} onChange={(e) => updateRow(index, "type", e.target.value)} className="h-11 w-48 rounded-2xl border border-slate-200 px-4 font-bold outline-none">{furnitureTypes.map((type) => <option key={type}>{type}</option>)}</select></td>
                    {(["total", "good", "bad"] as const).map((key) => <td key={key} className="px-5 py-4"><input type="number" min={0} value={row[key]} onChange={(e) => updateRow(index, key, e.target.value)} className="h-11 w-28 rounded-2xl border border-slate-200 px-4 font-black outline-none" /></td>)}
                    <td className="px-5 py-4"><div className="font-black text-amber-600">{shortage}</div><input type="number" min={0} value={row.estimatedNeed} onChange={(e) => updateRow(index, "estimatedNeed", e.target.value)} className="mt-1 h-9 w-28 rounded-xl border border-slate-200 px-3 text-xs font-black outline-none" /></td>
                    <td className="px-5 py-4"><input value={row.observations} onChange={(e) => updateRow(index, "observations", e.target.value)} placeholder="Observation..." className="h-11 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none" /></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><BarChart3 size={20} className="text-indigo-600" /><div><h2 className="text-base font-black text-slate-950">Mobilier manquant</h2><p className="mt-1 text-xs font-bold text-slate-500">Bar chart des besoins estimes</p></div></div>
          <div className="mt-6 space-y-4">
            {rows.map((row) => {
              const shortage = Math.max(0, row.estimatedNeed - n(row.good));
              return <div key={`${row.niveau}-${row.type}-chart`}><div className="mb-1 flex justify-between text-xs font-black"><span className="truncate">{row.type}</span><span className="text-amber-600">{shortage}</span></div><div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-amber-500" style={{ width: `${(shortage / maxShortage) * 100}%` }} /></div></div>;
            })}
          </div>
        </aside>
      </section>
    </div>
  );
}
