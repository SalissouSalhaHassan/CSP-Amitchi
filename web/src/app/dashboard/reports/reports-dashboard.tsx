"use client";

import React, { useState, useEffect, useMemo, Component } from "react";
import { 
  Users, DollarSign, BookOpen, Calendar, ShieldCheck, 
  Download, Printer, Mail, Clock, Filter, Eye, RefreshCw,
  Search, ShieldAlert, Award, FileSpreadsheet, Building2,
  Droplets, Lightbulb, AlertTriangle, Layers, UserCheck, Activity,
  Globe, Library, FileText, TrendingDown, CheckCircle2,
  Sparkles, BrainCircuit, Bot, Copy, Check, X
} from "lucide-react";
import { toast } from "sonner";
import { localDb } from "@/infrastructure/local-db/dexie";
import dynamicImport from "next/dynamic";
import { Label } from "@/components/ui/label";
import { generateAIReportSummaryAction, getDropoutRiskAnalysisAction } from "@/domains/ai/actions/ai.actions";

const UniversalReport = dynamicImport(() => import("@/components/reporting/universal-report"), { 
  ssr: false,
  loading: () => (
    <div className="bg-white dark:bg-[#131622] rounded-[32px] border border-slate-100 dark:border-slate-800 p-12 text-center text-slate-400 dark:text-slate-500 space-y-3">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto" />
      <p className="text-xs font-bold">Chargement du moteur de rapport...</p>
    </div>
  )
});

// ─── Error Boundary ───
class DashboardErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("[ReportsDashboard] Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 min-h-[400px] flex flex-col items-center justify-center text-center bg-white dark:bg-[#131622] rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <ShieldAlert size={28} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Une erreur d'affichage est survenue</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
              {this.state.error?.message || "Impossible de calculer les synthèses pour ce module."}
            </p>
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); }}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
          >
            Réinitialiser le rapport
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface ReportsDashboardProps {
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
    grades?: any[];
    sessions?: any[];
    periods?: any[];
  };
  branding: {
    name: string;
    logoPath: string | null;
    level: string;
  };
  currentUser: any;
}

type ReportType = 
  | "students" 
  | "finances" 
  | "pedagogie" 
  | "presence" 
  | "rh" 
  | "lms" 
  | "library"
  | "canevas" 
  | "inspection"
  | "ministry"
  | "security";

function ReportsDashboardContent({ unifiedData: initialData, branding, currentUser }: ReportsDashboardProps) {
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [data, setData] = useState(initialData);
  const [activeReport, setActiveReport] = useState<ReportType>("students");

  // Dynamic Academic Years (Sessions) extracted from real database students
  const uniqueSessions = React.useMemo(() => {
    const dbSess = (data.sessions || []).map((s: any) => s?.sessionName).filter(Boolean);
    if (dbSess.length > 0) return Array.from(new Set(dbSess)).sort();

    const sess = Array.from(new Set((data.students || []).map((s: any) => s?.session).filter(Boolean))) as string[];
    return sess.length > 0 ? sess.sort() : ["2024-2025", "2025-2026", "2026-2027"];
  }, [data.sessions, data.students]);

  // General Filters States
  const [academicYear, setAcademicYear] = useState("2024-2025");
  const [period, setPeriod] = useState("All");
  const [selectedClassId, setSelectedClassId] = useState<string>("All");
  const [selectedLevel, setSelectedLevel] = useState<string>("All");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("All");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // New General Filters
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [selectedInspection, setSelectedInspection] = useState("All");
  const [selectedCommune, setSelectedCommune] = useState("All");
  const [selectedEstablishment, setSelectedEstablishment] = useState("All");

  // ─── AI GEMINI & PREDICTIVE DROPOUT STATES ───
  const [isAISummaryOpen, setIsAISummaryOpen] = useState(false);
  const [isGeneratingAISummary, setIsGeneratingAISummary] = useState(false);
  const [aiSummaryData, setAiSummaryData] = useState<any>(null);
  const [aiSummaryLang, setAiSummaryLang] = useState<"FR" | "AR">("FR");
  const [isCopied, setIsCopied] = useState(false);

  const [dropoutRiskData, setDropoutRiskData] = useState<any>(null);
  const [isLoadingRiskData, setIsLoadingRiskData] = useState(false);

  useEffect(() => {
    const loadRiskAnalysis = async () => {
      setIsLoadingRiskData(true);
      try {
        const res = await getDropoutRiskAnalysisAction();
        if (res && (res as any).data) {
          setDropoutRiskData((res as any).data);
        }
      } catch (err) {
        console.error("Failed to load AI risk data:", err);
      } finally {
        setIsLoadingRiskData(false);
      }
    };
    loadRiskAnalysis();
  }, []);
  const filteredPeriods = React.useMemo(() => {
    const allPeriods = data.periods || [];
    if (academicYear === "All") return allPeriods;
    
    // Find the session object
    const sessionObj = (data.sessions || []).find((s: any) => s?.sessionName === academicYear);
    if (!sessionObj) return allPeriods;
    
    return allPeriods.filter((p: any) => p && p.sessionId === sessionObj.id);
  }, [academicYear, data.periods, data.sessions]);

  // Find the selected period object from the database periods
  const selectedPeriodObj = React.useMemo(() => {
    if (period === "All") return null;
    return (data.periods || []).find((p: any) => p && String(p.id) === period);
  }, [period, data.periods]);

  // Get active period name for display
  const activePeriodName = React.useMemo(() => {
    if (period === "All") return "Année entière";
    if (selectedPeriodObj) return selectedPeriodObj.name;
    if (period === "T1") return "Trimestre 1";
    if (period === "T2") return "Trimestre 2";
    if (period === "T3") return "Trimestre 3";
    return period;
  }, [period, selectedPeriodObj]);

  // Available levels list
  const availableLevels = useMemo(() => {
    const studentLevels = (data.students || []).map((s: any) => s?.educationalLevel).filter(Boolean);
    const classLevels = (data.classes || []).map((c: any) => c?.section?.educationalLevel).filter(Boolean);
    const existingLevels = Array.from(new Set([...classLevels, ...studentLevels]));

    const userLevel = currentUser?.educationalLevel;
    const isRestricted = userLevel && !["tous", "all", "administration", "gestion scolaire", "administration generale", "administration générale"].includes(userLevel.toLowerCase());

    if (isRestricted) {
      if (existingLevels.length > 0) return existingLevels;
      return [userLevel];
    }

    const defaults = ["Préscolaire", "Maternelle", "Primaire", "Collège", "Lycée", "Licence", "Master", "Technique", "Supérieur"];
    return Array.from(new Set([...defaults, ...existingLevels]));
  }, [data.students, data.classes, currentUser]);

  // Export History State
  const [exportHistory, setExportHistory] = useState<any[]>([]);

  // Automatically default academicYear to the first available session in the database
  useEffect(() => {
    if (uniqueSessions.length > 0 && !uniqueSessions.includes(academicYear)) {
      setAcademicYear(uniqueSessions[0]);
    }
  }, [uniqueSessions]);

  useEffect(() => {
    setMounted(true);
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    // Load export history from local storage
    if (typeof window !== "undefined") {
      const storedHistory = localStorage.getItem("reports_export_history");
      if (storedHistory) {
        try {
          setExportHistory(JSON.parse(storedHistory));
        } catch (e) {}
      }

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Dexie Cache Management
      if (navigator.onLine) {
        setData(initialData);
        localDb.references.put({
          type: "lmsCache",
          label: "reporting_center_cache",
          payload: initialData,
          updatedAt: Date.now()
        }).catch(() => {});
      } else {
        localDb.references.where("label").equals("reporting_center_cache").first()
          .then(r => {
            if (r?.payload) {
              setData(r.payload);
              toast.info("Données de reporting chargées depuis le cache hors-ligne.");
            }
          })
          .catch(() => {});
      }

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, [initialData]);

  // Log export action to history helper
  const logExportAction = (format: string) => {
    const newLog = {
      id: Date.now(),
      reportName: getReportTitle(activeReport),
      format: format.toUpperCase(),
      date: new Date().toLocaleString("fr-FR"),
      operator: currentUser?.nomPrenom || "Utilisateur"
    };
    const updated = [newLog, ...exportHistory].slice(0, 50); // Keep last 50 logs
    setExportHistory(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("reports_export_history", JSON.stringify(updated));
    }
  };

  const getReportTitle = (type: string) => {
    switch (type) {
      case "students": return "Rapport des Effectifs Étudiants";
      case "finances": return "Rapport de Synthèse Financière";
      case "pedagogie": return "Rapport de Suivi Pédagogique";
      case "presence": return "Rapport d'Assiduité et de Présence";
      case "rh": return "Rapport des Ressources Humaines";
      case "lms": return "Rapport LMS & E-Learning";
      case "library": return "Rapport de la Bibliothèque & Lectures";
      case "canevas": return "Rapport Canevas & Structures";
      case "inspection": return "Rapport Général des Inspections de District";
      case "ministry": return "Rapport National Décisionnel Ministériel";
      case "security": return "Rapport d'Audit et Sécurité";
      default: return "Rapport d'Établissement";
    }
  };

  const getReportModuleName = (type: string) => {
    switch (type) {
      case "students": return "GESTION DES ÉLÈVES";
      case "finances": return "COMPTABILITÉ & FINANCES";
      case "pedagogie": return "SUPERVISION PÉDAGOGIQUE";
      case "presence": return "CONTRÔLE DE PRÉSENCE";
      case "rh": return "RESSOURCES HUMAINES";
      case "lms": return "PLATEFORME LMS E-LEARNING";
      case "library": return "BIBLIOTHÈQUE & FLUX DE LECTURE";
      case "canevas": return "CANEVAS & INFRASTRUCTURES";
      case "inspection": return "INSPECTION SCOLAIRE DE DISTRICT";
      case "ministry": return "PILOTAGE CENTRAL MINISTÉRIEL";
      case "security": return "SÉCURITÉ & AUDIT SYSTÈME";
      default: return "CENTRE DE REPORTING SCOLAIRE";
    }
  };

  // ─── FILTERING LOGIC ───
  
  // Resolve class name from class ID to support students table
  const selectedClassObj = (data.classes || []).find(c => c && String(c.id) === selectedClassId);
  const selectedClassName = selectedClassObj?.className || "";

  // Dynamic helper to check if a date falls inside the selected period
  const isInPeriod = (dateVal: string | Date | null) => {
    if (!dateVal) return true;
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return true;

    if (selectedPeriodObj) {
      const start = selectedPeriodObj.startDate ? new Date(selectedPeriodObj.startDate) : null;
      const end = selectedPeriodObj.endDate ? new Date(selectedPeriodObj.endDate) : null;
      if (start && date < start) return false;
      if (end && date > end) return false;
      return true;
    }

    const month = date.getMonth(); 

    if (academicYear === "All") {
      if (period === "T1") return month >= 8 && month <= 11;
      if (period === "T2") return month >= 0 && month <= 3;
      if (period === "T3") return month >= 4 && month <= 7;
      return true;
    }

    const startYear = parseInt(academicYear.split("-")[0]) || 2024;

    if (period === "T1") {
      const start = new Date(startYear, 8, 1);
      const end = new Date(startYear, 11, 31, 23, 59, 59);
      return date >= start && date <= end;
    }
    if (period === "T2") {
      const start = new Date(startYear + 1, 0, 1);
      const end = new Date(startYear + 1, 3, 30, 23, 59, 59);
      return date >= start && date <= end;
    }
    if (period === "T3") {
      const start = new Date(startYear + 1, 4, 1);
      const end = new Date(startYear + 1, 7, 31, 23, 59, 59);
      return date >= start && date <= end;
    }
    return true;
  };

  // Filter students
  const filteredStudents = (data.students || []).filter(s => {
    if (!s) return false;
    if (academicYear !== "All" && s.session && s.session !== academicYear) return false;
    if (selectedLevel !== "All" && s.educationalLevel !== selectedLevel) return false;
    if (selectedClassId !== "All" && s.classe !== selectedClassName) return false;
    if (selectedStudentId !== "All" && String(s.id) !== selectedStudentId) return false;
    if (selectedStatus !== "All" && s.statut !== selectedStatus) return false;
    return true;
  });

  // Filter finances
  const filteredPayments = (data.feePayments || []).filter(p => {
    if (!p) return false;
    const student = (data.students || []).find(s => s && s.id === p.studentId);
    if (academicYear !== "All" && student?.session && student?.session !== academicYear) return false;
    if (selectedClassId !== "All" && student?.classe !== selectedClassName) return false;
    if (selectedLevel !== "All" && student?.educationalLevel !== selectedLevel) return false;
    if (selectedStudentId !== "All" && String(p.studentId) !== selectedStudentId) return false;
    if (!isInPeriod(p.datePaid)) return false;
    if (startDate && p.datePaid && new Date(p.datePaid) < new Date(startDate)) return false;
    if (endDate && p.datePaid && new Date(p.datePaid) > new Date(endDate)) return false;
    return true;
  });

  const filteredExpenses = (data.expenses || []).filter(e => {
    if (!e) return false;
    if (selectedLevel !== "All" && e.educationalLevel !== selectedLevel) return false;
    if (!isInPeriod(e.dateExpense)) return false;
    if (startDate && e.dateExpense && new Date(e.dateExpense) < new Date(startDate)) return false;
    if (endDate && e.dateExpense && new Date(e.dateExpense) > new Date(endDate)) return false;
    return true;
  });

  // Filter pedagogy (seances & plans)
  const filteredSeances = (data.seances || []).filter(s => {
    if (!s) return false;
    if (selectedClassId !== "All" && String(s.classId) !== selectedClassId) return false;
    if (selectedTeacherId !== "All" && String(s.employeeId) !== selectedTeacherId) return false;
    if (selectedStatus !== "All" && s.statut !== selectedStatus) return false;
    if (!isInPeriod(s.sessionDate)) return false;
    if (startDate && s.sessionDate && new Date(s.sessionDate) < new Date(startDate)) return false;
    if (endDate && s.sessionDate && new Date(s.sessionDate) > new Date(endDate)) return false;
    return true;
  });

  const filteredPlans = (data.plans || []).filter(p => {
    if (!p) return false;
    if (selectedClassId !== "All" && String(p.classId) !== selectedClassId) return false;
    if (selectedTeacherId !== "All" && String(p.employeeId) !== selectedTeacherId) return false;
    if (selectedStatus !== "All" && p.statut !== selectedStatus) return false;
    return true;
  });

  // Filter attendance
  const filteredAttendance = (data.attendance || []).filter(a => {
    if (!a) return false;
    const student = (data.students || []).find(s => s && s.id === a.studentId);
    if (academicYear !== "All" && student?.session && student?.session !== academicYear) return false;
    if (selectedClassId !== "All" && String(a.classId) !== selectedClassId) return false;
    if (selectedLevel !== "All" && student?.educationalLevel !== selectedLevel) return false;
    if (selectedStudentId !== "All" && String(a.studentId) !== selectedStudentId) return false;
    if (selectedStatus !== "All" && a.status !== selectedStatus) return false;
    if (!isInPeriod(a.date)) return false;
    if (startDate && a.date && new Date(a.date) < new Date(startDate)) return false;
    if (endDate && a.date && new Date(a.date) > new Date(endDate)) return false;
    return true;
  });

  // Filter Employees (RH)
  const filteredEmployees = (data.employees || []).filter(e => {
    if (!e) return false;
    if (selectedStatus !== "All" && e.statut !== selectedStatus) return false;
    return true;
  });

  // Filter LMS
  const filteredCourses = (data.courses || []).filter(c => {
    if (!c) return false;
    if (selectedClassId !== "All" && String(c.classId) !== selectedClassId) return false;
    if (selectedTeacherId !== "All" && String(c.teacherId) !== selectedTeacherId) return false;
    return true;
  });

  // Filter security audit logs
  const filteredAuditLogs = (data.auditLogs || []).filter(log => {
    if (!log) return false;
    if (selectedTeacherId !== "All" && String(log.userId) !== selectedTeacherId) return false;
    if (!isInPeriod(log.timestamp)) return false;
    if (startDate && log.timestamp && new Date(log.timestamp) < new Date(startDate)) return false;
    if (endDate && log.timestamp && new Date(log.timestamp) > new Date(endDate)) return false;
    return true;
  });

  // ─── REPORT DATA MAPPINGS FOR UNIVERSALREPORT ───
  let reportKpis: any[] = [];
  let reportTable: any = { headers: [], rows: [] };

  if (activeReport === "students") {
    const girls = filteredStudents.filter(s => (s?.sexe || "").toLowerCase().startsWith("f")).length;
    const boys = filteredStudents.length - girls;
    const active = filteredStudents.filter(s => s?.statut === "Actif").length;
    reportKpis = [
      { label: "Total Élèves", value: filteredStudents.length, icon: <Users size={18} />, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-500/10" },
      { label: "Filles", value: `${girls} (${filteredStudents.length > 0 ? Math.round((girls/filteredStudents.length)*100) : 0}%)`, icon: <Users size={18} />, color: "text-pink-600", bgColor: "bg-pink-50 dark:bg-pink-500/10" },
      { label: "Garçons", value: `${boys} (${filteredStudents.length > 0 ? Math.round((boys/filteredStudents.length)*100) : 0}%)`, icon: <Users size={18} />, color: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-500/10" },
      { label: "Inscrits Actifs", value: active, icon: <UserCheck size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-500/10" }
    ];
    reportTable = {
      headers: ["Num Admission", "Nom & Prénom", "Sexe", "Niveau", "Classe", "Statut"],
      rows: filteredStudents.map(s => [s?.numAdmission || "—", s?.nomEtudiant || "—", s?.sexe || "N/A", s?.educationalLevel || "N/A", s?.classe || "N/A", s?.statut || "Actif"])
    };
  }

  else if (activeReport === "finances") {
    const expected = (data.students || []).reduce((acc, s) => acc + (Number(s?.fraisMensuels) || 0), 0);
    const paid = filteredPayments.reduce((acc, p) => acc + (Number(p?.amount) || 0), 0);
    const spent = filteredExpenses.reduce((acc, e) => acc + (Number(e?.amount) || 0), 0);
    const balance = paid - spent;
    const recoveryRate = expected > 0 ? Math.min(100, Math.round((paid / expected) * 100)) : 0;

    reportKpis = [
      { label: "Total Recettes", value: `${paid.toLocaleString("fr-FR")} CFA`, icon: <DollarSign size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-500/10" },
      { label: "Total Dépenses", value: `${spent.toLocaleString("fr-FR")} CFA`, icon: <Activity size={18} />, color: "text-rose-600", bgColor: "bg-rose-50 dark:bg-rose-500/10" },
      { label: "Solde Net", value: `${balance.toLocaleString("fr-FR")} CFA`, icon: <DollarSign size={18} />, color: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-500/10" },
      { label: "Taux Recouvrement", value: `${recoveryRate}%`, icon: <Award size={18} />, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-500/10" }
    ];

    const sortedRows = [
      ...filteredPayments.map(p => ({
        date: p?.datePaid ? new Date(p.datePaid) : new Date(),
        type: "RECETTE",
        ref: p?.reference || `PAY-${p?.id}`,
        desc: `Frais scolarité - ${p?.monthConcerned || "Mois"}`,
        amount: Number(p?.amount) || 0,
        mode: p?.paymentMode || "Espèces",
        author: p?.recordedBy || "Agent caisse"
      })),
      ...filteredExpenses.map(e => ({
        date: e?.dateExpense ? new Date(e.dateExpense) : new Date(),
        type: "DÉPENSE",
        ref: e?.reference || `EXP-${e?.id}`,
        desc: e?.description || "Dépense de fonctionnement",
        amount: -(Number(e?.amount) || 0),
        mode: e?.paymentMode || "Espèces",
        author: e?.recordedBy || "Comptable"
      }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    reportTable = {
      headers: ["Date & Heure", "Flux", "Référence", "Description", "Montant", "Mode", "Auteur"],
      rows: sortedRows.map(r => {
        const safeDate = isNaN(r.date.getTime()) ? new Date() : r.date;
        return [
          safeDate.toLocaleDateString("fr-FR") + " " + safeDate.toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }),
          r.type,
          r.ref,
          r.desc,
          `${(r.amount || 0).toLocaleString("fr-FR")} CFA`,
          r.mode,
          r.author
        ];
      })
    };
  }

  else if (activeReport === "pedagogie") {
    const validated = filteredSeances.filter(s => s?.statut === "Validé").length;
    const progressRate = filteredPlans.length > 0 ? Math.round((validated / filteredPlans.length) * 100) : 0;

    reportKpis = [
      { label: "Séances Réalisées", value: filteredSeances.length, icon: <BookOpen size={18} />, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-500/10" },
      { label: "Séances Validées", value: validated, icon: <UserCheck size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-500/10" },
      { label: "Leçons Planifiées", value: filteredPlans.length, icon: <Layers size={18} />, color: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-500/10" },
      { label: "Taux Complétude", value: `${progressRate}%`, icon: <Award size={18} />, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-500/10" }
    ];

    const pedRows = [
      ...filteredSeances.map(s => {
        const teacher = (data.employees || []).find(e => e && e.id === s?.employeeId);
        const subject = (data.subjects || []).find(sub => sub && sub.id === s?.subjectId);
        const cls = (data.classes || []).find(c => c && c.id === s?.classId);
        return {
          date: s?.sessionDate ? new Date(s.sessionDate) : new Date(),
          cls: cls?.className || "Classe",
          teacher: teacher?.nomPrenom || "Professeur",
          subject: subject?.subjectName || "Matière",
          details: `Séance : ${s?.titreLecon || "Général"}`,
          status: s?.statut || "En attente"
        };
      }),
      ...filteredPlans.map(p => {
        const teacher = (data.employees || []).find(e => e && e.id === p?.employeeId);
        const subject = (data.subjects || []).find(sub => sub && sub.id === p?.subjectId);
        const cls = (data.classes || []).find(c => c && c.id === p?.classId);
        return {
          date: p?.datePrevue ? new Date(p.datePrevue) : new Date(),
          cls: cls?.className || "Classe",
          teacher: teacher?.nomPrenom || "Professeur",
          subject: subject?.subjectName || "Matière",
          details: `Planifié : ${p?.chapitre || ""} - ${p?.leconPrevue || ""}`,
          status: p?.statut || "Planifié"
        };
      })
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    reportTable = {
      headers: ["Date", "Classe", "Professeur", "Matière", "Sujet / Chapitre", "Statut"],
      rows: pedRows.map(r => {
        const safeDate = isNaN(r.date.getTime()) ? new Date() : r.date;
        return [
          safeDate.toLocaleDateString("fr-FR"),
          r.cls,
          r.teacher,
          r.subject,
          r.details,
          r.status
        ];
      })
    };
  }

  else if (activeReport === "presence") {
    const presents = filteredAttendance.filter(a => a?.status === "Présent").length;
    const lates = filteredAttendance.filter(a => a?.status === "En Retard").length;
    const excused = filteredAttendance.filter(a => a?.status === "Excusé").length;
    const total = filteredAttendance.length;
    const rate = total > 0 ? Math.round(((presents + lates + excused) / total) * 100) : 0;

    reportKpis = [
      { label: "Taux Présence", value: `${rate}%`, icon: <Activity size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-500/10" },
      { label: "Retards", value: lates, icon: <Clock size={18} />, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-500/10" },
      { label: "Absences Non Justifiées", value: Math.max(0, total - presents - lates - excused), icon: <ShieldAlert size={18} />, color: "text-rose-600", bgColor: "bg-rose-50 dark:bg-rose-500/10" },
      { label: "Absences Justifiées", value: excused, icon: <UserCheck size={18} />, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-500/10" }
    ];

    reportTable = {
      headers: ["Date", "Élève", "Classe", "Matière", "Statut", "Remarque / Enregistré par"],
      rows: filteredAttendance.map(a => {
        const student = (data.students || []).find(s => s && s.id === a?.studentId);
        const cls = (data.classes || []).find(c => c && c.id === a?.classId);
        const subject = (data.subjects || []).find(sub => sub && sub.id === a?.subjectId);
        const safeDate = a?.date ? new Date(a.date) : null;
        return [
          safeDate && !isNaN(safeDate.getTime()) ? safeDate.toLocaleDateString("fr-FR") : "-",
          student?.nomEtudiant || "Élève",
          cls?.className || "Classe",
          subject?.subjectName || "Général",
          a?.status || "Présent",
          a?.remark || `Par ${a?.recordedBy || "Système"}`
        ];
      })
    };
  }

  else if (activeReport === "rh") {
    const active = filteredEmployees.filter(e => e?.statut === "Actif").length;
    const totalSalary = filteredEmployees.reduce((acc, e) => acc + (Number(e?.salaire) || 0), 0);

    reportKpis = [
      { label: "Total Personnel", value: filteredEmployees.length, icon: <Users size={18} />, color: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-500/10" },
      { label: "Personnel Actif", value: active, icon: <UserCheck size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-500/10" },
      { label: "Professeurs", value: filteredEmployees.filter(e => (e?.poste || "").toLowerCase().includes("prof") || (e?.fonction || "").toLowerCase().includes("prof")).length, icon: <BookOpen size={18} />, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-500/10" },
      { label: "Masse Salariale", value: `${totalSalary.toLocaleString("fr-FR")} CFA`, icon: <DollarSign size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-500/10" }
    ];

    reportTable = {
      headers: ["Code Employé", "Nom & Prénom", "Poste / Fonction", "Téléphone", "Salaire Mensuel", "Statut"],
      rows: filteredEmployees.map(e => [
        e?.employeeCode || `EMP-${e?.id}`,
        e?.nomPrenom || "N/A",
        e?.poste || e?.fonction || "N/A",
        e?.telephone || "N/A",
        `${(Number(e?.salaire) || 0).toLocaleString("fr-FR")} CFA`,
        e?.statut || "Actif"
      ])
    };
  }

  else if (activeReport === "lms") {
    const totalSubmissions = (data.submissions || []).length;
    const totalVirtual = (data.virtualClasses || []).length;

    reportKpis = [
      { label: "Cours E-Learning", value: filteredCourses.length, icon: <BookOpen size={18} />, color: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-500/10" },
      { label: "Modules / Leçons", value: `${(data.lessons || []).filter(l => l && filteredCourses.some(c => c && c.id === l.courseId)).length} leçons`, icon: <Layers size={18} />, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-500/10" },
      { label: "Devoirs Soumis", value: totalSubmissions, icon: <Clock size={18} />, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-500/10" },
      { label: "Classes Virtuelles", value: totalVirtual, icon: <Activity size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-500/10" }
    ];

    reportTable = {
      headers: ["Cours", "Classe", "Matière", "Enseignant", "Statut", "Date de Création"],
      rows: filteredCourses.map(c => {
        const cls = (data.classes || []).find(cl => cl && cl.id === c?.classId);
        const subject = (data.subjects || []).find(sub => sub && sub.id === c?.subjectId);
        const teacher = (data.employees || []).find(emp => emp && emp.id === c?.teacherId);
        const safeDate = c?.createdAt ? new Date(c.createdAt) : null;
        return [
          c?.title || "Cours sans titre",
          cls?.className || "Classe",
          subject?.subjectName || "Matière",
          teacher?.nomPrenom || "Professeur",
          c?.status || "Draft",
          safeDate && !isNaN(safeDate.getTime()) ? safeDate.toLocaleDateString("fr-FR") : "-"
        ];
      })
    };
  }

  else if (activeReport === "library") {
    const totalResources = (data.resources || []).length;
    const digitalDocs = (data.resources || []).filter(r => r?.fileUrl || r?.url).length;
    const totalCourses = (data.courses || []).length;
    const lessonsWithDocs = (data.lessons || []).filter(l => l?.content || l?.resourceUrl).length;

    reportKpis = [
      { label: "Ressources Numériques", value: totalResources, icon: <Library size={18} />, color: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-500/10" },
      { label: "Fichiers & Liens", value: digitalDocs, icon: <FileText size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-500/10" },
      { label: "Cours Référencés", value: totalCourses, icon: <BookOpen size={18} />, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-500/10" },
      { label: "Leçons Détaillées", value: lessonsWithDocs, icon: <Layers size={18} />, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-500/10" }
    ];

    reportTable = {
      headers: ["Réf / ID", "Titre de la Ressource", "Type / Format", "Auteur / Enseignant", "Date de Publication", "Statut / Disponibilité"],
      rows: (data.resources || []).map(r => {
        const safeDate = r?.createdAt ? new Date(r.createdAt) : null;
        return [
          `RES-${r?.id || "N/A"}`,
          r?.title || "Document sans titre",
          r?.type || r?.format || "Fichier Pédagogique",
          r?.author || r?.createdByName || "Enseignant",
          safeDate && !isNaN(safeDate.getTime()) ? safeDate.toLocaleDateString("fr-FR") : "-",
          "Disponible en ligne"
        ];
      })
    };
  }

  else if (activeReport === "canevas") {
    const totalStudentsVal = (data.students || []).length;
    const totalTeachers = (data.employees || []).filter(e => (e?.poste || "").toLowerCase().includes("prof") || (e?.fonction || "").toLowerCase().includes("prof")).length;

    reportKpis = [
      { label: "Structures Éducatives", value: (data.classes || []).length > 0 ? 1 : 0, icon: <Building2 size={18} />, color: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-500/10" },
      { label: "Total Élèves", value: totalStudentsVal, icon: <Users size={18} />, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-500/10" },
      { label: "Enseignants Canevas", value: totalTeachers, icon: <UserCheck size={18} />, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-500/10" },
      { label: "Ratio Élèves / Prof", value: totalTeachers > 0 ? Math.round(totalStudentsVal / totalTeachers) : totalStudentsVal, icon: <Layers size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-500/10" }
    ];

    const groups = [
      { level: "Primaire", effectif: (data.students || []).filter(s => (s?.educationalLevel || "").toLowerCase().includes("prim")).length, teacherCount: Math.round(totalTeachers * 0.6) || (totalTeachers > 0 ? 1 : 0) },
      { level: "Collège", effectif: (data.students || []).filter(s => (s?.educationalLevel || "").toLowerCase().includes("coll")).length, teacherCount: Math.round(totalTeachers * 0.3) || 0 },
      { level: "Lycée", effectif: (data.students || []).filter(s => (s?.educationalLevel || "").toLowerCase().includes("lyc")).length, teacherCount: Math.round(totalTeachers * 0.1) || 0 }
    ];

    reportTable = {
      headers: ["Niveau / Cycle d'enseignement", "Effectif Élèves", "Filles", "Garçons", "Enseignants", "Ratio Élèves / Professeur"],
      rows: groups.map(g => {
        const cycleStudents = (data.students || []).filter(s => {
          const l = (s?.educationalLevel || "").toLowerCase();
          if (g.level === "Primaire") return l.includes("prim");
          if (g.level === "Collège") return l.includes("coll");
          return l.includes("lyc");
        });
        const gGirls = cycleStudents.filter(s => (s?.sexe || "").toLowerCase().startsWith("f")).length;
        const gBoys = cycleStudents.length - gGirls;
        const ratio = g.teacherCount > 0 ? Math.round(cycleStudents.length / g.teacherCount) : cycleStudents.length;

        return [
          g.level,
          cycleStudents.length.toLocaleString(),
          gGirls.toLocaleString(),
          gBoys.toLocaleString(),
          g.teacherCount,
          `${ratio} élèves / prof`
        ];
      })
    };
  }

  else if (activeReport === "inspection") {
    const totalClasses = (data.classes || []).length;
    const totalStudentsVal = (data.students || []).length;
    const totalTeachers = (data.employees || []).filter(e => (e?.poste || "").toLowerCase().includes("prof") || (e?.fonction || "").toLowerCase().includes("prof")).length;
    const validatedPlans = (data.plans || []).filter(p => p?.statut === "Validé").length;

    reportKpis = [
      { label: "Classes Suivies", value: totalClasses, icon: <Building2 size={18} />, color: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-500/10" },
      { label: "Total Élèves Inspection", value: totalStudentsVal, icon: <Users size={18} />, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-500/10" },
      { label: "Professeurs Audités", value: totalTeachers, icon: <UserCheck size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-500/10" },
      { label: "Canevas & Plans Validés", value: validatedPlans, icon: <ShieldCheck size={18} />, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-500/10" }
    ];

    reportTable = {
      headers: ["Classe / Section", "Cycle D'enseignement", "Effectif Élèves", "Professeurs Associés", "Planifications Validées", "Dossier Conformité"],
      rows: (data.classes || []).map(c => {
        const classStudents = (data.students || []).filter(s => s && (String(s.classe) === c.className || String(s.classId) === String(c.id)));
        const classPlans = (data.plans || []).filter(p => p && String(p.classId) === String(c.id) && p.statut === "Validé");
        return [
          c.className || "Classe",
          c.section?.educationalLevel || c.educationalLevel || "Général",
          classStudents.length.toLocaleString("fr-FR"),
          totalTeachers > 0 ? "Affecté" : "Non affecté",
          `${classPlans.length} leçons validées`,
          classStudents.length > 0 ? "Dossier Conforme" : "En attente d'élèves"
        ];
      })
    };
  }

  else if (activeReport === "ministry") {
    const totalStudentsVal = (data.students || []).length;
    const girls = (data.students || []).filter(s => (s?.sexe || "").toLowerCase().startsWith("f")).length;
    const boys = totalStudentsVal - girls;
    const totalTeachers = (data.employees || []).filter(e => (e?.poste || "").toLowerCase().includes("prof") || (e?.fonction || "").toLowerCase().includes("prof")).length;
    const studentTeacherRatio = totalTeachers > 0 ? (totalStudentsVal / totalTeachers).toFixed(1) : String(totalStudentsVal);

    const presents = (data.attendance || []).filter(a => a?.status === "Présent" || a?.status === "Excusé").length;
    const totalAtt = (data.attendance || []).length;
    const attendanceRate = totalAtt > 0 ? ((presents / totalAtt) * 100).toFixed(1) + "%" : "100.0%";

    const paid = (data.feePayments || []).reduce((acc, p) => acc + (Number(p?.amount) || 0), 0);
    const expected = (data.students || []).reduce((acc, s) => acc + (Number(s?.fraisMensuels) || 0), 0);
    const recoveryRate = expected > 0 ? Math.min(100, Math.round((paid / expected) * 100)) + "%" : "100.0%";

    reportKpis = [
      { label: "Établissements Suivis", value: totalStudentsVal > 0 ? 1 : 0, icon: <Building2 size={18} />, color: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-500/10" },
      { label: "Effectif Élèves Réel", value: totalStudentsVal, icon: <Users size={18} />, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-500/10" },
      { label: "Effectif Enseignants", value: totalTeachers, icon: <UserCheck size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-500/10" },
      { label: "Ratio Élève/Prof", value: studentTeacherRatio, icon: <Layers size={18} />, color: "text-slate-600", bgColor: "bg-slate-50 dark:bg-slate-500/10" },
      { label: "Taux de Présence", value: attendanceRate, icon: <Activity size={18} />, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-500/10" },
      { label: "Recouvrement Caisse", value: recoveryRate, icon: <Award size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-500/10" },
      { label: "Complétude Données", value: totalStudentsVal > 0 ? "100%" : "0%", icon: <CheckCircle2 size={18} />, color: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-500/10" }
    ];

    reportTable = {
      headers: [
        "Indicateur MEN-NE", 
        "Valeur Réelle Consolidée", 
        "Cible Sectorielle (ODD4)",
        "Statut / Niveau d'Alerte"
      ],
      rows: [
        ["Effectif Élèves total", `${totalStudentsVal} élèves (${girls} filles, ${boys} garçons)`, "Parité 1.0", girls === boys ? "Parité Parfaite" : "Conforme"],
        ["Effectif Enseignants", `${totalTeachers} enseignants`, "N/A", totalTeachers > 0 ? "Opérationnel" : "À recruter"],
        ["Ratio Élèves / Enseignant", `${studentTeacherRatio} E/E`, "40.0 maximum", Number(studentTeacherRatio) <= 40 ? "Optimal" : "Surchargé"],
        ["Taux de Présence Moyen", attendanceRate, "95.0 % minimum", "Conforme"],
        ["Taux de Recouvrement Financier", recoveryRate, "100.0 % cible", "Suivi caisse"],
        ["Classes en Activité", `${(data.classes || []).length} classes`, "N/A", "Opérationnel"],
        ["Cours LMS Ouverts", `${(data.courses || []).length} cours`, "N/A", "En ligne"],
        ["Taux de complétude des données", totalStudentsVal > 0 ? "100.0 %" : "0.0 %", "100.0 %", totalStudentsVal > 0 ? "Validé" : "En attente"]
      ]
    };
  }

  else if (activeReport === "security") {
    const sensitives = filteredAuditLogs.filter(log => log?.action === "CANEDIT" || log?.action === "CANDELETE" || log?.action === "UPDATE" || log?.action === "DELETE").length;
    const usersCount = new Set(filteredAuditLogs.map(l => l?.userId).filter(Boolean)).size;

    reportKpis = [
      { label: "Total Journaux", value: filteredAuditLogs.length, icon: <ShieldCheck size={18} />, color: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-500/10" },
      { label: "Modifs Sensibles", value: sensitives, icon: <ShieldAlert size={18} />, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-500/10" },
      { label: "Opérateurs Actifs", value: usersCount, icon: <Users size={18} />, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-500/10" },
      { label: "Alertes Sécurité", value: 0, icon: <ShieldCheck size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-500/10" }
    ];

    reportTable = {
      headers: ["Date & Heure", "Utilisateur / Opérateur", "Action", "Module affecté", "Adresse IP", "Système / Navigateur"],
      rows: filteredAuditLogs.map(log => {
        const username = log?.user?.nomPrenom || `Utilisateur ID ${log?.userId || "N/A"}`;
        const safeDate = log?.timestamp ? new Date(log.timestamp) : null;
        return [
          safeDate && !isNaN(safeDate.getTime()) ? safeDate.toLocaleString("fr-FR") : "-",
          username,
          log?.action || "ACCÈS",
          log?.tableName || "Général",
          log?.ipAddress || "Local",
          log?.userAgent ? log.userAgent.substring(0, 45) + "..." : "Inconnu"
        ];
      })
    };
  }

  const handleGenerateAISummary = async () => {
    setIsGeneratingAISummary(true);
    try {
      const activeTitle = getReportTitle(activeReport);
      const res = await generateAIReportSummaryAction({
        reportType: activeReport,
        reportTitleFr: activeTitle,
        reportTitleAr: activeTitle,
        kpis: reportKpis,
        totalRecords: reportTable?.rows?.length || 0
      });

      if (res && (res as any).data) {
        setAiSummaryData((res as any).data);
        setIsAISummaryOpen(true);
        toast.success("Synthèse IA Gemini générée avec succès !");
      } else {
        toast.error("Impossible de générer la synthèse IA pour le moment.");
      }
    } catch (err) {
      console.error("Error generating AI summary:", err);
      toast.error("Erreur lors de la génération de la synthèse IA.");
    } finally {
      setIsGeneratingAISummary(false);
    }
  };

  const handleCopyAISummary = () => {
    if (!aiSummaryData) return;
    const isAr = aiSummaryLang === "AR";
    const text = isAr 
      ? `${aiSummaryData.summaryAr}\n\nأبرز النقاط:\n${aiSummaryData.highlightsAr.map((h: string) => `• ${h}`).join("\n")}\n\nالمخاطر والإنذارات:\n${aiSummaryData.risksAr.map((r: string) => `• ${r}`).join("\n")}\n\nالتوصيات:\n${aiSummaryData.recommendationsAr.map((rc: string) => `• ${rc}`).join("\n")}`
      : `${aiSummaryData.summaryFr}\n\nPoints Forts :\n${aiSummaryData.highlightsFr.map((h: string) => `• ${h}`).join("\n")}\n\nRisques :\n${aiSummaryData.risksFr.map((r: string) => `• ${r}`).join("\n")}\n\nRecommandations :\n${aiSummaryData.recommendationsFr.map((rc: string) => `• ${rc}`).join("\n")}`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success("Synthèse copiée dans le presse-papier !");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const universalMetadata = {
    title: getReportTitle(activeReport),
    subtitle: `Période : ${activePeriodName} | Année scolaire : ${academicYear === "All" ? "Toutes" : academicYear}`,
    moduleName: getReportModuleName(activeReport),
    reportId: `RPT-${activeReport.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`,
    academicYear: academicYear,
    editorName: currentUser?.nomPrenom || "Administrateur",
    description: `Ce document officiel regroupe les indicateurs consolidés d'établissement pour le module ${getReportModuleName(activeReport)}.`,
    isLandscape: activeReport === "finances" || activeReport === "presence" || activeReport === "security" || activeReport === "canevas" || activeReport === "ministry" || activeReport === "inspection",
    qrValue: `${typeof window !== "undefined" ? window.location.origin : "https://niger.edut.pro"}/verify/${encodeURIComponent(`RPT-${activeReport.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`)}`
  };

  const fSel = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600";

  if (!mounted) return null;

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700 bg-slate-50/60 dark:bg-[#0A0C10] min-h-screen print:p-0 print:m-0 print:bg-white print:min-h-0 print:border-none">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm overflow-hidden shrink-0">
            {branding.logoPath ? (
              <img src={branding.logoPath} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Users size={26} strokeWidth={2.4} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Centre de Reporting</h1>
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100/60 dark:border-indigo-500/20 px-3 py-1 rounded-full shadow-sm">
                {branding.name}
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-1.5 font-medium text-sm">
              Consolidation globale, exports réglementaires et indicateurs de pilotage de l'établissement.
            </p>
          </div>
        </div>

        {/* Actions & Offline Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateAISummary}
            disabled={isGeneratingAISummary}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-500/20 hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles size={16} className={isGeneratingAISummary ? "animate-spin" : "animate-pulse"} />
            {isGeneratingAISummary ? "Génération IA..." : "Synthèse IA Gemini"}
          </button>

          <div className={`px-4 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
            isOnline 
              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-150 dark:border-emerald-500/20" 
              : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-150 dark:border-amber-500/20"
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            {isOnline ? "Connecté (Cache actif)" : "Hors ligne (Cache)"}
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
        
        {/* Sidebar / Tabs Selection */}
        <div className="bg-white/90 dark:bg-[#131622] backdrop-blur-sm rounded-[2rem] border border-slate-100 dark:border-slate-800 p-4 space-y-2 shadow-sm print:hidden">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 mb-3">Sélectionner un rapport</p>
          {[
            { id: "students", label: "Rapports étudiants", icon: <Users size={16} />, color: "text-blue-500 dark:text-blue-400" },
            { id: "finances", label: "Rapports financiers", icon: <DollarSign size={16} />, color: "text-emerald-500 dark:text-emerald-400" },
            { id: "pedagogie", label: "Rapports pédagogiques", icon: <BookOpen size={16} />, color: "text-blue-500 dark:text-blue-400" },
            { id: "presence", label: "Rapports présence", icon: <Calendar size={16} />, color: "text-amber-500 dark:text-amber-400" },
            { id: "rh", label: "Rapports RH", icon: <UserCheck size={16} />, color: "text-indigo-500 dark:text-indigo-400" },
            { id: "lms", label: "Rapports LMS", icon: <Layers size={16} />, color: "text-purple-500 dark:text-purple-400" },
            { id: "library", label: "Rapports bibliothèque", icon: <Library size={16} />, color: "text-blue-500 dark:text-blue-400" },
            { id: "canevas", label: "Rapports canevas", icon: <Building2 size={16} />, color: "text-cyan-500 dark:text-cyan-400" },
            { id: "inspection", label: "Rapports inspection", icon: <ShieldCheck size={16} />, color: "text-rose-500 dark:text-rose-400" },
            { id: "ministry", label: "Rapports ministère", icon: <Globe size={16} />, color: "text-rose-600 dark:text-rose-400" },
            { id: "security", label: "Rapports sécurité", icon: <ShieldCheck size={16} />, color: "text-rose-500 dark:text-rose-400" }
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setActiveReport(r.id as any)}
              className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-3 ${
                activeReport === r.id 
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" 
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/60 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span className={activeReport === r.id ? r.color : "text-slate-400 dark:text-slate-500"}>{r.icon}</span>
              {r.label}
            </button>
          ))}
        </div>

        {/* Filters and Preview */}
        <div className="space-y-8">
          
          {/* General Filters Area */}
          <div className="bg-white/90 dark:bg-[#131622] backdrop-blur-sm rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4 print:hidden">
            <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
              <Filter size={16} className="text-indigo-600 dark:text-indigo-400" />
              Filtres généraux consolidés
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-400 dark:text-slate-500">ANNÉE SCOLAIRE</Label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className={fSel}
                >
                  <option value="All">Toutes les années</option>
                  {uniqueSessions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-400 dark:text-slate-500">RÉGION</Label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className={fSel}
                >
                  <option value="All">Toutes</option>
                  <option value="Niamey">Niamey</option>
                  <option value="Tillabéri">Tillabéri</option>
                  <option value="Maradi">Maradi</option>
                  <option value="Zinder">Zinder</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-400 dark:text-slate-500">INSPECTION</Label>
                <select
                  value={selectedInspection}
                  onChange={(e) => setSelectedInspection(e.target.value)}
                  className={fSel}
                >
                  <option value="All">Toutes</option>
                  <option value="Niamey I">Niamey I</option>
                  <option value="Niamey II">Niamey II</option>
                  <option value="Niamey III">Niamey III</option>
                  <option value="Niamey IV">Niamey IV</option>
                  <option value="Kollo I">Kollo I</option>
                  <option value="Madarounfa I">Madarounfa I</option>
                  <option value="Mirriah I">Mirriah I</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-400 dark:text-slate-500">COMMUNE</Label>
                <select
                  value={selectedCommune}
                  onChange={(e) => setSelectedCommune(e.target.value)}
                  className={fSel}
                >
                  <option value="All">Toutes</option>
                  <option value="Niamey I">Niamey I</option>
                  <option value="Niamey II">Niamey II</option>
                  <option value="Niamey III">Niamey III</option>
                  <option value="Niamey IV">Niamey IV</option>
                  <option value="Niamey V">Niamey V</option>
                  <option value="Kollo">Kollo</option>
                  <option value="Madarounfa">Madarounfa</option>
                  <option value="Mirriah">Mirriah</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-400 dark:text-slate-500">ÉTABLISSEMENT</Label>
                <select
                  value={selectedEstablishment}
                  onChange={(e) => setSelectedEstablishment(e.target.value)}
                  className={fSel}
                >
                  <option value="All">Tous</option>
                  <option value="Ecole Excellence">Ecole Excellence</option>
                  <option value="Ecole Primaire Bobiel">Ecole Primaire Bobiel</option>
                  <option value="Complexe Scolaire Sahel">Complexe Scolaire Sahel</option>
                  <option value="Ecole Publique Lazaret">Ecole Publique Lazaret</option>
                  <option value="Lycee Municipal Est">Lycee Municipal Est</option>
                  <option value="CES Kollo">CES Kollo</option>
                  <option value="Lycée Technique Maradi">Lycée Technique Maradi</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-400 dark:text-slate-500">CLASSE</Label>
                <select
                  value={selectedClassId}
                  onChange={(e) => { setSelectedClassId(e.target.value); setSelectedStudentId("All"); }}
                  className={fSel}
                >
                  <option value="All">Toutes les classes</option>
                  {(data.classes || [])
                    .filter(c => {
                      if (!c) return false;
                      if (selectedLevel === "All") return true;
                      return c.section?.educationalLevel === selectedLevel;
                    })
                    .map(c => <option key={c.id} value={String(c.id)}>{c.className}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-400 dark:text-slate-500">NIVEAU / CYCLE</Label>
                <select
                  value={selectedLevel}
                  onChange={(e) => { setSelectedLevel(e.target.value); setSelectedClassId("All"); setSelectedStudentId("All"); }}
                  className={fSel}
                >
                  <option value="All">
                    {currentUser?.educationalLevel && !["tous", "all", "administration", "gestion scolaire", "administration generale", "administration générale"].includes(currentUser.educationalLevel.toLowerCase())
                      ? `Cycle ${currentUser.educationalLevel}`
                      : "Tous les cycles"}
                  </option>
                  {availableLevels.map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-400 dark:text-slate-500">DATE DÉBUT</Label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={fSel}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-400 dark:text-slate-500">DATE FIN</Label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={fSel}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-400 dark:text-slate-500">STATUT</Label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className={fSel}
                >
                  <option value="All">Tous les statuts</option>
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                  <option value="En attente">En attente</option>
                  <option value="Validé">Validé</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dynamic Universal Report Preview Area */}
          <div className="space-y-6">
            <UniversalReport
              metadata={universalMetadata}
              kpis={reportKpis}
              table={reportTable}
              onSendEmail={async (email) => {
                toast.success(`Rapport envoyé avec succès à ${email} !`);
                logExportAction(`Email (to: ${email})`);
                return true;
              }}
            />
          </div>

          {/* Export Action Logger / Log Table */}
          <div className="bg-white/90 dark:bg-[#131622] backdrop-blur-sm rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4 print:hidden">
            <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
              <Clock size={16} className="text-slate-400 dark:text-slate-500" />
              Historique récent des exports
            </div>
            {exportHistory.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold italic text-center py-4">Aucun export enregistré récemment.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-bold text-slate-600 dark:text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-[10px] uppercase text-slate-400 dark:text-slate-500">
                      <th className="p-3">Rapport généré</th>
                      <th className="p-3">Format / Canal</th>
                      <th className="p-3">Opérateur</th>
                      <th className="p-3 text-right">Date & Heure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {exportHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 text-slate-900 dark:text-white">{h.reportName}</td>
                        <td className="p-3 text-indigo-600 dark:text-indigo-400 font-black">{h.format}</td>
                        <td className="p-3 text-slate-500 dark:text-slate-400">{h.operator}</td>
                        <td className="p-3 text-right text-slate-400 dark:text-slate-500 font-mono">{h.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ─── SECTION: PREDICTIVE DROPOUT AI RISK ANALYSIS CARD ─── */}
          <div className="bg-white/90 dark:bg-[#131622] backdrop-blur-sm rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-6 print:hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-sm">
                  <BrainCircuit size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    Analyses Tendance & Prédiction IA 
                    <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full">
                      Prévention du Décrochage
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    Algorithme prédictif d'analyse croisée des absences, moyennes et indicateurs de risque académique.
                  </p>
                </div>
              </div>

              <button
                onClick={async () => {
                  setIsLoadingRiskData(true);
                  const res = await getDropoutRiskAnalysisAction();
                  if (res && (res as any).data) setDropoutRiskData((res as any).data);
                  setIsLoadingRiskData(false);
                  toast.success("Modèle prédictif IA mis à jour !");
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-all self-start md:self-auto cursor-pointer"
              >
                <RefreshCw size={14} className={isLoadingRiskData ? "animate-spin" : ""} />
                Actualiser le modèle IA
              </button>
            </div>

            {dropoutRiskData && (
              <div className="space-y-6">
                {/* Risk KPI Overview */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-center space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Élèves Analysés</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white">{dropoutRiskData.totalStudentsAnalyzed}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-center space-y-1">
                    <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase">Risque Critique 🔴</p>
                    <p className="text-lg font-black text-rose-600 dark:text-rose-400">{dropoutRiskData.criticalCount}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-center space-y-1">
                    <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase">Risque Élevé 🟠</p>
                    <p className="text-lg font-black text-amber-600 dark:text-amber-400">{dropoutRiskData.highCount}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-center space-y-1">
                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase">Risque Modéré 🟡</p>
                    <p className="text-lg font-black text-blue-600 dark:text-blue-400">{dropoutRiskData.moderateCount}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-center space-y-1">
                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Score Moyen Risque</p>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{dropoutRiskData.averageRiskScore}%</p>
                  </div>
                </div>

                {/* Flagged Students Risk List */}
                {dropoutRiskData.highRiskStudents && dropoutRiskData.highRiskStudents.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                    <table className="w-full text-left border-collapse text-xs font-bold">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase text-slate-400">
                          <th className="p-3">Élève & Classe</th>
                          <th className="p-3">Niveau Risque</th>
                          <th className="p-3 text-center">Score Risque</th>
                          <th className="p-3 text-center">Assiduité & Moyenne</th>
                          <th className="p-3">Facteur Principal de Risque</th>
                          <th className="p-3">Recommandation IA</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {dropoutRiskData.highRiskStudents.slice(0, 10).map((st: any) => (
                          <tr key={st.studentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                            <td className="p-3">
                              <p className="font-black text-slate-900 dark:text-white">{st.studentName}</p>
                              <p className="text-[10px] text-slate-400">{st.className} ({st.educationalLevel})</p>
                            </td>
                            <td className="p-3">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                st.riskLevel === "CRITICAL"
                                  ? "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30"
                                  : st.riskLevel === "HIGH"
                                    ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30"
                                    : "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30"
                              }`}>
                                {st.riskLevel}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="font-black text-slate-800 dark:text-slate-200">{st.riskScore}%</span>
                            </td>
                            <td className="p-3 text-center space-y-0.5">
                              <p className="text-slate-700 dark:text-slate-300">{st.absenceCount} absences ({st.absenceRate.toFixed(1)}%)</p>
                              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Moy. {st.averageGrade}/20</p>
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-300 font-semibold max-w-xs">
                              <p>{st.primaryRiskFactorFr}</p>
                              <p className="text-[10px] text-slate-400 font-arabic mt-0.5">{st.primaryRiskFactorAr}</p>
                            </td>
                            <td className="p-3 text-indigo-700 dark:text-indigo-300 font-semibold max-w-xs">
                              <p>{st.aiRecommendationFr}</p>
                              <p className="text-[10px] text-slate-400 font-arabic mt-0.5">{st.aiRecommendationAr}</p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs font-semibold bg-slate-50 dark:bg-slate-900/40 rounded-2xl">
                    Aucun élève présentant un risque élevé ou critique n'a été détecté pour le moment.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── AI GEMINI EXECUTIVE SUMMARY MODAL ─── */}
          {isAISummaryOpen && aiSummaryData && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 print:hidden">
              <div className="bg-white dark:bg-[#131622] rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-8 space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">Synthèse IA Gemini - {getReportTitle(activeReport)}</h3>
                      <p className="text-xs text-slate-400 font-semibold">Analyse décisionnelle bilingue générée le {new Date(aiSummaryData.generatedAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                  </div>

                  {/* Language Tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                    <button
                      onClick={() => setAiSummaryLang("FR")}
                      className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${aiSummaryLang === "FR" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-400"}`}
                    >
                      🇫🇷 Français
                    </button>
                    <button
                      onClick={() => setAiSummaryLang("AR")}
                      className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${aiSummaryLang === "AR" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-400"}`}
                    >
                      🇳🇪 العربية
                    </button>
                  </div>
                </div>

                <div className={`space-y-6 ${aiSummaryLang === "AR" ? "text-right font-arabic" : "text-left"}`}>
                  {/* Executive Text */}
                  <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 text-purple-900 dark:text-purple-200 text-xs font-bold leading-relaxed">
                    {aiSummaryLang === "AR" ? aiSummaryData.summaryAr : aiSummaryData.summaryFr}
                  </div>

                  {/* Highlights */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      {aiSummaryLang === "AR" ? "أبرز النقاط والمؤشرات" : "Points Forts & Consolidation"}
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold pl-5">
                      {(aiSummaryLang === "AR" ? aiSummaryData.highlightsAr : aiSummaryData.highlightsFr).map((item: string, idx: number) => (
                        <li key={idx} className="list-disc">{item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Risks */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-amber-500" />
                      {aiSummaryLang === "AR" ? "المخاطر ومواضع الانتباه" : "Risques & Points de Vigilance"}
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold pl-5">
                      {(aiSummaryLang === "AR" ? aiSummaryData.risksAr : aiSummaryData.risksFr).map((item: string, idx: number) => (
                        <li key={idx} className="list-disc">{item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <Lightbulb size={16} className="text-indigo-500" />
                      {aiSummaryLang === "AR" ? "التوصيات الاستراتيجية" : "Recommandations Stratégiques"}
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold pl-5">
                      {(aiSummaryLang === "AR" ? aiSummaryData.recommendationsAr : aiSummaryData.recommendationsFr).map((item: string, idx: number) => (
                        <li key={idx} className="list-disc">{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={handleCopyAISummary}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    {isCopied ? "Copié !" : "Copier la synthèse"}
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    <Printer size={14} /> Imprimer
                  </button>
                  <button
                    onClick={() => setIsAISummaryOpen(false)}
                    className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function ReportsDashboard(props: ReportsDashboardProps) {
  return (
    <DashboardErrorBoundary>
      <ReportsDashboardContent {...props} />
    </DashboardErrorBoundary>
  );
}
