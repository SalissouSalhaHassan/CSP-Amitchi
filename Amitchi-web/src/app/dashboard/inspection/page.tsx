"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  Filter,
  MapPin,
  MoreVertical,
  Plus,
  Printer,
  Search,
  Shield,
  Upload,
  Users,
  Trash2,
  X,
  Droplets,
  Lightbulb,
  Check,
  Info,
  FileText,
  FileSpreadsheet,
  Globe,
  Award,
  Activity,
  AlertTriangle,
  Clock,
  ShieldAlert,
  HelpCircle,
  FileCheck2,
  AlertCircle,
  FileQuestion,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { getSessions, getCanevasReferenceLists, getEducationalLevels } from "@/domains/academics/actions/academics.actions";
import { getMinistrySchoolsData } from "@/domains/ministry/actions/ministry.actions";

interface SchoolInspectionData {
  code: string;
  name: string;
  type: "Public" | "Privé";
  cycle: string;
  inspection: string;
  commune: string;
  eleves: number;
  enseignants: number;
  salles: number;
  eau: boolean;
  electricite: boolean;
  completion: number; // 0 to 100
  lastDeclaration: string; // YYYY-MM-DD
  successRate: number; // 0 to 100
  attendanceRate: number; // 0 to 100
  status: "Validé" | "En attente" | "Rejeté";
  rejectionReason?: string;
  needsCount: number;
}

const initialSchools: SchoolInspectionData[] = [
  {
    code: "ETB-2026-001",
    name: "Ecole Excellence",
    type: "Privé",
    cycle: "Primaire",
    inspection: "Niamey IV",
    commune: "Niamey IV",
    eleves: 642,
    enseignants: 24,
    salles: 18,
    eau: true,
    electricite: true,
    completion: 98,
    lastDeclaration: "2026-06-27",
    successRate: 88.5,
    attendanceRate: 95.2,
    status: "Validé",
    needsCount: 0,
  },
  {
    code: "ETB-2026-067",
    name: "Ecole Publique Lazaret B",
    type: "Public",
    cycle: "Primaire",
    inspection: "Niamey IV",
    commune: "Niamey IV",
    eleves: 350,
    enseignants: 12,
    salles: 8,
    eau: false,
    electricite: true,
    completion: 70,
    lastDeclaration: "2026-06-25",
    successRate: 59.8,
    attendanceRate: 85.0,
    status: "En attente",
    needsCount: 2,
  },
  {
    code: "ETB-2026-202",
    name: "Collège d'Enseignement Général CEG 14",
    type: "Public",
    cycle: "Collège",
    inspection: "Niamey IV",
    commune: "Niamey IV",
    eleves: 890,
    enseignants: 38,
    salles: 22,
    eau: true,
    electricite: false,
    completion: 65,
    lastDeclaration: "2026-06-24",
    successRate: 61.2,
    attendanceRate: 84.1,
    status: "En attente",
    needsCount: 1,
  },
  {
    code: "ETB-2026-104",
    name: "Lycée Excellence Yantala",
    type: "Privé",
    cycle: "Lycée",
    inspection: "Niamey IV",
    commune: "Niamey IV",
    eleves: 450,
    enseignants: 28,
    salles: 16,
    eau: true,
    electricite: true,
    completion: 100,
    lastDeclaration: "2026-06-26",
    successRate: 74.5,
    attendanceRate: 89.2,
    status: "Validé",
    needsCount: 0,
  },
  {
    code: "ETB-2026-521",
    name: "Complexe Scolaire Privé Al-Barka",
    type: "Privé",
    cycle: "Collège",
    inspection: "Niamey IV",
    commune: "Niamey IV",
    eleves: 310,
    enseignants: 15,
    salles: 10,
    eau: false,
    electricite: false,
    completion: 55,
    lastDeclaration: "2026-05-10", // Late
    successRate: 78.4,
    attendanceRate: 90.6,
    status: "Rejeté",
    rejectionReason: "Données d'infrastructure incohérentes. Veuillez vérifier les salles de classe.",
    needsCount: 3,
  },
  {
    code: "ETB-2026-613",
    name: "Ecole Maternelle Yantala",
    type: "Public",
    cycle: "Préscolaire",
    inspection: "Niamey IV",
    commune: "Niamey IV",
    eleves: 120,
    enseignants: 5,
    salles: 3,
    eau: false,
    electricite: true,
    completion: 50,
    lastDeclaration: "2026-06-28",
    successRate: 95.0,
    attendanceRate: 92.5,
    status: "En attente",
    needsCount: 1,
  },
];

export default function InspectionDashboardPage() {
  const [schools, setSchools] = useState<SchoolInspectionData[]>(initialSchools);
  const [schoolSessions, setSchoolSessions] = useState<any[]>([]);

  // Filter States
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedCommune, setSelectedCommune] = useState("all");
  const [selectedCycle, setSelectedCycle] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [selectedSchoolDetail, setSelectedSchoolDetail] = useState<SchoolInspectionData | null>(null);
  const [rejectingSchool, setRejectingSchool] = useState<SchoolInspectionData | null>(null);
  const [rejectionObservation, setRejectionObservation] = useState("");
  const [dynamicCycles, setDynamicCycles] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const [res, refsRes, levelsRes, schoolsRes] = await Promise.all([
          getSessions().catch(() => null),
          getCanevasReferenceLists().catch(() => null),
          getEducationalLevels(true).catch(() => null),
          getMinistrySchoolsData().catch(() => null),
        ]);
        const sessions = (res as any)?.data?.data || (res as any)?.data || [];
        if (cancelled) return;

        setSchoolSessions(sessions);
        const activeSession = sessions.find((session: any) => session.isActive) || sessions[0];
        setSelectedYear(activeSession?.sessionName || "2025-2026");

        const refCycles = (refsRes as any)?.data?.cycle || (refsRes as any)?.cycle || [];
        const eduLevels = (levelsRes as any)?.data || levelsRes || [];
        const combined = Array.from(new Set([
          "Préscolaire", "Primaire", "Collège", "Lycée", "Technique", "Supérieur",
          ...eduLevels.map((l: any) => l.levelName || l.name || l).filter(Boolean),
          ...refCycles.map((c: any) => c.value || c).filter(Boolean)
        ]));
        setDynamicCycles(combined);

        if (schoolsRes?.success && Array.isArray(schoolsRes.data) && schoolsRes.data.length > 0) {
          const mapped: SchoolInspectionData[] = schoolsRes.data.map((s: any) => ({
            code: s.code,
            name: s.name,
            type: s.type,
            cycle: s.cycle,
            inspection: s.inspection || "Niamey IV",
            commune: s.commune || s.inspection || "Niamey",
            eleves: s.eleves || 0,
            enseignants: s.enseignants || 0,
            salles: s.salles || 0,
            eau: !!s.eau,
            electricite: !!s.electricite,
            completion: s.completion || 0,
            lastDeclaration: s.lastDeclaration || new Date().toISOString().slice(0, 10),
            successRate: s.successRate || 0,
            attendanceRate: s.attendanceRate || 0,
            status: s.status === "Valide" ? "Validé" : "En attente",
            needsCount: (s.manqueEnseignants > 0 ? 1 : 0) + (s.manqueSalles > 0 ? 1 : 0) + (!s.eau ? 1 : 0) + (!s.electricite ? 1 : 0),
          }));
          setSchools(mapped);
        }
      } catch {
        if (!cancelled) {
          setSchoolSessions([]);
          setSelectedYear("2025-2026");
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const academicYearOptions = useMemo(() => {
    const realSessions = schoolSessions
      .map((session: any) => String(session.sessionName || "").trim())
      .filter(Boolean);
    const uniqueSessions = Array.from(new Set(realSessions));
    return uniqueSessions.length > 0 ? uniqueSessions : ["2025-2026", "2024-2025"];
  }, [schoolSessions]);

  const cyclesList = useMemo(() => {
    const defaults = ["Préscolaire", "Primaire", "Collège", "Lycée", "Technique", "Supérieur"];
    const schoolCycles = schools.map(s => s.cycle).filter(Boolean);
    return Array.from(new Set([...defaults, ...dynamicCycles, ...schoolCycles]));
  }, [dynamicCycles, schools]);

  // Late declaration date limit (older than June 1, 2026)
  const isDeclarationLate = (dateStr: string) => {
    return new Date(dateStr) < new Date("2026-06-01");
  };

  // Filtered list
  const filteredSchools = useMemo(() => {
    return schools.filter(s => {
      const matchSearch = searchQuery ? (
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.commune.toLowerCase().includes(searchQuery.toLowerCase())
      ) : true;

      const matchCommune = selectedCommune === "all" || s.commune === selectedCommune;
      const matchCycle = selectedCycle === "all" || s.cycle === selectedCycle;
      const matchType = selectedType === "all" || s.type === selectedType;
      const matchStatus = selectedStatus === "all" || s.status === selectedStatus;

      return matchSearch && matchCommune && matchCycle && matchType && matchStatus;
    });
  }, [schools, searchQuery, selectedCommune, selectedCycle, selectedType, selectedStatus]);

  // KPIs
  const kpis = useMemo(() => {
    const totalSchools = filteredSchools.length;
    let received = 0;
    let late = 0;
    let incomplete = 0;
    let infraAlerts = 0;
    let criticalNeeds = 0;

    filteredSchools.forEach(s => {
      if (s.status === "Validé" || s.status === "En attente") received++;
      if (isDeclarationLate(s.lastDeclaration)) late++;
      if (s.completion < 80) incomplete++;
      if (!s.eau || !s.electricite) infraAlerts++;
      criticalNeeds += s.needsCount;
    });

    return {
      totalSchools,
      received,
      late,
      incomplete,
      infraAlerts,
      criticalNeeds,
    };
  }, [filteredSchools]);

  // Actions handler
  const handleValidate = (code: string) => {
    setSchools(prev => prev.map(s => {
      if (s.code === code) {
        toast.success(`Les données de ${s.name} ont été validées.`);
        return { ...s, status: "Validé", completion: 100 };
      }
      return s;
    }));
  };

  const triggerRejectModal = (school: SchoolInspectionData) => {
    setRejectingSchool(school);
    setRejectionObservation("");
  };

  const handleRejectSubmit = () => {
    if (!rejectionObservation.trim()) {
      toast.error("Veuillez saisir une observation pour expliquer le rejet.");
      return;
    }

    if (rejectingSchool) {
      setSchools(prev => prev.map(s => {
        if (s.code === rejectingSchool.code) {
          toast.warning(`Déclaration de ${s.name} rejetée.`);
          return {
            ...s,
            status: "Rejeté",
            rejectionReason: rejectionObservation
          };
        }
        return s;
      }));
      setRejectingSchool(null);
    }
  };

  // Generate Report
  const handleGenerateReport = (school: SchoolInspectionData) => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(248, 250, 252);
      doc.rect(10, 10, 190, 30, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(10, 10, 190, 30, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(6, 182, 212); // Cyan accent
      doc.text(`INSPECTION DE L'ENSEIGNEMENT - ${school.inspection.toUpperCase()}`, 15, 17);

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`RAPPORT D'INSPECTION & DÉCLARATION : ${school.name.toUpperCase()}`, 15, 24);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Code Établissement : ${school.code}    |    Date : ${new Date().toLocaleDateString()}`, 15, 30);

      // Section 1: Stats
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("1. STATISTIQUES CONSOLIDÉES", 10, 48);
      doc.line(10, 50, 200, 50);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Type d'établissement : ${school.type}`, 15, 57);
      doc.text(`Cycle d'enseignement : ${school.cycle}`, 15, 62);
      doc.text(`Commune : ${school.commune}`, 15, 67);
      doc.text(`Effectifs élèves : ${school.eleves} élèves`, 15, 72);
      doc.text(`Personnel enseignant : ${school.enseignants} enseignants`, 15, 77);

      // Section 2: Infras
      doc.setFont("helvetica", "bold");
      doc.text("2. LOGISTIQUE & SERVICES ESSENTIELS", 10, 88);
      doc.line(10, 90, 200, 90);

      doc.setFont("helvetica", "normal");
      doc.text(`Accès eau potable : ${school.eau ? "FONCTIONNEL" : "ABSENT / À CORRIGER"}`, 15, 97);
      doc.text(`Accès électricité : ${school.electricite ? "FONCTIONNEL" : "ABSENT / À CORRIGER"}`, 15, 102);
      doc.text(`Salles de classe : ${school.salles} salles disponibles`, 15, 107);

      // Section 3: Validation status
      doc.setFont("helvetica", "bold");
      doc.text("3. STATUT DE VALIDATION DU CANEVAS", 10, 118);
      doc.line(10, 120, 200, 120);

      doc.setFont("helvetica", "normal");
      doc.text(`Statut actuel : ${school.status}`, 15, 127);
      doc.text(`Complétude des données : ${school.completion}%`, 15, 132);
      if (school.rejectionReason) {
        doc.setTextColor(225, 29, 72);
        doc.text(`Motif de rejet : ${school.rejectionReason}`, 15, 138);
      }

      doc.save(`Rapport_Inspection_${school.code}.pdf`);
      toast.success("Rapport d'inspection généré !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération du rapport PDF");
    }
  };

  // Export Excel
  const handleExcelExport = () => {
    try {
      const data = filteredSchools.map((s, idx) => ({
        "N°": idx + 1,
        "Code": s.code,
        "Nom": s.name,
        "Type": s.type,
        "Cycle": s.cycle,
        "Inspection": s.inspection,
        "Commune": s.commune,
        "Élèves": s.eleves,
        "Enseignants": s.enseignants,
        "Salles": s.salles,
        "Eau": s.eau ? "Oui" : "Non",
        "Électricité": s.electricite ? "Oui" : "Non",
        "Complétude (%)": s.completion,
        "Statut Validation": s.status,
        "Dernière Déclaration": s.lastDeclaration,
        "Besoins Critiques": s.needsCount,
        "Motif Rejet": s.rejectionReason || ""
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inspections");
      XLSX.writeFile(workbook, `Edut_Report_Inspection_${Date.now()}.xlsx`);
      toast.success("Rapport Excel exporté !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export Excel");
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
      doc.setTextColor(6, 182, 212); // Cyan accent
      doc.text("INSPECTION SCOLAIRE NATIONALE", 15, 17);
      doc.text("DASHBOARD CENTRAL DE SUIVI ET VALIDATION DES CANEVAS", 15, 22);

      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text("RAPPORT SYNTHÉTIQUE DES INSPECTIONS ET DÉCLARATIONS", 15, 30);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Année scolaire : ${selectedYear}    |    Date d'édition : ${new Date().toLocaleDateString()}`, 15, 36);

      let currentY = 48;

      const headers = ["N°", "Code", "Établissement", "Commune", "Type/Cycle", "Élèves", "Enseignants", "Eau", "Élec", "Complétude", "Statut"];
      const body = filteredSchools.map((s, idx) => [
        idx + 1,
        s.code,
        s.name,
        s.commune,
        `${s.type} / ${s.cycle}`,
        s.eleves,
        s.enseignants,
        s.eau ? "Oui" : "Non",
        s.electricite ? "Oui" : "Non",
        `${s.completion}%`,
        s.status
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [headers],
        body: body,
        theme: "striped",
        headStyles: { fillColor: [6, 182, 212], fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
        margin: { left: 10, right: 10 }
      });

      doc.save(`Rapport_Inspection_Central_${Date.now()}.pdf`);
      toast.success("Rapport PDF exporté !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export PDF");
    }
  };

  return (
    <div className="min-h-screen space-y-8 p-4 text-slate-950 md:p-6 xl:p-8 bg-[#fcfdff] print:bg-white print:p-0">
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
            padding: 0 !important;
            margin: 0 !important;
          }
          .print\\:hidden,
          nav,
          aside {
            display: none !important;
          }
          table {
            width: 100% !important;
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
        }
      `}</style>
      
      {/* Header */}
      <header className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition print:hidden">
            <ArrowLeft size={19} />
          </Link>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-lg shadow-cyan-100">
            <Shield size={26} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">Suivi & Validation canevas</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">B portal d'Inspection</h1>
            <p className="mt-1 text-xs font-bold text-slate-500">Mise à jour, vérification et certification des déclarations d'établissements</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <button 
            onClick={handlePdfExport}
            className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition"
          >
            <FileText size={16} className="text-cyan-600" /> PDF
          </button>
          <button 
            onClick={handleExcelExport}
            className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition"
          >
            <FileSpreadsheet size={16} className="text-emerald-600" /> Excel
          </button>
          <button 
            onClick={() => window.print()}
            className="flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-xs font-black uppercase tracking-widest text-white hover:bg-slate-800 transition"
          >
            <Printer size={16} /> Imprimer
          </button>
        </div>
      </header>

      {/* Filter panel */}
      <section className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 print:hidden">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Filter size={14} /> Filtres d'Inspection
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="space-y-1">
            <Label className="text-[9px] font-black text-slate-400">ANNÉE SCOLAIRE</Label>
            <select 
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-bold outline-none cursor-pointer"
            >
              {academicYearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] font-black text-slate-400">COMMUNE</Label>
            <select 
              value={selectedCommune}
              onChange={e => setSelectedCommune(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-bold outline-none cursor-pointer"
            >
              <option value="all">Toutes</option>
              <option value="Niamey IV">Niamey IV</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] font-black text-slate-400">CYCLE</Label>
            <select 
              value={selectedCycle}
              onChange={e => setSelectedCycle(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-bold outline-none cursor-pointer"
            >
              <option value="all">Tous</option>
              {cyclesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] font-black text-slate-400">TYPE ÉTABLISSEMENT</Label>
            <select 
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-bold outline-none cursor-pointer"
            >
              <option value="all">Tous</option>
              <option value="Public">Public</option>
              <option value="Privé">Privé</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] font-black text-slate-400">STATUT VALIDATION</Label>
            <select 
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-bold outline-none cursor-pointer"
            >
              <option value="all">Tous</option>
              <option value="En attente">En attente</option>
              <option value="Validé">Validé</option>
              <option value="Rejeté">Rejeté</option>
            </select>
          </div>
        </div>
      </section>

      {/* KPI Cards Grid */}
      <section className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Écoles Suivies", value: kpis.totalSchools, icon: Building2, color: "text-cyan-600", bg: "bg-cyan-50" },
          { label: "Canevas Reçus", value: kpis.received, icon: FileCheck2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Canevas En Retard", value: kpis.late, icon: Clock, color: kpis.late > 0 ? "text-rose-600" : "text-slate-400", bg: kpis.late > 0 ? "bg-rose-50" : "bg-slate-50" },
          { label: "Données Incomplètes", value: kpis.incomplete, icon: AlertTriangle, color: kpis.incomplete > 0 ? "text-amber-600" : "text-slate-400", bg: kpis.incomplete > 0 ? "bg-amber-50" : "bg-slate-50" },
          { label: "Alertes Infrastructure", value: kpis.infraAlerts, icon: ShieldAlert, color: kpis.infraAlerts > 0 ? "text-rose-600" : "text-slate-400", bg: kpis.infraAlerts > 0 ? "bg-rose-50" : "bg-slate-50" },
          { label: "Besoins Critiques", value: kpis.criticalNeeds, icon: AlertCircle, color: kpis.criticalNeeds > 0 ? "text-rose-600" : "text-slate-400", bg: kpis.criticalNeeds > 0 ? "bg-rose-50" : "bg-slate-50" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", item.bg, item.color)}>
                <Icon size={20} />
              </div>
              <p className="mt-4 text-[9px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{item.value}</p>
            </div>
          );
        })}
      </section>

      {/* Main Table area */}
      <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Header search controls */}
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 font-sans">Déclarations sous Inspection</h2>
            <p className="text-xs font-bold text-slate-400">Valider, rejeter ou exporter les canevas scolaires déclarés</p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, code..."
              className="h-10 w-full pl-9 pr-4 rounded-xl border border-slate-100 bg-slate-50/50 text-xs font-bold outline-none placeholder:text-slate-400 text-slate-800"
            />
            {searchQuery && <X size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer" onClick={() => setSearchQuery("")} />}
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredSchools.length > 0 ? (
            <table className="w-full text-left min-w-[1000px]">
              <thead>
                <tr className="border-b border-slate-50 bg-slate-50/40 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <th className="px-6 py-4">Établissement</th>
                  <th className="px-6 py-4">Type/Cycle</th>
                  <th className="px-6 py-4">Effectifs</th>
                  <th className="px-6 py-4">Réseaux & Eau</th>
                  <th className="px-6 py-4">Besoins Critiques</th>
                  <th className="px-6 py-4">Complétude</th>
                  <th className="px-6 py-4">Statut Validation</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredSchools.map((s) => (
                  <tr key={s.code} className="text-xs font-bold text-slate-600 hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <p className="font-black text-slate-900">{s.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{s.code} / {s.commune}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mr-1.5", s.type === "Public" ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700")}>
                        {s.type}
                      </span>
                      <span className="text-[10px] font-black text-slate-500">{s.cycle}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-950 font-black">{s.eleves} Élèves</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{s.enseignants} Enseignants / {s.salles} Salles</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full", s.eau ? "bg-blue-50 text-blue-600" : "bg-rose-50 text-rose-600")}>
                          <Droplets className="size-3" /> Eau
                        </span>
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full", s.electricite ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600")}>
                          <Lightbulb className="size-3" /> Elec
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("inline-flex rounded px-2.5 py-0.5 text-[10px] font-black", s.needsCount > 0 ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-400")}>
                        {s.needsCount} besoin{s.needsCount > 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${s.completion}%` }} />
                        </div>
                        <span className="text-[10px] font-black text-slate-900">{s.completion}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex rounded-full border px-3 py-0.5 text-[9px] font-black uppercase tracking-widest",
                        s.status === "Validé" && "border-emerald-100 bg-emerald-50 text-emerald-700",
                        s.status === "En attente" && "border-amber-100 bg-amber-50 text-amber-700",
                        s.status === "Rejeté" && "border-rose-100 bg-rose-50 text-rose-700",
                      )}>
                        {s.status}
                      </span>
                      {s.rejectionReason && (
                        <p className="text-[9px] text-rose-500 font-bold mt-1 max-w-[200px] truncate" title={s.rejectionReason}>
                          {s.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedSchoolDetail(s)}
                          className="p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition"
                          title="Voir Fiche"
                        >
                          <Eye className="size-4" />
                        </button>
                        
                        {s.status === "En attente" && (
                          <>
                            <button 
                              onClick={() => handleValidate(s.code)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-[10px] font-black text-white uppercase tracking-widest transition"
                              title="Valider"
                            >
                              Valider
                            </button>
                            <button 
                              onClick={() => triggerRejectModal(s)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-[10px] font-black text-white uppercase tracking-widest transition"
                              title="Rejeter"
                            >
                              Rejeter
                            </button>
                          </>
                        )}

                        <button 
                          onClick={() => handleGenerateReport(s)}
                          className="p-1.5 rounded-lg border border-slate-100 hover:bg-indigo-50 text-indigo-500 hover:text-indigo-600 transition"
                          title="Générer Rapport"
                        >
                          <FileText className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-16 text-center">
              <Building2 className="mx-auto size-12 text-slate-200" />
              <p className="mt-4 text-sm font-black text-slate-800">Aucun établissement sous tutelle d'inspection trouvé</p>
              <p className="text-xs text-slate-400 mt-1">Vérifiez les filtres de recherche.</p>
            </div>
          )}
        </div>
      </section>

      {/* School Details Modal */}
      {selectedSchoolDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] border border-slate-100 shadow-2xl p-8 space-y-6 animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                  <Building2 size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{selectedSchoolDetail.name}</h3>
                  <p className="text-xs font-bold text-slate-400">Code Établissement : {selectedSchoolDetail.code}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSchoolDetail(null)}
                className="h-9 w-9 rounded-full border border-slate-100 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-4 border-t border-slate-50 text-xs">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type / Cycle</p>
                <p className="font-bold text-slate-800">{selectedSchoolDetail.type} / {selectedSchoolDetail.cycle}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tutelle d'Inspection</p>
                <p className="font-bold text-slate-800">{selectedSchoolDetail.inspection} / {selectedSchoolDetail.commune}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Effectifs Élèves</p>
                <p className="font-bold text-slate-800">{selectedSchoolDetail.eleves} Élèves</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Équipe Enseignante</p>
                <p className="font-bold text-slate-800">{selectedSchoolDetail.enseignants} enseignants</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salles de classe</p>
                <p className="font-bold text-slate-800">{selectedSchoolDetail.salles} salles</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Réseaux Services</p>
                <p className="font-bold text-slate-800">Eau: {selectedSchoolDetail.eau ? "Fonctionnel" : "Absent"} | Élec: {selectedSchoolDetail.electricite ? "Fonctionnel" : "Absent"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Complétude du dossier</p>
                <p className="font-bold text-slate-800">{selectedSchoolDetail.completion}% complété</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance Scolaire</p>
                <span className="font-bold text-amber-600">{selectedSchoolDetail.successRate}% succès examens</span>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Présence moyenne</p>
                <span className="font-bold text-slate-800">{selectedSchoolDetail.attendanceRate}%</span>
              </div>
            </div>

            {selectedSchoolDetail.rejectionReason && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                <p className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Motif du dernier rejet</p>
                <p className="text-xs font-bold text-rose-800 mt-1">{selectedSchoolDetail.rejectionReason}</p>
              </div>
            )}

            <div className="pt-6 border-t border-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedSchoolDetail(null)}
                className="px-6 h-12 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-black uppercase tracking-widest transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingSchool && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] border border-slate-100 shadow-2xl p-8 space-y-6 animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Rejeter la Déclaration</h3>
                  <p className="text-xs font-bold text-slate-400">{rejectingSchool.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setRejectingSchool(null)}
                className="h-8 w-8 rounded-full border border-slate-100 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Observation / Motif du rejet</Label>
              <textarea
                value={rejectionObservation}
                onChange={e => setRejectionObservation(e.target.value)}
                placeholder="Exemple : Les effectifs déclarés ne correspondent pas au nombre d'enseignants. Veuillez vérifier vos données."
                rows={4}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-xs font-bold outline-none placeholder:text-slate-300 text-slate-800"
              />
            </div>

            <div className="pt-4 border-t border-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setRejectingSchool(null)}
                className="px-5 h-11 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest transition"
              >
                Annuler
              </button>
              <button 
                onClick={handleRejectSubmit}
                className="px-5 h-11 rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-xs font-black uppercase tracking-widest transition"
              >
                Rejeter
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
