/**
 * LMD Annual Deliberation (Bilan 60 ECTS & Enjambement) Generator
 * Standards: REESAO / CAMES / ECTS / Bologne
 * Vector-perfect Landscape PV & Portrait Annual Transcripts
 */

import { drawUnifiedLmdHeader, drawUnifiedLmdSignatureZone } from "./lmd-header-helper";

export interface LmdAnnualStudent {
  student: {
    id: number;
    nom: string;
    matricule?: string;
    sexe?: string;
  };
  rank: number;
  sem1: {
    name: string;
    average: number;
    creditsAcquired: number;
    isValidated: boolean;
    decision: string;
    ueResults?: any[];
  };
  sem2: {
    name: string;
    average: number;
    creditsAcquired: number;
    isValidated: boolean;
    decision: string;
    ueResults?: any[];
  };
  annual: {
    annualAverage: number;
    totalCreditsAcquired: number;
    totalCreditsTarget: number;
    decision: string;
    mention: string;
    isAnnualValidated: boolean;
    isEnjambement: boolean;
    cycleLevel: string;
  };
}

export interface LmdAnnualParams {
  institution: {
    name?: string;
    countryName?: string;
    ministryName?: string;
    motto?: string;
    facultyName?: string;
    departmentName?: string;
    programName?: string;
    className?: string;
    sessionName?: string;
    cycleLevel?: string;
    city?: string;
    logoUrl?: string;
  };
  sem1Name: string;
  sem2Name: string;
  cycleLevel: string;
  cohort: LmdAnnualStudent[];
  totalStudents: number;
  passedCount: number;
  enjambementCount: number;
  ajournesCount: number;
  successRate: number;
  sessionType?: "Normale" | "Rattrapage";
}

/**
 * 1. Generate Official Annual Deliberation PV (A4 Landscape)
 */
export async function generateLmdAnnualDeliberationPVPDF(data: LmdAnnualParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const isRat = data.sessionType === "Rattrapage";

  // 1. Unified Official Landscape Header
  const headerBottomY = drawUnifiedLmdHeader(doc, {
    orientation: "landscape",
    countryName: data.institution.countryName,
    ministryName: data.institution.ministryName,
    motto: data.institution.motto,
    schoolName: data.institution.name,
    facultyName: data.institution.facultyName,
    departmentName: data.institution.departmentName,
    city: data.institution.city,
    logoUrl: data.institution.logoUrl,
    documentTitle: `PROCÈS-VERBAL ANNUEL DE DÉLIBÉRATION DU JURY LMD — ${data.cycleLevel.toUpperCase()}`,
    documentSubtitle: `Filière : ${data.institution.programName || "Tronc Commun"} • Promo : ${data.institution.className || "Classe"} • Session : ${data.institution.sessionName || "2025-2026"} • ${isRat ? "Session 2 (Rattrapage)" : "Session 1 (Normale)"}`,
    bannerColor: "emerald",
  });

  // 2. Summary Statistics Mini-Bar
  const statsY = headerBottomY;
  const marginX = 12;
  const statsBoxW = (pageWidth - marginX * 2 - 12) / 4;
  const statsH = 11;

  // Box 1: Effectif Total
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, statsY, statsBoxW, statsH, 1, 1, "FD");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("EFFECTIF PROMOTION", marginX + statsBoxW / 2, statsY + 3.8, { align: "center" });
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.totalStudents} Étudiants`, marginX + statsBoxW / 2, statsY + 8.5, { align: "center" });

  // Box 2: Admis Année Sup
  const b2X = marginX + statsBoxW + 4;
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(b2X, statsY, statsBoxW, statsH, 1, 1, "FD");
  doc.setFontSize(6.5);
  doc.setTextColor(6, 95, 70);
  doc.text("ADMIS EN ANNÉE SUP.", b2X + statsBoxW / 2, statsY + 3.8, { align: "center" });
  doc.setFontSize(8.5);
  doc.text(`${data.passedCount} (${data.totalStudents > 0 ? ((data.passedCount / data.totalStudents) * 100).toFixed(1) : 0}%)`, b2X + statsBoxW / 2, statsY + 8.5, { align: "center" });

  // Box 3: Enjambement
  const b3X = b2X + statsBoxW + 4;
  doc.setFillColor(255, 251, 235); // amber-50
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(b3X, statsY, statsBoxW, statsH, 1, 1, "FD");
  doc.setFontSize(6.5);
  doc.setTextColor(146, 64, 14);
  doc.text("ENJAMBEMENT (DETTES)", b3X + statsBoxW / 2, statsY + 3.8, { align: "center" });
  doc.setFontSize(8.5);
  doc.text(`${data.enjambementCount} (≥ 45 ECTS)`, b3X + statsBoxW / 2, statsY + 8.5, { align: "center" });

  // Box 4: Taux Global
  const b4X = b3X + statsBoxW + 4;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(b4X, statsY, statsBoxW, statsH, 1, 1, "FD");
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text("TAUX DE RÉUSSITE GLOBAL", b4X + statsBoxW / 2, statsY + 3.8, { align: "center" });
  doc.setFontSize(8.5);
  doc.setTextColor(16, 94, 70);
  doc.text(`${data.successRate}%`, b4X + statsBoxW / 2, statsY + 8.5, { align: "center" });

  // 3. Table Columns
  const headers = [
    "Rang",
    "Matricule",
    "Nom & Prénoms",
    `${data.sem1Name}\n(Moy / 30 ECTS)`,
    `${data.sem2Name}\n(Moy / 30 ECTS)`,
    "MGA /20\nAnnuelle",
    "Crédits\n/ 60 ECTS",
    "Décision Annuelle du Jury",
    "Mention",
  ];

  const body = data.cohort.map((c) => {
    return [
      `${c.rank}e`,
      c.student.matricule || "N/A",
      c.student.nom,
      `${c.sem1.average.toFixed(2)} (${c.sem1.creditsAcquired} ECTS)`,
      `${c.sem2.average.toFixed(2)} (${c.sem2.creditsAcquired} ECTS)`,
      c.annual.annualAverage.toFixed(2),
      `${c.annual.totalCreditsAcquired} / 60`,
      c.annual.decision,
      c.annual.mention,
    ];
  });

  const tableStartY = statsY + statsH + 3.5;

  autoTable(doc, {
    startY: tableStartY,
    head: [headers],
    body: body,
    theme: "grid",
    headStyles: {
      fillColor: [16, 94, 70], // emerald-800
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
      valign: "middle",
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 14, fontStyle: "bold" },
      1: { halign: "center", cellWidth: 26, fontStyle: "bold" },
      2: { halign: "left", cellWidth: 58, fontStyle: "bold" },
      3: { halign: "center", cellWidth: 32 },
      4: { halign: "center", cellWidth: 32 },
      5: { halign: "center", cellWidth: 22, fontStyle: "bold" },
      6: { halign: "center", cellWidth: 24, fontStyle: "bold" },
      7: { halign: "center", cellWidth: 44, fontStyle: "bold" },
      8: { halign: "center", cellWidth: 22 },
    },
    didParseCell: (hookData: any) => {
      if (hookData.section === "body") {
        const text = String(hookData.cell.raw || "");
        if (hookData.column.index === 7) {
          if (text.includes("Admis en Année")) {
            hookData.cell.styles.textColor = [16, 94, 70]; // emerald-700
          } else if (text.includes("Enjambement")) {
            hookData.cell.styles.textColor = [180, 83, 9]; // amber-700
          } else {
            hookData.cell.styles.textColor = [225, 29, 72]; // rose-600
          }
        }
      }
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;
  drawUnifiedLmdSignatureZone(doc, {
    startY: finalY,
    leftTitle: "Le Président du Jury LMD",
    leftSubtitle: "Signature et validation officielle du PV",
    rightTitle: "Le Doyen / Directeur de l'Établissement",
    rightSubtitle: "Approbation officielle et Sceau de l'Université",
    centerCode: `PV-ANNUEL-${data.cycleLevel}-${Date.now().toString().slice(-6)}`,
    city: data.institution.city,
    orientation: "landscape",
  });

  const cleanClass = (data.institution.className || "Classe").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`PV_Deliberation_Annuelle_${data.cycleLevel.replace(/[^a-zA-Z0-9]/g, "_")}_${cleanClass}.pdf`);
}

/**
 * 2. Generate Single Student Annual Transcript (A4 Portrait)
 */
export async function generateLmdStudentAnnualRelevePDF(
  item: LmdAnnualStudent,
  institution: any,
  totalCohort: number
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Unified Official Header
  const headerBottomY = drawUnifiedLmdHeader(doc, {
    orientation: "portrait",
    countryName: institution.countryName,
    ministryName: institution.ministryName,
    motto: institution.motto,
    schoolName: institution.name,
    facultyName: institution.facultyName,
    departmentName: institution.departmentName,
    city: institution.city,
    logoUrl: institution.logoUrl,
    documentTitle: "RELEVÉ DE NOTES ANNUEL & BILAN DES 60 CRÉDITS ECTS",
    documentSubtitle: `Cycle LMD • ${item.annual.cycleLevel} • Validation de l'Année Académique • Norme REESAO / CAMES`,
    bannerColor: "emerald",
  });

  // 2. Student Info Box
  const infoY = headerBottomY;
  const marginX = 10;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, infoY, pageWidth - marginX * 2, 24, 1.5, 1.5, "FD");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Nom & Prénoms :", marginX + 4, infoY + 6);
  doc.setTextColor(15, 23, 42);
  doc.text(item.student.nom.toUpperCase(), marginX + 32, infoY + 6);

  doc.setTextColor(71, 85, 105);
  doc.text("N° Matricule :", marginX + 4, infoY + 12);
  doc.setFont("courier", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(item.student.matricule || "N/A", marginX + 32, infoY + 12);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Filière / Cycle :", marginX + 4, infoY + 18);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(`${institution.programName || "LMD"} (${item.annual.cycleLevel})`, marginX + 32, infoY + 18);

  const rightColX = pageWidth / 2 + 8;
  const rightValX = rightColX + 34;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Année Académique :", rightColX, infoY + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(institution.sessionName || "2025-2026", rightValX, infoY + 6);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Classe / Promotion :", rightColX, infoY + 12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(institution.className || "Promotion LMD", rightValX, infoY + 12);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Rang de l'Étudiant :", rightColX, infoY + 18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 94, 70);
  doc.text(`${item.rank === 1 ? "1er (Major)" : `${item.rank}e`} sur ${totalCohort} étudiants`, rightValX, infoY + 18);

  // 3. Annual Balance Summary Table
  const tableHeaders = ["Période Académique", "Moyenne / 20", "Crédits Validés", "Total Visé", "Décision Semestrielle"];
  const tableBody = [
    [item.sem1.name, `${item.sem1.average.toFixed(2)} / 20`, `${item.sem1.creditsAcquired} ECTS`, "30 ECTS", item.sem1.decision],
    [item.sem2.name, `${item.sem2.average.toFixed(2)} / 20`, `${item.sem2.creditsAcquired} ECTS`, "30 ECTS", item.sem2.decision],
  ];

  const tableStartY = infoY + 27;

  autoTable(doc, {
    startY: tableStartY,
    head: [tableHeaders],
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [16, 94, 70], // emerald-800
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      halign: "center",
    },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold", cellWidth: 50 },
      1: { fontStyle: "bold" },
      2: { fontStyle: "bold", textColor: [16, 94, 70] },
      4: { fontStyle: "bold" },
    },
  });

  // 4. Annual Conclusion Card
  const annualY = (doc as any).lastAutoTable.finalY + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, annualY, pageWidth - marginX * 2, 28, 1.5, 1.5, "FD");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("BILAN ANNUEL GLOBAL (60 CRÉDITS ECTS) :", marginX + 4, annualY + 6.5);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`• Moyenne Générale Annuelle (MGA) : `, marginX + 4, annualY + 13);
  doc.setFont("helvetica", "bold");
  doc.text(`${item.annual.annualAverage.toFixed(2)} / 20`, marginX + 60, annualY + 13);

  doc.setFont("helvetica", "normal");
  doc.text(`• Total Crédits ECTS Capitalisés : `, marginX + 4, annualY + 19);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 94, 70);
  doc.text(`${item.annual.totalCreditsAcquired} / 60.0 ECTS`, marginX + 56, annualY + 19);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(`• Mention Annuelle : `, marginX + 4, annualY + 25);
  doc.setFont("helvetica", "bold");
  doc.text(item.annual.mention, marginX + 42, annualY + 25);

  // Decision Badge on the right
  const isPass = item.annual.isAnnualValidated;
  const isEnj = item.annual.isEnjambement;
  doc.setFillColor(isPass ? 236 : isEnj ? 255 : 255, isPass ? 253 : isEnj ? 251 : 228, isPass ? 245 : isEnj ? 235 : 230);
  doc.setDrawColor(isPass ? 167 : isEnj ? 253 : 254, isPass ? 243 : isEnj ? 230 : 205, isPass ? 208 : isEnj ? 138 : 211);
  doc.roundedRect(pageWidth - 78, annualY + 4, 66, 20, 1.5, 1.5, "FD");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(isPass ? 6 : isEnj ? 146 : 190, isPass ? 95 : isEnj ? 64 : 18, isPass ? 70 : isEnj ? 14 : 60);
  doc.text("DÉCISION DU JURY ANNUEL", pageWidth - 45, annualY + 9.5, { align: "center" });

  doc.setFontSize(7.5);
  doc.text(item.annual.decision, pageWidth - 45, annualY + 16, { align: "center", maxWidth: 62 });

  // 5. Signatures
  const sigY = annualY + 34;
  drawUnifiedLmdSignatureZone(doc, {
    startY: sigY,
    leftTitle: "Le Président du Jury LMD",
    leftSubtitle: "Signature et approbation",
    rightTitle: "Le Doyen / Directeur Général",
    rightSubtitle: "Cachet officiel et validation",
    centerCode: `ANNUEL-${item.student.id}-${(item.annual.annualAverage * 100).toFixed(0)}`,
    city: institution.city,
    orientation: "portrait",
  });

  const cleanNom = (item.student.nom || "Etudiant").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Releve_Annuel_LMD_${item.annual.cycleLevel.replace(/[^a-zA-Z0-9]/g, "_")}_${cleanNom}.pdf`);
}
