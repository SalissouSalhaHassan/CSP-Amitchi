"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Printer,
  FileText,
  Send,
  AlertCircle,
  X,
  Smartphone,
  Download,
  CheckCircle2,
  Calendar,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Wallet,
  Hourglass,
  Info,
  CreditCard,
  Building2,
  Banknote,
  BookOpen,
  User,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { toast } from "sonner";
import { cancelFeePayment } from "../actions/finance.actions";
import { getBranchByLevel } from "../../settings/actions/settings.actions";
import OfficialDocumentHeader from "@/domains/printing/components/OfficialDocumentHeader";
import { 
  inferEducationalLevel, 
  getActiveLevelHeaderConfig, 
  isHigherEducationLevel,
  type DocumentHeaderConfig,
  type EducationalLevel 
} from "@/domains/printing/document-header";
import { amiriFontBase64 } from "@/domains/printing/utils/amiri-font";
import { hasArabicCharacters, reshapeArabicText } from "@/domains/printing/utils/arabic-reshaper";

const formatCfaAmount = (amount?: number | null) => {
  const num = Number(amount) || 0;
  return num.toLocaleString("fr-FR").replace(/[\u00A0\u202F\u2007\u200B]/g, " ") + " CFA";
};

function drawTextBilingual(doc: jsPDF, text: string, x: number, y: number, options?: any) {
  if (hasArabicCharacters(text)) {
    if (!amiriFontBase64) {
      doc.text(text, x, y, options);
      return;
    }
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
    const reshaped = reshapeArabicText(text);
    doc.setFont("Amiri", "normal");
    const lines = doc.splitTextToSize(reshaped, maxWidth);
    let tempY = y;
    for (const line of lines) {
      doc.text(line, x, tempY, { align });
      tempY += 4.5;
    }
    doc.setFont(currentName, currentStyle);
    return tempY - y;
  } else {
    const lines = doc.splitTextToSize(text, maxWidth);
    let tempY = y;
    for (const line of lines) {
      doc.text(line, x, tempY, { align });
      tempY += 4.5;
    }
    return tempY - y;
  }
}

async function fetchTransparentLogoBase64(url: string, opacity: number = 0.08): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve("");
      return;
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, 0, 0);
      }
      const dataUrl = canvas.toDataURL('image/png');
      resolve(dataUrl);
    };
    img.onerror = () => {
      resolve("");
    };
  });
}

interface ReceiptPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feeData: any;
  headerConfig?: any | null;
  canDelete?: boolean;
  onPaymentCancelled?: (paymentId: number) => void;
  currentUser?: any;
}

const fmt = (val?: number | null) => `${(Number(val) || 0).toLocaleString("fr-FR")} F CFA`;

function numberToWords(n: number): string {
  if (n === 0) return "Zéro franc CFA";
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
    "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];

  function below1000(num: number): string {
    if (num === 0) return "";
    if (num < 20) return units[num];
    if (num < 100) {
      const t = Math.floor(num / 10);
      const u = num % 10;
      if (t === 7) return "soixante-" + units[10 + u];
      if (t === 9) return "quatre-vingt-" + units[10 + u];
      return tens[t] + (u > 0 ? (u === 1 && t !== 8 ? "-et-un" : "-" + units[u]) : (t === 8 ? "s" : ""));
    }
    const h = Math.floor(num / 100);
    const r = num % 100;
    return (h > 1 ? units[h] + " cent" : "cent") + (r > 0 ? " " + below1000(r) : (h > 1 ? "s" : ""));
  }

  let result = "";
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const remainder = n % 1000;

  if (millions > 0) result += below1000(millions) + (millions > 1 ? " millions " : " million ");
  if (thousands > 0) result += (thousands === 1 ? "mille" : below1000(thousands) + " mille") + " ";
  if (remainder > 0) result += below1000(remainder);

  return result.trim().charAt(0).toUpperCase() + result.trim().slice(1) + " francs CFA";
}

function getModeIcon(mode: string) {
  switch (mode) {
    case "Espèces": return <Banknote size={14} className="text-emerald-600" />;
    case "Mobile Money": return <Smartphone size={14} className="text-blue-600" />;
    case "Virement": return <Building2 size={14} className="text-purple-600" />;
    case "Carte Bancaire": return <CreditCard size={14} className="text-orange-600" />;
    default: return <Wallet size={14} className="text-slate-400" />;
  }
}

export default function ReceiptPreviewDialog({
  open,
  onOpenChange,
  feeData,
  headerConfig,
  canDelete = true,
  onPaymentCancelled,
  currentUser,
}: ReceiptPreviewDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [branchInfo, setBranchInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"receipt" | "history">("receipt");
  const [activeHeaderConfig, setActiveHeaderConfig] = useState<any>(headerConfig);
  const [selectedPaperSize, setSelectedPaperSize] = useState<"A4" | "A5">("A5");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  // Payment cancellation & real-time sync state
  const [currentPayments, setCurrentPayments] = useState<any[]>(feeData?.payments || []);
  const [currentTotalPaid, setCurrentTotalPaid] = useState<number>(feeData?.totalPaid || 0);
  const [currentBalance, setCurrentBalance] = useState<number>(feeData?.balance || 0);
  const [paymentToCancel, setPaymentToCancel] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (feeData) {
      const ref = feeData.payment?.reference || `REC-${new Date().getFullYear()}-${String(feeData.id || feeData.payment?.id || 1).padStart(6, "0")}`;
      const appUrl = typeof window !== "undefined" ? window.location.origin : "https://niger.edut.pro";
      const verifUrl = `${appUrl}/verify/${encodeURIComponent(ref)}`;
      
      QRCode.toDataURL(verifUrl, {
        margin: 1,
        width: 256,
        color: { dark: "#0f172a", light: "#ffffff" },
      }).then((url) => {
        setQrCodeDataUrl(url);
      }).catch(() => {});
    }
  }, [feeData]);

  useEffect(() => {
    if (feeData) {
      setCurrentPayments(feeData.payments || []);
      setCurrentTotalPaid(feeData.totalPaid || 0);
      setCurrentBalance(feeData.balance || 0);
    }
  }, [feeData]);

  const confirmCancelPayment = async () => {
    if (!paymentToCancel) return;
    setIsCancelling(true);
    try {
      const res: any = await cancelFeePayment(paymentToCancel.id, cancelReason);
      if (res?.success) {
        const payload = res.data || res;
        toast.success(payload.message || "Versement annulé avec succès !");
        const remaining = currentPayments.filter((p) => p.id !== paymentToCancel.id);
        setCurrentPayments(remaining);
        if (payload.newPaid !== undefined) setCurrentTotalPaid(payload.newPaid);
        if (payload.newBalance !== undefined) setCurrentBalance(payload.newBalance);
        onPaymentCancelled?.(paymentToCancel.id);
        setPaymentToCancel(null);
      } else {
        toast.error(res?.error || "Impossible d'annuler le versement.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'annulation du versement.");
    } finally {
      setIsCancelling(false);
    }
  };

  useEffect(() => {
    if (headerConfig) {
      setActiveHeaderConfig(headerConfig);
    } else if (open) {
      import("@/domains/settings/actions/settings.actions").then(({ getDocumentHeaderConfig }) => {
        getDocumentHeaderConfig().then((res) => {
          if (res?.data) {
            setActiveHeaderConfig(res.data);
          }
        });
      });
    }
  }, [open, headerConfig]);

  // Smart stage inference & educational cycle detection
  const inferredLevel = useMemo(() => {
    return inferEducationalLevel(
      feeData?.student?.educationalLevel ||
      feeData?.student?.classe ||
      feeData?.student?.classroom?.name ||
      feeData?.student?.class?.name ||
      feeData?.student?.filiere ||
      feeData?.student?.grade ||
      ""
    );
  }, [feeData]);

  const isHigherEd = isHigherEducationLevel(inferredLevel);

  // Derive level-specific official document header configuration
  const effectiveHeaderConfig = useMemo(() => {
    if (!activeHeaderConfig) return null;
    return getActiveLevelHeaderConfig(activeHeaderConfig, inferredLevel);
  }, [activeHeaderConfig, inferredLevel]);

  useEffect(() => {
    if (open) {
      const levelToFetch = inferredLevel || feeData?.student?.educationalLevel;
      if (levelToFetch) {
        getBranchByLevel(levelToFetch).then((res) => {
          if (res?.data) setBranchInfo(res.data);
        });
      }
    }
  }, [open, inferredLevel, feeData?.student?.educationalLevel]);

  useEffect(() => {
    const styleId = "receipt-print-style-v3";
    let style = document.getElementById(styleId) as HTMLStyleElement;
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    
    const pageMargin = selectedPaperSize === "A5" ? "5mm" : "10mm";
    style.innerHTML = `
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        body > *:not(#receipt-print-root) { display: none !important; }
        #receipt-print-root {
          display: block !important;
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: white !important;
          padding: 0;
          margin: 0;
        }
        .no-print { display: none !important; }
        @page { size: ${selectedPaperSize}; margin: ${pageMargin}; }
        
        #receipt-print-root #receipt-print-area {
          background-color: #ffffff !important;
          position: relative !important;
        }

        #receipt-print-root .receipt-watermark-container {
          display: flex !important;
          visibility: visible !important;
          opacity: 0.16 !important;
          position: absolute !important;
          inset: 0 !important;
          z-index: 0 !important;
          align-items: center !important;
          justify-content: center !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        #receipt-print-root .receipt-watermark-container img {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          max-width: 65% !important;
          max-height: 65% !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        #receipt-print-root .bg-slate-50,
        #receipt-print-root .bg-slate-50\\/50,
        #receipt-print-root .bg-slate-50\\/60,
        #receipt-print-root .bg-slate-50\\/80,
        #receipt-print-root .bg-white,
        #receipt-print-root .bg-white\\/75 {
          background-color: transparent !important;
        }
        
        /* A5 print overrides */
        #receipt-print-root [data-paper-size="A5"] {
          width: 148mm !important;
          height: 210mm !important;
          padding: 6mm !important;
          font-size: 8.5px !important;
        }
        #receipt-print-root [data-paper-size="A5"] .px-10 {
          padding-left: 14px !important;
          padding-right: 14px !important;
        }
        #receipt-print-root [data-paper-size="A5"] .py-6 {
          padding-top: 8px !important;
          padding-bottom: 8px !important;
        }
        #receipt-print-root [data-paper-size="A5"] .py-8 {
          padding-top: 10px !important;
          padding-bottom: 10px !important;
        }
        #receipt-print-root [data-paper-size="A5"] .pt-7 {
          padding-top: 10px !important;
        }
        #receipt-print-root [data-paper-size="A5"] .pb-6 {
          padding-bottom: 8px !important;
        }
        #receipt-print-root [data-paper-size="A5"] h2 {
          font-size: 20px !important;
        }
        #receipt-print-root [data-paper-size="A5"] .text-\\[22px\\] {
          font-size: 14px !important;
        }
        #receipt-print-root [data-paper-size="A5"] .text-\\[26px\\] {
          font-size: 16px !important;
        }
        #receipt-print-root [data-paper-size="A5"] .grid-cols-\\[1fr_220px\\] {
          grid-template-columns: 1fr 120px !important;
        }
        #receipt-print-root [data-paper-size="A5"] svg.stamp-svg {
          width: 75px !important;
          height: 75px !important;
        }
        #receipt-print-root [data-paper-size="A5"] .signature-area {
          width: 110px !important;
        }
        #receipt-print-root [data-paper-size="A5"] .signature-area .h-16 {
          height: 30px !important;
        }
      }
      
      /* A5 Screen Preview Overrides */
      #receipt-print-area[data-paper-size="A5"] {
        max-width: 148mm !important;
        margin: 0 auto;
        font-size: 8.5px !important;
      }
      #receipt-print-area[data-paper-size="A5"] .px-10 {
        padding-left: 14px !important;
        padding-right: 14px !important;
      }
      #receipt-print-area[data-paper-size="A5"] .py-6 {
        padding-top: 8px !important;
        padding-bottom: 8px !important;
      }
      #receipt-print-area[data-paper-size="A5"] .py-8 {
        padding-top: 10px !important;
        padding-bottom: 10px !important;
      }
      #receipt-print-area[data-paper-size="A5"] .pt-7 {
        padding-top: 10px !important;
      }
      #receipt-print-area[data-paper-size="A5"] .pb-6 {
        padding-bottom: 8px !important;
      }
      #receipt-print-area[data-paper-size="A5"] h2 {
        font-size: 20px !important;
      }
      #receipt-print-area[data-paper-size="A5"] .text-\\[22px\\] {
        font-size: 14px !important;
      }
      #receipt-print-area[data-paper-size="A5"] .text-\\[26px\\] {
        font-size: 16px !important;
      }
      #receipt-print-area[data-paper-size="A5"] .grid-cols-\\[1fr_220px\\] {
        grid-template-columns: 1fr 120px !important;
      }
      #receipt-print-area[data-paper-size="A5"] svg.stamp-svg {
        width: 75px !important;
        height: 75px !important;
      }
      #receipt-print-area[data-paper-size="A5"] .signature-area {
        width: 110px !important;
      }
      #receipt-print-area[data-paper-size="A5"] .signature-area .h-16 {
        height: 30px !important;
      }
      
      .custom-scrollbar::-webkit-scrollbar { width: 6px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.07); border-radius: 10px; }
    `;
  }, [selectedPaperSize]);

  const totalExpected = feeData?.totalExpected || 0;
  const totalPaid = currentTotalPaid;
  const totalReduction = feeData?.totalReduction || 0;
  const balance = currentBalance;
  const lastPayment = currentPayments[0] || feeData?.payments?.[0];
  const allPayments = currentPayments;
  const isDataComplete = !!feeData?.student && totalExpected > 0;
  const isSolde = balance <= 0;
  const isProvisoire = !!lastPayment?.isProvisoire;

  const refNumber =
    lastPayment?.reference ||
    `REF-${String(feeData?.id || 1).padStart(2, "0")}-${new Date().getFullYear()}`;

  const receiptDate = lastPayment?.datePaid
    ? new Date(lastPayment.datePaid).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

  const resolvedCashier = useMemo(() => {
    // 1. Direct payment record info
    if (lastPayment?.recordedBy && lastPayment.recordedBy !== "Admin Scolarité") {
      return lastPayment.recordedBy;
    }
    if (feeData?.payment?.recordedBy && feeData.payment.recordedBy !== "Admin Scolarité") {
      return feeData.payment.recordedBy;
    }
    // 2. From currentUser prop
    if (currentUser?.nomPrenom) return currentUser.nomPrenom;
    if (currentUser?.prenom || currentUser?.nom) {
      return `${currentUser.prenom || ""} ${currentUser.nom || ""}`.trim();
    }
    if (currentUser?.utilisateur) return currentUser.utilisateur;
    if (currentUser?.name) return currentUser.name;

    // 3. From localStorage cached user session (offline mode)
    if (typeof window !== "undefined") {
      try {
        const cachedSessionStr = localStorage.getItem("edut_user_session") || localStorage.getItem("edut_session_user");
        if (cachedSessionStr) {
          const cachedUser = JSON.parse(cachedSessionStr);
          if (cachedUser?.nomPrenom) return cachedUser.nomPrenom;
          if (cachedUser?.prenom || cachedUser?.nom) {
            return `${cachedUser.prenom || ""} ${cachedUser.nom || ""}`.trim();
          }
          if (cachedUser?.utilisateur) return cachedUser.utilisateur;
          if (cachedUser?.name) return cachedUser.name;
          if (cachedUser?.email) return cachedUser.email.split("@")[0];
        }
      } catch (_) {}
    }

    return lastPayment?.recordedBy || feeData?.payment?.recordedBy || "Admin GROUP AIIU-NIGER";
  }, [lastPayment, feeData, currentUser]);

  const targetHeader = effectiveHeaderConfig || activeHeaderConfig;
  const schoolName = targetHeader?.schoolName || branchInfo?.branchName || (isHigherEd ? "UNIVERSITÉ INTERNATIONALE" : "GROUPE SCOLAIRE");
  const schoolAddress = targetHeader?.address || branchInfo?.address || "Niamey, Niger";
  const schoolPhone = targetHeader?.phone || branchInfo?.contactNo || "+227 90 12 34 56";
  const schoolEmail = targetHeader?.email || branchInfo?.email || "contact@edutacademy.ne";
  const defaultMinistry = isHigherEd 
    ? "Ministère de l'Enseignement Supérieur et de la Recherche" 
    : "Ministère de l'Éducation Nationale";
  const defaultMinistryAr = isHigherEd 
    ? "وزارة التعليم العالي والبحث العلمي" 
    : "وزارة التربية الوطنية";
  const defaultService = isHigherEd 
    ? "Agence Comptable Universitaire / Scolarité" 
    : "Service de l'Intendance & Comptabilité";
  const defaultServiceAr = isHigherEd 
    ? "وكالة المحاسبة الجامعية / شؤون الطلاب" 
    : "مصلحة الشؤون المالية والمحاسبة";

  const receiptHeaderConfig: Partial<DocumentHeaderConfig> = {
    style: targetHeader?.style || "classic_dual_logo",
    schoolName,
    address: schoolAddress,
    phone: schoolPhone,
    email: schoolEmail,
    schoolYear: targetHeader?.schoolYear || feeData?.session?.sessionName || "2025 - 2026",
    leftLogo: targetHeader?.leftLogo || branchInfo?.logoPath || "",
    rightLogo: targetHeader?.rightLogo || branchInfo?.logoPath || "",
    centerLogo: targetHeader?.centerLogo || branchInfo?.logoPath || "",
    ministry: targetHeader?.ministry || defaultMinistry,
    ministryAr: targetHeader?.ministryAr || defaultMinistryAr,
    service: targetHeader?.service || defaultService,
    serviceAr: targetHeader?.serviceAr || defaultServiceAr,
    country: targetHeader?.country || branchInfo?.country || "RÉPUBLIQUE DU NIGER",
    countryAr: targetHeader?.countryAr || "جمهورية النيجر",
    schoolNameAr: targetHeader?.schoolNameAr || branchInfo?.schoolNameAr || "",
    regionalDirection: !isHigherEd ? (targetHeader?.regionalDirection || branchInfo?.dren || "") : "",
    regionalDirectionAr: !isHigherEd ? (targetHeader?.regionalDirectionAr || "") : "",
    departmentalDirection: !isHigherEd ? (targetHeader?.departmentalDirection || branchInfo?.dden || "") : "",
    departmentalDirectionAr: !isHigherEd ? (targetHeader?.departmentalDirectionAr || "") : "",
    registrationNo: targetHeader?.registrationNo || branchInfo?.registrationNo || "",
    bp: targetHeader?.bp || "",
  };

  // ---------- PRINT ----------
  const handlePrint = () => {
    if (!isDataComplete) return;
    const printArea = document.getElementById("receipt-print-area");
    if (!printArea) return;
    const clone = printArea.cloneNode(true) as HTMLElement;
    let root = document.getElementById("receipt-print-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "receipt-print-root";
      document.body.appendChild(root);
    }
    root.innerHTML = "";
    root.appendChild(clone);
    window.print();
    setTimeout(() => {
      if (root) root.innerHTML = "";
    }, 1500);
  };

  function drawReceiptPDFHeader(
    doc: jsPDF,
    headerConfig: any,
    branchInfo: any,
    schoolName: string,
    schoolAddress: string,
    schoolPhone: string,
    schoolEmail: string,
    schoolYear: string,
    receiptDate: string,
    margin: number,
    W: number,
    paperSize: "A4" | "A5"
  ): number {
    const style = headerConfig?.style || "classic_dual_logo";
    const ministry = headerConfig?.ministry || (isHigherEd ? "Ministère de l'Enseignement Supérieur et de la Recherche" : "Ministère de l'Éducation Nationale");
    const service = headerConfig?.service || (isHigherEd ? "Agence Comptable Universitaire / Scolarité" : "Service de l'Intendance & Comptabilité");
    const bp = headerConfig?.bp || "";
    const registrationNo = headerConfig?.registrationNo || branchInfo?.registrationNo || "";
    
    const leftLogo = headerConfig?.leftLogo || branchInfo?.logoPath;
    const rightLogo = headerConfig?.rightLogo || leftLogo;
    const centerLogo = headerConfig?.centerLogo || leftLogo;

    const isA5 = paperSize === "A5";

    if (style === "modern_card") {
      const cardHeight = isA5 ? 18 : 24;
      const cardTop = isA5 ? 5 : 8;
      doc.setFillColor(79, 70, 229);
      doc.roundedRect(margin, cardTop, W - 2 * margin, cardHeight, isA5 ? 1.5 : 2, isA5 ? 1.5 : 2, "F");
      
      if (leftLogo) {
        try {
          const logoSize = isA5 ? 12 : 20;
          doc.addImage(leftLogo, 'PNG', margin + (isA5 ? 3 : 4), cardTop + (isA5 ? 3 : 2), logoSize, logoSize);
        } catch (e) {}
      }
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(isA5 ? 10 : 13);
      drawWrappedText(doc, schoolName, margin + (isA5 ? 18 : 28), cardTop + (isA5 ? 5 : 7), W - 2 * margin - (isA5 ? 22 : 32), "left");
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(isA5 ? 6.5 : 8);
      doc.setTextColor(220, 225, 255);
      drawWrappedText(doc, `Année: ${schoolYear} | Date: ${receiptDate}`, margin + (isA5 ? 18 : 28), cardTop + (isA5 ? 10.5 : 14), W - 2 * margin - (isA5 ? 22 : 32), "left");
      drawWrappedText(doc, `${schoolAddress} | Tél: ${schoolPhone}`, margin + (isA5 ? 18 : 28), cardTop + (isA5 ? 14 : 19), W - 2 * margin - (isA5 ? 22 : 32), "left");
      
      doc.setTextColor(0, 0, 0);
      return cardTop + cardHeight + 4;
    }
    
    if (style === "bilingual_center_logo") {
      if (centerLogo) {
        try {
          const logoSize = isA5 ? 16 : 24;
          doc.addImage(centerLogo, 'PNG', W / 2 - (logoSize / 2), isA5 ? 5 : 8, logoSize, logoSize);
        } catch (e) {}
      }
      
      const leftLines = [
        headerConfig?.country || branchInfo?.country || "RÉPUBLIQUE DU NIGER",
        ministry,
        (!isHigherEd ? (headerConfig?.regionalDirection || branchInfo?.regionalDirection || "") : ""),
        (!isHigherEd ? (headerConfig?.departmentalDirection || branchInfo?.departmentalDirection || "") : ""),
        schoolName,
        service,
        schoolAddress,
        bp ? `BP : ${bp}` : "",
        schoolPhone ? `Tél: ${schoolPhone}` : "",
        schoolEmail ? `Email: ${schoolEmail}` : "",
      ].filter(Boolean);

      let leftY = isA5 ? 8 : 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(isA5 ? 5.5 : 7.5);
      doc.setTextColor(15, 23, 42);
      const colWidth = isA5 ? 48 : 65;
      const stepY = isA5 ? 3 : 4.5;

      for (const line of leftLines) {
        const height = drawWrappedText(doc, line, margin, leftY, colWidth, "left");
        leftY += height - 4.5 + stepY;
      }
      
      const rightLines = [
        headerConfig?.countryAr || "جمهورية النيجر",
        headerConfig?.ministryAr || (isHigherEd ? "وزارة التعليم العالي والبحث العلمي" : "وزارة التربية الوطنية"),
        (!isHigherEd ? (headerConfig?.regionalDirectionAr || "") : ""),
        (!isHigherEd ? (headerConfig?.departmentalDirectionAr || "") : ""),
        headerConfig?.schoolNameAr || schoolName,
        headerConfig?.serviceAr || (isHigherEd ? "وكالة المحاسبة الجامعية / شؤون الطلاب" : "مصلحة الشؤون المالية والمحاسبة"),
      ].filter(Boolean);

      let rightY = isA5 ? 8 : 12;
      for (const line of rightLines) {
        const height = drawWrappedText(doc, line, W - margin, rightY, colWidth, "right");
        rightY += height - 4.5 + stepY;
      }
      
      const maxY = Math.max(leftY, rightY);
      doc.setDrawColor(220, 225, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, maxY + 1, W - margin, maxY + 1);
      return maxY + (isA5 ? 3 : 4);
    }
    
    if (style === "university_formal") {
      const logoSize = isA5 ? 14 : 20;
      const logoTop = isA5 ? 5 : 8;
      if (leftLogo) {
        try {
          doc.addImage(leftLogo, 'PNG', margin, logoTop, logoSize, logoSize);
        } catch (e) {}
      }
      if (rightLogo) {
        try {
          doc.addImage(rightLogo, 'PNG', W - margin - logoSize, logoTop, logoSize, logoSize);
        } catch (e) {}
      }
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(isA5 ? 7 : 9);
      doc.setTextColor(15, 23, 42);
      drawWrappedText(doc, ministry.toUpperCase(), W / 2, isA5 ? 8 : 12, W - 2 * margin - (logoSize * 2 + 4), "center");
      
      doc.setFontSize(isA5 ? 9 : 11);
      drawWrappedText(doc, schoolName, W / 2, isA5 ? 12.5 : 17, W - 2 * margin - (logoSize * 2 + 4), "center");
      
      doc.setFontSize(isA5 ? 6.5 : 8.5);
      doc.setFont("helvetica", "normal");
      drawWrappedText(doc, service, W / 2, isA5 ? 17 : 22, W - 2 * margin - (logoSize * 2 + 4), "center");
      drawWrappedText(doc, `BP : ${bp || "N/A"} | Tél. ${schoolPhone} | Email : ${schoolEmail}`, W / 2, isA5 ? 21 : 27, W - 2 * margin - (logoSize * 2 + 4), "center");
      
      const dividerY = isA5 ? 26 : 34;
      doc.setDrawColor(220, 225, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, dividerY, W - margin, dividerY);
      return dividerY;
    }
    
    if (style === "minimal_administrative") {
      const logoSize = isA5 ? 14 : 20;
      const logoTop = isA5 ? 5 : 8;
      if (centerLogo || leftLogo) {
        try {
          doc.addImage(centerLogo || leftLogo, 'PNG', W - margin - logoSize, logoTop, logoSize, logoSize);
        } catch (e) {}
      }
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(isA5 ? 9.5 : 12);
      doc.setTextColor(15, 23, 42);
      drawWrappedText(doc, schoolName, margin, isA5 ? 9 : 14, W - 2 * margin - (logoSize + 4), "left");
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(isA5 ? 6.5 : 8);
      drawWrappedText(doc, `Agrément: ${registrationNo} | Année: ${schoolYear}`, margin, isA5 ? 14 : 20, W - 2 * margin - (logoSize + 4), "left");
      drawWrappedText(doc, `Adresse: ${schoolAddress} | Tél: ${schoolPhone}`, margin, isA5 ? 18 : 25, W - 2 * margin - (logoSize + 4), "left");
      drawWrappedText(doc, `Email: ${schoolEmail} | Date: ${receiptDate}`, margin, isA5 ? 22 : 30, W - 2 * margin - (logoSize + 4), "left");
      
      const dividerY = isA5 ? 26 : 34;
      doc.setDrawColor(220, 225, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, dividerY, W - margin, dividerY);
      return dividerY;
    }
    
    // Default fallback: classic dual logo
    const logoSize = isA5 ? 14 : 20;
    const logoTop = isA5 ? 5 : 8;
    if (leftLogo) {
      try {
        doc.addImage(leftLogo, 'PNG', margin, logoTop, logoSize, logoSize);
      } catch (e) {}
    }
    if (rightLogo && rightLogo !== leftLogo) {
      try {
        doc.addImage(rightLogo, 'PNG', W - margin - logoSize, logoTop, logoSize, logoSize);
      } catch (e) {}
    }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isA5 ? 10 : 14);
    doc.setTextColor(15, 23, 42);
    drawWrappedText(doc, schoolName, margin + (isA5 ? 18 : 24), isA5 ? 8 : 12, W - 2 * margin - (isA5 ? 38 : 48), "left");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(isA5 ? 6.5 : 8);
    doc.setTextColor(120, 130, 150);
    
    let subY = isA5 ? 13 : 18;
    const stepY = isA5 ? 3.5 : 4.5;
    if (schoolAddress) {
      drawWrappedText(doc, schoolAddress, margin + (isA5 ? 18 : 24), subY, W - 2 * margin - (isA5 ? 38 : 48), "left");
      subY += stepY;
    }
    drawWrappedText(doc, `Tél: ${schoolPhone}  |  Email: ${schoolEmail}`, margin + (isA5 ? 18 : 24), subY, W - 2 * margin - (isA5 ? 38 : 48), "left");
    subY += stepY;
    drawWrappedText(doc, `Année: ${schoolYear}  |  Date: ${receiptDate}`, margin + (isA5 ? 18 : 24), subY, W - 2 * margin - (isA5 ? 38 : 48), "left");

    const dividerY = Math.max(isA5 ? 26 : 34, subY + 3);
    doc.setDrawColor(220, 225, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, dividerY, W - margin, dividerY);
    return dividerY;
  }

  // ---------- PDF ----------
  const generatePDF = async (save = true): Promise<jsPDF> => {
    setIsGenerating(true);
    setPdfSuccess(false);

    const isA5 = selectedPaperSize === "A5";
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: isA5 ? "a5" : "a4" });
    
    if (amiriFontBase64) {
      try {
        doc.addFileToVFS("Amiri-Regular.ttf", amiriFontBase64);
        doc.addFont("Amiri-Regular.ttf", "Amiri", "normal", "Identity-H");
      } catch (e) {
        console.warn("Error registering Amiri font for receipt PDF:", e);
      }
    }

    const W = isA5 ? 148 : 210;
    const H = isA5 ? 210 : 297;
    const margin = isA5 ? 8 : 14;

    doc.setFillColor(249, 250, 252);
    doc.rect(0, 0, W, H, "F");
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, W, 2, "F");
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 2, isA5 ? 40 : 60, 1, "F");

    // Background logo watermark for PDF
    const logoUrl = receiptHeaderConfig?.centerLogo || receiptHeaderConfig?.leftLogo || receiptHeaderConfig?.rightLogo || branchInfo?.logoPath;
    if (logoUrl) {
      try {
        const logoWatermark = await fetchTransparentLogoBase64(logoUrl, 0.12);
        if (logoWatermark) {
          const wmSize = isA5 ? 95 : 135;
          const wmX = (W - wmSize) / 2;
          const wmY = (H - wmSize) / 2 + 10;
          doc.addImage(logoWatermark, 'PNG', wmX, wmY, wmSize, wmSize);
        }
      } catch (e) {
        console.warn("Failed to load watermark for receipt PDF:", e);
      }
    }

    const headerBottomY = drawReceiptPDFHeader(
      doc,
      receiptHeaderConfig,
      branchInfo,
      schoolName,
      schoolAddress,
      schoolPhone,
      schoolEmail,
      feeData.session?.sessionName || "2024-2025",
      receiptDate,
      margin,
      W,
      selectedPaperSize
    );

    // Dynamic placement of elements below header
    const titleBoxY = headerBottomY + (isA5 ? 3 : 4);
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, titleBoxY, W - 2 * margin, isA5 ? 10 : 13, isA5 ? 1.5 : 2, isA5 ? 1.5 : 2, "F");
    
    // Title text & subtitle
    doc.setFontSize(isA5 ? 9.5 : 12.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("REÇU DE PAIEMENT", margin + (isA5 ? 6 : 8), titleBoxY + (isA5 ? 5 : 6.5));
    
    doc.setFontSize(isA5 ? 5.5 : 7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(203, 213, 225);
    doc.text("Preuve officielle de paiement des frais scolaires", margin + (isA5 ? 6 : 8), titleBoxY + (isA5 ? 8.5 : 11));

    // ORIGINAL badge (Right of title box)
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(W - margin - (isA5 ? 18 : 24), titleBoxY + (isA5 ? 2.5 : 3.5), isA5 ? 14 : 18, isA5 ? 5 : 6, isA5 ? 1 : 1.5, isA5 ? 1 : 1.5, "F");
    doc.setFontSize(isA5 ? 5.5 : 7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("ORIGINAL", W - margin - (isA5 ? 11 : 15), titleBoxY + (isA5 ? 5.8 : 7.6), { align: "center" });

    // Reference Box
    const refBoxY = titleBoxY + (isA5 ? 13 : 17);
    doc.setFillColor(241, 245, 255);
    doc.setDrawColor(200, 210, 255);
    doc.roundedRect(W / 2 - (isA5 ? 28 : 38), refBoxY, isA5 ? 56 : 76, isA5 ? 5.5 : 7.5, isA5 ? 1.5 : 2, isA5 ? 1.5 : 2, "FD");
    doc.setFontSize(isA5 ? 6.5 : 8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(`RÉFÉRENCE : ${refNumber}`, W / 2, refBoxY + (isA5 ? 3.8 : 5.2), { align: "center" });

    let provY = refBoxY + (isA5 ? 7.5 : 10);
    if (isProvisoire) {
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(251, 191, 36);
      doc.roundedRect(margin, provY, W - 2 * margin, isA5 ? 3 : 4, 0.5, 0.5, "FD");
      doc.setFontSize(isA5 ? 5.5 : 6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(180, 83, 9);
      doc.text(`Document généré hors ligne (${resolvedCashier}) - en attente de synchronisation`, W / 2, provY + (isA5 ? 2.2 : 3), { align: "center" });
      provY += isA5 ? 4.5 : 6;
    }

    const infoBoxY = provY;
    const cardHeight = isA5 ? 27 : 35;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 225, 240);
    doc.roundedRect(margin, infoBoxY, W - 2 * margin, cardHeight, isA5 ? 1.5 : 2, isA5 ? 1.5 : 2, "FD");

    // Left Column: Student Info
    doc.setFontSize(isA5 ? 6 : 7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text("INFORMATIONS ÉLÈVE", margin + (isA5 ? 4 : 5), infoBoxY + (isA5 ? 4.5 : 6));

    doc.setFontSize(isA5 ? 8 : 10.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(feeData.student?.nomEtudiant || "—", margin + (isA5 ? 4 : 5), infoBoxY + (isA5 ? 9.5 : 12.5));

    const leftLabels = ["Classe", "Matricule", "Année Scolaire"];
    const leftVals = [
      feeData.student?.classe || "—",
      feeData.student?.numAdmission || "—",
      feeData.session?.sessionName || "2024–2025",
    ];
    doc.setFontSize(isA5 ? 6 : 8);
    leftLabels.forEach((lbl, i) => {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 130, 150);
      doc.text(lbl, margin + (isA5 ? 4 : 5), infoBoxY + (isA5 ? 14 : 18) + i * (isA5 ? 3.5 : 4.5));
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 35, 50);
      doc.text(`: ${leftVals[i]}`, margin + (isA5 ? 20 : 28), infoBoxY + (isA5 ? 14 : 18) + i * (isA5 ? 3.5 : 4.5));
    });

    // Divider between left and right cards
    doc.setDrawColor(220, 225, 240);
    doc.line(W / 2, infoBoxY + (isA5 ? 1.5 : 2), W / 2, infoBoxY + cardHeight - (isA5 ? 1.5 : 2));

    // Right Column: Date du reçu & Situation Financière
    const rx = W / 2 + (isA5 ? 4 : 5);
    doc.setFontSize(isA5 ? 6 : 7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129);
    doc.text("DATE DU REÇU", rx, infoBoxY + (isA5 ? 4.5 : 6));

    doc.setFontSize(isA5 ? 8 : 10.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(receiptDate, rx, infoBoxY + (isA5 ? 9.5 : 12.5));

    const rightLabels = ["Total Attendu (Frais annuels)", "Total Déjà Payé", "Caissier / Agent"];
    const rightVals = [
      formatCfaAmount(totalExpected),
      formatCfaAmount(totalPaid),
      resolvedCashier,
    ];

    doc.setFontSize(isA5 ? 5.8 : 7.5);
    rightLabels.forEach((lbl, i) => {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 130, 150);
      doc.text(lbl, rx, infoBoxY + (isA5 ? 13.5 : 17.5) + i * (isA5 ? 3.2 : 4.2));
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 35, 50);
      doc.text(`: ${rightVals[i]}`, rx + (isA5 ? 34 : 44), infoBoxY + (isA5 ? 13.5 : 17.5) + i * (isA5 ? 3.2 : 4.2));
    });

    // Solde restant pill banner in the right card
    const soldePillY = infoBoxY + (isA5 ? 22 : 28);
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(rx, soldePillY, (W / 2) - margin - (isA5 ? 8 : 10), isA5 ? 4.5 : 6, isA5 ? 1 : 1.5, isA5 ? 1 : 1.5, "F");
    doc.setFontSize(isA5 ? 5.5 : 7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("SOLDE RESTANT", rx + 2, soldePillY + (isA5 ? 3.2 : 4.2));
    doc.text(formatCfaAmount(balance), (W - margin) - (isA5 ? 6 : 8), soldePillY + (isA5 ? 3.2 : 4.2), { align: "right" });

    // Table: HISTORIQUE DES VERSEMENTS (6 Columns)
    const tableBody = (allPayments.length > 0 ? allPayments : [
      {
        id: feeData.payment?.id || 1,
        datePaid: feeData.payment?.datePaid || receiptDate,
        paymentMode: feeData.payment?.paymentMode || "Espèces",
        monthConcerned: feeData.payment?.monthConcerned || "Frais de scolarité",
        amount: totalPaid,
        recordedBy: feeData.payment?.recordedBy || resolvedCashier,
      }
    ]).map((p: any, idx: number) => {
      const numStr = String(idx + 1);
      let dStr = p.datePaid;
      if (dStr) {
        try {
          const d = new Date(dStr);
          if (!isNaN(d.getTime())) dStr = d.toLocaleDateString("fr-FR");
        } catch (_) {}
      } else {
        dStr = receiptDate;
      }
      const refPStr = `PAY-${String(p.id || (idx + 1)).padStart(6, '0')}`;
      const modeStr = p.paymentMode || "Espèces";
      const amtStr = formatCfaAmount(p.amount || 0).replace(" CFA", "");
      const recByStr = p.recordedBy || resolvedCashier;
      return [numStr, dStr, refPStr, modeStr, amtStr, recByStr];
    });

    autoTable(doc, {
      startY: infoBoxY + cardHeight + (isA5 ? 4 : 6),
      head: [["N°", "Date de Paiement", "Référence Paiement", "Mode de Paiement", "Montant (CFA)", "Reçu par"]],
      body: tableBody,
      foot: [
        [
          { content: "TOTAL VERSÉ", colSpan: 4, styles: { halign: "left", fontStyle: "bold" } },
          { content: formatCfaAmount(totalPaid), colSpan: 2, styles: { halign: "right", fontStyle: "bold" } }
        ]
      ],
      theme: "grid",
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontSize: isA5 ? 6.5 : 8,
        fontStyle: "bold",
        halign: "center",
      },
      bodyStyles: {
        fontSize: isA5 ? 6 : 7.5,
        cellPadding: isA5 ? 2 : 3,
        textColor: [30, 35, 50],
      },
      didParseCell: (data: any) => {
        if (data.section === 'body') {
          data.cell.styles.fillColor = false;
        }
      },
      footStyles: {
        fillColor: [241, 245, 255],
        textColor: [15, 23, 42],
        fontSize: isA5 ? 6.5 : 8,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { halign: "center", cellWidth: isA5 ? 8 : 12 },
        1: { halign: "center", cellWidth: isA5 ? 22 : 30 },
        2: { halign: "center", cellWidth: isA5 ? 24 : 32 },
        3: { halign: "center", cellWidth: isA5 ? 22 : 30 },
        4: { halign: "right", fontStyle: "bold", cellWidth: isA5 ? 26 : 34 },
        5: { halign: "center", cellWidth: isA5 ? 30 : 44 },
      },
      margin: { left: margin, right: margin },
    });

    const tableBottom = (doc as any).lastAutoTable.finalY;

    // Bottom 3 Cards: Certification (Left) | Stamp (Center) | QR Code (Right)
    const bottomCardsY = tableBottom + (isA5 ? 4 : 6);
    const bottomCardHeight = isA5 ? 24 : 32;

    // Left: Certification Card
    const certWidth = isA5 ? 46 : 64;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 225, 240);
    doc.roundedRect(margin, bottomCardsY, certWidth, bottomCardHeight, isA5 ? 1.5 : 2, isA5 ? 1.5 : 2, "FD");
    
    doc.setFontSize(isA5 ? 5.5 : 7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text("CERTIFICATION", margin + 3, bottomCardsY + (isA5 ? 4 : 5.5));

    doc.setFontSize(isA5 ? 4.5 : 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Nous certifions que le montant", margin + 3, bottomCardsY + (isA5 ? 8 : 11));
    doc.text("indiqué ci-dessus a été reçu", margin + 3, bottomCardsY + (isA5 ? 11 : 15));
    doc.text("de l'élève mentionné.", margin + 3, bottomCardsY + (isA5 ? 14 : 19));

    doc.setFontSize(isA5 ? 4.2 : 5.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(`Agent : ${resolvedCashier}`, margin + certWidth / 2, bottomCardsY + bottomCardHeight - (isA5 ? 7 : 9.5), { align: "center" });

    doc.setDrawColor(203, 213, 225);
    doc.line(margin + 3, bottomCardsY + bottomCardHeight - (isA5 ? 4.5 : 6), margin + certWidth - 3, bottomCardsY + bottomCardHeight - (isA5 ? 4.5 : 6));
    doc.setFontSize(isA5 ? 3.8 : 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("Signature & Cachet", margin + certWidth / 2, bottomCardsY + bottomCardHeight - (isA5 ? 1.5 : 2), { align: "center" });

    // Center: Circular School Stamp
    const stampX = W / 2;
    const stampY = bottomCardsY + bottomCardHeight / 2;
    const stampRadius = isA5 ? 9 : 13;
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(isA5 ? 0.4 : 0.6);
    doc.setGState(new (doc as any).GState({ opacity: 0.35 }));
    doc.circle(stampX, stampY, stampRadius, "S");
    doc.circle(stampX, stampY, stampRadius - 1.5, "S");
    doc.setFontSize(isA5 ? 3.5 : 5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    doc.text(`★ ${schoolName.toUpperCase()} ★`, stampX, stampY - (isA5 ? 2 : 3), { align: "center" });
    doc.text("SERVICE SCOLARITÉ", stampX, stampY + (isA5 ? 3 : 4), { align: "center" });
    doc.setGState(new (doc as any).GState({ opacity: 1 }));

    // Right: QR Code Card
    const qrCardX = W - margin - (isA5 ? 46 : 64);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 225, 240);
    doc.roundedRect(qrCardX, bottomCardsY, certWidth, bottomCardHeight, isA5 ? 1.5 : 2, isA5 ? 1.5 : 2, "FD");

    try {
      const appUrl = typeof window !== "undefined" ? window.location.origin : "https://niger.edut.pro";
      const verifUrl = `${appUrl}/verify/${encodeURIComponent(refNumber)}`;
      const qrData = await QRCode.toDataURL(verifUrl, {
        margin: 1,
        width: 160,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      const qrSize = isA5 ? 14 : 20;
      doc.addImage(qrData, "PNG", qrCardX + 3, bottomCardsY + (isA5 ? 3 : 4), qrSize, qrSize);
    } catch (e) {
      console.warn("QR code render error:", e);
    }
    doc.setFontSize(isA5 ? 4.5 : 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Scannez pour vérifier", qrCardX + (isA5 ? 19 : 26), bottomCardsY + (isA5 ? 7 : 10));
    doc.text("l'authenticité du reçu", qrCardX + (isA5 ? 19 : 26), bottomCardsY + (isA5 ? 10 : 14));
    doc.setFontSize(isA5 ? 5 : 6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(refNumber, qrCardX + (isA5 ? 19 : 26), bottomCardsY + (isA5 ? 16 : 22));

    // Security Footer
    const footerY = bottomCardsY + bottomCardHeight + (isA5 ? 4 : 6);
    doc.setFontSize(isA5 ? 4.5 : 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(`Émis le : ${receiptDate} (par ${resolvedCashier})`, margin, footerY);
    doc.text("Ce reçu est généré électroniquement et ne nécessite pas de signature manuscrite.", W / 2, footerY, { align: "center" });
    doc.text(`Merci pour votre confiance. ${schoolName}`, W - margin, footerY, { align: "right" });

    if (save) {
      const name = feeData.student?.nomEtudiant?.replace(/\s+/g, "_") || "eleve";
      doc.save(`Recu_${selectedPaperSize}_${name}_${Date.now()}.pdf`);
      setPdfSuccess(true);
    }

    setIsGenerating(false);
    return doc;
  };

  // ---------- WHATSAPP ----------
  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 8) return "Numéro trop court (minimum 8 chiffres).";
    if (cleaned.length > 15) return "Numéro trop long (maximum 15 chiffres).";
    return "";
  };

  const handleWhatsApp = async () => {
    const err = validatePhone(phoneNumber);
    if (err) { setPhoneError(err); return; }
    setPhoneError("");
    const cleaned = phoneNumber.replace(/\D/g, "");
    const text =
      `✅ *REÇU DE PAIEMENT — ${schoolName}*\n\n` +
      `👤 Élève : *${feeData.student?.nomEtudiant}*\n` +
      `📚 Classe : ${feeData.student?.classe}\n` +
      `🆔 Matricule : ${feeData.student?.numAdmission || "—"}\n\n` +
      `💰 Total attendu : ${fmt(totalExpected)}\n` +
      `✅ Total versé : ${fmt(totalPaid)}\n` +
      `📊 Solde restant : *${fmt(balance)}*\n\n` +
      `👤 Agent / Caissier : *${resolvedCashier}*\n` +
      `📅 Date : ${receiptDate}\n🔖 Réf : ${refNumber}\n\n` +
      `_Merci de votre confiance — ${schoolName}_`;
    window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (!open || !feeData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl rounded-[2.5rem] bg-white p-0 overflow-hidden border-none shadow-2xl max-h-[96vh] flex flex-col">

        {/* ── Dialog Header ── */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-7 text-white shrink-0 no-print">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                <FileText size={22} />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Reçu de Paiement</h2>
                <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5">
                  {feeData.student?.nomEtudiant} · {feeData.session?.sessionName || "2024-2025"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex rounded-xl bg-white/10 p-1 gap-1 no-print">
                {(["receipt", "history"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      activeTab === tab ? "bg-white text-slate-900" : "text-white/70 hover:text-white"
                    )}
                  >
                    {tab === "receipt" ? "Reçu" : "Historique"}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">

          {!isDataComplete && (
            <div className="m-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center gap-3 no-print">
              <AlertCircle size={18} className="shrink-0" />
              <p className="text-sm font-bold">Données incomplètes. Vérifiez les informations avant d'imprimer.</p>
            </div>
          )}
          {pdfSuccess && (
            <div className="m-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center gap-3 no-print">
              <CheckCircle2 size={18} className="shrink-0" />
              <p className="text-sm font-bold">PDF généré et téléchargé avec succès !</p>
            </div>
          )}

          {activeTab === "receipt" ? (
            <div className="p-6">

              {/* ════════════════════════════════════════
                  RECEIPT DOCUMENT — matches reference image
                  ════════════════════════════════════════ */}
              <div
                id="receipt-print-area"
                data-paper-size={selectedPaperSize}
                className="bg-white rounded-[2rem] border border-slate-200 shadow-lg overflow-hidden transition-all duration-300 relative"
                style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
              >
                {/* Top color accent */}
                <div className="h-1.5 w-full bg-gradient-to-r from-slate-900 via-indigo-600 to-slate-900 relative z-10" />

                {/* Background logo watermark for print & web preview */}
                {(receiptHeaderConfig?.leftLogo || receiptHeaderConfig?.centerLogo || receiptHeaderConfig?.rightLogo || branchInfo?.logoPath) && (
                  <div className="receipt-watermark-container absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.14] overflow-hidden z-0">
                    <img
                      src={receiptHeaderConfig?.leftLogo || receiptHeaderConfig?.centerLogo || receiptHeaderConfig?.rightLogo || branchInfo?.logoPath}
                      alt="Watermark"
                      className="w-[300px] h-[300px] md:w-[380px] md:h-[380px] object-contain"
                    />
                  </div>
                )}

                {/* ── HEADER: Logo | Title | Contact ── */}
                <div className="px-10 pt-7 pb-6 border-b border-slate-100 relative z-10">
                  <OfficialDocumentHeader config={receiptHeaderConfig} title={`Reçu de paiement - ${refNumber}`} variant="compact" />
                </div>

                {isProvisoire && (
                  <div className="mx-10 mt-6 bg-amber-500/10 border border-amber-500/20 text-amber-600 p-4 rounded-2xl flex items-center justify-between gap-4 animate-pulse no-print">
                    <div className="flex items-center gap-3">
                      <AlertCircle size={20} className="text-amber-500 shrink-0" />
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider">Reçu provisoire - Non synchronisé</p>
                        <p className="text-[10px] font-semibold mt-0.5">
                          Enregistré hors ligne par <span className="font-bold text-amber-800">{resolvedCashier}</span>. Synchronisation dès le retour de la connexion.
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-600 rounded-xl text-[10px] font-black uppercase shrink-0">PROVISOIRE</span>
                  </div>
                )}

                {/* ── TITLE BANNER & BADGE ── */}
                <div className="mx-8 mt-6 bg-[#0F172A] text-white p-4 rounded-2xl flex items-center justify-between shadow-md relative z-10">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                      <FileText className="text-white" size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black tracking-tight leading-none uppercase">
                        {isHigherEd ? "REÇU DE PAIEMENT UNIVERSITAIRE" : "REÇU DE PAIEMENT SCOLAIRE"}
                      </h2>
                      <p className="text-xs text-slate-300 font-medium mt-1">
                        {isHigherEd ? "Preuve officielle de versement des droits universitaires (LMD)" : "Preuve officielle de paiement des frais de scolarité"}
                      </p>
                    </div>
                  </div>
                  <span className="px-3.5 py-1 bg-blue-600 text-white rounded-full text-xs font-black uppercase tracking-wider shadow-sm shrink-0">
                    ORIGINAL
                  </span>
                </div>

                {/* ── REFERENCE PILL ── */}
                <div className="flex justify-center my-3 relative z-10">
                  <div className="px-6 py-1.5 rounded-xl border border-indigo-100 bg-indigo-50/70">
                    <p className="text-xs font-black text-indigo-700 tracking-widest uppercase">
                      RÉFÉRENCE : {refNumber}
                    </p>
                  </div>
                </div>

                {/* ── STUDENT INFO & FINANCIAL SITUATION (2 Cards) ── */}
                <div className="px-8 pb-4 relative z-10">
                  <div className="grid grid-cols-2 gap-4">

                    {/* Left Card — Student Info */}
                    <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                          <User size={14} className="text-indigo-600" />
                        </div>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                          Informations {isHigherEd ? "Étudiant" : "Élève"}
                        </p>
                      </div>
                      <p className="text-[17px] font-black text-slate-900 leading-tight mb-3">
                        {feeData.student?.nomEtudiant || "—"}
                      </p>
                      <div className="space-y-1.5 text-[12px]">
                        {[
                          { label: isHigherEd ? "Niveau / Filière" : "Classe", value: feeData.student?.classe },
                          { label: "Matricule", value: feeData.student?.numAdmission },
                          { label: isHigherEd ? "Année Académique" : "Année Scolaire", value: feeData.session?.sessionName || receiptHeaderConfig.schoolYear || "2025–2026" },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex items-center gap-2">
                            <span className="text-slate-500 font-medium w-24">{label}</span>
                            <span className="text-slate-400">:</span>
                            <span className="font-bold text-slate-800">{value || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right Card — Date du reçu & Situation Financière */}
                    <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                            <Calendar size={14} className="text-emerald-600" />
                          </div>
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                            Date du Reçu
                          </p>
                        </div>
                        <p className="text-[17px] font-black text-slate-900 leading-tight mb-3">
                          {receiptDate}
                        </p>
                        <div className="space-y-1.5 text-[12px]">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">Total Attendu (Frais annuels)</span>
                            <span className="font-bold text-slate-800">{formatCfaAmount(totalExpected)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">Total Déjà Payé</span>
                            <span className="font-bold text-slate-800">{formatCfaAmount(totalPaid)}</span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                            <span className="text-slate-500 font-medium">Caissier / Agent</span>
                            <span className="font-black text-indigo-600">{resolvedCashier}</span>
                          </div>
                        </div>
                      </div>

                      {/* Blue Solde Restant Pill */}
                      <div className="mt-2.5 px-3.5 py-1.5 bg-blue-600 rounded-xl flex items-center justify-between text-white">
                        <span className="text-[11px] font-black tracking-wider uppercase">SOLDE RESTANT</span>
                        <span className="text-[13px] font-black">{formatCfaAmount(balance)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── HISTORIQUE DES VERSEMENTS (Card & 6-Column Table) ── */}
                <div className="px-8 pb-4 relative z-10">
                  <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                    {/* Header with icon */}
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center gap-2">
                      <FileText size={14} className="text-indigo-600" />
                      <p className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                        Historique des Versements
                      </p>
                    </div>

                    {/* 6-Column Table header */}
                    <div className="grid grid-cols-[40px_130px_130px_120px_1fr_130px] bg-[#0F172A] text-white px-4 py-2.5 items-center text-[10px] font-black uppercase tracking-wider">
                      <p className="text-center">N°</p>
                      <p className="text-center">Date de Paiement</p>
                      <p className="text-center">Référence Paiement</p>
                      <p className="text-center">Mode de Paiement</p>
                      <p className="text-right">Montant (CFA)</p>
                      <p className="text-center">Reçu par</p>
                    </div>

                    {/* Rows */}
                    {(allPayments.length > 0 ? allPayments : [
                      {
                        id: feeData.payment?.id || 1,
                        datePaid: feeData.payment?.datePaid || receiptDate,
                        paymentMode: feeData.payment?.paymentMode || "Espèces",
                        monthConcerned: feeData.payment?.monthConcerned || "Frais de scolarité",
                        amount: totalPaid,
                        recordedBy: feeData.payment?.recordedBy || resolvedCashier,
                      }
                    ]).map((p: any, idx: number) => {
                      let dStr = p.datePaid;
                      if (dStr) {
                        try {
                          const d = new Date(dStr);
                          if (!isNaN(d.getTime())) dStr = d.toLocaleDateString("fr-FR");
                        } catch (_) {}
                      } else {
                        dStr = receiptDate;
                      }
                      const refPStr = `PAY-${String(p.id || (idx + 1)).padStart(6, '0')}`;
                      return (
                        <div
                          key={p.id || idx}
                          className="grid grid-cols-[40px_130px_130px_120px_1fr_130px] px-4 py-2.5 items-center border-b border-slate-100 bg-white hover:bg-slate-50/80 transition-colors text-[12px]"
                        >
                          <p className="font-bold text-slate-500 text-center">{idx + 1}</p>
                          <p className="text-slate-700 text-center">{dStr}</p>
                          <p className="text-slate-600 text-center font-medium">{refPStr}</p>
                          <p className="text-slate-600 text-center font-medium">{p.paymentMode || "Espèces"}</p>
                          <p className="font-black text-slate-800 text-right">{formatCfaAmount(p.amount || 0).replace(" CFA", "")}</p>
                          <p className="text-slate-700 font-semibold text-center text-[11px]">{p.recordedBy || resolvedCashier}</p>
                        </div>
                      );
                    })}

                    {/* Footer Row */}
                    <div className="flex justify-between items-center px-6 py-2.5 bg-slate-50">
                      <p className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Total Versé</p>
                      <p className="text-[13.5px] font-black text-slate-900">{formatCfaAmount(totalPaid)}</p>
                    </div>
                  </div>
                </div>

                {/* ── BOTTOM 3 CARDS: Certification | Stamp | QR Code ── */}
                <div className="px-8 pb-4 relative z-10">
                  <div className="grid grid-cols-3 gap-4">

                    {/* Left Card: Certification */}
                    <div className="border border-slate-200/80 rounded-2xl p-4 bg-white flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 size={15} className="text-blue-600" />
                          <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
                            Certification
                          </p>
                        </div>
                        <p className="text-[10.5px] text-slate-500 leading-snug">
                          Nous certifions que le montant indiqué ci-dessus a été reçu de l'élève mentionné.
                        </p>
                      </div>
                      <div className="pt-3 text-center">
                        <p className="text-[10px] font-bold text-slate-700">
                          Agent : <span className="text-indigo-600 font-extrabold">{resolvedCashier}</span>
                        </p>
                        <svg width="100" height="24" viewBox="0 0 120 38" className="text-slate-400 mx-auto my-0.5">
                          <path
                            d="M8,28 C16,10 24,32 34,20 C44,8 52,30 62,22 C72,14 80,26 90,18 C98,12 108,20 114,16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                        </svg>
                        <p className="text-[9px] font-bold text-slate-400">Signature &amp; Cachet</p>
                      </div>
                    </div>

                    {/* Center: Official Circular Stamp */}
                    <div className="border border-slate-200/80 rounded-2xl p-4 bg-white flex items-center justify-center">
                      <div className="w-[105px] h-[105px] rounded-full border-2 border-blue-900/30 flex items-center justify-center p-1 relative">
                        <div className="w-full h-full rounded-full border border-blue-900/30 flex flex-col items-center justify-center text-center p-1 text-blue-900/50 font-black">
                          <p className="text-[7.5px] uppercase tracking-wider">★ {schoolName.toUpperCase()} ★</p>
                          <p className="text-[6.5px] font-bold mt-0.5">{isHigherEd ? "AGENCE COMPTABLE / SCOLARITÉ" : "SERVICE INTENDANCE / SCOLARITÉ"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right Card: QR Code */}
                    <div className="border border-slate-200/80 rounded-2xl p-4 bg-white flex items-center gap-3">
                      {qrCodeDataUrl ? (
                        <img src={qrCodeDataUrl} alt="QR Code" className="w-16 h-16 rounded-lg shrink-0" />
                      ) : (
                        <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                          <FileText size={20} className="text-slate-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] text-slate-500 leading-snug">
                          Scannez pour vérifier l'authenticité du reçu
                        </p>
                        <p className="text-[11px] font-black text-blue-600 mt-1.5">{refNumber}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── SECURITY FOOTER ── */}
                <div className="px-8 pb-5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium relative z-10">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-slate-400 shrink-0" />
                    <span>Émis le : {receiptDate} (par {resolvedCashier})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-slate-400 shrink-0" />
                    <span>Ce reçu est généré électroniquement et ne nécessite pas de signature manuscrite.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>Merci pour votre confiance. {schoolName}</span>
                  </div>
                </div>

                {/* Bottom accent */}
                <div className="h-1.5 w-full bg-gradient-to-r from-slate-900 via-indigo-600 to-slate-900 relative z-10" />
              </div>

              {/* ── WhatsApp Section ── */}
              <div className="mt-5 bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm space-y-4 no-print">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-100">
                    <Send size={17} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">Envoyer par WhatsApp</p>
                    <p className="text-[10px] text-slate-400 font-medium">Envoi direct de la notification de paiement au parent</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Numéro WhatsApp (avec indicatif pays, ex: 22790000000)
                  </Label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <Input
                        value={phoneNumber}
                        onChange={(e) => { setPhoneNumber(e.target.value); setPhoneError(""); }}
                        placeholder="227 90 00 00 00"
                        className={cn(
                          "pl-11 rounded-2xl bg-slate-50 h-12 text-sm font-bold border-slate-100",
                          phoneError ? "border-rose-300 ring-1 ring-rose-200" : ""
                        )}
                      />
                    </div>
                    <Button
                      onClick={handleWhatsApp}
                      className="h-12 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all shrink-0"
                    >
                      <Send size={15} /> Envoyer
                    </Button>
                  </div>
                  {phoneError && (
                    <p className="text-[10px] text-rose-500 font-bold flex items-center gap-1 ml-1">
                      <AlertCircle size={11} /> {phoneError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ── HISTORY TAB ── */
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Calendar size={15} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">Historique des versements</p>
                  <p className="text-[10px] text-slate-400">{allPayments.length} versement(s) enregistré(s)</p>
                </div>
              </div>

              {allPayments.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-300">
                  <Wallet size={48} />
                  <p className="text-sm font-bold">Aucun versement enregistré</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allPayments.map((payment: any, idx: number) => (
                    <div
                      key={payment.id || idx}
                      className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center justify-between hover:border-indigo-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                          {getModeIcon(payment.paymentMode || "")}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-black text-slate-800">{fmt(payment.amount || 0)}</p>
                            {payment.isProvisoire && (
                              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-full text-[9px] font-black border border-amber-500/20 animate-pulse">
                                Provisoire (en attente)
                              </span>
                            )}
                            {payment.reduction > 0 && (
                              <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full text-[9px] font-black border border-purple-100">
                                -{fmt(payment.reduction)} réduc.
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-400 font-medium">{payment.paymentMode || "—"}</span>
                            {payment.reference && (
                              <span className="text-[10px] text-indigo-500 font-bold">#{payment.reference}</span>
                            )}
                            {payment.monthConcerned && (
                              <span className="text-[10px] text-slate-400 font-medium">{payment.monthConcerned}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[11px] font-black text-slate-700">
                            {payment.datePaid
                              ? new Date(payment.datePaid).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
                              : "—"}
                          </p>
                          {payment.recordedBy && (
                            <p className="text-[9px] text-slate-400 font-medium mt-0.5">par {payment.recordedBy}</p>
                          )}
                        </div>

                        {canDelete && payment.id && (
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentToCancel(payment);
                              setCancelReason("");
                            }}
                            title="Annuler ce versement (Réservé à l'Admin)"
                            className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer shadow-none"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {allPayments.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-3">
                  {[
                    { label: "Total attendu", value: fmt(totalExpected), color: "text-slate-700" },
                    { label: "Total versé", value: fmt(totalPaid), color: "text-emerald-600" },
                    { label: "Solde restant", value: fmt(balance), color: isSolde ? "text-emerald-600" : "text-amber-600" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 text-center shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                      <p className={cn("text-base font-black", color)}>{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer Actions ── */}
        <div className="p-5 bg-white border-t border-slate-100 flex justify-between items-center gap-4 shrink-0 no-print">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600"
          >
            Fermer
          </Button>
          <div className="flex gap-3 items-center">
            {/* Paper Size selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner mr-2">
              <button
                type="button"
                onClick={() => setSelectedPaperSize("A4")}
                className={cn(
                  "h-8 px-4 rounded-xl text-xs font-black tracking-widest transition-all",
                  selectedPaperSize === "A4"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => setSelectedPaperSize("A5")}
                className={cn(
                  "h-8 px-4 rounded-xl text-xs font-black tracking-widest transition-all",
                  selectedPaperSize === "A5"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                A5
              </button>
            </div>

            <Button
              onClick={() => generatePDF(true)}
              disabled={!isDataComplete || isGenerating}
              variant="outline"
              className="h-11 px-5 rounded-2xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin" />
                  Génération...
                </span>
              ) : (
                <><Download size={15} /> PDF</>
              )}
            </Button>
            {isProvisoire ? (
              <Button
                onClick={handlePrint}
                className="h-11 px-7 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-amber-200 transition-all cursor-pointer"
              >
                <Printer size={15} /> Imprimer reçu provisoire
              </Button>
            ) : (
              <Button
                onClick={handlePrint}
                disabled={!isDataComplete}
                className="h-11 px-7 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-slate-200 transition-all cursor-pointer"
              >
                <Printer size={15} /> Imprimer
              </Button>
            )}
          </div>
        </div>

        {/* ── Admin Payment Cancellation Confirmation Modal ── */}
        {paymentToCancel && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 max-w-md w-full space-y-5 animate-in zoom-in-95 duration-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Annulation de Versement</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Action réservée à la Direction / Administration
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Élève :</span>
                  <span className="text-slate-900 font-extrabold">{feeData.student?.nomEtudiant || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Montant à annuler :</span>
                  <span className="text-rose-600 font-black text-sm">{fmt(paymentToCancel.amount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Date du versement :</span>
                  <span className="text-slate-700 font-medium">
                    {paymentToCancel.datePaid
                      ? new Date(paymentToCancel.datePaid).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
                      : "—"}
                  </span>
                </div>
                {paymentToCancel.reference && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Référence du reçu :</span>
                    <span className="text-indigo-600 font-bold">#{paymentToCancel.reference}</span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-100 font-medium leading-relaxed">
                ⚠️ Cette action supprimera définitivement le versement et réajustera automatiquement le solde restant et le total versé de l'élève.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Motif de l'annulation (facultatif)</label>
                <Input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ex: Erreur de saisie, chèque rejeté, doublon..."
                  className="rounded-xl bg-slate-50 border-slate-200 text-xs h-10"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  type="button"
                  disabled={isCancelling}
                  onClick={() => setPaymentToCancel(null)}
                  className="rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Abandonner
                </Button>
                <Button
                  type="button"
                  disabled={isCancelling}
                  onClick={confirmCancelPayment}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-lg shadow-rose-600/20 flex items-center gap-2"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Annulation en cours...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} /> Confirmer l'Annulation
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
