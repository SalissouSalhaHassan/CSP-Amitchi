"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Download, Printer, Save } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = { niveau: string; matiere: string; type: string; available: number | ""; students: number | ""; observations: string };

const tabs = ["Manuels eleves", "Guides maitres", "Synthese"];
const subjects = ["Lecture arabe", "Lecture francais", "Maths", "Etude du milieu arabe", "Etude du milieu francais"];
const initialData: Record<string, Row[]> = {
  "Manuels eleves": [
    { niveau: "CI", matiere: "Lecture francais", type: "Manuel eleve", available: 82, students: 104, observations: "" },
    { niveau: "CP", matiere: "Maths", type: "Manuel eleve", available: 91, students: 118, observations: "" },
    { niveau: "CE1", matiere: "Lecture arabe", type: "Manuel eleve", available: 78, students: 111, observations: "" },
    { niveau: "CE2", matiere: "Etude du milieu francais", type: "Manuel eleve", available: 88, students: 105, observations: "" },
    { niveau: "CM1", matiere: "Etude du milieu arabe", type: "Manuel eleve", available: 70, students: 98, observations: "" },
  ],
  "Guides maitres": [
    { niveau: "CI", matiere: "Lecture francais", type: "Guide maitre", available: 4, students: 3, observations: "" },
    { niveau: "CP", matiere: "Maths", type: "Guide maitre", available: 3, students: 3, observations: "" },
    { niveau: "CE1", matiere: "Lecture arabe", type: "Guide maitre", available: 2, students: 3, observations: "" },
    { niveau: "CE2", matiere: "Etude du milieu francais", type: "Guide maitre", available: 3, students: 3, observations: "" },
  ],
  Synthese: [],
};

const n = (value: number | "") => (typeof value === "number" && value >= 0 ? value : 0);

export default function ManuelsGuidesPage() {
  const [activeTab, setActiveTab] = useState("Manuels eleves");
  const [rowsByTab, setRowsByTab] = useState(initialData);
  const allRows = Object.entries(rowsByTab).filter(([key]) => key !== "Synthese").flatMap(([, rows]) => rows);
  const rows = activeTab === "Synthese" ? allRows : rowsByTab[activeTab];
  const totals = useMemo(() => {
    const available = allRows.reduce((sum, row) => sum + n(row.available), 0);
    const expected = allRows.reduce((sum, row) => sum + n(row.students), 0);
    return { available, expected, need: Math.max(0, expected - available), ratio: expected ? available / expected : 0 };
  }, [allRows]);

  const updateRow = (index: number, key: keyof Row, value: string) => {
    setRowsByTab((current) => ({
      ...current,
      [activeTab]: current[activeTab].map((row, i) => {
        if (i !== index) return row;
        if (key === "available" || key === "students") return { ...row, [key]: value === "" ? "" : Math.max(0, Number(value)) };
        return { ...row, [key]: value };
      }),
    }));
  };

  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8 print:bg-white print:p-0">
      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm print:border-b print:shadow-none">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/canevas/etablissements/ETB-2026-001" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 print:hidden"><ArrowLeft size={19} /></Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100"><BookOpen size={26} /></div>
            <div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Fiche Etablissement</p><h1 className="text-3xl font-black tracking-tight text-slate-950">Manuels & Guides</h1><p className="mt-1 text-sm font-bold text-slate-500">Suivi des livres scolaires et guides maitres</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white"><Save size={16} /> Enregistrer</button>
            <button className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700"><Download size={16} /> Exporter</button>
            <button onClick={() => window.print()} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700"><Printer size={16} /> Imprimer</button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        {[["Documents disponibles", totals.available, "bg-indigo-50 text-indigo-700"], ["Besoin reference", totals.expected, "bg-blue-50 text-blue-700"], ["Besoin estime", totals.need, "bg-amber-50 text-amber-700"], ["Ratio livre/eleve", totals.ratio.toFixed(2), "bg-emerald-50 text-emerald-700"]].map(([label, value, style]) => <div key={label} className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p><p className={cn("mt-2 inline-flex rounded-2xl px-4 py-2 text-3xl font-black", String(style))}>{value}</p></div>)}
      </section>

      <div className="flex flex-wrap gap-2 rounded-[24px] border border-slate-100 bg-white p-3 shadow-sm print:hidden">
        {tabs.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={cn("rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest transition", activeTab === tab ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100")}>{tab}</button>)}
      </div>

      <section className="overflow-hidden rounded-[30px] border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400"><tr><th className="px-5 py-4">Niveau</th><th className="px-5 py-4">Matiere</th><th className="px-5 py-4">Type document</th><th className="px-5 py-4">Quantite disponible</th><th className="px-5 py-4">Effectif eleves</th><th className="px-5 py-4">Ratio livre/eleve</th><th className="px-5 py-4">Besoin estime</th><th className="px-5 py-4">Observations</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => {
                const ratio = n(row.students) ? n(row.available) / n(row.students) : 0;
                const need = Math.max(0, n(row.students) - n(row.available));
                const readOnly = activeTab === "Synthese";
                return <tr key={`${row.niveau}-${row.matiere}-${index}`} className="text-sm font-bold text-slate-700">
                  <td className="px-5 py-4">{readOnly ? row.niveau : <input value={row.niveau} onChange={(e) => updateRow(index, "niveau", e.target.value)} className="h-11 w-28 rounded-2xl border border-slate-200 px-4 font-bold outline-none" />}</td>
                  <td className="px-5 py-4">{readOnly ? row.matiere : <select value={row.matiere} onChange={(e) => updateRow(index, "matiere", e.target.value)} className="h-11 w-52 rounded-2xl border border-slate-200 px-4 font-bold outline-none">{subjects.map((s) => <option key={s}>{s}</option>)}</select>}</td>
                  <td className="px-5 py-4 font-black text-slate-950">{row.type}</td>
                  <td className="px-5 py-4">{readOnly ? n(row.available) : <input type="number" min={0} value={row.available} onChange={(e) => updateRow(index, "available", e.target.value)} className="h-11 w-28 rounded-2xl border border-slate-200 px-4 font-black outline-none" />}</td>
                  <td className="px-5 py-4">{readOnly ? n(row.students) : <input type="number" min={0} value={row.students} onChange={(e) => updateRow(index, "students", e.target.value)} className="h-11 w-28 rounded-2xl border border-slate-200 px-4 font-black outline-none" />}</td>
                  <td className="px-5 py-4 font-black text-emerald-600">{ratio.toFixed(2)}</td>
                  <td className="px-5 py-4 font-black text-amber-600">{need}</td>
                  <td className="px-5 py-4">{readOnly ? row.observations || "-" : <input value={row.observations} onChange={(e) => updateRow(index, "observations", e.target.value)} placeholder="Observation..." className="h-11 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none" />}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
