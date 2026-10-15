"use client";

import React, { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import {
  GraduationCap, Layers, Scale, Award, ArrowRight,
  Sparkles, ShieldCheck, Building2, ListTree, RefreshCw,
  Plus, CheckCircle2, BookOpen, Users, School, Sun, Moon,
  TrendingUp, BookMarked, FlaskConical, Globe2, Trophy,
  BarChart3, FileText, Settings, ChevronDown, ChevronRight,
  Wallet, Library, PenTool, Target, Microscope, LayoutGrid,
  Network, Cpu, Atom, Brain, Landmark, BriefcaseBusiness,
  BadgeCheck, Gauge, Activity, CircleDot, Boxes, Hash,
  AlertCircle, Info, ExternalLink, X, Search, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  syncAcademicSettingsToLmd,
  saveFaculty,
} from "@/domains/academics/actions/lmd.actions";
import { useTheme } from "@/hooks/use-theme";

type Props = {
  initialFaculties: any[];
  initialPrograms: any[];
  realSectionsCount: number;
  realClassesCount: number;
  realSessionsCount: number;
};

// Tabs definition
const TABS = [
  { id: "overview", label: "Vue d'ensemble", icon: LayoutGrid },
  { id: "structure", label: "Structure & Filières", icon: Building2 },
  { id: "modules", label: "Modules & Outils", icon: Boxes },
  { id: "standards", label: "Normes & Standards", icon: BadgeCheck },
];

// Domains/Filières templates
const DOMAIN_TEMPLATES = [
  { icon: Cpu, label: "Sciences & Technologies", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/50", border: "border-blue-200 dark:border-blue-800" },
  { icon: Brain, label: "Sciences Humaines & Sociales", color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/50", border: "border-purple-200 dark:border-purple-800" },
  { icon: Landmark, label: "Droit & Sciences Politiques", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/50", border: "border-amber-200 dark:border-amber-800" },
  { icon: BriefcaseBusiness, label: "Gestion & Commerce", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/50", border: "border-emerald-200 dark:border-emerald-800" },
  { icon: FlaskConical, label: "Sciences de la Santé", color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/50", border: "border-rose-200 dark:border-rose-800" },
  { icon: Globe2, label: "Langues & Lettres", color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/50", border: "border-cyan-200 dark:border-cyan-800" },
];

// LMD Standards comparison table
const LMD_STANDARDS = [
  { norm: "REESAO", region: "Afrique de l'Ouest", credits: 180, semesters: 6, label: "Licence" },
  { norm: "CAMES", region: "Afrique Centrale", credits: 180, semesters: 6, label: "Licence" },
  { norm: "LMD Européen", region: "Espace Bologne", credits: 180, semesters: 6, label: "Bachelor" },
  { norm: "ECTS Standard", region: "Union Européenne", credits: 60, semesters: 2, label: "Par année" },
];

export default function LmdHubClient({
  initialFaculties,
  initialPrograms,
  realSectionsCount,
  realClassesCount,
  realSessionsCount,
}: Props) {
  const [faculties, setFaculties] = useState(initialFaculties);
  const [programs, setPrograms] = useState(initialPrograms);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  const [facultyForm, setFacultyForm] = useState({ name: "", code: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { isDark, toggleTheme } = useTheme();
  const [expandedFaculty, setExpandedFaculty] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCycle, setSelectedCycle] = useState("Tous");

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncAcademicSettingsToLmd(1);
      if (res.success) {
        toast.success(res.message || "Synchronisation LMD réussie !");
        window.location.reload();
      } else {
        toast.error("Erreur de synchronisation : " + res.error);
      }
    } catch {
      toast.error("Erreur lors de la synchronisation");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facultyForm.name) {
      toast.error("Le nom de la faculté est obligatoire");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await saveFaculty({
        schoolId: 1,
        name: facultyForm.name,
        code: facultyForm.code,
        description: facultyForm.description,
      });
      if (res.success) {
        toast.success("Faculté enregistrée avec succès !");
        setIsFacultyModalOpen(false);
        setFacultyForm({ name: "", code: "", description: "" });
        window.location.reload();
      } else {
        toast.error(res.error || "Erreur d'enregistrement");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPrograms = programs.filter((p) => {
    const matchSearch = !searchQuery || (p.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchCycle = selectedCycle === "Tous" || (p.degreeLevel || "Licence").toLowerCase().includes(selectedCycle.toLowerCase());
    return matchSearch && matchCycle;
  });

  const licenceCount = programs.filter((p) => (p.degreeLevel || "").toLowerCase() === "licence").length;
  const masterCount = programs.filter((p) => (p.degreeLevel || "").toLowerCase() === "master").length;
  const doctoratCount = programs.filter((p) => (p.degreeLevel || "").toLowerCase() === "doctorat").length;

  return (
    <div className="space-y-6">
      {/* ── HERO BANNER ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-2xl border border-indigo-900/50">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 bottom-0 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="pointer-events-none absolute right-1/3 bottom-0 h-48 w-48 rounded-full bg-cyan-600/10 blur-2xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="max-w-2xl space-y-4">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-4 py-1.5 text-xs font-semibold text-indigo-200 backdrop-blur-md border border-indigo-500/30">
              <Sparkles className="h-3.5 w-3.5" />
              Conforme REESAO • CAMES • Espace Bologne • ECTS
            </div>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl leading-tight">
              Système Universitaire{" "}
              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
                LMD & Crédits ECTS
              </span>
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
              Gestion complète des cursus universitaires (Licence, Master, Doctorat), maquettes pédagogiques
              par unités d'enseignement (UE), compensation semestrielle ECTS et délibérations officielles des jurys.
            </p>

            {/* Stats pills */}
            <div className="flex flex-wrap gap-3 pt-1">
              {[
                { label: `${faculties.length} Faculté(s)`, icon: Building2, color: "text-indigo-300" },
                { label: `${programs.length} Filière(s) LMD`, icon: GraduationCap, color: "text-violet-300" },
                { label: `${realClassesCount} Classe(s)`, icon: School, color: "text-cyan-300" },
                { label: `${realSessionsCount} Session(s)`, icon: Activity, color: "text-emerald-300" },
              ].map(({ label, icon: Icon, color }) => (
                <div key={label} className="flex items-center gap-1.5 rounded-xl bg-white/8 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm border border-white/10">
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  <span className="text-slate-200">{label}</span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                className="gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-bold shadow-lg shadow-indigo-900/40 border border-indigo-400/30"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Synchronisation..." : "Synchroniser depuis Paramètres"}
              </Button>

              <Button
                onClick={() => setIsFacultyModalOpen(true)}
                variant="outline"
                className="gap-2 border-white/20 bg-white/8 text-slate-200 hover:bg-white/15 text-xs font-bold backdrop-blur-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Nouvelle Faculté / Institut
              </Button>
            </div>
          </div>

          {/* Dark Mode Toggle + Quick Actions */}
          <div className="flex flex-col items-end gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/20 transition-colors border border-white/10 backdrop-blur-sm"
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-indigo-300" />}
              {isDark ? "Mode Clair" : "Mode Sombre"}
            </button>

            {/* ECTS Progress Ring */}
            <div className="flex flex-col items-center gap-1 rounded-2xl bg-white/8 px-5 py-4 border border-white/10 backdrop-blur-sm text-center">
              <div className="relative h-14 w-14">
                <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                  <circle
                    cx="28" cy="28" r="22" fill="none"
                    stroke="url(#grad)" strokeWidth="4"
                    strokeDasharray={`${Math.min((programs.length / 10) * 138, 138)} 138`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-white">{programs.length}</span>
              </div>
              <span className="text-[10px] text-slate-400">Filières actives</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── NAVIGATION TABS ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 rounded-2xl bg-white dark:bg-slate-900 p-1.5 shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === id
                ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/30"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: VUE D'ENSEMBLE */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Facultés & Instituts", value: faculties.length, icon: Building2, color: "indigo", sub: `${realSectionsCount} sections réelles`, trend: "+2" },
              { label: "Filières LMD actives", value: programs.length, icon: GraduationCap, color: "violet", sub: `${licenceCount}L · ${masterCount}M · ${doctoratCount}D`, trend: "+3" },
              { label: "Promotions / Classes", value: realClassesCount, icon: School, color: "emerald", sub: "synchronisées", trend: "=" },
              { label: "Sessions Académiques", value: realSessionsCount, icon: Activity, color: "amber", sub: "enregistrées", trend: "" },
            ].map(({ label, value, icon: Icon, color, sub, trend }) => (
              <div key={label} className={`relative rounded-2xl border bg-white dark:bg-slate-900 p-5 shadow-sm transition-all hover:shadow-md overflow-hidden
                border-slate-200 dark:border-slate-700/60`}>
                <div className={`absolute top-0 right-0 h-20 w-20 rounded-full -mr-8 -mt-8 opacity-10 bg-${color}-500`} />
                <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-${color}-100 dark:bg-${color}-900/40 text-${color}-600 dark:text-${color}-400`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{value}</div>
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">{label}</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{sub}</div>
                {trend && (
                  <div className={`absolute top-4 right-4 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    trend.startsWith("+") ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}>{trend}</div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Access Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card: Maquette */}
            <Link href="/dashboard/academics/lmd/maquette" className="group">
              <div className="h-full rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 hover:-translate-y-0.5 cursor-pointer">
                <div className="mb-4 flex items-start justify-between">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Layers className="h-6 w-6" />
                  </div>
                  <span className="rounded-lg bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                    {programs.length} Filières
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Maquette Pédagogique</h3>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Arborescence des Semestres (S1-S6), Unités d'Enseignement (UE) et Éléments Constitutifs (ECU) avec équilibre strict de 30 Crédits ECTS par semestre.
                </p>
                <div className="mt-5 flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  Gérer les maquettes <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>

            {/* Card: Délibération */}
            <Link href="/dashboard/academics/lmd/deliberation" className="group">
              <div className="h-full rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-700 hover:-translate-y-0.5 cursor-pointer">
                <div className="mb-4 flex items-start justify-between">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Scale className="h-6 w-6" />
                  </div>
                  <span className="rounded-lg bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                    Jury LMD
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Salle de Délibération</h3>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Moteur de compensation inter-UE automatique, gestion des notes éliminatoires (&lt;7/20), rachat de points et génération du procès-verbal officiel.
                </p>
                <div className="mt-5 flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Ouvrir la délibération <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>

            {/* Card: Relevés & Diplômes */}
            <Link href="/dashboard/academics/lmd/deliberation" className="group">
              <div className="h-full rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:shadow-lg hover:border-violet-300 dark:hover:border-violet-700 hover:-translate-y-0.5 cursor-pointer">
                <div className="mb-4 flex items-start justify-between">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                    <Award className="h-6 w-6" />
                  </div>
                  <span className="rounded-lg bg-violet-50 dark:bg-violet-950/50 px-2 py-0.5 text-[10px] font-bold text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-800">
                    PDF officiel
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Relevés LMD & Diplômes</h3>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Édition des relevés semestriels avec cumul des crédits (180 ECTS / Licence — 120 ECTS / Master) et attestation internationale de mobilité.
                </p>
                <div className="mt-5 flex items-center gap-2 text-xs font-bold text-violet-600 dark:text-violet-400">
                  Consulter les relevés <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          </div>

          {/* ECTS Progression Guide */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="font-bold text-sm text-slate-800 dark:text-slate-200">Progression ECTS par Cycle</h2>
              <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">Conforme standards REESAO / CAMES</span>
            </div>

            <div className="space-y-3">
              {[
                { cycle: "Licence (L)", total: 180, per: 30, color: "bg-indigo-500", years: "3 ans / 6 sems." },
                { cycle: "Master (M)", total: 120, per: 30, color: "bg-violet-500", years: "2 ans / 4 sems." },
                { cycle: "Doctorat (D)", total: 180, per: 30, color: "bg-fuchsia-500", years: "3 ans / 6 sems." },
              ].map(({ cycle, total, per, color, years }) => (
                <div key={cycle} className="flex items-center gap-4">
                  <div className="w-36 text-xs font-bold text-slate-700 dark:text-slate-300">{cycle}</div>
                  <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all`}
                      style={{ width: `${Math.min((total / 480) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-400 w-24 text-right">
                    {total} ECTS ({per}/sem.)
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 w-20">{years}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: STRUCTURE & FILIÈRES */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "structure" && (
        <div className="space-y-5">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher une filière..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
                />
              </div>

              {/* Cycle filter chips */}
              <div className="flex items-center gap-1.5">
                {["Tous", "Licence", "Master", "Doctorat"].map((cycle) => (
                  <button
                    key={cycle}
                    onClick={() => setSelectedCycle(cycle)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedCycle === cycle
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {cycle}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                variant="outline"
                className="gap-1.5 text-xs font-bold border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                Synchroniser
              </Button>
              <Button
                onClick={() => setIsFacultyModalOpen(true)}
                className="gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Faculté
              </Button>
            </div>
          </div>

          {/* Faculties Tree */}
          {faculties.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
              <Building2 className="h-12 w-12 text-slate-200 dark:text-slate-700 mx-auto" />
              <h4 className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-300">Aucune faculté enregistrée</h4>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                Synchronisez vos filières existantes depuis les Paramètres Académiques ou créez manuellement vos facultés et instituts.
              </p>
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                className="mt-5 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                Synchroniser depuis Paramètres Académiques
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {faculties.map((fac) => {
                const facPrograms = filteredPrograms.filter(
                  (p) => p.department?.facultyId === fac.id || !p.department
                );
                const isExpanded = expandedFaculty === fac.id;
                return (
                  <div key={fac.id} className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                    {/* Faculty Header */}
                    <button
                      className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                      onClick={() => setExpandedFaculty(isExpanded ? null : fac.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{fac.name}</span>
                            {fac.code && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400">
                                {fac.code}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Doyen : {fac.dean ? fac.dean.nom : "Non assigné"} • {facPrograms.length} filière(s)
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {[
                          { label: `${facPrograms.filter((p: any) => (p.degreeLevel || "").toLowerCase() === "licence").length}L`, color: "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400" },
                          { label: `${facPrograms.filter((p: any) => (p.degreeLevel || "").toLowerCase() === "master").length}M`, color: "bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-400" },
                        ].map(({ label, color }) => (
                          <span key={label} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                        ))}
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    {/* Programs List */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30">
                        {facPrograms.length === 0 ? (
                          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-3">Aucune filière rattachée dans ce cycle</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {facPrograms.map((p: any) => (
                              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors">
                                <div className="flex items-center gap-2.5">
                                  <GraduationCap className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                                  <div>
                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{p.name}</div>
                                    <div className="text-[10px] text-slate-400">{p.totalCredits || 180} ECTS • {p.durationSemesters || 6} sem.</div>
                                  </div>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  (p.degreeLevel || "Licence").toLowerCase() === "master"
                                    ? "bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-400"
                                    : "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400"
                                }`}>
                                  {p.degreeLevel || "Licence"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Domain Templates Grid */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <BookMarked className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Domaines d'Enseignement Disponibles
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {DOMAIN_TEMPLATES.map(({ icon: Icon, label, color, bg, border }) => (
                <div key={label} className={`flex items-center gap-2.5 p-3 rounded-xl border ${bg} ${border} transition-all hover:shadow-sm cursor-pointer`}>
                  <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                  <span className={`text-xs font-semibold ${color}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: MODULES & OUTILS */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "modules" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: Layers, color: "indigo", title: "Maquette Pédagogique",
                desc: "Définissez l'architecture complète des UE (Fondamentale, Transversale, Optionnelle) et des ECU par semestre. Vérification automatique de l'équilibre des 30 ECTS.",
                href: "/dashboard/academics/lmd/maquette",
                features: ["UE Fondamentale / Transversale / Optionnelle", "30 ECTS / Semestre strict", "Affectation des enseignants par ECU", "Volumétrie CM / TD / TP / TPE"],
              },
              {
                icon: Scale, color: "emerald", title: "Délibération du Jury",
                desc: "Moteur de compensation inter-UE conforme REESAO. Calcul automatique des moyennes, application des notes éliminatoires et génération du PV officiel PDF.",
                href: "/dashboard/academics/lmd/deliberation",
                features: ["Compensation semestrielle inter-UE", "Notes éliminatoires < 7/20", "Décision automatique (Admis/Ajourné)", "PV officiel PDF paysage signé"],
              },
              {
                icon: FileText, color: "violet", title: "Relevés & Transcripts",
                desc: "Génération des relevés de notes officiels avec cumul des crédits ECTS, mentions et classements semestriels. Compatible mobilité internationale et ERASMUS+.",
                href: "/dashboard/academics/lmd/deliberation",
                features: ["Cumul ECTS semestriel et annuel", "Mentions Passable / AB / Bien / TB", "Attestation de mobilité internationale", "Export PDF sécurisé"],
              },
              {
                icon: Sparkles, color: "rose", title: "Session de Rattrapage (Session 2)",
                desc: "Gestion de la 2ème session d'évaluation avec application stricte de la règle du meilleur score Max(N1, N2), recalcul automatique des compensations et relevés post-rattrapage.",
                href: "/dashboard/academics/lmd/deliberation",
                features: ["Règle du meilleur score Max(N1, N2)", "Filtrage intelligent des ajournés", "Saisie interactive des notes de rattrapage", "Relevés de notes officiels Session 2"],
              },
              {
                icon: Award, color: "indigo", title: "Bilan Annuel & Enjambement (60 ECTS)",
                desc: "Délibération annuelle globale agrégeant les 2 semestres (S1+S2, S3+S4, S5+S6). Calcul de la MGA, validation des 60 ECTS et application de la règle d'enjambement (passage avec dettes si ≥ 45 ECTS).",
                href: "/dashboard/academics/lmd/deliberation",
                features: ["Cumul annuel des 60 Crédits ECTS", "Règle d'enjambement (≥ 45 ECTS)", "Moyenne Générale Annuelle (MGA / 20)", "Procès-verbal annuel & relevé annuel"],
              },
              {
                icon: GraduationCap, color: "emerald", title: "Annexe Descriptive au Diplôme (UNESCO)",
                desc: "Édition du Diploma Supplement en 8 sections standardisées (UNESCO / Conseil de l'Europe / CAMES) pour la reconnaissance internationale des diplômes et la mobilité académique.",
                href: "/dashboard/academics/lmd/deliberation",
                features: ["8 sections normalisées UNESCO / CAMES", "Grille ECTS internationale A/B/C/D/E", "Validation des 180 ECTS (Licence) / 120 ECTS (Master)", "Export PDF officiel infalsifiable"],
              },
              {
                icon: Award, color: "amber", title: "Diplômes Officiels & Attestations de Réussite",
                desc: "Édition des diplômes universitaires de prestige (A4 Paysage doré) et attestations provisoires de réussite avec cadre anti-fraude et QR code de sécurité.",
                href: "/dashboard/academics/lmd/deliberation",
                features: ["Diplôme de Licence / Master grand format", "Attestation provisoire de réussite", "Bordures de sécurité royales & dorées", "QR Code de vérification infalsifiable"],
              },
              {
                icon: ShieldCheck, color: "teal", title: "Portail Public de Vérification Anti-Fraude",
                desc: "Système de vérification cryptographique en temps réel permettant aux ministères, ambassades et recruteurs de valider l'authenticité des diplômes émis.",
                href: "/verify",
                features: ["Scan QR instantané par smartphone", "Empreinte numérique SHA-256 certifiée", "Registre public d'intégrité académique", "Conforme normes CAMES / REESAO"],
              },
              {
                icon: TrendingUp, color: "rose", title: "Suivi de Trajectoire Étudiant & Compteur ECTS",
                desc: "Espace de consultation individuel pour les étudiants et tuteurs. Compteur d'ECTS en temps réel (Progression 0-100%), suivi des dettes et téléchargement des diplômes.",
                href: "/dashboard/academics/lmd/student-trajectory",
                features: ["Compteur d'ECTS interactif en direct", "Historique semestriel S1 à S6", "Gestion & alertes de dettes académiques", "Téléchargement 1-clic des diplômes et relevés"],
              },
              {
                icon: BookOpen, color: "purple", title: "Projets de Fin d'Études & Mémoires (PFE / Thèses)",
                desc: "Gestion du cycle de graduation LMD : enregistrement des thèmes, encadrement, programmation des jurys et génération du PV officiel de soutenance avec crédits ECTS.",
                href: "/dashboard/academics/research-graduation",
                features: ["Attribution des encadrants & rapporteurs", "Planning des soutenances & gestion des salles", "Grille critériée d'évaluation du jury", "PV officiel de soutenance & attestation PDF"],
              },
              {
                icon: Globe2, color: "blue", title: "Équivalences & Transferts ECTS (Mobilité)",
                desc: "Gestion des validations des acquis, mobilités internationales et transferts d'étudiants. Reconnaissance officielle des crédits et attestations ECTS.",
                href: "/dashboard/academics/lmd/equivalences",
                features: ["Validation des acquis antérieurs", "Attestation de transfert ECTS (PDF)", "Homologation normes REESAO / CAMES", "Intégration directe au bilan 180 ECTS"],
              },
              {
                icon: BarChart3, color: "indigo", title: "Statistiques & Pilotage",
                desc: "Tableau de bord analytique des taux de réussite par filière, semestre et session. Indicateurs de performance pédagogique pour le pilotage qualité.",
                href: "/dashboard/academics/lmd/analytics",
                features: ["Taux de réussite par UE", "Comparatif sessions N et N-1", "Analyse des notes éliminatoires", "Rapport pédagogique exportable"],
              },
            ].map(({ icon: Icon, color, title, desc, href, features }) => (
              <div key={title} className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`shrink-0 h-11 w-11 rounded-xl flex items-center justify-center bg-${color}-100 dark:bg-${color}-950/60 text-${color}-600 dark:text-${color}-400`}>
                    <Icon className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">{desc}</p>
                  </div>
                </div>
                <ul className="space-y-1.5 mb-5">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 text-${color}-500`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={href} className={`inline-flex items-center gap-1.5 text-xs font-bold text-${color}-600 dark:text-${color}-400 hover:underline`}>
                  Accéder au module <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: NORMES & STANDARDS */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "standards" && (
        <div className="space-y-5">
          {/* Standards Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="font-bold text-sm text-slate-800 dark:text-slate-200">Référentiels Internationaux Supportés</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-left">
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-400">Référentiel</th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-400">Zone géographique</th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-400">Crédits totaux</th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-400">Semestres</th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-400">Diplôme</th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-400">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {LMD_STANDARDS.map(({ norm, region, credits, semesters, label }) => (
                    <tr key={norm} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-bold text-slate-900 dark:text-slate-100">{norm}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{region}</td>
                      <td className="p-4">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{credits} ECTS</span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{semesters}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{label}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Supporté
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grading Scale */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Barème de Mentions & Décisions ECTS
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { range: "≥ 16/20", mention: "Très Bien (TB)", color: "emerald", ects: "A", decision: "Admis" },
                { range: "14 – 15.99", mention: "Bien (B)", color: "indigo", ects: "B", decision: "Admis" },
                { range: "12 – 13.99", mention: "Assez Bien (AB)", color: "sky", ects: "C", decision: "Admis" },
                { range: "10 – 11.99", mention: "Passable (P)", color: "amber", ects: "D", decision: "Admis" },
                { range: "< 10/20 (avg ≥10)", mention: "Compensé", color: "orange", ects: "E", decision: "Admis par Comp." },
                { range: "< 10/20", mention: "Ajourné / Rattrapage", color: "rose", ects: "FX/F", decision: "Ajourné" },
              ].map(({ range, mention, color, ects, decision }) => (
                <div key={range} className={`flex items-center gap-3 p-3 rounded-xl bg-${color}-50 dark:bg-${color}-950/30 border border-${color}-100 dark:border-${color}-900/50`}>
                  <span className={`text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-lg bg-${color}-500 text-white`}>{ects}</span>
                  <div className="flex-1">
                    <div className={`text-xs font-bold text-${color}-700 dark:text-${color}-400`}>{mention}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{range} • {decision}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Compensation Rules */}
          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-2">Règles de Compensation REESAO / LMD</h4>
                <ul className="space-y-1.5 text-xs text-amber-700 dark:text-amber-400">
                  <li>• La compensation s'effectue au niveau du <strong>Semestre</strong> : toutes les UE du semestre se compensent si la moyenne pondérée est ≥ 10/20.</li>
                  <li>• Une UE est déclarée <strong>Non Validée (NV)</strong> si sa moyenne est inférieure à 10/20 ET qu'elle n'est pas compensable par les autres UE.</li>
                  <li>• Une note inférieure à <strong>7/20 dans une UE Éliminatoire</strong> empêche systématiquement la validation du semestre.</li>
                  <li>• La capitalisation des crédits est permanente : un UE validée n'est jamais repassée.</li>
                  <li>• L'enjambement est possible sous conditions : passer en S3 avec une dette en S2 si moyenne annuelle ≥ 10/20.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CRÉER FACULTÉ ─────────────────────────────────────────────── */}
      {isFacultyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Nouvelle Faculté / Institut</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Créer une composante universitaire et l'associer à vos sections</p>
              </div>
              <button
                onClick={() => setIsFacultyModalOpen(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFaculty} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nom de la Faculté / Institut <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Faculté des Sciences & Technologies"
                  value={facultyForm.name}
                  onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Code / Sigle</label>
                <input
                  type="text"
                  placeholder="ex: FST, FSEG, SJP..."
                  value={facultyForm.code}
                  onChange={(e) => setFacultyForm({ ...facultyForm, code: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Mission académique</label>
                <textarea
                  placeholder="Description, mission ou domaine de formation..."
                  rows={3}
                  value={facultyForm.description}
                  onChange={(e) => setFacultyForm({ ...facultyForm, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFacultyModalOpen(false)}
                  className="text-xs dark:border-slate-700 dark:text-slate-300"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-2"
                >
                  {isSubmitting ? (
                    <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Enregistrement...</>
                  ) : (
                    <><Plus className="h-3.5 w-3.5" /> Créer la Faculté</>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
