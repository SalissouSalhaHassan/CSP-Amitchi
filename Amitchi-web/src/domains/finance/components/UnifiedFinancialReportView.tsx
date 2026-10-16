"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Calendar,
  Filter,
  Download,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  AlertCircle,
  CheckCircle2,
  PieChart as PieChartIcon,
  BarChart3,
  Building2,
  CreditCard,
  Banknote,
  Smartphone,
  Layers,
  Sparkles,
  Printer,
  FileText,
  Loader2,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getUnifiedFinancialReport } from "@/domains/finance/actions/finance.actions";
import OfficialDocumentHeader from "@/domains/printing/components/OfficialDocumentHeader";
import { 
  getActiveLevelHeaderConfig, 
  isHigherEducationLevel,
  inferEducationalLevel,
  type DocumentHeaderConfig 
} from "@/domains/printing/document-header";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { amiriFontBase64 } from "@/domains/printing/utils/amiri-font";
import { hasArabicCharacters, reshapeArabicText } from "@/domains/printing/utils/arabic-reshaper";

interface UnifiedReportProps {
  schoolName?: string;
  activeSessionName?: string;
  headerConfig?: any | null;
}

export function UnifiedFinancialReportView({
  schoolName = "Établissement",
  activeSessionName = "2025–2026",
  headerConfig: initialHeaderConfig = null,
}: UnifiedReportProps) {
  const [period, setPeriod] = useState<"daily" | "monthly" | "yearly" | "all">("monthly");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedLevel, setSelectedLevel] = useState<string>("Tous");
  const [loading, setLoading] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [headerConfig, setHeaderConfig] = useState<any>(initialHeaderConfig || null);

  // Automatically fetch latest official document header config if not passed or when mounted
  useEffect(() => {
    if (initialHeaderConfig) {
      setHeaderConfig(initialHeaderConfig);
    } else {
      import("@/domains/settings/actions/settings.actions").then(({ getDocumentHeaderConfig }) => {
        getDocumentHeaderConfig().then((res) => {
          if (res?.data) {
            const cfg = (res.data as any).data || res.data;
            setHeaderConfig(cfg);
          }
        }).catch((err) => console.warn("[UnifiedReport] Header config fetch fallback:", err));
      });
    }
  }, [initialHeaderConfig]);

  // Available educational levels from headerProfiles and standards
  const availableLevels = React.useMemo(() => {
    const list = ["Tous", "Maternelle", "Primaire", "Collège", "Lycée", "Université"];
    if (headerConfig?.levelProfiles && Array.isArray(headerConfig.levelProfiles)) {
      headerConfig.levelProfiles.forEach((p: any) => {
        if (p?.name && !list.includes(p.name)) list.push(p.name);
        if (Array.isArray(p?.applicableLevels)) {
          p.applicableLevels.forEach((al: string) => {
            if (al && !list.includes(al)) list.push(al);
          });
        }
      });
    }
    return list;
  }, [headerConfig]);

  // Determine effective target level: if selectedLevel is specific, or infer from recent transactions
  const effectiveLevel = React.useMemo(() => {
    if (selectedLevel !== "Tous") return selectedLevel;
    const payments = reportData?.transactions?.recentPayments || [];
    for (const p of payments) {
      if (p.educationalLevel && p.educationalLevel !== "Tous") return p.educationalLevel;
      if (p.classe && p.classe !== "-") {
        const inferred = inferEducationalLevel(p.classe);
        if (inferred) return inferred;
      }
    }
    return null;
  }, [selectedLevel, reportData]);

  // Dynamically resolved official document header based on educational level (French only / No Arabic)
  const resolvedHeader = React.useMemo(() => {
    const base = getActiveLevelHeaderConfig(headerConfig || { schoolName }, effectiveLevel);
    return {
      ...base,
      schoolNameAr: "",
      countryAr: "",
      ministryAr: "",
      regionalDirectionAr: "",
      departmentalDirectionAr: "",
      inspectionAr: "",
      communeAr: "",
      campusSubtitleAr: "",
      serviceAr: "",
      mottoAr: "",
    };
  }, [headerConfig, schoolName, effectiveLevel]);

  const isHigherEd = isHigherEducationLevel(effectiveLevel || "");

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await getUnifiedFinancialReport({
        period,
        selectedDate,
        educationalLevel: selectedLevel !== "Tous" ? selectedLevel : undefined,
      });
      if (res.success && res.data) {
        setReportData(res.data);
        return;
      }
      if (res.error) {
        throw new Error(res.error);
      }
    } catch (err: any) {
      console.warn("[UnifiedReport] Remote fetch failed, computing from local IndexedDB cache:", err);
      // Local IndexedDB offline fallback
      try {
        const { getCachedStudentFees } = await import("@/infrastructure/local-db/cache");
        const cached = await getCachedStudentFees();
        if (cached && cached.length > 0) {
          const totalRevenue = cached.reduce((sum: number, f: any) => sum + (Number(f.totalPaid) || 0), 0);
          const totalExpected = cached.reduce((sum: number, f: any) => sum + (Number(f.totalExpected) || 0), 0);
          const totalDebts = cached.reduce((sum: number, f: any) => sum + Math.max(0, Number(f.balance) || 0), 0);

          const localAllPayments: any[] = [];
          cached.forEach((f: any) => {
            if (Array.isArray(f.payments)) {
              f.payments.forEach((p: any) => {
                localAllPayments.push({
                  id: p.id,
                  date: p.datePaid,
                  amount: p.amount,
                  mode: p.paymentMode || "Espèces",
                  reference: p.reference,
                  studentName: f.student?.nomEtudiant || "Élève",
                  classe: f.student?.classe || "-",
                  educationalLevel: f.student?.educationalLevel,
                });
              });
            }
          });

          setReportData({
            period,
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
            summary: {
              totalRevenueCollected: totalRevenue,
              totalExpensesSpent: 0,
              netCashFlow: totalRevenue,
              totalExpectedGlobal: totalExpected,
              totalRemainingDebts: totalDebts,
              expenseRatio: 0,
            },
            breakdowns: {
              expensesByCategory: [],
              paymentsByMode: [{ mode: "Données Locales", amount: totalRevenue }],
            },
            transactions: {
              recentPayments: localAllPayments.slice(0, 50),
              recentExpenses: [],
              allPaymentsCount: localAllPayments.length,
              allExpensesCount: 0,
            },
          });
          toast.info("Rapport généré depuis les données locales (Mode Hors-ligne).");
          return;
        }
      } catch (cacheErr) {
        console.warn("[UnifiedReport] Local cache fallback error:", cacheErr);
      }

      toast.error(err?.message || "Erreur lors de la génération du rapport financier unifié.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period, selectedDate, selectedLevel]);

  const summary = reportData?.summary || {
    totalRevenueCollected: 0,
    totalExpensesSpent: 0,
    netCashFlow: 0,
    totalExpectedGlobal: 0,
    totalRemainingDebts: 0,
    expenseRatio: 0,
  };

  const breakdowns = reportData?.breakdowns || {
    expensesByCategory: [],
    paymentsByMode: [],
  };

  const formatCfa = (amount: number) => {
    const rounded = Math.round(Number(amount) || 0);
    return `${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} CFA`;
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getPeriodLabel = () => {
    if (period === "daily") {
      return `Bilan Journalier du ${formatDateDisplay(selectedDate)}`;
    }
    if (period === "monthly") {
      try {
        const d = new Date(selectedDate);
        const monthName = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
        return `Bilan Mensuel — ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
      } catch {
        return `Bilan Mensuel (${selectedDate.slice(0, 7)})`;
      }
    }
    if (period === "yearly") {
      return `Bilan Annuel (${selectedDate.slice(0, 4)})`;
    }
    return "Bilan Global Consolidé (Toutes périodes)";
  };

  // Direct Browser Print
  const handlePrint = () => {
    window.print();
  };

  // Dedicated Vector PDF Export with jsPDF + autoTable
  const handleExportPDF = async () => {
    try {
      setIsExportingPdf(true);
      toast.loading("Génération du rapport PDF officiel...", { id: "pdf-export" });

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const W = 210;
      const H = 297;
      const margin = 14;

      // Arabic font support if available
      if (amiriFontBase64) {
        try {
          doc.addFileToVFS("Amiri-Regular.ttf", amiriFontBase64);
          doc.addFont("Amiri-Regular.ttf", "Amiri", "normal", "Identity-H");
        } catch (e) {
          console.warn("[UnifiedReport] Font registration warning:", e);
        }
      }

      // Institutional Header & Logo from dynamically resolved level profile
      const activeSchool = resolvedHeader?.schoolName || headerConfig?.schoolName || schoolName || "GROUPE SCOLAIRE";
      const activeAddress = resolvedHeader?.address || headerConfig?.address || "Niamey, Niger";
      const activePhone = resolvedHeader?.phone || headerConfig?.phone || "+227 90 00 00 00";
      const activeEmail = resolvedHeader?.email || headerConfig?.email || "contact@edut.pro";
      const activeCountry = resolvedHeader?.country || headerConfig?.country || "RÉPUBLIQUE DU NIGER";
      const activeMinistry = resolvedHeader?.ministry || headerConfig?.ministry || (isHigherEd ? "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE" : "Ministère de l'Éducation Nationale");
      const activeService = resolvedHeader?.service || headerConfig?.service || (isHigherEd ? "Agence Comptable Universitaire" : "Service de l'Intendance & Comptabilité");
      const activeLogo = resolvedHeader?.centerLogo || resolvedHeader?.leftLogo || resolvedHeader?.rightLogo || headerConfig?.centerLogo || headerConfig?.leftLogo || "";

      // Top colored accent bar
      doc.setFillColor(15, 23, 42); // Slate 900
      doc.rect(0, 0, W, 2.5, "F");

      // Draw Institutional Header
      let headerEndY = 28;
      const logoSize = 18;
      const logoTop = 6;

      if (activeLogo) {
        try {
          doc.addImage(activeLogo, "PNG", W / 2 - logoSize / 2, logoTop, logoSize, logoSize);
        } catch (_) {}
      }

      // Left Column (French Official Header)
      const leftColWidth = activeLogo ? 65 : 100;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(activeCountry.toUpperCase(), margin, 9);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(activeMinistry, margin, 13);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(activeSchool.toUpperCase(), margin, 18.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(activeService, margin, 22.5);
      doc.text(`${activeAddress} | Tél: ${activePhone}`, margin, 26);

      // Right Column (Session & Date Meta)
      const rightColX = W - margin;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(79, 70, 229);
      doc.text(`SESSION : ${activeSessionName}`, rightColX, 18.5, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`Édité le : ${new Date().toLocaleDateString("fr-FR")}`, rightColX, 23, { align: "right" });
      doc.text(`Période : ${getPeriodLabel()}`, rightColX, 26, { align: "right" });

      headerEndY = 29;

      // Divider Line below Header
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.line(margin, headerEndY, W - margin, headerEndY);

      // Report Banner
      const bannerY = headerEndY + 3;
      doc.setFillColor(79, 70, 229); // Indigo 600
      doc.roundedRect(margin, bannerY, W - 2 * margin, 12, 1.5, 1.5, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text("RAPPORT FINANCIER UNIFIÉ (RECETTES VS DÉPENSES)", margin + 6, bannerY + 6.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(224, 231, 255);
      doc.text(getPeriodLabel().toUpperCase(), margin + 6, bannerY + 10);

      // 4 Main KPI Cards
      const cardY = bannerY + 15;
      const cardWidth = (W - 2 * margin - 9) / 4;
      const cardHeight = 21;

      // Card 1: Recettes
      doc.setFillColor(240, 253, 244); // emerald-50
      doc.setDrawColor(187, 247, 208);
      doc.roundedRect(margin, cardY, cardWidth, cardHeight, 1.5, 1.5, "FD");
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(22, 101, 52);
      doc.text("RECETTES ENCAISSÉES", margin + 3.5, cardY + 5.5);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(formatCfa(summary.totalRevenueCollected), margin + 3.5, cardY + 12.5);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      doc.text("Frais de scolarité perçus", margin + 3.5, cardY + 17.5);

      // Card 2: Dépenses
      const c2X = margin + cardWidth + 3;
      doc.setFillColor(255, 241, 242); // rose-50
      doc.setDrawColor(254, 205, 211);
      doc.roundedRect(c2X, cardY, cardWidth, cardHeight, 1.5, 1.5, "FD");
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(159, 18, 57);
      doc.text("CHARGES & DÉPENSES", c2X + 3.5, cardY + 5.5);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(formatCfa(summary.totalExpensesSpent), c2X + 3.5, cardY + 12.5);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      doc.text(`Taux absorption : ${summary.expenseRatio}%`, c2X + 3.5, cardY + 17.5);

      // Card 3: Solde Net (Trésorerie)
      const c3X = c2X + cardWidth + 3;
      const isPositive = summary.netCashFlow >= 0;
      doc.setFillColor(isPositive ? 238 : 254, isPositive ? 242 : 243, isPositive ? 255 : 199);
      doc.setDrawColor(isPositive ? 199 : 253, isPositive ? 210 : 230, isPositive ? 254 : 138);
      doc.roundedRect(c3X, cardY, cardWidth, cardHeight, 1.5, 1.5, "FD");
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(isPositive ? 67 : 180, isPositive ? 56 : 83, isPositive ? 202 : 9);
      doc.text("SOLDE NET TRÉSORERIE", c3X + 3.5, cardY + 5.5);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(formatCfa(summary.netCashFlow), c3X + 3.5, cardY + 12.5);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      doc.text(isPositive ? "Excédent disponible" : "Déficit d'exploitation", c3X + 3.5, cardY + 17.5);

      // Card 4: Reste à Recouvrer (Créances)
      const c4X = c3X + cardWidth + 3;
      doc.setFillColor(254, 243, 199); // amber-50
      doc.setDrawColor(253, 230, 138);
      doc.roundedRect(c4X, cardY, cardWidth, cardHeight, 1.5, 1.5, "FD");
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(180, 83, 9);
      doc.text("CRÉANCES / IMPAYÉS", c4X + 3.5, cardY + 5.5);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(formatCfa(summary.totalRemainingDebts), c4X + 3.5, cardY + 12.5);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      doc.text("Reste à recouvrer élèves", c4X + 3.5, cardY + 17.5);

      // ── SECTION: REPARTITION TABLES (SIDE BY SIDE IN AUTOTABLE) ──
      const breakdownY = cardY + cardHeight + 6;

      // Table 1: Dépenses par catégorie
      const catRows = breakdowns.expensesByCategory.length > 0 
        ? breakdowns.expensesByCategory.map((c: any) => [
            c.category,
            formatCfa(c.amount),
            summary.totalExpensesSpent > 0 ? `${Math.round((c.amount / summary.totalExpensesSpent) * 100)}%` : "0%"
          ])
        : [["Aucune dépense", "0 CFA", "0%"]];

      autoTable(doc, {
        startY: breakdownY,
        head: [["Catégorie de Dépense", "Montant", "Part"]],
        body: catRows,
        margin: { left: margin, right: W / 2 + 3 },
        styles: { fontSize: 7, cellPadding: 2.2 },
        headStyles: { fillColor: [159, 18, 57], textColor: 255, fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 42 },
          1: { cellWidth: 32, halign: "right", fontStyle: "bold" },
          2: { cellWidth: 14, halign: "center" },
        },
        alternateRowStyles: { fillColor: [255, 241, 242] },
      });

      const catTableBottom = (doc as any).lastAutoTable.finalY;

      // Table 2: Recettes par mode de paiement
      const modeRows = breakdowns.paymentsByMode.length > 0
        ? breakdowns.paymentsByMode.map((m: any) => [
            m.mode,
            formatCfa(m.amount),
            summary.totalRevenueCollected > 0 ? `${Math.round((m.amount / summary.totalRevenueCollected) * 100)}%` : "0%"
          ])
        : [["Aucun encaissement", "0 CFA", "0%"]];

      autoTable(doc, {
        startY: breakdownY,
        head: [["Canal d'Encaissement", "Montant", "Part"]],
        body: modeRows,
        margin: { left: W / 2 + 3, right: margin },
        styles: { fontSize: 7, cellPadding: 2.2 },
        headStyles: { fillColor: [22, 101, 52], textColor: 255, fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 42 },
          1: { cellWidth: 32, halign: "right", fontStyle: "bold" },
          2: { cellWidth: 14, halign: "center" },
        },
        alternateRowStyles: { fillColor: [240, 253, 244] },
      });

      const modeTableBottom = (doc as any).lastAutoTable.finalY;
      const nextY = Math.max(catTableBottom, modeTableBottom) + 7;

      // ── SECTION: RECENT TRANSACTIONS JOURNAL TABLE ──
      const payList = reportData?.transactions?.recentPayments || [];
      const expList = reportData?.transactions?.recentExpenses || [];
      const studentLabel = isHigherEd ? "Étudiant" : "Élève";
      const classLabel = isHigherEd ? "Filière" : "Classe";
      const paymentRows = payList.length > 0
        ? payList.slice(0, 20).map((p: any, idx: number) => [
            String(idx + 1),
            formatDateDisplay(p.date),
            p.reference || "-",
            p.studentName || studentLabel,
            p.classe || "-",
            p.monthConcerned ? `Scolarité (${p.monthConcerned})` : (p.description || "Frais scolaires"),
            p.mode || "Espèces",
            `+${formatCfa(p.amount || 0)}`,
          ])
        : [["-", "-", "-", "Aucune transaction enregistrée", "-", "-", "-", "0 CFA"]];

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text("EXTRAIT DU JOURNAL DES RECETTES (DERNIERS ENCAISSEMENTS)", margin, nextY);

      autoTable(doc, {
        startY: nextY + 3,
        head: [["N°", "Date", "Référence", studentLabel, classLabel, "Motif / Description", "Mode", "Montant Encaissé"]],
        body: paymentRows,
        margin: { left: margin, right: margin },
        styles: { fontSize: 6.8, cellPadding: 2 },
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 7, halign: "center" },
          1: { cellWidth: 20, halign: "center" },
          2: { cellWidth: 24, font: "courier", halign: "center" },
          3: { cellWidth: 38, fontStyle: "bold" },
          4: { cellWidth: 18 },
          5: { cellWidth: 42 },
          6: { cellWidth: 18, halign: "center" },
          7: { cellWidth: 27, halign: "right", fontStyle: "bold", textColor: [22, 101, 52] },
        },
      });

      let currentTableBottom = (doc as any).lastAutoTable.finalY;

      // Table des Dépenses Récentes avec Motif / Description dans le PDF si disponibles
      if (expList.length > 0) {
        const expStartY = currentTableBottom + 6;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text("EXTRAIT DU JOURNAL DES CHARGES & DÉPENSES (SORTIES)", margin, expStartY);

        const expRows = expList.slice(0, 15).map((e: any, idx: number) => [
          String(idx + 1),
          formatDateDisplay(e.date),
          e.reference || "-",
          e.category || "Général",
          e.description || e.category || "Dépense",
          e.paymentMode || "Espèces",
          `-${formatCfa(e.amount || 0)}`,
        ]);

        autoTable(doc, {
          startY: expStartY + 3,
          head: [["N°", "Date", "Référence", "Catégorie", "Motif / Description", "Mode", "Montant Dépensé"]],
          body: expRows,
          margin: { left: margin, right: margin },
          styles: { fontSize: 6.8, cellPadding: 2 },
          headStyles: { fillColor: [159, 18, 57], textColor: 255, fontStyle: "bold" },
          columnStyles: {
            0: { cellWidth: 7, halign: "center" },
            1: { cellWidth: 20, halign: "center" },
            2: { cellWidth: 24, font: "courier", halign: "center" },
            3: { cellWidth: 30 },
            4: { cellWidth: 50, fontStyle: "bold" },
            5: { cellWidth: 22, halign: "center" },
            6: { cellWidth: 32, halign: "right", fontStyle: "bold", textColor: [159, 18, 57] },
          },
        });
        currentTableBottom = (doc as any).lastAutoTable.finalY;
      }

      // Signatures & Official Stamp Footer
      const finalTableY = currentTableBottom;
      const signY = Math.min(finalTableY + 8, H - 35);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, signY, W - margin, signY);

      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      const signLeftTitle = isHigherEd ? "L'Agent Comptable / Trésorier" : "L'Intendant / Caissier";
      const signRightTitle = isHigherEd ? "Le Directeur Général / Recteur" : "Le Chef d'Établissement";
      doc.text(signLeftTitle, margin + 15, signY + 6);
      doc.text(signRightTitle, W - margin - 55, signY + 6);

      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text("(Cachet et Signature)", margin + 22, signY + 18);
      doc.text("(Signature)", W - margin - 45, signY + 18);

      // Bottom Security String
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text(`Document officiel généré par Edut Pro — Système de gestion scolaire unifiée`, margin, H - 7);
      doc.text(`Page 1 / 1`, W - margin, H - 7, { align: "right" });

      const safePeriodName = period === "daily" ? `Jour_${selectedDate}` : period === "monthly" ? `Mois_${selectedDate.slice(0, 7)}` : period;
      doc.save(`Rapport_Financier_Unifie_${safePeriodName}_${Date.now()}.pdf`);

      toast.dismiss("pdf-export");
      toast.success("Rapport financier PDF exporté avec succès !");
    } catch (err: any) {
      console.error("[UnifiedReport] PDF export error:", err);
      toast.dismiss("pdf-export");
      toast.error(err?.message || "Erreur lors de la génération du PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER & PERIOD SELECTOR (SCREEN & PRINT CONTROLS) ── */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 print:hidden">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none">
              <Scale className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Rapport Financier Unifié (Recettes vs Dépenses)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Bilan consolidé : Frais de scolarité perçus, Charges décaissées et Solde net de trésorerie.
          </p>
        </div>

        {/* PERIOD TOGGLES & ACTIONS */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setPeriod("daily")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === "daily"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Jour
            </button>
            <button
              onClick={() => setPeriod("monthly")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === "monthly"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Mois
            </button>
            <button
              onClick={() => setPeriod("yearly")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === "yearly"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Année
            </button>
            <button
              onClick={() => setPeriod("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === "all"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Global
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type={period === "yearly" ? "number" : period === "monthly" ? "month" : "date"}
              value={
                period === "yearly"
                  ? selectedDate.slice(0, 4)
                  : period === "monthly"
                  ? selectedDate.slice(0, 7)
                  : selectedDate
              }
              onChange={(e) => {
                const val = e.target.value;
                if (period === "yearly") setSelectedDate(`${val}-01-01`);
                else if (period === "monthly") setSelectedDate(`${val}-01`);
                else setSelectedDate(val);
              }}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            {/* Direct Window Print */}
            <Button
              onClick={handlePrint}
              variant="outline"
              className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-bold gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Imprimer directement via le navigateur"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              Imprimer
            </Button>

            {/* Vector PDF Export */}
            <Button
              onClick={handleExportPDF}
              disabled={isExportingPdf || loading}
              className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 shadow-sm shadow-indigo-200 dark:shadow-none"
              title="Télécharger le fichier PDF officiel"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              Exporter PDF
            </Button>
          </div>
        </div>

        {/* ── EDUCATIONAL LEVEL / CYCLE SELECTOR ── */}
        {availableLevels.length > 1 && (
          <div className="w-full flex items-center gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mr-2 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              Cycle / Niveau :
            </span>
            {availableLevels.map((lvl) => {
              const isSelected = selectedLevel === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {lvl}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── OFFICIAL DOCUMENT HEADER (GESTION DES PROFILS D'EN-TÊTES) ── */}
      <div className="bg-white dark:bg-[#111827] text-slate-900 dark:text-white rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm transition-all print:p-0 print:border-none print:shadow-none print:bg-white print:text-black">
        <OfficialDocumentHeader
          config={resolvedHeader}
          title=""
        />
        <div className="flex flex-wrap justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400 border-t border-slate-200/80 dark:border-slate-800 pt-3 mt-4 print:text-black print:border-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="text-indigo-600 dark:text-indigo-400 font-black">●</span>
            Période : {getPeriodLabel()}
          </span>
          <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
            SESSION : {activeSessionName} &nbsp;|&nbsp; Édité le : {new Date().toLocaleDateString("fr-FR")}
          </span>
        </div>
      </div>

      {/* ── TITLE BANNER (RAPPORT FINANCIER UNIFIÉ) ── */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-4 sm:p-5 shadow-sm">
        <h3 className="text-base sm:text-lg font-black uppercase tracking-wide">
          RAPPORT FINANCIER UNIFIÉ (RECETTES VS DÉPENSES)
        </h3>
        <p className="text-xs text-blue-100 font-bold uppercase tracking-wider mt-0.5">
          {getPeriodLabel()}
        </p>
      </div>

      {/* ── 3 PILLARS KPI CARDS: PAYÉ vs CONSOMMÉ vs SOLDE & DETTES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
        {/* Recettes Collectées (Payé) */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm relative overflow-hidden print:border-slate-300 print:p-3">
          <div className="flex items-center justify-between mb-3 print:mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 print:text-slate-600">
              Recettes Encaissées
            </span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold print:hidden">
              <ArrowDownRight size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono print:text-lg">
            {formatCfa(summary.totalRevenueCollected)}
          </div>
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1 print:text-[9px]">
            Frais scolaires perçus sur la période
          </p>
        </div>

        {/* Dépenses Consommées */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm relative overflow-hidden print:border-slate-300 print:p-3">
          <div className="flex items-center justify-between mb-3 print:mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 print:text-slate-600">
              Charges & Dépenses
            </span>
            <div className="w-9 h-9 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold print:hidden">
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight font-mono print:text-lg">
            {formatCfa(summary.totalExpensesSpent)}
          </div>
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1 print:text-[9px]">
            Ratio d'absorption : {summary.expenseRatio}% des recettes
          </p>
        </div>

        {/* Solde Net Disponible */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm relative overflow-hidden print:border-slate-300 print:p-3">
          <div className="flex items-center justify-between mb-3 print:mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 print:text-slate-600">
              Solde Net Trésorerie
            </span>
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold print:hidden ${
                summary.netCashFlow >= 0
                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
              }`}
            >
              <Wallet size={20} />
            </div>
          </div>
          <div
            className={`text-2xl font-black tracking-tight font-mono print:text-lg ${
              summary.netCashFlow >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-amber-600"
            }`}
          >
            {formatCfa(summary.netCashFlow)}
          </div>
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1 print:text-[9px]">
            {summary.netCashFlow >= 0 ? "Excédent de trésorerie net" : "Déficit budgétaire"}
          </p>
        </div>

        {/* Reste à Recouvrer / Créances élèves */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm relative overflow-hidden print:border-slate-300 print:p-3">
          <div className="flex items-center justify-between mb-3 print:mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 print:text-slate-600">
              Créances & Impayés
            </span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold print:hidden">
              <Receipt size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight font-mono print:text-lg">
            {formatCfa(summary.totalRemainingDebts)}
          </div>
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1 print:text-[9px]">
            Total des impayés élèves en attente
          </p>
        </div>
      </div>

      {/* ── SECTION 2: BREAKDOWNS (PAR CATÉGORIE ET MODE DE PAIEMENT) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
        {/* Dépenses par Catégorie */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm print:border-slate-300 print:p-4">
          <h3 className="text-base font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2 print:text-xs print:mb-2">
            <PieChartIcon className="w-4 h-4 text-rose-500 print:w-3 print:h-3" />
            Répartition des Dépenses par Catégorie
          </h3>

          <div className="space-y-3 print:space-y-1.5">
            {breakdowns.expensesByCategory.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6 print:py-2">Aucune dépense sur cette période.</p>
            ) : (
              breakdowns.expensesByCategory.map((cat: any) => {
                const percent =
                  summary.totalExpensesSpent > 0
                    ? Math.round((cat.amount / summary.totalExpensesSpent) * 100)
                    : 0;
                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs print:text-[10px]">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{cat.category}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCfa(cat.amount)} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden print:h-1.5">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recettes par Mode de Paiement */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm print:border-slate-300 print:p-4">
          <h3 className="text-base font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2 print:text-xs print:mb-2">
            <BarChart3 className="w-4 h-4 text-emerald-500 print:w-3 print:h-3" />
            Canaux d'Encaissement des Recettes
          </h3>

          <div className="space-y-3 print:space-y-1.5">
            {breakdowns.paymentsByMode.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6 print:py-2">Aucun encaissement sur cette période.</p>
            ) : (
              breakdowns.paymentsByMode.map((m: any) => {
                const percent =
                  summary.totalRevenueCollected > 0
                    ? Math.round((m.amount / summary.totalRevenueCollected) * 100)
                    : 0;
                return (
                  <div key={m.mode} className="space-y-1">
                    <div className="flex items-center justify-between text-xs print:text-[10px]">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{m.mode}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCfa(m.amount)} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden print:h-1.5">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 3: RECENT FLUX JOURNAL (RECETTES ET CHARGES RÉCENTES) ── */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm print:border-slate-300 print:p-4">
        <h3 className="text-base font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2 print:text-xs">
          <Layers className="w-4 h-4 text-indigo-500" />
          Journal d'Activité (Derniers Flux Financiers)
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
          {/* Derniers Encaissements */}
          <div>
            <h4 className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 mb-2 print:text-[10px]">
              Dernières Recettes Perçues
            </h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden print:border-slate-300">
              {(reportData?.transactions?.recentPayments || []).length === 0 ? (
                <p className="text-xs text-slate-400 p-4">Aucune recette enregistrée.</p>
              ) : (
                reportData?.transactions?.recentPayments.slice(0, 20).map((p: any) => (
                  <div key={p.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/60 dark:hover:bg-slate-900/30 print:p-1.5 print:text-[10px]">
                    <div className="flex-1 pr-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{p.studentName}</span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                          +{formatCfa(p.amount)}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 print:text-[8px]">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">Motif :</span> {p.monthConcerned ? `Scolarité (${p.monthConcerned})` : (p.description || "Frais scolaires")}
                      </div>
                      <div className="text-[9px] text-slate-400 print:text-[7.5px] mt-0.5">
                        {p.classe} • {p.mode} • {p.reference || "-"} • {formatDateDisplay(p.date)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dernières Dépenses */}
          <div>
            <h4 className="text-xs font-black uppercase text-rose-600 dark:text-rose-400 mb-2 print:text-[10px]">
              Dernières Dépenses Consommées
            </h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden print:border-slate-300">
              {(reportData?.transactions?.recentExpenses || []).length === 0 ? (
                <p className="text-xs text-slate-400 p-4">Aucune dépense enregistrée.</p>
              ) : (
                reportData?.transactions?.recentExpenses.slice(0, 20).map((e: any) => (
                  <div key={e.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/60 dark:hover:bg-slate-900/30 print:p-1.5 print:text-[10px]">
                    <div className="flex-1 pr-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{e.category}</span>
                        <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                          -{formatCfa(e.amount)}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 print:text-[8px]">
                        <span className="font-bold text-rose-600 dark:text-rose-400">Motif :</span> {e.description || e.category || "Dépense"}
                      </div>
                      <div className="text-[9px] text-slate-400 print:text-[7.5px] mt-0.5">
                        {e.reference || "-"} • {e.paymentMode || "Espèces"} • {formatDateDisplay(e.date)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Official Signatures Container (visible on print) */}
        <div className="hidden print:grid grid-cols-2 gap-8 pt-8 mt-8 border-t border-slate-300">
          <div className="text-center">
            <p className="text-xs font-bold text-slate-700">Le Chef d'Établissement / Comptable</p>
            <div className="h-16"></div>
            <p className="text-[9px] text-slate-400">(Cachet et Signature)</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-slate-700">L'Agent de Recouvrement / Caissier</p>
            <div className="h-16"></div>
            <p className="text-[9px] text-slate-400">(Signature)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
