"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GraduationCap, LayoutGrid, FileCheck, ClipboardCheck, BarChart3, Sparkles, FileText, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { toast } from "sonner";

const AcademicFilters = dynamic(() => import("@/domains/academics/components/AcademicFilters"), { ssr: false });
const GradesEntryGrid = dynamic(() => import("@/domains/academics/components/GradesEntryGrid"), { ssr: false });
const BroadsheetMatrix = dynamic(() => import("@/domains/academics/components/BroadsheetMatrix"), { ssr: false });
const ResultsReportsPanel = dynamic(() => import("@/domains/academics/components/ResultsReportsPanel"), { ssr: false });

import {
  getGradingGrid,
  getBroadsheetMatrix,
  saveStudentGrades,
  getGradingAppreciations,
  getStudentBulletinData,
  getBatchBulletinData,
} from "@/domains/academics/actions/academics.actions";
import { generateBulletinPDF, generatePVMatrixPDF, generatePVMatrixExcel, generateReleveNotesPDF, generateResultsPedagogicalReportPDF } from "@/domains/academics/utils/bulletin-generator";
import { getDocumentHeaderConfig } from "@/domains/settings/actions/settings.actions";
import { inferEducationalLevel, isHigherEducationLevel } from "@/domains/printing/document-header";
import { useEffect } from "react";
import { getPedagogicalReportAction } from "@/domains/pedagogie/actions/analytics.actions";
import {
  getResultsWorkflowStatus,
  submitGrades,
  requestGradeCorrection,
  validateGradeControl,
  lockResults,
  publishResults,
  unlockResultsException
} from "@/domains/academics/actions/results-workflow.actions";
import { getCurrentUserAction } from "@/domains/auth/actions/session.actions";
import { GradeApprovalWorkflowBar, WorkflowStatus } from "@/domains/academics/components/GradeApprovalWorkflowBar";
import StudentGradesView from "./components/StudentGradesView";
import OfficialDocumentHeader from "@/domains/printing/components/OfficialDocumentHeader";
import { useOfflineMutation } from "@/hooks/use-offline-mutation";
import { cacheGradingGrid, getCachedGradingGrid } from "@/infrastructure/local-db/cache";

export default function AcademicResultsPage() {
  const { mutate, isOnline: isOnlineMutation } = useOfflineMutation<{ grades: any[] }>();
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("entry"); // "entry", "matrix" or "reports"
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [level, setLevel] = useState("Lycée");
  const [gradingScale, setGradingScale] = useState<any[]>([]);
  const [matrixData, setMatrixData] = useState<any>(null);
  const [activeFilters, setActiveFilters] = useState<any>(null);
  const [activeCoef, setActiveCoef] = useState(1);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [headerConfig, setHeaderConfig] = useState<any>(null);
  const [isLocal, setIsLocal] = useState(false);
  const [pedagogicalReportData, setPedagogicalReportData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [workflowStatus, setWorkflowStatus] = useState<string>("BROUILLON");
  const [workflowRow, setWorkflowRow] = useState<any>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const user = await getCurrentUserAction();
        setCurrentUser(user);
      } catch (e) {
        console.warn("Failed to load user in client:", e);
      }
    }
    loadUser();
  }, []);

  const isStudent = Boolean(
    currentUser?.studentId ||
    currentUser?.student_id ||
    currentUser?.role?.roleName?.toLowerCase().includes("eleve") ||
    currentUser?.role?.roleName?.toLowerCase().includes("élève") ||
    currentUser?.role?.roleName?.toLowerCase().includes("etudiant") ||
    currentUser?.role?.roleName?.toLowerCase().includes("étudiant") ||
    currentUser?.role?.roleName?.toLowerCase().includes("student")
  );

  const roleName = String(currentUser?.role?.roleName || currentUser?.role || "").toLowerCase();
  const isSuperAdmin = Boolean(
    currentUser?.superAdmin === true ||
    currentUser?.superAdmin === 1 ||
    roleName.includes("super")
  );
  const isDirecteur = Boolean(
    isSuperAdmin ||
    currentUser?.admin === true ||
    currentUser?.admin === 1 ||
    roleName.includes("admin") ||
    roleName.includes("direct") ||
    roleName.includes("fondateur") ||
    roleName.includes("principal") ||
    roleName.includes("proviseur") ||
    roleName.includes("promoteur")
  );
  const isCenseur = Boolean(
    isDirecteur ||
    roleName.includes("censeur") ||
    roleName.includes("responsable") ||
    roleName.includes("études") ||
    roleName.includes("etudes") ||
    roleName.includes("surveillant")
  );
  const isEnseignant = Boolean(
    roleName.includes("enseignant") ||
    roleName.includes("professeur") ||
    roleName.includes("teacher") ||
    roleName.includes("formateur")
  );

  useEffect(() => {
    async function loadScale() {
      const res = await getGradingAppreciations();
      const data = ((res as any).data?.data || (res as any).data || []) as any[];
      if (data) setGradingScale(data);
    }
    loadScale();
  }, []);

  useEffect(() => {
    async function loadHeaderConfig() {
      const res = await getDocumentHeaderConfig();
      if (res?.data) {
        setHeaderConfig(res.data);
      }
    }
    loadHeaderConfig();
  }, []);

  // Auto-load matrix data when switching to broadsheet if filters are set but matrix not loaded
  useEffect(() => {
    if ((view === "matrix" || view === "reports") && activeFilters && !matrixData) {
      (async () => {
        setLoading(true);
        try {
          const result = await getBroadsheetMatrix({
            classId: activeFilters.classId,
            sessionId: activeFilters.sessionId,
            term: activeFilters.period,
          });
          if (result?.data) setMatrixData(result.data);
        } catch (err) {
          console.error("[auto-load matrix]", err);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [view, activeFilters]);

  const handleLoad = async (filters: any) => {
    console.log("[handleLoad] Starting with filters:", filters);
    setLoading(true);
    setLevel(filters.level);
    setActiveFilters(filters);

    // Fetch level-specific document header config
    if (filters.level) {
      getDocumentHeaderConfig(filters.level).then((res) => {
        if (res?.data) {
          setHeaderConfig(res.data);
        }
      }).catch(console.warn);
    }

    // Reset old data
    setStudents([]);
    setMatrixData(null);
    setIsLocal(false);

    const cacheKey = `${filters.classId}-${filters.subjectId}-${filters.sessionId}-${filters.period}`;
    const matrixCacheKey = `matrix-${filters.classId}-${filters.sessionId}-${filters.period}`;

    try {
      // 1. Fetch entry grid and matrix data in parallel
      const [gridResult, matrixResult] = await Promise.all([
        navigator.onLine
          ? getGradingGrid({
              classId: filters.classId,
              subjectId: filters.subjectId,
              sessionId: filters.sessionId,
              term: filters.period,
            }).catch(e => {
              console.warn("Failed to get grading grid from server:", e);
              return null;
            })
          : Promise.resolve(null),
        navigator.onLine
          ? getBroadsheetMatrix({
              classId: filters.classId,
              sessionId: filters.sessionId,
              term: filters.period,
            }).catch(e => {
              console.warn("Failed to get broadsheet matrix from server:", e);
              return null;
            })
          : Promise.resolve(null),
      ]);

      if (gridResult?.data) {
        const studentData = gridResult.data;
        const resObj = gridResult as any;
        if (Array.isArray(studentData)) {
          setStudents(studentData);
          const effectiveLevel = resObj.level || filters.level;
          setLevel(effectiveLevel);
          setActiveCoef(resObj.activeCoefficient || 1);
          
          if (effectiveLevel) {
            getDocumentHeaderConfig(effectiveLevel).then((res) => {
              if (res?.data) {
                setHeaderConfig(res.data);
              }
            }).catch(console.warn);
          }
          
          try {
            await cacheGradingGrid(Number(filters.classId), Number(filters.subjectId), Number(filters.sessionId), filters.period, {
              data: studentData,
              level: resObj.level,
              coefficient: resObj.activeCoefficient,
            });
            const { cacheReferenceItems } = await import("@/infrastructure/local-db/references");
            await cacheReferenceItems("examResults" as any, [{ key: cacheKey, data: studentData, level: resObj.level, activeCoef: resObj.activeCoefficient }], "key");
          } catch (e) {
            console.warn("Failed to cache grading grid locally:", e);
          }
        }
      } else {
        try {
          const cachedGrid = await getCachedGradingGrid(Number(filters.classId), Number(filters.subjectId), Number(filters.sessionId), filters.period);
          if (cachedGrid && cachedGrid.data?.length > 0) {
            setStudents(cachedGrid.data);
            setLevel(cachedGrid.level || filters.level);
            setActiveCoef(cachedGrid.coefficient || 1);
            setIsLocal(true);
            toast.info("Affichage des notes locales (hors-ligne).");
          } else {
            const { getCachedReferenceItems } = await import("@/infrastructure/local-db/references");
            const cachedList = await getCachedReferenceItems<any>("examResults" as any);
            const match = cachedList.find((c: any) => c.key === cacheKey);
            if (match) {
              setStudents(match.data);
              setLevel(match.level || filters.level);
              setActiveCoef(match.activeCoef || 1);
              setIsLocal(true);
              toast.info("Affichage des notes locales (hors-ligne).");
            } else {
              toast.warning("Aucune donnée locale en cache pour cette sélection.");
            }
          }
        } catch (e) {
          console.warn("Failed to load cached grading grid:", e);
        }
      }

      if (matrixResult?.data) {
        setMatrixData(matrixResult.data);
        try {
          const { cacheReferenceItems } = await import("@/infrastructure/local-db/references");
          await cacheReferenceItems("examResults" as any, [{ key: matrixCacheKey, data: matrixResult.data }], "key");
        } catch (e) {
          console.warn("Failed to cache matrix locally:", e);
        }
      } else {
        try {
          const { getCachedReferenceItems } = await import("@/infrastructure/local-db/references");
          const cachedList = await getCachedReferenceItems<any>("examResults" as any);
          const match = cachedList.find((c: any) => c.key === matrixCacheKey);
          if (match) {
            setMatrixData(match.data);
            setIsLocal(true);
          }
        } catch (e) {
          console.warn("Failed to load cached matrix:", e);
        }
      }

      // 3. Fetch Pedagogical Report Data if online
      let pedReportResult: any = null;
      const pedReportCacheKey = `pedReport-${filters.classId}-${filters.subjectId}-${filters.sessionId}-${filters.period}`;
      if (navigator.onLine) {
        try {
          pedReportResult = await getPedagogicalReportAction({
            classId: Number(filters.classId),
            subjectId: filters.subjectId !== "All" && filters.subjectId ? Number(filters.subjectId) : undefined,
            sessionId: Number(filters.sessionId),
            period: filters.period,
            level: filters.level
          });
        } catch (e) {
          console.warn("Failed to get pedagogical report data from server:", e);
        }
      }

      if (pedReportResult?.success && pedReportResult.data) {
        setPedagogicalReportData(pedReportResult.data);
        try {
          const { cacheReferenceItems } = await import("@/infrastructure/local-db/references");
          await cacheReferenceItems("examResults" as any, [{ key: pedReportCacheKey, data: pedReportResult.data }], "key");
        } catch (e) {
          console.warn("Failed to cache pedagogical report locally:", e);
        }
      } else {
        try {
          const { getCachedReferenceItems } = await import("@/infrastructure/local-db/references");
          const cachedList = await getCachedReferenceItems<any>("examResults" as any);
          const match = cachedList.find((c: any) => c.key === pedReportCacheKey);
          if (match) {
            setPedagogicalReportData(match.data);
          }
        } catch (e) {
          console.warn("Failed to load cached pedagogical report:", e);
        }
      }

      // 4. Fetch active workflow status
      try {
        const wfRes = await getResultsWorkflowStatus({
          sessionId: Number(filters.sessionId),
          period: filters.period,
          classId: Number(filters.classId),
          subjectId: filters.subjectId !== "All" && filters.subjectId ? Number(filters.subjectId) : undefined
        });
        const row = (wfRes as any)?.data?.data || (wfRes as any)?.data;
        if (row && row.status) {
          setWorkflowStatus(row.status);
          setWorkflowRow(row);
        } else {
          setWorkflowStatus("BROUILLON");
          setWorkflowRow(null);
        }
      } catch (e) {
        console.warn("Failed to load results workflow status:", e);
      }
    } catch (err) {
      console.error("[handleLoad] Execution error:", err);
      toast.error("Une erreur critique est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    if (!activeFilters) return;
    if (workflowStatus === "VERROUILLE" || workflowStatus === "PUBLIE" || workflowStatus === "ARCHIVE") {
      toast.error("Modification impossible", {
        description: "Les notes sont verrouillées, publiées ou archivées pour cette période."
      });
      return;
    }
    setLoading(true);
    const toastId = toast.loading("Enregistrement des notes en cours... Veuillez patienter.");

    const resultsToSave = data.map((r: any) => ({
      studentId: Number(r.studentId),
      subjectId: Number(activeFilters.subjectId),
      classId: Number(activeFilters.classId),
      sessionId: Number(activeFilters.sessionId),
      term: activeFilters.period,
      classWorkScore: parseFloat(r.classWork) || 0,
      examScore: parseFloat(r.examNote) || 0,
      totalScore: r.total,
      coefficient: activeCoef,
      weightedScore: r.weighted,
      absences: r.absents || 0,
      observation: r.observation || "",
      appreciation: r.appreciation || "",
      rank: r.rank || "-"
    }));

    // Immediately cache locally so offline state is 100% updated in browser
    try {
      await cacheGradingGrid(
        Number(activeFilters.classId),
        Number(activeFilters.subjectId),
        Number(activeFilters.sessionId),
        activeFilters.period,
        { data, level, coefficient: activeCoef }
      );
    } catch (e) {
      console.warn("Failed to update local cache during save:", e);
    }

    try {
      const idempotencyKey = `studentResults:${activeFilters.classId}_${activeFilters.subjectId}_${activeFilters.sessionId}_${activeFilters.period}`;
      const result = await mutate(
        { grades: resultsToSave },
        {
          targetTable: "studentResults",
          onlineAction: async (p) => saveStudentGrades(p.grades),
          entity: "studentResults",
          entityId: `${activeFilters.classId}_${activeFilters.subjectId}_${activeFilters.period}`,
          idempotencyKey,
        }
      );

      if (result.success) {
        if (result.fromCloud) {
          setIsLocal(false);
          toast.success("Succès du ترحيل !", {
            id: toastId,
            description: "La grille de notes a été enregistrée et synchronisée avec le serveur cloud.",
            duration: 5000
          });
        } else {
          setIsLocal(true);
          toast.warning("Notes enregistrées localement (Mode Hors-Ligne)", {
            id: toastId,
            description: "Vos notes sont sauvegardées en sécurité sur cet appareil. Elles seront synchronisées dès que la connexion sera rétablie 📶.",
            duration: 6000
          });
        }
      } else {
        toast.error("Erreur lors de l'enregistrement", {
          id: toastId,
          description: result.error || "Une erreur est survenue lors de la communication avec le serveur.",
          duration: 5000
        });
      }
    } catch (err: any) {
      toast.error("Erreur critique d'enregistrement", {
        id: toastId,
        description: err?.message || "Impossible d'enregistrer les notes.",
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintBulletin = async (studentId: number) => {
    if (!activeFilters) return;

    setLoading(true);
    try {
      const response = await getStudentBulletinData(studentId, activeFilters.sessionId, activeFilters.period);
      if (response) {
        if (response.error) {
          toast.error(response.error);
          return;
        }

        const data = (response as any).data;

        if (!data || !data.results || data.results.length === 0) {
          toast.warning("Attention: Aucune note trouvée pour cet élève sur cette période.");
        }
        setPreviewData(data);
        setShowPreview(true);
      }
    } catch (err: any) {
      toast.error("Erreur de chargement", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintAllBulletins = async () => {
    if (!activeFilters) return;
    
    setLoading(true);
    try {
      const response = await getBatchBulletinData(activeFilters.classId, activeFilters.sessionId, activeFilters.period);
      if (response && response.data) {
        const batchData = response.data as any;
        if (batchData.length === 0) {
          toast.warning("Aucune donnée à imprimer.");
          return;
        }

        toast.success(`Préparation de ${batchData.length} bulletins...`);
        
        for (const studentData of batchData) {
          if (studentData.results && studentData.results.length > 0) {
            const studentLvl = inferEducationalLevel({
              educationalLevel: studentData.student?.educationalLevel,
              className: studentData.student?.classe,
              defaultLevel: activeFilters?.level || "Lycée"
            });
            const activeHeader = studentData.headerConfig || headerConfig;
            if (isHigherEducationLevel(studentLvl)) {
              await generateReleveNotesPDF({ ...studentData, headerConfig: activeHeader });
            } else {
              await generateBulletinPDF({ ...studentData, headerConfig: activeHeader });
            }
          }
        }
        
        toast.success("Tous les bulletins ont été générés !");
      } else if (response && response.error) {
        toast.error(response.error);
      }
    } catch (err: any) {
      toast.error("Erreur lors de l'impression groupée", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPV = async () => {
    if (!activeFilters || !matrixData) return;
    setLoading(true);
    try {
      const classInfo = activeFilters.className || `Classe_${activeFilters.classId}`;
      await generatePVMatrixPDF(matrixData, { className: classInfo, headerConfig }, activeFilters);
      toast.success("PV généré avec succès !");
    } catch (err: any) {
      toast.error("Erreur d'impression", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleExportResultsReport = async () => {
    if (!activeFilters) {
      toast.warning("Veuillez charger une classe avant de générer le rapport.");
      return;
    }
    if (!matrixData && students.length === 0) {
      toast.warning("Aucune donnée disponible pour le rapport.");
      return;
    }

    setLoading(true);
    try {
      await generateResultsPedagogicalReportPDF({
        matrixData,
        students,
        filters: activeFilters,
        headerConfig,
        isOffline: isLocal || !navigator.onLine,
      });
      toast.success("Rapport pédagogique généré avec succès !");
    } catch (err: any) {
      toast.error("Erreur PDF", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleConsolidateGrades = async () => {
    if (!activeFilters?.classId) {
      toast.error("Veuillez sélectionner une classe d'abord.");
      return;
    }
    setLoading(true);
    const toastId = toast.loading("Consolidation des devoirs et calcul des moyennes en cours...");
    try {
      const { consolidateClassTermGradesAction } = await import("@/domains/academics/actions/calculations.actions");
      const res = await consolidateClassTermGradesAction({
        classId: Number(activeFilters.classId),
        sessionId: Number(activeFilters.sessionId),
        term: activeFilters.period,
      });

      if (res.success && res.data) {
        const d = res.data;
        toast.success("Consolidation terminée avec succès !", {
          id: toastId,
          description: `${d.studentsCount} élèves consolidés • Moyenne classe : ${d.classAverage}/20 • Taux de réussite : ${d.passRate}%`,
          duration: 6000,
        });
        await handleLoad(activeFilters);
      } else {
        toast.error("Erreur de consolidation", {
          id: toastId,
          description: res.error || (res.data as any)?.error || "Échec du calcul automatique.",
        });
      }
    } catch (e: any) {
      toast.error("Erreur critique", { id: toastId, description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const hasLoadedData = view === "entry"
    ? students.length > 0
    : view === "reports"
      ? Boolean(matrixData || students.length > 0 || loading)
      : Boolean(matrixData || loading);

  if (isStudent) {
    return (
      <div className="p-4 md:p-8 animate-in fade-in duration-500">
        <StudentGradesView currentUser={currentUser} />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
        <div className="flex items-start gap-4">
          <div className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-[1.5rem] text-white shadow-lg shadow-indigo-200">
            <GraduationCap size={28} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Notes & Résultats
              </h1>
              {isLocal && (
                <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-widest rounded-xl animate-pulse">
                  Données locales
                </span>
              )}
              <Sparkles size={20} className="text-indigo-500" />
              {activeFilters && (
                <span className={`ml-3 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  workflowStatus === "VERROUILLE" || workflowStatus === "PUBLIE" || workflowStatus === "ARCHIVE"
                    ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                    : "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20"
                }`}>
                  Statut: {workflowStatus.replace("_", " ")}
                </span>
              )}
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium ml-1">
              Gestion académique, saisie des notes et matrice des résultats.
            </p>
            {headerConfig && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl">
                  <Sparkles size={13} className="text-indigo-500" />
                  En-tête appliqué ({level}) : <strong className="font-black">{headerConfig.schoolName}</strong>
                  {headerConfig.activeLevelProfileId && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600/15 font-black uppercase text-indigo-700 dark:text-indigo-200">
                      Profil Niveau & Fusion
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {activeFilters?.classId && (
            <Button
              onClick={handleConsolidateGrades}
              disabled={loading}
              className="h-12 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
              title="Consolider automatiquement les devoirs et examens pour calculer les moyennes et rangs"
            >
              <Sparkles size={16} />
              Calculer les Moyennes
            </Button>
          )}

          <Link href="/dashboard/academics/devoirs">
            <Button className="h-12 px-5 rounded-xl bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm cursor-pointer">
              <ClipboardCheck size={16} />
              Saisie des Devoirs (DS)
            </Button>
          </Link>

          <Tabs value={view} onValueChange={setView} className="bg-slate-100/80 dark:bg-slate-900/80 p-1.5 rounded-[1.25rem] border border-slate-200 dark:border-slate-800">
            <TabsList className="bg-transparent border-none">
              <TabsTrigger
                value="entry"
                className="rounded-xl px-5 h-10 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 text-slate-600 dark:text-slate-400 data-[state=active]:shadow-sm font-bold flex items-center gap-2 text-sm"
              >
                <LayoutGrid size={16} /> Saisie des Notes
              </TabsTrigger>
              <TabsTrigger
                value="matrix"
                className="rounded-xl px-5 h-10 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 text-slate-600 dark:text-slate-400 data-[state=active]:shadow-sm font-bold flex items-center gap-2 text-sm"
              >
                <BarChart3 size={16} /> Broadsheet
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="rounded-xl px-5 h-10 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 text-slate-600 dark:text-slate-400 data-[state=active]:shadow-sm font-bold flex items-center gap-2 text-sm"
              >
                <FileText size={16} /> Rapports
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <AcademicFilters onLoad={handleLoad} loading={loading} />

      {/* World-Class Grade Approval Workflow Stepper & Actions */}
      {activeFilters && (
        <GradeApprovalWorkflowBar
          status={(workflowStatus as WorkflowStatus) || "BROUILLON"}
          workflowRow={workflowRow}
          totalStudents={students.length}
          gradedStudents={
            students.filter(
              (s) =>
                s.moyenneClasse != null ||
                s.noteCompo != null ||
                s.noteEval != null ||
                s.total40 != null ||
                s.moy20 != null
            ).length
          }
          isEnseignant={isEnseignant}
          isCenseur={isCenseur}
          isDirecteur={isDirecteur}
          isSuperAdmin={isSuperAdmin}
          onSubmitGrades={async () => {
            setLoading(true);
            try {
              const res = await submitGrades({
                sessionId: activeFilters.sessionId,
                period: activeFilters.period,
                classId: activeFilters.classId,
                subjectId:
                  activeFilters.subjectId !== "All" && activeFilters.subjectId
                    ? Number(activeFilters.subjectId)
                    : undefined,
              });
              if (res?.success) {
                setWorkflowStatus("SAISIE_TERMINEE");
                toast.success("Notes soumises pour contrôle avec succès.");
                return true;
              } else if (res?.error) {
                toast.error(res.error);
              }
              return false;
            } catch (err: any) {
              toast.error(err?.message || "Erreur de soumission");
              return false;
            } finally {
              setLoading(false);
            }
          }}
          onRequestCorrection={async (observation) => {
            setLoading(true);
            try {
              const res = await requestGradeCorrection({
                sessionId: activeFilters.sessionId,
                period: activeFilters.period,
                classId: activeFilters.classId,
                subjectId:
                  activeFilters.subjectId !== "All" && activeFilters.subjectId
                    ? Number(activeFilters.subjectId)
                    : undefined,
                observation,
              });
              if (res?.success) {
                setWorkflowStatus("CORRECTION_DEMANDEE");
                setWorkflowRow({ observation });
                toast.success("Demande de correction transmise.");
                return true;
              } else if (res?.error) {
                toast.error(res.error);
              }
              return false;
            } catch (err: any) {
              toast.error(err?.message || "Erreur lors de la demande");
              return false;
            } finally {
              setLoading(false);
            }
          }}
          onValidateControl={async () => {
            setLoading(true);
            try {
              const res = await validateGradeControl({
                sessionId: activeFilters.sessionId,
                period: activeFilters.period,
                classId: activeFilters.classId,
                subjectId:
                  activeFilters.subjectId !== "All" && activeFilters.subjectId
                    ? Number(activeFilters.subjectId)
                    : undefined,
              });
              if (res?.success) {
                setWorkflowStatus("CONTROLE_PEDAGOGIQUE");
                toast.success("Contrôle pédagogique validé.");
                return true;
              } else if (res?.error) {
                toast.error(res.error);
              }
              return false;
            } catch (err: any) {
              toast.error(err?.message || "Erreur de validation");
              return false;
            } finally {
              setLoading(false);
            }
          }}
          onLockResults={async () => {
            setLoading(true);
            try {
              const res = await lockResults({
                sessionId: activeFilters.sessionId,
                period: activeFilters.period,
                classId: activeFilters.classId,
                subjectId:
                  activeFilters.subjectId !== "All" && activeFilters.subjectId
                    ? Number(activeFilters.subjectId)
                    : undefined,
              });
              if (res?.success) {
                setWorkflowStatus("VERROUILLE");
                toast.success("Grille de notes verrouillée.");
                return true;
              } else if (res?.error) {
                toast.error(res.error);
              }
              return false;
            } catch (err: any) {
              toast.error(err?.message || "Erreur de verrouillage");
              return false;
            } finally {
              setLoading(false);
            }
          }}
          onPublishResults={async () => {
            setLoading(true);
            try {
              const res = await publishResults({
                sessionId: activeFilters.sessionId,
                period: activeFilters.period,
                classId: activeFilters.classId,
                subjectId:
                  activeFilters.subjectId !== "All" && activeFilters.subjectId
                    ? Number(activeFilters.subjectId)
                    : undefined,
              });
              if (res?.success) {
                setWorkflowStatus("PUBLIE");
                toast.success("Résultats et bulletins publiés avec succès !");
                return true;
              } else if (res?.error) {
                toast.error(res.error);
              }
              return false;
            } catch (err: any) {
              toast.error(err?.message || "Erreur de publication");
              return false;
            } finally {
              setLoading(false);
            }
          }}
          onUnlockException={async (observation) => {
            setLoading(true);
            try {
              const res = await unlockResultsException({
                sessionId: activeFilters.sessionId,
                period: activeFilters.period,
                classId: activeFilters.classId,
                subjectId:
                  activeFilters.subjectId !== "All" && activeFilters.subjectId
                    ? Number(activeFilters.subjectId)
                    : undefined,
                observation,
              });
              if (res?.success) {
                setWorkflowStatus("BROUILLON");
                setWorkflowRow({ observation });
                toast.success("Déverrouillage exceptionnel effectué.");
                return true;
              } else if (res?.error) {
                toast.error(res.error);
              }
              return false;
            } catch (err: any) {
              toast.error(err?.message || "Erreur de déverrouillage");
              return false;
            } finally {
              setLoading(false);
            }
          }}
          loading={loading}
        />
      )}

      <AnimatePresence mode="wait">
        {hasLoadedData ? (
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {view === "entry" ? (
              <GradesEntryGrid
                students={students}
                gradingScale={gradingScale}
                onSave={handleSave}
                onPrintBulletin={handlePrintBulletin}
                level={level}
                coefficient={activeCoef}
                readOnly={
                  workflowStatus === "VERROUILLE" ||
                  workflowStatus === "PUBLIE" ||
                  workflowStatus === "ARCHIVE" ||
                  (isEnseignant &&
                    workflowStatus !== "BROUILLON" &&
                    workflowStatus !== "CORRECTION_DEMANDEE")
                }
                loading={loading}
              />
            ) : view === "matrix" ? (
              <BroadsheetMatrix
                data={matrixData}
                onPrintBulletin={handlePrintBulletin}
                onPrintAll={handlePrintAllBulletins}
                onPrintPV={handlePrintPV}
                activeFilters={activeFilters}
                headerConfig={headerConfig}
              />
            ) : (
              <ResultsReportsPanel
                matrixData={matrixData}
                students={students}
                activeFilters={activeFilters}
                isLocal={isLocal}
                loading={loading}
                onPrintPV={handlePrintPV}
                onPrintAll={handlePrintAllBulletins}
                onExportPDF={handleExportResultsReport}
                pedagogicalReportData={pedagogicalReportData}
                headerConfig={headerConfig}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200"
          >
            <div className="p-6 bg-slate-50 rounded-full w-fit mx-auto mb-4">
              <GraduationCap size={48} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">En attente de chargement</h3>
            <p className="text-slate-500 mt-2 font-medium max-w-md mx-auto">
              Sélectionnez les filtres ci-dessus et cliquez sur "Charger la grille".
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulletin Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-5xl md:max-w-6xl w-[94vw] max-h-[92vh] bg-white dark:bg-[#0E1017] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 md:p-8 overflow-y-auto shadow-2xl space-y-6">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-xl text-[11px] font-black uppercase tracking-widest">
                    {(() => {
                      const lvl = inferEducationalLevel({
                        educationalLevel: previewData?.student?.educationalLevel,
                        className: previewData?.student?.classe,
                        defaultLevel: activeFilters?.level || "Lycée"
                      });
                      if (isHigherEducationLevel(lvl)) return "Aperçu du Relevé Officiel LMD";
                      if (lvl === "College") return "Aperçu du Bulletin Officiel (Collège)";
                      if (lvl === "Primaire") return "Aperçu du Carnet de Notes (Primaire)";
                      return `Aperçu du Bulletin Officiel (${lvl})`;
                    })()}
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {previewData?.session || "Année Scolaire"} • {previewData?.term || "Période"}
                  </span>
                </div>
                <DialogTitle className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
                  {previewData?.student?.nomEtudiant || "Nom de l'élève"}
                </DialogTitle>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">
                  Matricule : <span className="text-slate-900 dark:text-slate-200 font-mono font-black">{previewData?.student?.numAdmission || "N/A"}</span> | Classe : <span className="text-indigo-600 dark:text-indigo-400 font-black">{previewData?.student?.classe || "N/A"}</span> {previewData?.totalStudents ? `(${previewData.totalStudents} élèves)` : ""}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => {
                    const isOffline = !navigator.onLine;
                    const studentLvl = inferEducationalLevel({
                      educationalLevel: previewData?.student?.educationalLevel,
                      className: previewData?.student?.classe,
                      defaultLevel: activeFilters?.level || "Lycée"
                    });
                    const isHigherEd = isHigherEducationLevel(studentLvl);
                    const activeHeader = previewData?.headerConfig || headerConfig;
                    if (isHigherEd) {
                      generateReleveNotesPDF({ ...previewData, headerConfig: activeHeader, isOffline });
                    } else {
                      generateBulletinPDF({ ...previewData, headerConfig: activeHeader, isOffline });
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 h-12 rounded-2xl shadow-lg shadow-indigo-500/20 gap-2 transition-all text-xs uppercase tracking-wider"
                >
                  <Printer size={18} />
                  Télécharger / Imprimer (PDF)
                </Button>
              </div>
            </div>
          </DialogHeader>

          {previewData && (
            <div className="space-y-6 mt-2">
              {/* Level-specific Document Header Profile Preview */}
              <div className="p-6 bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-sm">
                <OfficialDocumentHeader config={previewData?.headerConfig || headerConfig} variant="compact" />
              </div>
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* 1. Moyenne General */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Moyenne Générale</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className={cn(
                      "text-3xl font-black tracking-tight",
                      (previewData.summary?.average ?? 0) >= 14 ? "text-emerald-600 dark:text-emerald-400" :
                      (previewData.summary?.average ?? 0) >= 12 ? "text-indigo-600 dark:text-indigo-400" :
                      (previewData.summary?.average ?? 0) >= 10 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                    )}>
                      {previewData.summary?.average !== undefined && previewData.summary?.average !== null ? Number(previewData.summary.average).toFixed(2) : "-"}
                    </span>
                    <span className="text-xs font-bold text-slate-400">/ 20</span>
                  </div>
                </div>

                {/* 2. Rang */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rang dans la Classe</span>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {previewData.summary?.rank ? `${previewData.summary.rank}${previewData.summary.rank === 1 ? "er" : "ème"}` : "-"}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {previewData.totalStudents ? `/ ${previewData.totalStudents} élèves` : ""}
                    </span>
                  </div>
                </div>

                {/* 3. Statistique Classe */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Statistiques Classe</span>
                  <div className="space-y-1 mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-semibold">Moy. Classe:</span>
                      <span className="font-black text-slate-900 dark:text-white">{previewData.summary?.classAverage ? Number(previewData.summary.classAverage).toFixed(2) : "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-semibold">Min / Max:</span>
                      <span className="font-black text-slate-900 dark:text-white">{previewData.summary?.minAverage ? Number(previewData.summary.minAverage).toFixed(2) : "-"} / {previewData.summary?.maxAverage ? Number(previewData.summary.maxAverage).toFixed(2) : "-"}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Mention / Appréciation */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Appréciation & Mention</span>
                  <div className="mt-2">
                    <span className="inline-block px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 text-xs font-black uppercase tracking-wider">
                      {previewData.summary?.mentions || previewData.summary?.decision || "Satisfaisant"}
                    </span>
                  </div>
                </div>
              </div>

              {/* High-Contrast Grades Table */}
              <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[11px] uppercase font-black tracking-wider">
                        <th className="py-4 px-4 text-left">Discipline / Matière</th>
                        <th className="py-4 px-3 text-center">Coef</th>
                        <th className="py-4 px-3 text-center">Note CC / 20</th>
                        <th className="py-4 px-3 text-center">Note Ex / 20</th>
                        <th className="py-4 px-4 text-center">Moyenne / 20</th>
                        <th className="py-4 px-4 text-center">Points</th>
                        <th className="py-4 px-4 text-left">Appréciation Enseignant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-[#131622]">
                      {previewData.results?.map((r: any, idx: number) => {
                        const avg = r.average !== undefined && r.average !== null ? Number(r.average) : (r.totalScore ?? null);
                        const coef = r.coefficient || 1;
                        const points = avg !== null ? (avg * coef).toFixed(2) : "-";
                        return (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">
                              {r.subject?.subjectName || r.subjectName || "Matière"}
                              {r.teacherName && (
                                <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                                  Prof: {r.teacherName}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                              {coef}
                            </td>
                            <td className="py-3.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                              {r.classWorkScore !== undefined && r.classWorkScore !== null ? Number(r.classWorkScore).toFixed(2) : "-"}
                            </td>
                            <td className="py-3.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                              {r.examScore !== undefined && r.examScore !== null ? Number(r.examScore).toFixed(2) : "-"}
                            </td>
                            <td className="py-3.5 px-4 text-center font-black">
                              <span className={cn(
                                "inline-block px-2.5 py-1 rounded-lg text-xs font-black",
                                avg === null ? "text-slate-400" :
                                avg >= 14 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" :
                                avg >= 10 ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400" :
                                "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                              )}>
                                {avg !== null ? avg.toFixed(2) : "-"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-black text-slate-900 dark:text-slate-100">
                              {points}
                            </td>
                            <td className="py-3.5 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 italic">
                              {r.appreciation || "Travail régulier"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-100 dark:bg-slate-900/80 font-black text-slate-900 dark:text-white text-xs border-t-2 border-slate-300 dark:border-slate-700">
                      <tr>
                        <td className="py-4 px-4 uppercase tracking-wider">TOTAL GÉNÉRAL</td>
                        <td className="py-4 px-3 text-center text-indigo-600 dark:text-indigo-400 font-black text-sm">{previewData.summary?.totalCoef || "-"}</td>
                        <td className="py-4 px-3 text-center">—</td>
                        <td className="py-4 px-3 text-center">—</td>
                        <td className="py-4 px-4 text-center text-indigo-600 dark:text-indigo-400 text-sm font-black">
                          {previewData.summary?.average !== undefined ? Number(previewData.summary.average).toFixed(2) : "-"} / 20
                        </td>
                        <td className="py-4 px-4 text-center text-indigo-600 dark:text-indigo-400 text-sm font-black">
                          {previewData.summary?.totalScore !== undefined ? Number(previewData.summary.totalScore).toFixed(2) : "-"}
                        </td>
                        <td className="py-4 px-4 text-slate-500 font-semibold italic">Résultats arrêtés au conseil de classe</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Signatures & Footer info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <span className="uppercase font-black text-slate-800 dark:text-slate-200">Le Professeur Principal</span>
                  <div className="h-14 mt-2 flex items-center justify-center text-slate-400 italic text-[11px]">
                    (Signature &amp; Observations)
                  </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <span className="uppercase font-black text-slate-800 dark:text-slate-200">Le Chef d'Établissement</span>
                  <div className="h-14 mt-2 flex items-center justify-center text-slate-400 italic text-[11px]">
                    (Cachet et Signature Officielle)
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button variant="outline" onClick={() => setShowPreview(false)} className="rounded-xl font-bold">
                  Fermer
                </Button>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => {
                      const isOffline = !navigator.onLine;
                      const studentLvl = inferEducationalLevel({
                        educationalLevel: previewData?.student?.educationalLevel,
                        className: previewData?.student?.classe,
                        defaultLevel: activeFilters?.level || "Lycée"
                      });
                      const isHigherEd = isHigherEducationLevel(studentLvl);
                      const activeHeader = previewData?.headerConfig || headerConfig;
                      if (isHigherEd) {
                        generateReleveNotesPDF({ ...previewData, headerConfig: activeHeader, isOffline });
                      } else {
                        generateBulletinPDF({ ...previewData, headerConfig: activeHeader, isOffline });
                      }
                      setShowPreview(false);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 h-12 rounded-2xl shadow-lg shadow-indigo-500/20 gap-2 text-xs uppercase tracking-wider"
                  >
                    <Printer size={18} />
                    Confirmer et Imprimer (PDF)
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
