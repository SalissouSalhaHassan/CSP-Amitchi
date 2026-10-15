"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  Plus, Search, Filter, Download, Printer, FileText, Eye, Pencil, Trash2, X,
  ChevronDown, BookOpen, Clock, AlertCircle, CheckCircle2, ClipboardList,
  CalendarDays, BarChart3, ChevronLeft, ChevronRight, BookMarked, ToggleLeft,
  RotateCcw, Sparkles, TrendingUp, Award, Layers, HelpCircle
} from "lucide-react";
import {
  createPlanification, updatePlanification, deletePlanification,
  type PlanFormData
} from "@/domains/pedagogie/actions/planification.actions";
import {
  canManagePlanification,
  isReadOnlyPedagogie,
  getPedagogieRole
} from "@/domains/pedagogie/permissions";

interface Props {
  currentUser: any;
  initialPlans: any[];
  classes: any[];
  subjects: any[];
  employees: any[];
  sessions?: any[];
  activeSessionName?: string;
  periods?: any[];
}

const STATUT_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  "Planifié":  { label: "Planifié",  bg: "bg-blue-50",     text: "text-blue-700",     dot: "bg-blue-500" },
  "En cours":  { label: "En cours",  bg: "bg-amber-50",    text: "text-amber-700",    dot: "bg-amber-500" },
  "Réalisé":   { label: "Réalisé",   bg: "bg-emerald-50",  text: "text-emerald-700",  dot: "bg-emerald-500" },
  "En retard": { label: "En retard", bg: "bg-rose-50",     text: "text-rose-700",     dot: "bg-rose-500" },
  "Reporté":   { label: "Reporté",   bg: "bg-purple-50",   text: "text-purple-700",   dot: "bg-purple-500" },
};

const TABS = [
  { id: "Annuel", label: "Plan annuel", desc: "Progression par trimestre" },
  { id: "Mensuel", label: "Plan mensuel", desc: "Suivi mensuel des leçons" },
  { id: "Hebdomadaire", label: "Plan hebdomadaire", desc: "Syllabus détaillé semaine" },
  { id: "Officiel", label: "Programme officiel", desc: "Référentiel académique" }
];

const PAGE_SIZE = 12;

export default function PlanificationClient({
  currentUser, initialPlans, classes, subjects, employees, sessions = [], activeSessionName, periods = []
}: Props) {
  const [plans, setPlans] = useState<any[]>(initialPlans);
  const [activeTab, setActiveTab] = useState<string>("Annuel");
  const [isPending, startTransition] = useTransition();

  const canManage = canManagePlanification(currentUser);
  const isReadOnly = isReadOnlyPedagogie(currentUser);
  const userRole = getPedagogieRole(currentUser);

  // Fallback default session calculation
  const defaultSession = activeSessionName || (new Date().getFullYear() + "-" + (new Date().getFullYear() + 1));

  // ─── Filter State ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterEmp, setFilterEmp] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [filterNiveau, setFilterNiveau] = useState("");
  const [filterPeriode, setFilterPeriode] = useState(""); // Trimestre or Mois depending on context
  const [anneeScolaire, setAnneeScolaire] = useState(defaultSession);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  // ─── Modal State ───────────────────────────────────────────────────────────
  const [modal, setModal] = useState<"new" | "edit" | "view" | null>(null);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const defaultPeriodName = periods.length > 0 ? periods[0].name : "Trimestre 1";

  // ─── Form State ────────────────────────────────────────────────────────────
  const emptyForm: PlanFormData = {
    classId: 0,
    subjectId: 0,
    employeeId: 0,
    typePlan: "Annuel",
    periode: defaultPeriodName,
    chapitre: "",
    leconPrevue: "",
    competenceVisee: "",
    datePrevue: new Date().toISOString().split("T")[0],
    statut: "Planifié",
    observation: "",
    anneeScolaire: defaultSession,
  };
  const [form, setForm] = useState<PlanFormData>(emptyForm);

  // ─── Filter Options ────────────────────────────────────────────────────────
  const uniqueNiveaux = useMemo(() => {
    const list = classes.map((c: any) => c.section?.educationalLevel).filter(Boolean);
    return Array.from(new Set(list));
  }, [classes]);

  const periodOptions = useMemo(() => {
    if (activeTab === "Annuel") {
      if (periods.length > 0) {
        return periods.map((p: any) => p.name);
      }
      return ["Trimestre 1", "Trimestre 2", "Trimestre 3", "Semestre 1", "Semestre 2"];
    }
    if (activeTab === "Mensuel") {
      return [
        "Septembre", "Octobre", "Novembre", "Décembre", "Janvier",
        "Février", "Mars", "Avril", "Mai", "Juin", "Juillet"
      ];
    }
    return []; // For Hebdomadaire/Officiel users can type manually
  }, [activeTab, periods]);

  // ─── Filter & Search Logic ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return plans.filter((p) => {
      // Must match active tab type
      if (p.typePlan !== activeTab) return false;

      // School year filter
      if (anneeScolaire && p.anneeScolaire !== anneeScolaire) return false;

      // Standard filters
      if (filterClass && String(p.classId) !== filterClass) return false;
      if (filterSubject && String(p.subjectId) !== filterSubject) return false;
      if (filterEmp && String(p.employeeId) !== filterEmp) return false;
      if (filterStatut && p.statut !== filterStatut) return false;
      if (filterPeriode && p.periode !== filterPeriode) return false;

      // Educational Level (Niveau) filter
      if (filterNiveau) {
        const classObj = classes.find((c: any) => c.id === p.classId);
        if (classObj?.section?.educationalLevel !== filterNiveau) return false;
      }

      // Search bar
      if (search) {
        const q = search.toLowerCase();
        return (
          (p.chapitre || "").toLowerCase().includes(q) ||
          (p.leconPrevue || "").toLowerCase().includes(q) ||
          (p.class?.className || "").toLowerCase().includes(q) ||
          (p.subject?.subjectName || "").toLowerCase().includes(q) ||
          (p.employee?.nom || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [plans, activeTab, anneeScolaire, filterClass, filterSubject, filterEmp, filterStatut, filterNiveau, filterPeriode, search, classes]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ─── KPI Comparison calculations ──────────────────────────────────────────
  const comparisonStats = useMemo(() => {
    const total = filtered.length;
    const realises = filtered.filter(p => p.statut === "Réalisé").length;
    const retard = filtered.filter(p => p.statut === "En retard").length;
    const taux = total ? Math.round((realises / total) * 100) : 0;
    return { total, realises, retard, taux };
  }, [filtered]);

  // ─── Action Handlers ───────────────────────────────────────────────────────
  const openNew = () => {
    setForm({
      ...emptyForm,
      typePlan: activeTab,
      periode: activeTab === "Annuel" ? "Trimestre 1" : activeTab === "Mensuel" ? "Septembre" : "Semaine 1"
    });
    setFormError("");
    setFormSuccess("");
    setSelectedRow(null);
    setModal("new");
  };

  const openEdit = (row: any) => {
    setForm({
      classId: row.classId || 0,
      subjectId: row.subjectId || 0,
      employeeId: row.employeeId || 0,
      typePlan: row.typePlan || activeTab,
      periode: row.periode || "",
      chapitre: row.chapitre || "",
      leconPrevue: row.leconPrevue || "",
      competenceVisee: row.competenceVisee || "",
      datePrevue: row.datePrevue || "",
      statut: row.statut || "Planifié",
      observation: row.observation || "",
      anneeScolaire: row.anneeScolaire || anneeScolaire,
    });
    setSelectedRow(row);
    setFormError("");
    setFormSuccess("");
    setModal("edit");
  };

  const openView = (row: any) => {
    setSelectedRow(row);
    setModal("view");
  };

  const handleSubmit = () => {
    if (!form.classId || !form.subjectId || !form.employeeId || !form.chapitre || !form.leconPrevue) {
      setFormError("Veuillez remplir tous les champs obligatoires (*).");
      return;
    }
    setFormError("");
    startTransition(async () => {
      let res: any;
      if (modal === "new") {
        res = await createPlanification(form);
        if (res.success) {
          setPlans(prev => [res.data, ...prev]);
          setFormSuccess("Planification créée avec succès !");
          setTimeout(() => { setModal(null); setFormSuccess(""); }, 1200);
        } else {
          setFormError(res.error || "Erreur de création.");
        }
      } else if (modal === "edit" && selectedRow) {
        res = await updatePlanification(selectedRow.id, form);
        if (res.success) {
          setPlans(prev => prev.map(p => p.id === selectedRow.id ? { ...p, ...form } : p));
          setFormSuccess("Planification mise à jour !");
          setTimeout(() => { setModal(null); setFormSuccess(""); }, 1200);
        } else {
          setFormError(res.error || "Erreur de modification.");
        }
      }
    });
  };

  const handleDelete = (row: any) => {
    if (!confirm(`Voulez-vous supprimer cette planification ?`)) return;
    startTransition(async () => {
      const res = await deletePlanification(row.id);
      if (res.success) {
        setPlans(prev => prev.filter(p => p.id !== row.id));
      }
    });
  };

  const handlePrint = () => window.print();

  const handleExport = () => {
    const headers = ["N°", "Période", "Classe", "Matière", "Enseignant", "Chapitre", "Leçon prévue", "Date prévue", "Statut"];
    const rows = filtered.map((p, idx) => [
      idx + 1,
      p.periode || "—",
      p.class?.className || "—",
      p.subject?.subjectName || "—",
      p.employee?.nom || "—",
      p.chapitre || "—",
      p.leconPrevue || "—",
      p.datePrevue || "—",
      p.statut || "—",
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `planification_${activeTab.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setFilterClass("");
    setFilterSubject("");
    setFilterEmp("");
    setFilterStatut("");
    setFilterNiveau("");
    setFilterPeriode("");
    setSearch("");
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-5 lg:p-7 space-y-6">

      {/* ─── HEADER ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
            <CalendarDays size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-none">Planification pédagogique</h1>
            <p className="text-slate-500 text-sm font-medium mt-0.5">Calendriers et progression des programmes d'enseignement</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm">
            <Sparkles size={13} className="text-indigo-500" /> Importer programme
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm">
            <Download size={14} /> Exporter
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm">
            <Printer size={14} /> Imprimer
          </button>
          {canManage && (
            <button onClick={openNew} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-black shadow-lg shadow-indigo-200 hover:opacity-90 transition-all">
              <Plus size={15} /> Nouveau plan
            </button>
          )}
        </div>
      </div>

      {/* ─── COMPARISON STATISTICS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <BookOpen size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cours prévus</p>
            <p className="text-2xl font-black text-slate-900 leading-none mt-0.5">{comparisonStats.total}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cours réalisés</p>
            <p className="text-2xl font-black text-slate-900 leading-none mt-0.5">{comparisonStats.realises}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cours en retard</p>
            <p className="text-2xl font-black text-slate-900 leading-none mt-0.5">{comparisonStats.retard}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <TrendingUp size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Taux d'exécution</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 leading-none">{comparisonStats.taux}%</span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden min-w-[50px]">
                <div className="h-full rounded-full bg-violet-600" style={{ width: `${comparisonStats.taux}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── TABS & CONTROLS ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tabs switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPage(1); resetFilters(); }}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* School Year Select */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Année:</span>
          <select
            value={anneeScolaire}
            onChange={(e) => { setAnneeScolaire(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white text-xs font-bold px-3 py-2 focus:ring-2 focus:ring-indigo-300 outline-none cursor-pointer"
          >
            {sessions.map((s: any) => (
              <option key={s.id} value={s.sessionName}>{s.sessionName}</option>
            ))}
            {sessions.length === 0 && (
              <>
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* ─── SEARCH & FILTER PANEL ─── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Rechercher dans ${activeTab.toLowerCase()} (leçon, chapitre, classe, enseignant)...`}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
              showFilters
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Filter size={14} /> Filtres
            <ChevronDown size={12} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
          {(filterClass || filterSubject || filterEmp || filterStatut || filterNiveau || filterPeriode) && (
            <button onClick={resetFilters} className="flex items-center gap-1 px-3 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100 transition-all">
              <RotateCcw size={13} /> Effacer
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-50">
            {/* Niveau */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Niveau</label>
              <select value={filterNiveau} onChange={e => { setFilterNiveau(e.target.value); setPage(1); }} className={fSel}>
                <option value="">Tous</option>
                {uniqueNiveaux.map((nv: any) => <option key={nv} value={nv}>{nv}</option>)}
              </select>
            </div>
            {/* Classe */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Classe</label>
              <select value={filterClass} onChange={e => { setFilterClass(e.target.value); setPage(1); }} className={fSel}>
                <option value="">Toutes</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.className}</option>)}
              </select>
            </div>
            {/* Matière */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Matière</label>
              <select value={filterSubject} onChange={e => { setFilterSubject(e.target.value); setPage(1); }} className={fSel}>
                <option value="">Toutes</option>
                {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
              </select>
            </div>
            {/* Enseignant */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Enseignant</label>
              <select value={filterEmp} onChange={e => { setFilterEmp(e.target.value); setPage(1); }} className={fSel}>
                <option value="">Tous</option>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </div>
            {/* Période / Trimestre / Mois depending on tab */}
            {periodOptions.length > 0 && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  {activeTab === "Annuel" ? "Trimestre" : "Mois"}
                </label>
                <select value={filterPeriode} onChange={e => { setFilterPeriode(e.target.value); setPage(1); }} className={fSel}>
                  <option value="">Tous</option>
                  {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}
            {/* Statut */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Statut</label>
              <select value={filterStatut} onChange={e => { setFilterStatut(e.target.value); setPage(1); }} className={fSel}>
                <option value="">Tous</option>
                {Object.keys(STATUT_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ─── DATA TABLE ─── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{filtered.length} plans trouvés</span>
          <span className="text-xs text-slate-400 font-medium">Page {page} sur {totalPages}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                {["N°", "Période", "Niveau", "Classe", "Matière", "Enseignant", "Chapitre", "Leçon prévue", "Date prévue", "Statut", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-16">
                    <BookMarked size={40} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-semibold">Aucun plan trouvé pour cette période</p>
                    <p className="text-slate-300 text-xs mt-1">Créez votre première leçon planifiée en cliquant sur « Nouveau plan »</p>
                  </td>
                </tr>
              ) : paginated.map((p, idx) => {
                const classObj = classes.find((c: any) => c.id === p.classId);
                const nv = classObj?.section?.educationalLevel || "—";
                const cfg = STATUT_CONFIG[p.statut] || STATUT_CONFIG["Planifié"];
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-3.5 font-black text-slate-400 text-xs">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-800 whitespace-nowrap">{p.periode || "—"}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap">{nv}</td>
                    <td className="px-4 py-3.5 font-bold text-indigo-700 whitespace-nowrap">{p.class?.className || "—"}</td>
                    <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap max-w-[120px] truncate">{p.subject?.subjectName || "—"}</td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{p.employee?.nom || "—"}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800 max-w-[150px] truncate">{p.chapitre}</td>
                    <td className="px-4 py-3.5 text-slate-500 max-w-[180px] truncate">{p.leconPrevue}</td>
                    <td className="px-4 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                      {p.datePrevue ? new Date(p.datePrevue).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black ${cfg.bg} ${cfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openView(p)} className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200" title="Voir"><Eye size={13} /></button>
                        {canManage && (userRole !== "enseignant" || p.employeeId === currentUser.employeeId) && p.statut !== "Réalisé" && (
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100" title="Modifier"><Pencil size={13} /></button>
                        )}
                        {canManage && (userRole !== "enseignant" || p.employeeId === currentUser.employeeId) && p.statut !== "Réalisé" && (
                          <button onClick={() => handleDelete(p)} className="p-1.5 rounded bg-rose-50 text-rose-600 hover:bg-rose-100" title="Supprimer"><Trash2 size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-50 flex items-center justify-between">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold disabled:opacity-40 hover:bg-slate-50">
              <ChevronLeft size={13} /> Précédent
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs font-black ${p === page ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>{p}</button>
              ))}
            </div>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold disabled:opacity-40 hover:bg-slate-50">
              Suivant <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ─── MODAL: NEW / EDIT ─── */}
      {(modal === "new" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white rounded-t-3xl p-6 border-b border-slate-100 flex items-center justify-between z-10">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <BookMarked size={18} className="text-violet-600" />
                {modal === "new" ? `Nouvelle planification (${activeTab})` : "Modifier planification"}
              </h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {formError && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-2"><AlertCircle size={15} />{formError}</div>}
              {formSuccess && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={15} />{formSuccess}</div>}

              {/* Row 1 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Classe *</label>
                  <select value={form.classId || ""} onChange={e => setForm(f => ({ ...f, classId: +e.target.value }))} className={fSel}>
                    <option value="">— Choisir —</option>
                    {classes.map((c: any) => <option key={c.id} value={c.id}>{c.className}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Matière *</label>
                  <select value={form.subjectId || ""} onChange={e => setForm(f => ({ ...f, subjectId: +e.target.value }))} className={fSel}>
                    <option value="">— Choisir —</option>
                    {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Enseignant *</label>
                  <select value={form.employeeId || ""} onChange={e => setForm(f => ({ ...f, employeeId: +e.target.value }))} className={fSel}>
                    <option value="">— Choisir —</option>
                    {employees.map((e: any) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Date prévue</label>
                  <input type="date" value={form.datePrevue || ""} onChange={e => setForm(f => ({ ...f, datePrevue: e.target.value }))} className={fInp} />
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Période / Échéance</label>
                  {periodOptions.length > 0 ? (
                    <select value={form.periode || ""} onChange={e => setForm(f => ({ ...f, periode: e.target.value }))} className={fSel}>
                      {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : (
                    <input type="text" placeholder="Ex: Semaine 12" value={form.periode || ""} onChange={e => setForm(f => ({ ...f, periode: e.target.value }))} className={fInp} />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Statut</label>
                  <select value={form.statut || "Planifié"} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))} className={fSel}>
                    {Object.keys(STATUT_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Année scolaire</label>
                  <input type="text" value={form.anneeScolaire || ""} onChange={e => setForm(f => ({ ...f, anneeScolaire: e.target.value }))} className={fInp} />
                </div>
              </div>

              {/* Chapitre & Leçon */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Chapitre *</label>
                <input type="text" placeholder="Ex: Chapitre II - Mécanique Newtonienne" value={form.chapitre} onChange={e => setForm(f => ({ ...f, chapitre: e.target.value }))} className={fInp} />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Leçon prévue *</label>
                <input type="text" placeholder="Ex: Les lois de Kepler" value={form.leconPrevue} onChange={e => setForm(f => ({ ...f, leconPrevue: e.target.value }))} className={fInp} />
              </div>

              {/* Compétences visées */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Compétence visée</label>
                <textarea rows={2} placeholder="Savoir analyser le mouvement d'un satellite..." value={form.competenceVisee || ""} onChange={e => setForm(f => ({ ...f, competenceVisee: e.target.value }))} className={fTxt} />
              </div>

              {/* Observation */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Observation / Notes</label>
                <textarea rows={2} placeholder="Remarques éventuelles..." value={form.observation || ""} onChange={e => setForm(f => ({ ...f, observation: e.target.value }))} className={fTxt} />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white rounded-b-3xl p-5 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50">Annuler</button>
              <button onClick={handleSubmit} disabled={isPending} className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold rounded-xl shadow shadow-indigo-200 hover:opacity-90 transition-all flex items-center gap-1.5">
                {modal === "new" ? "Enregistrer" : "Modifier"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: VIEW DETAILS ─── */}
      {modal === "view" && selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-600" /> Détails planification
              </h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                <div>Type Plan: <span className="text-slate-900 font-bold">{selectedRow.typePlan}</span></div>
                <div>Année Scolaire: <span className="text-slate-900 font-bold">{selectedRow.anneeScolaire || "—"}</span></div>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Période", val: selectedRow.periode },
                  { label: "Classe", val: selectedRow.class?.className },
                  { label: "Matière", val: selectedRow.subject?.subjectName },
                  { label: "Enseignant", val: selectedRow.employee?.nom },
                  { label: "Chapitre", val: selectedRow.chapitre },
                  { label: "Leçon Prévue", val: selectedRow.leconPrevue },
                  { label: "Compétence Visée", val: selectedRow.competenceVisee },
                  { label: "Date Prévue", val: selectedRow.datePrevue && new Date(selectedRow.datePrevue).toLocaleDateString("fr-FR") },
                  { label: "Statut", val: selectedRow.statut },
                  { label: "Observation", val: selectedRow.observation }
                ].filter(f => f.val).map((f, i) => (
                  <div key={i} className="flex border-b border-slate-50 py-2">
                    <span className="w-28 text-[10px] font-black text-slate-400 uppercase tracking-widest">{f.label}</span>
                    <span className="flex-1 text-sm text-slate-800 font-semibold">{f.val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button onClick={() => setModal(null)} className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tailwind Styles ────────────────────────────────────────────────────────
const fInp = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300";
const fSel = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 appearance-none";
const fTxt = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none";
