/**
 * Official Ministerial & CAMES LMD Deliberation PV Generator
 * Standards: REESAO / CAMES / ECTS / Bologne / Ministère de l'Enseignement Supérieur Niger
 * Formats: A3 Grand Format & A4 Paysage
 */

import { drawUnifiedLmdHeader, drawUnifiedLmdSignatureZone } from "./lmd-header-helper";

export interface MinisterialPVParams {
  paperFormat?: "a3" | "a4";
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
    city?: string;
    logoUrl?: string;
  };
  semester: string;
  sessionType: "Normale" | "Rattrapage";
  ues: Array<{
    id: number;
    codeUe: string;
    nameUe: string;
    creditsEcts: number;
    typeUe?: string;
  }>;
  cohort: Array<{
    rank: number;
    student: {
      id: number;
      nom: string;
      matricule?: string;
      sexe?: string;
      dateNaissance?: string;
      lieuNaissance?: string;
    };
    deliberation: {
      semesterAverage: number;
      creditsAcquired: number;
      totalCredits: number;
      decision: string;
      mention: string;
      isSemesterValidated: boolean;
      ueResults: Array<{
        codeUe: string;
        ueId: number;
        average: number;
        creditsAcquired: number;
        status: "V" | "VC" | "NV";
      }>;
    };
  }>;
  juryMembers?: Array<{
    role: string;
    name: string;
    title: string;
    department?: string;
  }>;
}

export async function generateLmdMinisterialPVPDF(data: MinisterialPVParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const isA3 = data.paperFormat === "a3";
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: isA3 ? "a3" : "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const isRat = data.sessionType === "Rattrapage";

  // 1. Unified Official Header (Landscape / A3)
  const headerBottomY = drawUnifiedLmdHeader(doc, {
    orientation: isA3 ? "landscape-a3" : "landscape",
    countryName: data.institution.countryName,
    ministryName: data.institution.ministryName,
    motto: data.institution.motto,
    schoolName: data.institution.name,
    facultyName: data.institution.facultyName,
    departmentName: data.institution.departmentName,
    city: data.institution.city,
    logoUrl: data.institution.logoUrl,
    documentTitle: "PROCÈS-VERBAL OFFICIEL DE DÉLIBÉRATION DU JURY D'EXAMEN — SYSTÈME LMD",
    documentSubtitle: `Norme REESAO / CAMES • ${data.semester.toUpperCase()} • ${isRat ? "SESSION DE RATTRAPAGE (SESSION 2)" : "SESSION NORMALE (SESSION 1)"} • ANNÉE ACADÉMIQUE ${data.institution.sessionName || "2025-2026"}`,
    bannerColor: "emerald",
  });

  // 2. Promotion Info Box
  const marginX = isA3 ? 16 : 12;
  const infoY = headerBottomY;
  const infoH = isA3 ? 11 : 9.5;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, infoY, pageWidth - marginX * 2, infoH, 1, 1, "FD");

  doc.setFontSize(isA3 ? 7.5 : 6.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Filière / Domaine :", marginX + 4, infoY + (isA3 ? 4.5 : 3.8));
  doc.setTextColor(15, 23, 42);
  doc.text(data.institution.programName || "Tronc Commun LMD", marginX + 32, infoY + (isA3 ? 4.5 : 3.8));

  doc.setTextColor(71, 85, 105);
  doc.text("Cycle & Promotion :", marginX + 4, infoY + (isA3 ? 9 : 7.5));
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.institution.degreeLevel || "Licence"} — ${data.institution.className || "Classe"}`, marginX + 32, infoY + (isA3 ? 9 : 7.5));

  doc.setTextColor(71, 85, 105);
  doc.text("Période Évaluée :", pageWidth / 2 + 10, infoY + (isA3 ? 4.5 : 3.8));
  doc.setTextColor(16, 94, 70);
  doc.text(`${data.semester} (30 Crédits ECTS)`, pageWidth / 2 + 40, infoY + (isA3 ? 4.5 : 3.8));

  doc.setTextColor(71, 85, 105);
  doc.text("Date de Délibération :", pageWidth / 2 + 10, infoY + (isA3 ? 9 : 7.5));
  doc.setTextColor(15, 23, 42);
  const todayStr = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  doc.text(todayStr, pageWidth / 2 + 40, infoY + (isA3 ? 9 : 7.5));

  // 3. Dynamic Matrix Table
  const staticHeaders = ["Rang", "Matricule", "Nom & Prénoms"];
  const dynamicUeHeaders = data.ues.map((ue) => `${ue.codeUe}\n(${ue.creditsEcts} ECTS)`);
  const trailingHeaders = ["Moy /20", "Crédits\n/30 ECTS", "Décision du Jury", "Mention"];
  const fullHeaders = [...staticHeaders, ...dynamicUeHeaders, ...trailingHeaders];

  const tableBody = data.cohort.map((c) => {
    const row: any[] = [
      `${c.rank}e`,
      c.student.matricule || "N/A",
      c.student.nom,
    ];

    data.ues.forEach((ue) => {
      const res = c.deliberation.ueResults.find((u) => u.codeUe === ue.codeUe || u.ueId === ue.id);
      if (res) {
        row.push(`${res.average.toFixed(2)}\n[${res.status}]`);
      } else {
        row.push("-\n[NV]");
      }
    });

    row.push(c.deliberation.semesterAverage.toFixed(2));
    row.push(`${c.deliberation.creditsAcquired} / 30`);
    row.push(c.deliberation.decision);
    row.push(c.deliberation.mention);

    return row;
  });

  const tableStartY = infoY + infoH + 3.5;

  autoTable(doc, {
    startY: tableStartY,
    head: [fullHeaders],
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [16, 94, 70], // emerald-800
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: isA3 ? 7 : 5.8,
      halign: "center",
      valign: "middle",
      cellPadding: isA3 ? 2 : 1.2,
    },
    bodyStyles: {
      fontSize: isA3 ? 7 : 5.8,
      textColor: [51, 65, 85],
      valign: "middle",
      cellPadding: isA3 ? 1.8 : 1,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: "center", fontStyle: "bold", cellWidth: isA3 ? 14 : 10 },
      1: { halign: "center", fontStyle: "bold", cellWidth: isA3 ? 24 : 18 },
      2: { halign: "left", fontStyle: "bold", cellWidth: isA3 ? 55 : 42 },
      [fullHeaders.length - 4]: { halign: "center", fontStyle: "bold", cellWidth: isA3 ? 18 : 14 },
      [fullHeaders.length - 3]: { halign: "center", fontStyle: "bold", cellWidth: isA3 ? 22 : 16 },
      [fullHeaders.length - 2]: { halign: "center", fontStyle: "bold", cellWidth: isA3 ? 35 : 26 },
      [fullHeaders.length - 1]: { halign: "center", cellWidth: isA3 ? 20 : 15 },
    },
    didParseCell: (hookData: any) => {
      if (hookData.section === "body") {
        const text = String(hookData.cell.raw || "");
        if (text.includes("[V]") || text.includes("Admis")) {
          hookData.cell.styles.textColor = [16, 94, 70]; // emerald-700
        } else if (text.includes("[VC]") || text.includes("Compensation") || text.includes("Dettes")) {
          hookData.cell.styles.textColor = [180, 83, 9]; // amber-700
        } else if (text.includes("[NV]") || text.includes("Ajourné")) {
          hookData.cell.styles.textColor = [225, 29, 72]; // rose-600
        }
      }
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 4;

  // Summary KPIs Bar
  const totalCount = data.cohort.length;
  const passedCount = data.cohort.filter((c) => c.deliberation.isSemesterValidated).length;
  const ajournesCount = totalCount - passedCount;
  const successRate = totalCount > 0 ? ((passedCount / totalCount) * 100).toFixed(1) : "0.0";

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, finalY, pageWidth - marginX * 2, isA3 ? 10 : 8, 1, 1, "FD");

  doc.setFontSize(isA3 ? 7 : 5.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("BILAN STATISTIQUE :", marginX + 4, finalY + (isA3 ? 6 : 5));

  doc.setFont("helvetica", "normal");
  doc.text(`• Total : ${totalCount}`, marginX + 40, finalY + (isA3 ? 6 : 5));
  doc.setTextColor(16, 94, 70);
  doc.setFont("helvetica", "bold");
  doc.text(`• Admis : ${passedCount}`, marginX + 75, finalY + (isA3 ? 6 : 5));
  doc.setTextColor(225, 29, 72);
  doc.text(`• Ajournés : ${ajournesCount}`, marginX + 110, finalY + (isA3 ? 6 : 5));
  doc.setTextColor(79, 70, 229);
  doc.text(`• Taux : ${successRate}%`, marginX + 145, finalY + (isA3 ? 6 : 5));

  // Jury Signatures Block
  const sigY = finalY + (isA3 ? 14 : 11);
  drawUnifiedLmdSignatureZone(doc, {
    startY: sigY,
    leftTitle: "Le Président du Jury LMD",
    leftSubtitle: "Signature et émargement officiel",
    rightTitle: "Le Doyen / Chef d'Établissement",
    rightSubtitle: "Visa officiel et Sceau de l'Université",
    centerCode: `PV-MINIST-${data.semester}-${Date.now().toString().slice(-6)}`,
    city: data.institution.city,
    orientation: isA3 ? "landscape-a3" : "landscape",
  });

  const cleanClass = (data.institution.className || "Promotion").replace(/[^a-zA-Z0-9]/g, "_");
  const cleanSem = data.semester.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`PV_Ministeriel_CAMES_${isA3 ? "A3_" : "A4_"}${cleanSem}_${cleanClass}.pdf`);
}
