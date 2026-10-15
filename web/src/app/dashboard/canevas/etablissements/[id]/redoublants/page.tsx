"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Download, GraduationCap, Printer, Save } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = { niveau: string; redoublants: number | ""; filles: number | ""; effectif: number | ""; observations: string };

const initialRows: Row[] = [
  { niveau: "Section 1", redoublants: 1, filles: 0, effectif: 52, observations: "" },
  { niveau: "Section 2", redoublants: 1, filles: 1, effectif: 58, observations: "" },
  { niveau: "CI", redoublants: 4, filles: 2, effectif: 104, observations: "" },
  { niveau: "CP", redoublants: 6, filles: 3, effectif: 118, observations: "" },
  { niveau: "CE1", redoublants: 5, filles: 2, effectif: 111, observations: "" },
  { niveau: "CE2", redoublants: 3, filles: 1, effectif: 105, observations: "" },
  { niveau: "CM1", redoublants: 4, filles: 2, effectif: 98, observations: "" },
  { niveau: "CM2", redoublants: 2, filles: 1, effectif: 106, observations: "" },
];

const n = (value: number | "") => (typeof value === "number" && value >= 0 ? value : 0);

export default function RedoublantsPage() {
  const [rows, setRows] = useState(initialRows);
  const totals = useMemo(() => rows.reduce((acc, row) => ({
    redoublants: acc.redoublants + n(row.redoublants),
    filles: acc.filles + n(row.filles),
    effectif: acc.effectif + n(row.effectif),
  }), { redoublants: 0, filles: 0, effectif: 0 }), [rows]);
  const invalid = rows.filter((row) => n(row.redoublants) > n(row.effectif) || n(row.filles) > n(row.redoublants) || row.redoublants === "" || row.filles === "" || row.effectif === "");

  const updateRow = (index: number, key: keyof Row, value: string) => {
    setRows((current) => current.map((row, i) => {
      if (i !== index) return row;
      if (key === "niveau") return row;
      if (key === "observations") return { ...row, observations: value };
      return { ...row, [key]: value === "" ? "" : Math.max(0, Number(value)) };
    }));
  };

  const displayRows = [...rows, { niveau: "Total general", redoublants: totals.redoublants, filles: totals.filles, effectif: totals.effectif, observations: "Calcul automatique" }];

  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8 print:bg-white print:p-0">
      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm print:border-b print:shadow-none">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/canevas/etablissements/ETB-2026-001" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 print:hidden"><ArrowLeft size={19} /></Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100"><GraduationCap size={26} /></div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Fiche Etablissement</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Redoublants</h1>
              <p className="mt-1 text-sm font-bold text-slate-500">Saisie des redoublants par niveau avec controles automatiques</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white"><Save size={16} /> Enregistrer</button>
            <button className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700"><Download size={16} /> Exporter</button>
            <button onClick={() => window.print()} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700"><Printer size={16} /> Imprimer</button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Total redoublants", totals.redoublants, "bg-indigo-50 text-indigo-700"],
          ["Filles redoublantes", totals.filles, "bg-pink-50 text-pink-700"],
          ["Garcons redoublants", totals.redoublants - totals.filles, "bg-blue-50 text-blue-700"],
          ["Taux redoublement", `${totals.effectif ? Math.round((totals.redoublants / totals.effectif) * 100) : 0}%`, "bg-amber-50 text-amber-700"],
        ].map(([label, value, style]) => (
          <div key={label} className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <p className={cn("mt-2 inline-flex rounded-2xl px-4 py-2 text-3xl font-black", String(style))}>{value}</p>
          </div>
        ))}
      </section>

      {invalid.length > 0 && <div className="flex items-start gap-3 rounded-[24px] border border-rose-100 bg-rose-50 p-5 text-rose-800"><AlertTriangle size={20} /><div><p className="text-sm font-black">Validation requise</p><p className="mt-1 text-xs font-bold">Les redoublants ne doivent pas depasser l'effectif total et les filles redoublantes ne doivent pas depasser le total redoublants.</p></div></div>}

      <section className="overflow-hidden rounded-[30px] border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400"><tr><th className="px-5 py-4">Niveau</th><th className="px-5 py-4">Total redoublants</th><th className="px-5 py-4">Filles redoublantes</th><th className="px-5 py-4">Garcons redoublants</th><th className="px-5 py-4">Effectif total</th><th className="px-5 py-4">Taux redoublement</th><th className="px-5 py-4">Observations</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {displayRows.map((row, index) => {
                const totalRow = row.niveau === "Total general";
                const garcons = Math.max(0, n(row.redoublants) - n(row.filles));
                const taux = n(row.effectif) ? Math.round((n(row.redoublants) / n(row.effectif)) * 100) : 0;
                const rowInvalid = !totalRow && (n(row.redoublants) > n(row.effectif) || n(row.filles) > n(row.redoublants) || row.redoublants === "" || row.filles === "" || row.effectif === "");
                return (
                  <tr key={row.niveau} className={cn("text-sm font-bold", totalRow ? "bg-slate-50 text-slate-950" : rowInvalid ? "bg-rose-50/50 text-slate-700" : "text-slate-700")}>
                    <td className="px-5 py-4 font-black">{row.niveau}</td>
                    <td className="px-5 py-4">{totalRow ? <span className="text-lg font-black text-indigo-600">{row.redoublants}</span> : <input type="number" min={0} value={row.redoublants} onChange={(e) => updateRow(index, "redoublants", e.target.value)} className="h-11 w-32 rounded-2xl border border-slate-200 px-4 font-black outline-none" />}</td>
                    <td className="px-5 py-4">{totalRow ? <span className="text-lg font-black text-pink-600">{row.filles}</span> : <input type="number" min={0} max={n(row.redoublants)} value={row.filles} onChange={(e) => updateRow(index, "filles", e.target.value)} className="h-11 w-32 rounded-2xl border border-slate-200 px-4 font-black outline-none" />}</td>
                    <td className="px-5 py-4 font-black text-blue-600">{garcons}</td>
                    <td className="px-5 py-4">{totalRow ? <span className="font-black">{row.effectif}</span> : <input type="number" min={0} value={row.effectif} onChange={(e) => updateRow(index, "effectif", e.target.value)} className="h-11 w-32 rounded-2xl border border-slate-200 px-4 font-black outline-none" />}</td>
                    <td className="px-5 py-4 font-black text-amber-600">{taux}%</td>
                    <td className="px-5 py-4">{totalRow ? row.observations : <input value={row.observations} onChange={(e) => updateRow(index, "observations", e.target.value)} placeholder="Observation..." className="h-11 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none" />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
