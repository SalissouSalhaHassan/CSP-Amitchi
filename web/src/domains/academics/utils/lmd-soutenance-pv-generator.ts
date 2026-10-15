/**
 * Official Thesis Defense & Graduation PV Generator (Procès-Verbal de Soutenance de Mémoire / PFE)
 * Standard: CAMES / REESAO / Enseignement Supérieur LMD
 * Generates Official Jury Deliberation PV & Attestation de Soutenance with Security Borders & Signatures
 */

import { getEctsGrade } from "./lmd-releve-generator";
import { drawUnifiedLmdHeader, drawUnifiedLmdSignatureZone } from "./lmd-header-helper";

export interface PvSoutenanceParams {
  project: {
    id: number;
    projectCode?: string;
    title: string;
    summary?: string;
    filiere?: string;
    department?: string;
    niveau?: string; // "Licence 3" | "Master 2" | "Doctorat"
    academicYear?: string;
    creditsEcts?: number;
    grade?: number;
    mention?: string;
    decision?: string;
    defenseDate?: string;
    roomName?: string;
  };
  student: {
    id: number;
    nom: string;
    matricule?: string;
    dateNaissance?: string;
    lieuNaissance?: string;
    nationalite?: string;
  };
  jury: {
    president?: { nom: string; titre?: string };
    supervisor?: { nom: string; titre?: string };
    examiner?: { nom: string; titre?: string };
    rapporteur?: { nom: string; titre?: string };
  };
  evaluationCriteria?: {
    scientificQuality?: number; // /5
    methodology?: number; // /4
    oralPresentation?: number; // /4
    questionsAndAnswers?: number; // /4
    innovation?: number; // /3
    totalScore?: number; // /20
    observations?: string;
  };
  institution?: {
    name?: string;
    countryName?: string;
    ministryName?: string;
    motto?: string;
    facultyName?: string;
    departmentName?: string;
    city?: string;
    logoUrl?: string;
  };
}

/**
 * 1. Generate Official Procès-Verbal de Soutenance (A4 Portrait)
 */
export async function generatePvSoutenancePDF(data: PvSoutenanceParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Unified Official Header
  const headerBottomY = drawUnifiedLmdHeader(doc, {
    orientation: "portrait",
    countryName: data.institution?.countryName,
    ministryName: data.institution?.ministryName,
    motto: data.institution?.motto,
    schoolName: data.institution?.name,
    facultyName: data.institution?.facultyName,
    departmentName: data.institution?.departmentName,
    city: data.institution?.city,
    logoUrl: data.institution?.logoUrl,
    documentTitle: "PROCÈS-VERBAL OFFICIEL DE SOUTENANCE DE MÉMOIRE / PFE",
    documentSubtitle: "Évaluation Terminale & Délibération du Jury • Système LMD • Crédits ECTS",
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

  // 1. IDENTIFICATION DU CANDIDAT & DU TRAVAIL
  renderSectionBar("1. Identification du Candidat & Thème de Recherche");

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, currentY, pageWidth - 20, 22, 1, 1, "FD");

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Nom & Prénoms :", 14, currentY + 5);
  doc.setTextColor(15, 23, 42);
  doc.text((data.student.nom || "").toUpperCase(), 42, currentY + 5);

  doc.setTextColor(71, 85, 105);
  doc.text("N° Matricule :", pageWidth / 2 + 2, currentY + 5);
  doc.setTextColor(16, 94, 70);
  doc.text(data.student.matricule || "N/A", pageWidth / 2 + 26, currentY + 5);

  doc.setTextColor(71, 85, 105);
  doc.text("Filière & Niveau :", 14, currentY + 10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.project.filiere || "Informatique"} (${data.project.niveau || "Master 2 / Licence 3"})`, 42, currentY + 10.5);

  doc.setTextColor(71, 85, 105);
  doc.text("Période Académique :", pageWidth / 2 + 2, currentY + 10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.project.academicYear || "2025-2026", pageWidth / 2 + 35, currentY + 10.5);

  doc.setTextColor(71, 85, 105);
  doc.text("Sujet / Thème :", 14, currentY + 16);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(`"${data.project.title}"`, 38, currentY + 16, { maxWidth: 145 });

  currentY += 25.5;

  // 2. COMPOSITION DU JURY DE SOUTENANCE
  renderSectionBar("2. Composition du Jury de Soutenance");

  const juryRows = [
    ["Président du Jury", data.jury.president?.nom || "Prof. Dr. Ousmane Mahamane", "Professeur Titulaire", "Président"],
    ["Directeur / Encadrant", data.jury.supervisor?.nom || "Dr. Abdoulaye Garba", "Maître de Conférences", "Membre"],
    ["Rapporteur", data.jury.rapporteur?.nom || "Dr. Fatouma Idrissa", "Maître-Assistant", "Membre"],
    ["Examinateur", data.jury.examiner?.nom || "Dr. Salissou Hassan", "Maître-Assistant", "Membre"],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [["Qualité", "Nom & Prénoms du Membre", "Grade Académique", "Fonction au Jury"]],
    body: juryRows,
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
      0: { halign: "left", fontStyle: "bold", cellWidth: 38 },
      1: { halign: "left", cellWidth: 62 },
      2: { cellWidth: 50 },
      3: { fontStyle: "bold", textColor: [16, 94, 70], cellWidth: 35 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // 3. GRILLE D'ÉVALUATION & DÉCISION DU JURY
  renderSectionBar("3. Délibération & Décision Finale du Jury");

  const grade = data.project.grade || 16.5;
  const ectsGrade = getEctsGrade(grade);
  const mention = data.project.mention || (grade >= 16 ? "Très Honorable" : grade >= 14 ? "Honorable" : "Passable");

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(10, currentY, pageWidth - 20, 24, 1.2, 1.2, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("NOTE ATTRIBUÉE PAR LE JURY :", 14, currentY + 6);
  doc.setFontSize(10);
  doc.setTextColor(16, 94, 70);
  doc.text(`${grade.toFixed(2)} / 20`, 68, currentY + 6);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Mention :", 14, currentY + 13);
  doc.setTextColor(16, 94, 70);
  doc.text(mention, 32, currentY + 13);

  doc.setTextColor(71, 85, 105);
  doc.text("Crédits ECTS :", 14, currentY + 19);
  doc.setTextColor(16, 94, 70);
  doc.text(`${data.project.creditsEcts || 30} ECTS VALIDÉS`, 40, currentY + 19);

  // Decision box on the right
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(pageWidth - 78, currentY + 3.5, 64, 17, 1, 1, "FD");

  doc.setFontSize(6.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(6, 95, 70);
  doc.text("DÉCISION UNANIME DU JURY", pageWidth - 46, currentY + 8.5, { align: "center" });

  doc.setFontSize(7.5);
  doc.text(data.project.decision || "ADMIS(E) AVEC FÉLICITATIONS", pageWidth - 46, currentY + 15, { align: "center", maxWidth: 60 });

  currentY += 28;

  // 4. Signatures
  drawUnifiedLmdSignatureZone(doc, {
    startY: currentY,
    leftTitle: "Le Président du Jury de Soutenance",
    leftSubtitle: "Signature et visa de la commission",
    rightTitle: "Le Directeur de Mémoire / Encadrant",
    rightSubtitle: "Signature et appréciation finale",
    centerCode: `SOUT-${data.project.id}-${Date.now().toString().slice(-6)}`,
    city: data.institution?.city,
    orientation: "portrait",
  });

  const cleanNom = (data.student.nom || "Candidat").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`PV_Soutenance_LMD_${cleanNom}.pdf`);
}

/**
 * 2. Generate Official Attestation de Soutenance (A4 Portrait)
 */
export async function generateAttestationSoutenancePDF(data: PvSoutenanceParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  const headerBottomY = drawUnifiedLmdHeader(doc, {
    orientation: "portrait",
    countryName: data.institution?.countryName,
    ministryName: data.institution?.ministryName,
    motto: data.institution?.motto,
    schoolName: data.institution?.name,
    facultyName: data.institution?.facultyName,
    departmentName: data.institution?.departmentName,
    city: data.institution?.city,
    logoUrl: data.institution?.logoUrl,
    documentTitle: "ATTESTATION OFFICIELLE DE SOUTENANCE DE MÉMOIRE",
    documentSubtitle: "Délivrée pour servir et valoir ce que de droit dans le cadre du Système LMD",
    bannerColor: "emerald",
  });

  let currentY = headerBottomY + 4;
  const marginX = 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  const rector = "Le Recteur / Directeur Général de l'Établissement, soussigné, atteste que :";
  doc.text(rector, marginX, currentY);

  currentY += 8;

  // Student Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, currentY, pageWidth - marginX * 2, 22, 1.2, 1.2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(16, 94, 70);
  doc.text((data.student.nom || "L'Étudiant(e)").toUpperCase(), marginX + 6, currentY + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Matricule : ${data.student.matricule || "N/A"}   •   Né(e) le : ${data.student.dateNaissance || "15/10/2002"} à ${data.student.lieuNaissance || "Niamey"}`, marginX + 6, currentY + 15);

  currentY += 28;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(
    `A soutenu publiquement avec succès son mémoire / projet de fin d'études en vue de l'obtention du grade académique de ${data.project.niveau || "Master 2 / Licence 3"} en ${data.project.filiere || "Sciences & Technologies"}.`,
    marginX,
    currentY,
    { maxWidth: pageWidth - marginX * 2, lineHeightFactor: 1.4 }
  );

  currentY += 16;

  // Subject Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(16, 94, 70);
  doc.roundedRect(marginX, currentY, pageWidth - marginX * 2, 20, 1.2, 1.2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(16, 94, 70);
  doc.text("THÈME DE RECHERCHE :", marginX + 6, currentY + 6);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`« ${data.project.title} »`, marginX + 6, currentY + 13, { maxWidth: pageWidth - marginX * 2 - 12 });

  currentY += 26;

  const grade = data.project.grade || 16.5;
  const mention = data.project.mention || "Très Honorable";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(
    `Le Jury d'examen lui a attribué la note de ${grade.toFixed(2)} / 20 avec la Mention ${mention}, conférant la validation de ${data.project.creditsEcts || 30} Crédits ECTS.`,
    marginX,
    currentY,
    { maxWidth: pageWidth - marginX * 2, lineHeightFactor: 1.4 }
  );

  currentY += 16;

  // Signatures
  drawUnifiedLmdSignatureZone(doc, {
    startY: currentY,
    leftTitle: "Le Président du Jury",
    leftSubtitle: "Signature et mention",
    rightTitle: "Le Recteur / Directeur Général",
    rightSubtitle: "Sceau officiel et Signature",
    centerCode: `ATT-SOUT-${data.student.id}-${Date.now().toString().slice(-6)}`,
    city: data.institution?.city,
    orientation: "portrait",
  });

  const cleanNom = (data.student.nom || "Candidat").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Attestation_Soutenance_LMD_${cleanNom}.pdf`);
}
