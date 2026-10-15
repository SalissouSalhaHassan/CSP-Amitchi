/**
 * LMD Official Transcript (Relevé de Notes) Generator
 * Standards: REESAO / CAMES / ECTS / Bologne
 * Unified Modern Architecture with Authentic State Emblems & Vector Security
 */

import { drawUnifiedLmdHeader, drawUnifiedLmdSignatureZone } from "./lmd-header-helper";

export interface LmdReleveParams {
  student: {
    id: number;
    nom: string;
    matricule?: string;
    dateNaissance?: string;
    lieuNaissance?: string;
    sexe?: string;
  };
  deliberation: {
    semester: string;
    semesterAverage: number;
    creditsAcquired: number;
    totalCredits: number;
    decision: string;
    mention: string;
    isSemesterValidated: boolean;
    ueResults: Array<{
      ueId: number;
      codeUe: string;
      nameUe: string;
      typeUe: string;
      creditsEcts: number;
      creditsAcquired: number;
      average: number;
      status: "V" | "VC" | "NV";
      ecuResults: Array<{
        id: number;
        codeEcu?: string;
        nameEcu: string;
        coefficient: number;
        creditsEcts: number;
        finalGrade: number;
        status: "V" | "NV";
      }>;
    }>;
  };
  institution: {
    name?: string;
    countryName?: string;
    ministryName?: string;
    motto?: string;
    facultyName?: string;
    departmentName?: string;
    programName?: string;
    degreeLevel?: string;
    className?: string;
    sessionName?: string;
    logoUrl?: string;
    city?: string;
    phone?: string;
    email?: string;
  };
  rank?: number | string;
  totalCohort?: number;
  sessionType?: "Normale" | "Rattrapage";
}

export function getEctsGrade(average: number): { grade: string; label: string } {
  if (average >= 16.0) return { grade: "A", label: "Excellent (Top 10%)" };
  if (average >= 14.0) return { grade: "B", label: "Très Bien (Next 25%)" };
  if (average >= 12.0) return { grade: "C", label: "Bien (Next 30%)" };
  if (average >= 11.0) return { grade: "D", label: "Assez Bien (Next 25%)" };
  if (average >= 10.0) return { grade: "E", label: "Passable (Next 10%)" };
  return { grade: "F", label: "Ajourné / Non Validé" };
}

export async function generateLmdStudentRelevePDF(data: LmdReleveParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  buildRelevePage(doc, autoTable, data, pageWidth, pageHeight);

  const cleanNom = (data.student.nom || "Etudiant").replace(/[^a-zA-Z0-9]/g, "_");
  const semCode = (data.deliberation.semester || "Semestre").replace(/[^a-zA-Z0-9]/g, "_");
  const sessPrefix = data.sessionType === "Rattrapage" ? "Rattrapage_" : "";
  doc.save(`Releve_LMD_${sessPrefix}${semCode}_${cleanNom}.pdf`);
}

export async function generateLmdBatchRelevesPDF(cohort: LmdReleveParams[], sessionLabel: string): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  cohort.forEach((item, index) => {
    if (index > 0) doc.addPage();
    buildRelevePage(doc, autoTable, item, pageWidth, pageHeight);
  });

  const cleanSession = sessionLabel.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Releves_LMD_Promotion_${cleanSession}.pdf`);
}

function buildRelevePage(doc: any, autoTable: any, data: LmdReleveParams, pageWidth: number, pageHeight: number) {
  const { student, deliberation, institution, rank, totalCohort, sessionType } = data;
  const isRattrapage = sessionType === "Rattrapage";
  const ects = getEctsGrade(deliberation.semesterAverage);

  // 1. Unified Official Header (Left Logo, Center University/Faculty, Right Niger Armoiries)
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
    documentTitle: isRattrapage
      ? "RELEVÉ DE NOTES ET RÉSULTATS — SESSION DE RATTRAPAGE"
      : "RELEVÉ DE NOTES ET RÉSULTATS OFFICIEL",
    documentSubtitle: isRattrapage
      ? "2ème Session d'Évaluation • Règle Max(N1, N2) • Norme ECTS / REESAO / CAMES"
      : "Système LMD (Licence - Master - Doctorat) • Norme ECTS / REESAO / CAMES",
    bannerColor: isRattrapage ? "indigo" : "emerald",
  });

  // 2. Student & Academic Info Box
  const infoY = headerBottomY;
  const marginX = 10;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, infoY, pageWidth - marginX * 2, 24, 1.5, 1.5, "FD");

  // Left Info Column
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Nom & Prénoms :", marginX + 4, infoY + 6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text((student.nom || "N/A").toUpperCase(), marginX + 32, infoY + 6);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("N° Matricule :", marginX + 4, infoY + 12);
  doc.setFont("courier", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(student.matricule || "N/A", marginX + 32, infoY + 12);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Filière / Parcours :", marginX + 4, infoY + 18);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(institution.programName || "Tronc Commun LMD", marginX + 32, infoY + 18, { maxWidth: 62 });

  // Right Info Column
  const rightColX = pageWidth / 2 + 8;
  const rightValX = rightColX + 34;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Année Universitaire :", rightColX, infoY + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(institution.sessionName || "2025-2026", rightValX, infoY + 6);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Semestre d'Études :", rightColX, infoY + 12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 94, 70);
  doc.text(deliberation.semester || "S1", rightValX, infoY + 12);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Promotion / Classe :", rightColX, infoY + 18);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(institution.className || "Promotion LMD", rightValX, infoY + 18);

  // 3. Table of UEs and ECUs (Clean Academic Grid)
  const tableHead = [
    [
      { content: "Code UE", styles: { halign: "center" as const } },
      { content: "Unités d'Enseignement (UE) & Matières (ECU)", styles: { halign: "left" as const } },
      { content: "Coef", styles: { halign: "center" as const } },
      { content: "Note /20", styles: { halign: "center" as const } },
      { content: "Crédits ECTS", styles: { halign: "center" as const } },
      { content: "Résultat / Statut", styles: { halign: "center" as const } },
    ]
  ];

  const tableBody: any[] = [];

  deliberation.ueResults.forEach((ue) => {
    const isV = ue.status === "V";
    const isVC = ue.status === "VC";
    const ueStatusLabel = isV ? "Validé (V)" : isVC ? "Compensé (VC)" : "Non Validé (NV)";

    // Main UE Header Row
    tableBody.push([
      {
        content: ue.codeUe,
        styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [15, 23, 42], halign: "center" }
      },
      {
        content: `${ue.nameUe} (${ue.typeUe || "Fondamentale"})`,
        styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [15, 23, 42] }
      },
      {
        content: "-",
        styles: { fontStyle: "bold", fillColor: [241, 245, 249], halign: "center" }
      },
      {
        content: ue.average.toFixed(2),
        styles: { 
          fontStyle: "bold", 
          fillColor: [241, 245, 249], 
          textColor: isV ? [16, 94, 70] : isVC ? [79, 70, 229] : [225, 29, 72], 
          halign: "center" 
        }
      },
      {
        content: `${ue.creditsAcquired} / ${ue.creditsEcts}`,
        styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [16, 94, 70], halign: "center" }
      },
      {
        content: ueStatusLabel,
        styles: { 
          fontStyle: "bold", 
          fillColor: [241, 245, 249], 
          textColor: isV ? [16, 94, 70] : isVC ? [79, 70, 229] : [225, 29, 72], 
          halign: "center" 
        }
      }
    ]);

    // Sub-items ECUs
    if (ue.ecuResults && ue.ecuResults.length > 0) {
      ue.ecuResults.forEach((ecu) => {
        const isGraded = ecu.finalGrade !== null && ecu.finalGrade !== undefined && ecu.finalGrade > 0;
        const ecuPass = isGraded && ecu.finalGrade >= 10.0;
        const ecuStatusLabel = isGraded ? (ecuPass ? "Validé" : "Ajourné") : "Non évalué";

        tableBody.push([
          { content: ecu.codeEcu || "", styles: { textColor: [100, 116, 139], halign: "center" } },
          { content: `   • ${ecu.nameEcu}`, styles: { textColor: [51, 65, 85] } },
          { content: String(ecu.coefficient || 1), styles: { halign: "center", textColor: [100, 116, 139] } },
          { 
            content: isGraded ? ecu.finalGrade.toFixed(2) : "-", 
            styles: { 
              halign: "center", 
              fontStyle: isGraded ? "bold" : "normal", 
              textColor: isGraded ? (ecuPass ? [15, 23, 42] : [225, 29, 72]) : [148, 163, 184] 
            } 
          },
          { content: `${ecu.creditsEcts} ECTS`, styles: { halign: "center", textColor: [100, 116, 139] } },
          { 
            content: ecuStatusLabel, 
            styles: { 
              halign: "center", 
              textColor: isGraded ? (ecuPass ? [16, 94, 70] : [225, 29, 72]) : [148, 163, 184],
              fontStyle: isGraded ? "bold" : "normal"
            } 
          }
        ]);
      });
    }
  });

  const tableStartY = infoY + 27;

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY: tableStartY,
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      valign: "middle",
    },
    headStyles: {
      fillColor: [16, 94, 70], // emerald-800
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 80 },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 24, halign: "center" },
      5: { cellWidth: 30, halign: "center" },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 4;

  // 4. Semester Synthesis & Decision Box (2-column Bounded Layout)
  const boxHeight = 24;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, finalY, pageWidth - marginX * 2, boxHeight, 1.5, 1.5, "FD");

  // Column 1 (Left Metrics)
  const col1LabelX = marginX + 4;
  const col1ValX = marginX + 50;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Moyenne du Semestre :", col1LabelX, finalY + 6);
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`${deliberation.semesterAverage.toFixed(2)} / 20`, col1ValX, finalY + 6);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Total Crédits ECTS :", col1LabelX, finalY + 12.5);
  doc.setFontSize(9);
  doc.setTextColor(16, 94, 70);
  doc.text(`${deliberation.creditsAcquired} / 30 ECTS`, col1ValX, finalY + 12.5);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Grade ECTS :", col1LabelX, finalY + 19);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`Grade ${ects.grade} (${ects.label})`, col1ValX, finalY + 19, { maxWidth: 45 });

  // Column 2 (Right Decisions)
  const col2LabelX = pageWidth / 2 + 8;
  const col2ValX = col2LabelX + 38;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Décision du Jury :", col2LabelX, finalY + 6);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  if (deliberation.isSemesterValidated) {
    doc.setTextColor(16, 94, 70); // emerald-700
    doc.text("ADMIS(E) AU SEMESTRE", col2ValX, finalY + 6);
  } else {
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text("AJOURNÉ(E) (RATTRAPAGE)", col2ValX, finalY + 6);
  }

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Mention Attribuée :", col2LabelX, finalY + 12.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(deliberation.mention || "Ajourné", col2ValX, finalY + 12.5);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Rang Promotion :", col2LabelX, finalY + 19);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(`${rank || 1}e / ${totalCohort || 1} étudiants`, col2ValX, finalY + 19);

  // 5. Official Signatures Zone
  const sigY = finalY + boxHeight + 5;
  drawUnifiedLmdSignatureZone(doc, {
    startY: sigY,
    leftTitle: "Le Président du Jury LMD",
    leftSubtitle: "Signature et approbation officielle",
    rightTitle: "Le Doyen / Directeur Général",
    rightSubtitle: "Cachet officiel de l'Établissement",
    centerCode: `LMD-${student.id}-${deliberation.creditsAcquired}C-${(deliberation.semesterAverage * 100).toFixed(0)}`,
    city: institution.city,
    orientation: "portrait",
  });
}
