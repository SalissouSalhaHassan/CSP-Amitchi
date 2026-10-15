"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, Eye, ShieldAlert, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const kpis = [
  ["Erreurs bloquantes", "7", "bg-rose-50 text-rose-700"],
  ["Avertissements", "14", "bg-amber-50 text-amber-700"],
  ["Champs manquants", "9", "bg-orange-50 text-orange-700"],
  ["Totaux incohérents", "4", "bg-red-50 text-red-700"],
  ["Données non mappées", "22", "bg-violet-50 text-violet-700"],
  ["Taux de complétude", "91%", "bg-emerald-50 text-emerald-700"],
];
const issues = [
  { gravity: "Bloquant", school: "Ecole Excellence", section: "Effectifs", field: "Filles", value: "380 > 342", problem: "filles > total", correction: "Limiter filles au total déclaré", status: "Ouvert" },
  { gravity: "Bloquant", school: "Ecole Bobiel", section: "Effectifs", field: "Total général", value: "642 / 638", problem: "total niveaux ≠ total général", correction: "Recalculer total général", status: "Ouvert" },
  { gravity: "Avertissement", school: "Ecole Excellence", section: "Mobilier", field: "Mauvais état", value: "45 > 40", problem: "mobilier mauvais > total", correction: "Corriger total ou mauvais état", status: "À vérifier" },
  { gravity: "Bloquant", school: "Ecole Lazaret", section: "Infrastructures", field: "Salles utilisées", value: "14 > 12", problem: "salles utilisées > salles total", correction: "Réduire salles utilisées", status: "Ouvert" },
  { gravity: "Avertissement", school: "Ecole Sahel", section: "Services", field: "Latrines", value: "10 > 8", problem: "latrines fonctionnelles > total", correction: "Corriger latrines fonctionnelles", status: "À vérifier" },
  { gravity: "Bloquant", school: "-", section: "Identification", field: "Code école", value: "-", problem: "code école manquant", correction: "Générer ou saisir code école", status: "Ouvert" },
  { gravity: "Avertissement", school: "Ecole Excellence", section: "Contact", field: "Téléphone", value: "9000", problem: "contact invalide", correction: "Saisir numéro complet", status: "Corrigé" },
];

export default function ControleQualitePage() {
  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8">
      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="flex items-center gap-4"><Link href="/dashboard/canevas/import" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500"><ArrowLeft size={19} /></Link><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100"><ClipboardCheck size={26} /></div><div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Import Excel</p><h1 className="text-3xl font-black tracking-tight">Contrôle Qualité</h1><p className="mt-1 text-sm font-bold text-slate-500">Détection des erreurs avant adoption des données</p></div></div><button className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white"><CheckCircle2 size={16} /> Valider les corrections</button></div></header>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">{kpis.map(([label, value, style]) => <div key={label} className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p><p className={cn("mt-2 inline-flex rounded-2xl px-4 py-2 text-2xl font-black", style)}>{value}</p></div>)}</section>
      <section className="overflow-hidden rounded-[30px] border border-slate-100 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[1250px] text-left"><thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400"><tr><th className="px-5 py-4">Niveau gravité</th><th className="px-5 py-4">Établissement</th><th className="px-5 py-4">Section</th><th className="px-5 py-4">Champ</th><th className="px-5 py-4">Valeur</th><th className="px-5 py-4">Problème</th><th className="px-5 py-4">Correction proposée</th><th className="px-5 py-4">Statut</th><th className="px-5 py-4">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{issues.map((issue) => <tr key={`${issue.school}-${issue.field}-${issue.problem}`} className="text-sm font-bold text-slate-700"><td className="px-5 py-4"><span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest", issue.gravity === "Bloquant" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700")}>{issue.gravity === "Bloquant" ? <ShieldAlert size={13} /> : <AlertTriangle size={13} />}{issue.gravity}</span></td><td className="px-5 py-4 font-black text-slate-950">{issue.school}</td><td className="px-5 py-4">{issue.section}</td><td className="px-5 py-4">{issue.field}</td><td className="px-5 py-4 font-black text-indigo-600">{issue.value}</td><td className="px-5 py-4">{issue.problem}</td><td className="px-5 py-4">{issue.correction}</td><td className="px-5 py-4">{issue.status}</td><td className="px-5 py-4"><div className="flex gap-2"><button className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 text-indigo-600"><Eye size={16} /></button><button className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-100 text-emerald-600"><Wrench size={16} /></button></div></td></tr>)}</tbody></table></div></section>
    </div>
  );
}
