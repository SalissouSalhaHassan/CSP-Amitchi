"use client";

import Link from "next/link";
import { ArrowLeft, Eye, GitCompareArrows, PlayCircle, Search, ShieldOff, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

const rows = [
  { sheet: "Identification", column: "B", header: "Nom école", section: "Identification", table: "etablissements", field: "nom", type: "Texte", required: "Oui", status: "Mappé" },
  { sheet: "Identification", column: "E", header: "Commune", section: "Localisation", table: "etablissements", field: "commune", type: "Texte", required: "Oui", status: "Mappé" },
  { sheet: "Effectifs", column: "C", header: "Filles", section: "Effectifs", table: "effectifs_eleves", field: "filles", type: "Nombre", required: "Oui", status: "Mappé" },
  { sheet: "Mobilier", column: "H", header: "Observation mobilier", section: "Mobilier", table: "mobilier", field: "observations", type: "Texte", required: "Non", status: "À tester" },
  { sheet: "Besoins", column: "F", header: "Priorité", section: "Besoins", table: "besoins", field: "priorite", type: "Enum", required: "Oui", status: "Non mappé" },
];

export default function MappingExcelPage() {
  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8">
      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4"><Link href="/dashboard/canevas/import" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500"><ArrowLeft size={19} /></Link><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100"><GitCompareArrows size={26} /></div><div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Import Excel</p><h1 className="text-3xl font-black tracking-tight">Mapping Excel</h1><p className="mt-1 text-sm font-bold text-slate-500">Relier les colonnes Excel aux tables et champs de l’application</p></div></div>
          <Link href="/dashboard/canevas/controle-qualite" className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white"><PlayCircle size={16} /> Contrôle qualité</Link>
        </div>
      </header>
      <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm"><Search size={18} className="text-slate-400" /><input placeholder="Rechercher sheet, colonne, champ cible..." className="w-full bg-transparent text-sm font-bold outline-none" /></div>
      <section className="overflow-hidden rounded-[30px] border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto"><table className="w-full min-w-[1300px] text-left"><thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400"><tr><th className="px-5 py-4">Sheet name</th><th className="px-5 py-4">Excel column</th><th className="px-5 py-4">Excel header</th><th className="px-5 py-4">Section</th><th className="px-5 py-4">Table cible</th><th className="px-5 py-4">Champ cible</th><th className="px-5 py-4">Type donnée</th><th className="px-5 py-4">Obligatoire</th><th className="px-5 py-4">Statut mapping</th><th className="px-5 py-4">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={`${row.sheet}-${row.column}`} className="text-sm font-bold text-slate-700"><td className="px-5 py-4">{row.sheet}</td><td className="px-5 py-4 font-black text-indigo-600">{row.column}</td><td className="px-5 py-4">{row.header}</td><td className="px-5 py-4">{row.section}</td><td className="px-5 py-4">{row.table}</td><td className="px-5 py-4 font-black text-slate-950">{row.field}</td><td className="px-5 py-4">{row.type}</td><td className="px-5 py-4">{row.required}</td><td className="px-5 py-4"><span className={cn("rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest", row.status === "Mappé" ? "bg-emerald-50 text-emerald-700" : row.status === "Non mappé" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700")}>{row.status}</span></td><td className="px-5 py-4"><div className="flex gap-2"><button title="Mapper" className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 text-indigo-600"><Wand2 size={16} /></button><button title="Ignorer sans suppression" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500"><ShieldOff size={16} /></button><button title="Tester mapping" className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-100 text-emerald-600"><PlayCircle size={16} /></button><button title="Voir exemples" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500"><Eye size={16} /></button></div></td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}
