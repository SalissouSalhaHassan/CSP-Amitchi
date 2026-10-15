"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Building2, CheckCircle2, Download, Printer, Save, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = { niveau: string; classes: number | ""; cycle: "Prescolaire" | "Primaire" | "Total"; observations: string; total?: boolean };

const initialRows: Row[] = [
  { niveau: "Prescolaire Section 1", classes: 2, cycle: "Prescolaire", observations: "" },
  { niveau: "Prescolaire Section 2", classes: 2, cycle: "Prescolaire", observations: "" },
  { niveau: "CI", classes: 3, cycle: "Primaire", observations: "" },
  { niveau: "CP", classes: 3, cycle: "Primaire", observations: "" },
  { niveau: "CE1", classes: 3, cycle: "Primaire", observations: "" },
  { niveau: "CE2", classes: 3, cycle: "Primaire", observations: "" },
  { niveau: "CM1", classes: 2, cycle: "Primaire", observations: "" },
  { niveau: "CM2", classes: 2, cycle: "Primaire", observations: "" },
];

function numberValue(value: number | "") {
  return typeof value === "number" && value >= 0 ? value : 0;
}

export default function GroupesPedagogiquesPage() {
  const [rows, setRows] = useState(initialRows);
  const totals = useMemo(() => {
    const prescolaire = rows.filter((r) => r.cycle === "Prescolaire").reduce((sum, r) => sum + numberValue(r.classes), 0);
    const primaire = rows.filter((r) => r.cycle === "Primaire").reduce((sum, r) => sum + numberValue(r.classes), 0);
    return { prescolaire, primaire, general: prescolaire + primaire };
  }, [rows]);
  const missing = rows.filter((r) => r.classes === "" || numberValue(r.classes) === 0);

  const updateRow = (index: number, key: "classes" | "observations", value: string) => {
    setRows((current) => current.map((row, i) => {
      if (i !== index) return row;
      if (key === "classes") return { ...row, classes: value === "" ? "" : Math.max(0, Number(value)) };
      return { ...row, observations: value };
    }));
  };

  const displayRows: Row[] = [
    ...rows,
    { niveau: "Total prescolaire", classes: totals.prescolaire, cycle: "Total", observations: "Calcul automatique", total: true },
    { niveau: "Total primaire", classes: totals.primaire, cycle: "Total", observations: "Calcul automatique", total: true },
    { niveau: "Total general", classes: totals.general, cycle: "Total", observations: "Calcul automatique", total: true },
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
              <Table2 size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Fiche Etablissement</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Groupes Pedagogiques</h1>
              <p className="mt-1 text-sm font-bold text-slate-500">Nombre de classes par niveau avec total automatique</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white"><Save size={16} /> Enregistrer</button>
            <button className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700"><Download size={16} /> Exporter</button>
            <button onClick={() => window.print()} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700"><Printer size={16} /> Imprimer</button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Total prescolaire", totals.prescolaire, "bg-violet-50 text-violet-700"],
          ["Total primaire", totals.primaire, "bg-indigo-50 text-indigo-700"],
          ["Total general", totals.general, "bg-emerald-50 text-emerald-700"],
        ].map(([label, value, style]) => (
          <div key={label} className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <p className={cn("mt-2 inline-flex rounded-2xl px-4 py-2 text-3xl font-black", String(style))}>{value}</p>
          </div>
        ))}
      </section>

      {missing.length > 0 && (
        <div className="flex items-start gap-3 rounded-[24px] border border-amber-100 bg-amber-50 p-5 text-amber-800">
          <AlertTriangle size={20} className="mt-0.5" />
          <div>
            <p className="text-sm font-black">Valeurs manquantes detectees</p>
            <p className="mt-1 text-xs font-bold">Veuillez renseigner le nombre de classes pour: {missing.map((r) => r.niveau).join(", ")}.</p>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-[30px] border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-5 py-4">Niveau</th>
                <th className="px-5 py-4">Nombre de classes</th>
                <th className="px-5 py-4">Cycle</th>
                <th className="px-5 py-4">Observations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayRows.map((row, index) => (
                <tr key={row.niveau} className={cn("text-sm font-bold", row.total ? "bg-slate-50 text-slate-950" : "text-slate-700")}>
                  <td className="px-5 py-4 font-black">{row.niveau}</td>
                  <td className="px-5 py-4">
                    {row.total ? <span className="text-lg font-black text-indigo-600">{row.classes}</span> : (
                      <input type="number" min={0} value={row.classes} onChange={(e) => updateRow(index, "classes", e.target.value)} className="h-11 w-32 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black outline-none focus:border-indigo-300" />
                    )}
                  </td>
                  <td className="px-5 py-4">{row.cycle}</td>
                  <td className="px-5 py-4">
                    {row.total ? row.observations : <input value={row.observations} onChange={(e) => updateRow(index, "observations", e.target.value)} placeholder="Observation..." className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-indigo-300" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
