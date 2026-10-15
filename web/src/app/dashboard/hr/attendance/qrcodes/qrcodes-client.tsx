"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  Printer,
  Download,
  Search,
  ArrowLeft,
  Grid,
  FileText,
  CheckCircle,
  Clock,
  User,
  BookOpen,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Layers,
  School,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import OfficialDocumentHeader from "@/domains/printing/components/OfficialDocumentHeader";
import {
  type DocumentHeaderConfig,
  mergeDocumentHeaderConfig,
} from "@/domains/printing/document-header";

interface ClassroomQRCodesProps {
  classes: any[];
  schoolName: string;
  headerConfig?: Partial<DocumentHeaderConfig> | null;
}

export default function ClassroomQRCodes({
  classes,
  schoolName,
  headerConfig,
}: ClassroomQRCodesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassForPreview, setSelectedClassForPreview] = useState<any | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [activeLevelFilter, setActiveLevelFilter] = useState("all");

  const cfg = useMemo(() => mergeDocumentHeaderConfig(headerConfig), [headerConfig]);

  // Extract unique educational levels
  const levelsList = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => {
      if (c.section?.educationalLevel) set.add(c.section.educationalLevel);
    });
    return Array.from(set);
  }, [classes]);

  // Filter classes by search query & educational level
  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const matchesSearch =
        c.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.section?.sectionName &&
          c.section.sectionName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.section?.educationalLevel &&
          c.section.educationalLevel.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesLevel =
        activeLevelFilter === "all" ||
        (c.section?.educationalLevel &&
          c.section.educationalLevel.toLowerCase() === activeLevelFilter.toLowerCase());

      return matchesSearch && matchesLevel;
    });
  }, [classes, searchQuery, activeLevelFilter]);

  const getQRValue = (classId: number) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://edut.pro";
    return `${baseUrl}/dashboard/hr/attendance/scan?classId=${classId}`;
  };

  // ─── A5 BATCH PDF EXPORT ENGINE ───────────────────────────────────────────
  const handleExportA5Pdf = async (singleClass?: any) => {
    try {
      setIsGeneratingPdf(true);
      const targetClasses = singleClass ? [singleClass] : filteredClasses;

      if (targetClasses.length === 0) {
        toast.error("Aucune classe sélectionnée pour l'export.");
        return;
      }

      const { jsPDF } = await import("jspdf");
      // A5 portrait format: 148 mm x 210 mm
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a5",
      });

      const pageW = 148;
      const pageH = 210;
      const margin = 8;
      const contentW = pageW - margin * 2;

      for (let idx = 0; idx < targetClasses.length; idx++) {
        if (idx > 0) doc.addPage("a5", "portrait");

        const cls = targetClasses[idx];
        let curY = 10;

        // Outer Decorative Frame
        doc.setDrawColor(30, 41, 59);
        doc.setLineWidth(0.8);
        doc.roundedRect(margin - 2, margin - 2, contentW + 4, pageH - margin * 2 + 4, 3, 3, "S");

        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin - 0.8, margin - 0.8, contentW + 1.6, pageH - margin * 2 + 1.6, 2, 2, "S");

        // Top Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text((cfg.country || "RÉPUBLIQUE DU NIGER").toUpperCase(), margin + 2, curY);
        doc.text(`Année : ${cfg.schoolYear || "2024 - 2025"}`, pageW - margin - 2, curY, { align: "right" });

        curY += 3.5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(cfg.ministry || "Ministère de l'Éducation Nationale", margin + 2, curY);

        curY += 4.5;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.line(margin + 2, curY, pageW - margin - 2, curY);

        curY += 6;

        // School Name Hero
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text((cfg.schoolName || schoolName || "ÉTABLISSEMENT SCOLAIRE").toUpperCase(), pageW / 2, curY, {
          align: "center",
        });

        curY += 4;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(99, 102, 241);
        doc.text("POINTAGE OFFICIEL DE PRÉSENCE DES ENSEIGNANTS", pageW / 2, curY, { align: "center" });

        curY += 6;

        // Classroom Name Hero Badge
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(148, 163, 184);
        doc.roundedRect(margin + 4, curY, contentW - 8, 14, 2, 2, "FD");

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(cls.className.toUpperCase(), pageW / 2, curY + 9, { align: "center" });

        if (cls.section?.sectionName) {
          doc.setFontSize(6.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`Section / Niveau : ${cls.section.sectionName}`, pageW / 2, curY + 12.8, { align: "center" });
        }

        curY += 18;

        // QR Code Box Frame
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(99, 102, 241);
        doc.setLineWidth(0.6);
        const qrBoxSize = 52;
        const qrBoxX = (pageW - qrBoxSize) / 2;
        doc.roundedRect(qrBoxX, curY, qrBoxSize, qrBoxSize, 2, 2, "FD");

        // Convert DOM SVG to image on canvas
        const svgEl = document.getElementById(`qr-svg-${cls.id}`);
        if (svgEl) {
          try {
            const svgString = new XMLSerializer().serializeToString(svgEl);
            const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
            const URL = window.URL || window.webkitURL || window;
            const blobURL = URL.createObjectURL(svgBlob);

            await new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = 400;
                canvas.height = 400;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                  ctx.fillStyle = "#FFFFFF";
                  ctx.fillRect(0, 0, 400, 400);
                  ctx.drawImage(img, 10, 10, 380, 380);
                  const pngData = canvas.toDataURL("image/png");
                  doc.addImage(pngData, "PNG", qrBoxX + 2, curY + 2, qrBoxSize - 4, qrBoxSize - 4);
                }
                URL.revokeObjectURL(blobURL);
                resolve();
              };
              img.onerror = () => {
                URL.revokeObjectURL(blobURL);
                resolve();
              };
              img.src = blobURL;
            });
          } catch (e) {
            console.error("QR Code image rendering error:", e);
          }
        }

        curY += qrBoxSize + 3;

        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(79, 70, 229);
        doc.text("SCANNER AVEC L'APPLICATION MOBILE EDUT PRO", pageW / 2, curY, { align: "center" });

        curY += 5;

        // ─── CONDITIONS & RÈGLES D'UTILISATION POUR LES ENSEIGNANTS ─────────
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.4);
        const rulesH = 46;
        doc.roundedRect(margin + 2, curY, contentW - 4, rulesH, 2, 2, "FD");

        // Rules Box Header
        doc.setFillColor(30, 41, 59);
        doc.rect(margin + 2, curY, contentW - 4, 5, "F");
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("CONDITIONS ET RÈGLES D'UTILISATION (ENSEIGNANTS)", pageW / 2, curY + 3.6, { align: "center" });

        const rules = [
          "1. Pointage Obligatoire : Scannez ce QR code dès l'entrée en salle avant le début du cours.",
          "2. Application Requise : Le scan s'effectue exclusivement avec l'application mobile Edut Enseignant.",
          "3. Horodatage & GPS : L'heure et la position de prise de service sont enregistrées automatiquement.",
          "4. Clôture de Séance : Effectuez le scan de sortie pour valider les heures de vacation / supplémentaires.",
          "5. Intégrité & Fraude : Tout scan à distance ou partage de code est strictement prohibé sous peine de sanctions.",
          "6. Incident Technique : Signalez immédiatement tout dysfonctionnement à la Direction des Études.",
        ];

        doc.setFontSize(5.8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 41, 59);

        rules.forEach((rule, rIdx) => {
          const ruleY = curY + 8.5 + rIdx * 6;
          doc.text(rule, margin + 5, ruleY);
        });

        curY += rulesH + 4;

        // Signatures & Administrative Stamp Box
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text(`Salle de Classe : ${cls.className}`, margin + 4, curY);
        doc.text("Visa & Cachet de la Direction des Études", pageW - margin - 4, curY, { align: "right" });

        curY += 8;
        doc.setDrawColor(203, 213, 225);
        doc.line(pageW - margin - 48, curY, pageW - margin - 4, curY);

        // Security footer
        doc.setFontSize(5);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Document Officiel A5 · Affichage obligatoire à l'entrée de la salle · Généré le ${new Date().toLocaleDateString(
            "fr-FR"
          )}`,
          pageW / 2,
          pageH - 3,
          { align: "center" }
        );
      }

      const fileName = singleClass
        ? `QR_A5_${singleClass.className.replace(/\s+/g, "_")}.pdf`
        : `QR_CODES_A5_SALLES_${(cfg.schoolName || "ECOLE").replace(/\s+/g, "_")}.pdf`;

      doc.save(fileName);
      toast.success(
        singleClass
          ? `QR Code A5 pour ${singleClass.className} téléchargé !`
          : `Lot de ${targetClasses.length} QR Codes A5 généré avec succès !`
      );
    } catch (err: any) {
      console.error("PDF generation error:", err);
      toast.error("Erreur lors de la génération du PDF A5.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      {/* ─── PRINT ONLY STYLESHEET FOR A5 FORMAT ──────────────────────────── */}
      <style jsx global>{`
        @media print {
          @page {
            size: A5 portrait;
            margin: 6mm;
          }
          body {
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          nav,
          aside,
          header,
          footer,
          button,
          .no-print,
          input,
          .breadcrumbs {
            display: none !important;
          }
          .print-area {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .a5-print-card {
            width: 100% !important;
            height: 98vh !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            border: 2px solid #0f172a !important;
            border-radius: 16px !important;
            padding: 16px !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            align-items: center !important;
            background-color: white !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      {/* ─── Top Main Header (No-Print) ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-[#131622]/90 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm no-print">
        <div className="space-y-1">
          <Link
            href="/dashboard/hr"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors breadcrumbs mb-1 block"
          >
            <ArrowLeft size={14} /> Retour à l'Annuaire RH
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              QR Codes des Salles de Classe (Format A5)
            </h1>
            <span className="text-lg font-bold text-slate-400 font-arabic">بطاقات الحضور للفصول A5</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">
            Génération conforme A5 avec charte officielle de l'établissement et règles d'utilisation pour les enseignants.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => handleExportA5Pdf()}
            disabled={isGeneratingPdf}
            className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Download size={16} />
            {isGeneratingPdf ? "Génération..." : "Télécharger Tout en PDF (A5)"}
          </Button>

          <Button
            onClick={() => window.print()}
            variant="outline"
            className="h-11 px-5 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex items-center gap-2"
          >
            <Printer size={16} />
            Imprimer Tout (Format A5)
          </Button>
        </div>
      </div>

      {/* ─── Official Header Linkage Banner ─────────────────────────────────── */}
      {headerConfig && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm no-print">
          <div className="flex items-center gap-3.5">
            {headerConfig.leftLogo || headerConfig.centerLogo ? (
              <img
                src={headerConfig.leftLogo || headerConfig.centerLogo}
                alt="Logo Établissement"
                className="w-12 h-12 object-contain rounded-2xl border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs shrink-0 border border-indigo-100 dark:border-indigo-900">
                <School className="size-6" />
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {headerConfig.schoolName || "ÉTABLISSEMENT SCOLAIRE"}
                </h4>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  En-tête Officiel Lié aux QR Codes
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Format : A5 Portrait (148 × 210 mm)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                {headerConfig.country || "RÉPUBLIQUE"} • {headerConfig.ministry || "Ministère de l'Éducation"} • Année {headerConfig.schoolYear || "2024 - 2025"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <Link
              href="/dashboard/settings/headers"
              className="px-4 py-2 text-xs font-black rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <ExternalLink className="size-3.5" />
              Designer d'En-tête
            </Link>
          </div>
        </div>
      )}

      {/* ─── Search & Level Filter (No-Print) ──────────────────────────────── */}
      <div className="bg-white dark:bg-[#131622]/90 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="relative w-full md:w-[400px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            placeholder="Rechercher une classe (ex: Terminale D, 6ème A)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 h-12 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none text-xs font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setActiveLevelFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeLevelFilter === "all"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Tous ({classes.length})
          </button>
          {levelsList.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setActiveLevelFilter(lvl)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize ${
                activeLevelFilter === lvl
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* ─── GRID OF CLASSROOM A5 CARDS ────────────────────────────────────── */}
      <div className="print-area">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls) => {
            const qrVal = getQRValue(cls.id);

            return (
              <div
                key={cls.id}
                className="a5-print-card bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border-2 border-slate-200 dark:border-slate-800 shadow-md hover:shadow-xl transition-all flex flex-col justify-between items-center text-center relative overflow-hidden"
              >
                {/* Top Section */}
                <div className="w-full space-y-3">
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                    <span>{cfg.country || "RÉPUBLIQUE"}</span>
                    <span>Année : {cfg.schoolYear || "2024 - 2025"}</span>
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                      {cfg.schoolName || schoolName}
                    </h4>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                      {cls.className}
                    </h2>
                    {cls.section?.sectionName && (
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                        Niveau : {cls.section.sectionName}
                      </span>
                    )}
                  </div>
                </div>

                {/* QR Code Center Box */}
                <div className="my-4 p-4 bg-white rounded-3xl border-2 border-indigo-100 shadow-inner flex flex-col items-center justify-center">
                  <QRCodeSVG
                    id={`qr-svg-${cls.id}`}
                    value={qrVal}
                    size={160}
                    level="H"
                    includeMargin={false}
                  />
                  <span className="text-[9px] font-mono font-black text-indigo-900 mt-2 tracking-wider uppercase">
                    SCANNER POUR PRÉSENCE
                  </span>
                </div>

                {/* ─── CONDITIONS D'UTILISATION POUR LES ENSEIGNANTS ───────── */}
                <div className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-left space-y-2 text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-1">
                    <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
                    <span>Règles d'Utilisation Enseignants (A5)</span>
                  </div>
                  <ul className="text-[10px] space-y-1 font-medium leading-tight">
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-black">•</span>
                      <span><strong>Pointage d'arrivée :</strong> Scannez à l'entrée en salle avant le début effectif du cours.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-indigo-600 font-black">•</span>
                      <span><strong>Application mobile :</strong> Utilisez exclusivement l'application <em>Edut Pro</em>.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-600 font-black">•</span>
                      <span><strong>Horodatage & Validation :</strong> Les heures et la géolocalisation sont certifiées.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-rose-600 font-black">•</span>
                      <span><strong>Fraude interdite :</strong> Tout scan à distance est strictement sanctionné.</span>
                    </li>
                  </ul>
                </div>

                {/* Signatures and Administrative Stamp (Printed Footer) */}
                <div className="w-full pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-end text-[9px] font-bold text-slate-400">
                  <span>Réf : QR-CLS-{cls.id}</span>
                  <span>Cachet & Visa de la Direction</span>
                </div>

                {/* Actions (Hidden in Print) */}
                <div className="flex items-center gap-2 w-full mt-4 no-print pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleExportA5Pdf(cls)}
                    disabled={isGeneratingPdf}
                    className="flex-1 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-black flex items-center justify-center gap-1.5 border border-indigo-200 dark:border-indigo-800 transition"
                  >
                    <Download size={14} /> PDF A5
                  </button>
                  <button
                    onClick={() => setSelectedClassForPreview(cls)}
                    className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1 transition"
                    title="Aperçu Format A5"
                  >
                    <Eye size={14} /> Aperçu A5
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── A5 PREVIEW MODAL ──────────────────────────────────────────────── */}
      {selectedClassForPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-600" />
                <h3 className="font-black text-lg text-slate-900 dark:text-white">
                  Aperçu Fiche A5 : {selectedClassForPreview.className}
                </h3>
              </div>
              <button
                onClick={() => setSelectedClassForPreview(null)}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* A5 Card Mockup */}
            <div className="w-full p-6 border-2 border-dashed border-indigo-200 dark:border-indigo-900 rounded-3xl bg-slate-50/50 dark:bg-slate-950 flex flex-col items-center text-center space-y-4">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                {cfg.schoolName} · A5 (148 × 210 mm)
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase">
                {selectedClassForPreview.className}
              </h2>
              <div className="p-3 bg-white rounded-2xl shadow">
                <QRCodeSVG
                  value={getQRValue(selectedClassForPreview.id)}
                  size={140}
                  level="H"
                />
              </div>
              <div className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] text-left space-y-1">
                <span className="font-black text-indigo-600 block">Règles d'utilisation :</span>
                <p>1. Pointage obligatoire au début de chaque heure de cours.</p>
                <p>2. Validation avec l'application mobile Edut Enseignant.</p>
                <p>3. Émargement de sortie pour calcul des vacations/heures supp.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => handleExportA5Pdf(selectedClassForPreview)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs"
              >
                <Download size={15} /> Télécharger PDF A5
              </Button>
              <Button
                onClick={() => window.print()}
                variant="outline"
                className="flex-1 font-bold text-xs"
              >
                <Printer size={15} /> Imprimer A5
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
