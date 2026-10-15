/**
 * Official ECTS Credit Recognition & Transfer Certificate Generator
 * (Attestation de Reconnaissance & Transfert de Crédits ECTS • Mobilité Internationale & Passerelles)
 * Standards: REESAO / CAMES / Accord de Bologne / ECTS
 */

import { drawUnifiedLmdHeader, drawUnifiedLmdSignatureZone } from "./lmd-header-helper";

export interface RecognizedCourse {
  codeUe: string;
  nameUe: string;
  creditsEcts: number;
  gradeObtained?: number; // /20
  originCourseName?: string;
}

export interface EquivalenceCertificateParams {
  equivalence: {
    id: number;
    certificateNumber?: string;
    originInstitution: string;
    originCountry: string;
    originProgram: string;
    academicYear: string;
    targetProgramName: string;
    targetLevel: string; // "L2", "L3", "M1", "M2"
    targetSemester: string; // "S3", "S5"
    creditsTransferred: number; // e.g. 60 or 120
    decision: string; // "Validé", "Admis en L2"
    decisionDate?: string;
    commissionPresident?: string;
    commissionComments?: string;
    recognizedCourses: RecognizedCourse[];
  };
  student: {
    id: number;
    nom: string;
    matricule?: string;
    dateNaissance?: string;
    lieuNaissance?: string;
    nationalite?: string;
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

export async function generateAttestationEquivalencePDF(data: EquivalenceCertificateParams): Promise<void> {
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
    documentTitle: "ATTESTATION DE RECONNAISSANCE & TRANSFERT DE CRÉDITS ECTS",
    documentSubtitle: "Commission d'Équivalences • Mobilité Internationale & Passerelles LMD (CAMES / REESAO)",
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

  // 2. CANDIDAT & PARCOURS D'ORIGINE
  renderSectionBar("1. Identification de l'Étudiant & Cursus d'Origine");

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, currentY, pageWidth - 20, 24, 1, 1, "FD");

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Nom & Prénoms :", 14, currentY + 5.5);
  doc.setTextColor(15, 23, 42);
  doc.text((data.student.nom || "").toUpperCase(), 42, currentY + 5.5);

  doc.setTextColor(71, 85, 105);
  doc.text("N° Matricule / INE :", pageWidth / 2 + 2, currentY + 5.5);
  doc.setTextColor(16, 94, 70);
  doc.text(data.student.matricule || "N/A", pageWidth / 2 + 32, currentY + 5.5);

  doc.setTextColor(71, 85, 105);
  doc.text("Établissement d'origine :", 14, currentY + 12);
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.equivalence.originInstitution} (${data.equivalence.originCountry})`, 48, currentY + 12);

  doc.setTextColor(71, 85, 105);
  doc.text("Programme d'origine :", 14, currentY + 18);
  doc.setTextColor(15, 23, 42);
  doc.text(data.equivalence.originProgram || "Licence Informatique", 48, currentY + 18);

  doc.setTextColor(71, 85, 105);
  doc.text("Année académique :", pageWidth / 2 + 2, currentY + 18);
  doc.setTextColor(15, 23, 42);
  doc.text(data.equivalence.academicYear || "2024-2025", pageWidth / 2 + 32, currentY + 18);

  currentY += 27;

  // 3. DÉCISION D'ADMISSION & INTÉGRATION
  renderSectionBar("2. Décision d'Équivalence & Niveau d'Intégration");

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, currentY, pageWidth - 20, 16, 1.2, 1.2, "FD");

  doc.setFontSize(7.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`FORMATION D'ACCUEIL : ${data.equivalence.targetProgramName || "Licence Générale"}`, 14, currentY + 5.5);

  doc.setFontSize(7.5);
  doc.setTextColor(16, 94, 70);
  doc.text(`TOTAL CRÉDITS RECONNUS : ${data.equivalence.creditsTransferred} ECTS VALIDÉS`, pageWidth - 14, currentY + 5.5, { align: "right" });

  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Niveau d'admission directe : ${data.equivalence.targetLevel} (${data.equivalence.targetSemester}) • Avis : ${data.equivalence.decision || "Admis par Équivalence"}`,
    14,
    currentY + 11.5
  );

  currentY += 19;

  // 4. TABLEAU DÉTAILLÉ DES UNITÉS D'ENSEIGNEMENT RECONNUES
  renderSectionBar("3. Détail des Unités d'Enseignement (UE) Capitalisées par Équivalence");

  const courses = data.equivalence.recognizedCourses && data.equivalence.recognizedCourses.length > 0
    ? data.equivalence.recognizedCourses
    : [
        { codeUe: "UE1.1", nameUe: "Algorithmique & Structures de Données", creditsEcts: 6, gradeObtained: 15.5, originCourseName: "Algo & C" },
        { codeUe: "UE1.2", nameUe: "Mathématiques Fondamentales & Algèbre", creditsEcts: 6, gradeObtained: 14.0, originCourseName: "Maths I" },
        { codeUe: "UE1.3", nameUe: "Architecture des Ordinateurs & Systèmes", creditsEcts: 6, gradeObtained: 16.0, originCourseName: "Systèmes d'Exploitation" },
        { codeUe: "UE2.1", nameUe: "Bases de Données Relationnelles & SQL", creditsEcts: 6, gradeObtained: 15.0, originCourseName: "SGBD / SQL" },
        { codeUe: "UE2.2", nameUe: "Développement Web & Technologies Internet", creditsEcts: 6, gradeObtained: 17.0, originCourseName: "Web dev" },
      ];

  const tableRows = courses.map((c, idx) => [
    (idx + 1).toString(),
    c.codeUe,
    c.nameUe,
    c.originCourseName || "Équivalent validé",
    `${c.creditsEcts} ECTS`,
    c.gradeObtained ? `${c.gradeObtained.toFixed(1)} / 20` : "Validé",
    "CAPITALISÉ (V)",
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["N°", "Code UE", "Intitulé de l'UE d'Accueil", "Matière d'Origine Validée", "Crédits", "Note", "Statut"]],
    body: tableRows,
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
      2: { halign: "left", cellWidth: 60 },
      3: { halign: "left", cellWidth: 42 },
      4: { fontStyle: "bold", textColor: [16, 94, 70], cellWidth: 20 },
      5: { cellWidth: 18 },
      6: { fontStyle: "bold", textColor: [16, 94, 70], cellWidth: 24 },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;

  // 5. Official Signatures
  drawUnifiedLmdSignatureZone(doc, {
    startY: finalY,
    leftTitle: "Le Président de la Commission d'Équivalences",
    leftSubtitle: "Signature et visa de la commission",
    rightTitle: "Le Directeur des Études & de la Scolarité",
    rightSubtitle: "Approbation et inscription officielle",
    centerCode: `EQUIV-${data.equivalence.id}-${data.equivalence.creditsTransferred}ECTS`,
    city: data.institution?.city,
    orientation: "portrait",
  });

  const cleanNom = (data.student.nom || "Etudiant").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Attestation_Equivalence_ECTS_${cleanNom}.pdf`);
}
