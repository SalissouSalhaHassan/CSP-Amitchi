"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer, Save, UserRoundCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = { category: string; niveau: string; hommes: number | ""; femmes: number | ""; statut: string; observations: string };

const tabs = ["Public titulaires", "Public contractuels", "Prive", "Autres personnels", "Synthese"];
const data: Record<string, Row[]> = {
  "Public titulaires": [
    { category: "Instituteurs titulaires", niveau: "CI - CP", hommes: 5, femmes: 4, statut: "Actif", observations: "" },
    { category: "Instituteurs titulaires", niveau: "CE1 - CE2", hommes: 4, femmes: 3, statut: "Actif", observations: "" },
    { category: "Instituteurs adjoints", niveau: "CM1 - CM2", hommes: 3, femmes: 2, statut: "Actif", observations: "" },
  ],
  "Public contractuels": [
    { category: "Contractuels", niveau: "Primaire", hommes: 2, femmes: 1, statut: "Contrat", observations: "" },
    { category: "Contractuels", niveau: "Prescolaire", hommes: 0, femmes: 2, statut: "Contrat", observations: "" },
  ],
  Prive: [
    { category: "Enseignants prives", niveau: "Primaire", hommes: 7, femmes: 5, statut: "Actif", observations: "" },
    { category: "Enseignants prives", niveau: "Prescolaire", hommes: 1, femmes: 3, statut: "Actif", observations: "" },
  ],
  "Autres personnels": [
    { category: "Directeur", niveau: "Administration", hommes: 1, femmes: 0, statut: "Actif", observations: "" },
    { category: "Personnel administratif", niveau: "Administration", hommes: 2, femmes: 2, statut: "Actif", observations: "" },
  ],
  Synthese: [],
};

const n = (value: number | "") => (typeof value === "number" && value >= 0 ? value : 0);

export default function PersonnelEnseignantPage() {
  const [activeTab, setActiveTab] = useState("Public titulaires");
  const [rowsByTab, setRowsByTab] = useState(data);
  const allRows = Object.entries(rowsByTab).filter(([key]) => key !== "Synthese").flatMap(([, rows]) => rows);
  const totals = useMemo(() => {
    const hommes = allRows.reduce((sum, row) => sum + n(row.hommes), 0);
    const femmes = allRows.reduce((sum, row) => sum + n(row.femmes), 0);
    const total = hommes + femmes;
    return { hommes, femmes, total, ratio: total ? Math.round(642 / total) : 0, besoin: Math.max(0, Math.ceil(642 / 35) - total) };
  }, [allRows]);
  const visibleRows = activeTab === "Synthese" ? allRows : rowsByTab[activeTab];

  const updateRow = (index: number, key: keyof Row, value: string) => {
    setRowsByTab((current) => ({
      ...current,
      [activeTab]: current[activeTab].map((row, i) => {
        if (i !== index) return row;
        if (key === "hommes" || key === "femmes") return { ...row, [key]: value === "" ? "" : Math.max(0, Number(value)) };
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
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100"><UserRoundCheck size={26} /></div>
            <div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Fiche Etablissement</p><h1 className="text-3xl font-black tracking-tight text-slate-950">Personnel Enseignant</h1><p className="mt-1 text-sm font-bold text-slate-500">Gestion des enseignants par statut, niveau et genre</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white"><Save size={16} /> Enregistrer</button>
            <button className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700"><Download size={16} /> Exporter</button>
            <button onClick={() => window.print()} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700"><Printer size={16} /> Imprimer</button>
          </div>
        </div>
      </header>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2 rounded-[24px] border border-slate-100 bg-white p-3 shadow-sm print:hidden">
            {tabs.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={cn("rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest transition", activeTab === tab ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100")}>{tab}</button>)}
          </div>
          <section className="overflow-hidden rounded-[30px] border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400"><tr><th className="px-5 py-4">Categorie personnel</th><th className="px-5 py-4">Niveau</th><th className="px-5 py-4">Hommes</th><th className="px-5 py-4">Femmes</th><th className="px-5 py-4">Total</th><th className="px-5 py-4">Statut</th><th className="px-5 py-4">Observations</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRows.map((row, index) => (
                    <tr key={`${row.category}-${index}`} className="text-sm font-bold text-slate-700">
                      <td className="px-5 py-4 font-black text-slate-950">{row.category}</td>
                      <td className="px-5 py-4">{activeTab === "Synthese" ? row.niveau : <input value={row.niveau} onChange={(e) => updateRow(index, "niveau", e.target.value)} className="h-11 w-40 rounded-2xl border border-slate-200 px-4 font-bold outline-none" />}</td>
                      <td className="px-5 py-4">{activeTab === "Synthese" ? n(row.hommes) : <input type="number" min={0} value={row.hommes} onChange={(e) => updateRow(index, "hommes", e.target.value)} className="h-11 w-28 rounded-2xl border border-slate-200 px-4 font-black outline-none" />}</td>
                      <td className="px-5 py-4">{activeTab === "Synthese" ? n(row.femmes) : <input type="number" min={0} value={row.femmes} onChange={(e) => updateRow(index, "femmes", e.target.value)} className="h-11 w-28 rounded-2xl border border-slate-200 px-4 font-black outline-none" />}</td>
                      <td className="px-5 py-4 font-black text-indigo-600">{n(row.hommes) + n(row.femmes)}</td>
                      <td className="px-5 py-4">{activeTab === "Synthese" ? row.statut : <input value={row.statut} onChange={(e) => updateRow(index, "statut", e.target.value)} className="h-11 w-32 rounded-2xl border border-slate-200 px-4 font-bold outline-none" />}</td>
                      <td className="px-5 py-4">{activeTab === "Synthese" ? row.observations || "-" : <input value={row.observations} onChange={(e) => updateRow(index, "observations", e.target.value)} placeholder="Observation..." className="h-11 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <aside className="space-y-4">
          {[
            ["Total enseignants", totals.total, "bg-indigo-50 text-indigo-700"],
            ["Femmes", totals.femmes, "bg-pink-50 text-pink-700"],
            ["Hommes", totals.hommes, "bg-blue-50 text-blue-700"],
            ["Ratio eleves/enseignant", `1/${totals.ratio}`, "bg-emerald-50 text-emerald-700"],
            ["Besoin enseignants", totals.besoin, "bg-amber-50 text-amber-700"],
          ].map(([label, value, style]) => <div key={label} className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p><p className={cn("mt-2 inline-flex rounded-2xl px-4 py-2 text-3xl font-black", String(style))}>{value}</p></div>)}
          <div className="rounded-[24px] border border-indigo-100 bg-indigo-50 p-5 text-indigo-900"><Users size={20} /><p className="mt-3 text-sm font-black">Synthese automatique</p><p className="mt-2 text-xs font-bold leading-5">Les totaux sont recalcules a partir des onglets public, prive et autres personnels.</p></div>
        </aside>
      </section>
    </div>
  );
}
