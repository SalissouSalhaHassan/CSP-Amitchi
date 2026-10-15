"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import OfficialDocumentHeader from "@/domains/printing/components/OfficialDocumentHeader";
import autoTable from "jspdf-autotable";
import { amiriFontBase64 } from "@/domains/printing/utils/amiri-font";
import { hasArabicCharacters, reshapeArabicText } from "@/domains/printing/utils/arabic-reshaper";

function ensureAmiriRegistered(doc: jsPDF) {
  try {
    const fontList = doc.getFontList();
    if (!fontList["Amiri"]) {
      if (amiriFontBase64) {
        doc.addFileToVFS("Amiri-Regular.ttf", amiriFontBase64);
        doc.addFont("Amiri-Regular.ttf", "Amiri", "normal", "Identity-H");
      }
    }
  } catch (e) {
    console.warn("Failed to check or register Amiri font in ministry:", e);
  }
}

function drawTextBilingual(doc: jsPDF, text: string, x: number, y: number, options?: any) {
  if (hasArabicCharacters(text)) {
    ensureAmiriRegistered(doc);
    try {
      const reshaped = reshapeArabicText(text);
      const activeFont = doc.getFont();
      const activeStyle = activeFont.fontStyle;
      const activeName = activeFont.fontName;
      
      doc.setFont("Amiri", "normal");
      doc.text(reshaped, x, y, options);
      doc.setFont(activeName, activeStyle);
    } catch (e: any) {
      console.warn("Error rendering Arabic text with Amiri font:", e);
      doc.text(text, x, y, options);
    }
  } else {
    doc.text(text, x, y, options);
  }
}

function drawWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, align: "left" | "right" | "center"): number {
  const isAr = hasArabicCharacters(text);
  const currentFont = doc.getFont();
  const currentName = currentFont.fontName;
  const currentStyle = currentFont.fontStyle;

  if (isAr) {
    ensureAmiriRegistered(doc);
    const reshaped = reshapeArabicText(text);
    doc.setFont("Amiri", "normal");
    const lines = doc.splitTextToSize(reshaped, maxWidth);
    let tempY = y;
    for (const line of lines) {
      doc.text(line, x, tempY, { align });
      tempY += 4;
    }
    doc.setFont(currentName, currentStyle);
    return tempY - y;
  } else {
    const lines = doc.splitTextToSize(text, maxWidth);
    let tempY = y;
    for (const line of lines) {
      doc.text(line, x, tempY, { align });
      tempY += 4;
    }
    return tempY - y;
  }
}

function drawPDFHeader(
  doc: jsPDF,
  headerConfig: any,
  title: string
): number {
  const style = headerConfig?.style || "classic_dual_logo";
  const schoolName = headerConfig?.schoolName || "ÉCOLE EXCELLENCE";
  const address = headerConfig?.address || "";
  const phone = headerConfig?.phone || "";
  const email = headerConfig?.email || "";
  const registrationNo = headerConfig?.registrationNo || "";
  const schoolYear = headerConfig?.schoolYear || "";
  const ministry = headerConfig?.ministry || "Ministère de l'Éducation Nationale";
  const service = headerConfig?.service || "Service de la Scolarité";
  const bp = headerConfig?.bp || "";
  const motto = headerConfig?.motto || "";
  
  const leftLogo = headerConfig?.leftLogo || "";
  const rightLogo = headerConfig?.rightLogo || leftLogo;
  const centerLogo = headerConfig?.centerLogo || leftLogo;

  const W = doc.internal.pageSize.getWidth();
  const margin = 10;
  const rightX = W - margin;
  const centerX = W / 2;

  if (style === "modern_card") {
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(margin, 8, W - 2 * margin, 26, 2, 2, "F");
    
    if (leftLogo) {
      try {
        doc.addImage(leftLogo, 'PNG', margin + 4, 11, 20, 20);
      } catch (e) {}
    }
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    drawWrappedText(doc, schoolName, margin + 28, 17, W - 2 * margin - 38, "left");
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(220, 225, 255);
    drawWrappedText(doc, `Année Scolaire: ${schoolYear}`, margin + 28, 23, W - 2 * margin - 38, "left");
    drawWrappedText(doc, `${address} ${phone ? '| Tél: ' + phone : ''}`, margin + 28, 28, W - 2 * margin - 38, "left");
    
    doc.setTextColor(0, 0, 0);
    
    if (title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      drawWrappedText(doc, title.toUpperCase(), centerX, 44, W - 2 * margin, "center");
      return 52;
    }
    return 38;
  }
  
  if (style === "bilingual_center_logo") {
    if (centerLogo) {
      try {
        doc.addImage(centerLogo, 'PNG', centerX - 13, 8, 26, 26);
      } catch (e) {}
    }
    
    const leftLines = [
      headerConfig?.country || "RÉPUBLIQUE DU NIGER",
      ministry,
      headerConfig?.regionalDirection || "",
      headerConfig?.departmentalDirection || "",
      headerConfig?.inspection || "",
      schoolName,
      service,
      address,
      bp ? `BP : ${bp}` : "",
      phone ? `Tél: ${phone}` : "",
      email ? `Email: ${email}` : "",
    ].filter(Boolean);

    const rightLines = [
      headerConfig?.countryAr || "جمهورية النيجر",
      headerConfig?.ministryAr || "وزارة التربية الوطنية",
      headerConfig?.regionalDirectionAr || "",
      headerConfig?.departmentalDirectionAr || "",
      headerConfig?.inspectionAr || "",
      headerConfig?.schoolNameAr || schoolName,
      headerConfig?.serviceAr || "",
    ].filter(Boolean);

    const colWidth = centerLogo ? (centerX - margin - 15) : (centerX - margin - 4);
    
    let leftY = 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    for (const line of leftLines) {
      const height = drawWrappedText(doc, line, margin, leftY, colWidth, "left");
      leftY += height + 0.5;
    }
    
    let rightY = 12;
    for (const line of rightLines) {
      const height = drawWrappedText(doc, line, rightX, rightY, colWidth, "right");
      rightY += height + 0.5;
    }
    
    const maxY = Math.max(leftY, rightY);
    doc.setLineWidth(0.5);
    doc.line(margin, maxY + 2, rightX, maxY + 2);
    
    if (title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      drawWrappedText(doc, title.toUpperCase(), centerX, maxY + 12, W - 2 * margin, "center");
      return maxY + 18;
    }
    return maxY + 4;
  }
  
  if (style === "university_formal") {
    if (leftLogo) {
      try {
        doc.addImage(leftLogo, 'PNG', margin, 8, 22, 22);
      } catch (e) {}
    }
    if (rightLogo) {
      try {
        doc.addImage(rightLogo, 'PNG', rightX - 22, 8, 22, 22);
      } catch (e) {}
    }
    
    const centerLines = [
      headerConfig?.country || "REPUBLIQUE DU NIGER",
      schoolName,
      service,
      [bp && `BP : ${bp}`, address, phone && `Tél. ${phone}`].filter(Boolean).join(" | "),
      email ? `Email : ${email}` : "",
      registrationNo ? `Agrément N°: ${registrationNo}` : "",
    ].filter(Boolean);

    let centerY = 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const height0 = drawWrappedText(doc, centerLines[0].toUpperCase(), centerX, centerY, W - 2 * margin - 50, "center");
    centerY += height0 + 1;
    
    doc.setFontSize(12);
    const height1 = drawWrappedText(doc, centerLines[1], centerX, centerY, W - 2 * margin - 50, "center");
    centerY += height1 + 1;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    for (let i = 2; i < centerLines.length; i++) {
      const height = drawWrappedText(doc, centerLines[i], centerX, centerY, W - 2 * margin - 50, "center");
      centerY += height + 0.5;
    }
    
    const finalY = Math.max(centerY + 3, 32);
    doc.setLineWidth(0.5);
    doc.line(margin, finalY, rightX, finalY);
    
    if (title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      drawWrappedText(doc, title.toUpperCase(), centerX, finalY + 12, W - 2 * margin, "center");
      return finalY + 18;
    }
    return finalY + 2;
  }
  
  if (style === "minimal_administrative") {
    if (centerLogo || leftLogo) {
      try {
        doc.addImage(centerLogo || leftLogo, 'PNG', rightX - 22, 8, 22, 22);
      } catch (e) {}
    }
    
    const leftLines = [
      schoolName,
      headerConfig?.country || "RÉPUBLIQUE DU NIGER",
      ministry,
      headerConfig?.regionalDirection || "",
      headerConfig?.inspection || "",
      registrationNo ? `Agrément: ${registrationNo}` : "",
      [address, phone && `Tél: ${phone}`].filter(Boolean).join(" | "),
      email ? `Email: ${email}` : "",
    ].filter(Boolean);

    let leftY = 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const height0 = drawWrappedText(doc, leftLines[0], margin, leftY, W - 2 * margin - 25, "left");
    leftY += height0 + 1;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    for (let i = 1; i < leftLines.length; i++) {
      const height = drawWrappedText(doc, leftLines[i], margin, leftY, W - 2 * margin - 25, "left");
      leftY += height + 0.5;
    }
    
    const finalY = Math.max(leftY + 3, 32);
    doc.setLineWidth(0.3);
    doc.line(margin, finalY, rightX, finalY);
    
    if (title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      drawWrappedText(doc, title.toUpperCase(), centerX, finalY + 12, W - 2 * margin, "center");
      return finalY + 18;
    }
    return finalY + 2;
  }
  
  // DEFAULT / CLASSIC DUAL LOGO
  if (leftLogo) {
    try {
      doc.addImage(leftLogo, 'PNG', margin, 8, 22, 22);
    } catch (e) {}
  }
  if (rightLogo && rightLogo !== leftLogo) {
    try {
      doc.addImage(rightLogo, 'PNG', rightX - 22, 8, 22, 22);
    } catch (e) {}
  }
  
  const centerLines = [
    schoolName,
    motto ? `"${motto}"` : "",
    [registrationNo && `Agrément: ${registrationNo}`, `Niveau: Secondaire`].filter(Boolean).join(" | "),
    `Année Scolaire: ${schoolYear}`,
    [phone && `Tél: ${phone}`, email && `Email: ${email}`].filter(Boolean).join(" | "),
    address ? `Adresse: ${address}` : "",
  ].filter(Boolean);

  let centerY = 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const height0 = drawWrappedText(doc, centerLines[0], centerX, centerY, W - 2 * margin - 50, "center");
  centerY += height0 + 1;

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  for (let i = 1; i < centerLines.length; i++) {
    if (i === 1 && motto) {
      doc.setFont("helvetica", "italic");
      const height = drawWrappedText(doc, centerLines[i], centerX, centerY, W - 2 * margin - 50, "center");
      centerY += height + 0.5;
      doc.setFont("helvetica", "normal");
    } else {
      const height = drawWrappedText(doc, centerLines[i], centerX, centerY, W - 2 * margin - 50, "center");
      centerY += height + 0.5;
    }
  }
  
  const finalY = Math.max(centerY + 3, 32);
  doc.setLineWidth(0.5);
  doc.line(margin, finalY, rightX, finalY);
  
  if (title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    drawWrappedText(doc, title.toUpperCase(), centerX, finalY + 12, W - 2 * margin, "center");
    return finalY + 18;
  }
  return finalY + 2;
}
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Filter,
  Printer,
  Search,
  Users,
  X,
  Droplets,
  Lightbulb,
  FileText,
  FileSpreadsheet,
  Globe,
  Award,
  Activity,
  Clock,
  ShieldAlert,
  HelpCircle,
  TrendingDown,
  Layers,
  BookOpen,
  AlertCircle,
  ChevronDown,
  Download,
  FileCode,
  Share2,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { getSessions } from "@/domains/academics/actions/academics.actions";
import { getMinistrySchoolsData } from "@/domains/ministry/actions/ministry.actions";
import { getCanevasReferenceLists, getEducationalLevels } from "@/domains/academics/actions/academics.actions";

interface SchoolData {
  code: string;
  name: string;
  type: "Public" | "Privé";
  cycle: string;
  region: string;
  department: string;
  inspection: string;
  commune: string;
  eleves: number;
  filles: number;
  garcons: number;
  enseignants: number;
  salles: number;
  eau: boolean;
  electricite: boolean;
  latrines: boolean;
  manqueEnseignants: number;
  manqueSalles: number;
  manqueLivres: number;
  abandonRate: number;
  completion: number; // 0 to 100
  lastDeclaration: string; // YYYY-MM-DD
  successRate: number; // 0 to 100
  attendanceRate: number; // 0 to 100
  status: "Valide" | "À vérifier" | "Incomplet";
}

interface SessionOption {
  sessionName?: string | null;
  isActive?: boolean | null;
}

export default function MinistryDashboardPage() {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [schoolSessions, setSchoolSessions] = useState<SessionOption[]>([]);
  const [activeHeaderConfig, setActiveHeaderConfig] = useState<any>(null);
  const [dynamicCycles, setDynamicCycles] = useState<string[]>([]);

  useEffect(() => {
    import("@/domains/settings/actions/settings.actions").then(({ getDocumentHeaderConfig }) => {
      getDocumentHeaderConfig().then((res) => {
        if (res?.data) {
          setActiveHeaderConfig(res.data);
        }
      });
    });

    Promise.all([
      getCanevasReferenceLists().catch(() => null),
      getEducationalLevels(true).catch(() => null)
    ]).then(([refsRes, levelsRes]) => {
      const refCycles = (refsRes as any)?.data?.cycle || (refsRes as any)?.cycle || [];
      const eduLevels = (levelsRes as any)?.data || levelsRes || [];
      
      const combined = Array.from(new Set([
        "Préscolaire", "Primaire", "Collège", "Lycée", "Technique", "Supérieur",
        ...eduLevels.map((l: any) => l.levelName || l.name || l).filter(Boolean),
        ...refCycles.map((c: any) => c.value || c).filter(Boolean)
      ]));
      setDynamicCycles(combined);
    });
  }, []);
  
  // Filter States
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedInsp, setSelectedInsp] = useState("all");
  const [selectedCommune, setSelectedCommune] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCycle, setSelectedCycle] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedSchoolDetail, setSelectedSchoolDetail] = useState<SchoolData | null>(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSchools = async () => {
      setLoadingSchools(true);
      try {
        const res = await getMinistrySchoolsData();
        if (cancelled) return;

        if (res.success) {
          setSchools((res.data || []) as SchoolData[]);
        } else {
          setSchools([]);
          toast.error(res.error || "Impossible de charger les données ministérielles.");
        }
      } catch {
        if (!cancelled) {
          setSchools([]);
          toast.error("Impossible de charger les données ministérielles.");
        }
      } finally {
        if (!cancelled) setLoadingSchools(false);
      }
    };

    loadSchools();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSessions = async () => {
      try {
        const res = await getSessions();
        const rawData = (res as { data?: { data?: SessionOption[] } | SessionOption[] })?.data;
        const sessions = (Array.isArray(rawData) ? rawData : rawData?.data) || [];
        if (cancelled) return;

        setSchoolSessions(sessions);
        const activeSession = sessions.find((session) => session.isActive) || sessions[0];
        setSelectedYear(activeSession?.sessionName || "2025-2026");
      } catch {
        if (!cancelled) {
          setSchoolSessions([]);
          setSelectedYear("2025-2026");
        }
      }
    };

    loadSessions();

    return () => {
      cancelled = true;
    };
  }, []);

  const academicYearOptions = useMemo(() => {
    const realSessions = schoolSessions
      .map((session) => String(session.sessionName || "").trim())
      .filter(Boolean);
    const uniqueSessions = Array.from(new Set(realSessions));
    return uniqueSessions.length > 0 ? uniqueSessions : ["2025-2026", "2024-2025"];
  }, [schoolSessions]);

  const declarationDeadline = useMemo(() => {
    const years = selectedYear.match(/\d{4}/g)?.map(Number) || [];
    const closingYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear();
    return new Date(closingYear, 5, 1);
  }, [selectedYear]);

  const isDeclarationLate = (dateStr: string) => {
    const declarationDate = new Date(dateStr);
    if (Number.isNaN(declarationDate.getTime())) return false;
    return declarationDate < declarationDeadline;
  };

  // Filter lists based on selected region
  const departments = useMemo(() => {
    const list = schools.filter(s => selectedRegion === "all" || s.region === selectedRegion);
    return Array.from(new Set(list.map(s => s.department)));
  }, [schools, selectedRegion]);

  const inspections = useMemo(() => {
    const list = schools.filter(s => {
      const matchReg = selectedRegion === "all" || s.region === selectedRegion;
      const matchDept = selectedDept === "all" || s.department === selectedDept;
      return matchReg && matchDept;
    });
    return Array.from(new Set(list.map(s => s.inspection)));
  }, [schools, selectedRegion, selectedDept]);

  const communes = useMemo(() => {
    const list = schools.filter(s => {
      const matchReg = selectedRegion === "all" || s.region === selectedRegion;
      const matchDept = selectedDept === "all" || s.department === selectedDept;
      const matchInsp = selectedInsp === "all" || s.inspection === selectedInsp;
      return matchReg && matchDept && matchInsp;
    });
    return Array.from(new Set(list.map(s => s.commune)));
  }, [schools, selectedRegion, selectedDept, selectedInsp]);

  const cyclesList = useMemo(() => {
    const defaults = ["Préscolaire", "Primaire", "Collège", "Lycée", "Technique", "Supérieur"];
    const schoolCycles = schools.map(s => s.cycle).filter(Boolean);
    return Array.from(new Set([...defaults, ...dynamicCycles, ...schoolCycles]));
  }, [dynamicCycles, schools]);

  // Filtered Schools
  const filteredSchools = useMemo(() => {
    return schools.filter(s => {
      const matchSearch = searchQuery ? (
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.commune.toLowerCase().includes(searchQuery.toLowerCase())
      ) : true;
      const matchRegion = selectedRegion === "all" || s.region === selectedRegion;
      const matchDept = selectedDept === "all" || s.department === selectedDept;
      const matchInsp = selectedInsp === "all" || s.inspection === selectedInsp;
      const matchCommune = selectedCommune === "all" || s.commune === selectedCommune;
      const matchType = selectedType === "all" || s.type === selectedType;
      const matchCycle = selectedCycle === "all" || s.cycle === selectedCycle;

      return matchSearch && matchRegion && matchDept && matchInsp && matchCommune && matchType && matchCycle;
    });
  }, [schools, searchQuery, selectedRegion, selectedDept, selectedInsp, selectedCommune, selectedType, selectedCycle]);

  // KPIs Calculations
  const kpis = useMemo(() => {
    const totalSchools = filteredSchools.length;
    let totalEleves = 0;
    let totalFilles = 0;
    let totalGarcons = 0;
    let totalEnseignants = 0;
    let sumSuccess = 0;
    let sumAttendance = 0;
    let noWater = 0;
    let noElec = 0;
    let noLatrines = 0;
    let missingTeachers = 0;
    let missingSalles = 0;
    let missingBooks = 0;
    let sumAbandon = 0;
    let sumCompletion = 0;
    let lateDeclaration = 0;

    filteredSchools.forEach(s => {
      totalEleves += s.eleves;
      totalFilles += s.filles;
      totalGarcons += s.garcons;
      totalEnseignants += s.enseignants;
      sumSuccess += s.successRate;
      sumAttendance += s.attendanceRate;
      if (!s.eau) noWater++;
      if (!s.electricite) noElec++;
      if (!s.latrines) noLatrines++;
      missingTeachers += s.manqueEnseignants;
      missingSalles += s.manqueSalles;
      missingBooks += s.manqueLivres;
      sumAbandon += s.abandonRate;
      sumCompletion += s.completion;
      if (isDeclarationLate(s.lastDeclaration)) lateDeclaration++;
    });

    const pupilTeacherRatio = totalEnseignants > 0 ? (totalEleves / totalEnseignants).toFixed(1) : "0";
    const avgAbandon = totalSchools > 0 ? (sumAbandon / totalSchools).toFixed(1) : "0";
    const avgCompletion = totalSchools > 0 ? (sumCompletion / totalSchools).toFixed(0) : "0";
    const priorityZones = filteredSchools.filter(s => s.successRate < 65 || !s.eau || !s.electricite || s.abandonRate > 8).length;

    return {
      totalSchools,
      totalEleves,
      totalFilles,
      totalGarcons,
      totalEnseignants,
      pupilTeacherRatio,
      avgSuccess: totalSchools > 0 ? (sumSuccess / totalSchools).toFixed(1) : "0",
      avgAttendance: totalSchools > 0 ? (sumAttendance / totalSchools).toFixed(1) : "0",
      avgAbandon,
      noWater,
      noElec,
      noLatrines,
      missingTeachers,
      missingSalles,
      missingBooks,
      avgCompletion,
      priorityZones,
      lateDeclaration,
    };
  }, [filteredSchools, declarationDeadline]);

  // Public/Private Breakdown
  const publicPrivateRatio = useMemo(() => {
    let pub = 0;
    let priv = 0;
    filteredSchools.forEach(s => {
      if (s.type === "Public") pub++;
      else priv++;
    });
    const total = pub + priv || 1;
    return {
      publicCount: pub,
      privateCount: priv,
      publicPct: ((pub / total) * 100).toFixed(0),
      privatePct: ((priv / total) * 100).toFixed(0)
    };
  }, [filteredSchools]);

  // Statistics by Region
  const regionStats = useMemo(() => {
    const stats: Record<string, { schools: number; eleves: number; completion: number }> = {};
    filteredSchools.forEach(s => {
      if (!stats[s.region]) {
        stats[s.region] = { schools: 0, eleves: 0, completion: 0 };
      }
      stats[s.region].schools++;
      stats[s.region].eleves += s.eleves;
      stats[s.region].completion += s.completion;
    });

    return Object.entries(stats).map(([region, data]) => ({
      region,
      schoolsCount: data.schools,
      studentsCount: data.eleves,
      avgCompletion: (data.completion / data.schools).toFixed(0),
    }));
  }, [filteredSchools]);

  // Statistics by Inspection
  const inspectionStats = useMemo(() => {
    const stats: Record<string, { schools: number; eleves: number; success: number }> = {};
    filteredSchools.forEach(s => {
      if (!stats[s.inspection]) {
        stats[s.inspection] = { schools: 0, eleves: 0, success: 0 };
      }
      stats[s.inspection].schools++;
      stats[s.inspection].eleves += s.eleves;
      stats[s.inspection].success += s.successRate;
    });

    return Object.entries(stats).map(([inspection, data]) => ({
      inspection,
      schoolsCount: data.schools,
      studentsCount: data.eleves,
      avgSuccess: (data.success / data.schools).toFixed(1),
    }));
  }, [filteredSchools, declarationDeadline]);

  // Alerts
  const nationalAlerts = useMemo(() => {
    const alerts: { school: string; code: string; type: string; severity: "critical" | "warning" }[] = [];
    filteredSchools.forEach(s => {
      if (!s.eau && !s.electricite) {
        alerts.push({ school: s.name, code: s.code, type: "Manque d'eau et d'électricité critiques", severity: "critical" });
      } else if (!s.eau) {
        alerts.push({ school: s.name, code: s.code, type: "Absence d'alimentation en eau potable", severity: "warning" });
      } else if (!s.electricite) {
        alerts.push({ school: s.name, code: s.code, type: "Pas d'électricité fonctionnelle", severity: "warning" });
      }

      if (!s.latrines) {
        alerts.push({ school: s.name, code: s.code, type: "Absence de latrines opérationnelles", severity: "critical" });
      }

      if (s.manqueEnseignants > 2) {
        alerts.push({ school: s.name, code: s.code, type: `Déficit de ${s.manqueEnseignants} enseignants`, severity: "critical" });
      }

      if (s.abandonRate > 8) {
        alerts.push({ school: s.name, code: s.code, type: `Taux d'abandon élevé (${s.abandonRate}%)`, severity: "critical" });
      }

      if (isDeclarationLate(s.lastDeclaration)) {
        alerts.push({ school: s.name, code: s.code, type: `Fiche de déclaration en retard (${s.lastDeclaration})`, severity: "critical" });
      }

      if (s.completion < 60) {
        alerts.push({ school: s.name, code: s.code, type: `Fiche canevas incomplète (${s.completion}%)`, severity: "warning" });
      }
    });
    return alerts;
  }, [filteredSchools]);

  // 1. Export Excel Multi-Feuilles SDMX
  const handleExcelExport = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Synthese KPIs
      const kpisData = [
        { Indicateur: "Total Établissements", Valeur: kpis.totalSchools },
        { Indicateur: "Total Élèves", Valeur: kpis.totalEleves },
        { Indicateur: "Total Filles", Valeur: kpis.totalFilles },
        { Indicateur: "Total Garçons", Valeur: kpis.totalGarcons },
        { Indicateur: "Total Enseignants", Valeur: kpis.totalEnseignants },
        { Indicateur: "Ratio Élève/Enseignant", Valeur: kpis.pupilTeacherRatio },
        { Indicateur: "Taux Réussite Moyen (%)", Valeur: kpis.avgSuccess },
        { Indicateur: "Taux Présence Moyen (%)", Valeur: kpis.avgAttendance },
        { Indicateur: "Taux Abandon Moyen (%)", Valeur: kpis.avgAbandon },
        { Indicateur: "Écoles Sans Eau Potable", Valeur: kpis.noWater },
        { Indicateur: "Écoles Sans Électricité", Valeur: kpis.noElec },
        { Indicateur: "Écoles Sans Latrines", Valeur: kpis.noLatrines },
        { Indicateur: "Manque Enseignants", Valeur: kpis.missingTeachers },
        { Indicateur: "Manque Salles de Classe", Valeur: kpis.missingSalles },
        { Indicateur: "Manque Manuels Scolaires", Valeur: kpis.missingBooks },
        { Indicateur: "Taux Complétude Données (%)", Valeur: kpis.avgCompletion },
        { Indicateur: "Zones Prioritaires", Valeur: kpis.priorityZones },
        { Indicateur: "Retards Déclarations", Valeur: kpis.lateDeclaration }
      ];
      const wsKpis = XLSX.utils.json_to_sheet(kpisData);
      XLSX.utils.book_append_sheet(wb, wsKpis, "Synthèse KPIs");

      // Sheet 2: Établissements
      const schoolsData = filteredSchools.map((s, idx) => ({
        "N°": idx + 1,
        "Code": s.code,
        "Nom": s.name,
        "Type": s.type,
        "Cycle": s.cycle,
        "Région": s.region,
        "Département": s.department,
        "Inspection": s.inspection,
        "Commune": s.commune,
        "Élèves": s.eleves,
        "Filles": s.filles,
        "Garçons": s.garcons,
        "Enseignants": s.enseignants,
        "Salles": s.salles,
        "Eau Potable": s.eau ? "Oui" : "Non",
        "Électricité": s.electricite ? "Oui" : "Non",
        "Latrines": s.latrines ? "Oui" : "Non",
        "Manque Enseignants": s.manqueEnseignants,
        "Manque Salles": s.manqueSalles,
        "Manque Livres": s.manqueLivres,
        "Taux Abandon (%)": s.abandonRate,
        "Complétude (%)": s.completion,
        "Taux Réussite (%)": s.successRate,
        "Taux Présence (%)": s.attendanceRate,
        "Dernière Déclaration": s.lastDeclaration
      }));
      const wsSchools = XLSX.utils.json_to_sheet(schoolsData);
      XLSX.utils.book_append_sheet(wb, wsSchools, "Registre Établissements");

      // Sheet 3: Statistiques Régionales
      const wsRegion = XLSX.utils.json_to_sheet(regionStats);
      XLSX.utils.book_append_sheet(wb, wsRegion, "Stats Régionales");

      // Sheet 4: Alertes Critiques
      const wsAlerts = XLSX.utils.json_to_sheet(nationalAlerts);
      XLSX.utils.book_append_sheet(wb, wsAlerts, "Alertes Critiques");

      XLSX.writeFile(wb, `Edut_Rapport_Ministeriel_SDMX_${selectedYear}_${Date.now()}.xlsx`);
      toast.success("Rapport Excel Multi-Feuilles SDMX téléchargé !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export Excel");
    }
  };

  // 2. Export JSON EMIS / UNESCO-UIS
  const handleJsonEmisExport = () => {
    try {
      const payload = {
        standard: "UNESCO-UIS EMIS SDMX 3.0",
        schemaVersion: "1.0",
        organization: "Ministère de l'Éducation Nationale",
        exportTimestamp: new Date().toISOString(),
        academicYear: selectedYear,
        filters: {
          region: selectedRegion,
          department: selectedDept,
          inspection: selectedInsp,
          commune: selectedCommune,
          type: selectedType,
          cycle: selectedCycle
        },
        nationalSummary: kpis,
        sectorBreakdown: publicPrivateRatio,
        regionalAggregates: regionStats,
        inspectionAggregates: inspectionStats,
        activeAlerts: nationalAlerts,
        establishments: filteredSchools
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `EMIS_UNESCO_Data_${selectedYear}_${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Fichier JSON (Norme EMIS/UNESCO) généré avec succès !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export JSON EMIS");
    }
  };

  // 3. Export XML SIGE / Ministère
  const handleXmlSigeExport = () => {
    try {
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<RapportMinisteriel xmlns="http://education.gov/sige/v2">\n`;
      xml += `  <Metadonnees>\n`;
      xml += `    <Ministere>Ministère de l'Éducation Nationale</Ministere>\n`;
      xml += `    <AnneeScolaire>${selectedYear}</AnneeScolaire>\n`;
      xml += `    <DateExport>${new Date().toISOString()}</DateExport>\n`;
      xml += `    <NombreEtablissements>${kpis.totalSchools}</NombreEtablissements>\n`;
      xml += `  </Metadonnees>\n`;

      xml += `  <IndicateursNationaux>\n`;
      xml += `    <TotalEleves>${kpis.totalEleves}</TotalEleves>\n`;
      xml += `    <TotalEnseignants>${kpis.totalEnseignants}</TotalEnseignants>\n`;
      xml += `    <RatioPupilTeacher>${kpis.pupilTeacherRatio}</RatioPupilTeacher>\n`;
      xml += `    <TauxReussite>${kpis.avgSuccess}</TauxReussite>\n`;
      xml += `    <TauxAbandon>${kpis.avgAbandon}</TauxAbandon>\n`;
      xml += `  </IndicateursNationaux>\n`;

      xml += `  <Etablissements>\n`;
      filteredSchools.forEach(s => {
        xml += `    <Etablissement code="${s.code}">\n`;
        xml += `      <Nom><![CDATA[${s.name}]]></Nom>\n`;
        xml += `      <Type>${s.type}</Type>\n`;
        xml += `      <Cycle>${s.cycle}</Cycle>\n`;
        xml += `      <Region><![CDATA[${s.region}]]></Region>\n`;
        xml += `      <Department><![CDATA[${s.department}]]></Department>\n`;
        xml += `      <Commune><![CDATA[${s.commune}]]></Commune>\n`;
        xml += `      <Eleves>${s.eleves}</Eleves>\n`;
        xml += `      <Filles>${s.filles}</Filles>\n`;
        xml += `      <Garcons>${s.garcons}</Garcons>\n`;
        xml += `      <Enseignants>${s.enseignants}</Enseignants>\n`;
        xml += `      <Eau>${s.eau ? "true" : "false"}</Eau>\n`;
        xml += `      <Electricite>${s.electricite ? "true" : "false"}</Electricite>\n`;
        xml += `      <Latrines>${s.latrines ? "true" : "false"}</Latrines>\n`;
        xml += `      <TauxReussite>${s.successRate}</TauxReussite>\n`;
        xml += `    </Etablissement>\n`;
      });
      xml += `  </Etablissements>\n`;
      xml += `</RapportMinisteriel>`;

      const blob = new Blob([xml], { type: "application/xml;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `SIGE_Ministere_Export_${selectedYear}_${Date.now()}.xml`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Rapport XML (Norme SIGE) généré avec succès !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export XML");
    }
  };

  // 4. Export CSV UTF-8 (Données Brutes)
  const handleCsvExport = () => {
    try {
      const headers = ["N°", "Code", "Nom", "Type", "Cycle", "Région", "Département", "Inspection", "Commune", "Élèves", "Filles", "Garçons", "Enseignants", "Ratio E/E", "Réussite (%)", "Abandon (%)", "Eau", "Électricité", "Latrines"];
      const rows = filteredSchools.map((s, idx) => [
        idx + 1,
        `"${s.code}"`,
        `"${s.name.replace(/"/g, '""')}"`,
        `"${s.type}"`,
        `"${s.cycle}"`,
        `"${s.region}"`,
        `"${s.department}"`,
        `"${s.inspection}"`,
        `"${s.commune}"`,
        s.eleves,
        s.filles,
        s.garcons,
        s.enseignants,
        (s.eleves / (s.enseignants || 1)).toFixed(1),
        s.successRate,
        s.abandonRate,
        s.eau ? "Oui" : "Non",
        s.electricite ? "Oui" : "Non",
        s.latrines ? "Oui" : "Non"
      ]);

      const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Edut_Data_SIGE_${selectedYear}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Fichier CSV (Données brutes) téléchargé !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export CSV");
    }
  };

  // 5. Export PDF Fiche Synthèse Ministérielle (1-Page Executive Summary)
  const handlePdfOnePagerExport = () => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = doc.internal.pageSize.getWidth();

      // Header Banner
      doc.setFillColor(225, 29, 72);
      doc.rect(0, 0, W, 22, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text("MINISTÈRE DE L'ÉDUCATION NATIONALE", 12, 10);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("FICHE DE SYNTHÈSE MINISTÉRIELLE DÉCISIONNELLE — EXÉCUTIF 1-PAGE", 12, 16);

      // Metadata
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`Année scolaire : ${selectedYear}`, 12, 30);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`Généré le : ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}`, W - 12, 30, { align: "right" });

      doc.setLineWidth(0.5);
      doc.setDrawColor(226, 232, 240);
      doc.line(12, 33, W - 12, 33);

      // Section 1: Indicators Boxes
      let Y = 40;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("1. MACRO-INDICATEURS NATIONAUX", 12, Y);

      Y += 5;
      const kpiItems = [
        { t: "ÉTABLISSEMENTS", v: String(kpis.totalSchools) },
        { t: "TOTAL ÉLÈVES", v: kpis.totalEleves.toLocaleString("fr-FR") },
        { t: "TOTAL FILLES", v: kpis.totalFilles.toLocaleString("fr-FR") },
        { t: "RATIO ÉLÈVE/ENS", v: String(kpis.pupilTeacherRatio) },
        { t: "TAUX RÉUSSITE", v: `${kpis.avgSuccess}%` },
        { t: "TAUX ABANDON", v: `${kpis.avgAbandon}%` }
      ];

      const boxW = (W - 24 - 10) / 3;
      kpiItems.forEach((item, idx) => {
        const row = Math.floor(idx / 3);
        const col = idx % 3;
        const bx = 12 + col * (boxW + 5);
        const by = Y + row * 16;

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.rect(bx, by, boxW, 13, "DF");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(item.t, bx + 3, by + 4);

        doc.setFontSize(10);
        doc.setTextColor(225, 29, 72);
        doc.text(item.v, bx + 3, by + 10);
      });

      Y += 38;

      // Section 2: Infrastructure Alerts
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("2. DÉFICITS EN INFRASTRUCTURES & ANOMALIES CRITIQUES", 12, Y);

      Y += 5;
      const alertItems = [
        { t: "Écoles sans eau potable", v: String(kpis.noWater) },
        { t: "Écoles sans électricité", v: String(kpis.noElec) },
        { t: "Écoles sans latrines", v: String(kpis.noLatrines) },
        { t: "Manque d'enseignants", v: String(kpis.missingTeachers) },
        { t: "Manque de salles de classe", v: String(kpis.missingSalles) },
        { t: "Manque de manuels scolaires", v: String(kpis.missingBooks) }
      ];

      autoTable(doc, {
        startY: Y,
        head: [["Anomalie / Déficit détecté", "Nombre d'établissements concernés"]],
        body: alertItems.map(a => [a.t, a.v]),
        theme: "plain",
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
        margin: { left: 12, right: 12 }
      });

      Y = (doc as any).lastAutoTable.finalY + 10;

      // Section 3: Regional Table
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("3. SYNTHÈSE DES STOCKS PAR RÉGION", 12, Y);

      Y += 4;
      autoTable(doc, {
        startY: Y,
        head: [["Région", "Nombre d'éts", "Élèves inscrits", "Taux de complétude"]],
        body: regionStats.map(r => [r.region, String(r.schoolsCount), r.studentsCount.toLocaleString("fr-FR"), `${r.avgCompletion}%`]),
        theme: "striped",
        headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 12, right: 12 }
      });

      doc.save(`Fiche_Synthese_Ministerielle_${selectedYear}_${Date.now()}.pdf`);
      toast.success("Fiche Synthèse Ministérielle (1 Page) PDF téléchargeable !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération de la Fiche Synthèse PDF");
    }
  };

  // 6. Export PDF Officiel Multipages
  const handlePdfExport = () => {
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();

      // Official Header
      doc.setFillColor(248, 250, 252);
      doc.rect(10, 10, pageWidth - 20, 35, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(10, 10, pageWidth - 20, 35, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(225, 29, 72); // Rose/Red accent
      doc.text("RÉPUBLIQUE DU NIGER", 15, 17);
      doc.text("MINISTÈRE DE L'ÉDUCATION NATIONALE", 15, 22);

      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("TABLEAU DE BORD STATISTIQUE SCOLAIRE OFFICIEL", 15, 30);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Année scolaire : ${selectedYear}    |    Date de génération : ${new Date().toLocaleDateString()}`, 15, 36);

      let currentY = 52;

      // KPIs summary
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("PRINCIPAUX INDICATEURS CLÉS SCOLAIRES", 10, currentY);
      doc.line(10, currentY + 2, pageWidth - 10, currentY + 2);
      currentY += 8;

      const items = [
        { label: "Écoles", value: kpis.totalSchools },
        { label: "Ratio Élève/Ens", value: kpis.pupilTeacherRatio },
        { label: "Taux Réussite", value: `${kpis.avgSuccess}%` },
        { label: "Taux Abandon", value: `${kpis.avgAbandon}%` },
        { label: "Manque Livres", value: kpis.missingBooks },
        { label: "Zones Prioritaires", value: kpis.priorityZones }
      ];

      const boxWidth = (pageWidth - 20 - 20) / 6;
      items.forEach((item, idx) => {
        const startX = 10 + idx * (boxWidth + 4);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(241, 245, 249);
        doc.rect(startX, currentY, boxWidth, 16, "DF");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(item.label.toUpperCase(), startX + 3, currentY + 5);

        doc.setFontSize(10);
        doc.setTextColor(225, 29, 72);
        doc.text(String(item.value), startX + 3, currentY + 11);
      });

      currentY += 24;

      // Table of schools
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("DONNÉES PAR ÉTABLISSEMENT", 10, currentY);
      doc.line(10, currentY + 2, pageWidth - 10, currentY + 2);
      currentY += 6;

      const headers = ["N°", "Code", "Nom", "Région", "Élèves", "Enseignants", "Ratio", "Réussite", "Abandon", "Eau", "Latrines"];
      const body = filteredSchools.map((s, idx) => [
        idx + 1,
        s.code,
        s.name,
        s.region,
        s.eleves.toLocaleString("fr-FR"),
        s.enseignants,
        (s.eleves / (s.enseignants || 1)).toFixed(0),
        `${s.successRate}%`,
        `${s.abandonRate}%`,
        s.eau ? "Oui" : "Non",
        s.latrines ? "Oui" : "Non"
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

      doc.save(`Rapport_MEN_National_${Date.now()}.pdf`);
      toast.success("Rapport PDF généré !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export PDF");
    }
  };

  return (
    <div className="min-h-screen space-y-8 p-4 text-slate-900 dark:text-slate-100 md:p-6 xl:p-8 print:bg-white print:p-0 animate-in fade-in duration-300">
      {/* Printable Official Header */}
      <div className="hidden print:block mb-6 border-b-[2.5px] border-blue-900 pb-5">
        <OfficialDocumentHeader config={activeHeaderConfig} title="RAPPORT STATISTIQUE NATIONAL DÉCISIONNEL" />
      </div>
      
      {/* Header */}
      <header className="relative z-50 rounded-[2rem] border border-slate-200/70 dark:border-slate-800/80 bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1f2232] transition print:hidden">
            <ArrowLeft size={19} />
          </Link>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-500/20">
            <Globe size={26} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400">Portail National Décisionnel</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Ministère de l&apos;Éducation</h1>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">Tableau de Bord Réglementaire du Secteur Éducatif National</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 print:hidden">
          {/* Dropdown Menu Multi-Formats */}
          <div className="relative z-50">
            <button 
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 px-5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-rose-500/20 hover:opacity-95 transition cursor-pointer"
            >
              <Download size={16} /> Exporter le Rapport <ChevronDown size={14} className={`transition-transform ${exportDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {exportDropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181b2a] shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 space-y-1"
              >
                <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1">
                  Formats Ministériels Officiels
                </div>

                <button
                  onClick={() => { setExportDropdownOpen(false); handlePdfExport(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  <FileText size={15} className="text-rose-600 dark:text-rose-400 shrink-0" />
                  <div>
                    <p className="leading-none">PDF Officiel Complet</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Rapport multi-pages avec autoTable</p>
                  </div>
                </button>

                <button
                  onClick={() => { setExportDropdownOpen(false); handlePdfOnePagerExport(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-left text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  <Sparkles size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div>
                    <p className="leading-none">Fiche Synthèse Ministérielle</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Résumé exécutif 1-Page A4</p>
                  </div>
                </button>

                <button
                  onClick={() => { setExportDropdownOpen(false); handleExcelExport(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-left text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  <FileSpreadsheet size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <p className="leading-none">Excel SDMX (Multi-Feuilles)</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Classeur 4 onglets statistiques</p>
                  </div>
                </button>

                <button
                  onClick={() => { setExportDropdownOpen(false); handleCsvExport(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-left text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  <FileCode size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <p className="leading-none">CSV UTF-8 (Données Brutes)</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Pour SPSS, Stata & BigQuery</p>
                  </div>
                </button>

                <button
                  onClick={() => { setExportDropdownOpen(false); handleJsonEmisExport(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-left text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  <Globe size={15} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <div>
                    <p className="leading-none">JSON EMIS / UNESCO-UIS</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Format d'échange international</p>
                  </div>
                </button>

                <button
                  onClick={() => { setExportDropdownOpen(false); handleXmlSigeExport(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-950/40 text-left text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  <Share2 size={15} className="text-violet-600 dark:text-violet-400 shrink-0" />
                  <div>
                    <p className="leading-none">XML SIGE Ministère</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Format échange inter-administrations</p>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={() => window.print()}
            className="flex h-11 items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 dark:text-slate-900 px-5 text-xs font-black uppercase tracking-widest text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <Printer size={16} /> Imprimer
          </button>
        </div>
      </header>

      {/* Filter panel */}
      <section className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-200/70 dark:border-slate-800/80 shadow-sm space-y-4 print:hidden">
        <h3 className="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Filter size={14} /> Filtres Nationaux
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
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
            <Label className="text-[9px] font-black text-slate-400">RÉGION</Label>
            <select 
              value={selectedRegion}
              onChange={e => {
                setSelectedRegion(e.target.value);
                setSelectedDept("all");
                setSelectedInsp("all");
                setSelectedCommune("all");
              }}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-bold outline-none cursor-pointer"
            >
              <option value="all">Toutes</option>
              <option value="Niamey">Niamey</option>
              <option value="Tillabéri">Tillabéri</option>
              <option value="Maradi">Maradi</option>
              <option value="Zinder">Zinder</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] font-black text-slate-400">DÉPARTEMENT</Label>
            <select 
              value={selectedDept}
              disabled={selectedRegion === "all"}
              onChange={e => {
                setSelectedDept(e.target.value);
                setSelectedInsp("all");
                setSelectedCommune("all");
              }}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-bold outline-none cursor-pointer disabled:opacity-50"
            >
              <option value="all">Tous</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] font-black text-slate-400">INSPECTION</Label>
            <select 
              value={selectedInsp}
              disabled={selectedRegion === "all"}
              onChange={e => {
                setSelectedInsp(e.target.value);
                setSelectedCommune("all");
              }}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-bold outline-none cursor-pointer disabled:opacity-50"
            >
              <option value="all">Toutes</option>
              {inspections.map(i => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] font-black text-slate-400">COMMUNE</Label>
            <select 
              value={selectedCommune}
              disabled={selectedRegion === "all"}
              onChange={e => setSelectedCommune(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-bold outline-none cursor-pointer disabled:opacity-50"
            >
              <option value="all">Toutes</option>
              {communes.map(c => (
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
        </div>
      </section>

      {/* KPI Cards Grid */}
      <section className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9">
        {[
          { label: "Établissements", value: kpis.totalSchools, icon: Building2, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/60", grad: "from-indigo-500 to-purple-500" },
          { label: "Total Élèves", value: kpis.totalEleves.toLocaleString("fr-FR"), icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/60", grad: "from-blue-500 to-cyan-500" },
          { label: "Total Filles", value: kpis.totalFilles.toLocaleString("fr-FR"), icon: Users, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-950/60", grad: "from-pink-500 to-rose-500" },
          { label: "Total Garçons", value: kpis.totalGarcons.toLocaleString("fr-FR"), icon: Users, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-950/60", grad: "from-sky-500 to-indigo-500" },
          { label: "Total Enseignants", value: kpis.totalEnseignants.toLocaleString("fr-FR"), icon: Users, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/60", grad: "from-emerald-400 to-teal-500" },
          { label: "Ratio Élève/Ens", value: kpis.pupilTeacherRatio, icon: Layers, color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-800", grad: "from-slate-400 to-slate-600" },
          { label: "Taux Réussite", value: `${kpis.avgSuccess}%`, icon: Award, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/60", grad: "from-amber-400 to-orange-500" },
          { label: "Taux Présence", value: `${kpis.avgAttendance}%`, icon: Activity, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/60", grad: "from-teal-400 to-emerald-500" },
          { label: "Taux Abandon", value: `${kpis.avgAbandon}%`, icon: TrendingDown, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/60", grad: "from-rose-500 to-red-600" },
          { label: "Écoles Sans Eau", value: kpis.noWater, icon: Droplets, color: kpis.noWater > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500", bg: kpis.noWater > 0 ? "bg-rose-50 dark:bg-rose-950/60" : "bg-slate-50 dark:bg-slate-900/60", grad: "from-rose-500 to-red-500" },
          { label: "Écoles Sans Élec.", value: kpis.noElec, icon: Lightbulb, color: kpis.noElec > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500", bg: kpis.noElec > 0 ? "bg-rose-50 dark:bg-rose-950/60" : "bg-slate-50 dark:bg-slate-900/60", grad: "from-amber-500 to-rose-500" },
          { label: "Sans Latrines", value: kpis.noLatrines, icon: AlertCircle, color: kpis.noLatrines > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500", bg: kpis.noLatrines > 0 ? "bg-rose-50 dark:bg-rose-950/60" : "bg-slate-50 dark:bg-slate-900/60", grad: "from-red-500 to-rose-600" },
          { label: "Manque Enseignants", value: kpis.missingTeachers, icon: Users, color: kpis.missingTeachers > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500", bg: kpis.missingTeachers > 0 ? "bg-rose-50 dark:bg-rose-950/60" : "bg-slate-50 dark:bg-slate-900/60", grad: "from-violet-500 to-rose-500" },
          { label: "Manque Salles", value: kpis.missingSalles, icon: Building2, color: kpis.missingSalles > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500", bg: kpis.missingSalles > 0 ? "bg-rose-50 dark:bg-rose-950/60" : "bg-slate-50 dark:bg-slate-900/60", grad: "from-indigo-500 to-rose-500" },
          { label: "Manque Livres", value: kpis.missingBooks, icon: BookOpen, color: kpis.missingBooks > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500", bg: kpis.missingBooks > 0 ? "bg-rose-50 dark:bg-rose-950/60" : "bg-slate-50 dark:bg-slate-900/60", grad: "from-orange-500 to-rose-500" },
          { label: "Complétude Données", value: `${kpis.avgCompletion}%`, icon: CheckCircle2, color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/60", grad: "from-emerald-400 to-teal-500" },
          { label: "Zones Prioritaires", value: kpis.priorityZones, icon: ShieldAlert, color: kpis.priorityZones > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500", bg: kpis.priorityZones > 0 ? "bg-rose-50 dark:bg-rose-950/60" : "bg-slate-50 dark:bg-slate-900/60", grad: "from-rose-500 to-pink-500" },
          { label: "Retards Décl.", value: kpis.lateDeclaration, icon: Clock, color: kpis.lateDeclaration > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500", bg: kpis.lateDeclaration > 0 ? "bg-rose-50 dark:bg-rose-950/60" : "bg-slate-50 dark:bg-slate-900/60", grad: "from-amber-500 to-orange-600" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="group relative overflow-hidden rounded-3xl border border-slate-200/70 dark:border-slate-800/80 bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-4 shadow-sm hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${item.grad} opacity-80 group-hover:opacity-100 transition-opacity`} />
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl transition-transform group-hover:scale-105", item.bg, item.color)}>
                <Icon size={16} />
              </div>
              <div className="mt-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-400 leading-snug">{item.label}</p>
                <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">{item.value}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* Main Panel grid */}
      <section className="grid gap-8 xl:grid-cols-12">
        
        {/* Left Side: Establishments List / Map */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/70 dark:border-slate-800/80 shadow-sm overflow-hidden">
            
            {/* Header controls */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Registre Éducatif National</h2>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-400">Visualisation des données par établissement</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Nom, code, commune..."
                    className="h-10 w-full pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#1a1d2d] text-xs font-bold outline-none placeholder:text-slate-450 text-slate-900 dark:text-slate-100"
                  />
                  {searchQuery && <X size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer" onClick={() => setSearchQuery("")} />}
                </div>

                <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl p-1 bg-slate-50/50 dark:bg-[#1a1d2d]">
                  <button 
                    onClick={() => setViewMode("list")}
                    className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition", viewMode === "list" ? "bg-white dark:bg-[#222638] text-slate-900 dark:text-white shadow-sm" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}
                  >
                    Liste
                  </button>
                  <button 
                    onClick={() => setViewMode("map")}
                    className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition", viewMode === "map" ? "bg-white dark:bg-[#222638] text-slate-900 dark:text-white shadow-sm" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}
                  >
                    Carte
                  </button>
                </div>
              </div>
            </div>

            {viewMode === "list" ? (
              <div className="overflow-x-auto">
                {loadingSchools ? (
                  <div className="p-16 text-center">
                    <Building2 className="mx-auto size-12 text-slate-200 dark:text-slate-700 animate-pulse" />
                    <p className="mt-4 text-sm font-black text-slate-800 dark:text-white">Chargement des établissements...</p>
                    <p className="text-xs text-slate-400 mt-1">Lecture des données ministérielles depuis la base.</p>
                  </div>
                ) : filteredSchools.length > 0 ? (
                  <table className="w-full text-left min-w-[900px]">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/60 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <th className="px-6 py-4">Établissement</th>
                        <th className="px-6 py-4">Type/Cycle</th>
                        <th className="px-6 py-4">Localisation</th>
                        <th className="px-6 py-4">Élèves / Ratio</th>
                        <th className="px-6 py-4">Réussite / Abandon</th>
                        <th className="px-6 py-4">Infras</th>
                        <th className="px-6 py-4">Complétude</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60 dark:divide-slate-800/40 font-bold text-slate-700 dark:text-slate-300 text-xs">
                      {filteredSchools.map((s) => (
                        <tr key={s.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                          <td className="px-6 py-4">
                            <p className="font-black text-slate-900 dark:text-white">{s.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{s.code}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mr-1.5", s.type === "Public" ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400" : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400")}>
                              {s.type}
                            </span>
                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">{s.cycle}</span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-slate-800 dark:text-slate-200">{s.commune}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{s.region} / {s.department}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-slate-950 dark:text-white font-black">{s.eleves} élèves</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">Ratio: {(s.eleves / (s.enseignants || 1)).toFixed(0)} E/E</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-amber-600 dark:text-amber-400 font-black">Réussite: {s.successRate}%</p>
                            <p className="text-[9px] text-rose-600 dark:text-rose-400 mt-0.5">Abandon: {s.abandonRate}%</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <span title={s.eau ? "Eau potable" : "Pas d'eau"}><Droplets className={cn("size-4", s.eau ? "text-blue-500" : "text-rose-500")} /></span>
                              <span title={s.electricite ? "Électricité" : "Pas d'élec"}><Lightbulb className={cn("size-4", s.electricite ? "text-amber-500" : "text-rose-500")} /></span>
                              <span title={s.latrines ? "Latrines" : "Pas de latrines"}><HelpCircle className={cn("size-4", s.latrines ? "text-emerald-500" : "text-rose-500")} /></span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${s.completion}%` }} />
                              </div>
                              <span className="text-[10px] font-black text-slate-900 dark:text-white">{s.completion}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => setSelectedSchoolDetail(s)}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-200 hover:bg-indigo-50/50 text-[10px] font-black text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 uppercase tracking-widest transition"
                            >
                              Voir détails
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-16 text-center">
                    <Building2 className="mx-auto size-12 text-slate-200" />
                    <p className="mt-4 text-sm font-black text-slate-800">Aucun établissement trouvé</p>
                    <p className="text-xs text-slate-400 mt-1">Essayez de modifier vos filtres de recherche.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center space-y-4">
                <div className="h-96 w-full rounded-2xl bg-indigo-50/50 border border-slate-100 relative overflow-hidden flex flex-col items-center justify-center">
                  <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:16px_16px] opacity-40" />
                  
                  {/* Decorative Simulated Map Pins */}
                  <div className="absolute top-1/4 left-1/3 animate-bounce"><div className="h-8 w-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg"><Building2 size={14} /></div></div>
                  <div className="absolute top-1/2 left-2/3 animate-pulse"><div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg"><Building2 size={14} /></div></div>
                  <div className="absolute top-2/3 left-1/4 animate-bounce delay-300"><div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg"><Building2 size={14} /></div></div>
                  <div className="absolute top-1/3 left-2/3"><div className="h-8 w-8 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-lg"><Building2 size={14} /></div></div>

                  <Globe className="size-20 text-indigo-500 opacity-90 animate-spin" style={{ animationDuration: '20s' }} />
                  <div className="mt-6 space-y-1">
                    <p className="text-base font-black text-slate-800">Carte Éducative Nationale Interactive</p>
                    <p className="text-xs text-slate-500 max-w-sm">Géolocalisation des établissements et anomalies d&apos;infrastructures en temps réel.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Stats breakdowns & Alerts */}
        <div className="xl:col-span-4 space-y-8">
          
          {/* Public vs Private Breakdown */}
          <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-200/70 dark:border-slate-800/80 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Répartition Secteurs</h3>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 mt-0.5">Ratio établissements Publics vs Privés</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-black">
                <span className="text-emerald-700 dark:text-emerald-400">Public ({publicPrivateRatio.publicCount} éts)</span>
                <span className="text-indigo-700 dark:text-indigo-400">Privé ({publicPrivateRatio.privateCount} éts)</span>
              </div>
              
              <div className="h-3 w-full bg-indigo-100 dark:bg-indigo-950/80 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full" style={{ width: `${publicPrivateRatio.publicPct}%` }} />
                <div className="bg-indigo-600 dark:bg-indigo-500 h-full flex-1" style={{ width: `${publicPrivateRatio.privatePct}%` }} />
              </div>
              
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>{publicPrivateRatio.publicPct}% Public</span>
                <span>{publicPrivateRatio.privatePct}% Privé</span>
              </div>
            </div>
          </div>

          {/* Regional Statistics */}
          <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-200/70 dark:border-slate-800/80 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Statistiques par Région</h3>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 mt-0.5">Complétude des dossiers</p>
            </div>
            
            <div className="space-y-4">
              {regionStats.length > 0 ? regionStats.map(stat => (
                <div key={stat.region} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-slate-800 dark:text-slate-200">{stat.region} ({stat.schoolsCount} éts)</span>
                    <span className="text-slate-900 dark:text-white">{stat.avgCompletion}% Complétude</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-100/50 dark:border-slate-800/50">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stat.avgCompletion}%` }} />
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold">{stat.studentsCount.toLocaleString("fr-FR")} Élèves inscrits</p>
                </div>
              )) : (
                <p className="text-xs text-slate-400">Aucune donnée régionale disponible.</p>
              )}
            </div>
          </div>

          {/* Inspection Statistics */}
          <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-200/70 dark:border-slate-800/80 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Statistiques par Inspection</h3>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 mt-0.5">Performance (Réussite)</p>
            </div>
            
            <div className="space-y-4">
              {inspectionStats.length > 0 ? inspectionStats.map(stat => (
                <div key={stat.inspection} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-slate-800 dark:text-slate-200">{stat.inspection}</span>
                    <span className="text-slate-900 dark:text-white">{stat.avgSuccess}% Réussite</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-100/50 dark:border-slate-800/50">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${stat.avgSuccess}%` }} />
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold">{stat.schoolsCount} Établissement(s) sous tutelle</p>
                </div>
              )) : (
                <p className="text-xs text-slate-400">Aucune donnée disponible.</p>
              )}
            </div>
          </div>

          {/* National Alerts */}
          <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-200/70 dark:border-slate-800/80 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Alertes Critiques Secteur</h3>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 mt-0.5">Logistiques, Ratios & anomalies de Fichiers</p>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {nationalAlerts.length > 0 ? nationalAlerts.map((alert, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "p-4 rounded-2xl border flex gap-3 items-start",
                    alert.severity === "critical" ? "bg-rose-50 dark:bg-rose-950/60 border-rose-100 dark:border-rose-900/50 text-rose-800 dark:text-rose-300" : "bg-amber-50 dark:bg-amber-950/60 border-amber-100 dark:border-amber-900/50 text-amber-800 dark:text-amber-300"
                  )}
                >
                  <ShieldAlert className="size-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black">{alert.school}</p>
                    <p className="text-[10px] font-bold opacity-80 mt-0.5">{alert.type}</p>
                    <span className="inline-block text-[8px] font-black uppercase tracking-widest mt-1 bg-white/40 dark:bg-black/30 px-2 py-0.5 rounded">
                      {alert.code}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="p-6 text-center rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/20 text-slate-400">
                  <CheckCircle2 className="mx-auto size-8 text-emerald-500" />
                  <p className="text-xs font-bold mt-2">Aucune alerte active</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* School Details Dialog Modal */}
      {selectedSchoolDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] border border-slate-100 shadow-2xl p-8 space-y-6 animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-inner">
                  <Building2 size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{selectedSchoolDetail.name}</h3>
                  <p className="text-xs font-bold text-slate-400">Code Etablissement : {selectedSchoolDetail.code}</p>
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
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type & Niveau</p>
                <p className="font-bold text-slate-800">{selectedSchoolDetail.type} / {selectedSchoolDetail.cycle}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Région / Dép.</p>
                <p className="font-bold text-slate-800">{selectedSchoolDetail.region} / {selectedSchoolDetail.department}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inspection / Comm.</p>
                <p className="font-bold text-slate-800">{selectedSchoolDetail.inspection} / {selectedSchoolDetail.commune}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Élèves inscrits</p>
                <p className="font-bold text-slate-800">{selectedSchoolDetail.eleves} (F: {selectedSchoolDetail.filles} | G: {selectedSchoolDetail.garcons})</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enseignants / Salles</p>
                <p className="font-bold text-slate-800">{selectedSchoolDetail.enseignants} Ens. / {selectedSchoolDetail.salles} Salles</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Eau, Élec & Latrines</p>
                <p className="font-bold text-slate-800">Eau: {selectedSchoolDetail.eau ? "Oui" : "Non"} | Élec: {selectedSchoolDetail.electricite ? "Oui" : "Non"} | Latr: {selectedSchoolDetail.latrines ? "Oui" : "Non"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manques Logistiques</p>
                <p className="font-bold text-rose-600">Ens: {selectedSchoolDetail.manqueEnseignants} | Salles: {selectedSchoolDetail.manqueSalles} | Livres: {selectedSchoolDetail.manqueLivres}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Complétude & Abandon</p>
                <span className="font-bold text-slate-800">{selectedSchoolDetail.completion}% (Abandon: {selectedSchoolDetail.abandonRate}%)</span>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dernière Déclaration</p>
                <span className="font-bold text-slate-800">{selectedSchoolDetail.lastDeclaration}</span>
              </div>
            </div>

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

    </div>
  );
}
