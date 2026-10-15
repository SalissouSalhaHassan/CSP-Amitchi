/**
 * Unified Official LMD Header & Security Stamp Helper
 * Standard: REESAO / CAMES / ECTS / Ministère de l'Enseignement Supérieur Niger
 */

import { drawNigerCoatOfArms } from "./lmd-diploma-generator";

export interface UnifiedLmdHeaderOptions {
  orientation?: "portrait" | "landscape" | "landscape-a3";
  countryName?: string;
  ministryName?: string;
  motto?: string;
  schoolName?: string;
  facultyName?: string;
  departmentName?: string;
  city?: string;
  logoUrl?: string;
  documentTitle?: string;
  documentSubtitle?: string;
  bannerColor?: "emerald" | "navy" | "indigo" | "gold" | "rose";
  startY?: number;
}

/**
 * Load Image Safely with timeout and data URL support
 */
export async function loadImageAsBase64(url: string): Promise<string | null> {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith("data:image/")) return url;

  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Draw Official Unified Header across all LMD Documents
 */
export function drawUnifiedLmdHeader(
  doc: any,
  opts: UnifiedLmdHeaderOptions
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const isLandscape = opts.orientation === "landscape" || opts.orientation === "landscape-a3";
  const isA3 = opts.orientation === "landscape-a3";

  const marginX = isA3 ? 16 : isLandscape ? 12 : 10;
  const startY = opts.startY || (isA3 ? 12 : isLandscape ? 9 : 8);

  const country = (opts.countryName || "RÉPUBLIQUE DU NIGER").toUpperCase();
  const motto = opts.motto || "Fraternité — Travail — Progrès";
  const ministry = opts.ministryName || "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE";
  const schoolName = (opts.schoolName || "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES").toUpperCase();
  const faculty = (opts.facultyName || "FACULTÉ DES SCIENCES & TECHNIQUES").toUpperCase();
  const department = opts.departmentName || "Département Universitaire LMD";
  const city = opts.city || "Niamey";

  // 1. Dual Security Frame
  const frameDrawColor = opts.bannerColor === "emerald" ? [16, 94, 70] : [30, 41, 59];
  doc.setDrawColor(frameDrawColor[0], frameDrawColor[1], frameDrawColor[2]);
  doc.setLineWidth(isA3 ? 0.9 : 0.6);
  doc.rect(marginX - 3, startY - 2, pageWidth - (marginX - 3) * 2, doc.internal.pageSize.getHeight() - (startY - 2) * 2, "S");

  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.25);
  doc.rect(marginX - 1.5, startY - 0.5, pageWidth - (marginX - 1.5) * 2, doc.internal.pageSize.getHeight() - (startY - 0.5) * 2, "S");

  // 2. Left: School Logo or Monogram
  const logoBoxW = isA3 ? 24 : isLandscape ? 20 : 17;
  const logoBoxH = isA3 ? 24 : isLandscape ? 20 : 17;
  const logoX = marginX;
  const logoY = startY;

  if (opts.logoUrl && (opts.logoUrl.startsWith("data:image/") || opts.logoUrl.startsWith("http"))) {
    try {
      const format = opts.logoUrl.includes("png") ? "PNG" : "JPEG";
      doc.addImage(opts.logoUrl, format, logoX, logoY, logoBoxW, logoBoxH, undefined, "FAST");
    } catch {
      drawSchoolMonogram(doc, logoX, logoY, logoBoxW, logoBoxH, schoolName);
    }
  } else {
    drawSchoolMonogram(doc, logoX, logoY, logoBoxW, logoBoxH, schoolName);
  }

  // 3. Right: Official Republic of Niger Coat of Arms & Ministry
  const rightBoxW = isA3 ? 80 : isLandscape ? 70 : 60;
  const rightX = pageWidth - marginX - rightBoxW;

  // Draw Coat of Arms Emblem
  const coatScale = isA3 ? 0.75 : isLandscape ? 0.62 : 0.55;
  const coatCx = pageWidth - marginX - 12;
  const coatCy = startY + 9;
  drawNigerCoatOfArms(doc, coatCx, coatCy, coatScale);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(isA3 ? 9.5 : isLandscape ? 8.5 : 7.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(country, rightX, startY + 4);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(isA3 ? 7 : isLandscape ? 6.2 : 5.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(motto, rightX, startY + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(isA3 ? 7 : isLandscape ? 6.2 : 5.5);
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text(ministry, rightX, startY + 12.5, { maxWidth: rightBoxW - 16 });

  // 4. Center: University & Faculty Branding
  const centerX = logoX + logoBoxW + 4;
  const centerW = rightX - centerX - 4;
  const centerMidX = centerX + centerW / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(isA3 ? 12 : isLandscape ? 10.5 : 9);
  doc.setTextColor(15, 23, 42);
  doc.text(schoolName, centerMidX, startY + 4.5, { align: "center", maxWidth: centerW });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(isA3 ? 9 : isLandscape ? 8 : 7);
  doc.setTextColor(16, 94, 70); // emerald-700
  doc.text(faculty, centerMidX, startY + 9.5, { align: "center", maxWidth: centerW });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(isA3 ? 7.5 : isLandscape ? 6.8 : 6);
  doc.setTextColor(71, 85, 105);
  doc.text(`${department} • ${city}`, centerMidX, startY + 14, { align: "center", maxWidth: centerW });

  // Divider Line
  const divY = startY + Math.max(logoBoxH, 18) + 1.5;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(marginX, divY, pageWidth - marginX, divY);

  // 5. Optional Document Title Banner
  let nextY = divY + 3;
  if (opts.documentTitle) {
    const bannerH = isA3 ? 14 : isLandscape ? 11 : 10;
    const bannerY = divY + 2.5;

    // Determine banner color
    let fill = [15, 23, 42]; // Default slate-900
    let stroke = [30, 41, 59];
    if (opts.bannerColor === "emerald") {
      fill = [16, 94, 70]; // emerald-800
      stroke = [5, 150, 105];
    } else if (opts.bannerColor === "indigo") {
      fill = [67, 24, 112]; // deep indigo
      stroke = [99, 102, 241];
    } else if (opts.bannerColor === "gold") {
      fill = [146, 64, 14]; // amber-800
      stroke = [217, 119, 6];
    } else if (opts.bannerColor === "rose") {
      fill = [159, 18, 57]; // rose-800
      stroke = [225, 29, 72];
    }

    doc.setFillColor(fill[0], fill[1], fill[2]);
    doc.setDrawColor(stroke[0], stroke[1], stroke[2]);
    doc.roundedRect(marginX, bannerY, pageWidth - marginX * 2, bannerH, 1.2, 1.2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(isA3 ? 12 : isLandscape ? 10 : 8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(opts.documentTitle.toUpperCase(), pageWidth / 2, bannerY + (opts.documentSubtitle ? (bannerH * 0.42) : (bannerH * 0.62)), {
      align: "center",
      maxWidth: pageWidth - marginX * 2 - 8,
    });

    if (opts.documentSubtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(isA3 ? 7.5 : isLandscape ? 6.5 : 5.8);
      doc.setTextColor(241, 245, 249);
      doc.text(opts.documentSubtitle, pageWidth / 2, bannerY + bannerH * 0.8, {
        align: "center",
        maxWidth: pageWidth - marginX * 2 - 8,
      });
    }

    nextY = bannerY + bannerH + 3.5;
  }

  return nextY;
}

/**
 * Draw Fallback University Monogram
 */
function drawSchoolMonogram(
  doc: any,
  x: number,
  y: number,
  w: number,
  h: number,
  schoolName: string
) {
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(16, 94, 70);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, "FD");

  const initials = schoolName
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 3)
    .map((w) => w[0].toUpperCase())
    .join("");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(w > 20 ? 11 : 9);
  doc.setTextColor(16, 94, 70);
  doc.text(initials || "UNIV", x + w / 2, y + h / 2 + 3, { align: "center" });
}

/**
 * Draw Official Signatures Block with Security Stamp Zone
 */
export function drawUnifiedLmdSignatureZone(
  doc: any,
  params: {
    startY: number;
    leftTitle?: string;
    leftSubtitle?: string;
    rightTitle?: string;
    rightSubtitle?: string;
    centerCode?: string;
    city?: string;
    dateStr?: string;
    orientation?: "portrait" | "landscape" | "landscape-a3";
  }
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const isA3 = params.orientation === "landscape-a3";
  const isLandscape = params.orientation === "landscape" || isA3;
  const marginX = isA3 ? 16 : isLandscape ? 12 : 10;

  const sigY = params.startY;
  if (sigY >= pageHeight - 12) return;

  const dateText = `Fait à ${params.city || "Niamey"}, le ${params.dateStr || new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}`;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(isA3 ? 8 : isLandscape ? 7 : 6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(dateText, pageWidth - marginX, sigY - 2.5, { align: "right" });

  // Left Signature
  const leftX = marginX + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(isA3 ? 9 : isLandscape ? 8 : 7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(params.leftTitle || "Le Chef de Département / Responsable LMD", leftX, sigY + 3);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(isA3 ? 7.5 : isLandscape ? 6.5 : 5.8);
  doc.setTextColor(100, 116, 139);
  doc.text(params.leftSubtitle || "Signature et approbation pédagogique", leftX, sigY + 7);

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(leftX, sigY + 18, leftX + (isLandscape ? 65 : 55), sigY + 18);

  // Center Security Verification Box
  const centerBoxW = isA3 ? 48 : isLandscape ? 44 : 38;
  const centerBoxH = isA3 ? 19 : isLandscape ? 17 : 15;
  const centerBoxX = pageWidth / 2 - centerBoxW / 2;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(16, 94, 70);
  doc.setLineWidth(0.4);
  doc.roundedRect(centerBoxX, sigY, centerBoxW, centerBoxH, 1, 1, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(isA3 ? 6.8 : isLandscape ? 6 : 5.2);
  doc.setTextColor(16, 94, 70);
  doc.text("SÉCURITÉ & AUTHENTICITÉ LMD", pageWidth / 2, sigY + 4, { align: "center" });

  doc.setFont("courier", "bold");
  doc.setFontSize(isA3 ? 6.5 : isLandscape ? 5.8 : 5);
  doc.setTextColor(71, 85, 105);
  doc.text(params.centerCode || `LMD-${Date.now().toString().slice(-8)}`, pageWidth / 2, sigY + 9, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(isA3 ? 5.8 : isLandscape ? 5.2 : 4.5);
  doc.setTextColor(100, 116, 139);
  doc.text("CERTIFIÉ CONFORME AU PV", pageWidth / 2, sigY + 13.5, { align: "center" });

  // Right Signature
  const rightX = pageWidth - marginX - (isLandscape ? 70 : 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(isA3 ? 9 : isLandscape ? 8 : 7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(params.rightTitle || "Le Recteur / Directeur Général", rightX, sigY + 3);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(isA3 ? 7.5 : isLandscape ? 6.5 : 5.8);
  doc.setTextColor(100, 116, 139);
  doc.text(params.rightSubtitle || "Cachet officiel de l'Établissement", rightX, sigY + 7);

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(rightX, sigY + 18, pageWidth - marginX - 4, sigY + 18);

  // Bottom Legal Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(isA3 ? 6.5 : isLandscape ? 5.8 : 5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Document officiel délivré en un seul exemplaire original • Toute modification ou rature annule sa validité • Système LMD / CAMES / REESAO",
    pageWidth / 2,
    pageHeight - 4.5,
    { align: "center" }
  );
}
