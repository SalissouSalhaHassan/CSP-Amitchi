"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  Plus, Search, Filter, Download, Printer, FileText, Eye, Pencil, Check,
  Trash2, X, ChevronDown, BookOpen, Clock, AlertCircle, CheckCircle2,
  ClipboardList, Users, CalendarDays, BarChart3, FileBarChart2, XCircle,
  Loader2, ChevronLeft, ChevronRight as ChevronRightIcon, BookMarked, Star
} from "lucide-react";
import {
  createSeance, updateSeance, validerSeance, deleteSeance,
  type SeanceFormData,
} from "@/domains/pedagogie/actions/cahier-textes.actions";
import {
  canManageCahierTextes,
  canValidateCahierTextes,
  isReadOnlyPedagogie,
  getPedagogieRole
} from "@/domains/pedagogie/permissions";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Props {
  currentUser: any;
  initialSeances: any[];
  classes: any[];
  subjects: any[];
  employees: any[];
  timetableSlots?: any[];
  planifications?: any[];
}

const STATUT_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  "En attente": { label: "En attente", bg: "bg-amber-50",   text: "text-amber-700",   icon: <Clock size={11} /> },
  "Validé":     { label: "Validé",     bg: "bg-emerald-50", text: "text-emerald-700", icon: <CheckCircle2 size={11} /> },
  "Rejeté":     { label: "Rejeté",     bg: "bg-rose-50",    text: "text-rose-700",    icon: <XCircle size={11} /> },
};

const PAGE_SIZE = 15;

// ─── Component ─────────────────────────────────────────────────────────────────
export default function CahierTextesClient({
  currentUser, initialSeances, classes, subjects, employees,
  timetableSlots = [], planifications = []
}: Props) {
  const [seances,   setSeances]   = useState<any[]>(initialSeances);
  const [isPending, startTransition] = useTransition();

  const canManage = canManageCahierTextes(currentUser);
  const canValidate = canValidateCahierTextes(currentUser);
  const isReadOnly = isReadOnlyPedagogie(currentUser);
  const userRole = getPedagogieRole(currentUser);

  // ── Filters state ──────────────────────────────────────────────────────
  const [search,        setSearch]        = useState("");
  const [filterClass,   setFilterClass]   = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterEmp,     setFilterEmp]     = useState("");
  const [filterStatut,  setFilterStatut]  = useState("");
  const [filterFrom,    setFilterFrom]    = useState("");
  const [filterTo,      setFilterTo]      = useState("");
  const [showFilters,   setShowFilters]   = useState(false);
  const [page,          setPage]          = useState(1);

  // ── Modal state ────────────────────────────────────────────────────────
  const [modal,         setModal]         = useState<"new" | "edit" | "view" | null>(null);
  const [selectedRow,   setSelectedRow]   = useState<any | null>(null);
  const [formError,     setFormError]     = useState("");
  const [formSuccess,   setFormSuccess]   = useState("");

  // ── Form state ─────────────────────────────────────────────────────────
  const emptyForm: SeanceFormData = {
    classId: 0, subjectId: 0, employeeId: 0,
    sessionDate: new Date().toISOString().split("T")[0],
    heureDebut: "08:00", heureFin: "09:00",
    titreLecon: "", objectifs: "", contenuRealise: "",
    supportsUtilises: "", devoirDonne: "", observation: "",
    anneeScolaire: new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
  };
  const [form, setForm] = useState<SeanceFormData>(emptyForm);

  // ── Filtered & paginated seances ───────────────────────────────────────
  const filtered = useMemo(() => {
    return seances.filter(s => {
      if (filterClass   && String(s.classId)    !== filterClass)   return false;
      if (filterSubject && String(s.subjectId)  !== filterSubject) return false;
      if (filterEmp     && String(s.employeeId) !== filterEmp)     return false;
      if (filterStatut  && s.statut             !== filterStatut)  return false;
      if (filterFrom    && s.sessionDate        < filterFrom)      return false;
      if (filterTo      && s.sessionDate        > filterTo)        return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (s.titreLecon   || "").toLowerCase().includes(q) ||
          (s.class?.className  || "").toLowerCase().includes(q) ||
          (s.subject?.subjectName || "").toLowerCase().includes(q) ||
          (s.employee?.nom || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [seances, filterClass, filterSubject, filterEmp, filterStatut, filterFrom, filterTo, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── KPIs ────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => ({
    total:      seances.length,
    valides:    seances.filter(s => s.statut === "Validé").length,
    attente:    seances.filter(s => s.statut === "En attente").length,
    devoirs:    seances.filter(s => s.devoirDonne?.trim()).length,
    tauxRemplissage: seances.length
      ? Math.round((seances.filter(s => s.contenuRealise?.trim()).length / seances.length) * 100)
      : 0,
    retards: seances.filter(s => {
      if (!s.sessionDate) return false;
      const diff = (new Date().getTime() - new Date(s.sessionDate).getTime()) / 86400000;
      return diff > 3 && s.statut === "En attente";
    }).length,
  }), [seances]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const openNew = () => {
    setForm(emptyForm);
    setFormError("");
    setFormSuccess("");
    setSelectedRow(null);
    setModal("new");
  };

  const openEdit = (row: any) => {
    setForm({
      classId:          row.classId    || 0,
      subjectId:        row.subjectId  || 0,
      employeeId:       row.employeeId || 0,
      sessionDate:      row.sessionDate || "",
      heureDebut:       row.heureDebut || "",
      heureFin:         row.heureFin   || "",
      titreLecon:       row.titreLecon  || "",
      objectifs:        row.objectifs   || "",
      contenuRealise:   row.contenuRealise || "",
      supportsUtilises: row.supportsUtilises || "",
      devoirDonne:      row.devoirDonne || "",
      observation:      row.observation || "",
      anneeScolaire:    row.anneeScolaire || "",
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

  const handleSubmit = async () => {
    if (!form.classId || !form.subjectId || !form.employeeId || !form.titreLecon) {
      setFormError("Veuillez remplir tous les champs obligatoires (*) .");
      return;
    }
    setFormError("");
    startTransition(async () => {
      let res: any;
      if (modal === "new") {
        res = await createSeance(form);
        if (res.success) {
          setSeances(prev => [res.data, ...prev]);
          setFormSuccess("Séance enregistrée avec succès !");
          setTimeout(() => { setModal(null); setFormSuccess(""); }, 1200);
        } else {
          setFormError(res.error || "Erreur lors de l'enregistrement.");
        }
      } else if (modal === "edit" && selectedRow) {
        res = await updateSeance(selectedRow.id, form);
        if (res.success) {
          setSeances(prev => prev.map(s => s.id === selectedRow.id ? { ...s, ...form } : s));
          setFormSuccess("Séance mise à jour !");
          setTimeout(() => { setModal(null); setFormSuccess(""); }, 1200);
        } else {
          setFormError(res.error || "Erreur de mise à jour.");
        }
      }
    });
  };

  const handleValider = (row: any) => {
    startTransition(async () => {
      const res = await validerSeance(row.id, currentUser?.employeeId || 0);
      if (res.success) {
        setSeances(prev => prev.map(s => s.id === row.id ? { ...s, statut: "Validé" } : s));
      }
    });
  };

  const handleDelete = (row: any) => {
    if (!confirm(`Supprimer la séance "${row.titreLecon}" ?`)) return;
    startTransition(async () => {
      const res = await deleteSeance(row.id);
      if (res.success) setSeances(prev => prev.filter(s => s.id !== row.id));
    });
  };

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    const header = ["N°","Date","Classe","Matière","Enseignant","Heure début","Heure fin","Titre leçon","Devoir","Statut"];
    const rows = filtered.map((s, i) => [
      i + 1, s.sessionDate, s.class?.className, s.subject?.subjectName,
      s.employee?.nom, s.heureDebut, s.heureFin, s.titreLecon, s.devoirDonne, s.statut,
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v ?? ""}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csv);
    a.download = "cahier_textes.csv";
    a.click();
  };

  const resetFilters = () => {
    setFilterClass(""); setFilterSubject(""); setFilterEmp("");
    setFilterStatut(""); setFilterFrom(""); setFilterTo(""); setSearch("");
  };

  // ── KPI Card ───────────────────────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50/60 p-5 lg:p-7 space-y-6">

      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
            <BookMarked size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-none">Cahier de textes numérique</h1>
            <p className="text-slate-500 text-sm font-medium mt-0.5">Journal des séances par classe, matière et enseignant</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handlePrint}    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"><Printer size={14} /> Imprimer</button>
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"><Download size={14} /> Export CSV</button>
          {canManage && (
            <button onClick={openNew} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-black shadow-lg shadow-indigo-200 hover:opacity-90 transition-all">
              <Plus size={15} /> Nouvelle séance
            </button>
          )}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={<BookOpen    size={18} className="text-indigo-600" />}  label="Séances enregistrées" value={kpis.total}           color="bg-indigo-50" />
        <KpiCard icon={<CheckCircle2 size={18} className="text-emerald-600"/>} label="Séances validées"     value={kpis.valides}          color="bg-emerald-50" />
        <KpiCard icon={<Clock       size={18} className="text-amber-600"   />} label="En attente"          value={kpis.attente}          color="bg-amber-50" />
        <KpiCard icon={<ClipboardList size={18} className="text-blue-600"  />} label="Devoirs donnés"      value={kpis.devoirs}          color="bg-blue-50" />
        <KpiCard icon={<BarChart3   size={18} className="text-violet-600"  />} label="Taux remplissage"    value={`${kpis.tauxRemplissage}%`} color="bg-violet-50" />
        <KpiCard icon={<AlertCircle size={18} className="text-rose-600"    />} label="Retards de saisie"   value={kpis.retards}          color="bg-rose-50" sub="> 3 jours" />
      </div>

      {/* ── SEARCH & FILTERS ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text" placeholder="Rechercher une séance, leçon, classe..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <button onClick={() => setShowFilters(f => !f)} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${showFilters ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
            <Filter size={14} /> Filtres <ChevronDown size={12} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
          {(filterClass || filterSubject || filterEmp || filterStatut || filterFrom || filterTo) && (
            <button onClick={resetFilters} className="flex items-center gap-1 px-3 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100 transition-all">
              <X size={13} /> Réinitialiser
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-50">
            {[
              { label: "Classe",      value: filterClass,   set: setFilterClass,   opts: classes.map((c: any) => ({ v: String(c.id), l: c.className })) },
              { label: "Matière",     value: filterSubject, set: setFilterSubject, opts: subjects.map((s: any) => ({ v: String(s.id), l: s.subjectName })) },
              { label: "Enseignant",  value: filterEmp,     set: setFilterEmp,     opts: employees.map((e: any) => ({ v: String(e.id), l: e.nom })) },
              { label: "Statut",      value: filterStatut,  set: setFilterStatut,  opts: ["En attente","Validé","Rejeté"].map(s => ({ v: s, l: s })) },
            ].map(({ label, value, set, opts }) => (
              <div key={label}>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</label>
                <select value={value} onChange={e => { set(e.target.value); setPage(1); }} className="w-full rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="">Tous</option>
                  {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date début</label>
              <input type="date" value={filterFrom} onChange={e => { setFilterFrom(e.target.value); setPage(1); }} className="w-full rounded-xl border border-slate-200 bg-slate-50 text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date fin</label>
              <input type="date" value={filterTo} onChange={e => { setFilterTo(e.target.value); setPage(1); }} className="w-full rounded-xl border border-slate-200 bg-slate-50 text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
        )}
      </div>

      {/* ── TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{filtered.length} séance(s)</span>
          <span className="text-xs text-slate-400 font-medium">Page {page} / {totalPages}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                {["N°","Date","Classe","Matière","Enseignant","Début","Fin","Titre leçon","Devoir","Statut","Validé par","Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-14">
                    <BookOpen size={40} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-semibold">Aucune séance enregistrée</p>
                    <p className="text-slate-300 text-xs mt-1">Cliquez sur « Nouvelle séance » pour commencer</p>
                  </td>
                </tr>
              ) : paginated.map((s, i) => {
                const cfg = STATUT_CONFIG[s.statut] || STATUT_CONFIG["En attente"];
                return (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-4 py-3 font-black text-slate-400 text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">{s.sessionDate ? new Date(s.sessionDate).toLocaleDateString("fr-FR") : "—"}</td>
                    <td className="px-4 py-3 font-bold text-indigo-700 whitespace-nowrap">{s.class?.className || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap max-w-[120px] truncate">{s.subject?.subjectName || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{s.employee?.nom || "—"}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{s.heureDebut || "—"}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{s.heureFin || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800 max-w-[180px] truncate">{s.titreLecon}</td>
                    <td className="px-4 py-3 max-w-[120px] truncate text-slate-500 text-xs">
                      {s.devoirDonne ? <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 font-bold text-[10px]">✓ Oui</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black ${cfg.bg} ${cfg.text}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{s.validePar?.nom || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ActionBtn icon={<Eye size={13}/>}     title="Voir"       color="bg-slate-100 text-slate-600 hover:bg-slate-200"   onClick={() => openView(s)} />
                        {canManage && (userRole !== "enseignant" || s.employeeId === currentUser.employeeId) && s.statut !== "Validé" && (
                          <ActionBtn icon={<Pencil size={13}/>}  title="Modifier"   color="bg-indigo-50 text-indigo-600 hover:bg-indigo-100" onClick={() => openEdit(s)} />
                        )}
                        {canValidate && s.statut !== "Validé" && (
                          <ActionBtn icon={isPending ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>} title="Valider" color="bg-emerald-50 text-emerald-600 hover:bg-emerald-100" onClick={() => handleValider(s)} />
                        )}
                        <ActionBtn
                          icon={<Users size={13}/>}
                          title="Présences"
                          color="bg-amber-50 text-amber-600 hover:bg-amber-100"
                          onClick={() => window.location.href = `/dashboard/attendance?classId=${s.classId}&subjectId=${s.subjectId}&date=${s.sessionDate}`}
                        />
                        {s.devoirDonne && (
                          <ActionBtn
                            icon={<FileBarChart2 size={13}/>}
                            title="Devoirs LMS"
                            color="bg-sky-50 text-sky-600 hover:bg-sky-100"
                            onClick={() => window.location.href = `/dashboard/pedagogie/devoirs?classId=${s.classId}&subjectId=${s.subjectId}`}
                          />
                        )}
                        <ActionBtn icon={<Printer size={13}/>} title="Imprimer"   color="bg-violet-50 text-violet-600 hover:bg-violet-100" onClick={handlePrint} />
                        {canManage && (userRole !== "enseignant" || s.employeeId === currentUser.employeeId) && s.statut !== "Validé" && (
                          <ActionBtn icon={<Trash2 size={13}/>}  title="Supprimer"  color="bg-rose-50 text-rose-600 hover:bg-rose-100"       onClick={() => handleDelete(s)} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs font-black ${p === page ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>{p}</button>
              ))}
            </div>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold disabled:opacity-40 hover:bg-slate-50">
              Suivant <ChevronRightIcon size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ── MODAL: New / Edit ── */}
      {(modal === "new" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white rounded-t-3xl p-6 border-b border-slate-100 flex items-center justify-between z-10">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <BookMarked size={18} className="text-violet-600" />
                {modal === "new" ? "Nouvelle séance" : "Modifier la séance"}
              </h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {formError   && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-2"><AlertCircle size={15} />{formError}</div>}
              {formSuccess  && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={15} />{formSuccess}</div>}

              {/* Row 1 */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Classe *">
                  <select value={form.classId || ""} onChange={e => setForm(f => ({ ...f, classId: +e.target.value }))} className={fSel}>
                    <option value="">— Choisir —</option>
                    {classes.map((c: any) => <option key={c.id} value={c.id}>{c.className}</option>)}
                  </select>
                </FormField>
                <FormField label="Matière *">
                  <select value={form.subjectId || ""} onChange={e => setForm(f => ({ ...f, subjectId: +e.target.value }))} className={fSel}>
                    <option value="">— Choisir —</option>
                    {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                  </select>
                </FormField>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Enseignant *">
                  <select value={form.employeeId || ""} onChange={e => setForm(f => ({ ...f, employeeId: +e.target.value }))} className={fSel}>
                    <option value="">— Choisir —</option>
                    {employees.map((e: any) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                  </select>
                </FormField>
                <FormField label="Date *">
                  <input type="date" value={form.sessionDate} onChange={e => setForm(f => ({ ...f, sessionDate: e.target.value }))} className={fInp} />
                </FormField>
              </div>

              {/* Timetable Link */}
              {form.classId > 0 && (
                <div className="p-3 bg-violet-50/50 rounded-xl border border-violet-100/50 flex flex-col gap-2">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest">Créneaux de l'emploi du temps disponibles</label>
                  <div className="flex flex-wrap gap-1.5">
                    {timetableSlots
                      .filter((slot: any) => slot.classId === form.classId && (!form.employeeId || slot.employeeId === form.employeeId))
                      .map((slot: any) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => {
                            if (slot.subjectId) {
                              setForm(f => ({
                                ...f,
                                subjectId: slot.subjectId,
                                heureDebut: slot.periodNumber === 1 ? "08:00" : slot.periodNumber === 2 ? "09:00" : slot.periodNumber === 3 ? "10:00" : slot.periodNumber === 4 ? "11:00" : "14:00",
                                heureFin: slot.periodNumber === 1 ? "09:00" : slot.periodNumber === 2 ? "10:00" : slot.periodNumber === 3 ? "11:00" : slot.periodNumber === 4 ? "12:00" : "15:00",
                              }));
                              toast.info(`Créneau associé : Période ${slot.periodNumber} (${slot.dayName})`);
                            }
                          }}
                          className="px-2 py-1 rounded bg-white border border-slate-200 text-[10px] font-bold text-slate-600 hover:border-violet-300 hover:bg-violet-50 transition-all"
                        >
                          {slot.dayName} - Période {slot.periodNumber} ({slot.subject?.subjectName || "Matière"})
                        </button>
                      ))}
                    {timetableSlots.filter((slot: any) => slot.classId === form.classId).length === 0 && (
                      <span className="text-[10px] text-slate-400 font-medium">Aucun créneau configuré pour cette classe.</span>
                    )}
                  </div>
                </div>
              )}

              {/* Row 3 — Hours */}
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Heure début">
                  <input type="time" value={form.heureDebut || ""} onChange={e => setForm(f => ({ ...f, heureDebut: e.target.value }))} className={fInp} />
                </FormField>
                <FormField label="Heure fin">
                  <input type="time" value={form.heureFin || ""} onChange={e => setForm(f => ({ ...f, heureFin: e.target.value }))} className={fInp} />
                </FormField>
                <FormField label="Année scolaire">
                  <input type="text" placeholder="2024-2025" value={form.anneeScolaire || ""} onChange={e => setForm(f => ({ ...f, anneeScolaire: e.target.value }))} className={fInp} />
                </FormField>
              </div>

              {/* Titre & Progression Link */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Titre de la leçon *</label>
                  {form.classId > 0 && form.subjectId > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-medium">Charger depuis la planification :</span>
                      <select
                        onChange={e => {
                          const val = e.target.value;
                          if (val) {
                            const selectedPlan = planifications.find((p: any) => String(p.id) === val);
                            if (selectedPlan) {
                              setForm(f => ({
                                ...f,
                                titreLecon: selectedPlan.leconPrevue,
                                objectifs: selectedPlan.competenceVisee || "",
                              }));
                              toast.success("Leçon et objectifs préremplis !");
                            }
                          }
                        }}
                        className="rounded bg-indigo-50 text-[10px] text-indigo-700 font-bold border-none px-2 py-0.5 focus:outline-none"
                      >
                        <option value="">— Choisir une leçon prévue —</option>
                        {planifications
                          .filter((p: any) => p.classId === form.classId && p.subjectId === form.subjectId)
                          .map((p: any) => (
                            <option key={p.id} value={p.id}>{p.chapitre} : {p.leconPrevue}</option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
                <input type="text" placeholder="Ex: Les fonctions linéaires" value={form.titreLecon} onChange={e => setForm(f => ({ ...f, titreLecon: e.target.value }))} className={fInp} />
              </div>

              {/* Objectifs */}
              <FormField label="Objectifs pédagogiques">
                <textarea rows={2} placeholder="Objectifs de la séance..." value={form.objectifs || ""} onChange={e => setForm(f => ({ ...f, objectifs: e.target.value }))} className={fTxt} />
              </FormField>

              {/* Contenu réalisé */}
              <FormField label="Contenu réalisé">
                <textarea rows={3} placeholder="Résumé du cours dispensé..." value={form.contenuRealise || ""} onChange={e => setForm(f => ({ ...f, contenuRealise: e.target.value }))} className={fTxt} />
              </FormField>

              {/* Supports & Devoir */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Supports utilisés">
                  <input type="text" placeholder="Tableau, vidéoprojecteur..." value={form.supportsUtilises || ""} onChange={e => setForm(f => ({ ...f, supportsUtilises: e.target.value }))} className={fInp} />
                </FormField>
                <FormField label="Devoir donné">
                  <input type="text" placeholder="Description du devoir..." value={form.devoirDonne || ""} onChange={e => setForm(f => ({ ...f, devoirDonne: e.target.value }))} className={fInp} />
                </FormField>
              </div>

              {/* Observation */}
              <FormField label="Observation">
                <textarea rows={2} placeholder="Remarques particulières..." value={form.observation || ""} onChange={e => setForm(f => ({ ...f, observation: e.target.value }))} className={fTxt} />
              </FormField>
            </div>

            <div className="sticky bottom-0 bg-white rounded-b-3xl p-5 border-t border-slate-100 flex items-center justify-end gap-3">
              <button onClick={() => setModal(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-bold hover:bg-slate-50">Annuler</button>
              <button onClick={handleSubmit} disabled={isPending} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-black shadow-lg shadow-indigo-200 hover:opacity-90 disabled:opacity-60 flex items-center gap-2">
                {isPending && <Loader2 size={14} className="animate-spin" />}
                {modal === "new" ? "Enregistrer" : "Mettre à jour"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: View ── */}
      {modal === "view" && selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Eye size={18} className="text-indigo-500" /> Détail de la séance
              </h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { l: "Classe",           v: selectedRow.class?.className },
                { l: "Matière",          v: selectedRow.subject?.subjectName },
                { l: "Enseignant",       v: selectedRow.employee?.nom },
                { l: "Date",             v: selectedRow.sessionDate && new Date(selectedRow.sessionDate).toLocaleDateString("fr-FR") },
                { l: "Horaire",          v: `${selectedRow.heureDebut || "—"} → ${selectedRow.heureFin || "—"}` },
                { l: "Titre leçon",      v: selectedRow.titreLecon },
                { l: "Objectifs",        v: selectedRow.objectifs },
                { l: "Contenu réalisé",  v: selectedRow.contenuRealise },
                { l: "Supports",         v: selectedRow.supportsUtilises },
                { l: "Devoir donné",     v: selectedRow.devoirDonne },
                { l: "Observation",      v: selectedRow.observation },
                { l: "Statut",           v: selectedRow.statut },
                { l: "Validé par",       v: selectedRow.validePar?.nom },
              ].filter(f => f.v).map(({ l, v }) => (
                <div key={l} className="flex gap-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-28 shrink-0 pt-0.5">{l}</span>
                  <span className="text-sm font-semibold text-slate-800 flex-1">{v}</span>
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end">
              <button onClick={() => setModal(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Micro helpers ─────────────────────────────────────────────────────────────
const fInp = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30";
const fSel = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 appearance-none cursor-pointer";
const fTxt = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none";

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

function ActionBtn({ icon, title, color, onClick }: { icon: React.ReactNode; title: string; color: string; onClick: () => void }) {
  return (
    <button title={title} onClick={onClick} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${color}`}>
      {icon}
    </button>
  );
}
