"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Download,
  Edit3,
  FileText,
  Globe2,
  Hash,
  Home,
  Mail,
  MapPin,
  Phone,
  Printer,
  Save,
  ShieldCheck,
  Table2,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const fields = {
  general: [
    ["Code etablissement", "ETB-2026-001"],
    ["Nom officiel", "Ecole Excellence"],
    ["Nom usuel", "Ecole Excellence"],
    ["Type", "Prive"],
    ["Cycle principal", "Primaire"],
    ["Statut fonctionnement", "Ouvert"],
    ["Annee scolaire", "2025 - 2026"],
    ["Date creation", "12/09/2018"],
  ],
  administrative: [
    ["Identifiant ministere", "MEN-NE-NY4-0001"],
    ["Numero autorisation", "AR-2024-1187"],
    ["Tutelle", "Ministere de l'Education Nationale"],
    ["Inspection", "Inspection Niamey IV"],
    ["Secteur pedagogique", "Secteur Yantala"],
    ["Regime", "Mixte"],
    ["Langue enseignement", "Francais"],
    ["Reconnaissance", "Validee"],
  ],
  localisation: [
    ["Region", "Niamey"],
    ["Departement", "Niamey"],
    ["Commune", "Niamey IV"],
    ["Quartier / Village", "Yantala Haut"],
    ["Adresse", "Avenue des Ecoles, Yantala Haut"],
    ["Latitude", "13.5248"],
    ["Longitude", "2.1098"],
    ["Zone", "Urbaine"],
  ],
  contact: [
    ["Directeur", "Salissou Salha Hassan"],
    ["Telephone", "+227 90 00 00 00"],
    ["Email", "contact@ecole-excellence.ne"],
    ["Boite postale", "BP 1120 Niamey"],
    ["Promoteur", "Fondation Excellence"],
    ["Telephone promoteur", "+227 91 00 00 00"],
  ],
};

const checks = [
  { label: "Code unique", status: "Valide", color: "emerald" },
  { label: "Localisation complete", status: "Valide", color: "emerald" },
  { label: "Autorisation administrative", status: "Valide", color: "emerald" },
  { label: "Contact directeur", status: "Valide", color: "emerald" },
  { label: "Coordonnees GPS", status: "A verifier", color: "amber" },
];

function FieldCard({ label, value }: { label: string; value: string }) {
  return (
    <label className="block rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <input value={value} readOnly className="mt-2 w-full bg-transparent text-sm font-black text-slate-900 outline-none" />
    </label>
  );
}

function Section({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: any; children: React.ReactNode }) {
  return (
    <section className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Icon size={20} />
        </div>
        <div>
          <h2 className="text-base font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
    </section>
  );
}

export default function IdentificationPage() {
  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8 print:bg-white print:p-0">
      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm print:border-b print:shadow-none">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/canevas/etablissements/ETB-2026-001" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 print:hidden">
              <ArrowLeft size={19} />
            </Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
              <FileText size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Fiche Etablissement</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Identification</h1>
              <p className="mt-1 text-sm font-bold text-slate-500">Informations officielles, administratives et geographiques</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-100">
              <Save size={16} /> Enregistrer
            </button>
            <button className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700">
              <Edit3 size={16} /> Modifier
            </button>
            <button className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700">
              <Download size={16} /> Exporter
            </button>
            <button onClick={() => window.print()} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700">
              <Printer size={16} /> Imprimer
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-indigo-50 text-indigo-600">
                  <Building2 size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-950">Ecole Excellence</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">ETB-2026-001 · Prive · Primaire · Niamey IV</p>
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
                Identification complete a 96%
              </div>
            </div>
          </section>

          <Section title="Identification generale" subtitle="Noms, classification et statut de l'etablissement" icon={Hash}>
            {fields.general.map(([label, value]) => <FieldCard key={label} label={label} value={value} />)}
          </Section>

          <Section title="Informations administratives" subtitle="References officielles et rattachements administratifs" icon={ShieldCheck}>
            {fields.administrative.map(([label, value]) => <FieldCard key={label} label={label} value={value} />)}
          </Section>

          <Section title="Localisation" subtitle="Situation geographique, commune et coordonnees GPS" icon={MapPin}>
            {fields.localisation.map(([label, value]) => <FieldCard key={label} label={label} value={value} />)}
          </Section>

          <Section title="Contact et responsables" subtitle="Direction, promoteur et moyens de contact" icon={Phone}>
            {fields.contact.map(([label, value]) => <FieldCard key={label} label={label} value={value} />)}
          </Section>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-black text-slate-950">Controle identification</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">Qualite des donnees avant validation</p>
            <div className="mt-5 space-y-3">
              {checks.map((check) => (
                <div key={check.label} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", check.color === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                    <CheckCircle2 size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-950">{check.label}</p>
                    <p className={cn("mt-1 text-xs font-black", check.color === "emerald" ? "text-emerald-600" : "text-amber-600")}>{check.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-black text-slate-950">Navigation fiche</h2>
            <div className="mt-5 space-y-2">
              {[
                ["Fiche complete", "/dashboard/canevas/etablissements/ETB-2026-001", Building2],
                ["Identification", "/dashboard/canevas/etablissements/ETB-2026-001/identification", FileText],
                ["Groupes pedagogiques", "/dashboard/canevas/etablissements/ETB-2026-001/groupes-pedagogiques", Table2],
                ["Effectifs eleves", "/dashboard/canevas/etablissements/ETB-2026-001/effectifs-eleves", Users],
                ["Redoublants", "/dashboard/canevas/etablissements/ETB-2026-001/redoublants", Users],
                ["Personnel enseignant", "/dashboard/canevas/etablissements/ETB-2026-001/personnel-enseignant", UserRound],
                ["Infrastructures", "/dashboard/canevas/etablissements/ETB-2026-001/infrastructures", Home],
                ["Mobilier", "/dashboard/canevas/etablissements/ETB-2026-001/mobilier", Building2],
                ["Manuels & guides", "/dashboard/canevas/etablissements/ETB-2026-001/manuels-guides", FileText],
                ["Besoins", "/dashboard/canevas/etablissements/ETB-2026-001/besoins", ShieldCheck],
                ["Localisation", "#", MapPin],
                ["Responsables", "#", UserRound],
                ["Infrastructure", "#", Home],
                ["Contacts", "#", Mail],
                ["Coordonnees", "#", Globe2],
              ].map(([label, href, Icon]: any) => (
                <Link key={label} href={href} className={cn("flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition", label === "Identification" ? "bg-indigo-600 text-white" : "border border-slate-100 text-slate-700 hover:bg-slate-50")}>
                  <Icon size={17} />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
