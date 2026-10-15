"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  Plus, Search, Filter, Download, Printer, FileText, Eye, Pencil, Trash2, X,
  ChevronDown, BookOpen, Clock, AlertCircle, CheckCircle2, ClipboardList,
  ChevronLeft, ChevronRight, BookMarked, User, GraduationCap, Award, HelpCircle,
  ShieldAlert, Sparkles, Loader2, ArrowRight, Ban, RefreshCw
} from "lucide-react";
import {
  createRemediationPlan, updateRemediationPlan, addRemediationSession,
  closeRemediationPlan, deleteRemediationPlan, type RemediationFormData
} from "@/domains/pedagogie/actions/remediation.actions";
import { toast } from "sonner";

interface Props {
  currentUser: any;
  initialPlans: any[];
  classes: any[];
  subjects: any[];
  employees: any[];
  students: any[];
  atRiskStudents?: any[];
}

const PAGE_SIZE = 15;

const ALERT_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  "Critique": { label: "Critique", bg: "bg-red-50", text: "text-red-700", border: "border-red-100" },
  "Moyen":    { label: "Moyen",    bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
  "Faible":   { label: "Faible",   bg: "bg-blue-50",  text: "text-blue-700", border: "border-blue-100" },
};

export default function RemediationClient({
  currentUser, initialPlans, classes, subjects, employees, students, atRiskStudents = []
}: Props) {
  const [plans, setPlans] = useState<any[]>(initialPlans);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"plans" | "atRisk">("plans");

  // ─── Filter States ─────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterEmp, setFilterEmp] = useState("");
  const [filterAlert, setFilterAlert] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  // ─── Modal States ──────────────────────────────────────────────────────────
  const [modal, setModal] = useState<"new_plan" | "edit_plan" | "view" | null>(null);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // ─── Form State ────────────────────────────────────────────────────────────
  const emptyForm: RemediationFormData = {
    studentId: 0,
    classId: 0,
    subjectId: 0,
    employeeId: currentUser?.employeeId || 0,
    difficulties: "",
    currentGrade: 8.0,
    targetGrade: 12.0,
    remediationPlan: "",
    sessionsPlanned: 6,
    sessionsCompleted: 0,
    alertLevel: "Moyen",
  };
  const [form, setForm] = useState<RemediationFormData>(emptyForm);

  // ─── Filter Logic ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return plans.filter((p) => {
      if (filterClass && String(p.classId) !== filterClass) return false;
      if (filterSubject && String(p.subjectId) !== filterSubject) return false;
      if (filterEmp && String(p.employeeId) !== filterEmp) return false;
      if (filterAlert && p.alertLevel !== filterAlert) return false;
      if (filterStatus && p.status !== filterStatus) return false;

      if (search) {
        const q = search.toLowerCase();
        const studentName = `${p.student?.firstName || ""} ${p.student?.lastName || ""}`.toLowerCase();
        return (
          studentName.includes(q) ||
          (p.difficulties || "").toLowerCase().includes(q) ||
          (p.remediationPlan || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [plans, filterClass, filterSubject, filterEmp, filterAlert, filterStatus, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ─── KPI Calculations ──────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const difficultiesCount = filtered.length;
    const active = filtered.filter(p => p.status === "Actif").length;

    let totalSoutiens = 0;
    let improvementSum = 0;
    let gradedCount = 0;
    let critical = 0;

    filtered.forEach(p => {
      totalSoutiens += p.sessionsCompleted || 0;
      if (p.alertLevel === "Critique" && p.status === "Actif") critical++;

      if (p.currentGrade != null && p.targetGrade != null) {
        // Improvement is target grade minus current grade
        const diff = p.targetGrade - p.currentGrade;
        if (diff > 0) {
          improvementSum += diff;
          gradedCount++;
        }
      }
    });

    const avgImprovement = gradedCount ? Math.round((improvementSum / gradedCount) * 10) / 10 : 0;

    return { difficultiesCount, active, totalSoutiens, avgImprovement, critical };
  }, [filtered]);

  // ─── Actions ───
  const openNew = () => {
    setForm(emptyForm);
    setFormError("");
    setFormSuccess("");
    setSelectedRow(null);
    setModal("new_plan");
  };

  const openEdit = (row: any) => {
    setForm({
      studentId: row.studentId || 0,
      classId: row.classId || 0,
      subjectId: row.subjectId || 0,
      employeeId: row.employeeId || 0,
      difficulties: row.difficulties || "",
      currentGrade: row.currentGrade || 0,
      targetGrade: row.targetGrade || 0,
      remediationPlan: row.remediationPlan || "",
      sessionsPlanned: row.sessionsPlanned || 4,
      sessionsCompleted: row.sessionsCompleted || 0,
      alertLevel: row.alertLevel || "Moyen",
    });
    setSelectedRow(row);
    setFormError("");
    setFormSuccess("");
    setModal("edit_plan");
  };

  const openView = (row: any) => {
    setSelectedRow(row);
    setModal("view");
  };

  const handleSubmit = () => {
    if (!form.studentId || !form.classId || !form.subjectId || !form.difficulties || !form.remediationPlan) {
      setFormError("Veuillez remplir tous les champs obligatoires (*).");
      return;
    }
    setFormError("");
    startTransition(async () => {
      let res: any;
      if (modal === "new_plan") {
        res = await createRemediationPlan(form);
        if (res.success) {
          setPlans(prev => [res.data, ...prev]);
          setFormSuccess("Plan de remédiation créé !");
          setTimeout(() => { setModal(null); setFormSuccess(""); }, 1200);
        } else {
          setFormError(res.error || "Erreur de sauvegarde.");
        }
      } else if (modal === "edit_plan" && selectedRow) {
        res = await updateRemediationPlan(selectedRow.id, form);
        if (res.success) {
          setPlans(prev => prev.map(p => p.id === selectedRow.id ? { ...p, ...form } : p));
          setFormSuccess("Plan mis à jour !");
          setTimeout(() => { setModal(null); setFormSuccess(""); }, 1200);
        } else {
          setFormError(res.error || "Erreur de mise à jour.");
        }
      }
    });
  };

  const handleAddSession = (row: any) => {
    startTransition(async () => {
      const res = await addRemediationSession(row.id);
      if (res.success) {
        setPlans(prev => prev.map(p => p.id === row.id ? { ...p, sessionsCompleted: (p.sessionsCompleted || 0) + 1 } : p));
        toast.success("Séance de soutien ajoutée.");
      }
    });
  };

  const handleClosePlan = (row: any) => {
    if (!confirm("Voulez-vous clôturer ce plan de remédiation ?")) return;
    startTransition(async () => {
      const res = await closeRemediationPlan(row.id);
      if (res.success) {
        setPlans(prev => prev.map(p => p.id === row.id ? { ...p, status: "Clôturé" } : p));
        toast.success("Plan clôturé avec succès.");
      }
    });
  };

  const handleDelete = (row: any) => {
    if (!confirm("Voulez-vous supprimer ce plan ?")) return;
    startTransition(async () => {
      const res = await deleteRemediationPlan(row.id);
      if (res.success) {
        setPlans(prev => prev.filter(p => p.id !== row.id));
        toast.success("Plan de remédiation supprimé.");
      }
    });
  };

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    const headers = ["N°", "Élève", "Classe", "Matière", "Difficulté", "Note", "Objectif", "Plan", "Séances", "Progression", "Statut"];
    const rows = filtered.map((p, idx) => [
      idx + 1,
      `${p.student?.firstName || ""} ${p.student?.lastName || ""}`,
      p.class?.className || "—",
      p.subject?.subjectName || "—",
      p.difficulties || "—",
      p.currentGrade || "—",
      p.targetGrade || "—",
      p.remediationPlan || "—",
      `${p.sessionsCompleted}/${p.sessionsPlanned}`,
      `${p.sessionsPlanned ? Math.round((p.sessionsCompleted / p.sessionsPlanned) * 100) : 0}%`,
      p.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "remeditations_pedagogiques.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setFilterClass("");
    setFilterSubject("");
    setFilterEmp("");
    setFilterAlert("");
    setFilterStatus("");
    setSearch("");
  };

  const triggerRemediationForStudent = (stud: any) => {
    setForm({
      studentId: stud.id,
      classId: stud.classId || 0,
      subjectId: subjects[0]?.id || 0,
      employeeId: currentUser?.employeeId || employees[0]?.id || 0,
      difficulties: `Moyenne de ${stud.averageGrade > 0 ? stud.averageGrade.toFixed(1) : 0}/20, ${stud.absenceCount} absences, ${stud.missingHomeworkCount} devoirs non rendus.`,
      currentGrade: stud.averageGrade || 8.0,
      targetGrade: 12.0,
      remediationPlan: "",
      sessionsPlanned: 6,
      sessionsCompleted: 0,
      alertLevel: stud.averageGrade <= 8.5 ? "Critique" : "Moyen",
    });
    setSelectedRow(null);
    setFormError("");
    setFormSuccess("");
    setModal("new_plan");
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-5 lg:p-7 space-y-6">

      {/* ─── HEADER ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-none">Remédiation pédagogique</h1>
            <p className="text-slate-500 text-sm font-medium mt-0.5">Accompagnement et plans de soutien aux élèves en difficulté</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm">
            <Printer size={14} /> Imprimer fiche
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm">
            <Download size={14} /> Exporter CSV
          </button>
          <button onClick={openNew} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-black shadow-lg shadow-indigo-200 hover:opacity-90 transition-all">
            <Plus size={15} /> Créer plan
          </button>
        </div>
      </div>

      {/* ─── KPIs ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard icon={<User size={18} className="text-blue-600" />} label="Élèves en difficulté" value={kpis.difficultiesCount} color="bg-blue-50" />
        <KpiCard icon={<ClipboardList size={18} className="text-indigo-600" />} label="Plans actifs" value={kpis.active} color="bg-indigo-50" />
        <KpiCard icon={<CheckCircle2 size={18} className="text-emerald-600" />} label="Séances de soutien" value={kpis.totalSoutiens} color="bg-emerald-50" sub="Réalisées" />
        <KpiCard icon={<Award size={18} className="text-violet-600" />} label="Objectif d'amélioration" value={`+${kpis.avgImprovement} pts`} color="bg-violet-50" sub="Moyenne visée" />
        <KpiCard icon={<ShieldAlert size={18} className="text-red-600" />} label="Alertes critiques" value={kpis.critical} color="bg-red-50" sub="Suivi prioritaire" />
      </div>

      {/* ─── TABS ─── */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm w-fit print:hidden">
        <button
          onClick={() => setActiveTab("plans")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "plans"
              ? "bg-gradient-to-r from-violet-600 to-indigo-700 text-white shadow-md"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          }`}
        >
          Plans de remédiation
        </button>
        <button
          onClick={() => setActiveTab("atRisk")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "atRisk"
              ? "bg-gradient-to-r from-violet-600 to-indigo-700 text-white shadow-md"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          }`}
        >
          <span>Élèves à risque détectés</span>
          {atRiskStudents.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black animate-pulse">
              {atRiskStudents.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "plans" && (
        <>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par élève, difficulté, plan..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <button
                onClick={() => setShowFilters(f => !f)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  showFilters ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Filter size={14} /> Filtres
                <ChevronDown size={12} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
              </button>
              {(filterClass || filterSubject || filterEmp || filterAlert || filterStatus) && (
                <button onClick={resetFilters} className="flex items-center gap-1 px-3 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100 transition-all">
                  <RefreshCw size={13} /> Recharger
                </button>
              )}
            </div>

            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-slate-50">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Classe</label>
                  <select value={filterClass} onChange={e => { setFilterClass(e.target.value); setPage(1); }} className={fSel}>
                    <option value="">Toutes</option>
                    {classes.map((c: any) => <option key={c.id} value={c.id}>{c.className}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Matière</label>
                  <select value={filterSubject} onChange={e => { setFilterSubject(e.target.value); setPage(1); }} className={fSel}>
                    <option value="">Toutes</option>
                    {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Enseignant</label>
                  <select value={filterEmp} onChange={e => { setFilterEmp(e.target.value); setPage(1); }} className={fSel}>
                    <option value="">Tous</option>
                    {employees.map((e: any) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Niveau alerte</label>
                  <select value={filterAlert} onChange={e => { setFilterAlert(e.target.value); setPage(1); }} className={fSel}>
                    <option value="">Tous</option>
                    {Object.keys(ALERT_CONFIG).map(k => <option key={k} value={k}>{ALERT_CONFIG[k].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Statut</label>
                  <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className={fSel}>
                    <option value="">Tous</option>
                    <option value="Actif">Actif</option>
                    <option value="Clôturé">Clôturé</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100">
                    {["N°", "Élève", "Classe", "Matière", "Enseignant", "Difficulté détectée", "Note", "Objectif", "Soutien", "Progression", "Niveau alerte", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center py-16 text-slate-400 font-bold">Aucun plan de remédiation actif</td>
                    </tr>
                  ) : paginated.map((p, idx) => {
                    const studentName = p.student?.nomEtudiant || `${p.student?.firstName || ""} ${p.student?.lastName || ""}`;
                    const completionRate = p.sessionsPlanned ? Math.min(100, Math.round((p.sessionsCompleted / p.sessionsPlanned) * 100)) : 0;
                    const alert = ALERT_CONFIG[p.alertLevel] || ALERT_CONFIG["Moyen"];

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-4 py-3.5 font-black text-slate-400 text-xs">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">{studentName}</td>
                        <td className="px-4 py-3.5 font-bold text-indigo-700 whitespace-nowrap">{p.class?.className || "—"}</td>
                        <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">{p.subject?.subjectName || "—"}</td>
                        <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{p.employee?.nom || "—"}</td>
                        <td className="px-4 py-3.5 text-slate-500 max-w-[150px] truncate">{p.difficulties}</td>
                        <td className="px-4 py-3.5 font-black text-rose-600">{p.currentGrade != null ? `${p.currentGrade}/20` : "—"}</td>
                        <td className="px-4 py-3.5 font-black text-emerald-600">{p.targetGrade != null ? `${p.targetGrade}/20` : "—"}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-600 whitespace-nowrap">
                          {p.sessionsCompleted} / {p.sessionsPlanned} séances
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700 text-xs">{completionRate}%</span>
                            <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full rounded-full bg-violet-600" style={{ width: `${completionRate}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border ${alert.bg} ${alert.text} ${alert.border}`}>
                            {alert.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openView(p)} className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200" title="Voir détails"><Eye size={13} /></button>
                            {p.status === "Actif" && (
                              <>
                                <button onClick={() => handleAddSession(p)} className="p-1.5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100" title="Ajouter séance"><Plus size={13} /></button>
                                <button onClick={() => handleClosePlan(p)} className="p-1.5 rounded bg-rose-50 text-rose-600 hover:bg-rose-100" title="Clôturer le plan"><Ban size={13} /></button>
                              </>
                            )}
                            <button onClick={() => openEdit(p)} className="p-1.5 rounded bg-amber-50 text-amber-600 hover:bg-amber-100" title="Modifier"><Pencil size={13} /></button>
                            <button onClick={() => handleDelete(p)} className="p-1.5 rounded bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Supprimer"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

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
        </>
      )}

      {activeTab === "atRisk" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-50 flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
              {atRiskStudents.length} élève(s) à risque identifié(s) par le système
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  {["N°", "Nom de l'élève", "Classe", "Moyenne Générale", "Absences", "Devoirs Non Rendus", "Niveau de Risque", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {atRiskStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-slate-400 font-bold">Aucun élève à risque détecté actuellement. Félicitations !</td>
                  </tr>
                ) : atRiskStudents.map((stud: any, idx: number) => {
                  let riskLevel = "Faible";
                  let riskBadge = "bg-blue-50 text-blue-700 border-blue-100";
                  if (stud.averageGrade <= 8.5 || stud.absenceCount >= 5 || stud.missingHomeworkCount >= 4) {
                    riskLevel = "Critique";
                    riskBadge = "bg-red-50 text-red-700 border-red-100";
                  } else if (stud.averageGrade <= 10.0 || stud.absenceCount >= 3 || stud.missingHomeworkCount >= 2) {
                    riskLevel = "Moyen";
                    riskBadge = "bg-amber-50 text-amber-700 border-amber-100";
                  }

                  return (
                    <tr key={stud.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 py-3.5 font-black text-slate-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">{stud.nomEtudiant}</td>
                      <td className="px-4 py-3.5 font-bold text-indigo-700">{stud.classe}</td>
                      <td className="px-4 py-3.5 font-bold text-rose-600">
                        {stud.averageGrade > 0 ? `${stud.averageGrade.toFixed(1)}/20` : "Pas de notes"}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-700">{stud.absenceCount} absence(s)</td>
                      <td className="px-4 py-3.5 font-bold text-slate-700">{stud.missingHomeworkCount} devoir(s)</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border ${riskBadge}`}>
                          {riskLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => triggerRemediationForStudent(stud)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-50 text-violet-700 font-bold text-xs hover:bg-violet-100 transition-colors"
                        >
                          <Plus size={13} /> Soutenir l'élève
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL: NEW / EDIT PLAN ─── */}
      {(modal === "new_plan" || modal === "edit_plan") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white rounded-t-3xl p-6 border-b border-slate-100 flex items-center justify-between z-10">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <GraduationCap size={18} className="text-violet-600" />
                {modal === "new_plan" ? "Créer un plan de soutien" : "Modifier le plan de soutien"}
              </h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {formError && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-2"><AlertCircle size={15} />{formError}</div>}
              {formSuccess && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={15} />{formSuccess}</div>}

              {/* Student */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Élève en difficulté *</label>
                <select value={form.studentId || ""} onChange={e => setForm(f => ({ ...f, studentId: +e.target.value }))} className={fSel}>
                  <option value="">— Choisir l'élève —</option>
                  {students.map((s: any) => <option key={s.id} value={s.id}>{s.nomEtudiant || `${s.firstName || ""} ${s.lastName || ""}`}</option>)}
                </select>
              </div>

              {/* Class & Subject */}
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

              {/* Responsible Teacher & Alert Level */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Enseignant responsable *</label>
                  <select value={form.employeeId || ""} onChange={e => setForm(f => ({ ...f, employeeId: +e.target.value }))} className={fSel}>
                    <option value="">— Choisir —</option>
                    {employees.map((e: any) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Niveau d'alerte *</label>
                  <select value={form.alertLevel || "Moyen"} onChange={e => setForm(f => ({ ...f, alertLevel: e.target.value }))} className={fSel}>
                    {Object.keys(ALERT_CONFIG).map(k => <option key={k} value={k}>{ALERT_CONFIG[k].label}</option>)}
                  </select>
                </div>
              </div>

              {/* Note actuelle, Note objectif & Séances prévues */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Note actuelle (/20)</label>
                  <input type="number" step="0.5" value={form.currentGrade || 0} onChange={e => setForm(f => ({ ...f, currentGrade: +e.target.value }))} className={fInp} />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Note cible (/20)</label>
                  <input type="number" step="0.5" value={form.targetGrade || 0} onChange={e => setForm(f => ({ ...f, targetGrade: +e.target.value }))} className={fInp} />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Séances prévues</label>
                  <input type="number" value={form.sessionsPlanned || 4} onChange={e => setForm(f => ({ ...f, sessionsPlanned: +e.target.value }))} className={fInp} />
                </div>
              </div>

              {/* Difficulties */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Difficultés constatées *</label>
                <textarea rows={2} placeholder="Ex: Lacunes en géométrie plane, difficultés de mémorisation..." value={form.difficulties} onChange={e => setForm(f => ({ ...f, difficulties: e.target.value }))} className={fTxt} />
              </div>

              {/* Action plan */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Plan d'action et remédiation *</label>
                <textarea rows={3} placeholder="Ex: Séances d'exercices corrigés supplémentaires, fiches de révision..." value={form.remediationPlan} onChange={e => setForm(f => ({ ...f, remediationPlan: e.target.value }))} className={fTxt} />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white rounded-b-3xl p-5 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50">Annuler</button>
              <button onClick={handleSubmit} disabled={isPending} className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold rounded-xl shadow shadow-indigo-100 flex items-center gap-1">
                {modal === "new_plan" ? "Enregistrer" : "Modifier"}
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
                <BookOpen size={18} className="text-indigo-600" /> Plan de remédiation pédagogique
              </h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${ALERT_CONFIG[selectedRow.alertLevel]?.bg} ${ALERT_CONFIG[selectedRow.alertLevel]?.text}`}>
                  Alerte: {selectedRow.alertLevel}
                </span>
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${selectedRow.status === "Actif" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  Statut: {selectedRow.status}
                </span>
              </div>

              <div className="space-y-2">
                {[
                  { label: "Élève", val: `${selectedRow.student?.firstName || ""} ${selectedRow.student?.lastName || ""}` },
                  { label: "Classe", val: selectedRow.class?.className },
                  { label: "Matière", val: selectedRow.subject?.subjectName },
                  { label: "Enseignant", val: selectedRow.employee?.nom },
                  { label: "Note Actuelle", val: selectedRow.currentGrade != null ? `${selectedRow.currentGrade}/20` : "—" },
                  { label: "Note Cible", val: selectedRow.targetGrade != null ? `${selectedRow.targetGrade}/20` : "—" },
                  { label: "Difficultés", val: selectedRow.difficulties },
                  { label: "Plan de remédiation", val: selectedRow.remediationPlan },
                  { label: "Séances de soutien", val: `${selectedRow.sessionsCompleted} réalisées sur ${selectedRow.sessionsPlanned} prévues` }
                ].filter(f => f.val).map((f, i) => (
                  <div key={i} className="flex border-b border-slate-50 py-2 text-xs">
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

// ─── KPI Card Helper ──────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, color, sub }: any) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
    <div className={`p-3.5 rounded-xl ${color} shrink-0`}>{icon}</div>
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-2xl font-black text-slate-900 leading-none mt-0.5">{value}</p>
      {sub && <p className="text-xs text-slate-400 font-medium mt-1">{sub}</p>}
    </div>
  </div>
);

// ─── Tailwind Styles ───
const fInp = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300";
const fSel = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer";
const fTxt = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none";
