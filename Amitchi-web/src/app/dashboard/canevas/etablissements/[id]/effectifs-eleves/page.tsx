"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Download, GraduationCap, Printer, Save, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = { niveau: string; total: number | ""; filles: number | ""; observations: string; cycle: "Prescolaire" | "Primaire" | "Total"; totalRow?: boolean };

const initialRows: Row[] = [
  { niveau: "Section 1", total: 52, filles: 25, observations: "", cycle: "Prescolaire" },
  { niveau: "Section 2", total: 58, filles: 28, observations: "", cycle: "Prescolaire" },
  { niveau: "CI", total: 104, filles: 50, observations: "", cycle: "Primaire" },
  { niveau: "CP", total: 118, filles: 58, observations: "", cycle: "Primaire" },
  { niveau: "CE1", total: 111, filles: 55, observations: "", cycle: "Primaire" },
  { niveau: "CE2", total: 105, filles: 52, observations: "", cycle: "Primaire" },
  { niveau: "CM1", total: 98, filles: 49, observations: "", cycle: "Primaire" },
  { niveau: "CM2", total: 106, filles: 54, observations: "", cycle: "Primaire" },
];

function n(value: number | "") {
  return typeof value === "number" && value >= 0 ? value : 0;
}

function sumRows(rows: Row[], cycle: "Prescolaire" | "Primaire") {
  const selected = rows.filter((r) => r.cycle === cycle);
  return {
    total: selected.reduce((s, r) => s + n(r.total), 0),
    filles: selected.reduce((s, r) => s + n(r.filles), 0),
  };
}

export default function EffectifsElevesPage() {
  const [rows, setRows] = useState(initialRows);
  const totals = useMemo(() => {
    const prescolaire = sumRows(rows, "Prescolaire");
    const primaire = sumRows(rows, "Primaire");
    return {
      prescolaire,
      primaire,
      general: { total: prescolaire.total + primaire.total, filles: prescolaire.filles + primaire.filles },
    };
  }, [rows]);
  const invalid = rows.filter((r) => n(r.filles) > n(r.total) || r.total === "" || r.filles === "");

  const updateRow = (index: number, key: "total" | "filles" | "observations", value: string) => {
    setRows((current) => current.map((row, i) => {
      if (i !== index) return row;
      if (key === "observations") return { ...row, observations: value };
      return { ...row, [key]: value === "" ? "" : Math.max(0, Number(value)) };
    }));
  };

  const displayRows: Row[] = [
    ...rows,
    { niveau: "Total prescolaire", total: totals.prescolaire.total, filles: totals.prescolaire.filles, observations: "Calcul automatique", cycle: "Total", totalRow: true },
    { niveau: "Total primaire", total: totals.primaire.total, filles: totals.primaire.filles, observations: "Calcul automatique", cycle: "Total", totalRow: true },
    { niveau: "Total general", total: totals.general.total, filles: totals.general.filles, observations: "Calcul automatique", cycle: "Total", totalRow: true },
  ];

  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8 print:bg-white print:p-0">
      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm print:border-b print:shadow-none">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/canevas/etablissements/ETB-2026-001" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 print:hidden">
              <ArrowLeft size={19} />
            </Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
              <GraduationCap size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Fiche Etablissement</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Effectifs Eleves</h1>
              <p className="mt-1 text-sm font-bold text-slate-500">Effectifs par niveau, sexe et controles automatiques</p>
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
          ["Total eleves", totals.general.total, "bg-indigo-50 text-indigo-700"],
          ["Filles", totals.general.filles, "bg-pink-50 text-pink-700"],
          ["Garcons", totals.general.total - totals.general.filles, "bg-blue-50 text-blue-700"],
          ["% Filles", `${totals.general.total ? Math.round((totals.general.filles / totals.general.total) * 100) : 0}%`, "bg-emerald-50 text-emerald-700"],
        ].map(([label, value, style]) => (
          <div key={label} className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <p className={cn("mt-2 inline-flex rounded-2xl px-4 py-2 text-3xl font-black", String(style))}>{value}</p>
          </div>
        ))}
      </section>

      {invalid.length > 0 && (
        <div className="flex items-start gap-3 rounded-[24px] border border-rose-100 bg-rose-50 p-5 text-rose-800">
          <AlertTriangle size={20} className="mt-0.5" />
          <div>
            <p className="text-sm font-black">Validation requise</p>
            <p className="mt-1 text-xs font-bold">Les filles ne doivent pas depasser le total, et les valeurs ne peuvent pas etre vides ou negatives.</p>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-[30px] border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-5 py-4">Niveau</th>
                <th className="px-5 py-4">Total eleves</th>
                <th className="px-5 py-4">Filles</th>
                <th className="px-5 py-4">Garcons automatique</th>
                <th className="px-5 py-4">% Filles</th>
                <th className="px-5 py-4">Observations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayRows.map((row, index) => {
                const garcons = Math.max(0, n(row.total) - n(row.filles));
                const pct = n(row.total) ? Math.round((n(row.filles) / n(row.total)) * 100) : 0;
                const rowInvalid = !row.totalRow && (n(row.filles) > n(row.total) || row.total === "" || row.filles === "");
                return (
                  <tr key={row.niveau} className={cn("text-sm font-bold", row.totalRow ? "bg-slate-50 text-slate-950" : rowInvalid ? "bg-rose-50/40 text-slate-700" : "text-slate-700")}>
                    <td className="px-5 py-4 font-black">{row.niveau}</td>
                    <td className="px-5 py-4">{row.totalRow ? <span className="text-lg font-black text-indigo-600">{row.total}</span> : <input type="number" min={0} value={row.total} onChange={(e) => updateRow(index, "total", e.target.value)} className="h-11 w-32 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black outline-none focus:border-indigo-300" />}</td>
                    <td className="px-5 py-4">{row.totalRow ? <span className="text-lg font-black text-pink-600">{row.filles}</span> : <input type="number" min={0} max={n(row.total)} value={row.filles} onChange={(e) => updateRow(index, "filles", e.target.value)} className="h-11 w-32 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black outline-none focus:border-indigo-300" />}</td>
                    <td className="px-5 py-4 font-black text-blue-600">{garcons}</td>
                    <td className="px-5 py-4 font-black text-emerald-600">{pct}%</td>
                    <td className="px-5 py-4">{row.totalRow ? row.observations : <input value={row.observations} onChange={(e) => updateRow(index, "observations", e.target.value)} placeholder="Observation..." className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-indigo-300" />}</td>
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
