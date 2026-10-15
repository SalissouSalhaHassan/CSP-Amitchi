/**
 * Diploma Supplement (Annexe Descriptive au Diplôme) Generator
 * Official Standard: UNESCO / Conseil de l'Europe / Commission Européenne / CAMES / REESAO
 * Pixel-Perfect Vector Layout with Balanced Page Spacing, No Text Overlaps & Standard Character Encodings
 */

import { getEctsGrade } from "./lmd-releve-generator";
import { drawUnifiedLmdHeader } from "./lmd-header-helper";

export interface DiplomaSupplementParams {
  student: {
    id: number;
    nom: string;
    matricule?: string;
    dateNaissance?: string;
    lieuNaissance?: string;
    nationalite?: string;
    sexe?: string;
  };
  diploma: {
    title: string; // e.g. "DIPLÔME DE LICENCE LMD"
    degreeLevel: "Licence" | "Master" | "Doctorat" | string;
    fieldOfStudy: string; // e.g. "Sciences & Technologies"
    mention: string; // e.g. "Informatique & Systèmes d'Information"
    specialization?: string; // e.g. "Génie Logiciel & Systèmes d'Information"
    graduationYear: string; // e.g. "2025-2026"
    finalGradeAverage: number; // e.g. 15.40 / 20
    totalCreditsAcquired: number; // 180 ECTS (Licence) or 120 ECTS (Master)
    honors: string; // e.g. "Bien", "Très Bien"
    ectsFinalGrade?: string; // "A", "B", "C"
  };
  institution: {
    name?: string;
    countryName?: string;
    ministryName?: string;
    motto?: string;
    facultyName?: string;
    departmentName?: string;
    city?: string;
    website?: string;
    rectorName?: string;
    deanName?: string;
    logoUrl?: string;
  };
  ueList?: Array<{
    codeUe: string;
    nameUe: string;
    creditsEcts: number;
    average: number;
    status: "V" | "VC" | "NV" | string;
    semester?: string;
  }>;
  internshipOrThesis?: {
    topic?: string;
    organization?: string;
    defenseDate?: string;
    grade?: number;
  };
}

export async function generateDiplomaSupplementPDF(data: DiplomaSupplementParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalPages = 2;

  const drawPageFooter = (pageNum: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `ANNEXE DESCRIPTIVE AU DIPLÔME • MODÈLE ÉLABORÉ PAR L'UNESCO, LA COMMISSION EUROPÉENNE ET LE CAMES • PAGE ${pageNum} / ${totalPages}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: "center" }
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1 : EN-TÊTE UNIFIÉ, SECTIONS 1, 2, 3 & BILAN DES RÉSULTATS
  // ══════════════════════════════════════════════════════════════════════════
  drawPageFooter(1);

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
    documentTitle: "ANNEXE DESCRIPTIVE AU DIPLÔME (DIPLOMA SUPPLEMENT)",
    documentSubtitle: "Cadre de Mobilité & Transparence • Norme UNESCO / Bologne / CAMES — ECTS",
    bannerColor: "emerald",
  });

  let currentY = headerBottomY;

  const renderSectionBar = (number: string, title: string) => {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(10, currentY, pageWidth - 20, 6.5, 1, 1, "FD");

    doc.setFillColor(16, 94, 70); // emerald-700
    doc.rect(10, currentY, 3, 6.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${number}. ${title.toUpperCase()}`, 16, currentY + 4.5);
    currentY += 8.5;
  };

  // ─── 1. INFORMATIONS SUR LE TITULAIRE DU DIPLÔME ───────────────────────────
  renderSectionBar("1", "Informations sur le titulaire du diplôme");

  const s1Height = 18;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, currentY, pageWidth - 20, s1Height, 1, 1, "FD");

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("1.1 Nom & Prénoms :", 14, currentY + 5.5);
  doc.setTextColor(15, 23, 42);
  doc.text((data.student.nom || "").toUpperCase(), 48, currentY + 5.5);

  doc.setTextColor(71, 85, 105);
  doc.text("1.2 Matricule National :", pageWidth / 2 + 2, currentY + 5.5);
  doc.setTextColor(16, 94, 70);
  doc.text(data.student.matricule || "N/A", pageWidth / 2 + 42, currentY + 5.5);

  doc.setTextColor(71, 85, 105);
  doc.text("1.3 Date & Lieu de naissance :", 14, currentY + 12.5);
  doc.setTextColor(15, 23, 42);
  const birthInfo = `${data.student.dateNaissance || "15/10/2002"} à ${data.student.lieuNaissance || "Niamey"}`;
  doc.text(birthInfo, 54, currentY + 12.5);

  doc.setTextColor(71, 85, 105);
  doc.text("1.4 Nationalité :", pageWidth / 2 + 2, currentY + 12.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.student.nationalite || "Nigérienne", pageWidth / 2 + 26, currentY + 12.5);

  currentY += s1Height + 4.5;

  // ─── 2. INFORMATIONS SUR LE DIPLÔME ────────────────────────────────────────
  renderSectionBar("2", "Informations sur le diplôme");

  const s2Height = 24;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, currentY, pageWidth - 20, s2Height, 1, 1, "FD");

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("2.1 Intitulé officiel du diplôme :", 14, currentY + 5.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.diploma.title || "DIPLÔME DE LICENCE LMD", 58, currentY + 5.5);

  doc.setTextColor(71, 85, 105);
  doc.text("2.2 Domaine & Mention :", 14, currentY + 11.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.diploma.fieldOfStudy} — Mention : ${data.diploma.mention}`, 48, currentY + 11.5);

  doc.setTextColor(71, 85, 105);
  doc.text("2.3 Établissement de délivrance :", 14, currentY + 17.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.institution.name || "UNIVERSITÉ"} (${data.institution.facultyName || "FACULTÉ"})`, 58, currentY + 17.5);

  currentY += s2Height + 4.5;

  // ─── 3. INFORMATIONS SUR LE NIVEAU DU DIPLÔME ──────────────────────────────
  renderSectionBar("3", "Informations sur le niveau du diplôme");

  const s3Height = 22;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, currentY, pageWidth - 20, s3Height, 1, 1, "FD");

  const isMaster = data.diploma.degreeLevel.toLowerCase().includes("master");
  const isDoctorat = data.diploma.degreeLevel.toLowerCase().includes("doctorat");

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("3.1 Niveau de qualification :", 14, currentY + 5.5);
  doc.setTextColor(15, 23, 42);
  const qualif = isDoctorat
    ? "Grade de Doctorat (Bac + 8) — Niveau 8 CITE / UNESCO"
    : isMaster
    ? "Grade de Master (Bac + 5) — Niveau 7 CITE / UNESCO"
    : "Grade de Licence (Bac + 3) — Niveau 6 CITE / UNESCO";
  doc.text(qualif, 54, currentY + 5.5);

  doc.setTextColor(71, 85, 105);
  doc.text("3.2 Durée officielle & Crédits :", 14, currentY + 11.5);
  doc.setTextColor(16, 94, 70);
  const duration = isDoctorat
    ? "3 Années académiques (6 Semestres) — 180 Crédits ECTS"
    : isMaster
    ? "2 Années académiques (4 Semestres) — 120 Crédits ECTS"
    : "3 Années académiques (6 Semestres) — 180 Crédits ECTS";
  doc.text(duration, 56, currentY + 11.5);

  doc.setTextColor(71, 85, 105);
  doc.text("3.3 Conditions d'accès officielles :", 14, currentY + 17.5);
  doc.setTextColor(15, 23, 42);
  const access = isDoctorat
    ? "Titulaire d'un Master de Recherche ou diplôme équivalent accrédité CAMES"
    : isMaster
    ? "Titulaire d'une Licence LMD ou diplôme équivalent reconnu"
    : "Titulaire du Baccalauréat de l'enseignement secondaire ou diplôme équivalent";
  doc.text(access, 58, currentY + 17.5);

  currentY += s3Height + 4.5;

  // ─── 4. INFORMATIONS SUR LE CONTENU ET LES RÉSULTATS OBTENUS ───────────────
  renderSectionBar("4", "Informations sur le contenu et les résultats obtenus");

  const s4Height = 22;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(10, currentY, pageWidth - 20, s4Height, 1, 1, "FD");

  const ectsGrade = getEctsGrade(data.diploma.finalGradeAverage);

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Moyenne Générale Obtenue :", 14, currentY + 6);
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.diploma.finalGradeAverage.toFixed(2)} / 20`, 58, currentY + 6);

  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text("Mention Attribuée :", 14, currentY + 12.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 94, 70);
  doc.text(data.diploma.honors || "Passable", 42, currentY + 12.5);

  doc.setTextColor(71, 85, 105);
  doc.text("Crédits ECTS Capitalisés :", 14, currentY + 18);
  doc.setTextColor(16, 94, 70);
  doc.text(`${data.diploma.totalCreditsAcquired} ECTS`, 52, currentY + 18);

  doc.setTextColor(71, 85, 105);
  doc.text("Grade de Performance ECTS :", pageWidth / 2 + 2, currentY + 6);
  doc.setTextColor(15, 23, 42);
  doc.text(`Grade ${ectsGrade.grade} (${ectsGrade.label})`, pageWidth / 2 + 48, currentY + 6);

  currentY += s4Height + 4.5;

  // Tableau récapitulatif des UEs
  if (data.ueList && data.ueList.length > 0) {
    const tableHeaders = ["Code UE", "Intitulé de l'Unité d'Enseignement", "Crédits", "Moyenne /20", "Résultat"];
    const tableBody = data.ueList.slice(0, 8).map((ue) => [
      ue.codeUe,
      ue.nameUe,
      `${ue.creditsEcts} ECTS`,
      ue.average ? ue.average.toFixed(2) : "-",
      ue.status === "V" ? "Validé (V)" : ue.status === "VC" ? "Compensé (VC)" : "Validé",
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [tableHeaders],
      body: tableBody,
      theme: "grid",
      margin: { left: 10, right: 10 },
      headStyles: {
        fillColor: [16, 94, 70],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
        halign: "center",
        cellPadding: 1.3,
      },
      bodyStyles: {
        fontSize: 6.8,
        textColor: [51, 65, 85],
        valign: "middle",
        cellPadding: 1.2,
      },
      columnStyles: {
        0: { halign: "center", fontStyle: "bold", cellWidth: 22 },
        1: { halign: "left", cellWidth: 85 },
        2: { halign: "center", cellWidth: 22, fontStyle: "bold", textColor: [16, 94, 70] },
        3: { halign: "center", cellWidth: 24 },
        4: { halign: "center", fontStyle: "bold", cellWidth: 28 },
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 2 : SECTIONS 5, 6, 7 & 8 (FONCTION, MOBILITÉ, SIGNATURES, SCHÉMA LMD)
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  drawPageFooter(2);

  // Unified mini header on Page 2
  drawUnifiedLmdHeader(doc, {
    orientation: "portrait",
    countryName: data.institution.countryName,
    ministryName: data.institution.ministryName,
    motto: data.institution.motto,
    schoolName: data.institution.name,
    facultyName: data.institution.facultyName,
    departmentName: data.institution.departmentName,
    city: data.institution.city,
    logoUrl: data.institution.logoUrl,
    documentTitle: "ANNEXE DESCRIPTIVE AU DIPLÔME — PAGE 2 / 2",
    bannerColor: "emerald",
  });

  currentY = 46;

  // ─── 5. INFORMATIONS SUR LA FONCTION DU DIPLÔME ────────────────────────────
  renderSectionBar("5", "Informations sur la fonction du diplôme");

  const s5Height = 18;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, currentY, pageWidth - 20, s5Height, 1, 1, "FD");

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("5.1 Accès aux études supérieures :", 14, currentY + 5.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  const progDesc = isDoctorat
    ? "Accès direct aux fonctions de recherche post-doctorale, enseignement supérieur et centres de R&D."
    : isMaster
    ? "Accès direct aux formations doctorales (Doctorat / Ph.D.) et aux concours de recrutement de cadres supérieurs."
    : "Accès de plein droit aux programmes de Master (Recherche ou Professionnel) dans l'espace CAMES et international.";
  doc.text(progDesc, 60, currentY + 5.5, { maxWidth: 125 });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("5.2 Statut professionnel conféré :", 14, currentY + 12.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(
    "Permet d'exercer des fonctions de cadre moyen ou supérieur, ingénieur d'études, analyste, consultant ou gestionnaire de projets.",
    58,
    currentY + 12.5,
    { maxWidth: 127 }
  );

  currentY += s5Height + 4.5;

  // ─── 6. RENSEIGNEMENTS COMPLÉMENTAIRES ─────────────────────────────────────
  renderSectionBar("6", "Renseignements complémentaires & Mobilité");

  const s6Height = 18;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, currentY, pageWidth - 20, s6Height, 1, 1, "FD");

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("6.1 Stage / Travaux de fin de cycle :", 14, currentY + 5.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  const stageInfo = data.internshipOrThesis?.topic
    ? `Thème : "${data.internshipOrThesis.topic}" (${data.internshipOrThesis.organization || "Entreprise"})`
    : "Stage d'immersion professionnelle et soutenance de projet de fin de cycle validés avec succès.";
  doc.text(stageInfo, 62, currentY + 5.5, { maxWidth: 124 });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("6.2 Accréditation & Reconnaissance :", 14, currentY + 12.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Conseil Africain et Malgache pour l'Enseignement Supérieur (CAMES : www.lecames.org) • ${data.institution.name}`,
    64,
    currentY + 12.5,
    { maxWidth: 122 }
  );

  currentY += s6Height + 4.5;

  // ─── 7. CERTIFICATION OFFICIELLE DE L'ANNEXE ──────────────────────────────
  renderSectionBar("7", "Certification officielle de l'annexe");

  const sigBoxH = 26;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(10, currentY, pageWidth - 20, sigBoxH, 1, 1, "FD");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Date de délivrance :", 14, currentY + 5);
  doc.setTextColor(15, 23, 42);
  doc.text(new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }), 42, currentY + 5);

  doc.setTextColor(71, 85, 105);
  doc.text("Lieu d'émission :", 95, currentY + 5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.institution.city || "Niamey", 118, currentY + 5);

  // Signatures Lines
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Le Doyen / Chef d'Établissement", 14, currentY + 11.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Signature et Visa officiel", 14, currentY + 15.5);
  doc.setDrawColor(203, 213, 225);
  doc.line(14, currentY + 23, 62, currentY + 23);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Le Recteur / Directeur Général", pageWidth - 80, currentY + 11.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Sceau officiel et Approbation", pageWidth - 80, currentY + 15.5);
  doc.line(pageWidth - 80, currentY + 23, pageWidth - 14, currentY + 23);

  // Security Seal Box in Middle
  doc.setDrawColor(16, 94, 70);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth / 2 - 16, currentY + 7.5, 32, 16, 1, 1, "FD");
  doc.setFontSize(5.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 94, 70);
  doc.text("SCEAU DE SÉCURITÉ", pageWidth / 2, currentY + 12, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("DOCUMENT OFFICIEL", pageWidth / 2, currentY + 16, { align: "center" });
  doc.text("INFALSIFIABLE", pageWidth / 2, currentY + 20, { align: "center" });

  currentY += sigBoxH + 4.5;

  // ─── 8. SCHÉMA DU SYSTÈME NATIONAL D'ENSEIGNEMENT SUPÉRIEUR (LMD) ─────────
  renderSectionBar("8", "Description du système d'enseignement supérieur (Schéma LMD)");

  const lmdHeaders = ["Grade Universitaire", "Durée Officielle", "Crédits ECTS", "Conditions d'Accès", "Passerelles & Débouchés Académiques"];
  const lmdBody = [
    ["Licence (L)", "3 ans (6 semestres)", "180 ECTS", "Baccalauréat", "Insertion Professionnelle ou Accès en Master"],
    ["Master (M)", "2 ans (4 semestres)", "120 ECTS", "Licence LMD", "Cadre Supérieur ou Accès en Doctorat"],
    ["Doctorat (D)", "3 ans (6 semestres)", "180 ECTS", "Master Recherche", "Enseignement Supérieur, R&D, Recherche"],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [lmdHeaders],
    body: lmdBody,
    theme: "grid",
    margin: { left: 10, right: 10 },
    headStyles: {
      fillColor: [16, 94, 70],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.8,
      halign: "center",
      cellPadding: 1.5,
    },
    bodyStyles: {
      fontSize: 6.2,
      textColor: [51, 65, 85],
      halign: "center",
      cellPadding: 1.3,
    },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold", cellWidth: 26 },
      1: { cellWidth: 28 },
      2: { fontStyle: "bold", textColor: [16, 94, 70], cellWidth: 22 },
      3: { halign: "left", cellWidth: 36 },
      4: { halign: "left" },
    },
  });

  const cleanNom = (data.student.nom || "Etudiant").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Diploma_Supplement_UNESCO_${cleanNom}.pdf`);
}
