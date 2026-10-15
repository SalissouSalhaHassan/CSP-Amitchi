"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, Droplets, Home, Lightbulb, Printer, Save, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Room = { type: string; total: number | ""; used: number | ""; functional: number | ""; bad: number | ""; observations: string };

const initialRooms: Room[] = [
  { type: "Dur", total: 12, used: 11, functional: 10, bad: 2, observations: "" },
  { type: "Semi dur", total: 4, used: 4, functional: 3, bad: 1, observations: "" },
  { type: "Banco", total: 1, used: 1, functional: 1, bad: 0, observations: "" },
  { type: "Prefabriquee", total: 1, used: 1, functional: 1, bad: 0, observations: "" },
  { type: "Paillote", total: 0, used: 0, functional: 0, bad: 0, observations: "" },
  { type: "Espace temporaire", total: 0, used: 0, functional: 0, bad: 0, observations: "" },
];

const n = (value: number | "") => (typeof value === "number" && value >= 0 ? value : 0);

export default function InfrastructuresPage() {
  const [rooms, setRooms] = useState(initialRooms);
  const [services, setServices] = useState({
    electricity: true,
    water: true,
    latrinesTotal: 12,
    latrinesFunctional: 10,
    wall: false,
    garden: true,
    preschoolRooms: 2,
    preschoolFunctional: 2,
    generalState: "Bon",
  });

  const totals = useMemo(() => rooms.reduce((acc, room) => ({
    total: acc.total + n(room.total),
    used: acc.used + n(room.used),
    functional: acc.functional + n(room.functional),
    bad: acc.bad + n(room.bad),
  }), { total: 0, used: 0, functional: 0, bad: 0 }), [rooms]);
  const invalid = rooms.filter((room) => n(room.used) > n(room.total) || n(room.functional) > n(room.total) || n(room.bad) > n(room.total));

  const updateRoom = (index: number, key: keyof Room, value: string) => {
    setRooms((current) => current.map((room, i) => {
      if (i !== index) return room;
      if (key === "type") return room;
      if (key === "observations") return { ...room, observations: value };
      return { ...room, [key]: value === "" ? "" : Math.max(0, Number(value)) };
    }));
  };

  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8 print:bg-white print:p-0">
      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm print:border-b print:shadow-none">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/canevas/etablissements/ETB-2026-001" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 print:hidden"><ArrowLeft size={19} /></Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100"><Home size={26} /></div>
            <div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Fiche Etablissement</p><h1 className="text-3xl font-black tracking-tight text-slate-950">Infrastructures</h1><p className="mt-1 text-sm font-bold text-slate-500">Gestion des salles, services essentiels et etat general</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white"><Save size={16} /> Enregistrer</button>
            <button className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700"><Download size={16} /> Exporter</button>
            <button onClick={() => window.print()} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700"><Printer size={16} /> Imprimer</button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        {[["Total salles", totals.total, "bg-indigo-50 text-indigo-700"], ["Utilisees", totals.used, "bg-blue-50 text-blue-700"], ["Fonctionnelles", totals.functional, "bg-emerald-50 text-emerald-700"], ["Mauvais etat", totals.bad, "bg-rose-50 text-rose-700"]].map(([label, value, style]) => (
          <div key={label} className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p><p className={cn("mt-2 inline-flex rounded-2xl px-4 py-2 text-3xl font-black", String(style))}>{value}</p></div>
        ))}
      </section>

      {invalid.length > 0 && <div className="flex items-start gap-3 rounded-[24px] border border-rose-100 bg-rose-50 p-5 text-rose-800"><AlertTriangle size={20} /><div><p className="text-sm font-black">Controle requis</p><p className="mt-1 text-xs font-bold">Les valeurs utilisees, fonctionnelles et mauvais etat ne doivent pas depasser le total.</p></div></div>}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-[30px] border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5"><h2 className="text-base font-black text-slate-950">1. Salles de classe</h2><p className="mt-1 text-xs font-bold text-slate-500">Etat des infrastructures par type de construction</p></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400"><tr><th className="px-5 py-4">Type infrastructure</th><th className="px-5 py-4">Total</th><th className="px-5 py-4">Utilisees</th><th className="px-5 py-4">Non utilisees</th><th className="px-5 py-4">Fonctionnelles</th><th className="px-5 py-4">Mauvais etat</th><th className="px-5 py-4">Observations</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {rooms.map((room, index) => (
                    <tr key={room.type} className="text-sm font-bold text-slate-700">
                      <td className="px-5 py-4 font-black text-slate-950">{room.type}</td>
                      {(["total", "used"] as const).map((key) => <td key={key} className="px-5 py-4"><input type="number" min={0} value={room[key]} onChange={(e) => updateRoom(index, key, e.target.value)} className="h-11 w-28 rounded-2xl border border-slate-200 px-4 font-black outline-none" /></td>)}
                      <td className="px-5 py-4 font-black text-indigo-600">{Math.max(0, n(room.total) - n(room.used))}</td>
                      {(["functional", "bad"] as const).map((key) => <td key={key} className="px-5 py-4"><input type="number" min={0} value={room[key]} onChange={(e) => updateRoom(index, key, e.target.value)} className="h-11 w-28 rounded-2xl border border-slate-200 px-4 font-black outline-none" /></td>)}
                      <td className="px-5 py-4"><input value={room.observations} onChange={(e) => updateRoom(index, "observations", e.target.value)} placeholder="Observation..." className="h-11 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm"><h2 className="text-base font-black text-slate-950">3. Prescolaire</h2><div className="mt-5 grid gap-3 md:grid-cols-2"><label className="rounded-2xl bg-slate-50 p-4"><span className="text-[10px] font-black uppercase text-slate-400">Salles prescolaires</span><input type="number" min={0} value={services.preschoolRooms} onChange={(e) => setServices({ ...services, preschoolRooms: Math.max(0, Number(e.target.value)) })} className="mt-2 w-full bg-transparent text-xl font-black outline-none" /></label><label className="rounded-2xl bg-slate-50 p-4"><span className="text-[10px] font-black uppercase text-slate-400">Fonctionnelles</span><input type="number" min={0} value={services.preschoolFunctional} onChange={(e) => setServices({ ...services, preschoolFunctional: Math.max(0, Number(e.target.value)) })} className="mt-2 w-full bg-transparent text-xl font-black outline-none" /></label></div></div>
            <div className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm"><h2 className="text-base font-black text-slate-950">4. Etat general</h2><select value={services.generalState} onChange={(e) => setServices({ ...services, generalState: e.target.value })} className="mt-5 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-black outline-none"><option>Bon</option><option>Moyen</option><option>Mauvais</option><option>Critique</option></select></div>
          </section>
        </div>

        <aside className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-black text-slate-950">2. Services essentiels</h2>
          <div className="mt-5 space-y-4">
            {[["electricity", "Electricite", Lightbulb], ["water", "Point d'eau", Droplets], ["wall", "Mur de cloture", ShieldCheck], ["garden", "Jardin scolaire", Home]].map(([key, label, Icon]: any) => (
              <label key={key} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4"><span className="flex items-center gap-3 text-sm font-black text-slate-800"><Icon size={18} className="text-indigo-500" /> {label}</span><input type="checkbox" checked={(services as any)[key]} onChange={(e) => setServices({ ...services, [key]: e.target.checked })} className="h-5 w-5" /></label>
            ))}
            <label className="block rounded-2xl border border-slate-100 p-4"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Latrines total</span><input type="number" min={0} value={services.latrinesTotal} onChange={(e) => setServices({ ...services, latrinesTotal: Math.max(0, Number(e.target.value)) })} className="mt-2 w-full text-2xl font-black outline-none" /></label>
            <label className="block rounded-2xl border border-slate-100 p-4"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Latrines fonctionnelles</span><input type="number" min={0} value={services.latrinesFunctional} onChange={(e) => setServices({ ...services, latrinesFunctional: Math.max(0, Number(e.target.value)) })} className="mt-2 w-full text-2xl font-black outline-none" /></label>
            <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-800"><CheckCircle2 size={20} /><p className="mt-2 text-sm font-black">Controle automatique actif</p><p className="mt-1 text-xs font-bold">Les totaux et anomalies sont recalcules en temps reel.</p></div>
          </div>
        </aside>
      </section>
    </div>
  );
}
