"use client";

import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import Link from "next/link";
import OfficialDocumentHeader from "@/domains/printing/components/OfficialDocumentHeader";

import { amiriFontBase64 } from "@/domains/printing/utils/amiri-font";
import { hasArabicCharacters, reshapeArabicText } from "@/domains/printing/utils/arabic-reshaper";

function ensureAmiriRegistered(doc: jsPDF) {
  try {
    const fontList = doc.getFontList();
    if (!fontList["Amiri"]) {
      if (amiriFontBase64) {
        doc.addFileToVFS("Amiri-Regular.ttf", amiriFontBase64);
        doc.addFont("Amiri-Regular.ttf", "Amiri", "normal", "Identity-H");
      }
    }
  } catch (e) {
    console.warn("Failed to check or register Amiri font in admit-cards:", e);
  }
}

function drawTextBilingual(doc: jsPDF, text: string, x: number, y: number, options?: any) {
  if (hasArabicCharacters(text)) {
    ensureAmiriRegistered(doc);
    try {
      const reshaped = reshapeArabicText(text);
      const activeFont = doc.getFont();
      const activeStyle = activeFont.fontStyle;
      const activeName = activeFont.fontName;
      
      doc.setFont("Amiri", "normal");
      doc.text(reshaped, x, y, options);
      doc.setFont(activeName, activeStyle);
    } catch (e: any) {
      console.warn("Error rendering Arabic text with Amiri font:", e);
      doc.text(text, x, y, options);
    }
  } else {
    doc.text(text, x, y, options);
  }
}

function drawWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, align: "left" | "right" | "center"): number {
  const isAr = hasArabicCharacters(text);
  const currentFont = doc.getFont();
  const currentName = currentFont.fontName;
  const currentStyle = currentFont.fontStyle;

  if (isAr) {
    ensureAmiriRegistered(doc);
    const reshaped = reshapeArabicText(text);
    doc.setFont("Amiri", "normal");
    const lines = doc.splitTextToSize(reshaped, maxWidth);
    let tempY = y;
    for (const line of lines) {
      doc.text(line, x, tempY, { align });
      tempY += 4;
    }
    doc.setFont(currentName, currentStyle);
    return tempY - y;
  } else {
    const lines = doc.splitTextToSize(text, maxWidth);
    let tempY = y;
    for (const line of lines) {
      doc.text(line, x, tempY, { align });
      tempY += 4;
    }
    return tempY - y;
  }
}

function drawPDFHeader(
  doc: jsPDF,
  headerConfig: any,
  title: string
): number {
  const style = headerConfig?.style || "classic_dual_logo";
  const schoolName = headerConfig?.schoolName || "ÉCOLE EXCELLENCE";
  const address = headerConfig?.address || "";
  const phone = headerConfig?.phone || "";
  const email = headerConfig?.email || "";
  const registrationNo = headerConfig?.registrationNo || "";
  const schoolYear = headerConfig?.schoolYear || "";
  const ministry = headerConfig?.ministry || "Ministère de l'Éducation Nationale";
  const service = headerConfig?.service || "Service de la Scolarité";
  const bp = headerConfig?.bp || "";
  const motto = headerConfig?.motto || "";
  
  const leftLogo = headerConfig?.leftLogo || "";
  const rightLogo = headerConfig?.rightLogo || leftLogo;
  const centerLogo = headerConfig?.centerLogo || leftLogo;

  const W = doc.internal.pageSize.getWidth();
  const margin = 10;
  const rightX = W - margin;
  const centerX = W / 2;

  if (style === "modern_card") {
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(margin, 8, W - 2 * margin, 26, 2, 2, "F");
    
    if (leftLogo) {
      try {
        doc.addImage(leftLogo, 'PNG', margin + 4, 11, 20, 20);
      } catch (e) {}
    }
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    drawWrappedText(doc, schoolName, margin + 28, 17, W - 2 * margin - 38, "left");
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(220, 225, 255);
    drawWrappedText(doc, `Année Scolaire: ${schoolYear}`, margin + 28, 23, W - 2 * margin - 38, "left");
    drawWrappedText(doc, `${address} ${phone ? '| Tél: ' + phone : ''}`, margin + 28, 28, W - 2 * margin - 38, "left");
    
    doc.setTextColor(0, 0, 0);
    
    if (title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      drawWrappedText(doc, title.toUpperCase(), centerX, 44, W - 2 * margin, "center");
      return 52;
    }
    return 38;
  }
  
  if (style === "bilingual_center_logo") {
    if (centerLogo) {
      try {
        doc.addImage(centerLogo, 'PNG', centerX - 13, 8, 26, 26);
      } catch (e) {}
    }
    
    const leftLines = [
      headerConfig?.country || "RÉPUBLIQUE DU NIGER",
      ministry,
      headerConfig?.regionalDirection || "",
      headerConfig?.departmentalDirection || "",
      headerConfig?.inspection || "",
      schoolName,
      service,
      address,
      bp ? `BP : ${bp}` : "",
      phone ? `Tél: ${phone}` : "",
      email ? `Email: ${email}` : "",
    ].filter(Boolean);

    const rightLines = [
      headerConfig?.countryAr || "جمهورية النيجر",
      headerConfig?.ministryAr || "وزارة التربية الوطنية",
      headerConfig?.regionalDirectionAr || "",
      headerConfig?.departmentalDirectionAr || "",
      headerConfig?.inspectionAr || "",
      headerConfig?.schoolNameAr || schoolName,
      headerConfig?.serviceAr || "",
    ].filter(Boolean);

    const colWidth = centerLogo ? (centerX - margin - 15) : (centerX - margin - 4);
    
    let leftY = 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    for (const line of leftLines) {
      const height = drawWrappedText(doc, line, margin, leftY, colWidth, "left");
      leftY += height + 0.5;
    }
    
    let rightY = 12;
    for (const line of rightLines) {
      const height = drawWrappedText(doc, line, rightX, rightY, colWidth, "right");
      rightY += height + 0.5;
    }
    
    const maxY = Math.max(leftY, rightY);
    doc.setLineWidth(0.5);
    doc.line(margin, maxY + 2, rightX, maxY + 2);
    
    if (title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      drawWrappedText(doc, title.toUpperCase(), centerX, maxY + 12, W - 2 * margin, "center");
      return maxY + 18;
    }
    return maxY + 4;
  }
  
  if (style === "university_formal") {
    if (leftLogo) {
      try {
        doc.addImage(leftLogo, 'PNG', margin, 8, 22, 22);
      } catch (e) {}
    }
    if (rightLogo) {
      try {
        doc.addImage(rightLogo, 'PNG', rightX - 22, 8, 22, 22);
      } catch (e) {}
    }
    
    const centerLines = [
      headerConfig?.country || "REPUBLIQUE DU NIGER",
      schoolName,
      service,
      [bp && `BP : ${bp}`, address, phone && `Tél. ${phone}`].filter(Boolean).join(" | "),
      email ? `Email : ${email}` : "",
      registrationNo ? `Agrément N°: ${registrationNo}` : "",
    ].filter(Boolean);

    let centerY = 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const height0 = drawWrappedText(doc, centerLines[0].toUpperCase(), centerX, centerY, W - 2 * margin - 50, "center");
    centerY += height0 + 1;
    
    doc.setFontSize(12);
    const height1 = drawWrappedText(doc, centerLines[1], centerX, centerY, W - 2 * margin - 50, "center");
    centerY += height1 + 1;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    for (let i = 2; i < centerLines.length; i++) {
      const height = drawWrappedText(doc, centerLines[i], centerX, centerY, W - 2 * margin - 50, "center");
      centerY += height + 0.5;
    }
    
    const finalY = Math.max(centerY + 3, 32);
    doc.setLineWidth(0.5);
    doc.line(margin, finalY, rightX, finalY);
    
    if (title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      drawWrappedText(doc, title.toUpperCase(), centerX, finalY + 12, W - 2 * margin, "center");
      return finalY + 18;
    }
    return finalY + 2;
  }
  
  if (style === "minimal_administrative") {
    if (centerLogo || leftLogo) {
      try {
        doc.addImage(centerLogo || leftLogo, 'PNG', rightX - 22, 8, 22, 22);
      } catch (e) {}
    }
    
    const leftLines = [
      schoolName,
      headerConfig?.country || "RÉPUBLIQUE DU NIGER",
      ministry,
      headerConfig?.regionalDirection || "",
      headerConfig?.inspection || "",
      registrationNo ? `Agrément: ${registrationNo}` : "",
      [address, phone && `Tél: ${phone}`].filter(Boolean).join(" | "),
      email ? `Email: ${email}` : "",
    ].filter(Boolean);

    let leftY = 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const height0 = drawWrappedText(doc, leftLines[0], margin, leftY, W - 2 * margin - 25, "left");
    leftY += height0 + 1;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    for (let i = 1; i < leftLines.length; i++) {
      const height = drawWrappedText(doc, leftLines[i], margin, leftY, W - 2 * margin - 25, "left");
      leftY += height + 0.5;
    }
    
    const finalY = Math.max(leftY + 3, 32);
    doc.setLineWidth(0.3);
    doc.line(margin, finalY, rightX, finalY);
    
    if (title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      drawWrappedText(doc, title.toUpperCase(), centerX, finalY + 12, W - 2 * margin, "center");
      return finalY + 18;
    }
    return finalY + 2;
  }
  
  // DEFAULT / CLASSIC DUAL LOGO
  if (leftLogo) {
    try {
      doc.addImage(leftLogo, 'PNG', margin, 8, 22, 22);
    } catch (e) {}
  }
  if (rightLogo && rightLogo !== leftLogo) {
    try {
      doc.addImage(rightLogo, 'PNG', rightX - 22, 8, 22, 22);
    } catch (e) {}
  }
  
  const centerLines = [
    schoolName,
    motto ? `"${motto}"` : "",
    [registrationNo && `Agrément: ${registrationNo}`, `Niveau: Secondaire`].filter(Boolean).join(" | "),
    `Année Scolaire: ${schoolYear}`,
    [phone && `Tél: ${phone}`, email && `Email: ${email}`].filter(Boolean).join(" | "),
    address ? `Adresse: ${address}` : "",
  ].filter(Boolean);

  let centerY = 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const height0 = drawWrappedText(doc, centerLines[0], centerX, centerY, W - 2 * margin - 50, "center");
  centerY += height0 + 1;

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  for (let i = 1; i < centerLines.length; i++) {
    if (i === 1 && motto) {
      doc.setFont("helvetica", "italic");
      const height = drawWrappedText(doc, centerLines[i], centerX, centerY, W - 2 * margin - 50, "center");
      centerY += height + 0.5;
      doc.setFont("helvetica", "normal");
    } else {
      const height = drawWrappedText(doc, centerLines[i], centerX, centerY, W - 2 * margin - 50, "center");
      centerY += height + 0.5;
    }
  }
  
  const finalY = Math.max(centerY + 3, 32);
  doc.setLineWidth(0.5);
  doc.line(margin, finalY, rightX, finalY);
  
  if (title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    drawWrappedText(doc, title.toUpperCase(), centerX, finalY + 12, W - 2 * margin, "center");
    return finalY + 18;
  }
  return finalY + 2;
}
import {
  ArrowLeft,
  Columns3,
  Copy,
  Download,
  Edit3,
  Eye,
  FileArchive,
  FileSpreadsheet,
  FileText,
  ImagePlus,
  IdCard,
  Mail,
  MoreVertical,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Template = {
  id: string;
  name: string;
  type: string;
  format: string;
  orientation: string;
  size: string;
  background: string;
  backgroundImage?: string;
  status: "Actif" | "Brouillon" | "Archive";
  generated: number;
  createdAt: string;
  createdBy: string;
};

const initialTemplates: Template[] = [
  {
    id: "ADM-2026-001",
    name: "Certificate Style (DND Ready)",
    type: "Carte d'admission",
    format: "A4",
    orientation: "Portrait",
    size: "210mm x 297mm",
    background: "Image ecole",
    status: "Actif",
    generated: 128,
    createdAt: "15 Juin 2026",
    createdBy: "Admin",
  },
  {
    id: "ADM-2026-002",
    name: "Examen Final - Primaire",
    type: "Convocation examen",
    format: "A5",
    orientation: "Paysage",
    size: "210mm x 148mm",
    background: "Sans fond",
    status: "Brouillon",
    generated: 0,
    createdAt: "20 Juin 2026",
    createdBy: "Direction",
  },
  {
    id: "ADM-2026-003",
    name: "Concours entree sixieme",
    type: "Carte concours",
    format: "A4",
    orientation: "Portrait",
    size: "210mm x 297mm",
    background: "Motif officiel",
    status: "Archive",
    generated: 84,
    createdAt: "02 Mai 2026",
    createdBy: "Secretariat",
  },
];

const gallery = [
  "Classique officiel",
  "Moderne indigo",
  "Examen national",
  "Concours bilingue",
  "Minimal administratif",
  "Carte avec QR",
];

function StatusBadge({ status }: { status: Template["status"] }) {
  const styles: Record<Template["status"], string> = {
    Actif: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Brouillon: "bg-amber-50 text-amber-700 border-amber-100",
    Archive: "bg-slate-50 text-slate-600 border-slate-100",
  };
  return <span className={cn("rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest", styles[status])}>{status}</span>;
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={cn("mt-2 text-3xl font-black", color)}>{value}</p>
    </div>
  );
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function isImageSource(value?: string): value is string {
  return Boolean(value?.startsWith("data:image/"));
}

function createAiBackground(label: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="840" height="1188" viewBox="0 0 840 1188">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="#eef2ff"/>
          <stop offset="0.55" stop-color="#ffffff"/>
          <stop offset="1" stop-color="#ecfdf5"/>
        </linearGradient>
        <pattern id="p" width="72" height="72" patternUnits="userSpaceOnUse">
          <path d="M0 72 72 0" stroke="#c7d2fe" stroke-width="1" opacity=".38"/>
        </pattern>
      </defs>
      <rect width="840" height="1188" fill="url(#g)"/>
      <rect x="34" y="34" width="772" height="1120" rx="34" fill="none" stroke="#4f46e5" stroke-width="5"/>
      <rect x="58" y="58" width="724" height="1072" rx="24" fill="url(#p)" opacity=".8"/>
      <circle cx="100" cy="106" r="34" fill="#4f46e5" opacity=".95"/>
      <rect x="156" y="86" width="360" height="18" rx="9" fill="#1e293b" opacity=".85"/>
      <rect x="156" y="118" width="260" height="12" rx="6" fill="#64748b" opacity=".75"/>
      <text x="420" y="360" text-anchor="middle" font-family="Arial" font-size="42" font-weight="800" fill="#312e81">CARTE D'ADMISSION</text>
      <text x="420" y="412" text-anchor="middle" font-family="Arial" font-size="22" font-weight="700" fill="#475569">${label}</text>
      <rect x="108" y="496" width="624" height="264" rx="28" fill="#ffffff" opacity=".78" stroke="#cbd5e1"/>
      <rect x="124" y="918" width="168" height="168" rx="18" fill="#ffffff" stroke="#4f46e5" stroke-width="3"/>
      <text x="208" y="1010" text-anchor="middle" font-family="Arial" font-size="24" font-weight="800" fill="#4f46e5">QR</text>
      <rect x="448" y="1010" width="250" height="3" fill="#334155"/>
      <text x="573" y="1042" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700" fill="#334155">Signature</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function AdmitCardsPage() {
  const [activeTab, setActiveTab] = useState("Liste des cartes");
  const [query, setQuery] = useState("");
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [modalMode, setModalMode] = useState<"preview" | "edit" | "more" | null>(null);
  const [notice, setNotice] = useState("Interface prete. Tous les boutons sont actifs.");
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [draftImage, setDraftImage] = useState("");
  const [dbStudents, setDbStudents] = useState<any[]>([]);
  const [selectedStudentIdx, setSelectedStudentIdx] = useState(0);
  const [activeHeaderConfig, setActiveHeaderConfig] = useState<any>(null);
  const [selectedPaperSize, setSelectedPaperSize] = useState<"A4" | "A5">("A4");

  useEffect(() => {
    const styleId = "admit-cards-size-print-style";
    let style = document.getElementById(styleId) as HTMLStyleElement;
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    
    const pageMargin = selectedPaperSize === "A5" ? "8mm" : "15mm";
    style.innerHTML = `
      @media print {
        @page { size: ${selectedPaperSize} portrait; margin: ${pageMargin}; }
        
        /* A5 print overrides */
        .print-container[data-paper-size="A5"] {
          width: 148mm !important;
          height: 210mm !important;
          padding: 8mm !important;
          font-size: 8.5px !important;
        }
        .print-container[data-paper-size="A5"] h2 {
          font-size: 16px !important;
        }
        .print-container[data-paper-size="A5"] p {
          font-size: 8.5px !important;
        }
        .print-container[data-paper-size="A5"] .text-sm {
          font-size: 8.5px !important;
        }
        .print-container[data-paper-size="A5"] .text-2xl {
          font-size: 14px !important;
        }
        .print-container[data-paper-size="A5"] .h-20 {
          height: 3rem !important;
        }
      }
      
      /* A5 Screen Preview Overrides */
      .print-container[data-paper-size="A5"] {
        max-width: 148mm !important;
        margin: 0 auto;
        font-size: 8.5px !important;
      }
    `;
  }, [selectedPaperSize]);

  useEffect(() => {
    import("@/domains/settings/actions/settings.actions").then(({ getDocumentHeaderConfig }) => {
      getDocumentHeaderConfig().then((res) => {
        if (res?.data) {
          setActiveHeaderConfig(res.data);
        }
      });
    });
  }, []);

  // Load students from IndexedDB on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    async function load() {
      try {
        const { localDb } = await import("@/infrastructure/local-db/dexie");
        const list = await localDb.students.toArray();
        if (list.length > 0) {
          setDbStudents(list.map(s => ({
            id: s.id?.toString() || `local-${s.numAdmission}`,
            numAdmission: s.numAdmission,
            name: s.nomEtudiant,
            classe: s.classe || "N/A",
            isProvisoire: s.id === undefined || typeof s.id === "string" || s.id < 0 || s.id?.toString().startsWith("temp-"),
          })));
        }
      } catch (e) { console.warn("Failed to load students for admit cards:", e); }
    }
    load();
  }, []);

  // Generate a printable admit card PDF for a student
  const handlePrintCard = async (template: Template, student: any) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: selectedPaperSize === "A5" ? "a5" : "a4" });
    ensureAmiriRegistered(doc);
    
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    const m = 18;
    const isProvisoire = !!student.isProvisoire;
    const ref = `ADM-${template.id}-${student.numAdmission || student.id}`;

    // Background
    if (template.backgroundImage?.startsWith("data:image/")) {
      try { doc.addImage(template.backgroundImage, "PNG", 0, 0, W, H); } catch {}
    } else {
      doc.setFillColor(238, 242, 255);
      doc.rect(0, 0, W, H, "F");
    }

    // Draw official header
    const startY = drawPDFHeader(doc, activeHeaderConfig || null, "");

    // Offline watermark
    if (isProvisoire) {
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.4);
      doc.roundedRect(m, startY + 2, W - 2 * m, 6, 1, 1, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(180, 83, 9);
      doc.text("Document généré hors ligne - en attente de synchronisation", W / 2, startY + 6, { align: "center" });
    }

    // Title
    const titleY = startY + (isProvisoire ? 14 : 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 58, 138);
    doc.text("CARTE D'ADMISSION", W / 2, titleY, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    drawTextBilingual(doc, template.name, W / 2, titleY + 6, { align: "center" });

    // Info card
    const cardY = titleY + 12;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(m, cardY, W - 2 * m, 60, 3, 3, "FD");
    doc.setFontSize(9.5);
    let ly = cardY + 10;
    ["NOM COMPLET", "MATRICULE", "CLASSE", "RÉFÉRENCE CARTE"].forEach((label, i) => {
      const vals = [student.name, student.numAdmission || student.id, student.classe, ref];
      doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139);
      doc.text(label, m + 5, ly);
      doc.setFont("helvetica", "bold"); doc.setTextColor(15, 23, 42);
      drawTextBilingual(doc, String(vals[i]), m + 55, ly);
      if (i < 3) { doc.setDrawColor(241, 245, 249); doc.line(m + 5, ly + 3, W - m - 5, ly + 3); }
      ly += 13;
    });

    // Signature line
    const sigY = H - 60;
    doc.setDrawColor(200, 210, 230);
    doc.line(m, sigY + 18, m + 55, sigY + 18);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100, 116, 139);
    doc.text("Signature du directeur", m + 27, sigY + 23, { align: "center" });

    // Real QR code pointing to universal verification portal
    const appUrl = typeof window !== "undefined" ? window.location.origin : "https://niger.edut.pro";
    const qrPayload = `${appUrl}/verify/${encodeURIComponent(student.matricule || student.numAdmission || student.id || "ADMIT")}`;
    let qrBase64 = "";
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayload)}`;
      qrBase64 = await new Promise<string>((resolve) => {
        const img = new Image(); img.crossOrigin = "Anonymous"; img.src = qrUrl;
        img.onload = () => { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; c.getContext("2d")?.drawImage(img, 0, 0); resolve(c.toDataURL("image/png")); };
        img.onerror = () => resolve("");
      });
    } catch {}
    if (qrBase64) { try { doc.addImage(qrBase64, "PNG", W - m - 25, sigY + 2, 25, 25); } catch {} }
    doc.setFontSize(6.5); doc.setTextColor(100, 116, 139);
    doc.text("Vérification en ligne", W - m - 12, sigY + 30, { align: "center" });

    // Footer
    doc.setFillColor(79, 70, 229);
    doc.rect(0, H - 6, W, 6, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
    doc.text(`Edut Pro – ${ref}`, W / 2, H - 2, { align: "center" });

    doc.save(`Carte_Admission_${student.numAdmission || student.id}_${template.id}.pdf`);
    setNotice(`Carte PDF générée pour ${student.name}.`);
  };

  const readImageFile = (file: File, callback: (dataUrl: string) => void) => {
    if (!file.type.startsWith("image/")) {
      setNotice("Le fichier choisi n'est pas une image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => callback(String(reader.result));
    reader.readAsDataURL(file);
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter((item) =>
      [item.name, item.type, item.status, item.createdBy].some((value) => value.toLowerCase().includes(query.toLowerCase()))
    );
  }, [query, templates]);

  const activeCount = templates.filter((item) => item.status === "Actif").length;
  const generatedCount = templates.reduce((sum, item) => sum + item.generated, 0);

  const runExport = (format: "copy" | "excel" | "csv" | "pdf" | "print" | "columns") => {
    const rows = filteredTemplates.map((item) => ({
      reference: item.id,
      modele: item.name,
      type: item.type,
      format: `${item.format} - ${item.size}`,
      orientation: item.orientation,
      statut: item.status,
      cree_le: item.createdAt,
      cree_par: item.createdBy,
    }));

    if (format === "copy") {
      navigator.clipboard?.writeText(JSON.stringify(rows, null, 2));
      setNotice("Donnees copiees dans le presse-papiers.");
      return;
    }
    if (format === "columns") {
      setHiddenColumns((current) => (current.includes("createdBy") ? [] : ["createdBy", "background"]));
      setNotice("Affichage des colonnes mis a jour.");
      return;
    }
    if (format === "print" || format === "pdf") {
      setNotice(format === "pdf" ? "Preparation PDF lancee via impression navigateur." : "Impression lancee.");
      window.print();
      return;
    }

    const csv = [
      "Reference,Modele,Type,Format,Orientation,Statut,Cree le,Cree par",
      ...rows.map((row) => [row.reference, row.modele, row.type, row.format, row.orientation, row.statut, row.cree_le, row.cree_par].map((value) => `"${value}"`).join(",")),
    ].join("\n");
    downloadFile(format === "excel" ? "cartes-admission.xls" : "cartes-admission.csv", csv, "text/csv;charset=utf-8");
    setNotice(`Export ${format.toUpperCase()} genere avec succes.`);
  };

  const handleAction = (action: "preview" | "edit" | "duplicate" | "generate" | "email" | "delete" | "more", template: Template) => {
    if (action === "preview" || action === "edit" || action === "more") {
      setSelectedTemplate(template);
      setModalMode(action);
      return;
    }
    if (action === "duplicate") {
      const copy: Template = {
        ...template,
        id: `ADM-2026-${String(templates.length + 1).padStart(3, "0")}`,
        name: `${template.name} - copie`,
        status: "Brouillon",
        generated: 0,
        createdAt: "30 Juin 2026",
      };
      setTemplates((current) => [copy, ...current]);
      setNotice(`Modele duplique: ${copy.name}`);
      return;
    }
    if (action === "generate") {
      setTemplates((current) => current.map((item) => (item.id === template.id ? { ...item, generated: item.generated + 25, status: "Actif" } : item)));
      setNotice(`25 cartes generees pour ${template.name}.`);
      return;
    }
    if (action === "email") {
      const subject = encodeURIComponent(`Carte d'admission - ${template.name}`);
      const body = encodeURIComponent(`Bonjour,\n\nVeuillez trouver le modele ${template.name} (${template.id}).\n\nAdministration`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
      setNotice("Fenetre email ouverte.");
      return;
    }
    if (action === "delete" && window.confirm(`Supprimer le modele "${template.name}" ?`)) {
      setTemplates((current) => current.filter((item) => item.id !== template.id));
      setNotice(`Modele supprime: ${template.name}`);
    }
  };

  const saveEdit = () => {
    if (!selectedTemplate) return;
    setTemplates((current) => current.map((item) => (item.id === selectedTemplate.id ? selectedTemplate : item)));
    setNotice(`Modele modifie: ${selectedTemplate.name}`);
    setModalMode(null);
  };

  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8 print:bg-white print:p-0">
      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          .print-card { box-shadow: none !important; border-color: #cbd5e1 !important; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
        }
      `}</style>

      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/admin-docs" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50">
              <ArrowLeft size={19} />
            </Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
              <IdCard size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Administration & Attestations</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Cartes d'admission</h1>
              <p className="mt-1 text-sm font-bold text-slate-500">Modeles, generation, impression et suivi des cartes administratives</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Paper Size selector */}
            <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50/50 p-1">
              <button
                type="button"
                onClick={() => setSelectedPaperSize("A4")}
                className={`h-8 px-3 rounded-lg text-xs font-bold transition-all ${
                  selectedPaperSize === "A4"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => setSelectedPaperSize("A5")}
                className={`h-8 px-3 rounded-lg text-xs font-bold transition-all ${
                  selectedPaperSize === "A5"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                A5
              </button>
            </div>

            <button onClick={() => setActiveTab("Ajouter une carte")} className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-100">
              <Plus size={16} /> Nouveau modele
            </button>
            <button onClick={() => runExport("csv")} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700">
              <Download size={16} /> Exporter
            </button>
            <button onClick={() => runExport("print")} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700">
              <Printer size={16} /> Imprimer
            </button>
          </div>
        </div>
      </header>

      <section className="hidden print:block">
        <div className="border-b-[2.5px] border-blue-900 pb-5 z-10">
          <OfficialDocumentHeader config={activeHeaderConfig} title="" />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 print:hidden">
        <StatCard label="Total modeles" value={String(templates.length)} color="text-indigo-600" />
        <StatCard label="Modeles actifs" value={String(activeCount)} color="text-emerald-600" />
        <StatCard label="Cartes generees" value={String(generatedCount)} color="text-blue-600" />
        <StatCard label="Derniere action" value="Active" color="text-amber-600" />
      </section>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-800 print:hidden">{notice}</div>

      <section data-paper-size={selectedPaperSize} className="rounded-[30px] border border-slate-100 bg-white shadow-sm print-card">
        <div className="border-b border-slate-100 p-4 print:hidden">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {["Liste des cartes", "Galerie des modeles", "Ajouter une carte"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn("rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest transition", activeTab === tab ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100")}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex h-12 min-w-[280px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4">
              <Search size={18} className="text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un modele..." className="w-full bg-transparent text-sm font-bold outline-none" />
            </div>
          </div>
        </div>

        {activeTab === "Galerie des modeles" ? (
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {gallery.map((item, index) => (
              <div key={item} className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
                <div className="flex aspect-[1.42] items-center justify-center rounded-2xl border border-dashed border-indigo-200 bg-white text-indigo-500">
                  <IdCard size={44} />
                </div>
                <p className="mt-4 text-sm font-black text-slate-950">{item}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">Format {index % 2 === 0 ? "A4 portrait" : "A5 paysage"} avec zone QR et signature.</p>
                <button onClick={() => setNotice(`Modele selectionne depuis la galerie: ${item}`)} className="mt-4 h-10 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white">Utiliser</button>
              </div>
            ))}
          </div>
        ) : activeTab === "Ajouter une carte" ? (
          <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Nom du modele", "Carte admission examen final"],
                ["Type document", "Carte d'admission"],
                ["Format page", "A4"],
                ["Orientation", "Portrait"],
                ["Cree par", "Admin"],
              ].map(([label, placeholder]) => (
                <label key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
                  <input placeholder={placeholder} className="mt-2 w-full bg-transparent text-sm font-black text-slate-900 outline-none" />
                </label>
              ))}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 md:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Image de fond</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-white px-4 text-xs font-black uppercase tracking-widest text-indigo-700 ring-1 ring-indigo-100">
                    <ImagePlus size={16} /> Importer image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) readImageFile(file, (dataUrl) => {
                          setDraftImage(dataUrl);
                          setNotice(`Image importee: ${file.name}`);
                        });
                      }}
                    />
                  </label>
                  <button
                    onClick={() => {
                      setDraftImage(createAiBackground("Modele IA officiel"));
                      setNotice("Image IA generee et prete a utiliser.");
                    }}
                    className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white"
                  >
                    <IdCard size={16} /> Generer image IA
                  </button>
                  {draftImage && (
                    <button onClick={() => setDraftImage("")} className="h-11 rounded-xl border border-rose-100 bg-white px-4 text-xs font-black uppercase tracking-widest text-rose-600">
                      Retirer
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-[24px] border border-indigo-100 bg-indigo-50 p-5">
              <p className="text-sm font-black text-indigo-900">Apercu du modele</p>
              <div className="mt-4 flex aspect-[0.7] items-center justify-center overflow-hidden rounded-2xl bg-white text-indigo-500 shadow-sm">
                {draftImage ? <img src={draftImage} alt="Fond du modele" className="h-full w-full object-cover" /> : <IdCard size={56} />}
              </div>
              <button
                onClick={() => {
                  const newTemplate: Template = {
                    id: `ADM-2026-${String(templates.length + 1).padStart(3, "0")}`,
                    name: "Carte admission examen final",
                    type: "Carte d'admission",
                    format: "A4",
                    orientation: "Portrait",
                    size: "210mm x 297mm",
                    background: draftImage ? "Image importee" : "Choisir une image",
                    backgroundImage: draftImage || undefined,
                    status: "Brouillon",
                    generated: 0,
                    createdAt: "30 Juin 2026",
                    createdBy: "Admin",
                  };
                  setTemplates((current) => [newTemplate, ...current]);
                  setDraftImage("");
                  setActiveTab("Liste des cartes");
                  setNotice(`Nouveau modele cree: ${newTemplate.name}`);
                }}
                className="mt-4 h-11 w-full rounded-xl bg-indigo-600 text-xs font-black uppercase tracking-widest text-white"
              >
                Creer le modele
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4 print:hidden">
              {[
                [Copy, "Copier", "copy"],
                [FileSpreadsheet, "Excel", "excel"],
                [FileArchive, "CSV", "csv"],
                [FileText, "PDF", "pdf"],
                [Printer, "Imprimer", "print"],
                [Columns3, "Colonnes", "columns"],
              ].map(([Icon, label, action]: any) => (
                <button key={label} onClick={() => runExport(action)} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black uppercase tracking-widest text-slate-700">
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="px-5 py-4">N</th>
                    <th className="px-5 py-4">Nom du modele</th>
                    <th className="px-5 py-4">Type document</th>
                    <th className="px-5 py-4">Format page</th>
                    <th className="px-5 py-4">Orientation</th>
                    {!hiddenColumns.includes("background") && <th className="px-5 py-4">Image de fond</th>}
                    <th className="px-5 py-4">Statut</th>
                    <th className="px-5 py-4">Cree le</th>
                    {!hiddenColumns.includes("createdBy") && <th className="px-5 py-4">Cree par</th>}
                    <th className="px-5 py-4 print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTemplates.map((template, index) => (
                    <tr key={template.id} className="text-sm font-bold text-slate-700">
                      <td className="px-5 py-4 text-slate-400">{index + 1}</td>
                      <td className="px-5 py-4">
                        <p className="font-black text-slate-950">{template.name}</p>
                        <p className="mt-1 text-xs font-bold text-slate-400">{template.id} - {template.generated} cartes generees</p>
                      </td>
                      <td className="px-5 py-4">{template.type}</td>
                      <td className="px-5 py-4">{template.format} - {template.size}</td>
                      <td className="px-5 py-4">{template.orientation}</td>
                      {!hiddenColumns.includes("background") && (
                        <td className="px-5 py-4">
                          <div className="flex h-11 w-14 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-indigo-500">
                            {isImageSource(template.backgroundImage) ? <img src={template.backgroundImage} alt={template.background} className="h-full w-full object-cover" /> : <IdCard size={22} />}
                          </div>
                        </td>
                      )}
                      <td className="px-5 py-4"><StatusBadge status={template.status} /></td>
                      <td className="px-5 py-4">{template.createdAt}</td>
                      {!hiddenColumns.includes("createdBy") && <td className="px-5 py-4">{template.createdBy}</td>}
                      <td className="px-5 py-4 print:hidden">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleAction("preview", template)} title="Apercu" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-indigo-600"><Eye size={16} /></button>
                          <button onClick={() => handleAction("edit", template)} title="Modifier" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-amber-600"><Edit3 size={16} /></button>
                          <button onClick={() => handleAction("duplicate", template)} title="Dupliquer" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600"><Copy size={16} /></button>
                          <button onClick={() => handleAction("generate", template)} title="Generer cartes" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-emerald-600"><IdCard size={16} /></button>
                          <button onClick={() => handleAction("email", template)} title="Envoyer email" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-blue-600"><Mail size={16} /></button>
                          <button onClick={() => handleAction("delete", template)} title="Supprimer" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-rose-600"><Trash2 size={16} /></button>
                          <button onClick={() => handleAction("more", template)} title="Plus" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500"><MoreVertical size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-100 p-5 text-xs font-bold text-slate-500 md:flex-row md:items-center md:justify-between print:hidden">
              <span>Affichage de 1 a {filteredTemplates.length} sur {templates.length} modeles</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setNotice("Vous etes deja sur la premiere page.")} className="h-9 rounded-xl border border-slate-200 px-3 font-black text-slate-400">Precedent</button>
                <button className="h-9 rounded-xl bg-indigo-600 px-3 font-black text-white">1</button>
                <button onClick={() => setNotice("Aucune autre page disponible.")} className="h-9 rounded-xl border border-slate-200 px-3 font-black text-slate-600">Suivant</button>
              </div>
            </div>
          </>
        )}
      </section>

      {selectedTemplate && modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 print:hidden">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{modalMode === "preview" ? "Apercu" : modalMode === "edit" ? "Modification" : "Actions avancees"}</p>
                <h2 className="text-xl font-black text-slate-950">{selectedTemplate.name}</h2>
              </div>
              <button onClick={() => setModalMode(null)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500"><X size={18} /></button>
            </div>

            {modalMode === "edit" ? (
              <div className="grid gap-4 py-5 md:grid-cols-2">
                {(["name", "type", "format", "orientation", "background", "createdBy"] as const).map((field) => (
                  <label key={field} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{field}</span>
                    <input value={String(selectedTemplate[field])} onChange={(event) => setSelectedTemplate({ ...selectedTemplate, [field]: event.target.value })} className="mt-2 w-full bg-transparent text-sm font-black outline-none" />
                  </label>
                ))}
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Image de fond</span>
                  <div className="mt-3 grid gap-3 md:grid-cols-[140px_minmax(0,1fr)]">
                    <div className="flex aspect-[0.7] items-center justify-center overflow-hidden rounded-xl bg-white text-indigo-500 ring-1 ring-slate-200">
                      {isImageSource(selectedTemplate.backgroundImage) ? <img src={selectedTemplate.backgroundImage} alt="Fond actuel" className="h-full w-full object-cover" /> : <IdCard size={38} />}
                    </div>
                    <div className="flex flex-wrap content-start gap-2">
                      <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-white px-4 text-xs font-black uppercase tracking-widest text-indigo-700 ring-1 ring-indigo-100">
                        <ImagePlus size={16} /> Importer image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) readImageFile(file, (dataUrl) => setSelectedTemplate({ ...selectedTemplate, background: "Image importee", backgroundImage: dataUrl }));
                          }}
                        />
                      </label>
                      <button
                        onClick={() => setSelectedTemplate({ ...selectedTemplate, background: "Image IA", backgroundImage: createAiBackground(selectedTemplate.name) })}
                        className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white"
                      >
                        <IdCard size={16} /> Generer image IA
                      </button>
                      <button onClick={() => setSelectedTemplate({ ...selectedTemplate, background: "Sans fond", backgroundImage: undefined })} className="h-11 rounded-xl border border-rose-100 bg-white px-4 text-xs font-black uppercase tracking-widest text-rose-600">
                        Retirer
                      </button>
                    </div>
                  </div>
                </div>
                <button onClick={saveEdit} className="md:col-span-2 h-11 rounded-xl bg-indigo-600 text-xs font-black uppercase tracking-widest text-white">Enregistrer les modifications</button>
              </div>
            ) : (
              <div className="grid gap-5 py-5 md:grid-cols-[220px_minmax(0,1fr)]">
                <div className="flex aspect-[0.7] items-center justify-center overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                  {isImageSource(selectedTemplate.backgroundImage) ? <img src={selectedTemplate.backgroundImage} alt="Fond carte" className="h-full w-full object-cover" /> : <IdCard size={64} />}
                </div>
                <div className="space-y-3 text-sm font-bold text-slate-700">
                  <p><span className="text-slate-400">Reference:</span> {selectedTemplate.id}</p>
                  <p><span className="text-slate-400">Type:</span> {selectedTemplate.type}</p>
                  <p><span className="text-slate-400">Page:</span> {selectedTemplate.format} - {selectedTemplate.size}</p>
                  <p><span className="text-slate-400">Orientation:</span> {selectedTemplate.orientation}</p>
                  <p><span className="text-slate-400">Cartes generees:</span> {selectedTemplate.generated}</p>
                  {/* Student selector for offline card generation */}
                  {dbStudents.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Élève (IndexedDB)</p>
                      <select
                        value={selectedStudentIdx}
                        onChange={e => setSelectedStudentIdx(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold"
                      >
                        {dbStudents.map((s, i) => (
                          <option key={s.id} value={i}>
                            {s.name} – {s.numAdmission}{s.isProvisoire ? " ⚠️ hors ligne" : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handlePrintCard(selectedTemplate, dbStudents[selectedStudentIdx])}
                        className="w-full h-10 rounded-xl bg-indigo-600 text-xs font-black uppercase tracking-widest text-white"
                      >
                        Générer carte élève PDF
                      </button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-3">
                    <button onClick={() => handleAction("generate", selectedTemplate)} className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-black uppercase tracking-widest text-white">Generer</button>
                    <button onClick={() => runExport("print")} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-black uppercase tracking-widest">Imprimer</button>
                    <button onClick={() => handleAction("email", selectedTemplate)} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-black uppercase tracking-widest">Email</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="hidden print:block pt-8">
        <div className="grid grid-cols-4 gap-4 text-center text-xs font-bold text-slate-700">
          <div>Signature directeur</div>
          <div>Cachet etablissement</div>
          <div>Signature inspection</div>
          <div className="mx-auto flex h-16 w-16 items-center justify-center border border-slate-400">QR</div>
        </div>
      </footer>
    </div>
  );
}
