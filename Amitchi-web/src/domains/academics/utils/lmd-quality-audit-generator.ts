/**
 * Official Academic Quality & Performance Audit Report Generator
 * Standards: ANAQ-Sup / CAMES / REESAO / UNESCO Bologna
 * Generates Official PDF Report with Key Performance Indicators, Pass Rates,
 * Normal vs Rattrapage Session Impact, and Quality Assurance Metrics.
 */

import { drawUnifiedLmdHeader, drawUnifiedLmdSignatureZone } from "./lmd-header-helper";

export interface QualityAuditParams {
  institution: {
    name?: string;
    countryName?: string;
    ministryName?: string;
    motto?: string;
    facultyName?: string;
    departmentName?: string;
    city?: string;
    academicYear?: string;
    logoUrl?: string;
  };
  metrics: {
    totalStudents: number;
    graduatedCount: number;
    directPassCount: number;
    enjambementCount: number;
    ajourneCount: number;
    overallPassRate: number; // e.g. 84.5%
    session1PassRate: number; // e.g. 68.2%
    session2RecoveryRate: number; // e.g. 52.4% (gain from rattrapage)
    averageGpa: number; // e.g. 14.85 / 20
    totalEctsAwarded: number; // e.g. 4,560 ECTS
  };
  uePerformances: Array<{
    codeUe: string;
    nameUe: string;
    creditsEcts: number;
    passRate: number; // %
    averageGrade: number; // /20
    failureRisk: "Faible" | "Modéré" | "Élevé";
  }>;
  gradeDistribution: Array<{
    grade: string; // A, B, C, D, E, F
    count: number;
    percentage: number;
    label: string;
  }>;
}

export async function generateQualityAuditReportPDF(data: QualityAuditParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Unified Official Header
  const headerBottomY = drawUnifiedLmdHeader(doc, {
    orientation: "portrait",
    countryName: data.institution.countryName,
    ministryName: data.institution.ministryName,
    motto: data.institution.motto,
    schoolName: data.institution.name,
    facultyName: data.institution.facultyName,
    departmentName: data.institution.departmentName,
    city: data.institution.city,
    logoUrl: data.institution.logoUrl,
    documentTitle: "RAPPORT OFFICIEL D'AUDIT QUALITÉ & PERFORMANCE LMD",
    documentSubtitle: `Indicateurs ANAQ-Sup / CAMES • Année Académique ${data.institution.academicYear || "2025-2026"} • ECTS Quality Assurance`,
    bannerColor: "emerald",
  });

  let currentY = headerBottomY;

  const renderSectionBar = (title: string) => {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(10, currentY, pageWidth - 20, 6, 1, 1, "FD");

    doc.setFillColor(16, 94, 70);
    doc.rect(10, currentY, 2.5, 6, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    doc.text(title.toUpperCase(), 15, currentY + 4.2);
    currentY += 8;
  };

  // 2. INDICATEURS CLÉS DE PERFORMANCE (KPIs)
  renderSectionBar("1. Indicateurs Globaux de Réussite & Efficacité Pédagogique");

  const kpiBoxW = (pageWidth - 20 - 9) / 4;
  const kpiBoxH = 14;

  const kpis = [
    { title: "EFFECTIF AUDITÉ", val: `${data.metrics.totalStudents}`, sub: "Étudiants inscrits", color: [15, 23, 42] },
    { title: "TAUX GLOBAL RÉUSSITE", val: `${data.metrics.overallPassRate}%`, sub: `${data.metrics.graduatedCount} Diplômés / Admis`, color: [16, 94, 70] },
    { title: "APPORT RATTRAPAGE", val: `+${data.metrics.session2RecoveryRate}%`, sub: "Gain Session 2", color: [79, 70, 229] },
    { title: "CRÉDITS VALIDÉS", val: `${data.metrics.totalEctsAwarded}`, sub: "ECTS Capitalisés", color: [146, 64, 14] },
  ];

  kpis.forEach((kpi, idx) => {
    const bx = 10 + idx * (kpiBoxW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(bx, currentY, kpiBoxW, kpiBoxH, 1, 1, "FD");

    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title, bx + kpiBoxW / 2, currentY + 4, { align: "center" });

    doc.setFontSize(9);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.val, bx + kpiBoxW / 2, currentY + 9, { align: "center" });

    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.sub, bx + kpiBoxW / 2, currentY + 12.5, { align: "center" });
  });

  currentY += kpiBoxH + 4.5;

  // 3. TABLEAU DE PERFORMANCE DES UNITÉS D'ENSEIGNEMENT (UEs)
  renderSectionBar("2. Analyse Détaillée des Unités d'Enseignement & Risques Académiques");

  const ueRows = (data.uePerformances || []).map((ue, idx) => [
    (idx + 1).toString(),
    ue.codeUe,
    ue.nameUe,
    `${ue.creditsEcts} ECTS`,
    `${ue.passRate}%`,
    `${ue.averageGrade.toFixed(2)} / 20`,
    ue.failureRisk,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["N°", "Code UE", "Intitulé de l'UE", "Crédits", "Taux Réussite", "Moyenne Promo", "Niveau de Risque"]],
    body: ueRows,
    theme: "grid",
    margin: { left: 10, right: 10 },
    headStyles: {
      fillColor: [16, 94, 70],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.5,
      halign: "center",
      cellPadding: 1.3,
    },
    bodyStyles: {
      fontSize: 6.2,
      textColor: [51, 65, 85],
      halign: "center",
      cellPadding: 1.1,
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { fontStyle: "bold", cellWidth: 18 },
      2: { halign: "left", cellWidth: 70 },
      3: { cellWidth: 18 },
      4: { fontStyle: "bold", cellWidth: 22 },
      5: { cellWidth: 22 },
      6: { fontStyle: "bold", cellWidth: 24 },
    },
    didParseCell: (hookData: any) => {
      if (hookData.section === "body" && hookData.column.index === 6) {
        const text = String(hookData.cell.raw || "");
        if (text === "Faible") {
          hookData.cell.styles.textColor = [16, 94, 70];
        } else if (text === "Modéré") {
          hookData.cell.styles.textColor = [180, 83, 9];
        } else {
          hookData.cell.styles.textColor = [225, 29, 72];
        }
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4.5;

  // 4. DISTRIBUTION DES GRADES ECTS (A à F)
  renderSectionBar("3. Répartition Statistique des Grades ECTS (Bologne / CAMES)");

  const gradeRows = (data.gradeDistribution || []).map((g) => [
    `Grade ${g.grade}`,
    g.label,
    `${g.count} étudiants`,
    `${g.percentage.toFixed(1)} %`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Grade ECTS", "Définition & Centile", "Effectif Concerné", "Pourcentage"]],
    body: gradeRows,
    theme: "grid",
    margin: { left: 10, right: 10 },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.5,
      halign: "center",
      cellPadding: 1.2,
    },
    bodyStyles: {
      fontSize: 6.2,
      textColor: [51, 65, 85],
      halign: "center",
      cellPadding: 1.1,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 28 },
      1: { halign: "left", cellWidth: 70 },
      2: { cellWidth: 38 },
      3: { fontStyle: "bold", textColor: [16, 94, 70], cellWidth: 28 },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;

  // 5. Signatures
  drawUnifiedLmdSignatureZone(doc, {
    startY: finalY,
    leftTitle: "Le Responsable Assurance Qualité (ANAQ-Sup)",
    leftSubtitle: "Visa et certification des indicateurs",
    rightTitle: "Le Recteur / Directeur de l'Établissement",
    rightSubtitle: "Approbation du plan d'action qualité",
    centerCode: `AUDIT-QA-${Date.now().toString().slice(-6)}`,
    city: data.institution.city,
    orientation: "portrait",
  });

  const cleanYear = (data.institution.academicYear || "2025-2026").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Rapport_Audit_Qualite_LMD_${cleanYear}.pdf`);
}
