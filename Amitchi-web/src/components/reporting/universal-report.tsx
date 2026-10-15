"use client";

import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  Mail,
  X,
  ChevronRight,
  Info,
  Calendar,
  User,
  ShieldCheck,
  Building,
} from "lucide-react";
import { cn } from "@/lib/utils";
import OfficialDocumentHeader from "@/domains/printing/components/OfficialDocumentHeader";
import { mergeDocumentHeaderConfig, type DocumentHeaderConfig } from "@/domains/printing/document-header";
import { amiriFontBase64 } from "@/domains/printing/utils/amiri-font";
import { hasArabicCharacters, reshapeArabicText } from "@/domains/printing/utils/arabic-reshaper";

export interface UniversalReportKpi {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

export interface UniversalReportProps {
  metadata: {
    title: string;
    subtitle?: string;
    moduleName: string; // e.g. "GESTION DES CANEVAS SCOLAIRES"
    reportId: string; // e.g. "RPT-ETB-2026-0001"
    academicYear: string;
    editorName: string;
    description?: string;
    qrValue?: string;
    isLandscape?: boolean;
    documentHeaderConfig?: Partial<DocumentHeaderConfig> | null;
  };
  kpis?: UniversalReportKpi[];
  table?: {
    headers: string[];
    rows: Array<Array<any>>;
    summary?: Array<{
      label: string;
      value: string | number;
      icon?: React.ReactNode;
      color?: string;
    }>;
  };
  // Callback when email is triggered
  onSendEmail?: (email: string) => Promise<boolean> | boolean;
}

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
    console.warn("Failed to check or register Amiri font in universal-report:", e);
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

function sanitizePDFText(value: any): string {
  if (value == null) return "";
  const str = String(value);
  return str.replace(/[\u00A0\u202F\u2000-\u200B\xa0]/g, " ").trim();
}

function drawPDFHeader(
  doc: jsPDF,
  headerConfig: any,
  title: string
): number {
  const mergedCfg = mergeDocumentHeaderConfig(headerConfig);
  const style = mergedCfg.style || "bilingual_center_logo";
  const schoolName = mergedCfg.schoolName || "ÉCOLE EXCELLENCE";
  const address = mergedCfg.address || "";
  const phone = mergedCfg.phone || "";
  const email = mergedCfg.email || "";
  const registrationNo = mergedCfg.schoolCode || "";
  const schoolYear = mergedCfg.schoolYear || "";
  const ministry = mergedCfg.ministry || "Ministère de l'Éducation Nationale";
  const service = mergedCfg.service || "Service de la Scolarité";
  const bp = mergedCfg.bp || "";
  const motto = mergedCfg.motto || "";
  
  const leftLogo = mergedCfg.leftLogo || "";
  const rightLogo = mergedCfg.rightLogo || leftLogo;
  const centerLogo = mergedCfg.centerLogo || leftLogo;

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
  
  if (style === "bilingual_center_logo" || style === "classic_dual_logo") {
    if (centerLogo) {
      try {
        doc.addImage(centerLogo, 'PNG', centerX - 13, 8, 26, 26);
      } catch (e) {}
    }
    
    const leftLines = [
      mergedCfg.country || "RÉPUBLIQUE DU NIGER",
      ministry,
      mergedCfg.regionalDirection || "",
      mergedCfg.departmentalDirection || "",
      mergedCfg.inspection || "",
      mergedCfg.commune || "",
      mergedCfg.schoolCode ? `Code Étab. : ${mergedCfg.schoolCode}` : "",
      schoolName,
      service,
      address,
      bp ? `BP : ${bp}` : "",
      phone ? `Tél: ${phone}` : "",
      email ? `Email: ${email}` : "",
    ].filter(Boolean);

    const rightLines = [
      mergedCfg.countryAr || "جمهورية النيجر",
      mergedCfg.ministryAr || "وزارة التربية الوطنية",
      mergedCfg.regionalDirectionAr || "",
      mergedCfg.departmentalDirectionAr || "",
      mergedCfg.inspectionAr || "",
      mergedCfg.communeAr || "",
      mergedCfg.schoolCode ? `رمز المؤسسة: ${mergedCfg.schoolCode}` : "",
      mergedCfg.schoolNameAr || schoolName,
      mergedCfg.serviceAr || "",
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

export default function UniversalReport({ metadata, kpis = [], table, onSendEmail }: UniversalReportProps) {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [selectedPaperSize, setSelectedPaperSize] = useState<"A4" | "A5">("A4");
  const [dbHeaderConfig, setDbHeaderConfig] = useState<any>(null);

  React.useEffect(() => {
    if (!metadata.documentHeaderConfig) {
      import("@/domains/settings/actions/settings.actions").then(({ getDocumentHeaderConfig }) => {
        getDocumentHeaderConfig().then((res) => {
          if (res?.data) {
            const cfg = (res.data as any).data || res.data;
            setDbHeaderConfig(cfg);
          }
        });
      });
    }
  }, [metadata.documentHeaderConfig]);

  const activeHeaderConfig = metadata.documentHeaderConfig || dbHeaderConfig;

  React.useEffect(() => {
    const styleId = "universal-report-print-style";
    let style = document.getElementById(styleId) as HTMLStyleElement;
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    
    const pageMargin = selectedPaperSize === "A5" ? "8mm" : "15mm";
    style.innerHTML = `
      @media print {
        @page { size: ${selectedPaperSize} ${metadata.isLandscape ? "landscape" : "portrait"}; margin: ${pageMargin}; }
        
        /* A5 print overrides */
        article[data-paper-size="A5"] {
          width: ${metadata.isLandscape ? "210mm" : "148mm"} !important;
          height: ${metadata.isLandscape ? "148mm" : "210mm"} !important;
          padding: 6mm !important;
          font-size: 8.5px !important;
        }
        article[data-paper-size="A5"] h1,
        article[data-paper-size="A5"] h2 {
          font-size: 16px !important;
        }
        article[data-paper-size="A5"] table {
          font-size: 7.5px !important;
        }
        article[data-paper-size="A5"] th,
        article[data-paper-size="A5"] td {
          padding: 3px 4px !important;
        }
        article[data-paper-size="A5"] .w-12 {
          width: 2rem !important;
          height: 2rem !important;
        }
        article[data-paper-size="A5"] .text-2xl {
          font-size: 1.125rem !important;
        }
      }
      
      /* A5 Screen Preview Overrides */
      article[data-paper-size="A5"] {
        max-width: ${metadata.isLandscape ? "210mm" : "148mm"} !important;
        margin: 0 auto;
        font-size: 8.5px !important;
      }
    `;
  }, [selectedPaperSize, metadata.isLandscape]);

  const formattedDate = new Date().toLocaleDateString("fr-FR");
  const formattedTime = new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' });

  // 1. Excel/CSV Export Handler
  const handleExportSpreadsheet = (format: "excel" | "csv") => {
    try {
      toast.success(`Exportation en cours au format ${format.toUpperCase()}...`);
      
      let rowsData = table ? table.rows.map((row) => {
        const item: Record<string, any> = {};
        table.headers.forEach((header, idx) => {
          if (header.toLowerCase() !== "actions") {
            item[header] = row[idx];
          }
        });
        return item;
      }) : [];

      const worksheet = XLSX.utils.json_to_sheet(rowsData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Rapport");

      if (format === "excel") {
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${metadata.reportId}_${metadata.title.replace(/\s+/g, "_")}_${Date.now()}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const csvContent = XLSX.write(workbook, { bookType: "csv", type: "string" });
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${metadata.reportId}_${metadata.title.replace(/\s+/g, "_")}_${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      toast.success(`Fichier ${format.toUpperCase()} téléchargé avec succès.`);
    } catch (error) {
      toast.error("Erreur lors de la génération du fichier Excel/CSV.");
      console.error(error);
    }
  };

  // 2. jsPDF PDF Generation Handler (Amiri font for Arabic)
  const handleExportPDF = () => {
    try {
      toast.success("Génération du rapport PDF officiel...");
      const doc = new jsPDF({
        orientation: metadata.isLandscape !== false ? "landscape" : "portrait",
        unit: "mm",
        format: selectedPaperSize === "A5" ? "a5" : "a4",
      });

      ensureAmiriRegistered(doc);

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const startY = drawPDFHeader(doc, activeHeaderConfig, metadata.title);
      let currentY = startY + 8;

      if (kpis && kpis.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        drawTextBilingual(doc, "RÉSUMÉ DES INDICATEURS CLÉS", 10, currentY);
        doc.setDrawColor(226, 232, 240);
        doc.line(10, currentY + 2, pageWidth - 10, currentY + 2);
        currentY += 8;

        const boxWidth = (pageWidth - 20 - (kpis.length - 1) * 4) / kpis.length;
        kpis.forEach((kpi, idx) => {
          const sx = 10 + idx * (boxWidth + 4);
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(241, 245, 249);
          doc.rect(sx, currentY, boxWidth, 20, "DF");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          drawTextBilingual(doc, sanitizePDFText(kpi.label).toUpperCase(), sx + 3, currentY + 5);
          doc.setFontSize(12);
          doc.setTextColor(37, 99, 235);
          drawTextBilingual(doc, sanitizePDFText(kpi.value), sx + 3, currentY + 14);
          if (kpi.subtext) {
            doc.setFontSize(6);
            doc.setTextColor(148, 163, 184);
            drawTextBilingual(doc, sanitizePDFText(kpi.subtext), sx + 3, currentY + 19);
          }
        });
        currentY += 28;
      }

      if (table && table.rows.length > 0) {
        autoTable(doc, {
          startY: currentY,
          head: [table.headers.map((h) => sanitizePDFText(h))],
          body: table.rows.map((row) => row.map((cell) => sanitizePDFText(cell))),
          styles: { font: "helvetica", fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 10, right: 10 },
        });
        currentY = (doc as any).lastAutoTable.finalY + 8;

        if (table.summary && table.summary.length > 0) {
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(100, 116, 139);
          table.summary.forEach((sum, idx) => {
            drawTextBilingual(doc, sanitizePDFText(`${sum.label}: ${sum.value}`), 10 + idx * 60, currentY);
          });
          currentY += 8;
        }
      }

      if (metadata.description) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const splitDesc = doc.splitTextToSize(sanitizePDFText(metadata.description), pageWidth - 20);
        doc.text(splitDesc, 10, currentY);
      }

      doc.setFillColor(79, 70, 229);
      doc.rect(0, pageHeight - 10, pageWidth, 10, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text("Edut Pro – Système de Gestion Scolaire", 10, pageHeight - 3.5);
      doc.text(`Réf: ${metadata.reportId}`, pageWidth - 10, pageHeight - 3.5, { align: "right" });

      doc.save(`${metadata.reportId}_${metadata.title.replace(/\s+/g, "_")}.pdf`);
      toast.success("Rapport PDF téléchargé avec succès !");
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur lors de la génération du PDF.");
    }
  };

  // 3. Email Handler
  const handleSendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail) return;
    setIsSendingEmail(true);

    try {
      let success = true;
      if (onSendEmail) {
        success = await onSendEmail(recipientEmail);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      if (success) {
        toast.success(`Le rapport a été envoyé avec succès par e-mail à ${recipientEmail}`);
        setEmailModalOpen(false);
        setRecipientEmail("");
      } else {
        toast.error("Échec de l'envoi de l'e-mail.");
      }
    } catch (err) {
      toast.error("Une erreur s'est produite lors de l'envoi.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className={cn("space-y-6 text-slate-900 w-full", metadata.isLandscape && "print:w-[297mm] print:h-[210mm]")}>
      {metadata.isLandscape && (
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page {
              size: landscape !important;
              margin: 10mm !important;
            }
          }
        `}} />
      )}
      
      {/* ─── WEB CONTROLS HEADER (Hidden on print) ─── */}
      <header className="rounded-[30px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131622] p-5 shadow-sm print:hidden">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">{metadata.moduleName}</p>
              <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{metadata.title}</h2>
              {metadata.subtitle && <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-0.5">{metadata.subtitle}</p>}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Paper Size Selector */}
            <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 p-1">
              <button
                type="button"
                onClick={() => setSelectedPaperSize("A4")}
                className={`h-8 px-3 rounded-lg text-xs font-bold transition-all ${
                  selectedPaperSize === "A4"
                    ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => setSelectedPaperSize("A5")}
                className={`h-8 px-3 rounded-lg text-xs font-bold transition-all ${
                  selectedPaperSize === "A5"
                    ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                A5
              </button>
            </div>

            <button 
              onClick={handleExportPDF}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all"
            >
              <FileText size={15} className="text-rose-500" /> Exporter PDF
            </button>
            <button 
              onClick={() => handleExportSpreadsheet("excel")}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all"
            >
              <FileSpreadsheet size={15} className="text-emerald-600" /> Excel
            </button>
            <button 
              onClick={() => handleExportSpreadsheet("csv")}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all"
            >
              <Download size={15} className="text-slate-500" /> CSV
            </button>
            <button 
              onClick={() => setEmailModalOpen(true)}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all"
            >
              <Mail size={15} className="text-indigo-600 dark:text-indigo-400" /> E-mail
            </button>
            <button 
              onClick={() => window.print()}
              className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 dark:bg-indigo-600 px-5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all"
            >
              <Printer size={15} /> Imprimer
            </button>
          </div>
        </div>
      </header>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: ${metadata.isLandscape !== false ? "landscape" : "portrait"};
            margin: 5mm 6mm;
          }
          html, body, main, #__next, div, section, article {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
          }
          body {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          article[data-paper-size] {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          article[data-paper-size] div,
          article[data-paper-size] section,
          article[data-paper-size] table,
          article[data-paper-size] tr,
          article[data-paper-size] td {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            border-color: #cbd5e1 !important;
            box-shadow: none !important;
          }
          article[data-paper-size] th {
            background: #f1f5f9 !important;
            background-color: #f1f5f9 !important;
            color: #000000 !important;
            border-color: #cbd5e1 !important;
          }
          .french-text, .arabic-text, h1, h2, h3, p, span {
            color: #000000 !important;
          }
          * {
            box-shadow: none !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          ::-webkit-scrollbar {
            display: none !important;
          }
          .no-print, .print\\:hidden {
            display: none !important;
          }
        }
      `}} />

      {/* ─── PRINTABLE DOCUMENT WRAPPER ─── */}
      <article data-paper-size={selectedPaperSize} className="bg-white dark:bg-[#131622] rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm p-8 print:p-0 print:border-none print:shadow-none space-y-8 print:bg-white print:text-black">
        
        {/* ─── PRINTABLE OFFICIAL HEADER ─── */}
        <OfficialDocumentHeader config={activeHeaderConfig} title={metadata.title} />
        {/* ─── GENERAL SUMMARY SECTION ─── */}
        {kpis && kpis.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
              <ShieldCheck size={14} className="text-indigo-600 dark:text-indigo-400" /> Résumé Général
            </h3>
            
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2.5">
              {kpis.map((kpi, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 print:p-3 shadow-sm flex items-center justify-between gap-4 print:border-slate-300 print:bg-white">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">{kpi.label}</span>
                    <span className="text-2xl font-black text-slate-950 dark:text-white print:text-black mt-1 block">{kpi.value}</span>
                    {kpi.subtext && <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mt-0.5">{kpi.subtext}</span>}
                  </div>
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 print:hidden", kpi.bgColor, kpi.color)}>
                    {kpi.icon}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── DESCRIPTION / INFO SECTION ─── */}
        {metadata.description && (
          <div className="rounded-[24px] border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-5 print:p-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:border-slate-300 print:bg-white">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Info size={13} /> À propos de ce rapport
              </p>
              <p className="text-xs font-bold leading-relaxed text-slate-500 dark:text-slate-400 print:text-slate-600 max-w-2xl">{metadata.description}</p>
            </div>
            
            {/* QR Code and Reference */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500">VÉRIFICATION D'AUTHENTICITÉ</p>
                <p className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 print:text-slate-700 mt-0.5">{metadata.reportId}</p>
              </div>
              <div className="w-14 h-14 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-[8px] font-mono text-slate-400 dark:text-slate-500 select-none">
                [QR CODE]
              </div>
            </div>
          </div>
        )}

        {/* ─── DATA TABLE SECTION ─── */}
        {table && (
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2 print:text-black">
              <Building size={14} className="text-indigo-600 dark:text-indigo-400" /> Données détaillées
            </h3>
            
            <div className="overflow-x-auto print:overflow-visible rounded-[24px] border border-slate-100 dark:border-slate-800 print:border-slate-300">
              <table className="w-full border-collapse text-left text-sm print:text-xs print:border print:border-slate-300">
                <thead>
                  <tr className="bg-indigo-600 dark:bg-indigo-700 text-[10px] font-black uppercase tracking-widest text-white print:bg-slate-100 print:text-black print:border-b print:border-slate-300">
                    {table.headers.map((head, idx) => (
                      <th key={idx} className="px-5 py-4 first:rounded-tl-[24px] last:rounded-tr-[24px] print:rounded-none">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-bold text-slate-700 dark:text-slate-200 print:divide-slate-300 print:text-black">
                  {table.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors odd:bg-white dark:odd:bg-[#131622] even:bg-slate-50/30 dark:even:bg-slate-900/30 print:odd:bg-white print:even:bg-slate-50/30">
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="px-5 py-4">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Recapitulative Table Footer */}
            {table.summary && table.summary.length > 0 && (
              <div className="rounded-[20px] border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 flex flex-wrap gap-6 items-center justify-between text-xs font-black text-slate-700 dark:text-slate-200 print:bg-white print:border-slate-300 print:text-black">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Récapitulatif</span>
                <div className="flex flex-wrap gap-6">
                  {table.summary.map((sum, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      {sum.icon && <span className={sum.color}>{sum.icon}</span>}
                      <span>{sum.label} : <span className="text-slate-900 dark:text-white print:text-black">{sum.value}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── PRINT FOOTER / SIGNATURES ─── */}
        <div className="w-full border-t border-slate-100 pt-6 mt-10 print:border-slate-300 print:mt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-center">
            
            {/* Client signature */}
            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Le Client (Inspecteur / IEFA)</p>
              <div className="h-20 w-44 border border-dashed border-slate-200 rounded-2xl mx-auto flex items-center justify-center text-[10px] text-slate-400 italic print:border-slate-400">
                Signature & Cachet
              </div>
            </div>

            {/* Official Stamp */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-double border-indigo-200 bg-indigo-50/30 flex flex-col items-center justify-center text-center p-2 print:border-slate-400 print:bg-white">
                <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest leading-none">Edut Pro</span>
                <span className="text-[7px] font-bold text-slate-500 uppercase leading-normal">Système</span>
                <span className="text-[7px] font-bold text-slate-500 uppercase leading-none">Gestion Scolaire</span>
                <span className="text-[8px] text-indigo-500 mt-1">★</span>
              </div>
              <p className="text-[9px] font-black text-slate-400 mt-2 uppercase tracking-widest">Cachet Officiel</p>
            </div>

            {/* General Direction Signature */}
            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">La Direction Générale</p>
              <div className="h-20 w-44 border border-dashed border-slate-200 rounded-2xl mx-auto flex items-center justify-center text-[10px] text-slate-400 italic print:border-slate-400">
                Signature & Cachet
              </div>
            </div>

          </div>
        </div>

        {/* ─── DEDICATED PRINT METRICS FOOTER ─── */}
        <div className="hidden print:flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-widest border-t border-slate-200 pt-4 mt-6">
          <span>Edut Pro - Gestion Scolaire</span>
          <span className="text-indigo-600 italic">Merci pour votre confiance</span>
          <span>Page 1 / 1</span>
        </div>

      </article>

      {/* ─── EMAIL DIALOG MODAL (Hidden on print) ─── */}
      {emailModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.2rem] border border-slate-100 shadow-2xl max-w-md w-full p-8 relative">
            <button 
              onClick={() => setEmailModalOpen(false)}
              className="absolute right-6 top-6 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-black text-slate-950 mb-2">Envoyer par Email</h3>
            <p className="text-xs text-slate-400 font-bold mb-5">Le destinataire recevra un rapport PDF conforme à l'année en cours.</p>
            
            <form onSubmit={handleSendEmailSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase">Adresse Email du destinataire *</label>
                <input 
                  required 
                  type="email"
                  value={recipientEmail} 
                  onChange={e => setRecipientEmail(e.target.value)} 
                  placeholder="contact@ministere.ne" 
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" 
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setEmailModalOpen(false)} 
                  className="h-11 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={isSendingEmail}
                  className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 disabled:opacity-50"
                >
                  {isSendingEmail ? "Envoi..." : "Envoyer le mail"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
