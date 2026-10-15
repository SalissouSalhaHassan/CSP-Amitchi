"use client";

import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, Search, Eye, GitCompareArrows, AlertTriangle, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const sheets = ["Identification", "Effectifs", "Personnel", "Infrastructures", "Mobilier", "Besoins"];
const cells = [
  { sheet: "Identification", cell: "B4", row: 4, col: "B", raw: "Ecole Excellence", formula: "-", field: "etablissements.nom", status: "Mappé", system: "Ecole Excellence" },
  { sheet: "Identification", cell: "E8", row: 8, col: "E", raw: "Niamey IV", formula: "-", field: "etablissements.commune", status: "Mappé", system: "Niamey IV" },
  { sheet: "Effectifs", cell: "C14", row: 14, col: "C", raw: "318", formula: "=SUM(C8:C13)", field: "effectifs.filles", status: "Mappé", system: "318" },
  { sheet: "Effectifs", cell: "D14", row: 14, col: "D", raw: "642", formula: "=SUM(D8:D13)", field: "effectifs.total", status: "Mappé", system: "642" },
  { sheet: "Mobilier", cell: "H22", row: 22, col: "H", raw: "Tableau fissuré", formula: "-", field: "-", status: "Non mappé", system: "-" },
  { sheet: "Besoins", cell: "F11", row: 11, col: "F", raw: "Critique", formula: "-", field: "besoins.priorite", status: "À vérifier", system: "Haute" },
];

export default function ExcelPreviewPage() {
  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8 print:bg-white print:p-0">
      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/canevas/import" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 print:hidden"><ArrowLeft size={19} /></Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100"><FileSpreadsheet size={26} /></div>
            <div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Import Excel</p><h1 className="text-3xl font-black tracking-tight">Aperçu Excel Brut</h1><p className="mt-1 text-sm font-bold text-slate-500">Vision cellule par cellule pour garantir aucune perte de données</p></div>
          </div>
          <div className="flex gap-2 print:hidden">
            <Link href="/dashboard/canevas/mapping-excel" className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white"><GitCompareArrows size={16} /> Mapping Excel</Link>
            <button className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700"><Download size={16} /> Export brut</button>
          </div>
        </div>
      </header>

      <section className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="px-2 text-sm font-black text-slate-950">Feuilles Excel</h2>
          <div className="mt-4 space-y-2">
            {sheets.map((sheet, index) => <button key={sheet} className={cn("flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-black", index === 0 ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-700")}><span>{sheet}</span><span>{index + 1}</span></button>)}
          </div>
        </aside>

        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm md:flex-row md:items-center">
            <div className="flex h-12 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4"><Search size={18} className="text-slate-400" /><input placeholder="Rechercher valeur, cellule, champ lié..." className="w-full bg-transparent text-sm font-bold outline-none" /></div>
            <button className="h-12 rounded-2xl border border-amber-100 bg-amber-50 px-4 text-xs font-black uppercase tracking-widest text-amber-700">Cellules non mapped</button>
            <button className="h-12 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 text-xs font-black uppercase tracking-widest text-indigo-700">Comparer système</button>
          </div>

          <section className="overflow-hidden rounded-[30px] border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400"><tr><th className="px-5 py-4">Sheet</th><th className="px-5 py-4">Cellule</th><th className="px-5 py-4">Ligne</th><th className="px-5 py-4">Colonne</th><th className="px-5 py-4">Valeur brute</th><th className="px-5 py-4">Formule</th><th className="px-5 py-4">Champ lié</th><th className="px-5 py-4">Statut mapping</th><th className="px-5 py-4">Valeur système</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {cells.map((item) => <tr key={`${item.sheet}-${item.cell}`} className="text-sm font-bold text-slate-700"><td className="px-5 py-4">{item.sheet}</td><td className="px-5 py-4 font-black text-indigo-600">{item.cell}</td><td className="px-5 py-4">{item.row}</td><td className="px-5 py-4">{item.col}</td><td className="px-5 py-4 font-black text-slate-950">{item.raw}</td><td className="px-5 py-4 text-slate-500">{item.formula}</td><td className="px-5 py-4">{item.field}</td><td className="px-5 py-4"><span className={cn("rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest", item.status === "Mappé" ? "bg-emerald-50 text-emerald-700" : item.status === "Non mappé" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700")}>{item.status}</span></td><td className="px-5 py-4">{item.system}</td></tr>)}
                </tbody>
              </table>
            </div>
          </section>
          <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-5 text-amber-800"><AlertTriangle size={20} /><p className="mt-2 text-sm font-black">Aucune suppression de données brutes</p><p className="mt-1 text-xs font-bold">Les cellules non mappées restent conservées pour audit et mapping ultérieur.</p></div>
        </div>
      </section>
    </div>
  );
}
