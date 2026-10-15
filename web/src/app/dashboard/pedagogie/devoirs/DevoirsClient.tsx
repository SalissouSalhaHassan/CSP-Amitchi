"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  Plus, Search, Filter, Download, Printer, FileText, Eye, Pencil, Trash2, X,
  ChevronDown, BookOpen, Clock, AlertCircle, CheckCircle2, ClipboardList,
  ChevronLeft, ChevronRight, BookMarked, User, GraduationCap, Award, Upload, Check,
  BarChart3, Activity, Loader2, Sparkles, MessageSquare
} from "lucide-react";
import {
  saveAssignment, deleteAssignment, saveSubmission, gradeSubmission
} from "@/domains/lms/actions/lms.actions";
import { toast } from "sonner";

interface Props {
  currentUser: any;
  initialAssignments: any[];
  initialSubmissions: any[];
  classes: any[];
  subjects: any[];
  employees: any[];
  students: any[];
}

const PAGE_SIZE = 15;

export default function DevoirsClient({
  currentUser, initialAssignments, initialSubmissions, classes, subjects, employees, students
}: Props) {
  const [assignments, setAssignments] = useState<any[]>(initialAssignments);
  const [submissions, setSubmissions] = useState<any[]>(initialSubmissions);
  const [activeTab, setActiveTab] = useState<"devoirs" | "soumissions" | "corrections" | "stats">("devoirs");
  const [isPending, startTransition] = useTransition();

  // ─── Filter State ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [page, setPage] = useState(1);

  // ─── Modal State ───────────────────────────────────────────────────────────
  const [modal, setModal] = useState<"new_devoir" | "new_soumission" | "correct" | "view_devoir" | "view_soumission" | null>(null);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // ─── Form States ───────────────────────────────────────────────────────────
  const [devoirForm, setDevoirForm] = useState({
    title: "",
    description: "",
    classId: 0,
    subjectId: 0,
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    maxScore: 20.0,
    fileSujetPath: "",
    status: "Active"
  });

  const [soumissionForm, setSoumissionForm] = useState({
    assignmentId: 0,
    studentId: 0,
    fileReponsePath: "",
  });

  const [correctionForm, setCorrectionForm] = useState({
    score: 15.0,
    comment: "",
  });

  // ─── Filter Logic ───
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (filterClass && String(a.classId) !== filterClass) return false;
      if (filterSubject && String(a.subjectId) !== filterSubject) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (a.title || "").toLowerCase().includes(q) ||
          (a.class?.className || "").toLowerCase().includes(q) ||
          (a.subject?.subjectName || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [assignments, filterClass, filterSubject, search]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      if (filterClass && String(s.assignment?.classId) !== filterClass) return false;
      if (filterSubject && String(s.assignment?.subjectId) !== filterSubject) return false;
      if (search) {
        const q = search.toLowerCase();
        const studentName = `${s.student?.firstName || ""} ${s.student?.lastName || ""}`.toLowerCase();
        return (
          studentName.includes(q) ||
          (s.assignment?.title || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [submissions, filterClass, filterSubject, search]);

  const filteredCorrections = useMemo(() => {
    return filteredSubmissions.filter(s => !s.isGraded);
  }, [filteredSubmissions]);

  // ─── General KPIs ───
  const kpis = useMemo(() => {
    const active = assignments.filter(a => a.status === "Active").length;
    const totalSub = submissions.length;
    const pendingGrading = submissions.filter(s => !s.isGraded).length;

    // Submissions past due date
    const late = submissions.filter(s => {
      if (!s.assignment?.dueDate) return false;
      return new Date(s.submittedAt) > new Date(s.assignment.dueDate);
    }).length;

    // Average score calculation
    const graded = submissions.filter(s => s.isGraded && s.score != null);
    const sum = graded.reduce((acc, curr) => acc + curr.score, 0);
    const avg = graded.length ? Math.round((sum / graded.length) * 10) / 10 : 0;

    return { active, totalSub, late, pendingGrading, avg };
  }, [assignments, submissions]);

  // Pagination helper
  const activeListLength = activeTab === "devoirs" ? filteredAssignments.length : activeTab === "soumissions" ? filteredSubmissions.length : filteredCorrections.length;
  const totalPages = Math.max(1, Math.ceil(activeListLength / PAGE_SIZE));

  const openView = (row: any) => {
    setSelectedRow(row);
    setModal("view_devoir");
  };

  // ─── Form Actions ───
  const handleCreateDevoir = () => {
    if (!devoirForm.title || !devoirForm.classId || !devoirForm.subjectId) {
      setFormError("Veuillez remplir tous les champs obligatoires (*).");
      return;
    }
    setFormError("");
    startTransition(async () => {
      const res = await saveAssignment({
        ...devoirForm,
        dueDate: new Date(devoirForm.dueDate)
      });
      if (res.success) {
        toast.success("Devoir créé avec succès !");
        // Reload list directly
        window.location.reload();
      } else {
        setFormError(res.error || "Erreur de sauvegarde.");
      }
    });
  };

  const handleCreateSoumission = () => {
    if (!soumissionForm.assignmentId || !soumissionForm.studentId) {
      setFormError("Veuillez choisir un devoir et un élève.");
      return;
    }
    setFormError("");
    startTransition(async () => {
      const res = await saveSubmission(soumissionForm);
      if (res.success) {
        toast.success("Réponse déposée avec succès !");
        window.location.reload();
      } else {
        setFormError(res.error || "Erreur de dépôt.");
      }
    });
  };

  const handleGradeSubmission = () => {
    if (correctionForm.score == null || correctionForm.score < 0) {
      setFormError("La note doit être positive ou nulle.");
      return;
    }
    setFormError("");
    startTransition(async () => {
      const res = await gradeSubmission(selectedRow.id, correctionForm.score, correctionForm.comment);
      if (res.success) {
        toast.success("Copie notée et corrigée !");
        window.location.reload();
      } else {
        setFormError(res.error || "Erreur lors de la notation.");
      }
    });
  };

  const handleDeleteDevoir = (id: number) => {
    if (!confirm("Voulez-vous supprimer ce devoir ?")) return;
    startTransition(async () => {
      const res = await deleteAssignment(id);
      if (res.success) {
        setAssignments(prev => prev.filter(a => a.id !== id));
        toast.success("Devoir supprimé.");
      }
    });
  };

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = "";

    if (activeTab === "devoirs") {
      headers = ["N°", "Titre", "Classe", "Matière", "Date limite", "Barème", "Statut"];
      rows = filteredAssignments.map((a, i) => [
        i + 1, a.title, a.class?.className || "—", a.subject?.subjectName || "—",
        a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "—", a.maxScore, a.status
      ]);
      filename = "liste_devoirs.csv";
    } else {
      headers = ["N°", "Élève", "Classe", "Devoir", "Date dépôt", "Statut", "Note", "Observation"];
      rows = filteredSubmissions.map((s, i) => [
        i + 1, `${s.student?.firstName || ""} ${s.student?.lastName || ""}`,
        s.assignment?.class?.className || "—", s.assignment?.title || "—",
        new Date(s.submittedAt).toLocaleDateString(), s.isGraded ? "Noté" : "En attente",
        s.score ?? "—", s.comment ?? "—"
      ]);
      filename = "liste_soumissions.csv";
    }

    const csv = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = encodeURI(csv);
    a.download = filename;
    a.click();
  };

  const KpiCard = ({ icon, label, value, color, sub }: any) => (
    <div className="bg-white dark:bg-[#131622] p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none flex items-center gap-4">
      <div className={`p-3.5 rounded-xl ${color} dark:bg-opacity-10 shrink-0`}>{icon}</div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 leading-none">{value}</p>
        {sub && <p className="text-xs text-slate-400 dark:text-slate-400 font-medium mt-1">{sub}</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#0A0C10] p-5 lg:p-7 space-y-6 text-slate-900 dark:text-white">

      {/* ─── HEADER ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none shrink-0">
            <ClipboardList size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-none">Devoirs & corrections</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-0.5">Suivi des travaux d'élèves, notations et bilans</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">
            <Printer size={14} /> Imprimer rapport
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">
            <Download size={14} /> Exporter listes
          </button>
          <button onClick={() => setModal("new_soumission")} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all shadow-sm">
            <Upload size={14} /> Déposer réponse
          </button>
          <button onClick={() => setModal("new_devoir")} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-black shadow-lg shadow-indigo-200 dark:shadow-none hover:opacity-90 transition-all">
            <Plus size={15} /> Créer devoir
          </button>
        </div>
      </div>

      {/* ─── KPIs ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard icon={<BookOpen size={18} className="text-blue-600 dark:text-blue-400" />} label="Devoirs actifs" value={kpis.active} color="bg-blue-50" sub="Travaux en cours" />
        <KpiCard icon={<CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />} label="Soumissions reçues" value={kpis.totalSub} color="bg-emerald-50" sub="Toutes copies confondues" />
        <KpiCard icon={<Clock size={18} className="text-rose-600 dark:text-rose-400" />} label="Soumissions en retard" value={kpis.late} color="bg-rose-50" sub="Après la date limite" />
        <KpiCard icon={<AlertCircle size={18} className="text-amber-600 dark:text-amber-400" />} label="Corrections en attente" value={kpis.pendingGrading} color="bg-amber-50" sub="Copies à noter" />
        <KpiCard icon={<Award size={18} className="text-violet-600 dark:text-violet-400" />} label="Moyenne générale" value={`${kpis.avg}/20`} color="bg-violet-50" sub="Sur l'ensemble des devoirs" />
      </div>

      {/* ─── TAB NAVIGATION & FILTERS ─── */}
      <div className="bg-white dark:bg-[#131622] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl w-fit">
            {[
              { id: "devoirs", label: "Devoirs", count: assignments.length },
              { id: "soumissions", label: "Soumissions", count: submissions.length },
              { id: "corrections", label: "Corrections", count: submissions.filter(s => !s.isGraded).length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setPage(1); }}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === tab.id
                    ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-semibold focus:outline-none w-48 focus:w-64 transition-all"
              />
            </div>
            <select value={filterClass} onChange={e => { setFilterClass(e.target.value); setPage(1); }} className={fSel}>
              <option value="">Classes (Toutes)</option>
              {classes.map((c: any) => <option key={c.id} value={c.id}>{c.className}</option>)}
            </select>
            <select value={filterSubject} onChange={e => { setFilterSubject(e.target.value); setPage(1); }} className={fSel}>
              <option value="">Matières (Toutes)</option>
              {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ─── DATA TABLE ─── */}
      <div className="bg-white dark:bg-[#131622] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === "devoirs" && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
                  {["N°", "Titre", "Classe", "Matière", "Date limite", "Barème", "Soumissions", "Statut", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {filteredAssignments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((a, idx) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors group">
                    <td className="px-4 py-3.5 font-black text-slate-400 dark:text-slate-500 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-white">{a.title}</td>
                    <td className="px-4 py-3.5 font-bold text-indigo-700 dark:text-indigo-400">{a.class?.className || "—"}</td>
                    <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">{a.subject?.subjectName || "—"}</td>
                    <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-xs">
                      {a.dueDate ? new Date(a.dueDate).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-4 py-3.5 font-black text-slate-600 dark:text-slate-300">/{a.maxScore}</td>
                    <td className="px-4 py-3.5 font-bold text-indigo-600 dark:text-indigo-400">{a.submissions?.length || 0} copies</td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${a.status === "Active" ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>
                        {a.status === "Active" ? "Actif" : "Fermé"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openView(a)} className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700" title="Voir"><Eye size={13} /></button>
                        <button onClick={() => handleDeleteDevoir(a.id)} className="p-1.5 rounded bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/30" title="Supprimer"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {(activeTab === "soumissions" || activeTab === "corrections") && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
                  {["N°", "Élève", "Classe", "Devoir", "Date dépôt", "Statut", "Note", "Observation", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {(activeTab === "soumissions" ? filteredSubmissions : filteredCorrections)
                  .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className="px-4 py-3.5 font-black text-slate-400 dark:text-slate-500 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-white">
                        {`${s.student?.firstName || ""} ${s.student?.lastName || ""}`}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-indigo-700 dark:text-indigo-400">{s.assignment?.class?.className || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">{s.assignment?.title || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-xs">
                        {new Date(s.submittedAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${s.isGraded ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"}`}>
                          {s.isGraded ? "Noté" : "En attente"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-black text-indigo-600 dark:text-indigo-400">
                        {s.score != null ? `${s.score}/${s.assignment?.maxScore || 20}` : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-xs max-w-[150px] truncate">{s.comment || "—"}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setSelectedRow(s); setCorrectionForm({ score: s.score || 15, comment: s.comment || "" }); setModal("correct"); }} className="p-1.5 rounded bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/30" title="Corriger / Noter"><Pencil size={13} /></button>
                          {s.fileReponsePath && (
                            <a href={s.fileReponsePath} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/30" title="Télécharger">
                              <Download size={13} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── MODAL: CREATE DEVOIR ─── */}
      {/* ─── MODAL: CREATE DEVOIR ─── */}
      {modal === "new_devoir" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0E1017] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto text-slate-900 dark:text-white">
            <div className="sticky top-0 bg-white dark:bg-[#0E1017] rounded-t-3xl p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between z-10">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ClipboardList size={18} className="text-violet-600 dark:text-violet-400" /> Créer un nouveau devoir
              </h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {formError && <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm font-semibold flex items-center gap-2"><AlertCircle size={15} />{formError}</div>}

              {/* Title */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Titre du Devoir *</label>
                <input type="text" placeholder="Ex: Devoir de Mathématiques - Algèbre" value={devoirForm.title} onChange={e => setDevoirForm(f => ({ ...f, title: e.target.value }))} className={fInp} />
              </div>

              {/* Class & Subject */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Classe *</label>
                  <select value={devoirForm.classId || ""} onChange={e => setDevoirForm(f => ({ ...f, classId: +e.target.value }))} className={fSel}>
                    <option value="">— Choisir la classe —</option>
                    {classes.map((c: any) => <option key={c.id} value={c.id}>{c.className}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Matière *</label>
                  <select value={devoirForm.subjectId || ""} onChange={e => setDevoirForm(f => ({ ...f, subjectId: +e.target.value }))} className={fSel}>
                    <option value="">— Choisir la matière —</option>
                    {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                  </select>
                </div>
              </div>

              {/* Due date & max score */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Date limite de dépôt *</label>
                  <input type="date" value={devoirForm.dueDate} onChange={e => setDevoirForm(f => ({ ...f, dueDate: e.target.value }))} className={fInp} />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Barème (Note max) *</label>
                  <input type="number" step="0.5" value={devoirForm.maxScore} onChange={e => setDevoirForm(f => ({ ...f, maxScore: +e.target.value }))} className={fInp} />
                </div>
              </div>

              {/* Sujet link */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Lien vers le sujet (PDF, Cloud...) ou fichier</label>
                <input type="text" placeholder="https://..." value={devoirForm.fileSujetPath} onChange={e => setDevoirForm(f => ({ ...f, fileSujetPath: e.target.value }))} className={fInp} />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Description / Consignes</label>
                <textarea rows={3} placeholder="Consignes de travail..." value={devoirForm.description} onChange={e => setDevoirForm(f => ({ ...f, description: e.target.value }))} className={fTxt} />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-[#0E1017] rounded-b-3xl p-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800">Annuler</button>
              <button onClick={handleCreateDevoir} disabled={isPending} className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold rounded-xl flex items-center gap-1.5 shadow shadow-indigo-100 dark:shadow-none">
                {isPending && <Loader2 size={14} className="animate-spin" />} Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: DEPOSER REPONSE ─── */}
      {modal === "new_soumission" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0E1017] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto text-slate-900 dark:text-white">
            <div className="sticky top-0 bg-white dark:bg-[#0E1017] rounded-t-3xl p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between z-10">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Upload size={18} className="text-indigo-600 dark:text-indigo-400" /> Déposer une réponse
              </h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {formError && <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm font-semibold flex items-center gap-2"><AlertCircle size={15} />{formError}</div>}

              {/* Assignment Select */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Devoir *</label>
                <select value={soumissionForm.assignmentId || ""} onChange={e => setSoumissionForm(f => ({ ...f, assignmentId: +e.target.value }))} className={fSel}>
                  <option value="">— Choisir le devoir —</option>
                  {assignments.map((a: any) => <option key={a.id} value={a.id}>{a.title} ({a.class?.className})</option>)}
                </select>
              </div>

              {/* Student Select */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Élève *</label>
                <select value={soumissionForm.studentId || ""} onChange={e => setSoumissionForm(f => ({ ...f, studentId: +e.target.value }))} className={fSel}>
                  <option value="">— Choisir l'élève —</option>
                  {students.map((s: any) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                </select>
              </div>

              {/* Response File URL */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Lien/URL de la réponse (Fichier cloud, Dropbox, Google Drive...)</label>
                <input type="text" placeholder="https://..." value={soumissionForm.fileReponsePath} onChange={e => setSoumissionForm(f => ({ ...f, fileReponsePath: e.target.value }))} className={fInp} />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-[#0E1017] rounded-b-3xl p-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800">Annuler</button>
              <button onClick={handleCreateSoumission} disabled={isPending} className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold rounded-xl flex items-center gap-1.5 shadow shadow-indigo-100 dark:shadow-none">
                {isPending && <Loader2 size={14} className="animate-spin" />} Déposer la copie
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: GRADE & CORRECT ─── */}
      {modal === "correct" && selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0E1017] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto text-slate-900 dark:text-white">
            <div className="sticky top-0 bg-white dark:bg-[#0E1017] rounded-t-3xl p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between z-10">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Award size={18} className="text-emerald-600 dark:text-emerald-400" /> Corriger la copie d'élève
              </h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {formError && <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm font-semibold flex items-center gap-2"><AlertCircle size={15} />{formError}</div>}

              {/* Student details */}
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-2 font-semibold text-slate-700 dark:text-slate-300">
                <div>Élève: <span className="text-slate-900 dark:text-white font-bold">{selectedRow.student?.firstName} {selectedRow.student?.lastName}</span></div>
                <div>Devoir: <span className="text-slate-900 dark:text-white font-bold">{selectedRow.assignment?.title}</span></div>
                {selectedRow.fileReponsePath && (
                  <div>Fichier réponse: <a href={selectedRow.fileReponsePath} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 underline font-bold">{selectedRow.fileReponsePath}</a></div>
                )}
              </div>

              {/* Grade */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Note attribuée (Note max: {selectedRow.assignment?.maxScore || 20}) *</label>
                <input type="number" step="0.25" min="0" max={selectedRow.assignment?.maxScore || 20} value={correctionForm.score} onChange={e => setCorrectionForm(f => ({ ...f, score: +e.target.value }))} className={fInp} />
              </div>

              {/* Observation */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Observation / Commentaire de correction</label>
                <textarea rows={3} placeholder="Remarques et axes d'amélioration..." value={correctionForm.comment} onChange={e => setCorrectionForm(f => ({ ...f, comment: e.target.value }))} className={fTxt} />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-[#0E1017] rounded-b-3xl p-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800">Annuler</button>
              <button onClick={handleGradeSubmission} disabled={isPending} className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold rounded-xl flex items-center gap-1.5 shadow shadow-emerald-100 dark:shadow-none">
                {isPending && <Loader2 size={14} className="animate-spin" />} Valider la note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: VIEW DEVOIR ─── */}
      {modal === "view_devoir" && selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0E1017] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-600 dark:text-indigo-400" /> Détails du devoir
              </h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"><X size={16} /></button>
            </div>
            <div className="space-y-3.5">
              {[
                { label: "Titre", val: selectedRow.title },
                { label: "Classe", val: selectedRow.class?.className },
                { label: "Matière", val: selectedRow.subject?.subjectName },
                { label: "Barème", val: `/${selectedRow.maxScore}` },
                { label: "Date limite", val: selectedRow.dueDate && new Date(selectedRow.dueDate).toLocaleDateString() },
                { label: "Sujet", val: selectedRow.fileSujetPath },
                { label: "Description", val: selectedRow.description }
              ].filter(f => f.val).map((f, i) => (
                <div key={i} className="flex border-b border-slate-50 dark:border-slate-800 py-2 text-xs">
                  <span className="w-28 text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">{f.label}</span>
                  <span className="flex-1 text-sm text-slate-800 dark:text-slate-200 font-semibold">{f.val}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-3">
              <button onClick={() => setModal(null)} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tailwind Styles ───
const fInp = "w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600";
const fSel = "rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-white px-3 py-2 focus:outline-none cursor-pointer";
const fTxt = "w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600 resize-none";
