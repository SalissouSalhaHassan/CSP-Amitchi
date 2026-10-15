"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Download, Printer, Save } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = { type: string; requested: number | ""; available: number | ""; priority: string; justification: string; status: string; observations: string };

const needTypes = ["Enseignant francisant", "Enseignant arabisant", "Salle de classe", "Table banc", "Petite table", "Petite chaise", "Tabouret", "Armoire", "Tableau a chevalet"];
const priorities = ["Critique", "Haute", "Moyenne", "Faible"];
const statuses = ["Non traite", "En cours", "Valide", "Rejete", "Satisfait"];
const initialRows: Row[] = [
  { type: "Enseignant francisant", requested: 3, available: 1, priority: "Critique", justification: "Ratio eleves/enseignant eleve", status: "En cours", observations: "" },
  { type: "Enseignant arabisant", requested: 2, available: 1, priority: "Haute", justification: "Renforcement bilingue", status: "Non traite", observations: "" },
  { type: "Salle de classe", requested: 4, available: 1, priority: "Critique", justification: "Classes surchargees", status: "Valide", observations: "" },
  { type: "Table banc", requested: 120, available: 78, priority: "Haute", justification: "Mobilier insuffisant", status: "En cours", observations: "" },
  { type: "Petite table", requested: 45, available: 30, priority: "Moyenne", justification: "Prescolaire", status: "Non traite", observations: "" },
  { type: "Armoire", requested: 12, available: 5, priority: "Moyenne", justification: "Stockage pedagogique", status: "Non traite", observations: "" },
];

const n = (value: number | "") => (typeof value === "number" && value >= 0 ? value : 0);

export default function BesoinsPage() {
  const [rows, setRows] = useState(initialRows);
  const totals = useMemo(() => ({
    requested: rows.reduce((sum, row) => sum + n(row.requested), 0),
    available: rows.reduce((sum, row) => sum + n(row.available), 0),
    critical: rows.filter((row) => row.priority === "Critique").length,
    pending: rows.filter((row) => row.status === "Non traite" || row.status === "En cours").length,
  }), [rows]);

  const updateRow = (index: number, key: keyof Row, value: string) => {
    setRows((current) => current.map((row, i) => {
      if (i !== index) return row;
      if (key === "requested" || key === "available") return { ...row, [key]: value === "" ? "" : Math.max(0, Number(value)) };
      return { ...row, [key]: value };
    }));
  };

  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8 print:bg-white print:p-0">
      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm print:border-b print:shadow-none">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/canevas/etablissements/ETB-2026-001" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 print:hidden"><ArrowLeft size={19} /></Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100"><AlertTriangle size={26} /></div>
            <div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Fiche Etablissement</p><h1 className="text-3xl font-black tracking-tight text-slate-950">Besoins</h1><p className="mt-1 text-sm font-bold text-slate-500">Enregistrement et suivi des besoins de l'etablissement</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white"><Save size={16} /> Enregistrer</button>
            <button className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700"><Download size={16} /> Exporter</button>
            <button onClick={() => window.print()} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700"><Printer size={16} /> Imprimer</button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        {[["Quantite demandee", totals.requested, "bg-indigo-50 text-indigo-700"], ["Disponible", totals.available, "bg-emerald-50 text-emerald-700"], ["Manque total", Math.max(0, totals.requested - totals.available), "bg-amber-50 text-amber-700"], ["Critiques", totals.critical, "bg-rose-50 text-rose-700"]].map(([label, value, style]) => <div key={label} className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p><p className={cn("mt-2 inline-flex rounded-2xl px-4 py-2 text-3xl font-black", String(style))}>{value}</p></div>)}
      </section>

      {totals.critical > 0 && <div className="flex items-start gap-3 rounded-[24px] border border-rose-100 bg-rose-50 p-5 text-rose-800"><AlertTriangle size={20} /><div><p className="text-sm font-black">Besoins critiques detectes</p><p className="mt-1 text-xs font-bold">{totals.critical} besoin(s) critique(s) et {totals.pending} demande(s) a traiter.</p></div></div>}

      <section className="overflow-hidden rounded-[30px] border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400"><tr><th className="px-5 py-4">Type besoin</th><th className="px-5 py-4">Quantite demandee</th><th className="px-5 py-4">Quantite disponible</th><th className="px-5 py-4">Manque</th><th className="px-5 py-4">Priorite</th><th className="px-5 py-4">Justification</th><th className="px-5 py-4">Statut traitement</th><th className="px-5 py-4">Observations</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => {
                const lack = Math.max(0, n(row.requested) - n(row.available));
                return <tr key={`${row.type}-${index}`} className="text-sm font-bold text-slate-700">
                  <td className="px-5 py-4"><select value={row.type} onChange={(e) => updateRow(index, "type", e.target.value)} className="h-11 w-52 rounded-2xl border border-slate-200 px-4 font-bold outline-none">{needTypes.map((type) => <option key={type}>{type}</option>)}</select></td>
                  <td className="px-5 py-4"><input type="number" min={0} value={row.requested} onChange={(e) => updateRow(index, "requested", e.target.value)} className="h-11 w-28 rounded-2xl border border-slate-200 px-4 font-black outline-none" /></td>
                  <td className="px-5 py-4"><input type="number" min={0} value={row.available} onChange={(e) => updateRow(index, "available", e.target.value)} className="h-11 w-28 rounded-2xl border border-slate-200 px-4 font-black outline-none" /></td>
                  <td className="px-5 py-4 font-black text-amber-600">{lack}</td>
                  <td className="px-5 py-4"><select value={row.priority} onChange={(e) => updateRow(index, "priority", e.target.value)} className={cn("h-11 w-36 rounded-2xl border px-4 font-black outline-none", row.priority === "Critique" ? "border-rose-200 bg-rose-50 text-rose-700" : row.priority === "Haute" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-700")}>{priorities.map((p) => <option key={p}>{p}</option>)}</select></td>
                  <td className="px-5 py-4"><input value={row.justification} onChange={(e) => updateRow(index, "justification", e.target.value)} className="h-11 w-64 rounded-2xl border border-slate-200 px-4 font-bold outline-none" /></td>
                  <td className="px-5 py-4"><select value={row.status} onChange={(e) => updateRow(index, "status", e.target.value)} className="h-11 w-36 rounded-2xl border border-slate-200 px-4 font-bold outline-none">{statuses.map((s) => <option key={s}>{s}</option>)}</select></td>
                  <td className="px-5 py-4"><input value={row.observations} onChange={(e) => updateRow(index, "observations", e.target.value)} placeholder="Observation..." className="h-11 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none" /></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
