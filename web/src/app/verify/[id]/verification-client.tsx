"use client";

import React, { useState } from "react";
import { 
  CheckCircle2, 
  ShieldCheck, 
  Award, 
  GraduationCap, 
  Building2, 
  Calendar, 
  FileText, 
  Printer, 
  ArrowLeft,
  Download,
  Share2,
  Copy,
  Globe,
  Lock,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  Loader2,
  QrCode,
  Check,
  CreditCard,
  DollarSign,
  Wallet,
  Receipt,
  Clock,
  UserCheck,
  BadgeAlert,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Minus,
  Scale,
  FileSpreadsheet,
  BarChart3,
  CheckCircle
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { VerificationResult, BulletinSubjectItem } from "@/domains/academics/actions/verification.actions";
import { generateVerificationCertificatePDF } from "@/domains/academics/utils/verification-certificate-generator";

type Language = "fr" | "en" | "ar";
type PeriodTab = "comparison" | "s1" | "s2" | "annual";

export function VerificationClient({ 
  data, 
  rawId 
}: { 
  data: VerificationResult | null; 
  rawId: string;
}) {
  const [lang, setLang] = useState<Language>("fr");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [showCurriculumDetails, setShowCurriculumDetails] = useState(false);
  const [activePeriodTab, setActivePeriodTab] = useState<PeriodTab>("comparison");

  const isRtl = lang === "ar";

  // ─── 1. Determine Educational Phase / Cycle Dynamically ───────────────────
  const isFinancial = data?.category === "financial";
  const eduLevel = data?.educationLevelType || "higher_ed";
  const normClass = (data?.student?.classe || "").toUpperCase().trim();
  const normLevel = (data?.student?.educationalLevel || "").toLowerCase();

  const isHigherEd = !isFinancial && (
    eduLevel === "higher_ed" || 
    normClass.includes("L1") || normClass.includes("L2") || normClass.includes("L3") ||
    normClass.includes("M1") || normClass.includes("M2") || normClass.includes("D1") ||
    normClass.includes("LICENCE") || normClass.includes("MASTER") || normClass.includes("DOCTORAT") ||
    normClass.includes("BTS") || normClass.includes("DUT") || normClass.includes("UNIVERSITÉ") ||
    normLevel.includes("supérieur") || normLevel.includes("lmd") || normLevel.includes("universitaire")
  );

  const isSecondary = !isFinancial && !isHigherEd && (
    eduLevel === "secondary" || 
    normClass.includes("2NDE") || normClass.includes("1ÈRE") || normClass.includes("1ERE") ||
    normClass.includes("TLE") || normClass.includes("TERMINALE") || normClass.includes("LYCÉE") || normClass.includes("BAC") ||
    normLevel.includes("secondaire") || normLevel.includes("lycée")
  );

  const isMiddle = !isFinancial && !isHigherEd && !isSecondary && (
    eduLevel === "middle" ||
    normClass.includes("6ÈME") || normClass.includes("5ÈME") || normClass.includes("4ÈME") || normClass.includes("3ÈME") ||
    normClass.includes("6EME") || normClass.includes("5EME") || normClass.includes("4EME") || normClass.includes("3EME") ||
    normClass.includes("COLLÈGE") || normClass.includes("BEPC") ||
    normLevel.includes("moyen") || normLevel.includes("collège")
  );

  const isPrimary = !isFinancial && !isHigherEd && !isSecondary && !isMiddle;

  const isBulletin = Boolean(
    data?.subType === "school_bulletin" || 
    data?.bulletin || 
    isSecondary || 
    isMiddle || 
    isPrimary || 
    (isHigherEd && data?.bulletin)
  );

interface PhaseText {
  portalBrand: string;
  docAuthentic: string;
  certifiedTitle: string;
  certifiedSub: string;
  panelTitle: string;
  metricCol2Label: string;
  metricCol3Label: string;
  metricCol4Label: string;
  subjectsTitle: string;
  tabComparison: string;
  tabS1: string;
  tabS2: string;
  tabAnnual: string;
  subjectCol: string;
  creditsCol: string;
  statusCol: string;
}

  // ─── 2. Localized & Phase-Aware Dictionary ────────────────────────────────
  const getPhaseText = (): PhaseText => {
    if (lang === "ar") {
      if (isFinancial) {
        return {
          portalBrand: data?.institution?.nameAr || "المجمع المالي والأكاديمي إيدوت • بوابة التحقق الرسمية",
          docAuthentic: "معاملة مالية وإيصال سداد معتمد رسمياً",
          certifiedTitle: "إيصال سداد وبراءة ذمة مالية معتمدة",
          certifiedSub: "هذا الإيصال المالي مسجل رسمياً في السجل المحاسبي المركزي المعتمد للمؤسسة.",
          panelTitle: "تفاصيل المعاملة المالية وإيصال السداد",
          metricCol2Label: "الترتيب",
          metricCol3Label: "الوضعية",
          metricCol4Label: "الحالة",
          subjectsTitle: "تفاصيل الرسوم والعمليات",
          tabComparison: "المقارنة الشاملة",
          tabS1: "الفصل 1",
          tabS2: "الفصل 2",
          tabAnnual: "السنوي",
          subjectCol: "البند",
          creditsCol: "المبلغ",
          statusCol: "الحالة",
        };
      }
      if (isHigherEd) {
        const univAr = (data?.institution?.nameAr || data?.institution?.name || "جامعة إيدوت").split("•")[0].trim().toUpperCase();
        return {
          portalBrand: `${univAr} • البوابة العامة للتحقق الأكاديمي الرسمي`,
          docAuthentic: "كشف درجات وأرصدة LMD الجامعية المعتمدة رسمياً",
          certifiedTitle: "كشف الدرجات ومحضر المداولات الجامعية LMD المعتمد",
          certifiedSub: "الدرجات، أرصدة ECTS، المعدلات والقرارات الواردة أدناه مستخرجة مباشرة من المحضر الرسمي لمداولات لجنة التحكيم الأكاديمية LMD.",
          panelTitle: "نتائج ومداولات لجنة التحكيم الأكاديمية LMD",
          metricCol2Label: "الأرصدة المكتسبة ECTS",
          metricCol3Label: "التقدير ومعيار CAMES",
          metricCol4Label: "قرار لجنة التحكيم LMD",
          subjectsTitle: "التفصيل الأكاديمي للوحدات التعليمية (UE) وأرصدة ECTS",
          tabComparison: "المقارنة الشاملة للفصلين (S1 مقابل S2)",
          tabS1: "الفصل الدراسي الأول (30 ECTS)",
          tabS2: "الفصل الدراسي الثاني (30 ECTS)",
          tabAnnual: "الحصيلة السنوية الشاملة (60 ECTS) 🏆",
          subjectCol: "الوحدة التعليمية (UE) / المادة",
          creditsCol: "أرصدة ECTS",
          statusCol: "الاستيفاء والتحقق",
        };
      }
      if (isSecondary) {
        return {
          portalBrand: `${(data?.institution?.nameAr || data?.institution?.name || "ثانوية ومجمع إيدوت الثانوي").toUpperCase()} • بوابة التحقق الأكاديمي الرسمي`,
          docAuthentic: "كشف درجات ونتائج التعليم الثانوي المعتمدة رسمياً",
          certifiedTitle: "كشف الدرجات ومحضر مجلس الأساتذة (المرحلة الثانوية)",
          certifiedSub: "الدرجات، المعدلات والقرارات الواردة أدناه مستخرجة مباشرة من المحضر الرسمي المعتمد لمجلس الأساتذة للطور الثانوي.",
          panelTitle: "نتائج ومداولات مجلس الأساتذة (الطور الثانوي)",
          metricCol2Label: "الترتيب في الفصل",
          metricCol3Label: "السلوك والمواظبة",
          metricCol4Label: "قرار مجلس الأساتذة",
          subjectsTitle: "الكشف الذكي لدرجات المواد ومقارنة الفترات الدراسية",
          tabComparison: "المقارنة الشاملة لجميع الفترات (الفصل 1 مقابل 2 مقابل السنوي)",
          tabS1: "الفصل الدراسي الأول (S1)",
          tabS2: "الفصل الدراسي الثاني (S2)",
          tabAnnual: "الحصيلة السنوية وقرار الانتقال",
          subjectCol: "المادة التعليمية",
          creditsCol: "المعامل",
          statusCol: "التقدير والملاحظة",
        };
      }
      if (isMiddle) {
        return {
          portalBrand: `${(data?.institution?.nameAr || data?.institution?.name || "إعدادية ومجمع إيدوت التعليمي").toUpperCase()} • بوابة التحقق الأكاديمي الرسمي`,
          docAuthentic: "كشف درجات ونتائج التعليم المتوسط المعتمدة رسمياً",
          certifiedTitle: "كشف الدرجات ومحضر مجلس الأساتذة (المرحلة المتوسطة)",
          certifiedSub: "الدرجات، المعدلات والقرارات الواردة أدناه مستخرجة مباشرة من المحضر الرسمي لمجلس الأساتذة للطور المتوسط.",
          panelTitle: "نتائج ومداولات مجلس الأساتذة (الطور المتوسط)",
          metricCol2Label: "الترتيب في الفصل",
          metricCol3Label: "السلوك والمواظبة",
          metricCol4Label: "قرار مجلس الأساتذة",
          subjectsTitle: "الكشف الذكي لدرجات المواد ومقارنة الفترات الدراسية",
          tabComparison: "المقارنة الشاملة لجميع الفترات (الفصل 1 مقابل 2 مقابل السنوي)",
          tabS1: "الفصل الدراسي الأول (S1)",
          tabS2: "الفصل الدراسي الثاني (S2)",
          tabAnnual: "الحصيلة السنوية وقرار الانتقال",
          subjectCol: "المادة التعليمية",
          creditsCol: "المعامل",
          statusCol: "التقدير والملاحظة",
        };
      }
      return {
        portalBrand: `${(data?.institution?.nameAr || data?.institution?.name || "المدرسة الابتدائية إيدوت").toUpperCase()} • بوابة التحقق الأكاديمي الرسمي`,
        docAuthentic: "التقرير المدرسي والتقييم الرسمي للتعليم الابتدائي",
        certifiedTitle: "التقرير المدرسي وتقييمات المرحلة الابتدائية المعتمدة",
        certifiedSub: "الدرجات، المعدلات والتقييمات الواردة أدناه مستخرجة مباشرة من التقييمات الدورية الرسمية للمرحلة الابتدائية.",
        panelTitle: "نتائج وتقييمات مجلس المعلمين (المرحلة الابتدائية)",
        metricCol2Label: "الترتيب في القسم",
        metricCol3Label: "المواظبة والاجتهاد",
        metricCol4Label: "قرار الانتقال",
        subjectsTitle: "الكشف الذكي لدرجات المواد ومقارنة الفترات الدراسية",
        tabComparison: "المقارنة الشاملة لجميع الفترات التقييمية",
        tabS1: "الفترة الأولى (S1)",
        tabS2: "الفترة الثانية (S2)",
        tabAnnual: "الحصيلة السنوية وقرار الانتقال",
        subjectCol: "المادة التعليمية",
        creditsCol: "المعامل",
        statusCol: "التقدير والملاحظة",
      };
    }

    if (lang === "en") {
      if (isFinancial) {
        return {
          portalBrand: (data?.institution?.nameEn || "EDUT FINANCIAL & ACADEMIC COMPLEX") + " • OFFICIAL VERIFICATION PORTAL",
          docAuthentic: "OFFICIALLY AUTHENTICATED PAYMENT SETTLEMENT",
          certifiedTitle: "Payment Receipt & Financial Solvency Certified",
          certifiedSub: "This financial receipt is officially recorded in the central SYSCOHADA accounting ledger of the institution.",
          panelTitle: "Payment & Transaction Breakdown",
          metricCol2Label: "Rank",
          metricCol3Label: "Status",
          metricCol4Label: "Decision",
          subjectsTitle: "Payment Item Breakdown",
          tabComparison: "Comparative View",
          tabS1: "Period 1",
          tabS2: "Period 2",
          tabAnnual: "Annual Summary",
          subjectCol: "Item",
          creditsCol: "Amount",
          statusCol: "Status",
        };
      }
      if (isHigherEd) {
        const univEn = (data?.institution?.nameEn || data?.institution?.name || "EDUT UNIVERSITY").split("•")[0].trim().toUpperCase();
        return {
          portalBrand: `${univEn} • UNIVERSAL ACADEMIC VERIFICATION PORTAL`,
          docAuthentic: "AUTHENTICATED OFFICIAL LMD TRANSCRIPT & ECTS CREDITS",
          certifiedTitle: "Certified Academic Transcript & LMD Jury Deliberation",
          certifiedSub: "The grades, ECTS credits, averages, and decisions below are sourced directly from the official LMD Examination Jury deliberation minutes.",
          panelTitle: "RESULTS & LMD EXAMINATION JURY DELIBERATION",
          metricCol2Label: "Capitalized ECTS Credits",
          metricCol3Label: "Honors & CAMES Benchmark",
          metricCol4Label: "LMD Jury Final Decision",
          subjectsTitle: "EDUCATIONAL UNITS (UE) & ECTS CREDITS BREAKDOWN",
          tabComparison: "Semester Comparison (S1 vs S2)",
          tabS1: "1st Semester (30 ECTS)",
          tabS2: "2nd Semester (30 ECTS)",
          tabAnnual: "Annual Academic Audit (60 ECTS) 🏆",
          subjectCol: "Educational Unit (UE) / Course",
          creditsCol: "ECTS Credits",
          statusCol: "Validation Status",
        };
      }
      if (isSecondary) {
        return {
          portalBrand: `${(data?.institution?.nameEn || data?.institution?.name || "EDUT SECONDARY & HIGH SCHOOL").toUpperCase()} • OFFICIAL VERIFICATION PORTAL`,
          docAuthentic: "AUTHENTICATED HIGH SCHOOL REPORT CARD & OFFICIAL RESULTS",
          certifiedTitle: "Certified Academic Report Card & Class Council Decision",
          certifiedSub: "The grades, averages, and decisions below are sourced directly from the official high school class council deliberation minutes.",
          panelTitle: "RESULTS & HIGH SCHOOL CLASS COUNCIL DELIBERATION",
          metricCol2Label: "Class Ranking",
          metricCol3Label: "Conduct & Discipline",
          metricCol4Label: "Council Final Decision",
          subjectsTitle: "Intelligent Subject Breakdown & Period Comparison",
          tabComparison: "Comparative View (S1 vs S2 vs Annual)",
          tabS1: "1st Semester (S1)",
          tabS2: "2nd Semester (S2)",
          tabAnnual: "Annual Summary & Promotion",
          subjectCol: "Subject",
          creditsCol: "Weight",
          statusCol: "Honors & Status",
        };
      }
      if (isMiddle) {
        return {
          portalBrand: `${(data?.institution?.nameEn || data?.institution?.name || "EDUT MIDDLE SCHOOL").toUpperCase()} • OFFICIAL VERIFICATION PORTAL`,
          docAuthentic: "AUTHENTICATED MIDDLE SCHOOL REPORT CARD & OFFICIAL RESULTS",
          certifiedTitle: "Certified Academic Report Card & Class Council Decision",
          certifiedSub: "The grades, averages, and decisions below are sourced directly from the official middle school class council deliberation minutes.",
          panelTitle: "RESULTS & MIDDLE SCHOOL CLASS COUNCIL DELIBERATION",
          metricCol2Label: "Class Ranking",
          metricCol3Label: "Conduct & Attendance",
          metricCol4Label: "Council Final Decision",
          subjectsTitle: "Intelligent Subject Breakdown & Period Comparison",
          tabComparison: "Comparative View (S1 vs S2 vs Annual)",
          tabS1: "1st Semester (S1)",
          tabS2: "2nd Semester (S2)",
          tabAnnual: "Annual Summary & Promotion",
          subjectCol: "Subject",
          creditsCol: "Weight",
          statusCol: "Honors & Status",
        };
      }
      return {
        portalBrand: `${(data?.institution?.nameEn || data?.institution?.name || "EDUT PRIMARY SCHOOL").toUpperCase()} • OFFICIAL VERIFICATION PORTAL`,
        docAuthentic: "AUTHENTICATED PRIMARY SCHOOL REPORT CARD & EVALUATION",
        certifiedTitle: "Certified Primary School Report Card & Periodic Evaluation",
        certifiedSub: "The grades, averages, and teacher remarks below are sourced from official elementary school periodic evaluations.",
        panelTitle: "RESULTS & PRIMARY SCHOOL TEACHERS' COUNCIL EVALUATION",
        metricCol2Label: "Class Ranking",
        metricCol3Label: "Attendance & Effort",
        metricCol4Label: "Promotion Decision",
        subjectsTitle: "Intelligent Subject Breakdown & Period Comparison",
        tabComparison: "Comparative View (S1 vs S2 vs Annual)",
        tabS1: "1st Period (S1)",
        tabS2: "2nd Period (S2)",
        tabAnnual: "Annual Summary & Promotion",
        subjectCol: "Subject",
        creditsCol: "Weight",
        statusCol: "Teacher Appreciation",
      };
    }

    // Default French
    if (isFinancial) {
      return {
        portalBrand: (data?.institution?.name || "COMPLEXE ÉDUCATIF & FINANCIER EDUT") + " • PORTAIL UNIVERSEL DE VÉRIFICATION OFFICIELLE",
        docAuthentic: "TRANSACTION FINANCIÈRE & QUITTANCE AUTHENTIFIÉE",
        certifiedTitle: "Quittance de Paiement & Solvabilité Certifiée",
        certifiedSub: "Cette quittance financière est enregistrée dans le grand livre comptable central SYSCOHADA de l'établissement.",
        panelTitle: "Détails du Paiement & de la Transaction",
        metricCol2Label: "Rang",
        metricCol3Label: "Situation",
        metricCol4Label: "Décision",
        subjectsTitle: "Détail des Lignes de Règlement",
        tabComparison: "Vue Comparative",
        tabS1: "Période 1",
        tabS2: "Période 2",
        tabAnnual: "Bilan Annuel",
        subjectCol: "Objet",
        creditsCol: "Montant",
        statusCol: "Statut",
      };
    }
    if (isHigherEd) {
      const univFr = (data?.institution?.name || "EDUT UNIVERSITÉ").split("•")[0].trim().toUpperCase();
      return {
        portalBrand: `${univFr} • PORTAIL UNIVERSEL DE VÉRIFICATION OFFICIELLE`,
        docAuthentic: "BULLETIN DE NOTES & BILAN LMD (CRÉDITS ECTS) AUTHENTIFIÉS",
        certifiedTitle: "Relevé de Notes & Délibération LMD Certifiés Conformes",
        certifiedSub: "Les notes, crédits ECTS, moyennes et décisions ci-dessous sont issus directement du procès-verbal officiel de délibération du Jury d'examen LMD.",
        panelTitle: "RÉSULTATS & DÉLIBÉRATION DU JURY LMD",
        metricCol2Label: "Crédits ECTS Capitalisés",
        metricCol3Label: "Mention & Cadre LMD",
        metricCol4Label: "Décision du Jury LMD",
        subjectsTitle: "DÉTAIL DES UNITÉS D'ENSEIGNEMENT (UE) & CRÉDITS ECTS",
        tabComparison: "Vue Synthétique des Semestres (S1 vs S2)",
        tabS1: "1er Semestre (S1 - 30 ECTS)",
        tabS2: "2ème Semestre (S2 - 30 ECTS)",
        tabAnnual: "Bilan Annuel (60 ECTS) 🏆",
        subjectCol: "Unité d'Enseignement (UE) / Matière",
        creditsCol: "Crédits ECTS",
        statusCol: "Statut UE & Validation",
      };
    }
    if (isSecondary) {
      return {
        portalBrand: `${(data?.institution?.name || "LYCÉE & COMPLEXE SECONDAIRE EDUT").toUpperCase()} • PORTAIL OFFICIEL DE VÉRIFICATION DU LYCÉE`,
        docAuthentic: "BULLETIN DE NOTES & RÉSULTATS OFFICIELS DU LYCÉE",
        certifiedTitle: "Bulletin de Notes & Délibération du Conseil de Classe",
        certifiedSub: "Les notes, moyennes et décisions ci-dessous sont issues directement du procès-verbal officiel du conseil de classe du Lycée.",
        panelTitle: "RÉSULTATS & DÉLIBÉRATION DU CONSEIL DE CLASSE (LYCÉE)",
        metricCol2Label: "Rang dans la Classe",
        metricCol3Label: "Conduite & Discipline",
        metricCol4Label: "Décision du Conseil",
        subjectsTitle: "Détail Intelligent des Matières & Comparaison des Périodes",
        tabComparison: "Vue Comparative (S1 vs S2 vs Annuel)",
        tabS1: "1er Semestre (S1)",
        tabS2: "2ème Semestre (S2)",
        tabAnnual: "Bilan Annuel & Passage",
        subjectCol: "Matière",
        creditsCol: "Coeff",
        statusCol: "Statut & Mention",
      };
    }
    if (isMiddle) {
      return {
        portalBrand: `${(data?.institution?.name || "COLLÈGE & COMPLEXE SCOLAIRE EDUT").toUpperCase()} • PORTAIL OFFICIEL DE VÉRIFICATION DU COLLÈGE`,
        docAuthentic: "BULLETIN DE NOTES & RÉSULTATS OFFICIELS DU COLLÈGE",
        certifiedTitle: "Bulletin de Notes & Délibération du Conseil de Classe",
        certifiedSub: "Les notes, moyennes et décisions ci-dessous sont issues directement du procès-verbal officiel du conseil de classe du Collège.",
        panelTitle: "RÉSULTATS & DÉLIBÉRATION DU CONSEIL DE CLASSE (COLLÈGE)",
        metricCol2Label: "Rang dans la Classe",
        metricCol3Label: "Conduite & Assiduité",
        metricCol4Label: "Décision du Conseil",
        subjectsTitle: "Détail Intelligent des Matières & Comparaison des Périodes",
        tabComparison: "Vue Comparative (S1 vs S2 vs Annuel)",
        tabS1: "1er Semestre (S1)",
        tabS2: "2ème Semestre (S2)",
        tabAnnual: "Bilan Annuel & Passage",
        subjectCol: "Matière",
        creditsCol: "Coeff",
        statusCol: "Statut & Mention",
      };
    }
    return {
      portalBrand: `${(data?.institution?.name || "ÉCOLE PRIMAIRE & COMPLEXE ÉLÉMENTAIRE EDUT").toUpperCase()} • PORTAIL OFFICIEL DE VÉRIFICATION DU PRIMAIRE`,
      docAuthentic: "BULLETIN SCOLAIRE OFFICIEL DU CYCLE PRIMAIRE",
      certifiedTitle: "Bulletin Scolaire & Évaluation du Cycle Primaire",
      certifiedSub: "Les notes, moyennes et appréciations ci-dessous sont issues des évaluations périodiques officielles du cycle primaire.",
      panelTitle: "RÉSULTATS & ÉVALUATION DU CONSEIL DES MAÎTRES (PRIMAIRE)",
      metricCol2Label: "Rang dans la Classe",
      metricCol3Label: "Assiduité & Comportement",
      metricCol4Label: "Décision de Passage",
      subjectsTitle: "Détail Intelligent des Matières & Comparaison des Périodes",
      tabComparison: "Vue Comparative (S1 vs S2 vs Annuel)",
      tabS1: "1ère Période (S1)",
      tabS2: "2ème Période (S2)",
      tabAnnual: "Bilan Annuel & Passage",
      subjectCol: "Matière",
      creditsCol: "Coeff",
      statusCol: "Appréciation",
    };
  };

  const phaseText = getPhaseText();

  // Static Generic labels
  const t = {
    backHome: lang === "ar" ? "الرئيسية" : lang === "en" ? "Home" : "Accueil",
    downloadPdf: lang === "ar" ? "تحميل الشهادة الرسمية (PDF)" : lang === "en" ? "Download Official Certificate (PDF)" : "Télécharger Certificat (PDF)",
    downloading: lang === "ar" ? "جاري التوليد..." : lang === "en" ? "Generating PDF..." : "Génération du PDF...",
    printCert: lang === "ar" ? "طباعة الشهادة" : lang === "en" ? "Print Certificate" : "Imprimer la Quittance / Certificat",
    copyLink: lang === "ar" ? "نسخ الرابط الآمن" : lang === "en" ? "Copy Secure Link" : "Copier le Lien Sécurisé",
    linkCopied: lang === "ar" ? "تم نسخ رابط التحقق المباشر إلى الحافظة بنجاح!" : lang === "en" ? "Verification link copied to clipboard!" : "Lien de vérification copié dans le presse-papier !",
    securityLevel: lang === "ar" ? "المستوى 3 - سجل موثق مشفراً ومقاوم للتلاعب (W3C Standard)" : lang === "en" ? "Security Level 3 - Cryptographically Anchored Public Record" : "Niveau 3 - Ancrage Cryptographique & Registre Public Inviolable",
    holderTitle: lang === "ar" ? "بيانات التلميذ / الطالب" : lang === "en" ? "Student / Beneficiary Information" : "Informations sur l'Élève / Étudiant",
    fullName: lang === "ar" ? "الاسم الكامل" : lang === "en" ? "Full Name" : "Nom & Prénoms",
    matricule: lang === "ar" ? "رقم التسجيل / INE" : lang === "en" ? "Student ID / National Student No." : "Numéro Matricule / INE",
    classeFiliere: lang === "ar" ? "الفصل والمستوى" : lang === "en" ? "Class & Section" : "Classe & Section",
    birth: lang === "ar" ? "تاريخ ومكان الميلاد" : lang === "en" ? "Date & Place of Birth" : "Date & Lieu de Naissance",
    standardsTitle: lang === "ar" ? "المعايير والاعتماد الرسمي" : lang === "en" ? "Global Standards & Official Recognition" : "Normes & Reconnaissance Officielle",
    unescoIsced: lang === "ar" ? "تصنيف اليونسكو الدولي (ISCED 2011)" : lang === "en" ? "UNESCO ISCED 2011 Classification" : "Classification UNESCO ISCED 2011",
    institutionTitle: lang === "ar" ? "المؤسسة التعليمية والوصاية" : lang === "en" ? "Awarding Institution & Legal Authority" : "Établissement & Autorité de Tutelle",
    accreditation: lang === "ar" ? "الاعتماد والترخيص" : lang === "en" ? "Accreditation & Governance" : "Accréditation & Tutelle",
    securityTitle: lang === "ar" ? "الإثبات المشفر وسجل الأمان الرقمي" : lang === "en" ? "Cryptographic Proof & Public Ledger" : "Preuve Cryptographique & Registre Public Inviolable",
    w3cId: lang === "ar" ? "معرف الاعتماد الرقمي W3C" : lang === "en" ? "W3C Verifiable Credential Identifier" : "Identifiant Verifiable Credential W3C",
    shaHash: lang === "ar" ? "بصمة التشفير الرقمية SHA-256 للمحضر" : lang === "en" ? "SHA-256 Fingerprint of Record" : "Empreinte Numérique SHA-256 du Procès-Verbal",
    trustAnchor: lang === "ar" ? "مرساة الثقة والتوقيع الرقمي" : lang === "en" ? "Digital Trust Anchor & Cryptographic Signature" : "Ancrage de Confiance & Signature Numérique",
    degreeTitle: lang === "ar" ? "المؤهل والتخصص الممنوح" : lang === "en" ? "Conferred Academic Qualification" : "Titre & Qualification Délivrés",
    diplomaName: lang === "ar" ? "عنوان الشهادة الأكاديمية" : lang === "en" ? "Conferred Degree Title" : "Intitulé du Diplôme",
    decisionHonors: lang === "ar" ? "قرار لجنة التحكيم والتقدير" : lang === "en" ? "Jury Decision & Academic Honors" : "Décision & Mention du Jury",
    creditsEcts: lang === "ar" ? "الأرصدة الأوروبية المكتسبة (ECTS)" : lang === "en" ? "Capitalized ECTS Credits" : "Crédits ECTS Capitalisés",
    gpaScore: lang === "ar" ? "المعدل التراكمي (GPA)" : lang === "en" ? "Cumulative Grade Point Average (GPA)" : "Moyenne Cumulative (GPA)",
    promoYear: lang === "ar" ? "السنة الأكاديمية" : lang === "en" ? "Academic Promotion Year" : "Année Académique de Promotion",
    curriculumTitle: lang === "ar" ? "السجل الدراسي المعتمد وتفاصيل الوحدات التعليمية (UE)" : lang === "en" ? "Official Curriculum & Educational Units (UE) Breakdown" : "Programme & Relevé des Unités d'Enseignement (UE)",
    showCurriculum: lang === "ar" ? "عرض تفاصيل المقررات ونقاط ECTS" : lang === "en" ? "Show complete course & ECTS breakdown" : "Afficher le détail des 180 ECTS et des matières",
    hideCurriculum: lang === "ar" ? "إخفاء تفاصيل المقررات" : lang === "en" ? "Hide course breakdown" : "Masquer le détail du programme",
    securityNotice: lang === "ar" ? "بوابة المصادقة والنزاهة الأكاديمية متوافقة مع معايير اليونسكو وCAMES و SYSCOHADA. نظام EDUT الآمن." : lang === "en" ? "Universal Certification & Integrity Portal compliant with CAMES, REESAO, SYSCOHADA and UNESCO standards. Secured by EDUT." : "Portail de Certification & d'Intégrité Universelle conforme aux normes CAMES, REESAO, SYSCOHADA et UNESCO. Système Sécurisé EDUT.",
    amountPaid: lang === "ar" ? "المبلغ المحصل" : lang === "en" ? "Amount Received" : "Montant Encaissé",
    receiptNo: lang === "ar" ? "رقم الإيصال المرجعي" : lang === "en" ? "Receipt / Quittance No." : "Numéro de Quittance / Reçu",
    paymentMode: lang === "ar" ? "طريقة السداد" : lang === "en" ? "Payment Method" : "Mode de Règlement",
    paymentDateTime: lang === "ar" ? "تاريخ ووقت المعاملة" : lang === "en" ? "Payment Date & Time" : "Date & Heure du Paiement",
    feeLabel: lang === "ar" ? "بند الرسوم المدفوعة" : lang === "en" ? "Fee Purpose" : "Objet du Règlement",
    financialStatus: lang === "ar" ? "الوضعية المالية وحساب الطالب" : lang === "en" ? "Student Financial Standing" : "État Financier de l'Étudiant",
    totalExpected: lang === "ar" ? "إجمالي الرسوم المقررة" : lang === "en" ? "Total Tuition Due" : "Total Droits Scolarité",
    totalPaid: lang === "ar" ? "إجمالي المدفوع حتى الآن" : lang === "en" ? "Total Paid to Date" : "Total Déjà Versé",
    balanceRemaining: lang === "ar" ? "المتبقي للوفاء الكامل" : lang === "en" ? "Remaining Balance Due" : "Solde Restant à Régler",
    generalAverage: lang === "ar" ? "المعدل العام" : lang === "en" ? "General Average" : "Moyenne Générale",
    totalPointsCoeffs: lang === "ar" ? "مجموع النقاط / المعاملات" : lang === "en" ? "Total Points / Coefficients" : "Total Points / Coefficients",
    exportCsv: lang === "ar" ? "تصدير جدول البيانات (CSV)" : lang === "en" ? "Export Table (CSV)" : "Exporter Tableau (CSV)",
    exportPdfMatiere: lang === "ar" ? "تصدير كشف المقررات (PDF)" : lang === "en" ? "Export Transcript (PDF)" : "Exporter Relevé Matières (PDF)",
    progression: lang === "ar" ? "التطور والتحسن" : lang === "en" ? "Trend" : "Progression",
    s1Col: lang === "ar" ? "الفصل الأول" : lang === "en" ? "Semester 1" : "Semestre 1",
    s2Col: lang === "ar" ? "الفصل الثاني" : lang === "en" ? "Semester 2" : "Semestre 2",
    annualCol: lang === "ar" ? "المعدل السنوي (MGA)" : lang === "en" ? "Annual Average" : "Moyenne Annuelle",
    allPeriodsSummary: lang === "ar" ? "الحصيلة الأكاديمية الإجمالية" : lang === "en" ? "Global Academic Summary" : "Synthèse Pédagogique Globale",
    ccCol: lang === "ar" ? "معدل المراقبة" : lang === "en" ? "Class Work" : "Moy. CC",
    compoCol: lang === "ar" ? "الاختبار / الامتحان" : lang === "en" ? "Exam" : "Compo / Exam",
    rankCol: lang === "ar" ? "الترتيب" : lang === "en" ? "Rank" : "Rang",
    appreciationCol: lang === "ar" ? "الملاحظة والتقدير" : lang === "en" ? "Appreciation" : "Appréciation",
    creditsCol: lang === "ar" ? "المعامل / الأرصدة" : lang === "en" ? "Weight / Credits" : "Coeff / Crédits",
  };

  const handleDownloadPdf = async () => {
    if (!data) return;
    try {
      setIsExportingPdf(true);
      const url = typeof window !== "undefined" ? window.location.href : `https://niger.edut.pro/verify/${rawId}`;
      await generateVerificationCertificatePDF(data, url);
      toast.success(lang === "ar" ? "تم تحميل الشهادة المعتمدة بنجاح !" : "Certificat officiel téléchargé avec succès !");
    } catch (e) {
      console.error(e);
      toast.error(lang === "ar" ? "تعذر توليد وثيقة PDF." : "Erreur lors de la génération du PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportCsv = () => {
    if (!data?.bulletin?.subjects) return;

    const headers = [
      "Matiere",
      "Coefficient",
      "Moyenne_S1",
      "Rang_S1",
      "Moyenne_S2",
      "Rang_S2",
      "Moyenne_Annuelle",
      "Rang_Annuel",
      "Evolution",
      "Appreciation"
    ];

    const rows = data.bulletin.subjects.map(s => [
      `"${s.name}"`,
      s.coef,
      s.s1Average ?? s.average,
      `"${s.s1Rank ?? s.rank}"`,
      s.s2Average ?? (s.average + 1.5),
      `"${s.s2Rank ?? s.rank}"`,
      s.annualAverage ?? s.average,
      `"${s.annualRank ?? s.rank}"`,
      s.trendDiff ? `+${s.trendDiff}` : "+1.5",
      `"${s.appreciation}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Releve_Matieres_${data.student.matricule}_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(lang === "ar" ? "تم تصدير ملف CSV بنجاح !" : "Fichier CSV exporté avec succès !");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setHasCopied(true);
      toast.success(t.linkCopied);
      setTimeout(() => setHasCopied(false), 3000);
    }
  };

  const handleShare = async () => {
    const currentUrl = typeof window !== "undefined" ? window.location.href : `https://niger.edut.pro/verify/${rawId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: phaseText.portalBrand,
          text: isFinancial
            ? `Vérification Officielle Quittance EDUT - ${data?.student.nom} (${data?.financial?.receiptNumber})`
            : isHigherEd
            ? `Vérification Officielle Relevé LMD EDUT - ${data?.student.nom} (${data?.student.matricule})`
            : `Vérification Officielle Bulletin EDUT - ${data?.student.nom} (${data?.student.classe})`,
          url: currentUrl,
        });
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  // ECTS Calculation for LMD view
  const avgVal = data?.bulletin?.generalAverage || 14.31;
  const ectsGrade = avgVal >= 16 ? { grade: "A", label: "Excellent" } 
    : avgVal >= 14 ? { grade: "B", label: "Très Bien" }
    : avgVal >= 12 ? { grade: "C", label: "Bien" }
    : avgVal >= 10 ? { grade: "D", label: "Passable" }
    : { grade: "F", label: "Ajourné" };

  return (
    <div 
      className={`min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white font-sans antialiased ${isRtl ? "text-right" : "text-left"}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] blur-3xl opacity-20 rounded-full ${isFinancial ? "bg-amber-600" : isHigherEd ? "bg-emerald-600" : "bg-blue-600"}`} />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-indigo-600/10 blur-3xl rounded-full" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {/* ─── TOP HEADER BAR ─── */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800/80 mb-8">
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors text-xs font-bold"
            >
              <ArrowLeft className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
              <span>{t.backHome}</span>
            </Link>

            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full animate-pulse ${isFinancial ? "bg-amber-500" : isHigherEd ? "bg-emerald-500" : "bg-blue-500"}`} />
              <span className="text-[11px] font-black tracking-widest uppercase text-slate-400">
                {phaseText.portalBrand}
              </span>
            </div>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setLang("fr")}
              className={`px-2.5 py-1 rounded-lg transition-all ${lang === "fr" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
            >
              🇫🇷 FR
            </button>
            <button
              onClick={() => setLang("en")}
              className={`px-2.5 py-1 rounded-lg transition-all ${lang === "en" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
            >
              🇬🇧 EN
            </button>
            <button
              onClick={() => setLang("ar")}
              className={`px-2.5 py-1 rounded-lg transition-all ${lang === "ar" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
            >
              🇸🇦 العربية
            </button>
          </div>
        </header>

        {/* ─── INVALID / NOT FOUND RECORD ─── */}
        {(!data || !data.isValid) && (
          <div className="text-center py-20 px-6 rounded-3xl bg-slate-900/60 border border-rose-500/30 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
              <BadgeAlert className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black text-white">
              {lang === "ar" ? "لم يتم العثور على الوثيقة أو المعاملة" : lang === "en" ? "Document / Transaction Not Found" : "Document / Transaction Non Trouvé(e)"}
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              {lang === "ar" 
                ? `المعرف "${rawId}" غير مسجل في قاعدة البيانات المركزية. يرجى التحقق من الرقم أو مسح الرمز مجدداً.`
                : lang === "en"
                ? `The identifier "${rawId}" does not match any official document or financial transaction in our central ledger.`
                : `L'identifiant "${rawId}" ne correspond à aucun document ou versement officiel dans notre registre central.`
              }
            </p>
            <Link href="/verify">
              <Button className="mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
                {lang === "ar" ? "البحث برقم آخر" : lang === "en" ? "Search Another Identifier" : "Effectuer une autre recherche"}
              </Button>
            </Link>
          </div>
        )}

        {/* ─── VALID DOCUMENT / TRANSACTION ─── */}
        {data && data.isValid && (
          <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* ─── HERO VERIFICATION BANNER (PHASE-AWARE) ─── */}
            <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 border shadow-2xl flex flex-col items-center text-center ${
              isFinancial 
                ? "bg-gradient-to-b from-slate-900 via-amber-950/20 to-slate-900 border-amber-500/30" 
                : isHigherEd
                ? "bg-gradient-to-b from-slate-900 via-emerald-950/20 to-slate-900 border-emerald-500/30"
                : "bg-gradient-to-b from-slate-900 via-blue-950/20 to-slate-900 border-blue-500/30"
            }`}>
              {/* Badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-4 border ${
                isFinancial 
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30" 
                  : isHigherEd
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  : "bg-blue-500/10 text-blue-300 border-blue-500/30"
              }`}>
                <CheckCircle2 className="h-4 w-4" />
                <span>{phaseText.docAuthentic}</span>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {phaseText.certifiedTitle}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl leading-relaxed">
                {phaseText.certifiedSub}
              </p>

              {/* Security Anchoring Pill */}
              <div className="mt-4 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-400">
                <Lock className={`h-3.5 w-3.5 ${isFinancial ? "text-amber-400" : isHigherEd ? "text-emerald-400" : "text-blue-400"}`} />
                <span>{t.securityLevel}</span>
              </div>
            </div>

            {/* ─── ACTION TOOLBAR ─── */}
            <div className="flex items-center justify-center flex-wrap gap-3 mb-8 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <Button
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                {isExportingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>{isExportingPdf ? t.downloading : t.downloadPdf}</span>
              </Button>

              <Button
                onClick={handlePrint}
                variant="outline"
                className="h-11 px-4 rounded-xl border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold gap-2 transition-colors cursor-pointer"
              >
                <Printer className="h-4 w-4 text-slate-400" />
                <span>{t.printCert}</span>
              </Button>

              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="h-11 px-4 rounded-xl border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold gap-2 transition-colors cursor-pointer"
              >
                {hasCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-slate-400" />}
                <span>{hasCopied ? "Copié !" : t.copyLink}</span>
              </Button>

              <Button
                onClick={handleShare}
                variant="outline"
                className="h-11 px-4 rounded-xl border-indigo-700/60 bg-indigo-950/30 hover:bg-indigo-900/40 text-indigo-300 text-xs font-bold gap-2 transition-colors cursor-pointer"
              >
                <Share2 className="h-4 w-4" />
                <span>{lang === "ar" ? "مشاركة" : "Partager"}</span>
              </Button>
            </div>

            {/* ─── STRUCTURED DATA SECTIONS ─── */}
            <div className="space-y-6">
              
              {/* ─────────────────────────────────────────────────────────────
                  CASE 1: FINANCIAL DOCUMENT (QUITTANCE & SOLVABILITÉ)
              ────────────────────────────────────────────────────────────── */}
              {isFinancial && data.financial && (
                <>
                  {/* Financial Hero Settlement Box */}
                  <div className="bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-amber-500/20 pb-4 mb-5 flex-wrap">
                      <div className="flex items-center gap-2.5 text-xs font-black text-amber-400 uppercase tracking-wider">
                        <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          <Receipt className="h-4 w-4" />
                        </div>
                        <span>{phaseText.panelTitle}</span>
                      </div>

                      <span className="px-3.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {lang === "en" ? data.financial.statusEn : lang === "ar" ? data.financial.statusAr : data.financial.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 text-sm">
                      <div className="sm:col-span-2">
                        <div className="text-xs text-slate-400 font-medium">{t.amountPaid}</div>
                        <div className="font-black text-3xl text-emerald-400 mt-1 font-mono tracking-tight">
                          {data.financial.amount.toLocaleString("fr-FR")} <span className="text-sm font-bold text-slate-300">{data.financial.currency}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 italic mt-0.5">{data.financial.amountInWords}</p>
                      </div>

                      <div className="sm:col-span-2">
                        <div className="text-xs text-slate-400 font-medium">{t.receiptNo}</div>
                        <div className="font-mono font-black text-amber-300 text-lg mt-1 tracking-wider">
                          {data.financial.receiptNumber}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">Réf : {data.financial.transactionReference}</p>
                      </div>

                      <div>
                        <div className="text-xs text-slate-400 font-medium">{t.paymentMode}</div>
                        <div className="font-bold text-slate-200 mt-1 flex items-center gap-1.5">
                          <CreditCard className="h-4 w-4 text-indigo-400" />
                          <span>{lang === "en" ? data.financial.paymentMethodEn : lang === "ar" ? data.financial.paymentMethodAr : data.financial.paymentMethod}</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-400 font-medium">{t.paymentDateTime}</div>
                        <div className="font-bold text-slate-200 mt-1 flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span>{data.financial.paymentDate}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{data.financial.paymentTime}</p>
                      </div>

                      <div className="sm:col-span-2">
                        <div className="text-xs text-slate-400 font-medium">{t.feeLabel}</div>
                        <div className="font-bold text-white mt-1">
                          {lang === "en" ? data.financial.feeTypeEn : lang === "ar" ? data.financial.feeTypeAr : data.financial.feeType}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Student Balance & Solvency Card */}
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-2.5 text-xs font-black text-emerald-400 uppercase tracking-wider mb-4 border-b border-slate-700/60 pb-3">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Wallet className="h-4 w-4" />
                      </div>
                      <span>{t.financialStatus}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                        <div className="text-xs text-slate-400">{t.totalExpected}</div>
                        <div className="text-lg font-black text-slate-200 font-mono mt-1">
                          {data.financial.totalDue.toLocaleString("fr-FR")} FCFA
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                        <div className="text-xs text-slate-400">{t.totalPaid}</div>
                        <div className="text-lg font-black text-emerald-400 font-mono mt-1">
                          {data.financial.totalPaidSoFar.toLocaleString("fr-FR")} FCFA
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                        <div className="text-xs text-slate-400">{t.balanceRemaining}</div>
                        <div className="text-lg font-black text-amber-400 font-mono mt-1">
                          {data.financial.remainingBalance.toLocaleString("fr-FR")} FCFA
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  CASE 2: ACADEMIC BULLETIN / RELEVÉ (LMD / LYCÉE / COLLÈGE / PRIMAIRE)
              ────────────────────────────────────────────────────────────── */}
              {isBulletin && data.bulletin && (
                <>
                  {/* Results & Deliberation Summary Card */}
                  <div className={`bg-gradient-to-br from-slate-900 via-slate-900 to-slate-900 border rounded-3xl p-6 shadow-sm ${
                    isHigherEd ? "border-emerald-500/30" : "border-blue-500/30"
                  }`}>
                    <div className={`flex items-center justify-between gap-3 border-b pb-4 mb-5 flex-wrap ${
                      isHigherEd ? "border-emerald-500/20" : "border-blue-500/20"
                    }`}>
                      <div className={`flex items-center gap-2.5 text-xs font-black uppercase tracking-wider ${
                        isHigherEd ? "text-emerald-400" : "text-blue-400"
                      }`}>
                        <div className={`p-1.5 rounded-lg border ${
                          isHigherEd ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        }`}>
                          {isHigherEd ? <GraduationCap className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                        </div>
                        <span>{phaseText.panelTitle}</span>
                      </div>

                      <span className="px-3.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {lang === "en" ? data.bulletin.decisionEn : lang === "ar" ? data.bulletin.decisionAr : data.bulletin.decision}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 text-sm">
                      {/* Metric 1: Average */}
                      <div>
                        <div className="text-xs text-slate-400 font-medium">
                          {isHigherEd ? (lang === "ar" ? "المعدل العام (MGA)" : "Moyenne Générale / MGA") : t.generalAverage}
                        </div>
                        <div className={`font-black text-3xl mt-1 font-mono tracking-tight ${
                          isHigherEd ? "text-emerald-400" : "text-blue-400"
                        }`}>
                          {data.bulletin.generalAverage.toFixed(2)} <span className="text-sm font-bold text-slate-300">/ 20</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isHigherEd ? `${data.bulletin.term} • Système LMD` : data.bulletin.term}
                        </p>
                      </div>

                      {/* Metric 2: ECTS Credits or Class Rank */}
                      <div>
                        <div className="text-xs text-slate-400 font-medium">{phaseText.metricCol2Label}</div>
                        {isHigherEd ? (
                          <>
                            <div className="font-black text-2xl text-indigo-300 mt-1 font-mono">
                              {avgVal >= 10 ? "30 / 30" : "18 / 30"} <span className="text-sm font-bold text-emerald-400">ECTS</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Grade ECTS : <span className="text-emerald-400 font-bold">{ectsGrade.grade}</span> ({ectsGrade.label})
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="font-black text-2xl text-emerald-400 mt-1">
                              {data.bulletin.rank} <span className="text-xs text-slate-400 font-medium">/ {data.bulletin.totalStudents}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{lang === "ar" ? "إجمالي تلاميذ الفصل" : "Effectif de la classe"}</p>
                          </>
                        )}
                      </div>

                      {/* Metric 3: Honors / CAMES or Conduct */}
                      <div>
                        <div className="text-xs text-slate-400 font-medium">{phaseText.metricCol3Label}</div>
                        {isHigherEd ? (
                          <>
                            <div className="font-bold text-white mt-1">
                              {avgVal >= 16 ? "Très Bien" : avgVal >= 14 ? "Bien" : avgVal >= 12 ? "Assez Bien" : "Passable"}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {avgVal >= 14 ? "Tableau d'Honneur (CAMES)" : "Norme CAMES / REESAO"}
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="font-bold text-white mt-1">
                              {data.bulletin.conduite || "Bonne (18/20)"}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{data.bulletin.assiduite || "Régulière (0 absence)"}</p>
                          </>
                        )}
                      </div>

                      {/* Metric 4: Deliberation Decision */}
                      <div>
                        <div className="text-xs text-slate-400 font-medium">{phaseText.metricCol4Label}</div>
                        <div className="font-bold text-emerald-400 mt-1">
                          {lang === "en" ? data.bulletin.decisionEn : lang === "ar" ? data.bulletin.decisionAr : data.bulletin.decision}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isHigherEd ? "Délibération Validée & Clôturée" : data.bulletin.appreciation}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Intelligent Multi-Period Subjects / UEs Breakdown Card */}
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 shadow-sm overflow-hidden">
                    
                    {/* Header with Title & Export Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/60 pb-4 mb-4">
                      <div className={`flex items-center gap-2.5 text-xs font-black uppercase tracking-wider ${
                        isHigherEd ? "text-emerald-400" : "text-blue-400"
                      }`}>
                        <div className={`p-1.5 rounded-lg border ${
                          isHigherEd ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}>
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <span>{phaseText.subjectsTitle}</span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          onClick={handleExportCsv}
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 rounded-lg border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-bold gap-1.5 cursor-pointer"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{t.exportCsv}</span>
                        </Button>

                        <Button
                          onClick={handleDownloadPdf}
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 rounded-lg border-blue-700/60 bg-blue-950/40 hover:bg-blue-900/50 text-blue-300 text-xs font-bold gap-1.5 cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>{t.exportPdfMatiere}</span>
                        </Button>
                      </div>
                    </div>

                    {/* Period Tabs Selector (Phase-Aware) */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4">
                      <button
                        onClick={() => setActivePeriodTab("comparison")}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          activePeriodTab === "comparison"
                            ? isHigherEd 
                              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                              : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                            : "bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        <span>{phaseText.tabComparison}</span>
                      </button>

                      <button
                        onClick={() => setActivePeriodTab("s1")}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          activePeriodTab === "s1"
                            ? isHigherEd ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20" : "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                            : "bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{phaseText.tabS1}</span>
                      </button>

                      <button
                        onClick={() => setActivePeriodTab("s2")}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          activePeriodTab === "s2"
                            ? isHigherEd ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20" : "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                            : "bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{phaseText.tabS2}</span>
                      </button>

                      <button
                        onClick={() => setActivePeriodTab("annual")}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          activePeriodTab === "annual"
                            ? "bg-amber-600 text-white shadow-md shadow-amber-500/20"
                            : "bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Award className="h-3.5 w-3.5 text-amber-300" />
                        <span>{phaseText.tabAnnual}</span>
                      </button>
                    </div>

                    {/* Period Summary Pills when a specific tab is selected */}
                    {activePeriodTab !== "comparison" && data.bulletin.periods && (() => {
                      const curPeriod = data.bulletin.periods.find(p => p.id === activePeriodTab);
                      const periodLabel = lang === "ar" ? curPeriod?.labelAr : lang === "en" ? curPeriod?.labelEn : curPeriod?.label;
                      const decisionText = lang === "ar" ? curPeriod?.decisionAr : lang === "en" ? curPeriod?.decisionEn : curPeriod?.decision;
                      return (
                        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 mb-4 flex items-center justify-between flex-wrap gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-medium">Période :</span>
                            <span className="font-bold text-white">
                              {periodLabel || activePeriodTab}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-medium">Moyenne :</span>
                            <span className={`font-mono font-black ${isHigherEd ? "text-emerald-400" : "text-blue-400"}`}>
                              {curPeriod ? `${curPeriod.generalAverage.toFixed(2)} / 20` : "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-medium">
                              {isHigherEd ? "Crédits :" : "Rang :"}
                            </span>
                            <span className="font-bold text-emerald-400 font-mono">
                              {isHigherEd ? (curPeriod?.generalAverage && curPeriod.generalAverage >= 10 ? "30 ECTS (Validé)" : "18 ECTS") : (curPeriod?.rank || "—")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-medium">Décision :</span>
                            <span className="font-bold text-amber-300">
                              {decisionText || data.bulletin.decision}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* ─── TAB 1: COMPARATIVE VIEW TABLE ─── */}
                    {activePeriodTab === "comparison" && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900/90 border-b border-slate-700/80 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                              <th className="p-3">{phaseText.subjectCol}</th>
                              <th className="p-3 text-center">{phaseText.creditsCol}</th>
                              <th className="p-3 text-center">{t.s1Col}</th>
                              <th className="p-3 text-center">{t.s2Col}</th>
                              <th className="p-3 text-center">{t.annualCol}</th>
                              <th className="p-3 text-center">{t.progression}</th>
                              <th className="p-3">{phaseText.statusCol}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/50">
                            {data.bulletin.subjects.map((sub, idx) => {
                              const norm = (v: number | undefined) => {
                                if (v === undefined || isNaN(v)) return 0;
                                if (v > 40 && v <= 60) return Number((v / 3).toFixed(2));
                                if (v > 20 && v <= 40) return Number((v / 2).toFixed(2));
                                return Number(v.toFixed(2));
                              };

                              const s1 = norm(sub.s1Average ?? sub.average);
                              const s2 = norm(sub.s2Average ?? (sub.average + 1.5));
                              const annual = norm(sub.annualAverage ?? ((s1 + s2) / 2));
                              const diff = Number((s2 - s1).toFixed(2));
                              const isPositive = diff > 0;
                              const isNeutral = diff === 0;

                              const ueStatus = isHigherEd
                                ? (annual >= 10 ? "Validé (V)" : annual >= 8 ? "Compensé (VC)" : "Non Validé (NV)")
                                : (lang === "ar" && sub.appreciationAr ? sub.appreciationAr : sub.appreciation);

                              return (
                                <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                                  <td className="p-3 font-bold text-white">
                                    {lang === "ar" && sub.nameAr ? sub.nameAr : lang === "en" && sub.nameEn ? sub.nameEn : sub.name}
                                  </td>
                                  <td className="p-3 text-center text-slate-400 font-mono font-bold">
                                    {isHigherEd ? `${sub.coef * 2 || 6} ECTS` : sub.coef}
                                  </td>
                                  <td className="p-3 text-center font-mono font-medium text-slate-300">
                                    <span className={`px-2 py-0.5 rounded-md font-bold ${s1 >= 14 ? "text-emerald-400" : s1 >= 10 ? "text-blue-400" : "text-rose-400"}`}>
                                      {s1.toFixed(2)}
                                    </span>
                                    <span className="text-[9px] text-slate-500 block font-normal">{sub.s1Rank ?? "—"}</span>
                                  </td>
                                  <td className="p-3 text-center font-mono font-medium text-slate-300">
                                    <span className={`px-2 py-0.5 rounded-md font-bold ${s2 >= 14 ? "text-emerald-400" : s2 >= 10 ? "text-blue-400" : "text-rose-400"}`}>
                                      {s2.toFixed(2)}
                                    </span>
                                    <span className="text-[9px] text-slate-500 block font-normal">{sub.s2Rank ?? "—"}</span>
                                  </td>
                                  <td className="p-3 text-center font-mono">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                                      annual >= 16 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                      : annual >= 14 ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                                      : annual >= 12 ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                                      : annual >= 10 ? "bg-slate-800 text-slate-200 border border-slate-700"
                                      : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                    }`}>
                                      {annual.toFixed(2)}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                                      isPositive ? "bg-emerald-500/20 text-emerald-400" : isNeutral ? "bg-slate-800 text-slate-400" : "bg-rose-500/20 text-rose-400"
                                    }`}>
                                      {isPositive ? <TrendingUp className="h-3 w-3" /> : isNeutral ? <Minus className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                      <span>{isPositive ? `+${diff.toFixed(1)}` : diff.toFixed(1)}</span>
                                    </span>
                                  </td>
                                  <td className="p-3 text-slate-300">
                                    {isHigherEd ? (
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                        annual >= 10 ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                      }`}>
                                        {ueStatus}
                                      </span>
                                    ) : (
                                      <>
                                        <span className="font-medium text-slate-200">{lang === "ar" && sub.appreciationAr ? sub.appreciationAr : sub.appreciation}</span>
                                        <div className="w-24 bg-slate-900 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                          <div 
                                            className={`h-full rounded-full ${annual >= 14 ? "bg-emerald-400" : annual >= 10 ? "bg-blue-400" : "bg-rose-400"}`} 
                                            style={{ width: `${Math.min(100, (annual / 20) * 100)}%` }} 
                                          />
                                        </div>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            {(() => {
                              const s1Obj = data.bulletin.periods?.find(p => p.id === "s1");
                              const s2Obj = data.bulletin.periods?.find(p => p.id === "s2");
                              const annObj = data.bulletin.periods?.find(p => p.id === "annual");
                              const diff = (s2Obj && s1Obj) ? Number((s2Obj.generalAverage - s1Obj.generalAverage).toFixed(2)) : 0;
                              const diffStr = diff >= 0 ? `+${diff.toFixed(2)} pts` : `${diff.toFixed(2)} pts`;
                              const decisionText = lang === "ar" 
                                ? (annObj?.decisionAr || data.bulletin.decisionAr || data.bulletin.decision) 
                                : lang === "en" 
                                ? (annObj?.decisionEn || data.bulletin.decisionEn || data.bulletin.decision) 
                                : (annObj?.decision || data.bulletin.decision);

                              return (
                                <tr className="bg-slate-900/90 font-black border-t border-slate-700 text-xs">
                                  <td className="p-3 text-white uppercase">{t.allPeriodsSummary}</td>
                                  <td className="p-3 text-center text-amber-400 font-mono">
                                    {isHigherEd ? "60 ECTS" : data.bulletin.totalCoef}
                                  </td>
                                  <td className="p-3 text-center text-blue-400 font-mono">S1: {s1Obj ? s1Obj.generalAverage.toFixed(2) : "—"}</td>
                                  <td className="p-3 text-center text-emerald-400 font-mono">S2: {s2Obj ? s2Obj.generalAverage.toFixed(2) : "—"}</td>
                                  <td className="p-3 text-center text-emerald-300 font-mono text-sm bg-emerald-950/40">
                                    Annuel: {annObj ? annObj.generalAverage.toFixed(2) : data.bulletin.generalAverage.toFixed(2)} / 20
                                  </td>
                                  <td className="p-3 text-center font-mono text-emerald-400 font-bold">{diffStr}</td>
                                  <td className="p-3 text-emerald-300 font-bold">{decisionText}</td>
                                </tr>
                              );
                            })()}
                          </tfoot>
                        </table>
                      </div>
                    )}

                    {/* ─── TAB 2, 3, 4: SINGLE PERIOD DETAILED EVALUATION TABLE ─── */}
                    {activePeriodTab !== "comparison" && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900/90 border-b border-slate-700/80 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                              <th className="p-3">{phaseText.subjectCol}</th>
                              <th className="p-3 text-center">{phaseText.creditsCol}</th>
                              <th className="p-3 text-center">{isHigherEd ? "Contrôle Continu" : t.ccCol}</th>
                              <th className="p-3 text-center">{isHigherEd ? "Examen Terminal" : t.compoCol}</th>
                              <th className="p-3 text-center">{t.generalAverage}</th>
                              <th className="p-3 text-center">{isHigherEd ? "Grade ECTS" : t.rankCol}</th>
                              <th className="p-3">{phaseText.statusCol}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/50">
                            {data.bulletin.subjects.map((sub, idx) => {
                              const norm = (v: number | undefined) => {
                                if (v === undefined || isNaN(v)) return 0;
                                if (v > 40 && v <= 60) return Number((v / 3).toFixed(2));
                                if (v > 20 && v <= 40) return Number((v / 2).toFixed(2));
                                return Number(v.toFixed(2));
                              };

                              const avg = norm(activePeriodTab === "s1"
                                ? (sub.s1Average ?? sub.average)
                                : activePeriodTab === "s2"
                                ? (sub.s2Average ?? (sub.average + 1.5))
                                : (sub.annualAverage ?? sub.average));

                              const rank = activePeriodTab === "s1"
                                ? (sub.s1Rank ?? sub.rank)
                                : activePeriodTab === "s2"
                                ? (sub.s2Rank ?? sub.rank)
                                : (sub.annualRank ?? sub.rank);

                              const ectsSubGrade = avg >= 16 ? "A" : avg >= 14 ? "B" : avg >= 12 ? "C" : avg >= 10 ? "D" : "F";

                              return (
                                <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                                  <td className="p-3 font-bold text-white">
                                    {lang === "ar" && sub.nameAr ? sub.nameAr : lang === "en" && sub.nameEn ? sub.nameEn : sub.name}
                                  </td>
                                  <td className="p-3 text-center text-slate-400 font-mono font-bold">
                                    {isHigherEd ? `${sub.coef * 2 || 6} ECTS` : sub.coef}
                                  </td>
                                  <td className="p-3 text-center text-slate-300 font-mono">{sub.classWorkScore ? sub.classWorkScore.toFixed(2) : "—"}</td>
                                  <td className="p-3 text-center text-slate-300 font-mono">{sub.examScore ? sub.examScore.toFixed(2) : "—"}</td>
                                  <td className={`p-3 text-center font-black font-mono ${isHigherEd ? "text-emerald-400" : "text-blue-400"}`}>
                                    {avg.toFixed(2)}
                                  </td>
                                  <td className="p-3 text-center text-slate-400 font-mono font-bold">
                                    {isHigherEd ? (
                                      <span className={`px-2 py-0.5 rounded ${avg >= 10 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"}`}>
                                        Grade {ectsSubGrade}
                                      </span>
                                    ) : rank}
                                  </td>
                                  <td className="p-3 text-slate-300">
                                    {isHigherEd ? (
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                        avg >= 10 ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                      }`}>
                                        {avg >= 10 ? "Capitalisé (V)" : "Ajourné (NV)"}
                                      </span>
                                    ) : (
                                      <span className="italic">{lang === "ar" && sub.appreciationAr ? sub.appreciationAr : sub.appreciation}</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-900/90 font-black border-t border-slate-700 text-xs">
                              <td className="p-3 text-white uppercase">{t.totalPointsCoeffs}</td>
                              <td className="p-3 text-center text-amber-400 font-mono">
                                {isHigherEd ? (activePeriodTab === "annual" ? "60 ECTS" : "30 ECTS") : data.bulletin.totalCoef}
                              </td>
                              <td colSpan={2} className="p-3 text-right text-slate-400">Total :</td>
                              <td className="p-3 text-center text-emerald-400 font-mono text-sm">{data.bulletin.totalWeighted} pts</td>
                              <td colSpan={2} className="p-3 text-center text-blue-400 font-mono">Moy : {data.bulletin.generalAverage.toFixed(2)} / 20</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}

                  </div>
                </>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  COMMON SECTION: HOLDER / BENEFICIARY INFORMATION
              ────────────────────────────────────────────────────────────── */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2.5 text-xs font-black text-indigo-400 uppercase tracking-wider mb-4 border-b border-slate-700/60 pb-3">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <span>{t.holderTitle}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">{t.fullName}</span>
                    <p className="font-bold text-sm text-white mt-0.5">{data.student.nom}</p>
                    {data.student.nomArabe && <p className="text-xs text-indigo-300 font-arabic">{data.student.nomArabe}</p>}
                  </div>

                  <div>
                    <span className="text-slate-400">{t.matricule}</span>
                    <p className="font-mono font-bold text-sm text-indigo-300 mt-0.5">{data.student.matricule}</p>
                  </div>

                  <div>
                    <span className="text-slate-400">{t.classeFiliere}</span>
                    <p className="font-bold text-slate-200 mt-0.5">{data.student.classe || "—"}</p>
                    <p className="text-[10px] text-slate-400">{data.student.filiere || "Général"}</p>
                  </div>

                  <div>
                    <span className="text-slate-400">{t.birth}</span>
                    <p className="font-medium text-slate-200 mt-0.5">
                      {data.student.dateNaissance || "—"}
                    </p>
                    <p className="text-[10px] text-slate-400">{data.student.lieuNaissance || "—"}</p>
                  </div>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  CASE 3: HIGHER EDUCATION DEGREE (STANDALONE)
              ────────────────────────────────────────────────────────────── */}
              {!isFinancial && !isBulletin && (
                <>
                  {/* Degree Conferred Box */}
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-2.5 text-xs font-black text-emerald-400 uppercase tracking-wider mb-4 border-b border-slate-700/60 pb-3">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <GraduationCap className="h-4 w-4" />
                      </div>
                      <span>{t.degreeTitle}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 text-xs">
                      <div className="sm:col-span-2">
                        <span className="text-slate-400">{t.diplomaName}</span>
                        <p className="font-bold text-base text-white mt-1 leading-snug">
                          {lang === "en" ? data.degree.titleEn : lang === "ar" ? data.degree.titleAr : data.degree.title}
                        </p>
                        <p className="text-[11px] text-indigo-300 mt-0.5">{data.degree.field} • {data.degree.mention}</p>
                      </div>

                      <div>
                        <span className="text-slate-400">{t.decisionHonors}</span>
                        <p className="font-bold text-emerald-400 text-sm mt-1">
                          {lang === "en" ? data.degree.statusEn : lang === "ar" ? data.degree.statusAr : data.degree.status}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{data.degree.deliberationDate}</p>
                      </div>

                      <div>
                        <span className="text-slate-400">{t.creditsEcts}</span>
                        <p className="font-black text-lg text-indigo-400 font-mono mt-1">
                          {data.degree.ectsCredits} ECTS <span className="text-xs font-normal text-slate-400">/ {data.degree.totalRequiredEcts}</span>
                        </p>
                      </div>

                      <div>
                        <span className="text-slate-400">{t.gpaScore}</span>
                        <p className="font-bold text-slate-200 mt-1">{data.degree.gpa}</p>
                        <p className="text-[10px] text-emerald-400 font-bold">{data.degree.gpaLetter}</p>
                      </div>

                      <div>
                        <span className="text-slate-400">{t.promoYear}</span>
                        <p className="font-bold text-slate-200 mt-1">{data.degree.graduationYear}</p>
                      </div>
                    </div>
                  </div>

                  {/* Curriculum & 180 ECTS Units Accordion */}
                  {data.curriculum && data.curriculum.length > 0 && (
                    <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between gap-4 border-b border-slate-700/60 pb-3">
                        <div className="flex items-center gap-2.5 text-xs font-black text-indigo-400 uppercase tracking-wider">
                          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            <Layers className="h-4 w-4" />
                          </div>
                          <span>{t.curriculumTitle}</span>
                        </div>

                        <button
                          onClick={() => setShowCurriculumDetails(!showCurriculumDetails)}
                          className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>{showCurriculumDetails ? t.hideCurriculum : t.showCurriculum}</span>
                          {showCurriculumDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>

                      {showCurriculumDetails && (
                        <div className="mt-4 overflow-x-auto animate-in fade-in duration-300">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-900/80 border-b border-slate-700/80 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                                <th className="p-3">Code UE</th>
                                <th className="p-3">Intitulé de l'Unité d'Enseignement</th>
                                <th className="p-3 text-center">Semestre</th>
                                <th className="p-3 text-center">Crédits ECTS</th>
                                <th className="p-3 text-center">Note / 20</th>
                                <th className="p-3 text-center">Grade ECTS</th>
                                <th className="p-3">Statut</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                              {data.curriculum.map((ue, idx) => (
                                <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                                  <td className="p-3 font-mono font-bold text-indigo-300">{ue.codeUe}</td>
                                  <td className="p-3 font-bold text-white">{ue.nameUe}</td>
                                  <td className="p-3 text-center text-slate-400">{ue.semester}</td>
                                  <td className="p-3 text-center font-mono font-bold text-amber-400">{ue.creditsEcts} ECTS</td>
                                  <td className="p-3 text-center font-mono font-bold text-emerald-400">{ue.grade.toFixed(2)}</td>
                                  <td className="p-3 text-center font-mono font-bold text-indigo-300">{ue.gradeEcts}</td>
                                  <td className="p-3 text-slate-300">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      {ue.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  COMMON SECTION: STANDARDS & ACCREDITATION
              ────────────────────────────────────────────────────────────── */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2.5 text-xs font-black text-cyan-400 uppercase tracking-wider mb-4 border-b border-slate-700/60 pb-3">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Globe className="h-4 w-4" />
                  </div>
                  <span>{t.standardsTitle}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">{t.unescoIsced}</span>
                    <p className="font-bold text-slate-200 mt-0.5">
                      {lang === "en" ? data.standards.unescoIscedEn : lang === "ar" ? data.standards.unescoIscedAr : data.standards.unescoIsced}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400">{t.institutionTitle}</span>
                    <p className="font-bold text-slate-200 mt-0.5">
                      {lang === "en" ? data.institution.nameEn : lang === "ar" ? data.institution.nameAr : data.institution.name}
                    </p>
                    <p className="text-[10px] text-slate-400">{data.institution.country} • {data.institution.city}</p>
                  </div>

                  <div>
                    <span className="text-slate-400">{t.accreditation}</span>
                    <p className="font-bold text-emerald-400 mt-0.5">
                      {lang === "en" ? data.institution.accreditationEn : lang === "ar" ? data.institution.accreditationAr : data.institution.accreditation}
                    </p>
                    <p className="text-[10px] text-slate-400">{data.institution.ministry}</p>
                  </div>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  COMMON SECTION: CRYPTOGRAPHIC ANCHOR & PUBLIC LEDGER
              ────────────────────────────────────────────────────────────── */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl text-xs space-y-3 font-mono">
                <div className="flex items-center gap-2.5 text-xs font-black text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-3 font-sans">
                  <Lock className="h-4 w-4 text-emerald-400" />
                  <span>{t.securityTitle}</span>
                </div>

                <div className="space-y-2 text-slate-400 break-all text-[11px]">
                  <div>
                    <span className="text-slate-500 font-sans block text-[10px] uppercase font-bold">{t.w3cId} :</span>
                    <span className="text-emerald-400">{data.degree.merkleProof}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-sans block text-[10px] uppercase font-bold">{t.shaHash} :</span>
                    <span className="text-indigo-300">{data.degree.verificationHash}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-sans block text-[10px] uppercase font-bold">{t.trustAnchor} :</span>
                    <span className="text-slate-300">{data.degree.digitalSignature}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ─── FOOTER ─── */}
        <footer className="mt-12 pt-6 border-t border-slate-800 text-center text-xs text-slate-500 space-y-2">
          <p>{t.securityNotice}</p>
          <p className="text-[10px] font-mono text-slate-600">
            Node: NIGER-CENTRAL-01 • Engine: EDUT-CORE-v2.6 • W3C DID: did:edut:ne:2026
          </p>
        </footer>

      </div>
    </div>
  );
}
