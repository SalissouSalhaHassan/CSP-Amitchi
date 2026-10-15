"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Scale, ArrowLeft, CheckCircle2, 
  AlertTriangle, RefreshCw, Sparkles, Filter, 
  ShieldCheck, Printer, FileText, Download,
  Layers, School, GraduationCap, Search, Eye,
  Sun, Moon, Award, Activity, BookOpen, UserCheck, X, Building2, FileCheck, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  getLmdDeliberationCohort, 
  saveLmdDeliberation,
  saveLmdRattrapageGrade,
  getLmdAnnualDeliberation,
  saveLmdAnnualDeliberation
} from "@/domains/academics/actions/lmd.actions";
import { getClassDisplayName } from "@/domains/academics/utils/class-name";
import { useTheme } from "@/hooks/use-theme";
import { 
  generateLmdStudentRelevePDF, 
  generateLmdBatchRelevesPDF,
  getEctsGrade,
  LmdReleveParams
} from "@/domains/academics/utils/lmd-releve-generator";
import {
  generateLmdAnnualDeliberationPVPDF,
  generateLmdStudentAnnualRelevePDF,
  LmdAnnualParams,
  LmdAnnualStudent
} from "@/domains/academics/utils/lmd-annual-pv-generator";
import {
  generateLmdMinisterialPVPDF,
  MinisterialPVParams
} from "@/domains/academics/utils/lmd-ministerial-pv-generator";
import {
  generateDiplomaSupplementPDF,
  DiplomaSupplementParams
} from "@/domains/academics/utils/lmd-diploma-supplement-generator";
import {
  generateLmdOfficialDiplomaPDF,
  generateLmdAttestationReussitePDF,
  LmdDiplomaParams
} from "@/domains/academics/utils/lmd-diploma-generator";

type Props = {
  initialPrograms: any[];
  classes: any[];
  sections: any[];
  levels: any[];
  sessions: any[];
  periods?: any[];
  headerConfig?: any;
};

function normalizeFilterText(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getAcademicLevels(levels: any[], sections: any[]): string[] {
  if (levels && levels.length > 0) {
    return levels.map((l: any) => l.levelName || l.name || l);
  }
  const extracted = Array.from(new Set((sections || []).map((s: any) => s.educationalLevel || "Licence"))) as string[];
  return extracted.length > 0 ? extracted : ["Licence", "Master", "Lycée", "Collège", "Primaire"];
}

export default function DeliberationClient({
  initialPrograms,
  classes = [],
  sections = [],
  levels = [],
  sessions = [],
  periods = [],
  headerConfig = null,
}: Props) {
  const [programs] = useState(initialPrograms || []);
  const { isDark, toggleTheme } = useTheme();

  // 1. Session Académique (défaut sur session active)
  const activeSession = sessions.find((s) => s.isActive || s.status === "Actif") || sessions[0];
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    activeSession ? String(activeSession.id) : ""
  );

  // 2. Niveaux d'Études (Conforme settings?tab=academic & AcademicFilters)
  const academicLevels = useMemo(() => getAcademicLevels(levels, sections), [levels, sections]);
  
  // Prioritize "Licence" or "Master" for LMD Deliberation if available
  const defaultLevel = useMemo(() => {
    const foundUniv = academicLevels.find((l) => {
      const n = normalizeFilterText(l);
      return n.includes("licence") || n.includes("master") || n.includes("univ") || n.includes("super");
    });
    return foundUniv || academicLevels[0] || "Licence";
  }, [academicLevels]);

  const [selectedLevel, setSelectedLevel] = useState<string>(defaultLevel);

  // 3. Sections / Filières filtrées par Niveau (Logique exacte de AcademicFilters)
  const filteredSections = useMemo(() => {
    const selectedNorm = normalizeFilterText(selectedLevel);
    if (!selectedNorm) return sections;

    const isLevelMatch = (secLevel: string, targetLevel: string) => {
      const sNorm = normalizeFilterText(secLevel);
      const tNorm = normalizeFilterText(targetLevel);
      if (sNorm === tNorm) return true;

      const isUnivTarget = tNorm.includes("univ") || tNorm.includes("super") || tNorm.includes("licence") || tNorm.includes("lmd") || tNorm.includes("master") || tNorm.includes("doc");
      const isUnivSec = sNorm.includes("univ") || sNorm.includes("super") || sNorm.includes("licence") || sNorm.includes("lmd") || sNorm.includes("master") || sNorm.includes("doc");
      if (isUnivTarget && isUnivSec) return true;

      const isLyceeTarget = tNorm.includes("lyc") || tNorm.includes("sec");
      const isLyceeSec = sNorm.includes("lyc") || sNorm.includes("sec");
      if (isLyceeTarget && isLyceeSec) return true;

      const isCollegeTarget = tNorm.includes("colleg") || tNorm.includes("moyen");
      const isCollegeSec = sNorm.includes("colleg") || sNorm.includes("moyen");
      if (isCollegeTarget && isCollegeSec) return true;

      const isPrimTarget = tNorm.includes("prim") || tNorm.includes("matern") || tNorm.includes("elem");
      const isPrimSec = sNorm.includes("prim") || sNorm.includes("matern") || sNorm.includes("elem");
      if (isPrimTarget && isPrimSec) return true;

      return false;
    };

    return (sections || []).filter((s: any) => {
      return isLevelMatch(s.educationalLevel || "Licence", selectedLevel);
    });
  }, [selectedLevel, sections]);

  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    filteredSections.length > 0 ? String(filteredSections[0].id) : (sections[0] ? String(sections[0].id) : "")
  );

  // Auto-switch section when level changes
  useEffect(() => {
    if (filteredSections.length > 0) {
      const exists = filteredSections.some((s) => String(s.id) === selectedSectionId);
      if (!exists) {
        setSelectedSectionId(String(filteredSections[0].id));
      }
    } else {
      setSelectedSectionId("");
    }
  }, [selectedLevel, filteredSections]);

  const currentSection = sections.find((s) => String(s.id) === selectedSectionId);

  // 4. Promotions / Classes (filtrées strictement par sectionId comme dans AcademicFilters)
  const filteredClasses = useMemo(() => {
    if (!selectedSectionId) return classes;
    return classes.filter((c) => c.sectionId?.toString() === selectedSectionId);
  }, [selectedSectionId, classes]);

  const [selectedClassId, setSelectedClassId] = useState<string>(
    filteredClasses.length > 0 ? String(filteredClasses[0].id) : (classes[0] ? String(classes[0].id) : "")
  );

  // Auto-switch class when section changes
  useEffect(() => {
    if (filteredClasses.length > 0) {
      const exists = filteredClasses.some((c) => String(c.id) === selectedClassId);
      if (!exists) {
        setSelectedClassId(String(filteredClasses[0].id));
      }
    } else {
      setSelectedClassId("");
    }
  }, [selectedSectionId, filteredClasses]);

  const selectedClass = classes.find((c) => String(c.id) === selectedClassId);

  // 5. Semestres / Périodes dynamiques (Logique 100% conforme AcademicFilters & settings?tab=academic)
  const periodOptions = useMemo(() => {
    const normLevel = normalizeFilterText(selectedLevel);
    const isPrimaire = normLevel.includes("prim") || normLevel.includes("matern") || normLevel.includes("fonda") || normLevel.includes("elem");
    const isSuperior = 
      normLevel.includes("licence") || 
      normLevel.includes("lmd") || 
      normLevel.includes("master") || 
      normLevel.includes("doc") || 
      normLevel.includes("super") || 
      normLevel.includes("univ") ||
      (currentSection?.educationalLevel && (
        normalizeFilterText(currentSection.educationalLevel).includes("licence") ||
        normalizeFilterText(currentSection.educationalLevel).includes("master") ||
        normalizeFilterText(currentSection.educationalLevel).includes("univ") ||
        normalizeFilterText(currentSection.educationalLevel).includes("super")
      )) ||
      (selectedClass?.className && (
        /^l[1-3]/i.test(selectedClass.className) || 
        /^m[1-2]/i.test(selectedClass.className) ||
        /licence/i.test(selectedClass.className) ||
        /master/i.test(selectedClass.className)
      ));

    let sessionPeriods = (periods || []).filter((p: any) =>
      !p.sessionId || p.sessionId === 0 || String(p.sessionId) === "" || p.sessionId?.toString() === selectedSessionId
    );
    if (sessionPeriods.length === 0 && periods?.length > 0) {
      sessionPeriods = periods;
    }

    // 1. Primaire (3 Trimestres)
    if (isPrimaire) {
      const dbTrimestres = sessionPeriods.filter((p: any) =>
        p.periodType === "Trimestre" || String(p.name).toLowerCase().includes("trimestre")
      );
      if (dbTrimestres.length > 0) {
        return dbTrimestres.map((p: any) => ({ id: p.name, name: p.name, code: p.name }));
      }
      return [
        { id: "1er Trimestre", name: "1er Trimestre", code: "T1" },
        { id: "2ème Trimestre", name: "2ème Trimestre", code: "T2" },
        { id: "3ème Trimestre", name: "3ème Trimestre", code: "T3" },
      ];
    }

    // 2. Supérieur / Université LMD (Semestres S1 .. S14) - Identique à AcademicFilters
    if (isSuperior) {
      const dbSuperior = sessionPeriods.filter((p: any) =>
        p.periodType === "Semestre" || String(p.name).toLowerCase().includes("semest") || /^s\d+/i.test(p.name)
      );

      const superiorPresets = Array.from({ length: 14 }, (_, i) => {
        const num = i + 1;
        const code = `S${num}`;
        const label = `${num === 1 ? "1er" : `${num}ème`} Semestre (S${num})`;
        return { id: label, name: label, code };
      });

      if (dbSuperior.length > 0) {
        const dbList = dbSuperior.map((p: any) => {
          const m = p.name.match(/\d+/);
          const c = m ? `S${m[0]}` : p.name;
          return { id: p.name, name: p.name, code: c };
        });
        return dbList.length >= 6 ? dbList : superiorPresets;
      }
      return superiorPresets;
    }

    // 3. Système Séquentiel (si configuré dans settings)
    const dbSequences = sessionPeriods.filter((p: any) =>
      p.periodType === "Séquence" || String(p.name).toLowerCase().includes("séquence") || String(p.name).toLowerCase().includes("sequence")
    );
    if (dbSequences.length >= 2) {
      return dbSequences.map((p: any) => ({ id: p.name, name: p.name, code: p.name }));
    }

    // 4. Collège & Lycée (2 Semestres standard)
    const dbSemestres = sessionPeriods.filter((p: any) =>
      p.periodType === "Semestre" || String(p.name).toLowerCase().includes("semest")
    );

    if (dbSemestres.length > 0) {
      const collegePeriods = dbSemestres
        .filter((p: any) => {
          const n = String(p.name).toLowerCase();
          return n.includes("1") || n.includes("2") || n.includes("premiere") || n.includes("deuxieme");
        })
        .map((p: any) => ({ id: p.name, name: p.name, code: p.name }));

      if (collegePeriods.length >= 2) {
        return collegePeriods.slice(0, 2);
      }
    }

    return [
      { id: "1er Semestre", name: "1er Semestre (S1)", code: "S1" },
      { id: "2ème Semestre", name: "2ème Semestre (S2)", code: "S2" },
    ];
  }, [selectedLevel, selectedSessionId, periods, currentSection, selectedClass]);

  const [selectedSemester, setSelectedSemester] = useState<string>("1er Semestre (S1)");
  const [prevClassId, setPrevClassId] = useState<string>("");

  // Intelligent initial semester auto-selection based on class level (L1 -> S1, L2 -> S3, L3 -> S5, M2 -> S3)
  useEffect(() => {
    if (periodOptions.length === 0) return;

    const currentExists = periodOptions.some((p) => p.id === selectedSemester);

    if (selectedClassId !== prevClassId) {
      setPrevClassId(selectedClassId);
      const normClass = normalizeFilterText(selectedClass?.className);
      let targetCode = "S1";
      if (normClass.includes("l2") || normClass.includes("licence 2") || normClass.includes("2eme annee") || normClass.includes("2ème année")) {
        targetCode = "S3";
      } else if (normClass.includes("l3") || normClass.includes("licence 3") || normClass.includes("3eme annee") || normClass.includes("3ème année")) {
        targetCode = "S5";
      } else if (normClass.includes("m2") || normClass.includes("master 2")) {
        targetCode = "S3";
      }

      const matchOption = periodOptions.find((p) => p.code === targetCode || p.id.includes(targetCode)) || periodOptions[0];
      setSelectedSemester(matchOption.id);
      return;
    }

    if (!currentExists) {
      setSelectedSemester(periodOptions[0].id);
    }
  }, [selectedClassId, periodOptions, selectedClass, prevClassId, selectedSemester]);

  // Resolve University Program mapped to current Section
  const selectedProgram = useMemo(() => {
    if (selectedSectionId) {
      const prog = programs.find((p) => p.sectionId?.toString() === selectedSectionId);
      if (prog) return prog;
    }
    return programs[0] || null;
  }, [selectedSectionId, programs]);

  // 6. Données de Délibération
  const [evaluationScope, setEvaluationScope] = useState<"Semestriel" | "Annuel">("Semestriel");
  const [sessionMode, setSessionMode] = useState<"Normale" | "Rattrapage">("Normale");
  const [onlyAjournes, setOnlyAjournes] = useState(false);
  const [deliberationData, setDeliberationData] = useState<{
    ues: any[];
    cohort: any[];
    totalStudents: number;
    passedCount: number;
    successRate: number;
  }>({ ues: [], cohort: [], totalStudents: 0, passedCount: 0, successRate: 0 });

  const [annualData, setAnnualData] = useState<{
    sem1Name: string;
    sem2Name: string;
    cycleLevel: string;
    uesSem1: any[];
    uesSem2: any[];
    cohort: LmdAnnualStudent[];
    totalStudents: number;
    passedCount: number;
    enjambementCount: number;
    ajournesCount: number;
    successRate: number;
  }>({
    sem1Name: "1er Semestre (S1)",
    sem2Name: "2ème Semestre (S2)",
    cycleLevel: "Licence 1 (L1)",
    uesSem1: [],
    uesSem2: [],
    cohort: [],
    totalStudents: 0,
    passedCount: 0,
    enjambementCount: 0,
    ajournesCount: 0,
    successRate: 0,
  });

  const [rattrapageEditState, setRattrapageEditState] = useState<{
    open: boolean;
    student: any | null;
    ecu: any | null;
    currentGrade: number;
    rattrapageGrade: string;
  }>({ open: false, student: null, ecu: null, currentGrade: 0, rattrapageGrade: "" });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingRattrapage, setIsSavingRattrapage] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingBatchReleves, setIsExportingBatchReleves] = useState(false);
  const [rowExportingState, setRowExportingState] = useState<{ id: number; type: string } | null>(null);
  const [previewStudentItem, setPreviewStudentItem] = useState<any | null>(null);

  const loadDeliberationData = async () => {
    if (evaluationScope === "Annuel") return;
    if (!selectedClassId || !selectedSessionId || !selectedSemester) {
      return;
    }
    setIsLoading(true);
    try {
      const progId = selectedProgram ? Number(selectedProgram.id) : 0;
      const res = await getLmdDeliberationCohort(
        progId,
        Number(selectedClassId),
        selectedSemester,
        Number(selectedSessionId),
        sessionMode
      );
      if (res.success && res.data) {
        setDeliberationData(res.data);
        if (res.data.cohort.length > 0) {
          toast.success(`Délibération (${sessionMode === "Rattrapage" ? "Session 2 - Rattrapage" : "Session 1 - Normale"}) chargée : ${res.data.cohort.length} étudiant(s).`);
        } else {
          toast.info("Aucun résultat saisi pour cette promotion et ce semestre.");
        }
      } else {
        setDeliberationData({ ues: [], cohort: [], totalStudents: 0, passedCount: 0, successRate: 0 });
        toast.error(res.error || "Erreur de chargement des délibérations");
      }
    } catch (e: any) {
      toast.error(e?.message || "Erreur de chargement des délibérations");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnnualData = async () => {
    if (!selectedClassId || !selectedSessionId) {
      toast.warning("Veuillez sélectionner une classe et une session.");
      return;
    }
    setIsLoading(true);
    try {
      const progId = selectedProgram ? Number(selectedProgram.id) : 0;
      const res = await getLmdAnnualDeliberation(
        progId,
        Number(selectedClassId),
        Number(selectedSessionId),
        sessionMode
      );
      if (res.success && res.data) {
        setAnnualData(res.data as any);
        if (res.data.cohort.length > 0) {
          toast.success(`Bilan Annuel (${res.data.cycleLevel} • 60 ECTS) calculé : ${res.data.cohort.length} étudiant(s).`);
        } else {
          toast.info("Aucun résultat semestriel pour cette promotion.");
        }
      } else {
        toast.error(res.error || "Erreur de calcul du bilan annuel");
      }
    } catch (e: any) {
      toast.error(e?.message || "Erreur de chargement du bilan annuel");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClassId && selectedSessionId) {
      if (evaluationScope === "Annuel") {
        loadAnnualData();
      } else if (selectedSemester) {
        loadDeliberationData();
      }
    }
  }, [
    selectedClassId, 
    selectedSessionId, 
    sessionMode, 
    evaluationScope, 
    evaluationScope === "Semestriel" ? selectedSemester : null
  ]);

  const handleSaveRattrapageGrade = async () => {
    if (!rattrapageEditState.student || !rattrapageEditState.ecu) return;
    const val = parseFloat(rattrapageEditState.rattrapageGrade);
    if (isNaN(val) || val < 0 || val > 20) {
      toast.error("Veuillez saisir une note valide entre 0 et 20.");
      return;
    }

    setIsSavingRattrapage(true);
    try {
      const res = await saveLmdRattrapageGrade({
        studentId: rattrapageEditState.student.id,
        subjectId: rattrapageEditState.ecu.subjectId || rattrapageEditState.ecu.id,
        classId: Number(selectedClassId),
        sessionId: Number(selectedSessionId),
        semester: selectedSemester,
        rattrapageScore: val,
      });

      if (res.success) {
        toast.success(res.message || "Note de rattrapage enregistrée !");
        setRattrapageEditState({ open: false, student: null, ecu: null, currentGrade: 0, rattrapageGrade: "" });
        if (evaluationScope === "Annuel") {
          loadAnnualData();
        } else {
          loadDeliberationData();
        }
      } else {
        toast.error(res.error || "Erreur lors de l'enregistrement");
      }
    } catch (e: any) {
      toast.error("Erreur réseau");
    } finally {
      setIsSavingRattrapage(false);
    }
  };

  const selectedSession = sessions.find((s) => String(s.id) === selectedSessionId);

  // ─── Save / Validate Annual Deliberation ───────────────────────────────────
  const handleSaveAnnualDeliberation = async () => {
    if (!selectedClassId || !selectedSessionId) return;
    if (annualData.cohort.length === 0) {
      toast.error("Aucun étudiant à délibérer");
      return;
    }

    setIsSaving(true);
    try {
      const progId = selectedProgram ? Number(selectedProgram.id) : 0;
      const res = await saveLmdAnnualDeliberation({
        programId: progId,
        classId: Number(selectedClassId),
        sessionId: Number(selectedSessionId),
        cycleLevel: annualData.cycleLevel,
        cohort: annualData.cohort,
      });

      if (res.success) {
        toast.success(res.message || "Délibération annuelle validée avec succès !");
      } else {
        toast.error(res.error || "Erreur de validation");
      }
    } catch (e: any) {
      toast.error("Erreur réseau");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Export Annual Deliberation PV (PDF A4 Paysage) ────────────────────────
  const handleExportAnnualPDF = async () => {
    if (annualData.cohort.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    setIsExportingPdf(true);
    try {
      const schoolName = headerConfig?.schoolName || headerConfig?.name || "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES";
      const facultyName = currentSection?.sectionName 
        ? (currentSection.sectionName.toLowerCase().startsWith("faculté") ? currentSection.sectionName : `Faculté : ${currentSection.sectionName}`)
        : "Faculté Universitaire LMD";
      const departmentName = selectedProgram?.name || currentSection?.sectionName || "Département Universitaire";
      const logo = headerConfig?.leftLogo || headerConfig?.schoolLogo || headerConfig?.logo || headerConfig?.logoUrl || headerConfig?.centerLogo || undefined;

      const annualPayload: LmdAnnualParams = {
        institution: {
          name: schoolName,
          countryName: headerConfig?.countryName || "RÉPUBLIQUE DU NIGER",
          ministryName: headerConfig?.ministryName || "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE",
          motto: headerConfig?.motto || "Fraternité — Travail — Progrès",
          facultyName: facultyName,
          departmentName: departmentName,
          programName: selectedProgram?.name || currentSection?.sectionName || "Tronc Commun LMD",
          className: getClassDisplayName(selectedClass),
          sessionName: selectedSession?.sessionName || "2025-2026",
          cycleLevel: annualData.cycleLevel,
          city: headerConfig?.city || "Niamey",
          logoUrl: logo,
        },
        sem1Name: annualData.sem1Name,
        sem2Name: annualData.sem2Name,
        cycleLevel: annualData.cycleLevel,
        cohort: annualData.cohort,
        totalStudents: annualData.totalStudents,
        passedCount: annualData.passedCount,
        enjambementCount: annualData.enjambementCount,
        ajournesCount: annualData.ajournesCount,
        successRate: annualData.successRate,
        sessionType: sessionMode,
      };

      await generateLmdAnnualDeliberationPVPDF(annualPayload);
      toast.success("Procès-verbal annuel exporté en PDF avec succès !");
    } catch (e: any) {
      toast.error("Erreur lors de l'export du PV annuel");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // ─── Single Student Annual Transcript PDF Export ───────────────────────────
  const handleExportAnnualSingleReleve = async (item: LmdAnnualStudent) => {
    setRowExportingState({ id: item.student.id, type: "releve-annual" });
    try {
      const schoolName = headerConfig?.schoolName || headerConfig?.name || "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES";
      const facultyName = currentSection?.sectionName 
        ? (currentSection.sectionName.toLowerCase().startsWith("faculté") ? currentSection.sectionName : `Faculté : ${currentSection.sectionName}`)
        : "Faculté Universitaire LMD";
      const departmentName = selectedProgram?.name || currentSection?.sectionName || "Département Universitaire";
      const logo = headerConfig?.leftLogo || headerConfig?.schoolLogo || headerConfig?.logo || headerConfig?.logoUrl || headerConfig?.centerLogo || undefined;

      await generateLmdStudentAnnualRelevePDF(
        item,
        {
          name: schoolName,
          countryName: headerConfig?.countryName || "RÉPUBLIQUE DU NIGER",
          ministryName: headerConfig?.ministryName || "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE",
          motto: headerConfig?.motto || "Fraternité — Travail — Progrès",
          facultyName: facultyName,
          departmentName: departmentName,
          programName: selectedProgram?.name || currentSection?.sectionName || "Tronc Commun LMD",
          degreeLevel: selectedLevel,
          className: getClassDisplayName(selectedClass),
          sessionName: selectedSession?.sessionName || "2025-2026",
          city: headerConfig?.city || "Niamey",
          logoUrl: logo,
        },
        annualData.totalStudents
      );
      toast.success(`Relevé annuel généré pour ${item.student.nom}`);
    } catch (e: any) {
      toast.error("Erreur lors de la génération du relevé annuel");
    } finally {
      setRowExportingState(null);
    }
  };

  // ─── Export Diploma Supplement (UNESCO / CAMES) ───────────────────────────
  const handleExportDiplomaSupplement = async (studentItem: any) => {
    const studentId = studentItem?.student?.id || 0;
    setRowExportingState({ id: studentId, type: "annexe" });
    try {
      const schoolName = headerConfig?.schoolName || headerConfig?.name || "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES";
      const facultyName = currentSection?.sectionName 
        ? (currentSection.sectionName.toLowerCase().startsWith("faculté") ? currentSection.sectionName : `Faculté : ${currentSection.sectionName}`)
        : "Faculté Universitaire LMD";
      const departmentName = selectedProgram?.name || currentSection?.sectionName || "Département Universitaire";

      const isAnnual = !!studentItem.annual;
      const finalAvg = isAnnual ? studentItem.annual.annualAverage : studentItem.deliberation.semesterAverage;
      const honors = isAnnual ? studentItem.annual.mention : studentItem.deliberation.mention;
      const totalCreds = isAnnual ? studentItem.annual.totalCreditsAcquired : studentItem.deliberation.creditsAcquired;

      const rawUeResults = isAnnual
        ? [...(studentItem.sem1?.ueResults || []), ...(studentItem.sem2?.ueResults || [])]
        : (studentItem.deliberation?.ueResults || []);

      const ueList = rawUeResults.map((ue: any) => ({
        codeUe: ue.codeUe || "UE",
        nameUe: ue.nameUe || ue.codeUe || "Unité d'Enseignement",
        creditsEcts: Number(ue.creditsEcts) || 6,
        average: Number(ue.average) || 0,
        status: ue.status || "V",
      }));

      const supplementPayload: DiplomaSupplementParams = {
        student: {
          id: studentItem.student.id,
          nom: studentItem.student.nom,
          matricule: studentItem.student.matricule || "N/A",
          dateNaissance: studentItem.student.dateNaissance || "15/10/2002",
          lieuNaissance: studentItem.student.lieuNaissance || "Niamey",
          nationalite: "Nigérienne",
          sexe: studentItem.student.sexe || "M",
        },
        diploma: {
          title: `DIPLÔME DE ${selectedLevel ? selectedLevel.toUpperCase() : "LICENCE"} LMD`,
          degreeLevel: selectedLevel || "Licence",
          fieldOfStudy: currentSection?.sectionName || selectedProgram?.name || "Sciences & Technologies",
          mention: selectedProgram?.name || currentSection?.sectionName || "Informatique & Télécommunications",
          graduationYear: selectedSession?.sessionName || "2025-2026",
          finalGradeAverage: finalAvg,
          totalCreditsAcquired: totalCreds,
          honors: honors,
        },
        institution: {
          name: schoolName,
          countryName: headerConfig?.countryName || "RÉPUBLIQUE DU NIGER",
          ministryName: headerConfig?.ministryName || "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE",
          facultyName: facultyName,
          departmentName: departmentName,
          city: headerConfig?.city || "Niamey",
          website: headerConfig?.website || "www.universite-edut.org",
          logoUrl: headerConfig?.leftLogo || headerConfig?.schoolLogo || headerConfig?.logo || headerConfig?.logoUrl || headerConfig?.centerLogo || undefined,
        },
        ueList: ueList,
      };

      await generateDiplomaSupplementPDF(supplementPayload);
      toast.success(`Annexe au diplôme (Diploma Supplement UNESCO) générée pour ${studentItem.student.nom}`);
    } catch (e: any) {
      toast.error("Erreur lors de la génération du supplément au diplôme");
    } finally {
      setRowExportingState(null);
    }
  };

  // ─── Export Official Diploma (Landscape Gold/Navy Luxury) ───────────────────
  const handleExportOfficialDiploma = async (studentItem: any) => {
    const studentId = studentItem?.student?.id || 0;
    setRowExportingState({ id: studentId, type: "diploma" });
    try {
      const schoolName = headerConfig?.schoolName || headerConfig?.name || "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES";
      const facultyName = currentSection?.sectionName 
        ? (currentSection.sectionName.toLowerCase().startsWith("faculté") ? currentSection.sectionName : `Faculté : ${currentSection.sectionName}`)
        : "Faculté Universitaire LMD";

      const isAnnual = !!studentItem.annual;
      const finalAvg = isAnnual ? studentItem.annual.annualAverage : studentItem.deliberation.semesterAverage;
      const honors = isAnnual ? studentItem.annual.mention : studentItem.deliberation.mention;
      const totalCreds = isAnnual ? studentItem.annual.totalCreditsAcquired : studentItem.deliberation.creditsAcquired;

      const payload: LmdDiplomaParams = {
        student: {
          id: studentItem.student.id,
          nom: studentItem.student.nom,
          prenom: studentItem.student.prenom || "",
          matricule: studentItem.student.matricule || `EDUT-${studentItem.student.id}`,
          dateNaissance: studentItem.student.dateNaissance || "15/10/2002",
          lieuNaissance: studentItem.student.lieuNaissance || "Niamey",
          nationalite: studentItem.student.nationalite || headerConfig?.nationality || "Nigérienne",
          sexe: studentItem.student.sexe || "M",
        },
        degree: {
          title: selectedLevel ? selectedLevel.toUpperCase() : "LICENCE",
          specialization: selectedProgram?.name || currentSection?.sectionName || "Informatique & Systèmes d'Information",
          fieldOfStudy: currentSection?.sectionName || selectedProgram?.name || "Sciences & Technologies",
          mention: honors || "Bien",
          finalGradeAverage: finalAvg,
          totalCreditsAcquired: totalCreds || 180,
          sessionName: selectedSession?.sessionName || "2025-2026",
          diplomaNumber: headerConfig?.diplomaNumber || `${studentItem.student.matricule || studentItem.student.id}`,
          deliberationDate: selectedSession?.endDate
            ? new Date(selectedSession.endDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
            : undefined,
        },
        institution: {
          name: schoolName,
          countryName: headerConfig?.countryName || "RÉPUBLIQUE DU NIGER",
          ministryName: headerConfig?.ministryName || "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE",
          ministryLabel: headerConfig?.ministryLabel || "MINISTERE DE L'ENSEIGNEMENT SUPERIEUR\nDirection Générale de l'Enseignement",
          facultyName: facultyName,
          rectorName: headerConfig?.rectorName || "",
          directorGeneralName: headerConfig?.directorGeneralName || "Le Directeur Général des Enseignements",
          city: headerConfig?.city || "Niamey",
          logo: headerConfig?.leftLogo || headerConfig?.schoolLogo || headerConfig?.logo || headerConfig?.logoUrl || headerConfig?.centerLogo || undefined,
          ministryLogo: headerConfig?.rightLogo || headerConfig?.ministryLogo || undefined,
          vuClauses: Array.isArray(headerConfig?.vuClauses)
            ? headerConfig.vuClauses
            : typeof headerConfig?.vuClauses === "string" && headerConfig.vuClauses.startsWith("[")
            ? JSON.parse(headerConfig.vuClauses)
            : undefined,
        },
      };

      await generateLmdOfficialDiplomaPDF(payload);
      toast.success(`Diplôme Officiel généré pour ${studentItem.student.nom}`);
    } catch (e) {
      toast.error("Erreur lors de la génération du diplôme");
    } finally {
      setRowExportingState(null);
    }
  };

  // ─── Export Attestation de Réussite (Portrait Official) ─────────────────────
  const handleExportAttestationReussite = async (studentItem: any) => {
    const studentId = studentItem?.student?.id || 0;
    setRowExportingState({ id: studentId, type: "attestation" });
    try {
      const schoolName = headerConfig?.schoolName || headerConfig?.name || "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES";
      const facultyName = currentSection?.sectionName 
        ? (currentSection.sectionName.toLowerCase().startsWith("faculté") ? currentSection.sectionName : `Faculté : ${currentSection.sectionName}`)
        : "Faculté Universitaire LMD";

      const isAnnual = !!studentItem.annual;
      const finalAvg = isAnnual ? studentItem.annual.annualAverage : studentItem.deliberation.semesterAverage;
      const honors = isAnnual ? studentItem.annual.mention : studentItem.deliberation.mention;
      const totalCreds = isAnnual ? studentItem.annual.totalCreditsAcquired : studentItem.deliberation.creditsAcquired;

      const payload: LmdDiplomaParams = {
        student: {
          id: studentItem.student.id,
          nom: studentItem.student.nom,
          prenom: studentItem.student.prenom || "",
          matricule: studentItem.student.matricule || `EDUT-${studentItem.student.id}`,
          dateNaissance: studentItem.student.dateNaissance || "15/10/2002",
          lieuNaissance: studentItem.student.lieuNaissance || "Niamey",
          nationalite: studentItem.student.nationalite || headerConfig?.nationality || "Nigérienne",
          sexe: studentItem.student.sexe || "M",
        },
        degree: {
          title: selectedLevel ? selectedLevel.toUpperCase() : "LICENCE",
          specialization: selectedProgram?.name || currentSection?.sectionName || "Informatique & Systèmes d'Information",
          fieldOfStudy: currentSection?.sectionName || selectedProgram?.name || "Sciences & Technologies",
          mention: honors || "Bien",
          finalGradeAverage: finalAvg,
          totalCreditsAcquired: totalCreds || 180,
          sessionName: selectedSession?.sessionName || "2025-2026",
          diplomaNumber: headerConfig?.attestationNumber || `ATT-${studentItem.student.matricule || studentItem.student.id}`,
          deliberationDate: selectedSession?.endDate
            ? new Date(selectedSession.endDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
            : undefined,
        },
        institution: {
          name: schoolName,
          countryName: headerConfig?.countryName || "RÉPUBLIQUE DU NIGER",
          ministryName: headerConfig?.ministryName || "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE",
          ministryLabel: headerConfig?.ministryLabel || "MINISTERE DE L'ENSEIGNEMENT SUPERIEUR\nDirection Générale de l'Enseignement",
          facultyName: facultyName,
          rectorName: headerConfig?.rectorName || "",
          directorGeneralName: headerConfig?.directorGeneralName || "Le Directeur Général des Enseignements",
          city: headerConfig?.city || "Niamey",
          logo: headerConfig?.leftLogo || headerConfig?.schoolLogo || headerConfig?.logo || headerConfig?.logoUrl || headerConfig?.centerLogo || undefined,
          ministryLogo: headerConfig?.rightLogo || headerConfig?.ministryLogo || undefined,
          vuClauses: Array.isArray(headerConfig?.vuClauses)
            ? headerConfig.vuClauses
            : typeof headerConfig?.vuClauses === "string" && headerConfig.vuClauses.startsWith("[")
            ? JSON.parse(headerConfig.vuClauses)
            : undefined,
        },
      };

      await generateLmdAttestationReussitePDF(payload);
      toast.success(`Attestation de réussite générée pour ${studentItem.student.nom}`);
    } catch (e) {
      toast.error("Erreur lors de la génération de l'attestation");
    } finally {
      setRowExportingState(null);
    }
  };

  // ─── Save / Validate Deliberation ──────────────────────────────────────────
  const handleSaveDeliberation = async () => {
    if (!selectedClassId || !selectedSessionId) return;
    if (deliberationData.cohort.length === 0) {
      toast.error("Aucun étudiant à délibérer");
      return;
    }

    setIsSaving(true);
    try {
      const progId = selectedProgram ? Number(selectedProgram.id) : 0;
      const res = await saveLmdDeliberation({
        programId: progId,
        classId: Number(selectedClassId),
        semester: selectedSemester,
        sessionId: Number(selectedSessionId),
        cohort: deliberationData.cohort,
      });

      if (res.success) {
        toast.success(res.message || "Délibération validée et clôturée avec succès !");
      } else {
        toast.error(res.error || "Erreur de validation");
      }
    } catch (e: any) {
      toast.error("Erreur réseau lors de la validation");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Export Official Ministerial & CAMES PV (PDF A3 / A4 Paysage) ───────────
  const handleExportMinisterialPV = async (paperFormat: "a3" | "a4" = "a3") => {
    if (deliberationData.cohort.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    setIsExportingPdf(true);
    try {
      const schoolName = headerConfig?.schoolName || headerConfig?.name || "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES";
      const facultyName = currentSection?.sectionName 
        ? (currentSection.sectionName.toLowerCase().startsWith("faculté") ? currentSection.sectionName : `Faculté : ${currentSection.sectionName}`)
        : "Faculté Universitaire LMD";
      const departmentName = selectedProgram?.name || currentSection?.sectionName || "Département Universitaire";

      const ministerialPayload: MinisterialPVParams = {
        paperFormat: paperFormat,
        institution: {
          name: schoolName,
          countryName: headerConfig?.countryName || "RÉPUBLIQUE DU NIGER",
          ministryName: headerConfig?.ministryName || "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE",
          motto: headerConfig?.motto || "Fraternité — Travail — Progrès",
          facultyName: facultyName,
          departmentName: departmentName,
          programName: selectedProgram?.name || currentSection?.sectionName || "Tronc Commun LMD",
          degreeLevel: selectedLevel,
          className: getClassDisplayName(selectedClass),
          sessionName: selectedSession?.sessionName || "2025-2026",
          city: headerConfig?.city || "Niamey",
        },
        semester: selectedSemester,
        sessionType: sessionMode,
        ues: deliberationData.ues,
        cohort: deliberationData.cohort,
      };

      await generateLmdMinisterialPVPDF(ministerialPayload);
      toast.success(`PV Ministériel & CAMES (${paperFormat.toUpperCase()} Paysage) généré avec succès !`);
    } catch (e: any) {
      toast.error("Erreur lors de l'export du PV ministériel");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // ─── Export Official Deliberation PV (PDF A4 Paysage) ──────────────────────
  const handleExportPDF = async () => {
    await handleExportMinisterialPV("a4");
  };

  // ─── Single Student Transcript PDF Export ──────────────────────────────────
  const handleExportSingleReleve = async (item: any) => {
    const studentId = item?.student?.id || 0;
    setRowExportingState({ id: studentId, type: "releve-single" });
    try {
      const schoolName = headerConfig?.schoolName || headerConfig?.name || "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES";
      const facultyName = currentSection?.sectionName 
        ? (currentSection.sectionName.toLowerCase().startsWith("faculté") ? currentSection.sectionName : `Faculté : ${currentSection.sectionName}`)
        : "Faculté Universitaire LMD";
      const departmentName = selectedProgram?.name || currentSection?.sectionName || "Département Universitaire";
      const logo = headerConfig?.leftLogo || headerConfig?.schoolLogo || headerConfig?.logo || headerConfig?.logoUrl || headerConfig?.centerLogo || undefined;

      const relevePayload: LmdReleveParams = {
        student: item.student,
        deliberation: item.deliberation,
        institution: {
          name: schoolName,
          countryName: headerConfig?.countryName || "RÉPUBLIQUE DU NIGER",
          ministryName: headerConfig?.ministryName || "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE",
          motto: headerConfig?.motto || "Fraternité — Travail — Progrès",
          facultyName: facultyName,
          departmentName: departmentName,
          programName: selectedProgram?.name || currentSection?.sectionName || "Tronc Commun LMD",
          degreeLevel: selectedLevel,
          className: getClassDisplayName(selectedClass),
          sessionName: selectedSession?.sessionName || "2025-2026",
          city: headerConfig?.city || "Niamey",
          logoUrl: logo,
        },
        rank: item.rank,
        totalCohort: deliberationData.totalStudents,
        sessionType: sessionMode,
      };

      await generateLmdStudentRelevePDF(relevePayload);
      toast.success(`Relevé de notes officiel (${sessionMode === "Rattrapage" ? "Rattrapage" : "Session 1"}) généré pour ${item.student.nom}`);
    } catch (e: any) {
      toast.error("Erreur lors de la génération du relevé de notes");
    } finally {
      setRowExportingState(null);
    }
  };

  // ─── Batch Cohort Transcripts PDF Export ───────────────────────────────────
  const handleExportBatchReleves = async () => {
    if (deliberationData.cohort.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    setIsExportingBatchReleves(true);
    try {
      const schoolName = headerConfig?.schoolName || headerConfig?.name || "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES";
      const facultyName = currentSection?.sectionName 
        ? (currentSection.sectionName.toLowerCase().startsWith("faculté") ? currentSection.sectionName : `Faculté : ${currentSection.sectionName}`)
        : "Faculté Universitaire LMD";
      const departmentName = selectedProgram?.name || currentSection?.sectionName || "Département Universitaire";
      const logo = headerConfig?.leftLogo || headerConfig?.schoolLogo || headerConfig?.logo || headerConfig?.logoUrl || headerConfig?.centerLogo || undefined;

      const batchPayload: LmdReleveParams[] = deliberationData.cohort.map((item) => ({
        student: item.student,
        deliberation: item.deliberation,
        institution: {
          name: schoolName,
          countryName: headerConfig?.countryName || "RÉPUBLIQUE DU NIGER",
          ministryName: headerConfig?.ministryName || "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE",
          motto: headerConfig?.motto || "Fraternité — Travail — Progrès",
          facultyName: facultyName,
          departmentName: departmentName,
          programName: selectedProgram?.name || currentSection?.sectionName || "Tronc Commun LMD",
          degreeLevel: selectedLevel,
          className: getClassDisplayName(selectedClass),
          sessionName: selectedSession?.sessionName || "2025-2026",
          city: headerConfig?.city || "Niamey",
          logoUrl: logo,
        },
        rank: item.rank,
        totalCohort: deliberationData.totalStudents,
        sessionType: sessionMode,
      }));

      const sessionLabel = `${selectedClass?.className || "Promotion"}_${sessionMode === "Rattrapage" ? "Rattrapage_" : ""}${selectedSemester}`;
      await generateLmdBatchRelevesPDF(batchPayload, sessionLabel);
      toast.success(`Tous les relevés de notes de la promotion (${sessionMode === "Rattrapage" ? "Session de Rattrapage" : "Session 1"}) ont été générés en PDF avec succès !`);
    } catch (e: any) {
      toast.error("Erreur lors de l'export des relevés par lot");
    } finally {
      setIsExportingBatchReleves(false);
    }
  };

  return (
    <div className="min-h-screen space-y-6">
      {/* ─── HEADER BAR ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/academics/lmd"
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Salle de Délibération du Jury LMD
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                <Sparkles className="h-3 w-3" /> ECTS REESAO • CAMES
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Moteur de compensation semestrielle inter-UE, calcul des 30 ECTS, procès-verbal officiel et relevés de notes
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Evaluation Scope Switcher (Semestriel vs Annuel) */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            <button
              type="button"
              onClick={() => setEvaluationScope("Semestriel")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                evaluationScope === "Semestriel"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Semestriel (30 ECTS)</span>
            </button>
            <button
              type="button"
              onClick={() => setEvaluationScope("Annuel")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                evaluationScope === "Annuel"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              <span>Bilan Annuel (60 ECTS 🏆)</span>
            </button>
          </div>

          {/* Session Switcher (Normale vs Rattrapage) */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            <button
              type="button"
              onClick={() => {
                setSessionMode("Normale");
                setOnlyAjournes(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                sessionMode === "Normale"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Session 1</span>
            </button>
            <button
              type="button"
              onClick={() => setSessionMode("Rattrapage")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                sessionMode === "Rattrapage"
                  ? "bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md shadow-amber-500/20 font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Session 2 ⚡</span>
            </button>
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            {isDark ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-indigo-500" />}
            <span>{isDark ? "Clair" : "Sombre"}</span>
          </button>

          {evaluationScope === "Semestriel" ? (
            <>
              {/* Batch Transcripts Export */}
              <Button
                onClick={handleExportBatchReleves}
                disabled={deliberationData.cohort.length === 0 || isExportingBatchReleves}
                variant="outline"
                className="gap-2 text-xs font-bold border-indigo-600 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
              >
                {isExportingBatchReleves ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {isExportingBatchReleves ? "Génération..." : "Relevés LMD (Batch PDF)"}
              </Button>

              {/* Ministerial & CAMES PV Export */}
              <div className="flex items-center rounded-xl border border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 p-0.5">
                <Button
                  onClick={() => handleExportMinisterialPV("a3")}
                  disabled={deliberationData.cohort.length === 0 || isExportingPdf}
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 h-8"
                  title="Générer le Procès-Verbal Officiel Grand Format A3 pour le Ministère / CAMES"
                >
                  {isExportingPdf ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                  ) : (
                    <Building2 className="h-3.5 w-3.5 text-amber-600" />
                  )}
                  <span>PV CAMES (A3)</span>
                </Button>
                <Button
                  onClick={() => handleExportMinisterialPV("a4")}
                  disabled={deliberationData.cohort.length === 0 || isExportingPdf}
                  variant="ghost"
                  size="sm"
                  className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 h-8 px-2 border-l border-amber-300 dark:border-amber-800"
                  title="Format A4 Paysage"
                >
                  <span>A4</span>
                </Button>
              </div>

              {/* Deliberation PV Export */}
              <Button
                onClick={handleExportPDF}
                disabled={deliberationData.cohort.length === 0 || isExportingPdf}
                variant="outline"
                className="gap-2 text-xs font-bold border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
              >
                {isExportingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                {isExportingPdf ? "Génération PV..." : "Exporter PV (PDF)"}
              </Button>

              {/* Validate & Close Deliberation */}
              <Button
                onClick={handleSaveDeliberation}
                disabled={deliberationData.cohort.length === 0 || isSaving}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {isSaving ? "Validation en cours..." : "Valider & Clôturer"}
              </Button>
            </>
          ) : (
            <>
              {/* Annual PV Export */}
              <Button
                onClick={handleExportAnnualPDF}
                disabled={annualData.cohort.length === 0 || isExportingPdf}
                variant="outline"
                className="gap-2 text-xs font-bold border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
              >
                {isExportingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                {isExportingPdf ? "Génération PV..." : "Exporter PV Annuel (PDF)"}
              </Button>

              {/* Validate Annual Bilan */}
              <Button
                onClick={handleSaveAnnualDeliberation}
                disabled={annualData.cohort.length === 0 || isSaving}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {isSaving ? "Validation du bilan..." : "Valider Bilan Annuel"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ─── BANNIÈRE ACTIVE SESSION DE RATTRAPAGE ──────────────────────────── */}
      {sessionMode === "Rattrapage" && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Session de Rattrapage Active (Session 2)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold">
                  Règle Max(N1, N2)
                </span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Les notes de rattrapage remplacent les notes de Session 1 uniquement si elles sont supérieures. Cliquez sur <strong>Rattrapage</strong> pour saisir les notes des matières ajournées.
              </div>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer self-start sm:self-center bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <input
              type="checkbox"
              checked={onlyAjournes}
              onChange={(e) => setOnlyAjournes(e.target.checked)}
              className="h-4 w-4 rounded accent-indigo-600 cursor-pointer"
            />
            <span>Afficher uniquement les ajournés ({evaluationScope === "Annuel" ? annualData.ajournesCount : deliberationData.totalStudents - deliberationData.passedCount})</span>
          </label>
        </div>
      )}

      {/* ─── FILTRES ACADÉMIQUES CONFORMES À SETTINGS & NOTES & RÉSULTATS ──────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Filter className="h-4 w-4" />
            </div>
            <span>Filtres de Délibération Académique ({evaluationScope === "Annuel" ? "Bilan Annuel 60 ECTS" : "Semestre Unique 30 ECTS"})</span>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            Cascade : Session → Niveau → Filière → Classe → {evaluationScope === "Annuel" ? "Année Complète" : "Semestre"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
          {/* 1. Session Académique */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              1. Session Académique
            </label>
            <Select value={selectedSessionId} onValueChange={(val) => setSelectedSessionId(val || "")}>
              <SelectTrigger className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl h-10">
                <SelectValue placeholder="Choisir la session" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                    {s.sessionName} {s.isActive || s.status === "Actif" ? "• (Actif)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Niveau d'Étude (educational_levels) */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              2. Niveau d'Étude
            </label>
            <Select value={selectedLevel} onValueChange={(val) => setSelectedLevel(val || "Licence")}>
              <SelectTrigger className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl h-10">
                <SelectValue placeholder="Niveau d'étude" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                {academicLevels.map((lvl) => (
                  <SelectItem key={lvl} value={lvl} className="text-xs">
                    {lvl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Section / Filière (school_sections filtrées par niveau) */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              3. Section / Filière
            </label>
            <Select value={selectedSectionId} onValueChange={(val) => setSelectedSectionId(val || "")}>
              <SelectTrigger className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl h-10">
                <SelectValue placeholder="Choisir la filière" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                {filteredSections.map((sec) => (
                  <SelectItem key={sec.id} value={String(sec.id)} className="text-xs">
                    {sec.sectionName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 4. Promotion / Classe (school_classes filtrées par sectionId) */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              4. Promotion / Classe
            </label>
            <Select value={selectedClassId} onValueChange={(val) => setSelectedClassId(val || "")}>
              <SelectTrigger className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl h-10">
                <SelectValue placeholder="Choisir la classe" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                {filteredClasses.map((cls) => (
                  <SelectItem key={cls.id} value={String(cls.id)} className="text-xs">
                    {cls.className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 5. Semestre / Période d'évaluation */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              5. Période Évaluée
            </label>
            {evaluationScope === "Annuel" ? (
              <div className="h-10 px-3 flex items-center rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold truncate">
                <span>Année Complète (2 Semestres : S1 + S2)</span>
              </div>
            ) : (
              <Select value={selectedSemester} onValueChange={(val) => setSelectedSemester(val || "1er Semestre (S1)")}>
                <SelectTrigger className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl h-10">
                  <SelectValue placeholder="Choisir le semestre" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  {periodOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Action Button & Active Filter Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Sélection active :</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-100 dark:border-indigo-800 text-[11px]">
              <GraduationCap className="h-3 w-3" /> {currentSection?.sectionName || selectedProgram?.name || "Filière"} ({selectedLevel})
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-100 dark:border-emerald-800 text-[11px]">
              <School className="h-3 w-3" /> {getClassDisplayName(selectedClass) || "Classe"}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold border border-purple-100 dark:border-purple-800 text-[11px]">
              <Layers className="h-3 w-3" /> {evaluationScope === "Annuel" ? "Année Académique (60 ECTS)" : selectedSemester}
            </span>
          </div>

          <Button
            onClick={evaluationScope === "Annuel" ? loadAnnualData : loadDeliberationData}
            disabled={isLoading || !selectedClassId}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 px-6 h-10 rounded-xl"
          >
            <Search className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Calcul en cours..." : evaluationScope === "Annuel" ? "Calculer le Bilan Annuel" : "Afficher la Délibération"}
          </Button>
        </div>
      </div>

      {/* ─── STATISTIQUES EN DIRECT (SEMESTRIEL VS ANNUEL) ─────────────────── */}
      {evaluationScope === "Annuel" ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Effectif de la Promotion</div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{annualData.totalStudents}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{annualData.cycleLevel}</div>
          </div>

          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 shadow-xs">
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">Admis en Année Sup.</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{annualData.passedCount}</div>
            <div className="text-[10px] text-emerald-600/70 mt-0.5">60 ECTS ou MGA ≥ 10</div>
          </div>

          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 p-5 shadow-xs">
            <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400">Enjambement (Dettes)</div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{annualData.enjambementCount}</div>
            <div className="text-[10px] text-amber-600/70 mt-0.5">≥ 45 ECTS (Passage conditionnel)</div>
          </div>

          <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 p-5 shadow-xs">
            <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400">Ajournés (Redoublement)</div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{annualData.ajournesCount}</div>
            <div className="text-[10px] text-rose-600/70 mt-0.5">&lt; 45 ECTS</div>
          </div>

          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 p-5 shadow-xs">
            <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400">Taux de Passage Global</div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{annualData.successRate} %</div>
            <div className="text-[10px] text-indigo-600/70 mt-0.5">Admis + Enjambement</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Effectif de la Promotion</div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{deliberationData.totalStudents}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Étudiants inscrits</div>
          </div>

          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 shadow-xs">
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">Admis ({sessionMode === "Rattrapage" ? "Session 2" : "Session 1"})</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{deliberationData.passedCount}</div>
            <div className="text-[10px] text-emerald-600/70 mt-0.5">Moyenne ≥ 10.00 / 20</div>
          </div>

          <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 p-5 shadow-xs">
            <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400">Ajournés (Non validés)</div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {deliberationData.totalStudents - deliberationData.passedCount}
            </div>
            <div className="text-[10px] text-rose-600/70 mt-0.5">Moyenne &lt; 10 ou éliminatoire</div>
          </div>

          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 p-5 shadow-xs">
            <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400">Taux de Réussite Global</div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{deliberationData.successRate} %</div>
            <div className="text-[10px] text-indigo-600/70 mt-0.5">Norme ECTS validée</div>
          </div>
        </div>
      )}

      {/* ─── TABLEAU DU PROCÈS-VERBAL DE DÉLIBÉRATION (SEMESTRIEL VS ANNUEL) ─── */}
      {evaluationScope === "Annuel" ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Grille Collective de Délibération Annuelle — {annualData.cycleLevel} (Bilan des 60 Crédits ECTS & Décision de Passage)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Admis (60 ECTS)
              </span>
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Enjambement (≥ 45 ECTS)
              </span>
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Ajourné (&lt; 45 ECTS)
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="p-16 text-center text-xs text-slate-400 dark:text-slate-500">
              <RefreshCw className="h-7 w-7 animate-spin mx-auto mb-3 text-indigo-600 dark:text-indigo-400" />
              Calcul du bilan annuel des 60 ECTS et progression en cours...
            </div>
          ) : annualData.cohort.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-400 dark:text-slate-500 space-y-2">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
              <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">Aucun résultat trouvé pour cette promotion</div>
              <p className="max-w-md mx-auto">
                Vérifiez que des notes ont bien été enregistrées pour les semestres composant cette année académique.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-900 dark:bg-slate-950 text-white">
                    <th className="p-3 text-center w-12 font-bold">Rang</th>
                    <th className="p-3 font-bold min-w-[180px]">Étudiant</th>
                    <th className="p-3 text-center font-bold border-l border-slate-800 dark:border-slate-900 min-w-[140px]">
                      <div>{annualData.sem1Name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">Moy / 30 ECTS</div>
                    </th>
                    <th className="p-3 text-center font-bold border-l border-slate-800 dark:border-slate-900 min-w-[140px]">
                      <div>{annualData.sem2Name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">Moy / 30 ECTS</div>
                    </th>
                    <th className="p-3 text-center font-bold border-l border-slate-800 dark:border-slate-900 bg-slate-800 dark:bg-slate-900">Moyenne Annuelle /20</th>
                    <th className="p-3 text-center font-bold bg-slate-800 dark:bg-slate-900">Crédits /60 ECTS</th>
                    <th className="p-3 text-center font-bold bg-slate-800 dark:bg-slate-900">Décision Annuelle</th>
                    <th className="p-3 text-center font-bold bg-slate-800 dark:bg-slate-900">Mention</th>
                    <th className="p-3 text-center font-bold bg-slate-800 dark:bg-slate-900 min-w-[140px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {(onlyAjournes
                    ? annualData.cohort.filter((c) => !c.annual.isAnnualValidated)
                    : annualData.cohort
                  ).map((item) => {
                    const a = item.annual;
                    return (
                      <tr key={item.student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-500 dark:text-slate-400">
                          {item.rank === 1 ? "🥇 1" : `${item.rank}`}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{item.student.nom}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{item.student.matricule || "N/A"}</div>
                        </td>

                        {/* Semestre 1 */}
                        <td className="p-3 text-center border-l border-slate-100 dark:border-slate-800">
                          <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {item.sem1.average.toFixed(2)} / 20
                          </div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            item.sem1.isValidated ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                          }`}>
                            {item.sem1.creditsAcquired} ECTS
                          </span>
                        </td>

                        {/* Semestre 2 */}
                        <td className="p-3 text-center border-l border-slate-100 dark:border-slate-800">
                          <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {item.sem2.average.toFixed(2)} / 20
                          </div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            item.sem2.isValidated ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                          }`}>
                            {item.sem2.creditsAcquired} ECTS
                          </span>
                        </td>

                        {/* Moyenne Annuelle */}
                        <td className="p-3 text-center border-l border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                          {a.annualAverage.toFixed(2)}
                        </td>

                        {/* Crédits Annuel / 60 */}
                        <td className="p-3 text-center bg-slate-50/50 dark:bg-slate-800/40 font-mono font-bold text-xs text-indigo-700 dark:text-indigo-400">
                          {a.totalCreditsAcquired} / 60
                        </td>

                        {/* Décision Annuelle */}
                        <td className="p-3 text-center bg-slate-50/50 dark:bg-slate-800/40">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                              a.isAnnualValidated
                                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                                : a.isEnjambement
                                ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                                : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
                            }`}
                          >
                            {a.decision}
                          </span>
                        </td>

                        {/* Mention */}
                        <td className="p-3 text-center bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-semibold">
                          {a.mention}
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-center bg-slate-50/50 dark:bg-slate-800/40">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={rowExportingState !== null}
                              onClick={() => handleExportOfficialDiploma(item)}
                              className="h-8 px-2 text-[11px] font-bold gap-1 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/50"
                              title="Imprimer Diplôme Officiel Grand Format (A4 Paysage)"
                            >
                              {rowExportingState?.id === item.student.id && rowExportingState?.type === "diploma" ? (
                                <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                              ) : (
                                <Award className="h-3 w-3 text-amber-500" />
                              )}
                              <span>Diplôme</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={rowExportingState !== null}
                              onClick={() => handleExportAttestationReussite(item)}
                              className="h-8 px-2 text-[11px] font-bold gap-1 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-950/50"
                              title="Imprimer Attestation Provisoire de Réussite"
                            >
                              {rowExportingState?.id === item.student.id && rowExportingState?.type === "attestation" ? (
                                <Loader2 className="h-3 w-3 animate-spin text-teal-500" />
                              ) : (
                                <FileCheck className="h-3 w-3 text-teal-500" />
                              )}
                              <span>Attestation</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={rowExportingState !== null}
                              onClick={() => handleExportDiplomaSupplement(item)}
                              className="h-8 px-2 text-[11px] font-bold gap-1 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                              title="Générer l'Annexe au Diplôme (UNESCO / CAMES)"
                            >
                              {rowExportingState?.id === item.student.id && rowExportingState?.type === "annexe" ? (
                                <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
                              ) : (
                                <GraduationCap className="h-3 w-3" />
                              )}
                              <span>Annexe</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={rowExportingState !== null}
                              onClick={() => handleExportAnnualSingleReleve(item)}
                              className="h-8 px-2.5 text-[11px] font-bold gap-1 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                              title="Imprimer Relevé Annuel Officiel (PDF)"
                            >
                              {rowExportingState?.id === item.student.id && rowExportingState?.type === "releve-annual" ? (
                                <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                              ) : (
                                <Printer className="h-3 w-3" />
                              )}
                              <span>Relevé</span>
                            </Button>
                            <Link
                              href={`/verify/${encodeURIComponent(item.student.matricule || item.student.id)}`}
                              target="_blank"
                              className="inline-flex items-center h-8 px-2 text-[11px] font-bold gap-1 rounded-md text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                              title="Vérifier l'Authenticité sur le Portail Public"
                            >
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                              <span>Vérifier</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Grille Collective de Délibération du Jury ({selectedSemester} • {sessionMode === "Rattrapage" ? "Session de Rattrapage" : "Session Normale"})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> V = Validé (≥ 10)
              </span>
              <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                <span className="h-2 w-2 rounded-full bg-indigo-500" /> VC = Compensé (Moy ≥ 10)
              </span>
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> NV = Non Validé (&lt; 10)
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="p-16 text-center text-xs text-slate-400 dark:text-slate-500">
              <RefreshCw className="h-7 w-7 animate-spin mx-auto mb-3 text-indigo-600 dark:text-indigo-400" />
              Calcul des compensations ECTS ({sessionMode === "Rattrapage" ? "Session 2 - Règle Max" : "Session 1"}) en temps réel...
            </div>
          ) : deliberationData.cohort.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-400 dark:text-slate-500 space-y-2">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
              <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">Aucun étudiant ou résultat trouvé</div>
              <p className="max-w-md mx-auto">
                Vérifiez que des notes ont bien été saisies pour cette promotion dans la rubrique <strong>Notes & Résultats</strong> pour ce semestre.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-900 dark:bg-slate-950 text-white">
                    <th className="p-3 text-center w-12 font-bold">Rang</th>
                    <th className="p-3 font-bold min-w-[180px]">Étudiant</th>
                    {deliberationData.ues.map((ue) => (
                      <th key={ue.id} className="p-3 text-center font-bold border-l border-slate-800 dark:border-slate-900 min-w-[110px]">
                        <div>{ue.codeUe}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{ue.creditsEcts} ECTS</div>
                      </th>
                    ))}
                    <th className="p-3 text-center font-bold border-l border-slate-800 dark:border-slate-900 bg-slate-800 dark:bg-slate-900">Moyenne /20</th>
                    <th className="p-3 text-center font-bold bg-slate-800 dark:bg-slate-900">Crédits /30</th>
                    <th className="p-3 text-center font-bold bg-slate-800 dark:bg-slate-900">Décision</th>
                    <th className="p-3 text-center font-bold bg-slate-800 dark:bg-slate-900">Mention</th>
                    <th className="p-3 text-center font-bold bg-slate-800 dark:bg-slate-900 min-w-[140px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {(onlyAjournes
                    ? deliberationData.cohort.filter((c) => !c.deliberation.isSemesterValidated)
                    : deliberationData.cohort
                  ).map((item) => {
                    const d = item.deliberation;
                    const hasUnvalidated = !d.isSemesterValidated;
                    return (
                      <tr key={item.student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-500 dark:text-slate-400">
                          {item.rank === 1 ? "🥇 1" : `${item.rank}`}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{item.student.nom}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{item.student.matricule || "N/A"}</div>
                        </td>

                        {/* UE Results */}
                        {deliberationData.ues.map((ue) => {
                          const r = d.ueResults.find((res: any) => res.codeUe === ue.codeUe || res.ueId === ue.id);
                          if (!r) return <td key={ue.id} className="p-3 text-center text-slate-300 dark:text-slate-600">-</td>;

                          const isV = r.status === "V";
                          const isVC = r.status === "VC";

                          return (
                            <td key={ue.id} className="p-3 text-center border-l border-slate-100 dark:border-slate-800">
                              <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {r.average.toFixed(2)}
                              </div>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                  isV
                                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                                    : isVC
                                    ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300"
                                    : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
                                }`}
                              >
                                {r.status} ({r.creditsAcquired} ECTS)
                              </span>
                            </td>
                          );
                        })}

                        {/* Semester Summary */}
                        <td className="p-3 text-center border-l border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                          {d.semesterAverage.toFixed(2)}
                        </td>
                        <td className="p-3 text-center bg-slate-50/50 dark:bg-slate-800/40 font-mono font-bold text-xs text-indigo-700 dark:text-indigo-400">
                          {d.creditsAcquired} / 30
                        </td>
                        <td className="p-3 text-center bg-slate-50/50 dark:bg-slate-800/40">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                              d.isSemesterValidated
                                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                                : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
                            }`}
                          >
                            {d.decision}
                          </span>
                        </td>
                        <td className="p-3 text-center bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-semibold">
                          {d.mention}
                        </td>

                        {/* Actions Column */}
                        <td className="p-3 text-center bg-slate-50/50 dark:bg-slate-800/40">
                          <div className="flex items-center justify-center gap-1.5">
                            {sessionMode === "Rattrapage" && hasUnvalidated && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const unvalidatedEcus = d.ueResults
                                    .filter((ue: any) => ue.status === "NV")
                                    .flatMap((ue: any) => ue.ecuResults?.filter((e: any) => e.finalGrade < 10) || []);
                                  const targetEcu = unvalidatedEcus[0] || d.ueResults[0]?.ecuResults?.[0];
                                  setRattrapageEditState({
                                    open: true,
                                    student: item.student,
                                    ecu: targetEcu,
                                    currentGrade: targetEcu?.finalGrade || 0,
                                    rattrapageGrade: targetEcu?.rattrapageScore ? String(targetEcu.rattrapageScore) : "",
                                  });
                                }}
                                className="h-8 px-2 text-[11px] font-bold gap-1 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100"
                                title="Saisir Note de Rattrapage (N2)"
                              >
                                <Sparkles className="h-3 w-3 text-amber-500" />
                                <span>Rattrapage</span>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={rowExportingState !== null}
                              onClick={() => handleExportOfficialDiploma(item)}
                              className="h-8 w-8 p-0 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400"
                              title="Imprimer Diplôme Officiel (A4 Paysage)"
                            >
                              {rowExportingState?.id === item.student.id && rowExportingState?.type === "diploma" ? (
                                <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                              ) : (
                                <Award className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={rowExportingState !== null}
                              onClick={() => handleExportAttestationReussite(item)}
                              className="h-8 w-8 p-0 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400"
                              title="Imprimer Attestation de Réussite"
                            >
                              {rowExportingState?.id === item.student.id && rowExportingState?.type === "attestation" ? (
                                <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
                              ) : (
                                <FileCheck className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={rowExportingState !== null}
                              onClick={() => handleExportDiplomaSupplement(item)}
                              className="h-8 w-8 p-0 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400"
                              title="Générer l'Annexe au Diplôme (UNESCO / CAMES)"
                            >
                              {rowExportingState?.id === item.student.id && rowExportingState?.type === "annexe" ? (
                                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                              ) : (
                                <GraduationCap className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPreviewStudentItem(item)}
                              className="h-8 w-8 p-0 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                              title="Aperçu du relevé"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={rowExportingState !== null}
                              onClick={() => handleExportSingleReleve(item)}
                              className="h-8 px-2.5 text-[11px] font-bold gap-1 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                              title="Imprimer Relevé Officiel"
                            >
                              {rowExportingState?.id === item.student.id && rowExportingState?.type === "releve-single" ? (
                                <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                              ) : (
                                <Printer className="h-3 w-3" />
                              )}
                              <span>Relevé</span>
                            </Button>
                            <Link
                              href={`/verify/${encodeURIComponent(item.student.matricule || item.student.id)}`}
                              target="_blank"
                              className="inline-flex items-center h-8 px-2 text-[11px] font-bold gap-1 rounded-md text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                              title="Vérifier l'Authenticité sur le Portail Public"
                            >
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                              <span>Vérifier</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL APERÇU RELEVÉ DE NOTES INDIVIDUEL (GRAND FORMAT WIDE) ──── */}
      {previewStudentItem && (
        <Dialog open={Boolean(previewStudentItem)} onOpenChange={(open) => !open && setPreviewStudentItem(null)}>
          <DialogContent className="!w-[94vw] !max-w-5xl sm:!max-w-5xl md:!max-w-5xl lg:!max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-6 sm:p-7 rounded-3xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                      Relevé de Notes & Crédits LMD
                    </DialogTitle>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{previewStudentItem.student.nom}</span>
                      <span>•</span>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                        {previewStudentItem.student.matricule || "N/A"}
                      </span>
                      <span>•</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                        {selectedSemester}
                      </span>
                      <span>•</span>
                      <span>{getClassDisplayName(selectedClass)}</span>
                    </div>
                  </div>
                </div>

                <span className={`self-start sm:self-center px-3.5 py-1.5 rounded-full text-xs font-black tracking-wide border shadow-xs ${
                  previewStudentItem.deliberation.isSemesterValidated
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                    : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                }`}>
                  {previewStudentItem.deliberation.decision}
                </span>
              </div>
            </DialogHeader>

            {/* Performance Summary Banner (4 Columns) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4 shrink-0">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Moyenne Semestrielle</div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {previewStudentItem.deliberation.semesterAverage.toFixed(2)} <span className="text-xs font-bold text-slate-400">/ 20</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80">
                <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Crédits ECTS Capitalisés</div>
                <div className="text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-1">
                  {previewStudentItem.deliberation.creditsAcquired} <span className="text-xs font-bold text-indigo-400">/ 30 ECTS</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Grade ECTS International</div>
                <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1.5 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-white text-xs font-bold font-mono">
                    Grade {getEctsGrade(previewStudentItem.deliberation.semesterAverage).grade}
                  </span>
                  <span className="text-xs text-slate-500 font-medium truncate">
                    {getEctsGrade(previewStudentItem.deliberation.semesterAverage).label}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rang & Promotion</div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {previewStudentItem.rank === 1 ? "🥇 1er" : `${previewStudentItem.rank}e`} <span className="text-xs font-bold text-slate-400">/ {deliberationData.totalStudents}</span>
                </div>
              </div>
            </div>

            {/* Comprehensive Academic Table (Scrollable Body) */}
            <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-900 dark:bg-slate-950 text-white font-bold z-10">
                  <tr className="border-b border-slate-800">
                    <th className="p-3 w-28 text-center">Code UE</th>
                    <th className="p-3">Unités d'Enseignement & Matières (ECU)</th>
                    <th className="p-3 text-center w-16">Coef</th>
                    <th className="p-3 text-center w-24">Note /20</th>
                    <th className="p-3 text-center w-28">Crédits ECTS</th>
                    <th className="p-3 text-center w-36">Statut / Décision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {previewStudentItem.deliberation.ueResults.map((ue: any) => {
                    const isV = ue.status === "V";
                    const isVC = ue.status === "VC";
                    return (
                      <React.Fragment key={ue.ueId || ue.codeUe}>
                        {/* UE Row Header */}
                        <tr className="bg-slate-100/70 dark:bg-slate-800/70 font-bold">
                          <td className="p-3 text-center font-mono text-xs text-indigo-700 dark:text-indigo-400">
                            {ue.codeUe}
                          </td>
                          <td className="p-3 text-slate-900 dark:text-slate-100">
                            {ue.nameUe} <span className="text-[10px] text-slate-500 font-normal">({ue.typeUe || "Fondamentale"})</span>
                          </td>
                          <td className="p-3 text-center text-slate-400">-</td>
                          <td className="p-3 text-center font-mono font-bold text-sm">
                            <span className={isV ? "text-emerald-600" : isVC ? "text-indigo-600" : "text-rose-600"}>
                              {ue.average.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {ue.creditsAcquired} / {ue.creditsEcts}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isV
                                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                                : isVC
                                ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300"
                                : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
                            }`}>
                              {isV ? "Validé (V)" : isVC ? "Compensé (VC)" : "Non Validé (NV)"}
                            </span>
                          </td>
                        </tr>

                        {/* ECU Sub-rows */}
                        {ue.ecuResults && ue.ecuResults.map((ecu: any) => {
                          const isGraded = ecu.finalGrade !== null && ecu.finalGrade !== undefined && ecu.finalGrade > 0;
                          const ecuPass = isGraded && ecu.finalGrade >= 10.0;
                          return (
                            <tr key={ecu.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400">
                              <td className="p-2.5 text-center font-mono text-[11px] text-slate-400">
                                {ecu.codeEcu || "-"}
                              </td>
                              <td className="p-2.5 pl-6 font-medium text-slate-800 dark:text-slate-200">
                                • {ecu.nameEcu}
                              </td>
                              <td className="p-2.5 text-center font-mono text-[11px]">
                                {ecu.coefficient || 1}
                              </td>
                              <td className="p-2.5 text-center font-mono font-semibold">
                                {isGraded ? (
                                  <span className={ecuPass ? "text-slate-900 dark:text-slate-100" : "text-rose-600 font-bold"}>
                                    {ecu.finalGrade.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="p-2.5 text-center font-mono text-[11px] text-slate-500">
                                {ecu.creditsEcts} ECTS
                              </td>
                              <td className="p-2.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {isGraded ? (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                      ecuPass ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40" : "text-rose-700 bg-rose-50 dark:bg-rose-950/40"
                                    }`}>
                                      {ecuPass ? "Validé" : "Ajourné"}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400">Non évalué</span>
                                  )}

                                  {sessionMode === "Rattrapage" && (!ecuPass || (ecu.rattrapageScore !== null && ecu.rattrapageScore !== undefined)) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRattrapageEditState({
                                          open: true,
                                          student: previewStudentItem.student,
                                          ecu: ecu,
                                          currentGrade: ecu.examScore || ecu.finalGrade || 0,
                                          rattrapageGrade: ecu.rattrapageScore !== null && ecu.rattrapageScore !== undefined ? String(ecu.rattrapageScore) : "",
                                        });
                                      }}
                                      className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 text-[10px] font-bold inline-flex items-center gap-1 transition-colors"
                                      title="Saisir note de rattrapage (N2)"
                                    >
                                      <Sparkles className="h-2.5 w-2.5" /> Note N2
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-3 shrink-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Normes REESAO / CAMES • Seuil de compensation inter-UE : 10.00 / 20 • Règle Max(N1, N2)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewStudentItem(null)}
                  className="text-xs font-semibold px-4 h-9 rounded-xl border-slate-200 dark:border-slate-700"
                >
                  Fermer
                </Button>
                <Button
                  onClick={() => handleExportSingleReleve(previewStudentItem)}
                  className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-5 rounded-xl shadow-md shadow-indigo-500/20"
                >
                  <Printer className="h-4 w-4" />
                  Imprimer le Relevé Officiel (PDF)
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL SAISIE DE NOTE DE RATTRAPAGE (SESSION 2 - N2) ────────────────── */}
      <Dialog
        open={rattrapageEditState.open}
        onOpenChange={(open) => {
          if (!open) {
            setRattrapageEditState((prev) => ({ ...prev, open: false }));
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 dark:text-slate-100">
                  Saisie Note de Rattrapage (Session 2)
                </DialogTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Règle du meilleur score : <strong>Note Retenue = Max(N1, N2)</strong>
                </p>
              </div>
            </div>
          </DialogHeader>

          {rattrapageEditState.student && (
            <div className="space-y-4 my-2">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Étudiant :</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{rattrapageEditState.student.nom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Matricule :</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{rattrapageEditState.student.matricule || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Promotion / Semestre :</span>
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">{getClassDisplayName(selectedClass)} • {selectedSemester}</span>
                </div>
              </div>

              {/* Matière en cours */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Matière / Électif Constitutif (ECU) :
                </label>
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                  <span>{rattrapageEditState.ecu?.nameEcu || "Matière"}</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    Note Session 1 (N1) : {rattrapageEditState.currentGrade.toFixed(2)} / 20
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nouvelle Note de Rattrapage (N2) / 20 :
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.25"
                  value={rattrapageEditState.rattrapageGrade}
                  onChange={(e) => setRattrapageEditState((prev) => ({ ...prev, rattrapageGrade: e.target.value }))}
                  placeholder="Ex: 14.50"
                  autoFocus
                  className="w-full text-lg font-mono font-black px-4 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <span>Score retenu pour la délibération :</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {Math.max(
                      rattrapageEditState.currentGrade,
                      parseFloat(rattrapageEditState.rattrapageGrade) || 0
                    ).toFixed(2)} / 20
                  </span>
                  {parseFloat(rattrapageEditState.rattrapageGrade) >= 10 && (
                    <span className="text-emerald-600 font-bold ml-1">→ Validé ! 🎉</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRattrapageEditState((prev) => ({ ...prev, open: false }))}
              className="text-xs font-semibold px-4 h-9 rounded-xl"
            >
              Annuler
            </Button>
            <Button
              size="sm"
              disabled={isSavingRattrapage}
              onClick={handleSaveRattrapageGrade}
              className="gap-2 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-bold text-xs h-9 px-5 rounded-xl shadow-md"
            >
              {isSavingRattrapage ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>{isSavingRattrapage ? "Enregistrement..." : "Enregistrer & Recalculer"}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

