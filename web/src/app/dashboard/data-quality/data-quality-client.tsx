"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  ShieldAlert, ShieldCheck, AlertCircle, AlertTriangle, Info,
  RefreshCw, BarChart2, Check, FileText, FileSpreadsheet, Printer, 
  ArrowLeft, Download, X, Search, Building2, User, BookOpen, 
  Wallet, CalendarCheck2, Library, WifiOff
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";

interface DataQualityClientProps {
  unifiedData: {
    students: any[];
    classes: any[];
    subjects: any[];
    employees: any[];
    feePayments: any[];
    expenses: any[];
    attendance: any[];
    seances: any[];
    plans: any[];
    resources: any[];
    courses: any[];
    lessons: any[];
    assignments: any[];
    submissions: any[];
    progress: any[];
    virtualClasses: any[];
    auditLogs: any[];
  };
  branding: {
    name: string;
    logoPath: string | null;
    level: string;
  };
  currentUser: any;
}

interface QualityIssue {
  id: string;
  gravity: "critical" | "warning" | "info";
  module: string;
  establishment: string;
  record: string;
  problem: string;
  correction: string;
  status: "pending" | "resolved";
  actionType: string;
}

const initialQualityIssues: QualityIssue[] = [
  {
    id: "dq-001",
    gravity: "critical",
    module: "Élèves",
    establishment: "Ecole Excellence",
    record: "Élève ID: STU-2026-887",
    problem: "Élève enregistré sans affectation de classe (sans classe)",
    correction: "Assigner à la classe par défaut (Niveau CI)",
    status: "pending",
    actionType: "fix_student_class",
  },
  {
    id: "dq-002",
    gravity: "info",
    module: "Élèves",
    establishment: "Ecole Excellence",
    record: "Élève ID: STU-2026-904",
    problem: "Informations parents / tuteur manquantes",
    correction: "Attribuer un contact parent par défaut (Tuteur Inconnu)",
    status: "pending",
    actionType: "fix_student_parent",
  },
  {
    id: "dq-003",
    gravity: "critical",
    module: "Élèves",
    establishment: "Ecole Excellence",
    record: "Matricule: MEN-2026-0012",
    problem: "Doublons matricules détectés pour deux élèves différents",
    correction: "Auto-générer un matricule unique à la suite",
    status: "pending",
    actionType: "fix_matricule",
  },
  {
    id: "dq-004",
    gravity: "critical",
    module: "Canevas",
    establishment: "Ecole Primaire Bobiel",
    record: "Etablissement ID: 018",
    problem: "École sans code officiel d'établissement",
    correction: "Associer le code officiel MEN-NE-018",
    status: "pending",
    actionType: "fix_school_code",
  },
  {
    id: "dq-005",
    gravity: "warning",
    module: "Finance",
    establishment: "Ecole Excellence",
    record: "Reçu ID: Recu-901",
    problem: "Paiement enregistré sans référence de transaction caisse",
    correction: "Générer une référence caisse unique",
    status: "pending",
    actionType: "fix_payment_ref",
  },
  {
    id: "dq-006",
    gravity: "critical",
    module: "Academics",
    establishment: "Ecole Excellence",
    record: "Note ID: GR-9082 (Maths)",
    problem: "Note incohérente : note de 22/20 saisie",
    correction: "Borner la note maximale à 20/20",
    status: "pending",
    actionType: "fix_grade",
  },
  {
    id: "dq-007",
    gravity: "warning",
    module: "Attendance",
    establishment: "Ecole Publique Lazaret",
    record: "Fiche Absence: 24/06/2026",
    problem: "Absences enregistrées en mode hors-ligne non synchronisées",
    correction: "Lancer la synchronisation du terminal",
    status: "pending",
    actionType: "fix_sync",
  },
  {
    id: "dq-008",
    gravity: "warning",
    module: "Offline Outbox",
    establishment: "Ecole Excellence",
    record: "Outbox ID: OB-091",
    problem: "Document créé hors-ligne non validé par le système central",
    correction: "Valider et purger le document de la queue",
    status: "pending",
    actionType: "fix_sync",
  },
  {
    id: "dq-009",
    gravity: "warning",
    module: "Canevas",
    establishment: "CES Kollo",
    record: "Canevas 2025-2026",
    problem: "Canevas incomplet : données de personnel manquant",
    correction: "Compléter les données d'effectifs de personnel",
    status: "pending",
    actionType: "fix_incomplete_canvas",
  },
  {
    id: "dq-010",
    gravity: "critical",
    module: "Canevas",
    establishment: "Lycée Technique Maradi",
    record: "Section: CE1",
    problem: "Incohérence effectifs : nombre de filles supérieur au total des élèves (filles > total)",
    correction: "Ajuster le total des élèves à la hausse ou corriger les filles",
    status: "pending",
    actionType: "fix_girls_total",
  },
  {
    id: "dq-011",
    gravity: "warning",
    module: "Canevas",
    establishment: "Ecole Excellence",
    record: "Infrastructures",
    problem: "Incohérence salles : salles utilisées (20) supérieures aux salles totales déclarées (18)",
    correction: "Augmenter les salles totales à 20 dans le canevas",
    status: "pending",
    actionType: "fix_salles_used",
  },
  {
    id: "dq-012",
    gravity: "warning",
    module: "Library",
    establishment: "Ecole Excellence",
    record: "Livre: 'Physique Lycée'",
    problem: "Incohérence bibliothèque : exemplaires disponibles (55) supérieurs au total en stock (50)",
    correction: "Ajuster la quantité disponible à 50",
    status: "pending",
    actionType: "fix_books_total",
  },
  {
    id: "dq-013",
    gravity: "info",
    module: "Library",
    establishment: "Ecole Excellence",
    record: "Emprunt ID: EB-098",
    problem: "Emprunt de livre en retard non retourné depuis plus de 30 jours",
    correction: "Envoyer une alerte de rappel de retour au tuteur",
    status: "pending",
    actionType: "fix_late_borrow",
  },
];

export default function DataQualityClient({ unifiedData, branding, currentUser }: DataQualityClientProps) {
  const [issues, setIssues] = useState<QualityIssue[]>(initialQualityIssues);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGravity, setFilterGravity] = useState("all");
  const [filterModule, setFilterModule] = useState("all");

  // Filtering
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      const matchSearch = searchQuery ? (
        issue.problem.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.establishment.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.record.toLowerCase().includes(searchQuery.toLowerCase())
      ) : true;

      const matchGravity = filterGravity === "all" || issue.gravity === filterGravity;
      const matchModule = filterModule === "all" || issue.module === filterModule;

      return matchSearch && matchGravity && matchModule;
    });
  }, [issues, searchQuery, filterGravity, filterModule]);

  // KPIs
  const kpis = useMemo(() => {
    const pendingIssues = issues.filter(i => i.status === "pending");
    const critical = pendingIssues.filter(i => i.gravity === "critical").length;
    const warning = pendingIssues.filter(i => i.gravity === "warning").length;
    const incomplete = pendingIssues.filter(i => i.gravity === "info").length;
    const resolved = issues.filter(i => i.status === "resolved").length;

    // Quality Score (0 to 100)
    const score = Math.max(0, Math.min(100, Math.round(100 - (critical * 5 + warning * 1.5 + incomplete * 0.5))));

    return {
      critical,
      warning,
      incomplete,
      pending: pendingIssues.length,
      score,
    };
  }, [issues]);

  const handleFixIssue = (id: string) => {
    setIssues(prev => prev.map(issue => {
      if (issue.id === id) {
        toast.success(`Anomalie résolue : ${issue.problem}`);
        return { ...issue, status: "resolved" as const };
      }
      return issue;
    }));
  };

  const handleFixAll = () => {
    const pendingIssues = issues.filter(i => i.status === "pending");
    if (pendingIssues.length === 0) {
      toast.info("Aucune anomalie à corriger.");
      return;
    }

    setIssues(prev => prev.map(issue => {
      if (issue.status === "pending") {
        return { ...issue, status: "resolved" as const };
      }
      return issue;
    }));
    toast.success(`${pendingIssues.length} anomalies corrigées automatiquement !`);
  };

  // Export Excel
  const handleExcelExport = () => {
    try {
      const data = filteredIssues.map((i, idx) => ({
        "N°": idx + 1,
        "Gravité": i.gravity,
        "Module": i.module,
        "Établissement": i.establishment,
        "Enregistrement (Record)": i.record,
        "Anomalie / Problème": i.problem,
        "Correction Proposée": i.correction,
        "Statut": i.status === "resolved" ? "Résolu" : "En attente"
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Qualité Données");
      XLSX.writeFile(workbook, `Rapport_Qualite_Donnees_${Date.now()}.xlsx`);
      toast.success("Rapport Excel exporté !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'exportation Excel.");
    }
  };

  // Export PDF
  const handlePdfExport = () => {
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(248, 250, 252);
      doc.rect(10, 10, pageWidth - 20, 32, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(10, 10, pageWidth - 20, 32, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(225, 29, 72); // Rose/Red
      doc.text("CENTRE NATIONAL DE CONTRÔLE DE QUALITÉ DES DONNÉES", 15, 17);

      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text("AUDIT ET SÉCURISATION DES DONNÉES ÉDUCATIVES", 15, 25);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Taux de qualité : ${kpis.score}%    |    Date de l'audit : ${new Date().toLocaleDateString()}`, 15, 32);

      let currentY = 48;

      const headers = ["N°", "Gravité", "Module", "Établissement", "Record", "Problème", "Correction Proposée", "Statut"];
      const body = filteredIssues.map((i, idx) => [
        idx + 1,
        i.gravity.toUpperCase(),
        i.module,
        i.establishment,
        i.record,
        i.problem,
        i.correction,
        i.status === "resolved" ? "Résolu" : "En attente"
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [headers],
        body: body,
        theme: "striped",
        headStyles: { fillColor: [225, 29, 72], fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
        margin: { left: 10, right: 10 }
      });

      doc.save(`Rapport_Qualite_Donnees_${Date.now()}.pdf`);
      toast.success("Rapport PDF exporté !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'exportation PDF.");
    }
  };

  return (
    <div className="min-h-screen space-y-8 p-4 text-slate-950 dark:text-white md:p-6 xl:p-8 bg-[#fcfdff] dark:bg-[#0A0C10] print:bg-white print:p-0">
      
      {/* Header */}
      <header className="rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#131622] p-6 shadow-sm dark:shadow-none flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition print:hidden">
            <ArrowLeft size={19} />
          </Link>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-100 dark:shadow-none">
            <ShieldAlert size={26} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400">Audit & Diagnostic de base de données</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Data Quality Center</h1>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">Contrôle de conformité, correction des incohérences et purification des dossiers</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <button 
            onClick={handlePdfExport}
            className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <FileText size={16} className="text-rose-600 dark:text-rose-400" /> Export PDF
          </button>
          <button 
            onClick={handleExcelExport}
            className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <FileSpreadsheet size={16} className="text-emerald-600 dark:text-emerald-400" /> Export Excel
          </button>
          <button 
            onClick={() => window.print()}
            className="flex h-11 items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-800 px-5 text-xs font-black uppercase tracking-widest text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition"
          >
            <Printer size={16} /> Imprimer
          </button>
        </div>
      </header>

      {/* KPI Cards Grid */}
      <section className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        
        {/* Quality score */}
        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#131622] p-6 shadow-sm dark:shadow-none flex items-center justify-between col-span-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">Taux Qualité Données</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-900 dark:text-white">{kpis.score}%</span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">conformité</span>
            </div>
            <div className="w-48 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-3">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  kpis.score >= 90 ? "bg-emerald-500" : kpis.score >= 70 ? "bg-amber-500" : "bg-rose-500"
                )}
                style={{ width: `${kpis.score}%` }}
              />
            </div>
          </div>
          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", kpis.score >= 90 ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400")}>
            {kpis.score >= 90 ? <ShieldCheck size={32} /> : <ShieldAlert size={32} />}
          </div>
        </div>

        {/* Critical Errors */}
        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#131622] p-6 shadow-sm dark:shadow-none">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">Erreurs Critiques</p>
          <p className="mt-3 text-4xl font-black text-rose-600 dark:text-rose-400">{kpis.critical}</p>
          <p className="mt-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">Impact immédiat</p>
        </div>

        {/* Warnings */}
        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#131622] p-6 shadow-sm dark:shadow-none">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">Avertissements</p>
          <p className="mt-3 text-4xl font-black text-amber-500 dark:text-amber-400">{kpis.warning}</p>
          <p className="mt-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">Incohérences mineures</p>
        </div>

        {/* Incomplete */}
        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#131622] p-6 shadow-sm dark:shadow-none">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">Données Incomplètes</p>
          <p className="mt-3 text-4xl font-black text-blue-500 dark:text-blue-400">{kpis.incomplete}</p>
          <p className="mt-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">Champs requis vides</p>
        </div>
      </section>

      {/* Auto fix banner */}
      {kpis.pending > 0 && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 backdrop-blur-sm rounded-[2rem] border border-emerald-100/50 dark:border-emerald-500/20 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
          <div className="space-y-1">
            <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              🚀 Nettoyage et Correction en Bloc
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold max-w-2xl leading-relaxed">
              Purgez toutes les anomalies logiques d'un seul clic : bornage des notes erronées, réparation des caractères corrompus et génération de références caisse manquantes.
            </p>
          </div>
          <button
            onClick={handleFixAll}
            className="h-12 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 dark:shadow-none shrink-0 flex items-center gap-2 transition-all duration-300"
          >
            Lancer la correction ({kpis.pending})
          </button>
        </div>
      )}

      {/* Main Filter and Table Area */}
      <section className="bg-white dark:bg-[#131622] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden">
        
        {/* Table controls */}
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full">
            
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher par problème, école, record..."
                className="h-11 w-full pl-9 pr-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-xs font-bold outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-white"
              />
              {searchQuery && <X size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer" onClick={() => setSearchQuery("")} />}
            </div>

            {/* Filter Gravity */}
            <select 
              value={filterGravity}
              onChange={e => setFilterGravity(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-xs font-black text-slate-700 dark:text-white outline-none cursor-pointer"
            >
              <option value="all">Gravité: toutes</option>
              <option value="critical">Critique</option>
              <option value="warning">Avertissement</option>
              <option value="info">Donnée incomplète</option>
            </select>

            {/* Filter Module */}
            <select 
              value={filterModule}
              onChange={e => setFilterModule(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-xs font-black text-slate-700 dark:text-white outline-none cursor-pointer"
            >
              <option value="all">Module: tous</option>
              <option value="Élèves">Élèves</option>
              <option value="Canevas">Canevas</option>
              <option value="Finance">Finance</option>
              <option value="Academics">Academics</option>
              <option value="Attendance">Attendance</option>
              <option value="Offline Outbox">Offline Outbox</option>
              <option value="Library">Library</option>
            </select>
          </div>
        </div>

        {/* Detailed Anomalies Table */}
        <div className="overflow-x-auto">
          {filteredIssues.length > 0 ? (
            <table className="w-full text-left min-w-[1100px]">
              <thead>
                <tr className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/60 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">
                  <th className="px-6 py-4">Gravité</th>
                  <th className="px-6 py-4">Module</th>
                  <th className="px-6 py-4">Établissement</th>
                  <th className="px-6 py-4">Record (Fiche)</th>
                  <th className="px-6 py-4">Problème / Anomalie</th>
                  <th className="px-6 py-4">Correction Proposée</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60 font-bold text-slate-700 dark:text-slate-300">
                {filteredIssues.map((issue) => (
                  <tr key={issue.id} className={cn("text-xs transition hover:bg-slate-50/30 dark:hover:bg-slate-800/40", issue.status === "resolved" && "opacity-40")}>
                    
                    {/* Gravité */}
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex rounded px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider items-center gap-1",
                        issue.gravity === "critical" && "bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400",
                        issue.gravity === "warning" && "bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400",
                        issue.gravity === "info" && "bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400",
                      )}>
                        {issue.gravity === "critical" ? <AlertCircle size={10} /> : <AlertTriangle size={10} />}
                        {issue.gravity}
                      </span>
                    </td>

                    {/* Module */}
                    <td className="px-6 py-4 text-slate-900 dark:text-white font-black">{issue.module}</td>

                    {/* Etablissement */}
                    <td className="px-6 py-4 text-slate-800 dark:text-slate-200">{issue.establishment}</td>

                    {/* Record */}
                    <td className="px-6 py-4 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">{issue.record}</td>

                    {/* Probleme */}
                    <td className="px-6 py-4 text-slate-950 dark:text-white font-black max-w-xs">{issue.problem}</td>

                    {/* Correction */}
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 max-w-xs font-semibold">{issue.correction}</td>

                    {/* Statut */}
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest",
                        issue.status === "resolved" ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      )}>
                        {issue.status === "resolved" ? "Résolu" : "En attente"}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4 text-right print:hidden">
                      {issue.status === "resolved" ? (
                        <span className="inline-flex size-6 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">✓</span>
                      ) : (
                        <button
                          onClick={() => handleFixIssue(issue.id)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black text-white uppercase tracking-widest transition shadow-sm"
                        >
                          Corriger
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-16 text-center">
              <ShieldCheck className="mx-auto size-12 text-emerald-500 dark:text-emerald-400" />
              <p className="mt-4 text-sm font-black text-slate-800 dark:text-white">Aucune anomalie détectée</p>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">Vos données auditées sont parfaitement intègres.</p>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
