"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Download, FileText, Share2,
  ChevronRight, Award, BadgeCheck,
  Eye, Printer, FileSpreadsheet, X, Check
} from "lucide-react";
import { BroadsheetData } from "../types";
import { formatRank } from "../utils/calculations";
import { toast } from "sonner";
import { saveTermSummaries } from "../actions/academics.actions";
import { generateOfficialAnnualReportPDF, generateOfficialUniversityPV, generatePVMatrixExcel } from "../utils/bulletin-generator";

interface BroadsheetMatrixProps {
  data: BroadsheetData;
  onPrintBulletin: (studentId: number) => void;
  onPrintAll?: () => void;
  onPrintPV: () => void;
  onExportPVExcel?: () => void;
  activeFilters: any;
  headerConfig?: any;
}

const computeNextClassStr = (currentCls?: string, explicitTarget?: string) => {
  if (explicitTarget && explicitTarget.trim()) return explicitTarget.trim();
  if (!currentCls) return "Passage en Classe Supérieure";
  const cls = currentCls.trim();
  const u = cls.toUpperCase();

  if (u.includes("6ÈME") || u.includes("6EME") || u.includes("6E")) return cls.replace(/6è?m?e?/i, "Passage en 5ème");
  if (u.includes("5ÈME") || u.includes("5EME") || u.includes("5E")) return cls.replace(/5è?m?e?/i, "Passage en 4ème");
  if (u.includes("4ÈME") || u.includes("4EME") || u.includes("4E")) return cls.replace(/4è?m?e?/i, "Passage en 3ème");
  if (u.includes("3ÈME") || u.includes("3EME") || u.includes("3E")) return cls.replace(/3è?m?e?/i, "Passage en 2nde");
  if (u.includes("2NDE") || u.includes("2ND")) return cls.replace(/2nde?/i, "Passage en 1ère");
  if (u.includes("1ÈRE") || u.includes("1ERE") || u.includes("1ER")) return cls.replace(/1è?r?e?/i, "Passage en Tle");

  if (u.includes("CI")) return cls.replace(/CI/i, "Passage en CP");
  if (u.includes("CP")) return cls.replace(/CP/i, "Passage en CE1");
  if (u.includes("CE1")) return cls.replace(/CE1/i, "Passage en CE2");
  if (u.includes("CE2")) return cls.replace(/CE2/i, "Passage en CM1");
  if (u.includes("CM1")) return cls.replace(/CM1/i, "Passage en CM2");

  if (u.includes("L1")) return cls.replace(/L1/i, "Passage en L2");
  if (u.includes("L2")) return cls.replace(/L2/i, "Passage en L3");
  if (u.includes("M1")) return cls.replace(/M1/i, "Passage en M2");

  return `Passage en ${cls}`;
};

export default function BroadsheetMatrix({ data, onPrintBulletin, onPrintAll, onPrintPV, activeFilters, headerConfig }: BroadsheetMatrixProps) {
  const [saving, setSaving] = useState(false);
  const [appreciations, setAppreciations] = useState<Record<number, any>>({});
  const [showAnnualReportModal, setShowAnnualReportModal] = useState(false);
  
  const isHigherEd = ["Licence", "Master", "Doctorat", "Supérieur", "Université"].includes(activeFilters?.level || "Lycée");

  // Initialize appreciations
  useMemo(() => {
    if (data && data.students) {
      const initial: Record<number, any> = {};
      data.students.forEach((s: any) => {
        const avg = typeof s.average === 'number' && !isNaN(s.average) ? s.average : 0;
        
        // Auto-compute defaults if not previously saved
        let defaultTravail = "-";
        if (avg >= 16) defaultTravail = "Félicitation";
        else if (avg >= 14) defaultTravail = "Bien";
        else if (avg >= 12) defaultTravail = "Encouragement";
        else if (avg >= 10) defaultTravail = "Passable";
        else if (avg >= 8) defaultTravail = "Avertissement";
        else defaultTravail = "Blâme";

        const defaultConduite = (s.conduite && s.conduite > 0) ? s.conduite : (s.behaviorScore ?? 20.0);
        const defaultTab = avg >= 14;

        initial[s.id] = {
          conduite: defaultConduite,
          travail: (s.travail && s.travail !== "-") ? s.travail : defaultTravail,
          tableauHonneur: s.tableauHonneur || defaultTab,
        };
      });
      setAppreciations(initial);
    }
  }, [data]);

  const updateAppreciation = (studentId: number, field: string, value: any) => {
    setAppreciations(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  // Pre-compute synchronized student metrics (average & totalCoef) for absolute accuracy
  const studentMetrics = useMemo(() => {
    if (!data || !data.students) return {};
    const map: Record<number, { average: number; totalCoef: number }> = {};

    data.students.forEach((student: any) => {
      let totalWeighted = 0;
      let totalCoef = 0;

      (data.subjects || []).forEach((sub: any) => {
        const res = student.results?.[sub.id];
        const coef = sub.coefficient || res?.coef || 1;
        if (res) {
          const noteStr = res.note !== undefined && res.note !== "-" ? res.note : (res.total !== undefined && res.total !== "-" ? res.total : (res.n2 !== undefined && res.n2 !== "-" ? res.n2 : null));
          const moyNum = res.moyVal !== undefined ? res.moyVal : (res.moy !== undefined && res.moy !== "-" ? parseFloat(String(res.moy)) : (noteStr !== null ? parseFloat(String(noteStr)) : null));

          if (moyNum !== null && !isNaN(moyNum)) {
            totalWeighted += moyNum * coef;
            totalCoef += coef;
          }
        }
      });

      const calcAvg = totalCoef > 0 ? totalWeighted / totalCoef : (typeof student.average === 'number' && !isNaN(student.average) ? student.average : 0);
      const fallbackCoef = (data.subjects || []).reduce((acc: number, sb: any) => acc + (sb.coefficient || 1), 0);
      const displayCoef = totalCoef > 0 ? totalCoef : (student.totalCoef || fallbackCoef);

      map[student.id] = { average: calcAvg, totalCoef: displayCoef };
    });

    return map;
  }, [data]);

  const globalStats = useMemo(() => {
    if (!data || !data.students) return { count: 0, classAvg: 0, passed: 0, failed: 0 };
    const students = data.students;
    const count = students.length;
    const avgSum = students.reduce((acc, s) => acc + (studentMetrics[s.id]?.average ?? (s.average || 0)), 0);
    const classAvg = count > 0 ? avgSum / count : 0;
    const passed = students.filter(s => (studentMetrics[s.id]?.average ?? (s.average || 0)) >= 10).length;
    return { count, classAvg, passed, failed: count - passed };
  }, [data, studentMetrics]);

  // Compute ranks client-side (sorted by descending average)
  const studentRanks = useMemo(() => {
    if (!data || !data.students) return {};
    const sorted = [...data.students].sort((a, b) => {
      const avgA = studentMetrics[a.id]?.average ?? (a.average || 0);
      const avgB = studentMetrics[b.id]?.average ?? (b.average || 0);
      return avgB - avgA;
    });
    const ranks: Record<number, number> = {};
    let currentRank = 0;
    let lastAvg = -1;
    sorted.forEach((s, idx) => {
      const avg = studentMetrics[s.id]?.average ?? (s.average || 0);
      if (avg !== lastAvg) currentRank = idx + 1;
      ranks[s.id] = currentRank;
      lastAvg = avg;
    });
    return ranks;
  }, [data, studentMetrics]);

  if (!data) {
    return (
      <div className="py-20 text-center bg-white rounded-[2rem] border border-slate-200 shadow-lg">
        <div className="p-6 bg-slate-50 rounded-full w-fit mx-auto mb-4 animate-pulse">
          <Award size={48} className="text-slate-300" />
        </div>
        <p className="text-slate-500 font-medium italic">Chargement des données de la matrice...</p>
      </div>
    );
  }

  const { students, subjects, isCumulative } = data;

  if (students.length === 0) {
    return (
      <div className="py-20 text-center bg-white rounded-[2rem] border border-slate-200 shadow-lg">
        <div className="p-6 bg-rose-50 rounded-full w-fit mx-auto mb-4">
          <Eye size={48} className="text-rose-300" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Aucun élève trouvé</h3>
        <p className="text-slate-500 font-medium max-w-md mx-auto mt-2">
          Aucun élève n'est associé à la classe "{activeFilters?.className || 'sélectionnée'}". 
          Vérifiez que le nom de la classe dans le profil des élèves correspond exactement.
        </p>
      </div>
    );
  }

  const handleExportAnnualReportCSV = () => {
    if (!data || !data.students) return;

    const getSemLabels = (className?: string) => {
      if (!isHigherEd) {
        return { s1: "Moy. 1er Sem.", r1: "Rang 1er Sem.", s2: "Moy. 2ème Sem.", r2: "Rang 2ème Sem." };
      }
      const cls = (className || activeFilters?.className || "").toUpperCase();
      if (cls.includes("L2") || cls.includes("LICENCE 2") || cls.includes("L-2")) {
        return { s1: "Moy. S3", r1: "Rang S3", s2: "Moy. S4", r2: "Rang S4" };
      }
      if (cls.includes("L3") || cls.includes("LICENCE 3") || cls.includes("L-3")) {
        return { s1: "Moy. S5", r1: "Rang S5", s2: "Moy. S6", r2: "Rang S6" };
      }
      if (cls.includes("M2") || cls.includes("MASTER 2") || cls.includes("M-2")) {
        return { s1: "Moy. S9", r1: "Rang S9", s2: "Moy. S10", r2: "Rang S10" };
      }
      return { s1: "Moy. S1", r1: "Rang S1", s2: "Moy. S2", r2: "Rang S2" };
    };

    const semLabels = getSemLabels();

    const headers = [
      "N°",
      "Noms et Prénoms",
      "Date et lieu de naissance",
      "Matricule",
      "Sexe",
      semLabels.s1,
      semLabels.r1,
      semLabels.s2,
      semLabels.r2,
      "Moyenne Annuelle",
      "Décision du Conseil",
      "Affectation / Classe",
      "Allocataire"
    ];

    const rows = data.students.map((student: any, idx: number) => {
      const dob = student.dateNaissance || student.dateOfBirth || student.birthDate || "-";
      const pob = student.lieuNaissance || student.placeOfBirth || "-";
      const dateAndPlace = `${dob} à ${pob}`;

      const s1Summary = student.summaryS1 || student.history?.find((h: any) => {
        if (!h.term) return false;
        const norm = String(h.term).toLowerCase();
        return norm.includes("1") || norm.includes("première") || norm.includes("s1");
      });
      const s2Summary = student.summaryS2 || student.history?.find((h: any) => {
        if (!h.term) return false;
        const norm = String(h.term).toLowerCase();
        return norm.includes("2") || norm.includes("deuxième") || norm.includes("s2");
      });

      const formatAvg = (v: any) => {
        if (v === null || v === undefined || v === "" || v === "-") return "-";
        const n = typeof v === 'number' ? v : parseFloat(String(v));
        return !isNaN(n) ? n.toFixed(2) : "-";
      };

      const formatRank = (v: any) => {
        if (!v || v === "-" || v === "N/A") return "-";
        return String(v).replace(/ème/g, "eme").replace(/ère/g, "ere");
      };

      const s1Avg = formatAvg(s1Summary?.average ?? student.s1Average);
      const s1Rank = formatRank(s1Summary?.rank ?? student.s1Rank);

      const s2Avg = formatAvg(s2Summary?.average ?? student.s2Average);
      const s2Rank = formatRank(s2Summary?.rank ?? student.s2Rank);

      const safeAvg = typeof student.average === 'number' && !isNaN(student.average) ? student.average : 0;
      const annualAvg = typeof student.annualAverage === 'number' ? student.annualAverage.toFixed(2) : safeAvg.toFixed(2);

      const decisionStr = student.decision || (parseFloat(annualAvg) >= 10 ? "ADMIS(E) EN CLASSE SUPÉRIEURE ✅" : parseFloat(annualAvg) >= 8 ? "AUTORISÉ(E) À REDOUBLER ❌" : "EXCLU(E) ⛔");
      const isRedouble = decisionStr.includes("REDOUBLE");
      const currentClass = activeFilters?.className || student.classe || "";
      const targetClass = student.targetClassName || (isRedouble ? `Redouble en ${currentClass}` : computeNextClassStr(currentClass));

      const allocataire = student.allocataire || (student.isScholarship ? "Boursier" : "Non Boursier") || "Non";

      const cleanText = (txt: any) => {
        return String(txt || "")
          .replace(/ème/g, "eme")
          .replace(/ère/g, "ere")
          .replace(/[✅❌⛔]/g, "")
          .replace(/"/g, '""')
          .trim();
      };

      return [
        idx + 1,
        `"${cleanText(student.name || student.studentName || 'Élève')}"`,
        `"${cleanText(dateAndPlace)}"`,
        `"${cleanText(student.matricule || '-')}"`,
        `"${cleanText(student.sexe || student.gender || 'M')}"`,
        `"${s1Avg}"`,
        `"${s1Rank}"`,
        `"${s2Avg}"`,
        `"${s2Rank}"`,
        `"${annualAvg}"`,
        `"${cleanText(decisionStr)}"`,
        `"${cleanText(targetClass)}"`,
        `"${cleanText(allocataire)}"`
      ].join(";");
    });

    const csvBody = [headers.join(";"), ...rows].join("\r\n");
    const csvContent = "sep=;\r\n" + csvBody;
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Rapport_Récapitulatif_Annuel_${activeFilters?.className || "Classe"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Rapport récapitulatif annuel exporté avec succès !");
  };

  const handlePrintAnnualReport = () => {
    if (!students || students.length === 0) return;
    const printWin = window.open('', '_blank', 'width=1300,height=900');
    if (!printWin) {
      window.print();
      return;
    }

    const isLmd = isHigherEd;
    const clsName = (activeFilters?.className || "").toUpperCase();
    let s1Lbl = isLmd ? "Moy. S1" : "Moy. 1er Sem.";
    let r1Lbl = isLmd ? "Rang S1" : "Rang 1er Sem.";
    let s2Lbl = isLmd ? "Moy. S2" : "Moy. 2ème Sem.";
    let r2Lbl = isLmd ? "Rang S2" : "Rang 2ème Sem.";
    if (isLmd) {
      if (clsName.includes("L2") || clsName.includes("LICENCE 2")) { s1Lbl = "Moy. S3"; r1Lbl = "Rang S3"; s2Lbl = "Moy. S4"; r2Lbl = "Rang S4"; }
      else if (clsName.includes("L3") || clsName.includes("LICENCE 3")) { s1Lbl = "Moy. S5"; r1Lbl = "Rang S5"; s2Lbl = "Moy. S6"; r2Lbl = "Rang S6"; }
      else if (clsName.includes("M2") || clsName.includes("MASTER 2")) { s1Lbl = "Moy. S9"; r1Lbl = "Rang S9"; s2Lbl = "Moy. S10"; r2Lbl = "Rang S10"; }
    }

    const rows = students.map((student: any, idx: number) => {
      const dob = student.dateNaissance || student.dateOfBirth || student.birthDate || "-";
      const pob = student.lieuNaissance || student.placeOfBirth || "-";
      const dateAndPlace = `${dob} à ${pob}`;

      const s1Summary = student.summaryS1 || student.history?.find((h: any) => h.term && String(h.term).toLowerCase().includes("1"));
      const s2Summary = student.summaryS2 || student.history?.find((h: any) => h.term && String(h.term).toLowerCase().includes("2"));

      const formatAvg = (v: any) => {
        if (v === null || v === undefined || v === "" || v === "-") return "-";
        const n = typeof v === 'number' ? v : parseFloat(String(v));
        return !isNaN(n) ? n.toFixed(2) : "-";
      };

      const s1Avg = formatAvg(s1Summary?.average ?? student.s1Average);
      const s1Rank = s1Summary?.rank || student.s1Rank || "-";
      const s2Avg = formatAvg(s2Summary?.average ?? student.s2Average);
      const s2Rank = s2Summary?.rank || student.s2Rank || "-";

      const safeAvg = typeof student.average === 'number' && !isNaN(student.average) ? student.average : 0;
      const annualAvg = typeof student.annualAverage === 'number' ? student.annualAverage.toFixed(2) : safeAvg.toFixed(2);
      const allocataire = student.allocataire || (student.isScholarship ? "Boursier" : "Non Boursier") || "Non";

      const decisionStr = student.decision || (parseFloat(annualAvg) >= 10 ? "ADMIS(E) EN CLASSE SUPÉRIEURE ✅" : parseFloat(annualAvg) >= 8 ? "AUTORISÉ(E) À REDOUBLER ❌" : "EXCLU(E) ⛔");
      const isRedouble = decisionStr.includes("REDOUBLE");
      
      const currentClass = activeFilters?.className || student.classe || "";
      const targetClass = student.targetClassName || (isRedouble ? `Redouble en ${currentClass}` : computeNextClassStr(currentClass));

      return `
        <tr>
          <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
          <td style="font-weight: bold;">${student.name || student.studentName || "Élève"}</td>
          <td>${dateAndPlace}</td>
          <td style="text-align: center; font-family: monospace; font-weight: bold; color: #4338ca;">${student.matricule || "-"}</td>
          <td style="text-align: center; font-weight: bold;">${student.sexe || student.gender || "M"}</td>
          <td style="text-align: center; font-weight: bold;">${s1Avg}</td>
          <td style="text-align: center;">${s1Rank}</td>
          <td style="text-align: center; font-weight: bold;">${s2Avg}</td>
          <td style="text-align: center;">${s2Rank}</td>
          <td style="text-align: center; font-weight: 900; color: #d97706; font-size: 9.5pt;">${annualAvg}</td>
          <td style="text-align: center; font-size: 7.5pt; font-weight: bold;">${decisionStr}</td>
          <td style="text-align: center; font-size: 7.5pt; font-weight: bold; color: #6b21a8;">${targetClass}</td>
          <td style="text-align: center;">${allocataire}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Rapport Récapitulatif Officiel Annuel - ${activeFilters?.className || "Classe"}</title>
          <style>
            @page { size: A4 landscape; margin: 6mm; }
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 12px; color: #0f172a; }
            .header-banner { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
            .title-box { text-align: center; margin-bottom: 14px; }
            .title-box h1 { margin: 0; font-size: 15pt; text-transform: uppercase; font-weight: 900; letter-spacing: 0.5px; }
            .title-box p { margin: 3px 0 0 0; font-size: 9.5pt; color: #475569; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; font-size: 8pt; margin-top: 8px; }
            th, td { border: 0.5pt solid #334155; padding: 4.5px 3px; word-break: break-word; }
            th { background-color: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 7pt; font-weight: bold; }
            tr { page-break-inside: avoid; break-inside: avoid; }
            tr:nth-child(even) { background-color: #f8fafc; }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <div style="display: flex; align-items: center; gap: 12px;">
              ${(headerConfig?.logoUrl || headerConfig?.leftLogo) ? `<img src="${headerConfig.logoUrl || headerConfig.leftLogo}" style="height: 55px; width: auto; max-width: 80px; object-fit: contain;" />` : ''}
              <div>
                <strong style="font-size: 10.5pt; text-transform: uppercase;">${headerConfig?.country || headerConfig?.countryName || "RÉPUBLIQUE DU NIGER"}</strong><br/>
                <span style="font-size: 8pt; font-style: italic; color: #475569;">${headerConfig?.motto || "Unité - Travail - Progrès"}</span><br/>
                <span style="font-size: 8.5pt; font-weight: bold;">${headerConfig?.ministry || headerConfig?.ministryName || "MINISTÈRE DE L'ÉDUCATION NATIONALE"}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px; text-align: right;">
              <div>
                <strong style="font-size: 11.5pt; text-transform: uppercase; color: #0f172a;">${headerConfig?.schoolName || "ÉCOLE GESTION PRO"}</strong><br/>
                <span style="font-size: 9pt; font-weight: 600; color: #334155;">Année Scolaire: ${activeFilters?.sessionName || "2025-2026"}</span>
              </div>
              ${headerConfig?.rightLogo ? `<img src="${headerConfig.rightLogo}" style="height: 55px; width: auto; max-width: 80px; object-fit: contain;" />` : ''}
            </div>
          </div>

          <div class="title-box">
            <h1>Rapport Récapitulatif Officiel Annuel</h1>
            <p>Classe: <strong>${activeFilters?.className || "N/A"}</strong> • <strong>${students.length} Élèves inscrits</strong></p>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 3%;">N°</th>
                <th style="width: 16%;">Noms et Prénoms</th>
                <th style="width: 14%;">Date et lieu de naissance</th>
                <th style="width: 10%;">Matricule</th>
                <th style="width: 4%;">Sexe</th>
                <th style="width: 6%;">${s1Lbl}</th>
                <th style="width: 5%;">${r1Lbl}</th>
                <th style="width: 6%;">${s2Lbl}</th>
                <th style="width: 5%;">${r2Lbl}</th>
                <th style="width: 8%;">Moy. Annuelle</th>
                <th style="width: 11%;">Décision du Conseil</th>
                <th style="width: 8%;">Affectation / Classe</th>
                <th style="width: 6%;">Allocataire</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWin.document.write(htmlContent);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      printWin.close();
    }, 450);
  };

  const handleDownloadAnnualReportPDF = () => {
    if (!data || !data.students) return;
    try {
      generateOfficialAnnualReportPDF({
        className: activeFilters?.className || "Classe",
        sessionName: activeFilters?.sessionName || "2025-2026",
        students: data.students,
        headerConfig: headerConfig,
        isHigherEd: isHigherEd,
      });
      toast.success("PDF Officiel Annuel généré avec succès !");
    } catch (e) {
      console.error("PDF generation failed:", e);
      toast.error("Erreur lors de la génération du PDF.");
    }
  };

  const handleDownloadUniversityPVPDF = () => {
    if (!data || !data.students) return;
    try {
      generateOfficialUniversityPV({
        className: activeFilters?.className || "Licence",
        sessionName: activeFilters?.sessionName || "2025-2026",
        students: data.students,
        headerConfig: headerConfig,
      });
      toast.success("Procès-Verbal Officiel LMD (PV الجامعي) généré avec succès !");
    } catch (e) {
      console.error("PV generation failed:", e);
      toast.error("Erreur lors de la génération du PV d'évaluation.");
    }
  };

  const handlePrintAll = async () => {
    if (onPrintAll) {
      onPrintAll();
      return;
    }
    
    // Fallback if prop not provided
    setSaving(true);
    try {
      toast.info(`Génération de ${data.students.length} bulletins...`);
      for (const student of data.students) {
        await onPrintBulletin(student.id);
      }
      toast.success("Impression terminée");
    } catch (err) {
      toast.error("Erreur lors de l'impression groupée");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSummaries = async () => {
    setSaving(true);
    try {
      const summaries = students.map(s => {
        const avg = typeof s.average === 'number' && !isNaN(s.average) ? s.average : 0;
        const computedRank = studentRanks[s.id] || 0;
        const decision = avg >= 10 ? "ADMIS ✅" : "REDOUBLE ❌";
        const app = appreciations[s.id] || {};
        
        return {
          studentId: s.id,
          classId: activeFilters.classId,
          sessionId: activeFilters.sessionId,
          term: activeFilters.period,
          average: avg,
          rank: String(computedRank),
          decision: s.decision || decision,
          conduite: Number(app.conduite) || 0,
          travail: app.travail || "-",
          tableauHonneur: app.tableauHonneur || false,
        };
      });

      const res = await saveTermSummaries(summaries);
      if (res.success) {
        toast.success("Appréciations et décisions enregistrées avec succès !");
      } else {
        toast.error("Erreur lors de l'enregistrement.");
      }
    } catch (err) {
      toast.error("Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPVExcel = async () => {
    try {
      const classInfo = activeFilters?.className || `Classe_${activeFilters?.classId}`;
      await generatePVMatrixExcel(data, { className: classInfo, headerConfig }, activeFilters);
      toast.success("PV Excel exporté avec succès !");
    } catch (err: any) {
      toast.error("Erreur lors de l'exportation Excel", { description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MatrixStatsCard icon={<Award className="text-amber-500" />} label="Élèves" value={globalStats.count.toString()} />
        <MatrixStatsCard icon={<Eye className="text-indigo-500" />} label="Classe" value={`${globalStats.classAvg.toFixed(2)}/20`} />
        <MatrixStatsCard icon={<BadgeCheck className="text-emerald-500" />} label="Admis" value={globalStats.passed.toString()} />
        <MatrixStatsCard icon={<Printer className="text-slate-600 dark:text-slate-400" />} label="Non admis" value={globalStats.failed.toString()} />
      </div>

      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-[#131622]/90 p-6 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/20 rounded-xl text-amber-600 dark:text-amber-400">
            <Award size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Matrice des Résultats</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{students.length} élèves compilés</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            onClick={() => setShowAnnualReportModal(true)} 
            className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm"
          >
            <FileSpreadsheet size={18} /> Rapport Annuel Officiel
          </Button>
          <Button 
            onClick={handleSaveSummaries}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2"
          >
            <Download size={18} /> {saving ? "Enregistrement..." : "Enregistrer Appréciations"}
          </Button>
          <Button 
            onClick={onPrintPV} 
            className="bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2"
          >
            <FileText size={18} /> Version PV (PDF)
          </Button>
          <Button 
            onClick={handleExportPVExcel} 
            className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm"
          >
            <FileSpreadsheet size={18} /> Version PV (Excel)
          </Button>
          <Button 
            onClick={handlePrintAll} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2"
          >
            <Printer size={18} /> Tout imprimer (Bulk)
          </Button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="bg-white dark:bg-[#131622]/90 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1800px]">
            <thead>
              <tr className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white">
                <th className="sticky left-0 z-20 bg-slate-950 px-6 py-6 text-xs font-black uppercase tracking-widest border-r border-slate-700">
                  N° | NOM ET PRÉNOMS
                </th>
                
                {/* Behavioral Headers */}
                {!isHigherEd && (
                  <th className="px-4 py-6 text-center border-r border-slate-700 bg-slate-900/80">
                    <p className="text-xs font-black uppercase tracking-wider text-orange-400">Comportement</p>
                    <div className="flex justify-center gap-4 mt-2 text-[10px] font-bold text-orange-300 uppercase">
                      <span>Cond.</span>
                      <span>Trav.</span>
                      <span>Tab.</span>
                    </div>
                  </th>
                )}

                {subjects.map((sub, sIdx) => {
                  const sSub = sub as any;
                  const sCode = sSub.subjectCode || sSub.code || sSub.shortCode || `SUBJ${String(sIdx + 1).padStart(3, '0')}`;
                  return (
                    <th key={sub.id} className={`px-4 py-6 text-center border-r border-slate-700/80 ${isHigherEd ? 'min-w-[340px]' : 'min-w-[220px]'}`}>
                      <p className="text-xs font-black uppercase tracking-wider text-indigo-300">{sub.subjectName}</p>
                      <span className="inline-block text-[10px] font-black tracking-wider text-indigo-200 bg-indigo-950/90 px-2 py-0.5 rounded border border-indigo-700/60 mt-1 uppercase">
                        {sCode}
                      </span>
                      <div className="flex justify-center gap-2 mt-2 text-[10px] font-black">
                      {isHigherEd ? (
                        <>
                          <span className="text-slate-100 w-10 text-center">NOTE /20</span>
                          <span className="text-cyan-300 w-10 text-center">MOY /20</span>
                          <span className="text-emerald-300 w-12 text-center">MOY. COEF</span>
                          <span className="text-amber-300 w-7 text-center">CRÉDITS</span>
                          <span className="text-indigo-300 w-16 text-center">MENTION</span>
                          <span className="text-yellow-400 w-7 text-center">RNG</span>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-300 w-7 text-center">N1</span>
                          <span className="text-slate-300 w-7 text-center">N2</span>
                          <span className="text-sky-300 w-9 text-center">TOT</span>
                          <span className="text-emerald-300 w-9 text-center">MOY</span>
                          <span className="text-amber-400 w-7 text-center">RNG</span>
                        </>
                      )}
                    </div>
                  </th>
                );
              })}

                {/* Cumulative Headers */}
                {isCumulative && (
                  <>
                    <th className="px-6 py-6 text-center border-r border-slate-700 bg-slate-900/60">
                      <p className="text-xs font-black uppercase tracking-wider text-cyan-400">1er Semestre</p>
                      <div className="flex justify-center gap-4 mt-2 text-[10px] font-bold text-slate-300">
                        <span>MOY</span>
                        <span>RNG</span>
                      </div>
                    </th>
                    <th className="px-6 py-6 text-center border-r border-slate-700 bg-slate-900/60">
                      <p className="text-xs font-black uppercase tracking-wider text-yellow-400">Annuel</p>
                      <div className="flex justify-center gap-4 mt-2 text-[10px] font-bold text-slate-300">
                        <span>MOY</span>
                        <span>RNG</span>
                      </div>
                    </th>
                  </>
                )}

                <th className="px-8 py-6 text-center bg-slate-900/90 border-r border-slate-700">
                  <p className="text-xs font-black uppercase tracking-wider text-amber-400">Période Actuelle</p>
                  <div className="flex justify-center gap-6 mt-2 text-[10px] font-black">
                    <span className="text-slate-300">Σ COEF</span>
                    <span className="text-indigo-300">MOY/20</span>
                    <span className="text-amber-300">RANG</span>
                    <span className="text-emerald-400">DECISION</span>
                  </div>
                </th>
                <th className="px-6 py-6 text-center bg-slate-950">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {students.map((student: any, idx: number) => {
                const metrics = studentMetrics[student.id] || { average: student.average || 0, totalCoef: student.totalCoef || 0 };
                const safeAvg = metrics.average;
                const displayTotalCoef = metrics.totalCoef;

                const t1 = student.history?.find((h: any) => h.term && (h.term.includes("1er") || h.term.toLowerCase().includes("1") || h.term.toLowerCase().includes("première")));
                const annualAvg = typeof student.annualAverage === 'number' ? student.annualAverage : (t1 ? (t1.average + safeAvg) / 2 : safeAvg);
                const computedRank = studentRanks[student.id] || 0;
                const totalStudents = students.length;

                return (
                  <tr key={student.id} className="group hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors">
                    <td className="sticky left-0 z-10 bg-white dark:bg-[#131622] group-hover:bg-indigo-50/60 dark:group-hover:bg-indigo-950/40 px-6 py-5 border-r border-slate-200 dark:border-slate-800 min-w-[280px]">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-400 w-6">{idx + 1}.</span>
                        <div>
                          <p className="font-extrabold text-slate-900 dark:text-white text-sm leading-tight">{student.name}</p>
                          <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight mt-0.5">{student.matricule}</p>
                        </div>
                      </div>
                    </td>

                    {/* Behavior Data */}
                    {!isHigherEd && (
                      <td className="px-2 py-4 text-center border-r border-slate-200 dark:border-slate-800 bg-orange-50/20 dark:bg-orange-950/10 min-w-[200px]">
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="20"
                            className="w-14 h-8 text-xs font-black text-orange-600 dark:text-orange-400 bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-800 rounded-md text-center focus:ring-2 focus:ring-orange-400 outline-none"
                            value={appreciations[student.id]?.conduite ?? ""}
                            onChange={(e) => updateAppreciation(student.id, 'conduite', e.target.value)}
                            title="Note de conduite (/20)"
                          />
                          <select
                            className="w-26 h-8 text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-1 focus:ring-2 focus:ring-slate-400 outline-none"
                            value={appreciations[student.id]?.travail || "-"}
                            onChange={(e) => updateAppreciation(student.id, 'travail', e.target.value)}
                          >
                            <option value="-">-</option>
                            <option value="Félicitation">Félicitation</option>
                            <option value="Encouragement">Encouragement</option>
                            <option value="Tableau d'honneur">Tab. d'honneur</option>
                            <option value="Avertissement">Avertissement</option>
                            <option value="Blâme">Blâme</option>
                          </select>
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            checked={appreciations[student.id]?.tableauHonneur || false}
                            onChange={(e) => updateAppreciation(student.id, 'tableauHonneur', e.target.checked)}
                            title="Tableau d'Honneur"
                          />
                        </div>
                      </td>
                    )}

                    {subjects.map((sub) => {
                      const res = student.results[sub.id] || {};
                      const coef = sub.coefficient || res.coef || 1;
                      
                      const noteStr = res.note !== undefined && res.note !== "-" 
                        ? res.note 
                        : (res.total !== undefined && res.total !== "-" ? res.total : (res.n2 !== undefined && res.n2 !== "-" ? res.n2 : "-"));
                      
                      const moyNum = res.moyVal !== undefined 
                        ? res.moyVal 
                        : (res.moy !== undefined && res.moy !== "-" ? parseFloat(String(res.moy)) : (noteStr !== "-" ? parseFloat(String(noteStr)) : null));
                      
                      const moyStr = res.moy !== undefined && res.moy !== "-" 
                        ? res.moy 
                        : (moyNum !== null ? moyNum.toFixed(2) : "-");
                      
                      const moyCoefVal = res.moyCoefVal !== undefined 
                        ? res.moyCoefVal 
                        : (moyNum !== null ? (moyNum * coef) : null);
                      const moyCoefStr = res.moyCoef !== undefined && res.moyCoef !== "-" 
                        ? res.moyCoef 
                        : (moyCoefVal !== null ? moyCoefVal.toFixed(2) : "-");
                      
                      let mention = res.appreciation;
                      if (!mention || mention === "-") {
                        if (moyNum !== null) {
                          if (moyNum >= 16) mention = "T.Bien";
                          else if (moyNum >= 14) mention = "Bien";
                          else if (moyNum >= 12) mention = "A.Bien";
                          else if (moyNum >= 10) mention = "Passable";
                          else if (moyNum >= 8) mention = "Rattrapage";
                          else mention = "Ajourné";
                        } else {
                          mention = "-";
                        }
                      }

                      return (
                        <td key={sub.id} className={`px-2 py-4 text-center border-r border-slate-200 dark:border-slate-800 ${isHigherEd ? 'min-w-[340px]' : 'min-w-[220px]'}`}>
                          <div className="flex items-center justify-center gap-2">
                            {isHigherEd ? (
                              <>
                                {/* NOTE /20 */}
                                <span className="text-xs font-black text-slate-900 dark:text-slate-100 w-10 text-center" title="Note /20">
                                  {noteStr}
                                </span>
                                
                                {/* MOY /20 */}
                                <span className={`text-xs font-black w-10 text-center py-0.5 px-1 rounded-md ${moyNum !== null && moyNum >= 10 ? 'text-indigo-700 bg-indigo-100/90 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/80' : 'text-rose-700 bg-rose-100/90 dark:bg-rose-950 dark:text-rose-300 border border-rose-200/80'}`} title="Moyenne /20">
                                  {moyStr}
                                </span>

                                {/* MOY. COEF */}
                                <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 w-12 text-center" title="Moyenne × Coef">
                                  {moyCoefStr}
                                </span>

                                {/* CRÉDITS */}
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-7 text-center" title="Crédits (Coef)">
                                  {coef}
                                </span>

                                {/* MENTION */}
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${moyNum !== null && moyNum >= 10 ? 'bg-indigo-600 text-white dark:bg-indigo-500' : 'bg-rose-600 text-white dark:bg-rose-500'} uppercase tracking-tight text-center truncate max-w-[75px] shadow-xs`} title={mention}>
                                  {mention}
                                </span>

                                {/* RNG */}
                                <span className="text-xs font-black text-amber-600 dark:text-amber-400 w-7 text-center" title="Rang">
                                  {res.rank || "-"}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-7 text-center">{res.n1 || "-"}</span>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-7 text-center">{res.n2 || "-"}</span>
                                <span className="text-xs font-black text-slate-900 dark:text-white w-9 text-center">{res.total || "-"}</span>
                                <span className={`text-xs font-black w-9 text-center py-0.5 px-1.5 rounded-md ${parseFloat(String(res.moy || '0')) >= 10 ? 'text-emerald-700 bg-emerald-100/90 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/80' : 'text-rose-700 bg-rose-100/90 dark:bg-rose-950 dark:text-rose-300 border border-rose-200/80'}`}>
                                  {res.moy || "-"}
                                </span>
                                <span className="text-xs font-black text-amber-600 dark:text-amber-400 w-7 text-center">{res.rank || "-"}</span>
                              </>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Cumulative Data Rows */}
                    {isCumulative && (
                      <>
                        <td className="px-6 py-4 text-center border-r border-slate-200 dark:border-slate-800 bg-cyan-50/20 dark:bg-cyan-950/10">
                          <div className="flex items-center justify-center gap-4 text-xs font-black">
                            <span className="text-cyan-700 dark:text-cyan-300 w-10">{t1?.average?.toFixed(2) || "-"}</span>
                            <span className="text-slate-500 w-8">{t1?.rank || "-"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center border-r border-slate-200 dark:border-slate-800 bg-yellow-50/20 dark:bg-yellow-950/10">
                          <div className="flex items-center justify-center gap-4 text-xs font-black">
                            <span className={`w-10 ${annualAvg >= 10 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>{annualAvg.toFixed(2)}</span>
                            <span className="text-amber-600 dark:text-amber-400 w-8">{student.annualRank || "-"}</span>
                          </div>
                        </td>
                      </>
                    )}

                    <td className="px-8 py-4 text-center bg-slate-50/60 dark:bg-slate-900/40 border-r border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-center gap-6">
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300" title="Σ COEF">
                          {displayTotalCoef || "-"}
                        </span>
                        <span className={`text-base font-black px-3 py-1 rounded-lg ${safeAvg >= 10 ? 'text-emerald-800 bg-emerald-100 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200' : 'text-rose-800 bg-rose-100 border border-rose-300 dark:bg-rose-950 dark:text-rose-200'} shadow-sm`}>
                          {safeAvg.toFixed(2)}
                        </span>
                        <span className="text-xs font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 px-2.5 py-1 rounded-md border border-amber-300/50">
                          {computedRank > 0 ? formatRank(computedRank) : "-"} / {totalStudents}
                        </span>
                        <DecisionBadge decision={safeAvg >= 10 ? "ADMIS ✅" : "REDOUBLE ❌"} />
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <Button
                        onClick={() => onPrintBulletin(student.id)}
                        className="h-10 px-4 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                      >
                        <BadgeCheck size={16} /> Bulletin
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Annual Report Modal */}
      {showAnnualReportModal && (
        <div id="official-annual-report-modal-wrapper" className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 md:p-6 overflow-y-auto print-modal-wrapper">
          {/* Embedded Print CSS */}
          <style>{`
            @media print {
              @page {
                size: A4 landscape !important;
                margin: 4mm !important;
              }
              body {
                background: #ffffff !important;
                color: #000000 !important;
              }
              .no-print {
                display: none !important;
              }
              #official-annual-report-modal-wrapper {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                background: #ffffff !important;
                padding: 0 !important;
                margin: 0 !important;
                display: block !important;
                overflow: visible !important;
                z-index: 999999 !important;
              }
              #official-annual-report-printable {
                position: relative !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                max-height: none !important;
                background: #ffffff !important;
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
                overflow: visible !important;
                border-radius: 0 !important;
              }
              .print-container, .print-scroll-area {
                overflow: visible !important;
                max-height: none !important;
                height: auto !important;
                background: #ffffff !important;
                padding: 0 !important;
              }
              .print-header {
                background: #0f172a !important;
                color: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                padding: 8px 12px !important;
                margin-bottom: 4px !important;
              }
              .print-table {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                font-size: 7.5pt !important;
                border-collapse: collapse !important;
                table-layout: fixed !important;
              }
              .print-table tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .print-table th, .print-table td {
                padding: 3.5px 2px !important;
                border: 0.5pt solid #1e293b !important;
                word-break: break-word !important;
                overflow-wrap: break-word !important;
                white-space: normal !important;
                color: #0f172a !important;
                font-size: 7.5pt !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-table th {
                background-color: #0f172a !important;
                color: #ffffff !important;
                font-weight: bold !important;
                text-transform: uppercase !important;
                font-size: 7pt !important;
              }
            }
          `}</style>

          <div id="official-annual-report-printable" className="bg-white w-full max-w-[95vw] rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print-container">
            {/* Modal Header */}
            <div className="p-6 md:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center border-b border-slate-800 print-header">
              <div className="flex items-center gap-4">
                <div className="p-3.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30 no-print">
                  <FileSpreadsheet size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Rapport Récapitulatif Officiel Annuel</h2>
                  <p className="text-sm text-slate-300 font-medium mt-0.5">
                    Classe: <span className="text-amber-400 font-bold">{activeFilters?.className || "N/A"}</span> • {students.length} Élèves inscrits
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 no-print">
                <Button
                  onClick={handleDownloadUniversityPVPDF}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl flex items-center gap-2 border border-purple-400/30 shadow-md"
                >
                  <Award size={18} /> 🎓 Télécharger PV LMD (PDF)
                </Button>
                <Button
                  onClick={handleDownloadAnnualReportPDF}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-2"
                >
                  <FileText size={18} /> Télécharger PDF Officiel
                </Button>
                <Button
                  onClick={handleExportAnnualReportCSV}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2"
                >
                  <Download size={18} /> Exporter Excel (CSV)
                </Button>
                <Button
                  onClick={handlePrintAnnualReport}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl flex items-center gap-2"
                >
                  <Printer size={18} /> Imprimer (Paysage)
                </Button>
                <button
                  onClick={() => setShowAnnualReportModal(false)}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Official School Header Banner */}
            {headerConfig && (
              <div className="px-6 pt-4 pb-2 flex justify-between items-center border-b border-slate-200 bg-white">
                <div className="flex items-center gap-3">
                  {(headerConfig.logoUrl || headerConfig.leftLogo) && (
                    <img
                      src={headerConfig.logoUrl || headerConfig.leftLogo}
                      alt="Logo"
                      className="w-12 h-12 object-contain"
                    />
                  )}
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase">{headerConfig.country || headerConfig.countryName || "RÉPUBLIQUE DU NIGER"}</p>
                    <p className="text-[10px] italic text-slate-500">{headerConfig.motto || "Unité - Travail - Progrès"}</p>
                    <p className="text-[10px] font-bold text-slate-700">{headerConfig.ministry || headerConfig.ministryName || "MINISTÈRE DE L'ÉDUCATION NATIONALE"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-black text-indigo-950 uppercase">{headerConfig.schoolName || "ÉCOLE GESTION PRO"}</h3>
                  <p className="text-xs text-slate-500 font-medium">Année Scolaire: {activeFilters?.sessionName || "2025-2026"}</p>
                </div>
              </div>
            )}

            {/* Modal Body / Table */}
            <div className="p-4 md:p-6 overflow-auto flex-1 bg-slate-50/50 print-scroll-area">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs border-collapse print-table">
                  <thead>
                    {(() => {
                      const cls = (activeFilters?.className || "").toUpperCase();
                      let s1 = isHigherEd ? "Moy. S1" : "Moy. 1er Sem.";
                      let r1 = isHigherEd ? "Rang S1" : "Rang 1er Sem.";
                      let s2 = isHigherEd ? "Moy. S2" : "Moy. 2ème Sem.";
                      let r2 = isHigherEd ? "Rang S2" : "Rang 2ème Sem.";
                      if (isHigherEd) {
                        if (cls.includes("L2") || cls.includes("LICENCE 2") || cls.includes("L-2")) {
                          s1 = "Moy. S3"; r1 = "Rang S3"; s2 = "Moy. S4"; r2 = "Rang S4";
                        } else if (cls.includes("L3") || cls.includes("LICENCE 3") || cls.includes("L-3")) {
                          s1 = "Moy. S5"; r1 = "Rang S5"; s2 = "Moy. S6"; r2 = "Rang S6";
                        } else if (cls.includes("M2") || cls.includes("MASTER 2") || cls.includes("M-2")) {
                          s1 = "Moy. S9"; r1 = "Rang S9"; s2 = "Moy. S10"; r2 = "Rang S10";
                        }
                      }
                      return (
                        <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                          <th className="p-2 border-r border-slate-800 text-center w-[3%]">N°</th>
                          <th className="p-2 border-r border-slate-800 w-[16%]">Noms et Prénoms</th>
                          <th className="p-2 border-r border-slate-800 w-[14%]">Date et lieu de naissance</th>
                          <th className="p-2 border-r border-slate-800 text-center w-[10%]">Matricule</th>
                          <th className="p-2 border-r border-slate-800 text-center w-[4%]">Sexe</th>
                          <th className="p-2 border-r border-slate-800 text-center text-cyan-300 w-[6%]">{s1}</th>
                          <th className="p-2 border-r border-slate-800 text-center text-cyan-300 w-[5%]">{r1}</th>
                          <th className="p-2 border-r border-slate-800 text-center text-indigo-300 w-[6%]">{s2}</th>
                          <th className="p-2 border-r border-slate-800 text-center text-indigo-300 w-[5%]">{r2}</th>
                          <th className="p-2 border-r border-slate-800 text-center text-amber-300 w-[8%]">Moy. Annuelle</th>
                          <th className="p-2 border-r border-slate-800 text-center text-emerald-400 w-[11%]">Décision du Conseil</th>
                          <th className="p-2 border-r border-slate-800 text-center text-purple-300 w-[8%]">Affectation / Classe</th>
                          <th className="p-2 text-center w-[6%]">Allocataire</th>
                        </tr>
                      );
                    })()}
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {students.map((student: any, idx: number) => {
                      const dob = student.dateNaissance || student.dateOfBirth || student.birthDate || "-";
                      const pob = student.lieuNaissance || student.placeOfBirth || "-";
                      const dateAndPlace = `${dob} à ${pob}`;

                      const s1Summary = student.summaryS1 || student.history?.find((h: any) => {
                        if (!h.term) return false;
                        const norm = String(h.term).toLowerCase();
                        return norm.includes("1") || norm.includes("première") || norm.includes("s1");
                      });
                      const s2Summary = student.summaryS2 || student.history?.find((h: any) => {
                        if (!h.term) return false;
                        const norm = String(h.term).toLowerCase();
                        return norm.includes("2") || norm.includes("deuxième") || norm.includes("s2");
                      });

                      const formatAvg = (v: any) => {
                        if (v === null || v === undefined || v === "" || v === "-") return "-";
                        const n = typeof v === 'number' ? v : parseFloat(String(v));
                        return !isNaN(n) ? n.toFixed(2) : "-";
                      };

                      const formatRank = (v: any) => {
                        if (!v || v === "-" || v === "N/A") return "-";
                        return String(v);
                      };

                      const s1Avg = formatAvg(s1Summary?.average ?? student.s1Average);
                      const s1Rank = formatRank(s1Summary?.rank ?? student.s1Rank);

                      const s2Avg = formatAvg(s2Summary?.average ?? student.s2Average);
                      const s2Rank = formatRank(s2Summary?.rank ?? student.s2Rank);

                      const safeAvg = typeof student.average === 'number' && !isNaN(student.average) ? student.average : 0;
                      const annualAvg = typeof student.annualAverage === 'number' ? student.annualAverage.toFixed(2) : safeAvg.toFixed(2);

                      const allocataire = student.allocataire || (student.isScholarship ? "Boursier" : "Non Boursier") || "Non";

                      const decisionStr = student.decision || (parseFloat(annualAvg) >= 10 ? "ADMIS(E) EN CLASSE SUPÉRIEURE ✅" : parseFloat(annualAvg) >= 8 ? "AUTORISÉ(E) À REDOUBLER ❌" : "EXCLU(E) ⛔");
                      const isAdmis = decisionStr.includes("ADMIS");
                      const isRedouble = decisionStr.includes("REDOUBLE");

                      return (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2 border-r border-slate-100 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-2 border-r border-slate-100 font-bold text-slate-900">{student.name || student.studentName || "Élève"}</td>
                          <td className="p-2 border-r border-slate-100 text-slate-600">{dateAndPlace}</td>
                          <td className="p-2 border-r border-slate-100 text-center font-mono font-bold text-indigo-600">{student.matricule || "-"}</td>
                          <td className="p-2 border-r border-slate-100 text-center font-bold">{student.sexe || student.gender || "M"}</td>
                          <td className="p-2 border-r border-slate-100 text-center font-bold text-slate-900 bg-cyan-50/20">{s1Avg}</td>
                          <td className="p-2 border-r border-slate-100 text-center font-bold text-cyan-700 bg-cyan-50/20">{s1Rank}</td>
                          <td className="p-2 border-r border-slate-100 text-center font-bold text-slate-900 bg-indigo-50/20">{s2Avg}</td>
                          <td className="p-2 border-r border-slate-100 text-center font-bold text-indigo-700 bg-indigo-50/20">{s2Rank}</td>
                          <td className="p-2 border-r border-slate-100 text-center font-black text-amber-600 text-sm bg-amber-50/30">{annualAvg}</td>
                          <td className="p-2 border-r border-slate-100 text-center">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold inline-block ${
                              isAdmis ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                              isRedouble ? "bg-amber-100 text-amber-800 border border-amber-300" :
                              "bg-rose-100 text-rose-800 border border-rose-300"
                            }`}>
                              {decisionStr}
                            </span>
                          </td>
                          <td className="p-2 border-r border-slate-100 text-center font-bold text-purple-700 text-[11px]">
                            {student.targetClassName || (isRedouble ? `Redouble en ${activeFilters?.className || "Classe"}` : computeNextClassStr(activeFilters?.className || student.classe))}
                          </td>
                          <td className="p-2 text-center font-semibold text-slate-700">{allocataire}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-medium no-print">
              <p>Rapport récapitulatif généré conformément aux normes pédagogiques officielles.</p>
              <Button onClick={() => setShowAnnualReportModal(false)} variant="outline" className="rounded-xl">
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MatrixStatsCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-[#131622]/90 rounded-[1.25rem] p-5 border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">{label}</p>
          <p className="text-lg font-black text-slate-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function DecisionBadge({ decision }: { decision: string }) {
  const isAdmis = decision.includes("ADMIS") || decision.includes("Passage");
  const isRedouble = decision.includes("REDOUBLE") || decision.includes("AUTORISÉ");
  
  let bgClass = "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200";
  if (isAdmis) {
    bgClass = "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200";
  } else if (isRedouble) {
    bgClass = "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200";
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-tight border shadow-xs ${bgClass}`}>
      {decision}
    </span>
  );
}