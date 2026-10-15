"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Download,
  Droplets,
  Edit3,
  FileText,
  GraduationCap,
  Home,
  Lightbulb,
  MapPin,
  Phone,
  Printer,
  ShieldCheck,
  Table2,
  UserRoundCheck,
  Users,
  X,
  Clock,
  ArrowUpRight,
  Shield,
  Check,
  Activity,
  FileCheck2,
  AlertCircle,
  FolderLock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const establishmentInfo = {
  code: "ETB-2026-001",
  name: "Ecole Excellence",
  type: "Prive",
  cycle: "Primaire",
  ministereId: "MEN-NE-NY4-0001",
  autorisation: "AR-2024-1187",
  region: "Niamey",
  departement: "Niamey",
  commune: "Niamey IV",
  quartier: "Yantala",
  adresse: "Avenue des Ecoles, Yantala Haut",
  telephone: "+227 90 00 00 00",
  email: "contact@ecole-excellence.ne",
  directeur: "Salissou Salha Hassan",
  annee: "2025 - 2026",
  updatedAt: "27/06/2026",
  completion: 98,
};

const kpis = [
  { label: "Total eleves", value: "642", icon: GraduationCap, color: "text-indigo-600", bg: "bg-indigo-50" },
  { label: "Filles", value: "318", icon: Users, color: "text-pink-600", bg: "bg-pink-50" },
  { label: "Garcons", value: "324", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Enseignants", value: "24", icon: UserRoundCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Salles", value: "18", icon: Building2, color: "text-amber-600", bg: "bg-amber-50" },
  { label: "Completion", value: "98%", icon: CheckCircle2, color: "text-teal-600", bg: "bg-teal-50" },
];

const levels = [
  { niveau: "CI", total: 104, filles: 50, garcons: 54, redoublants: 4 },
  { niveau: "CP", total: 118, filles: 58, garcons: 60, redoublants: 6 },
  { niveau: "CE1", total: 111, filles: 55, garcons: 56, redoublants: 5 },
  { niveau: "CE2", total: 105, filles: 52, garcons: 53, redoublants: 3 },
  { niveau: "CM1", total: 98, filles: 49, garcons: 49, redoublants: 4 },
  { niveau: "CM2", total: 106, filles: 54, garcons: 52, redoublants: 2 },
];

const infrastructure = [
  { label: "Point d'eau", value: "Disponible", icon: Droplets, status: "ok" },
  { label: "Electricite", value: "Disponible", icon: Lightbulb, status: "ok" },
  { label: "Latines fonctionnelles", value: "12 blocs", icon: Home, status: "ok" },
  { label: "Cloture", value: "Partielle", icon: ShieldCheck, status: "warn" },
];

const needs = [
  { label: "Tables bancs", quantity: 42, priority: "Elevee" },
  { label: "Armoires pedagogiques", quantity: 8, priority: "Moyenne" },
  { label: "Rehabilitation salles", quantity: 2, priority: "Critique" },
];

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-base font-black text-slate-950">{title}</h2>
      <p className="mt-1 text-xs font-bold text-slate-500">{subtitle}</p>
    </div>
  );
}

type CanevasStatus = 
  | "Brouillon"
  | "En correction"
  | "Validé école"
  | "Rejeté inspection"
  | "Validé inspection"
  | "Validé DREN"
  | "Transmis ministère"
  | "Archivé";

export default function FicheEtablissementPage() {
  const [status, setStatus] = useState<CanevasStatus>("Brouillon");
  const [rejectionObservation, setRejectionObservation] = useState<string>("");
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [tempObservation, setTempObservation] = useState<string>("");

  // Handler for state progression
  const handleTransition = (nextStatus: CanevasStatus, successMessage: string) => {
    setStatus(nextStatus);
    toast.success(successMessage);
  };

  const handleRejectSubmit = () => {
    if (!tempObservation.trim()) {
      toast.error("Veuillez saisir une observation pour expliquer le rejet.");
      return;
    }
    setRejectionObservation(tempObservation);
    setStatus("Rejeté inspection");
    setShowRejectModal(false);
    toast.warning("Dossier canevas rejeté avec observation.");
  };

  // Status Badge classes helper
  const getStatusBadgeStyle = (currentStatus: CanevasStatus) => {
    const styles: Record<CanevasStatus, string> = {
      Brouillon: "border-slate-200 bg-slate-50 text-slate-500",
      "En correction": "border-amber-150 bg-amber-50 text-amber-600",
      "Validé école": "border-blue-150 bg-blue-50 text-blue-700",
      "Rejeté inspection": "border-rose-150 bg-rose-50 text-rose-700",
      "Validé inspection": "border-cyan-150 bg-cyan-50 text-cyan-700",
      "Validé DREN": "border-violet-150 bg-violet-50 text-violet-700",
      "Transmis ministère": "border-emerald-150 bg-emerald-50 text-emerald-600",
      Archivé: "border-slate-300 bg-slate-100 text-slate-700",
    };
    return styles[currentStatus] || "bg-slate-100 text-slate-700";
  };

  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8 print:bg-white print:p-0">
      
      {/* Header */}
      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm print:border-b print:shadow-none">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/canevas/etablissements" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 print:hidden">
              <ArrowLeft size={19} />
            </Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
              <Building2 size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Gestion des Canevas Scolaires</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Fiche Etablissement</h1>
              <p className="mt-1 text-sm font-bold text-slate-500">Dossier complet, contrôle et workflow d'homologation</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Link href={`/dashboard/canevas/etablissements/${establishmentInfo.code}/identification`} className="flex h-11 items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 text-xs font-black uppercase tracking-widest text-indigo-700">
              <FileText size={16} /> Identification
            </Link>
            <Link href={`/dashboard/canevas/etablissements/${establishmentInfo.code}/groupes-pedagogiques`} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700">
              <Table2 size={16} /> Groupes
            </Link>
            <Link href={`/dashboard/canevas/etablissements/${establishmentInfo.code}/effectifs-eleves`} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700">
              <Users size={16} /> Effectifs
            </Link>
            <Link href={`/dashboard/canevas/etablissements/${establishmentInfo.code}/redoublants`} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700">
              <GraduationCap size={16} /> Redoublants
            </Link>
            <Link href={`/dashboard/canevas/etablissements/${establishmentInfo.code}/personnel-enseignant`} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700">
              <UserRoundCheck size={16} /> Personnel
            </Link>
            <button onClick={() => window.print()} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700">
              <Printer size={16} /> Imprimer
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Grid */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        
        {/* Left Pane: Detailed school content */}
        <div className="space-y-5">
          
          {/* Main Info Card */}
          <div className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-indigo-50 text-indigo-600 shrink-0">
                  <Building2 size={34} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-3xl font-black tracking-tight text-slate-950">{establishmentInfo.name}</h2>
                    <span className={cn("rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest", getStatusBadgeStyle(status))}>
                      {status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-500">{establishmentInfo.code} · {establishmentInfo.type} · {establishmentInfo.cycle} · {establishmentInfo.annee}</p>
                  <p className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-600"><MapPin size={16} className="text-indigo-500" /> {establishmentInfo.adresse}, {establishmentInfo.commune}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 lg:w-64">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Complétude canevas</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-3 flex-1 rounded-full bg-white overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${status === "Validé DREN" || status === "Transmis ministère" || status === "Archivé" ? 100 : establishmentInfo.completion}%` }} />
                  </div>
                  <span className="text-sm font-black text-indigo-700">
                    {status === "Validé DREN" || status === "Transmis ministère" || status === "Archivé" ? 100 : establishmentInfo.completion}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Rejection observation warning banner */}
          {status === "Rejeté inspection" && rejectionObservation && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 flex items-start gap-3">
              <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-sm font-black text-rose-950">Déclaration rejetée par l'inspection</h4>
                <p className="text-xs font-bold text-rose-800 mt-1">Observation obligatoire : {rejectionObservation}</p>
              </div>
            </div>
          )}

          {/* KPIs Section */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {kpis.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", item.bg, item.color)}>
                    <Icon size={22} />
                  </div>
                  <p className="mt-5 text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{item.value}</p>
                </div>
              );
            })}
          </section>

          {/* Levels distribution */}
          <section className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
            <SectionTitle title="Effectifs par niveau" subtitle="Répartition filles, garçons et redoublants" />
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="py-3">Niveau</th>
                    <th className="py-3">Total</th>
                    <th className="py-3">Filles</th>
                    <th className="py-3">Garçons</th>
                    <th className="py-3">Redoublants</th>
                    <th className="py-3">Taux filles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {levels.map((level) => (
                    <tr key={level.niveau} className="text-sm font-bold text-slate-700">
                      <td className="py-4 font-black text-indigo-600">{level.niveau}</td>
                      <td className="py-4 font-black text-slate-950">{level.total}</td>
                      <td className="py-4 text-pink-600">{level.filles}</td>
                      <td className="py-4 text-blue-600">{level.garcons}</td>
                      <td className="py-4">{level.redoublants}</td>
                      <td className="py-4">{Math.round((level.filles / level.total) * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Infrastructures and Needs grid */}
          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
              <SectionTitle title="Infrastructures" subtitle="État des équipements principaux" />
              <div className="mt-5 grid gap-3">
                {infrastructure.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4">
                      <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", item.status === "ok" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-950">{item.label}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">{item.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
              <SectionTitle title="Besoins déclarés" subtitle="Demandes et priorités issues du canevas" />
              <div className="mt-5 space-y-3">
                {needs.map((need) => (
                  <div key={need.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4">
                    <div>
                      <p className="text-sm font-black text-slate-950">{need.label}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">Quantité: {need.quantity}</p>
                    </div>
                    <span className={cn("rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest", need.priority === "Critique" ? "bg-rose-50 text-rose-700" : need.priority === "Elevee" ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-600")}>
                      {need.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Right Pane: Timeline workflow controls & identity details */}
        <div className="space-y-6">

          {/* Validation workflow timeline card */}
          <div className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Workflow d'Homologation</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">Suivi de la certification nationale</p>
            </div>

            {/* Timeline components */}
            <div className="relative border-l border-slate-100 pl-6 space-y-5">
              {[
                { 
                  title: "Création Canevas", 
                  user: "Directeur Ets", 
                  date: "24/06/2026 09:12", 
                  completed: true 
                },
                { 
                  title: "Correction / Brouillon", 
                  user: "Directeur Ets", 
                  date: status === "Brouillon" ? "En cours" : "25/06/2026 10:14", 
                  completed: status !== "Brouillon" 
                },
                { 
                  title: "Validation École", 
                  user: "Directeur Ets", 
                  date: (status === "Brouillon" || status === "En correction" || status === "Rejeté inspection") 
                    ? "En attente" 
                    : "26/06/2026 14:02", 
                  completed: status !== "Brouillon" && status !== "En correction" && status !== "Rejeté inspection" 
                },
                { 
                  title: "Validation Inspection", 
                  user: "Inspecteur Niamey IV", 
                  date: (status === "Brouillon" || status === "En correction" || status === "Rejeté inspection" || status === "Validé école") 
                    ? "En attente" 
                    : "27/06/2026 11:30", 
                  completed: status === "Validé inspection" || status === "Validé DREN" || status === "Transmis ministère" || status === "Archivé" 
                },
                { 
                  title: "Validation DREN", 
                  user: "Direction DREN", 
                  date: (status === "Validé DREN" || status === "Transmis ministère" || status === "Archivé") 
                    ? "28/06/2026 16:45" 
                    : "En attente", 
                  completed: status === "Validé DREN" || status === "Transmis ministère" || status === "Archivé" 
                },
                { 
                  title: "Transmission Ministère", 
                  user: "Division MEN", 
                  date: (status === "Transmis ministère" || status === "Archivé") 
                    ? "29/06/2026 08:00" 
                    : "En attente", 
                  completed: status === "Transmis ministère" || status === "Archivé" 
                },
              ].map((step, idx) => (
                <div key={idx} className="relative">
                  {/* Circle indicator */}
                  <span className={cn(
                    "absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border bg-white transition-all",
                    step.completed ? "border-emerald-500 text-emerald-500 bg-emerald-50" : "border-slate-200 text-slate-400 bg-slate-50"
                  )}>
                    {step.completed ? <Check size={8} className="stroke-[4px]" /> : <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />}
                  </span>

                  <div>
                    <h5 className={cn("text-xs font-black", step.completed ? "text-slate-800" : "text-slate-400")}>
                      {step.title}
                    </h5>
                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                      {step.user} {step.date && `· ${step.date}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Workflow actions */}
            <div className="pt-4 border-t border-slate-50 space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Actions de workflow</p>
              
              <div className="flex flex-col gap-2">
                {/* Brouillon / En correction */}
                {(status === "Brouillon" || status === "En correction") && (
                  <button
                    onClick={() => handleTransition("Validé école", "Dossier canevas soumis avec succès par l'école.")}
                    className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest transition"
                  >
                    Soumettre au contrôle
                  </button>
                )}

                {/* Validé école */}
                {status === "Validé école" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleTransition("Validé inspection", "Canevas validé et certifié par l'inspection.")}
                      className="h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-widest transition"
                    >
                      Valider
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="h-11 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-widest transition"
                    >
                      Rejeter
                    </button>
                  </div>
                )}

                {/* Rejeté inspection */}
                {status === "Rejeté inspection" && (
                  <button
                    onClick={() => handleTransition("En correction", "Dossier remis en correction.")}
                    className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-widest transition"
                  >
                    Corriger les anomalies
                  </button>
                )}

                {/* Validé inspection */}
                {status === "Validé inspection" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleTransition("Validé DREN", "Canevas validé et visé par la DREN.")}
                      className="h-11 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black uppercase tracking-widest transition"
                    >
                      Valider DREN
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="h-11 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-widest transition"
                    >
                      Rejeter
                    </button>
                  </div>
                )}

                {/* Validé DREN */}
                {status === "Validé DREN" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleTransition("Transmis ministère", "Dossier transmis officiellement au Ministère.")}
                      className="h-11 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black uppercase tracking-widest transition"
                    >
                      Transmettre
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="h-11 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-widest transition"
                    >
                      Rejeter
                    </button>
                  </div>
                )}

                {/* Transmis ministère */}
                {status === "Transmis ministère" && (
                  <button
                    onClick={() => handleTransition("Archivé", "Dossier archivé et finalisé.")}
                    className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest transition"
                  >
                    Archiver le dossier
                  </button>
                )}

                {/* Archivé */}
                {status === "Archivé" && (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center space-y-2">
                    <FolderLock className="mx-auto size-6 text-slate-400" />
                    <p className="text-xs font-black text-slate-700">Dossier archivé</p>
                    <p className="text-[10px] font-bold text-slate-400">Toutes les modifications et transitions sont verrouillées.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Identity details */}
          <div className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
            <SectionTitle title="Identité administrative" subtitle="Informations officielles" />
            <div className="mt-5 grid gap-3">
              <InfoLine label="Code établissement" value={establishmentInfo.code} />
              <InfoLine label="Identifiant ministère" value={establishmentInfo.ministereId} />
              <InfoLine label="Autorisation" value={establishmentInfo.autorisation} />
              <InfoLine label="Directeur" value={establishmentInfo.directeur} />
            </div>
          </div>

          {/* Location details */}
          <div className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
            <SectionTitle title="Localisation" subtitle="Adresse et contacts" />
            <div className="mt-5 grid gap-3">
              <InfoLine label="Région" value={establishmentInfo.region} />
              <InfoLine label="Département" value={establishmentInfo.departement} />
              <InfoLine label="Commune" value={establishmentInfo.commune} />
              <InfoLine label="Quartier" value={establishmentInfo.quartier} />
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="flex items-center gap-2 text-sm font-black text-slate-900"><Phone size={16} className="text-indigo-500" /> {establishmentInfo.telephone}</p>
                <p className="mt-2 text-xs font-bold text-slate-500">{establishmentInfo.email}</p>
              </div>
            </div>
          </div>

          {/* Documents lists */}
          <div className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
            <SectionTitle title="Pièces et historique" subtitle="Traçabilité du dossier" />
            <div className="mt-5 space-y-3">
              {["Canevas Excel original", "Rapport de validation", "Fiche imprimée", "Historique modifications"].map((item) => (
                <button key={item} className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-4 text-left text-sm font-black text-slate-700 transition hover:bg-slate-50">
                  <FileText size={18} className="text-indigo-500 font-sans" />
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Reject Dialog Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] border border-slate-100 shadow-2xl p-8 space-y-6 animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-inner">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Rejeter le Canevas</h3>
                  <p className="text-xs font-bold text-slate-400">{establishmentInfo.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRejectModal(false)}
                className="h-8 w-8 rounded-full border border-slate-100 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Observation de rejet * (Obligatoire)</Label>
              <textarea
                value={tempObservation}
                onChange={e => setTempObservation(e.target.value)}
                placeholder="Indiquez clairement les motifs de non-conformité de ce canevas..."
                rows={4}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-xs font-bold outline-none placeholder:text-slate-300 text-slate-800 focus:border-indigo-500"
              />
            </div>

            <div className="pt-4 border-t border-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowRejectModal(false)}
                className="px-5 h-11 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest transition animate-pulse-slow"
              >
                Annuler
              </button>
              <button 
                onClick={handleRejectSubmit}
                className="px-5 h-11 rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-xs font-black uppercase tracking-widest transition"
              >
                Confirmer Rejet
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
