"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  Plus, Search, Filter, Download, Printer, FileText, Eye, Pencil, Trash2, X,
  ChevronDown, BookOpen, Clock, AlertCircle, CheckCircle2, ClipboardList,
  ChevronLeft, ChevronRight, BookMarked, User, GraduationCap, Award, HelpCircle,
  ShieldCheck, Loader2, Sparkles, MessageSquare, PlusCircle
} from "lucide-react";
import {
  createInspectionVisit, updateInspectionVisit, deleteInspectionVisit,
  type InspectionFormData
} from "@/domains/pedagogie/actions/inspection.actions";
import { toast } from "sonner";

interface Props {
  currentUser: any;
  initialVisits: any[];
  classes: any[];
  subjects: any[];
  employees: any[];
  auditData?: any;
}

const PAGE_SIZE = 15;

const SCORE_LEVELS = ["Excellent", "Satisfaisant", "A améliorer"];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  "Ouvert":     { label: "Ouvert",     bg: "bg-blue-50",     text: "text-blue-700" },
  "En attente": { label: "En attente", bg: "bg-amber-50",    text: "text-amber-700" },
  "Clôturé":    { label: "Clôturé",    bg: "bg-emerald-50",  text: "text-emerald-700" },
};

export default function InspectionClient({
  currentUser, initialVisits, classes, subjects, employees, auditData
}: Props) {
  const [visits, setVisits] = useState<any[]>(initialVisits);
  const [activeTab, setActiveTab] = useState<"audit" | "visites" | "observations" | "recommandations" | "rapports">("audit");
  const [isPending, startTransition] = useTransition();

  // ─── Filter States ─────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterEmp, setFilterEmp] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  // ─── Modal States ──────────────────────────────────────────────────────────
  const [modal, setModal] = useState<"new_visit" | "edit_visit" | "add_reco" | "view" | null>(null);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // ─── Form State ────────────────────────────────────────────────────────────
  const emptyForm: InspectionFormData = {
    visitDate: new Date().toISOString().split("T")[0],
    employeeId: 0,
    classId: 0,
    subjectId: 0,
    leconObservee: "",
    ponctualite: "Satisfaisant",
    methodologie: "Satisfaisant",
    gestionClasse: "Satisfaisant",
    supportsUtilises: "",
    noteInspection: 15.0,
    recommandations: "",
    status: "Ouvert",
  };
  const [form, setForm] = useState<InspectionFormData>(emptyForm);
  const [recoText, setRecoText] = useState("");

  // ─── Filter Logic ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return visits.filter((v) => {
      // Filter by active tabs
      if (activeTab === "recommandations" && !v.recommandations) return false;
      if (activeTab === "rapports" && v.status !== "Clôturé") return false;

      if (filterClass && String(v.classId) !== filterClass) return false;
      if (filterSubject && String(v.subjectId) !== filterSubject) return false;
      if (filterEmp && String(v.employeeId) !== filterEmp) return false;
      if (filterStatus && v.status !== filterStatus) return false;

      if (search) {
        const q = search.toLowerCase();
        const teacherName = (v.employee?.nom || "").toLowerCase();
        return (
          teacherName.includes(q) ||
          (v.leconObservee || "").toLowerCase().includes(q) ||
          (v.recommandations || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [visits, activeTab, filterClass, filterSubject, filterEmp, filterStatus, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ─── KPI Calculations ──────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalVisits = visits.length;
    const uniqueTeachers = new Set(visits.map(v => v.employeeId)).size;
    const openRecommendations = visits.filter(v => v.recommandations && v.status === "Ouvert").length;
    const pendingReports = visits.filter(v => v.status === "En attente").length;
    const closedReports = visits.filter(v => v.status === "Clôturé").length;

    return { totalVisits, uniqueTeachers, openRecommendations, pendingReports, closedReports };
  }, [visits]);

  // ─── Actions ───
  const openNew = () => {
    setForm(emptyForm);
    setFormError("");
    setFormSuccess("");
    setSelectedRow(null);
    setModal("new_visit");
  };

  const openEdit = (row: any) => {
    setForm({
      visitDate: row.visitDate || "",
      employeeId: row.employeeId || 0,
      classId: row.classId || 0,
      subjectId: row.subjectId || 0,
      leconObservee: row.leconObservee || "",
      ponctualite: row.ponctualite || "Satisfaisant",
      methodologie: row.methodologie || "Satisfaisant",
      gestionClasse: row.gestionClasse || "Satisfaisant",
      supportsUtilises: row.supportsUtilises || "",
      noteInspection: row.noteInspection || 0,
      recommandations: row.recommandations || "",
      status: row.status || "Ouvert",
    });
    setSelectedRow(row);
    setFormError("");
    setFormSuccess("");
    setModal("edit_visit");
  };

  const openView = (row: any) => {
    setSelectedRow(row);
    setModal("view");
  };

  const openAddReco = (row: any) => {
    setSelectedRow(row);
    setRecoText(row.recommandations || "");
    setFormError("");
    setFormSuccess("");
    setModal("add_reco");
  };

  const handleSubmit = () => {
    if (!form.employeeId || !form.classId || !form.subjectId || !form.leconObservee) {
      setFormError("Veuillez remplir tous les champs obligatoires (*).");
      return;
    }
    setFormError("");
    startTransition(async () => {
      let res: any;
      if (modal === "new_visit") {
        res = await createInspectionVisit(form);
        if (res.success) {
          setVisits(prev => [res.data, ...prev]);
          setFormSuccess("Rapport de visite créé !");
          setTimeout(() => { setModal(null); setFormSuccess(""); }, 1200);
        } else {
          setFormError(res.error || "Erreur de sauvegarde.");
        }
      } else if (modal === "edit_visit" && selectedRow) {
        res = await updateInspectionVisit(selectedRow.id, form);
        if (res.success) {
          setVisits(prev => prev.map(v => v.id === selectedRow.id ? { ...v, ...form } : v));
          setFormSuccess("Rapport mis à jour !");
          setTimeout(() => { setModal(null); setFormSuccess(""); }, 1200);
        } else {
          setFormError(res.error || "Erreur de mise à jour.");
        }
      }
    });
  };

  const handleSaveReco = () => {
    if (!selectedRow) return;
    setFormError("");
    startTransition(async () => {
      const res = await updateInspectionVisit(selectedRow.id, { recommandations: recoText });
      if (res.success) {
        setVisits(prev => prev.map(v => v.id === selectedRow.id ? { ...v, recommandations: recoText } : v));
        setFormSuccess("Recommandations enregistrées !");
        setTimeout(() => { setModal(null); setFormSuccess(""); }, 1200);
      } else {
        setFormError(res.error || "Erreur d'enregistrement.");
      }
    });
  };

  const handleDelete = (row: any) => {
    if (!confirm("Voulez-vous supprimer ce rapport d'inspection ?")) return;
    startTransition(async () => {
      const res = await deleteInspectionVisit(row.id);
      if (res.success) {
        setVisits(prev => prev.filter(v => v.id !== row.id));
        toast.success("Rapport supprimé avec succès.");
      }
    });
  };

  const handlePrint = () => window.print();

  const handleExportPDF = (row: any) => {
    toast.success(`Génération du rapport PDF d'inspection pour ${row.employee?.nom}...`);
  };

  const resetFilters = () => {
    setFilterClass("");
    setFilterSubject("");
    setFilterEmp("");
    setFilterStatus("");
    setSearch("");
  };

  const KpiCard = ({ icon, label, value, color, sub }: any) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
      <div className={`p-3.5 rounded-xl ${color} shrink-0`}>{icon}</div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-2xl font-black text-slate-900 mt-0.5 leading-none">{value}</p>
        {sub && <p className="text-xs text-slate-400 font-medium mt-1">{sub}</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/60 p-5 lg:p-7 space-y-6">
      <style>{`
        @media print {
          @page {
            size: A4 landscape !important;
            margin: 8mm !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            background-color: #ffffff !important;
          }
          .no-print, nav, aside {
            display: none !important;
          }
          table {
            width: 100% !important;
          }
        }
      `}</style>

      {/* ─── HEADER ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-none">Inspection pédagogique</h1>
            <p className="text-slate-500 text-sm font-medium mt-0.5">Visites de classes, évaluations méthodologiques et recommandations</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm">
            <Printer size={14} /> Imprimer
          </button>
          <button onClick={openNew} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-black shadow-lg shadow-indigo-200 hover:opacity-90 transition-all">
            <Plus size={15} /> Nouvelle visite
          </button>
        </div>
      </div>

      {/* ─── KPIs ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard icon={<Eye size={18} className="text-blue-600" />} label="Visites réalisées" value={kpis.totalVisits} color="bg-blue-50" />
        <KpiCard icon={<User size={18} className="text-indigo-600" />} label="Enseignants inspectés" value={kpis.uniqueTeachers} color="bg-indigo-50" />
        <KpiCard icon={<ClipboardList size={18} className="text-rose-600" />} label="Recommandations" value={kpis.openRecommendations} color="bg-rose-50" sub="Ouvertes" />
        <KpiCard icon={<Clock size={18} className="text-amber-600" />} label="Rapports en attente" value={kpis.pendingReports} color="bg-amber-50" />
        <KpiCard icon={<CheckCircle2 size={18} className="text-emerald-600" />} label="Rapports validés" value={kpis.closedReports} color="bg-emerald-50" />
      </div>

      {/* ─── TABS & CONTROLS ─── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl w-fit flex-wrap">
            {[
              { id: "audit", label: "📊 Audit & Évaluation 360°" },
              { id: "visites", label: "Visites de classe" },
              { id: "observations", label: "Observations" },
              { id: "recommandations", label: "Recommandations" },
              { id: "rapports", label: "Rapports validés" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setPage(1); }}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none w-48 focus:w-64 transition-all"
              />
            </div>
            {activeTab !== "audit" && (
              <>
                <select value={filterClass} onChange={e => { setFilterClass(e.target.value); setPage(1); }} className={fSel}>
                  <option value="">Classes (Toutes)</option>
                  {classes.map((c: any) => <option key={c.id} value={c.id}>{c.className}</option>)}
                </select>
                <select value={filterSubject} onChange={e => { setFilterSubject(e.target.value); setPage(1); }} className={fSel}>
                  <option value="">Matières (Toutes)</option>
                  {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                </select>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── AUDIT VIEW OR DATA TABLE ─── */}
      {activeTab === "audit" ? (
        <div className="space-y-4">
          {/* Summary Cards */}
          {auditData?.summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Avancement Moyen Programme</div>
                <div className="text-2xl font-black text-indigo-600 mt-1">{auditData.summary.averageSyllabusProgress}%</div>
                <div className="text-xs text-slate-500 mt-0.5">Calculé sur l'ensemble des cours</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Diligence Saisie des Notes</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">{auditData.summary.averageGradingSpeed}/100</div>
                <div className="text-xs text-slate-500 mt-0.5">Rapidité de saisie post-évaluation</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Satisfaction Globale</div>
                <div className="text-2xl font-black text-amber-500 mt-1">★ {auditData.summary.averageSatisfaction} / 5.0</div>
                <div className="text-xs text-slate-500 mt-0.5">Retours parents & inspection</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Enseignants Distingués</div>
                <div className="text-2xl font-black text-violet-600 mt-1">{auditData.summary.topPerformersCount} Enseignants</div>
                <div className="text-xs text-slate-500 mt-0.5">Score supérieur à 4.5 / 5.0</div>
              </div>
            </div>
          )}

          {/* Teachers Ranking & Audit Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Award size={18} className="text-indigo-600" />
                Tableau de bord d'évaluation & Audit 360° du corps professoral
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Enseignant & Spécialité", "Avancement Programme", "Diligence Notes & Devoirs", "Assiduité & Pointage", "Note Globale", "Mention", "Recommandation Pédagogique"].map(h => (
                      <th key={h} className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(!auditData?.teachers || auditData.teachers.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-slate-400 font-bold">Aucune donnée d'audit disponible</td>
                    </tr>
                  ) : (
                    auditData.teachers
                      .filter((t: any) => !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.subject || "").toLowerCase().includes(search.toLowerCase()))
                      .map((t: any) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="font-bold text-slate-900">{t.name}</div>
                            <div className="text-xs text-indigo-600 font-medium">{t.subject}</div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${t.syllabusProgress >= 80 ? "bg-emerald-500" : t.syllabusProgress >= 60 ? "bg-amber-500" : "bg-rose-500"}`}
                                  style={{ width: `${t.syllabusProgress}%` }}
                                />
                              </div>
                              <span className="font-black text-xs text-slate-700">{t.syllabusProgress}%</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{t.completedLessons} / {t.plannedLessons} séances</div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="font-bold text-slate-800 text-xs">{t.gradesRecordedCount} notes • {t.homeworkCount} devoirs</div>
                            <div className="text-[11px] text-emerald-600 font-semibold">Score rapidité : {t.gradingSpeedScore}%</div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="font-bold text-slate-800 text-xs">{t.scannedSessions} séances pointées</div>
                            <div className="text-[11px] text-indigo-600 font-semibold">{t.attendanceRate}% assiduité</div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="font-black text-amber-500 text-sm">★ {t.overallScore} <span className="text-slate-400 text-xs font-normal">/ 5.0</span></div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
                              t.ratingLabel === "Excellent" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                              t.ratingLabel === "Très Bon" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                              t.ratingLabel === "Satisfaisant" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                              "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}>
                              {t.ratingLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-600 max-w-xs">
                            {t.recommendation}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["N°", "Date visite", "Enseignant", "Classe", "Matière", "Leçon observée", "Ponctualité", "Méthodologie", "Gestion classe", "Note", "Statut", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-16 text-slate-400 font-bold">Aucune inspection ou visite disponible</td>
                </tr>
              ) : paginated.map((v, idx) => (
                <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-4 py-3.5 font-black text-slate-400 text-xs">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-800 whitespace-nowrap">
                    {new Date(v.visitDate).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">{v.employee?.nom || "—"}</td>
                  <td className="px-4 py-3.5 font-bold text-indigo-700 whitespace-nowrap">{v.class?.className || "—"}</td>
                  <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">{v.subject?.subjectName || "—"}</td>
                  <td className="px-4 py-3.5 text-slate-500 max-w-[150px] truncate">{v.leconObservee}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{v.ponctualite || "—"}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{v.methodologie || "—"}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{v.gestionClasse || "—"}</td>
                  <td className="px-4 py-3.5 font-black text-indigo-600">{v.noteInspection != null ? `${v.noteInspection}/20` : "—"}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${STATUS_CONFIG[v.status]?.bg} ${STATUS_CONFIG[v.status]?.text}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openView(v)} className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200" title="Voir fiche"><Eye size={13} /></button>
                      <button onClick={() => openAddReco(v)} className="p-1.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100" title="Ajouter recommandation"><PlusCircle size={13} /></button>
                      <button onClick={() => handleExportPDF(v)} className="p-1.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title="Générer rapport PDF"><FileText size={13} /></button>
                      <button onClick={() => openEdit(v)} className="p-1.5 rounded bg-amber-50 text-amber-600 hover:bg-amber-100" title="Modifier"><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(v)} className="p-1.5 rounded bg-rose-50 text-rose-600 hover:bg-rose-100" title="Supprimer"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
      )}

      {/* ─── MODAL: NEW / EDIT VISIT ─── */}
      {(modal === "new_visit" || modal === "edit_visit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white rounded-t-3xl p-6 border-b border-slate-100 flex items-center justify-between z-10">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck size={18} className="text-violet-600" />
                {modal === "new_visit" ? "Nouvelle visite d'inspection" : "Modifier rapport d'inspection"}
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
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Enseignant Inspecté *</label>
                  <select value={form.employeeId || ""} onChange={e => setForm(f => ({ ...f, employeeId: +e.target.value }))} className={fSel}>
                    <option value="">— Choisir —</option>
                    {employees.map((e: any) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Date de la visite *</label>
                  <input type="date" value={form.visitDate} onChange={e => setForm(f => ({ ...f, visitDate: e.target.value }))} className={fInp} />
                </div>
              </div>

              {/* Row 2 */}
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

              {/* Lesson observed */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Leçon observée *</label>
                <input type="text" placeholder="Ex: Résolution d'équations du second degré" value={form.leconObservee} onChange={e => setForm(f => ({ ...f, leconObservee: e.target.value }))} className={fInp} />
              </div>

              {/* Evaluations */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Ponctualité</label>
                  <select value={form.ponctualite || "Satisfaisant"} onChange={e => setForm(f => ({ ...f, ponctualite: e.target.value }))} className={fSel}>
                    {SCORE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Méthodologie</label>
                  <select value={form.methodologie || "Satisfaisant"} onChange={e => setForm(f => ({ ...f, methodologie: e.target.value }))} className={fSel}>
                    {SCORE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Gestion de classe</label>
                  <select value={form.gestionClasse || "Satisfaisant"} onChange={e => setForm(f => ({ ...f, gestionClasse: e.target.value }))} className={fSel}>
                    {SCORE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              {/* Note, supports, status */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Note d'inspection (/20)</label>
                  <input type="number" step="0.5" value={form.noteInspection || 0} onChange={e => setForm(f => ({ ...f, noteInspection: +e.target.value }))} className={fInp} />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Statut du rapport</label>
                  <select value={form.status || "Ouvert"} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={fSel}>
                    {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                </div>
              </div>

              {/* Supports */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Supports utilisés</label>
                <input type="text" placeholder="Tableau, Projecteur, Manuels scolaires..." value={form.supportsUtilises || ""} onChange={e => setForm(f => ({ ...f, supportsUtilises: e.target.value }))} className={fInp} />
              </div>

              {/* Recommendations */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Recommandations formulées</label>
                <textarea rows={3} placeholder="Axes d'amélioration pédagogiques..." value={form.recommandations || ""} onChange={e => setForm(f => ({ ...f, recommandations: e.target.value }))} className={fTxt} />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white rounded-b-3xl p-5 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-bold hover:bg-slate-50">Annuler</button>
              <button onClick={handleSubmit} disabled={isPending} className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold rounded-xl flex items-center gap-1 shadow shadow-indigo-100">
                {modal === "new_visit" ? "Enregistrer" : "Modifier"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD RECOMMENDATIONS ONLY ─── */}
      {modal === "add_reco" && selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <PlusCircle size={18} className="text-blue-600" /> Ajouter des recommandations
              </h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {formError && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold">{formError}</div>}
              {formSuccess && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold">{formSuccess}</div>}

              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Recommandations pour {selectedRow.employee?.nom}</label>
                <textarea rows={5} placeholder="Décrire les actions d'amélioration..." value={recoText} onChange={e => setRecoText(e.target.value)} className={fTxt} />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50">Annuler</button>
              <button onClick={handleSaveReco} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow shadow-blue-100">Enregistrer</button>
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
                <BookOpen size={18} className="text-indigo-600" /> Fiche de visite d'inspection
              </h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${STATUS_CONFIG[selectedRow.status]?.bg} ${STATUS_CONFIG[selectedRow.status]?.text}`}>
                  Statut: {selectedRow.status}
                </span>
              </div>

              <div className="space-y-2">
                {[
                  { label: "Date de visite", val: new Date(selectedRow.visitDate).toLocaleDateString("fr-FR") },
                  { label: "Enseignant", val: selectedRow.employee?.nom },
                  { label: "Classe", val: selectedRow.class?.className },
                  { label: "Matière", val: selectedRow.subject?.subjectName },
                  { label: "Leçon observée", val: selectedRow.leconObservee },
                  { label: "Ponctualité", val: selectedRow.ponctualite },
                  { label: "Méthodologie", val: selectedRow.methodologie },
                  { label: "Gestion de classe", val: selectedRow.gestionClasse },
                  { label: "Note obtenue", val: selectedRow.noteInspection != null ? `${selectedRow.noteInspection}/20` : "—" },
                  { label: "Supports utilisés", val: selectedRow.supportsUtilises },
                  { label: "Recommandations", val: selectedRow.recommandations }
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

// ─── Tailwind Styles ───
const fInp = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300";
const fSel = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer";
const fTxt = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none";
