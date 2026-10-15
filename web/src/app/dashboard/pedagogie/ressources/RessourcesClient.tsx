"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  Plus, Search, Filter, Download, Printer, FileText, Eye, Pencil, Trash2, X,
  ChevronDown, BookOpen, Clock, AlertCircle, CheckCircle2, ClipboardList,
  CalendarDays, ChevronLeft, ChevronRight, BookMarked, FolderUp, Share2,
  FileCode, PlayCircle, Music, Monitor, Image as ImageIcon, Link2, ExternalLink,
  Table, Grid, Check, HelpCircle, Loader2, RotateCcw
} from "lucide-react";
import {
  createRessource, updateRessource, deleteRessource,
  type RessourceFormData
} from "@/domains/pedagogie/actions/ressources.actions";
import { toast } from "sonner";
import {
  canManageRessources,
  isReadOnlyPedagogie,
  getPedagogieRole
} from "@/domains/pedagogie/permissions";

interface Props {
  currentUser: any;
  initialResources: any[];
  classes: any[];
  subjects: any[];
  employees: any[];
}

const RESOURCE_TYPES = [
  "PDF", "Vidéo", "Audio", "Présentation", "Exercice", "Corrigé", "Lien externe", "Image"
];

const STATUT_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  "Publié":    { label: "Publié",    bg: "bg-emerald-50",  text: "text-emerald-700" },
  "Brouillon": { label: "Brouillon", bg: "bg-amber-50",    text: "text-amber-700" },
  "Archivé":   { label: "Archivé",   bg: "bg-slate-100",   text: "text-slate-600" },
};

const PAGE_SIZE = 12;

export default function RessourcesClient({
  currentUser, initialResources, classes, subjects, employees
}: Props) {
  const [resources, setResources] = useState<any[]>(initialResources);
  const [viewType, setViewType] = useState<"grid" | "table">("grid");
  const [isPending, startTransition] = useTransition();

  const canManage = canManageRessources(currentUser);
  const isReadOnly = isReadOnlyPedagogie(currentUser);
  const userRole = getPedagogieRole(currentUser);

  // ─── Filter State ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterEmp, setFilterEmp] = useState("");
  const [filterNiveau, setFilterNiveau] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  // ─── Modal State ───────────────────────────────────────────────────────────
  const [modal, setModal] = useState<"new" | "edit" | "view" | null>(null);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // ─── Form State ────────────────────────────────────────────────────────────
  const emptyForm: RessourceFormData = {
    title: "",
    type: "PDF",
    classId: 0,
    subjectId: 0,
    chapitre: "",
    lecon: "",
    fileUrl: "",
    externalUrl: "",
    employeeId: currentUser?.employeeId || 0,
    statut: "Publié",
  };
  const [form, setForm] = useState<RessourceFormData>(emptyForm);

  // ─── Filter Options ────────────────────────────────────────────────────────
  const uniqueNiveaux = useMemo(() => {
    const list = classes.map((c: any) => c.section?.educationalLevel).filter(Boolean);
    return Array.from(new Set(list));
  }, [classes]);

  // ─── Filter Logic ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (filterClass && String(r.classId) !== filterClass) return false;
      if (filterSubject && String(r.subjectId) !== filterSubject) return false;
      if (filterType && r.type !== filterType) return false;
      if (filterEmp && String(r.employeeId) !== filterEmp) return false;
      if (filterStatus && r.statut !== filterStatus) return false;
      if (filterDate && r.createdAt && !r.createdAt.startsWith(filterDate)) return false;

      if (filterNiveau) {
        const classObj = classes.find((c: any) => c.id === r.classId);
        if (classObj?.section?.educationalLevel !== filterNiveau) return false;
      }

      if (search) {
        const q = search.toLowerCase();
        return (
          (r.title || "").toLowerCase().includes(q) ||
          (r.chapitre || "").toLowerCase().includes(q) ||
          (r.lecon || "").toLowerCase().includes(q) ||
          (r.class?.className || "").toLowerCase().includes(q) ||
          (r.subject?.subjectName || "").toLowerCase().includes(q) ||
          (r.employee?.nom || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [resources, filterClass, filterSubject, filterType, filterEmp, filterStatus, filterDate, filterNiveau, search, classes]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ─── Action Handlers ───────────────────────────────────────────────────────
  const openNew = () => {
    setForm(emptyForm);
    setFormError("");
    setFormSuccess("");
    setSelectedRow(null);
    setModal("new");
  };

  const openEdit = (row: any) => {
    setForm({
      title: row.title || "",
      type: row.type || "PDF",
      classId: row.classId || 0,
      subjectId: row.subjectId || 0,
      chapitre: row.chapitre || "",
      lecon: row.lecon || "",
      fileUrl: row.fileUrl || "",
      externalUrl: row.externalUrl || "",
      employeeId: row.employeeId || currentUser?.employeeId || 0,
      statut: row.statut || "Publié",
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
    if (!form.title || !form.type) {
      setFormError("Le titre et le type de ressource sont obligatoires (*).");
      return;
    }
    setFormError("");
    startTransition(async () => {
      let res: any;
      if (modal === "new") {
        res = await createRessource(form);
        if (res.success) {
          setResources(prev => [res.data, ...prev]);
          setFormSuccess("Ressource ajoutée avec succès !");
          setTimeout(() => { setModal(null); setFormSuccess(""); }, 1200);
        } else {
          setFormError(res.error || "Erreur lors de l'ajout.");
        }
      } else if (modal === "edit" && selectedRow) {
        res = await updateRessource(selectedRow.id, form);
        if (res.success) {
          setResources(prev => prev.map(r => r.id === selectedRow.id ? { ...r, ...form } : r));
          setFormSuccess("Ressource mise à jour !");
          setTimeout(() => { setModal(null); setFormSuccess(""); }, 1200);
        } else {
          setFormError(res.error || "Erreur de mise à jour.");
        }
      }
    });
  };

  const handleDelete = (row: any) => {
    if (!confirm(`Voulez-vous supprimer cette ressource ?`)) return;
    startTransition(async () => {
      const res = await deleteRessource(row.id);
      if (res.success) {
        setResources(prev => prev.filter(r => r.id !== row.id));
        toast.success("Ressource supprimée avec succès.");
      }
    });
  };

  const handleShare = (row: any) => {
    const url = row.fileUrl || row.externalUrl || window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Lien copié dans le presse-papiers !");
  };

  const handlePrint = () => window.print();

  const handleExport = () => {
    const headers = ["N°", "Titre", "Type", "Classe", "Matière", "Chapitre", "Leçon", "Lien/Fichier", "Créé par"];
    const rows = filtered.map((r, i) => [
      i + 1,
      r.title,
      r.type,
      r.class?.className || "—",
      r.subject?.subjectName || "—",
      r.chapitre || "—",
      r.lecon || "—",
      r.fileUrl || r.externalUrl || "—",
      r.employee?.nom || "—"
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "banque_ressources.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setFilterClass("");
    setFilterSubject("");
    setFilterType("");
    setFilterEmp("");
    setFilterStatus("");
    setFilterNiveau("");
    setFilterDate("");
    setSearch("");
  };

  // Helper for resource icon and colors
  const getTypeMeta = (type: string) => {
    switch (type) {
      case "PDF":
        return { icon: <FileText size={18} />, color: "bg-rose-50 text-rose-600 border-rose-100" };
      case "Vidéo":
        return { icon: <PlayCircle size={18} />, color: "bg-violet-50 text-violet-600 border-violet-100" };
      case "Audio":
        return { icon: <Music size={18} />, color: "bg-cyan-50 text-cyan-600 border-cyan-100" };
      case "Présentation":
        return { icon: <Monitor size={18} />, color: "bg-blue-50 text-blue-600 border-blue-100" };
      case "Exercice":
        return { icon: <ClipboardList size={18} />, color: "bg-emerald-50 text-emerald-600 border-emerald-100" };
      case "Corrigé":
        return { icon: <CheckCircle2 size={18} />, color: "bg-teal-50 text-teal-600 border-teal-100" };
      case "Lien externe":
        return { icon: <Link2 size={18} />, color: "bg-amber-50 text-amber-600 border-amber-100" };
      case "Image":
        return { icon: <ImageIcon size={18} />, color: "bg-indigo-50 text-indigo-600 border-indigo-100" };
      default:
        return { icon: <FileCode size={18} />, color: "bg-slate-50 text-slate-600 border-slate-100" };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-5 lg:p-7 space-y-6">

      {/* ─── HEADER ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
            <BookMarked size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-none">Ressources pédagogiques</h1>
            <p className="text-slate-500 text-sm font-medium mt-0.5">Banque de fichiers de cours, vidéos et exercices</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm">
            <FolderUp size={14} /> Importer fichiers
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm">
            <Download size={14} /> Exporter
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm">
            <Printer size={14} /> Imprimer
          </button>
          {canManage && (
            <button onClick={openNew} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-black shadow-lg shadow-indigo-200 hover:opacity-90 transition-all">
              <Plus size={15} /> Ajouter ressource
            </button>
          )}
        </div>
      </div>

      {/* ─── CONTROLS: VIEW SWITCHER & SEARCH ─── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par titre, chapitre, leçon, classe..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* View switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewType("grid")}
                className={`p-2 rounded-lg transition-all ${viewType === "grid" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                title="Grille de cartes"
              >
                <Grid size={15} />
              </button>
              <button
                onClick={() => setViewType("table")}
                className={`p-2 rounded-lg transition-all ${viewType === "table" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                title="Tableau détaillé"
              >
                <Table size={15} />
              </button>
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

            {(filterClass || filterSubject || filterType || filterEmp || filterStatus || filterNiveau || filterDate) && (
              <button onClick={resetFilters} className="flex items-center gap-1 px-3 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100 transition-all">
                <RotateCcw size={13} /> Effacer
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-3 border-t border-slate-50">
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
            {/* Type */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Type</label>
              <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} className={fSel}>
                <option value="">Tous</option>
                {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {/* Enseignant */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Créé par</label>
              <select value={filterEmp} onChange={e => { setFilterEmp(e.target.value); setPage(1); }} className={fSel}>
                <option value="">Tous</option>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </div>
            {/* Statut */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Statut</label>
              <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className={fSel}>
                <option value="">Tous</option>
                {Object.keys(STATUT_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {/* Date creation */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</label>
              <input type="date" value={filterDate} onChange={e => { setFilterDate(e.target.value); setPage(1); }} className={fInp} />
            </div>
          </div>
        )}
      </div>

      {/* ─── GRID CARD VIEW ─── */}
      {viewType === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {paginated.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-slate-100 p-16 text-center shadow-sm">
              <BookOpen size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-semibold">Aucune ressource pédagogique disponible</p>
              <p className="text-slate-300 text-xs mt-1">Créez votre première fiche ou importez un document</p>
            </div>
          ) : paginated.map((r) => {
            const meta = getTypeMeta(r.type);
            const classObj = classes.find((c: any) => c.id === r.classId);
            return (
              <div key={r.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between group relative overflow-hidden">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black border uppercase ${meta.color}`}>
                      {meta.icon} {r.type}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${STATUT_CONFIG[r.statut]?.bg} ${STATUT_CONFIG[r.statut]?.text}`}>
                      {r.statut}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 leading-snug line-clamp-2" title={r.title}>{r.title}</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1.5">
                      {r.class?.className || "Toutes"} • {r.subject?.subjectName || "Toutes"}
                    </p>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500 font-semibold bg-slate-50/50 p-3 rounded-2xl">
                    {r.chapitre && <div className="truncate">Chapitre: <span className="text-slate-700 font-bold">{r.chapitre}</span></div>}
                    {r.lecon && <div className="truncate">Leçon: <span className="text-slate-700 font-bold">{r.lecon}</span></div>}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-4">
                  <span className="text-[10px] text-slate-400 font-bold truncate max-w-[100px]">Par {r.employee?.nom || "Système"}</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openView(r)} className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700" title="Détail"><Eye size={13} /></button>
                    {(r.fileUrl || r.externalUrl) && (
                      <a href={r.fileUrl || r.externalUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100" title="Télécharger/Ouvrir">
                        <Download size={13} />
                      </a>
                    )}
                    <button onClick={() => handleShare(r)} className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title="Partager"><Share2 size={13} /></button>
                    {canManage && (userRole !== "enseignant" || r.employeeId === currentUser?.employeeId) && (
                      <button onClick={() => openEdit(r)} className="p-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100" title="Modifier"><Pencil size={13} /></button>
                    )}
                    {canManage && (userRole !== "enseignant" || r.employeeId === currentUser?.employeeId) && (
                      <button onClick={() => handleDelete(r)} className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100" title="Supprimer"><Trash2 size={13} /></button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── DETAILED TABLE VIEW ─── */}
      {viewType === "table" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  {["N°", "Titre", "Type", "Niveau", "Classe", "Matière", "Chapitre", "Leçon", "Créé par", "Date création", "Statut", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-16 text-slate-400 font-bold">Aucune ressource ne correspond aux filtres</td>
                  </tr>
                ) : paginated.map((r, idx) => {
                  const meta = getTypeMeta(r.type);
                  const classObj = classes.find((c: any) => c.id === r.classId);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 py-3.5 font-black text-slate-400 text-xs">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-800 max-w-[150px] truncate">{r.title}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-bold border ${meta.color}`}>
                          {meta.icon} {r.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 font-medium">{classObj?.section?.educationalLevel || "—"}</td>
                      <td className="px-4 py-3.5 font-bold text-indigo-700 whitespace-nowrap">{r.class?.className || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-700 font-semibold whitespace-nowrap max-w-[120px] truncate">{r.subject?.subjectName || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-500 max-w-[120px] truncate">{r.chapitre || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-500 max-w-[120px] truncate">{r.lecon || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{r.employee?.nom || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${STATUT_CONFIG[r.statut]?.bg} ${STATUT_CONFIG[r.statut]?.text}`}>
                          {r.statut}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openView(r)} className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200" title="Voir"><Eye size={13} /></button>
                          {(r.fileUrl || r.externalUrl) && (
                            <a href={r.fileUrl || r.externalUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100" title="Télécharger"><Download size={13} /></a>
                          )}
                          <button onClick={() => handleShare(r)} className="p-1.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title="Partager"><Share2 size={13} /></button>
                          {canManage && (userRole !== "enseignant" || r.employeeId === currentUser?.employeeId) && (
                            <button onClick={() => openEdit(r)} className="p-1.5 rounded bg-amber-50 text-amber-600 hover:bg-amber-100" title="Modifier"><Pencil size={13} /></button>
                          )}
                          {canManage && (userRole !== "enseignant" || r.employeeId === currentUser?.employeeId) && (
                            <button onClick={() => handleDelete(r)} className="p-1.5 rounded bg-rose-50 text-rose-600 hover:bg-rose-100" title="Supprimer"><Trash2 size={13} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-50 bg-white rounded-2xl flex items-center justify-between shadow-sm">
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

      {/* ─── MODAL: ADD / EDIT ─── */}
      {(modal === "new" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white rounded-t-3xl p-6 border-b border-slate-100 flex items-center justify-between z-10">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <BookMarked size={18} className="text-violet-600" />
                {modal === "new" ? "Ajouter une ressource" : "Modifier ressource"}
              </h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {formError && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-2"><AlertCircle size={15} />{formError}</div>}
              {formSuccess && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={15} />{formSuccess}</div>}

              {/* Titre */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Titre *</label>
                <input type="text" placeholder="Ex: TP 1 - Électricité" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={fInp} />
              </div>

              {/* Row 1 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Type *</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={fSel}>
                    {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Statut</label>
                  <select value={form.statut || "Publié"} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))} className={fSel}>
                    {Object.keys(STATUT_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Classe / Niveau</label>
                  <select value={form.classId || ""} onChange={e => setForm(f => ({ ...f, classId: +e.target.value }))} className={fSel}>
                    <option value="">— Toutes les classes —</option>
                    {classes.map((c: any) => <option key={c.id} value={c.id}>{c.className}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Matière</label>
                  <select value={form.subjectId || ""} onChange={e => setForm(f => ({ ...f, subjectId: +e.target.value }))} className={fSel}>
                    <option value="">— Toutes les matières —</option>
                    {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Chapitre</label>
                  <input type="text" placeholder="Ex: Chapitre 4 - Optique" value={form.chapitre || ""} onChange={e => setForm(f => ({ ...f, chapitre: e.target.value }))} className={fInp} />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Leçon</label>
                  <input type="text" placeholder="Ex: Miroirs plans" value={form.lecon || ""} onChange={e => setForm(f => ({ ...f, lecon: e.target.value }))} className={fInp} />
                </div>
              </div>

              {/* File / Link fields */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">URL Fichier / Téléchargement</label>
                <input type="text" placeholder="https://..." value={form.fileUrl || ""} onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))} className={fInp} />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Lien Externe (Lien web, Vidéo YouTube...)</label>
                <input type="text" placeholder="https://youtube.com/..." value={form.externalUrl || ""} onChange={e => setForm(f => ({ ...f, externalUrl: e.target.value }))} className={fInp} />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white rounded-b-3xl p-5 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50">Annuler</button>
              <button onClick={handleSubmit} disabled={isPending} className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold rounded-xl shadow shadow-indigo-200 hover:opacity-90 transition-all flex items-center gap-1.5">
                {isPending && <Loader2 size={14} className="animate-spin" />}
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
                <BookOpen size={18} className="text-indigo-600" /> Détails ressource
              </h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                {[
                  { label: "Titre", val: selectedRow.title },
                  { label: "Type", val: selectedRow.type },
                  { label: "Classe", val: selectedRow.class?.className || "Toutes" },
                  { label: "Matière", val: selectedRow.subject?.subjectName || "Toutes" },
                  { label: "Chapitre", val: selectedRow.chapitre },
                  { label: "Leçon", val: selectedRow.lecon },
                  { label: "Fichier", val: selectedRow.fileUrl },
                  { label: "Lien externe", val: selectedRow.externalUrl },
                  { label: "Créé par", val: selectedRow.employee?.nom },
                  { label: "Date", val: selectedRow.createdAt && new Date(selectedRow.createdAt).toLocaleDateString("fr-FR") },
                  { label: "Statut", val: selectedRow.statut }
                ].filter(f => f.val).map((f, i) => (
                  <div key={i} className="flex border-b border-slate-50 py-2 text-xs">
                    <span className="w-28 text-[10px] font-black text-slate-400 uppercase tracking-widest">{f.label}</span>
                    <span className="flex-1 text-sm text-slate-800 font-semibold">{f.val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 gap-2">
              {(selectedRow.fileUrl || selectedRow.externalUrl) && (
                <a
                  href={selectedRow.fileUrl || selectedRow.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl flex items-center gap-1"
                >
                  <ExternalLink size={12} /> Ouvrir ressource
                </a>
              )}
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tailwind Styles ───
const fInp = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300";
const fSel = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer";
const fTxt = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none";
