/**
 * Official University Degree Generator – Diplôme de Licence / Master / Doctorat
 * Layout conforme au modèle officiel REESAO / Ministère de l'Enseignement Supérieur Niger
 * 
 * Includes:
 * 1. Clear visible separation between Green Banner and VU clauses (y=62)
 * 2. Official Coat of Arms of Niger (Armoiries de la République du Niger) in the top-right box
 * 3. School Logo integration with proper scaling in top-left
 * 4. Bold VU legal clauses with balanced line height
 * 5. Laureate declaration box with selective inline bold
 * 6. Lowered signature blocks with ample space for physical stamping & signatures
 * 7. Security QR code with verification URL
 */

import QRCode from "qrcode";
import { getEctsGrade } from "./lmd-releve-generator";

export interface LmdDiplomaParams {
  student: {
    id: number;
    nom: string;
    prenom?: string;
    matricule?: string;
    dateNaissance?: string;
    lieuNaissance?: string;
    nationalite?: string;
    sexe?: string;
  };
  degree: {
    title: string;
    specialization: string;
    fieldOfStudy: string;
    mention: string;
    finalGradeAverage: number;
    totalCreditsAcquired: number;
    sessionName: string;
    deliberationDate?: string;
    diplomaNumber?: string;
    vuClauses?: string[];
  };
  institution: {
    name?: string;
    countryName?: string;
    ministryName?: string;
    ministryLabel?: string;
    facultyName?: string;
    rectorName?: string;
    deanName?: string;
    directorGeneralName?: string;
    city?: string;
    logo?: string;
    ministryLogo?: string;
    vuClauses?: string[];
  };
}

/* ─── Draw Official Coat of Arms of Niger (Armoiries du Niger) ─────────── */
export function drawNigerCoatOfArms(doc: any, cx: number, cy: number, scale = 1.0) {
  // 1. Crossed Flagpoles (Gold lines)
  doc.setDrawColor(200, 160, 20);
  doc.setLineWidth(0.6 * scale);
  doc.line(cx - 10 * scale, cy + 8 * scale, cx + 8 * scale, cy - 7 * scale);
  doc.line(cx + 10 * scale, cy + 8 * scale, cx - 8 * scale, cy - 7 * scale);

  // 2. Niger Flags on Left (Orange, White, Green)
  // Left Flag 1
  doc.setFillColor(224, 82, 4); // Niger Orange
  doc.triangle(cx - 5 * scale, cy - 5 * scale, cx - 11 * scale, cy - 7 * scale, cx - 8 * scale, cy - 1 * scale, "F");
  doc.setFillColor(255, 255, 255); // White
  doc.triangle(cx - 5 * scale, cy - 3 * scale, cx - 9 * scale, cy - 4 * scale, cx - 7 * scale, cy + 1 * scale, "F");
  doc.setFillColor(27, 122, 43); // Niger Green
  doc.triangle(cx - 4 * scale, cy - 1 * scale, cx - 7 * scale, cy - 1 * scale, cx - 6 * scale, cy + 4 * scale, "F");

  // Left Flag 2 (Lower Drape)
  doc.setFillColor(224, 82, 4);
  doc.triangle(cx - 4 * scale, cy + 1 * scale, cx - 9 * scale, cy + 2 * scale, cx - 6 * scale, cy + 6 * scale, "F");

  // 3. Niger Flags on Right (Orange, White, Green)
  // Right Flag 1
  doc.setFillColor(224, 82, 4);
  doc.triangle(cx + 5 * scale, cy - 5 * scale, cx + 11 * scale, cy - 7 * scale, cx + 8 * scale, cy - 1 * scale, "F");
  doc.setFillColor(255, 255, 255);
  doc.triangle(cx + 5 * scale, cy - 3 * scale, cx + 9 * scale, cy - 4 * scale, cx + 7 * scale, cy + 1 * scale, "F");
  doc.setFillColor(27, 122, 43);
  doc.triangle(cx + 4 * scale, cy - 1 * scale, cx + 7 * scale, cy - 1 * scale, cx + 6 * scale, cy + 4 * scale, "F");

  // Right Flag 2 (Lower Drape)
  doc.setFillColor(224, 82, 4);
  doc.triangle(cx + 4 * scale, cy + 1 * scale, cx + 9 * scale, cy + 2 * scale, cx + 6 * scale, cy + 6 * scale, "F");

  // 4. Central Shield (Green with Gold Border)
  doc.setFillColor(27, 122, 43);
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.6 * scale);
  
  // Custom shield shape
  const sW = 6.5 * scale;
  const sTop = cy - 6 * scale;
  const sBot = cy + 4.5 * scale;
  doc.roundedRect(cx - sW, sTop, sW * 2, 7.5 * scale, 1 * scale, 1 * scale, "FD");
  doc.triangle(cx - sW, sTop + 6 * scale, cx + sW, sTop + 6 * scale, cx, sBot, "FD");

  // 5. Golden Sun in Center of Shield
  doc.setFillColor(245, 195, 20);
  doc.circle(cx, cy - 2 * scale, 1.8 * scale, "F");
  // Sun rays
  doc.setDrawColor(245, 195, 20);
  doc.setLineWidth(0.35 * scale);
  for (let a = 0; a < 8; a++) {
    const rad = (a * Math.PI) / 4;
    doc.line(
      cx + Math.cos(rad) * 2.0 * scale,
      cy - 2 * scale + Math.sin(rad) * 2.0 * scale,
      cx + Math.cos(rad) * 2.9 * scale,
      cy - 2 * scale + Math.sin(rad) * 2.9 * scale
    );
  }

  // 6. Zebu Horns / Head (Gold below the sun)
  doc.setDrawColor(245, 195, 20);
  doc.setLineWidth(0.5 * scale);
  doc.line(cx - 2.5 * scale, cy + 0.5 * scale, cx, cy + 2.5 * scale);
  doc.line(cx + 2.5 * scale, cy + 0.5 * scale, cx, cy + 2.5 * scale);
  doc.circle(cx, cy + 2.5 * scale, 0.6 * scale, "F");

  // 7. Golden Scroll / Ribbon at Bottom
  doc.setFillColor(220, 180, 50);
  doc.setDrawColor(180, 140, 20);
  doc.setLineWidth(0.3 * scale);
  doc.roundedRect(cx - 10 * scale, cy + 6.5 * scale, 20 * scale, 2.6 * scale, 0.6 * scale, 0.6 * scale, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(3.2 * scale);
  doc.setTextColor(80, 45, 0);
  doc.text("RÉPUBLIQUE DU NIGER", cx, cy + 8.4 * scale, { align: "center" });
}

/* ─── Ornamental border ─────────────────────────────────────────────────── */
function drawOrnamentalBorder(doc: any, pw: number, ph: number) {
  doc.setDrawColor(0, 110, 0);
  doc.setLineWidth(3.2);
  doc.rect(5, 5, pw - 10, ph - 10, "S");

  doc.setLineWidth(0.7);
  doc.rect(9.5, 9.5, pw - 19, ph - 19, "S");

  doc.setFillColor(0, 110, 0);
  const step = 3.5;
  for (let x = 11; x <= pw - 11; x += step) {
    doc.circle(x, 7.2, 0.55, "F");
    doc.circle(x, ph - 7.2, 0.55, "F");
  }
  for (let y = 11; y <= ph - 11; y += step) {
    doc.circle(7.2, y, 0.55, "F");
    doc.circle(pw - 7.2, y, 0.55, "F");
  }

  const corners = [
    [13, 13], [pw - 13, 13], [13, ph - 13], [pw - 13, ph - 13],
  ];
  for (const [cx, cy] of corners) {
    doc.setDrawColor(0, 110, 0);
    doc.setLineWidth(0.7);
    doc.circle(cx, cy, 5.8, "S");
    doc.circle(cx, cy, 3.4, "S");
    doc.setFillColor(0, 110, 0);
    doc.circle(cx, cy, 1.2, "F");
    doc.setLineWidth(0.5);
    doc.line(cx - 7.5, cy, cx + 7.5, cy);
    doc.line(cx, cy - 7.5, cx, cy + 7.5);
  }
}

/* ─── Mixed bold/normal word-wrap renderer ──────────────────────────────── */
function renderMixedTextWrapped(
  doc: any,
  segments: { text: string; bold?: boolean }[],
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  fontSize: number
): number {
  const words: { word: string; bold: boolean }[] = [];
  for (const seg of segments) {
    const toks = seg.text.split(/(\s+)/);
    for (const t of toks) {
      if (t.length > 0) {
        words.push({ word: t, bold: !!seg.bold });
      }
    }
  }

  const charW = (text: string, bold: boolean) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    return (doc.getStringUnitWidth(text) * fontSize) / doc.internal.scaleFactor;
  };

  let lineWords: { word: string; bold: boolean }[] = [];
  let lineW = 0;
  let curY = y;

  const flushLine = () => {
    let curX = x;
    for (const w of lineWords) {
      doc.setFont("helvetica", w.bold ? "bold" : "normal");
      doc.setFontSize(fontSize);
      doc.text(w.word, curX, curY);
      curX += charW(w.word, w.bold);
    }
    curY += lineHeight;
    lineWords = [];
    lineW = 0;
  };

  for (const w of words) {
    const ww = charW(w.word, w.bold);
    if (lineW + ww > maxWidth && lineWords.length > 0) {
      flushLine();
    }
    lineWords.push(w);
    lineW += ww;
  }
  if (lineWords.length > 0) flushLine();

  return curY;
}

/* ─── Main Export: Official Diploma (A4 Landscape) ─────────────────────── */
export async function generateLmdOfficialDiplomaPDF(data: LmdDiplomaParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();   // 297 mm
  const ph = doc.internal.pageSize.getHeight();  // 210 mm

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pw, ph, "F");
  drawOrnamentalBorder(doc, pw, ph);

  const hCX     = pw / 2;
  const country = (data.institution.countryName || "REPUBLIQUE DU NIGER").toUpperCase();
  const ministry= data.institution.ministryName || "MINISTERE DE L'ENSEIGNEMENT SUPERIEUR, DE LA RECHERCHE ET DE L'INNOVATION";
  const school  = (data.institution.name        || "UNIVERSITE PRIVEE ENTENTE INTERNATIONALE").toUpperCase();
  const city    = data.institution.city         || "Niamey";
  const rector  = data.institution.rectorName   || "";
  const dirName = data.institution.directorGeneralName || "Le Directeur Général des Enseignements";
  const dipNum  = data.degree.diplomaNumber     || `${data.student.matricule || data.student.id}`;

  // ─── 1. LEFT LOGO (SCHOOL LOGO) ────────────────────────────────────────
  // Positioned with ample space away from the top-left corner rosette
  const logoX = 24, logoY = 12, logoSize = 22;
  let logoLoaded = false;
  if (data.institution.logo) {
    try {
      doc.addImage(data.institution.logo, "PNG", logoX, logoY, logoSize, logoSize);
      logoLoaded = true;
    } catch (_) {
      try {
        doc.addImage(data.institution.logo, "JPEG", logoX, logoY, logoSize, logoSize);
        logoLoaded = true;
      } catch (_) {}
    }
  }
  
  if (!logoLoaded) {
    // Professional academic university crest
    doc.setDrawColor(0, 110, 0);
    doc.setLineWidth(0.8);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, "S");
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 - 2.8, "S");
    doc.setFillColor(245, 250, 245);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 - 2.8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.8);
    doc.setTextColor(0, 110, 0);
    const shortUni = school.split(" ").filter((w: string) => w.length > 2).slice(0, 3).join(" ");
    doc.text(shortUni, logoX + logoSize / 2, logoY + logoSize / 2 - 2, { align: "center", maxWidth: logoSize - 4 });
    doc.setFontSize(4);
    doc.setTextColor(150, 100, 0);
    doc.text("• UNIVERSITÉ •", logoX + logoSize / 2, logoY + logoSize / 2 + 3.5, { align: "center" });
  }

  // ─── 2. TOP-RIGHT MINISTRY BOX WITH OFFICIAL NIGER COAT OF ARMS ────────
  // Positioned symmetrically with ample space away from top-right corner rosette
  const boxW = 55, boxH = 24;
  const boxX = pw - 24 - boxW, boxY = 12;
  doc.setDrawColor(0, 110, 0);
  doc.setLineWidth(0.7);
  doc.rect(boxX, boxY, boxW, boxH, "S");

  // Draw Coat of Arms of Niger (Center of Box Top)
  if (data.institution.ministryLogo) {
    try {
      doc.addImage(data.institution.ministryLogo, "PNG", boxX + boxW / 2 - 9, boxY + 1.5, 18, 10.5);
    } catch (_) {
      drawNigerCoatOfArms(doc, boxX + boxW / 2, boxY + 6.2, 0.72);
    }
  } else {
    drawNigerCoatOfArms(doc, boxX + boxW / 2, boxY + 6.2, 0.72);
  }

  // Ministry Label & Diploma Number
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.3);
  doc.setTextColor(10, 10, 10);
  doc.text("MINISTERE DE L'ENSEIGNEMENT SUPERIEUR", boxX + boxW / 2, boxY + 14.2, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.7);
  doc.setTextColor(40, 40, 40);
  doc.text("Direction Générale de l'Enseignement", boxX + boxW / 2, boxY + 17.5, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(10, 10, 10);
  doc.text(dipNum, boxX + boxW / 2, boxY + 22.5, { align: "center" });

  // ─── 3. CENTER HEADER ──────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(10, 10, 10);
  doc.text(country, hCX, 16, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(40, 40, 40);
  doc.text(ministry.toUpperCase(), hCX, 21, { align: "center", maxWidth: 146 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(10, 10, 10);
  doc.text(school, hCX, 28, { align: "center", maxWidth: 160 });

  // ─── 4. FULL-WIDTH GREEN BANNER ────────────────────────────────────────
  const bannerY = 37.5;
  const bannerH = 15;
  doc.setFillColor(0, 100, 0);
  doc.rect(10.5, bannerY, pw - 21, bannerH, "F");
  doc.setDrawColor(180, 140, 0);
  doc.setLineWidth(1.2);
  doc.line(10.5, bannerY, pw - 10.5, bannerY);
  doc.line(10.5, bannerY + bannerH, pw - 10.5, bannerY + bannerH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 215, 0);
  doc.text(
    `DIPLÔME DE ${data.degree.title.toUpperCase()}`,
    hCX, bannerY + 10.5, { align: "center" }
  );

  // ─── 5. VU LEGAL CLAUSES (DYNAMIC DENSITY SCALING FOR 6 TO 12+ CLAUSES) ───
  const defaultVuClauses = [
    "Vu la loi N° 98-12 du 1er Juin 1998, portant Orientation du Système Educatif Nigérien et les textes modifiants subséquents;",
    "Vu l'ordonnance N° 96-035 du 19 Juin 1996 portant réglementation de l'enseignement privé au Niger;",
    "Vu le décret N° 2010-402/PCSRD/MESS/RS du 14 Mai 2010, portant institution du système Licence, Master et Doctorat LMD;",
    "Vu l'arrêté N° 00105/MEMS/SG/DGE/DES/DES/DEPRI du 13 Mai 2013, fixant les conditions et modalités de délivrance des diplômes;",
    "Vu l'arrêté N° 092/MES/R/II/SG/DGE/DL/DESP/DESPRI du 28 Août 2017, portant autorisation de création de l'Université;",
    "Vu la décision du Conseil Universitaire dans son assise en date du présent;",
  ];

  const customVu = data.degree.vuClauses || data.institution.vuClauses;
  const vuClauses = (customVu && customVu.length > 0) ? customVu : defaultVuClauses;

  const count = vuClauses.length;
  const vuFontSize = 11;
  const vuLineH    = 5.2;
  const clauseX    = 13;
  const clauseMaxW = pw - 26;

  let cY = bannerY + bannerH + 5.5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(vuFontSize);
  doc.setTextColor(15, 15, 15);

  for (const clause of vuClauses) {
    const lines: string[] = doc.splitTextToSize(clause, clauseMaxW);
    doc.text(lines, clauseX, cY);
    cY += lines.length * vuLineH + 0.3;
  }

  // ─── 6. LAUREATE PARAGRAPH (DYNAMIC POSITIONING BELOW ALL VU CLAUSES) ───
  cY += 2.5;
  const declBoxY = cY;

  const fullName = `${(data.student.nom || "").toUpperCase()} ${(data.student.prenom || "").toUpperCase()}`.trim();
  const dob      = data.student.dateNaissance || "01-01-2000";
  const pob      = data.student.lieuNaissance || "Niamey";
  const nat      = data.student.nationalite   || "Nigériane";
  const mat      = data.student.matricule     || "N/A";
  const spec     = data.degree.specialization || "Sciences";
  const faculty  = data.degree.fieldOfStudy   || "Faculté";
  const mention  = data.degree.mention        || "Bien";
  const session  = data.degree.sessionName    || "2024-2025";
  const degTitle = data.degree.title          || "LICENCE";

  const paraFontSize = count >= 9 ? 9.8 : 10.5;
  const paraLineH    = count >= 9 ? 5.4 : 6.0;
  const boxPad       = count >= 9 ? 3.5 : 4.0;
  const innerW       = clauseMaxW - boxPad * 2;

  const segments: { text: string; bold?: boolean }[] = [
    { text: fullName, bold: true },
    { text: `, Né(e) le : ` },
    { text: dob },
    { text: ` à ` },
    { text: pob },
    { text: `, Nationalité: ` },
    { text: nat },
    { text: `, Matricule : ` },
    { text: mat },
    { text: ` a obtenu le Diplôme de ` },
    { text: `${degTitle} en ${spec}`, bold: true },
    { text: `, dans la ` },
    { text: faculty, bold: true },
    { text: ` avec la mention générale: ` },
    { text: mention, bold: true },
    { text: `, Session: ` },
    { text: session },
    { text: `.` },
  ];

  const fullPlain = segments.map(s => s.text).join("");
  const measLines = doc.splitTextToSize(fullPlain, innerW);
  const declBoxH  = measLines.length * paraLineH + boxPad * 2 + 1.5;

  doc.setFillColor(248, 252, 248);
  doc.setDrawColor(0, 110, 0);
  doc.setLineWidth(0.7);
  doc.roundedRect(clauseX, declBoxY, clauseMaxW, declBoxH, 2, 2, "FD");

  renderMixedTextWrapped(
    doc,
    segments,
    clauseX + boxPad,
    declBoxY + boxPad + paraFontSize * 0.35,
    innerW,
    paraLineH,
    paraFontSize
  );

  // ─── 7. SIGNATURES BLOCK ───────────────────────────────────────────────
  const sigY = Math.max(148, declBoxY + declBoxH + 4);

  const col1X = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(10, 10, 10);
  doc.text("L'impétrant:", col1X, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Signature.............", col1X, sigY + 10);

  const col2X = pw / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(10, 10, 10);
  doc.text("Le Recteur /", col2X, sigY, { align: "center" });
  doc.text("Président du Conseil", col2X, sigY + 6, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Signature...............................", col2X, sigY + 15, { align: "center" });
  if (rector) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(rector, col2X, sigY + 23, { align: "center" });
  }

  const col3X = pw - 22;
  const dateStr = data.degree.deliberationDate ||
    new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(10, 10, 10);
  doc.text(`Fait à ${city}, le ${dateStr}`, col3X, sigY, { align: "right" });
  doc.text("P. Le Ministre PO.", col3X, sigY + 7.5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Signature......................", col3X, sigY + 15, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(dirName, col3X, sigY + 23, { align: "right" });
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.35);
  doc.line(col3X - 58, sigY + 28, col3X, sigY + 28);

  // ─── 8. SECURITY QR CODE (BOTTOM LEFT) ─────────────────────────────────
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL || "https://niger.edut.pro";
  const verifUrl = `${appUrl}/verify/${encodeURIComponent(data.student.matricule || String(data.student.id))}`;
  const qrX      = 22;
  const qrY      = ph - 28;
  try {
    const qrData = await QRCode.toDataURL(verifUrl, { margin: 1, width: 128 });
    doc.addImage(qrData, "PNG", qrX, qrY - 1, 17, 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(30, 30, 30);
    doc.text("Veuillez visiter ce lien pour vérification", qrX + 20, qrY + 4.5);
    doc.text("de l'authenticité du document:", qrX + 20, qrY + 8.5);
    doc.setTextColor(0, 70, 180);
    doc.text(verifUrl, qrX + 20, qrY + 12.5);
  } catch (_) {}

  const cleanNom = (data.student.nom || "Etudiant").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Diplome_Officiel_${data.degree.title}_${cleanNom}.pdf`);
}

/* ─── Attestation de Réussite (UNIFIED A4 Landscape) ─────────────────────── */
export async function generateLmdAttestationReussitePDF(data: LmdDiplomaParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pw  = doc.internal.pageSize.getWidth();
  const ph  = doc.internal.pageSize.getHeight();

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pw, ph, "F");
  drawOrnamentalBorder(doc, pw, ph);

  const hCX     = pw / 2;
  const country = (data.institution.countryName || "REPUBLIQUE DU NIGER").toUpperCase();
  const ministry= data.institution.ministryName || "MINISTERE DE L'ENSEIGNEMENT SUPERIEUR, DE LA RECHERCHE ET DE L'INNOVATION";
  const school  = (data.institution.name        || "UNIVERSITE PRIVEE ENTENTE INTERNATIONALE").toUpperCase();
  const city    = data.institution.city         || "Niamey";
  const rector  = data.institution.rectorName   || "";
  const dirName = data.institution.directorGeneralName || "Le Directeur Général des Enseignements";
  const attNum  = data.degree.diplomaNumber     || `ATT-${data.student.matricule || data.student.id}`;

  const logoX = 24, logoY = 12, logoSize = 22;
  let logoLoaded = false;
  if (data.institution.logo) {
    try {
      doc.addImage(data.institution.logo, "PNG", logoX, logoY, logoSize, logoSize);
      logoLoaded = true;
    } catch (_) {
      try {
        doc.addImage(data.institution.logo, "JPEG", logoX, logoY, logoSize, logoSize);
        logoLoaded = true;
      } catch (_) {}
    }
  }

  const boxW = 55, boxH = 22;
  const boxX = pw - 24 - boxW;
  const boxY = 12;

  doc.setDrawColor(0, 100, 0);
  doc.setLineWidth(0.7);
  doc.rect(boxX, boxY, boxW, boxH, "S");

  drawNigerCoatOfArms(doc, boxX + 27.5, boxY + 6.2, 0.42);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.0);
  doc.setTextColor(0, 100, 0);
  doc.text("MINISTERE DE L'ENSEIGNEMENT SUPERIEUR", boxX + 27.5, boxY + 12.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.4);
  doc.setTextColor(60, 60, 60);
  doc.text("Direction Générale de l'Enseignement", boxX + 27.5, boxY + 15.5, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.0);
  doc.setTextColor(15, 15, 15);
  doc.text(attNum, boxX + 27.5, boxY + 19.8, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(10, 10, 10);
  doc.text(country, hCX, 16, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(50, 50, 50);
  doc.text(ministry.toUpperCase(), hCX, 21.5, { align: "center", maxWidth: 155 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(10, 10, 10);
  doc.text(school, hCX, 28, { align: "center", maxWidth: 160 });

  const bannerY = 37.5;
  const bannerH = 15;
  doc.setFillColor(0, 100, 0);
  doc.rect(10.5, bannerY, pw - 21, bannerH, "F");
  doc.setDrawColor(180, 140, 0);
  doc.setLineWidth(1.2);
  doc.line(10.5, bannerY, pw - 10.5, bannerY);
  doc.line(10.5, bannerY + bannerH, pw - 10.5, bannerY + bannerH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 215, 0);
  doc.text(
    `ATTESTATION DE RÉUSSITE – DIPLÔME DE ${data.degree.title.toUpperCase()}`,
    hCX, bannerY + 10.2, { align: "center", maxWidth: pw - 25 }
  );

  const defaultVuClauses = [
    "Vu la loi N° 98-12 du 1er Juin 1998, portant Orientation du Système Educatif Nigérien et les textes modifiants subséquents;",
    "Vu l'ordonnance N° 96-035 du 19 Juin 1996 portant réglementation de l'enseignement privé au Niger;",
    "Vu le décret N° 2010-402/PCSRD/MESS/RS du 14 Mai 2010, portant institution du système Licence, Master et Doctorat LMD;",
    "Vu l'arrêté N° 00105/MEMS/SG/DGE/DES/DES/DEPRI du 13 Mai 2013, fixant les conditions et modalités de délivrance des diplômes;",
    "Vu l'arrêté N° 092/MES/R/II/SG/DGE/DL/DESP/DESPRI du 28 Août 2017, portant autorisation de création de l'Université;",
    "Vu la décision du Conseil Universitaire dans son assise en date du présent;",
  ];

  const customVu = data.degree.vuClauses || data.institution.vuClauses;
  const vuClauses = (customVu && customVu.length > 0) ? customVu : defaultVuClauses;

  const count = vuClauses.length;
  const vuFontSize = 11;
  const vuLineH    = 5.2;
  const clauseX    = 13;
  const clauseMaxW = pw - 26;

  let cY = bannerY + bannerH + 5.5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(vuFontSize);
  doc.setTextColor(15, 15, 15);

  for (const clause of vuClauses) {
    const lines: string[] = doc.splitTextToSize(clause, clauseMaxW);
    doc.text(lines, clauseX, cY);
    cY += lines.length * vuLineH + 0.3;
  }

  cY += 2.5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(count >= 9 ? 9.0 : 9.5);
  doc.setTextColor(20, 20, 20);
  doc.text("Le Doyen de la Faculté et le Président du Jury d'Examen soussignés certifient que :", clauseX, cY);
  cY += 4.5;

  const declBoxY = cY;
  const fullName2 = `${(data.student.nom || "").toUpperCase()} ${(data.student.prenom || "").toUpperCase()}`.trim();
  const dob2      = data.student.dateNaissance || "01-01-2000";
  const pob2      = data.student.lieuNaissance || "Niamey";
  const nat2      = data.student.nationalite   || "Nigériane";
  const mat2      = data.student.matricule     || "N/A";
  const spec2     = data.degree.specialization || "Sciences";
  const faculty2  = data.degree.fieldOfStudy   || "Faculté";
  const mention2  = data.degree.mention        || "Bien";
  const session2  = data.degree.sessionName    || "2024-2025";
  const degTitle2 = data.degree.title          || "LICENCE";

  const paraFontSize2 = count >= 9 ? 9.5 : 10.0;
  const paraLineH2    = count >= 9 ? 5.2 : 5.8;
  const boxPad2       = count >= 9 ? 3.5 : 4.0;
  const innerW2       = clauseMaxW - boxPad2 * 2;

  const segments2: { text: string; bold?: boolean }[] = [
    { text: fullName2, bold: true },
    { text: `, Né(e) le : ` },
    { text: dob2 },
    { text: ` à ` },
    { text: pob2 },
    { text: `, Nationalité: ` },
    { text: nat2 },
    { text: `, Matricule : ` },
    { text: mat2 },
    { text: ` a obtenu le Diplôme de ` },
    { text: `${degTitle2} en ${spec2}`, bold: true },
    { text: `, dans la ` },
    { text: faculty2, bold: true },
    { text: ` avec la mention générale: ` },
    { text: mention2, bold: true },
    { text: `, Session: ` },
    { text: session2 },
    { text: `.` },
  ];

  const fullPlain2 = segments2.map(s => s.text).join("");
  const measLines2 = doc.splitTextToSize(fullPlain2, innerW2);
  const declBoxH2  = measLines2.length * paraLineH2 + boxPad2 * 2 + 1.5;

  doc.setFillColor(248, 252, 248);
  doc.setDrawColor(0, 110, 0);
  doc.setLineWidth(0.7);
  doc.roundedRect(clauseX, declBoxY, clauseMaxW, declBoxH2, 2, 2, "FD");

  renderMixedTextWrapped(
    doc,
    segments2,
    clauseX + boxPad2,
    declBoxY + boxPad2 + paraFontSize2 * 0.35,
    innerW2,
    paraLineH2,
    paraFontSize2
  );

  const noteY = declBoxY + declBoxH2 + (count >= 9 ? 3.0 : 4.0);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.8);
  doc.setTextColor(80, 80, 80);
  doc.text(
    "La présente attestation est délivrée en un seul exemplaire en attendant l'établissement du diplôme définitif.",
    hCX,
    noteY,
    { align: "center" }
  );

  const sigY2 = Math.max(148, noteY + (count >= 9 ? 4.5 : 7.0));

  const col1X2 = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(10, 10, 10);
  doc.text("Le Doyen de la Faculté", col1X2, sigY2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Signature et Cachet Officiel", col1X2, sigY2 + 7.5);
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.35);
  doc.line(col1X2, sigY2 + 22, col1X2 + 55, sigY2 + 22);

  const col2X2 = pw / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(10, 10, 10);
  doc.text("Le Recteur /", col2X2, sigY2, { align: "center" });
  doc.text("Président du Conseil", col2X2, sigY2 + 6, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Signature...............................", col2X2, sigY2 + 15, { align: "center" });
  if (rector) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(rector, col2X2, sigY2 + 23, { align: "center" });
  }

  const col3X2 = pw - 22;
  const dateStr2 = data.degree.deliberationDate ||
    new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(10, 10, 10);
  doc.text(`Fait à ${city}, le ${dateStr2}`, col3X2, sigY2, { align: "right" });
  doc.text("P. Le Ministre PO.", col3X2, sigY2 + 7.5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Signature......................", col3X2, sigY2 + 15, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(dirName, col3X2, sigY2 + 23, { align: "right" });
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.35);
  doc.line(col3X2 - 58, sigY2 + 28, col3X2, sigY2 + 28);

  // Security QR Code (Bottom Left)
  const appUrl2   = process.env.NEXT_PUBLIC_APP_URL || "https://niger.edut.pro";
  const verifUrl2 = `${appUrl2}/verify/${encodeURIComponent(data.student.matricule || String(data.student.id))}`;
  const qrX2      = 22;
  const qrY2      = ph - 28;
  try {
    const qrData2 = await QRCode.toDataURL(verifUrl2, { margin: 1, width: 128 });
    doc.addImage(qrData2, "PNG", qrX2, qrY2 - 1, 17, 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(30, 30, 30);
    doc.text("Veuillez visiter ce lien pour vérification", qrX2 + 20, qrY2 + 4.5);
    doc.text("de l'authenticité du document:", qrX2 + 20, qrY2 + 8.5);
    doc.setTextColor(0, 70, 180);
    doc.text(verifUrl2, qrX2 + 20, qrY2 + 12.5);
  } catch (_) {}

  const cleanNom2 = (data.student.nom || "Etudiant").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Attestation_Reussite_${data.degree.title}_${cleanNom2}.pdf`);
}
