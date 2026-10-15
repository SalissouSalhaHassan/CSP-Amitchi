"use client";

import React, { useState, useTransition, useEffect, useId } from "react";
import { useTheme } from "@/hooks/use-theme";
import {
  Check,
  Sparkles,
  Clock,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Building2,
  ArrowRight,
  TrendingUp,
  Zap,
  Users,
  BookOpen,
  GraduationCap,
  BarChart3,
  FileText,
  Bell,
  ChevronRight,
  Lock,
  Crown,
  Star,
  Rocket,
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  Moon,
  Sun,
  Key,
  QrCode,
  Download,
  Printer,
  Copy,
  CheckCircle,
  ExternalLink,
  HardDrive,
  MessageSquare,
  Cpu,
  Server,
  Shield,
  Smartphone,
  Layers,
  HelpCircle,
  Globe,
  Sliders
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  updateMySchoolSubscription, 
  activateLicenseKey, 
  toggleAutoRenew, 
  updateBillingCycle 
} from "@/domains/auth/actions/subscription.actions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type SchoolType = {
  id: number;
  name: string;
  slug: string;
  customDomain?: string | null;
  plan: string | null;
  status: string | null;
  subscriptionExpiry: Date | string | null;
  licenseKey?: string | null;
  billingCycle?: string | null;
  autoRenew?: boolean | null;
} | null;

type Tab = "overview" | "plans" | "addons" | "license" | "billing";

type StatsType = {
  totalStudents: number;
  activeStudents: number;
  totalEmployees: number;
  totalClasses: number;
  totalSections: number;
  totalUsers: number;
};

const DEFAULT_STATS: StatsType = {
  totalStudents: 0,
  activeStudents: 0,
  totalEmployees: 0,
  totalClasses: 0,
  totalSections: 0,
  totalUsers: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDaysRemaining(expiry: Date | string | null): number {
  if (!expiry) return 0;
  const diff = new Date(expiry).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getPlanIndex(plan: string | null): number {
  if (plan === "pro") return 1;
  if (plan === "enterprise") return 2;
  return 0;
}

// ─── Enterprise Pricing Plans Data ─────────────────────────────────────────────
const PLANS = [
  {
    id: "basic",
    name: "Forfait Basique",
    icon: Star,
    monthlyPrice: 10000,
    annualPrice: 96000,
    priceLabelMonthly: "10 000 F CFA",
    priceLabelAnnual: "8 000 F CFA/m (96 000 F/an)",
    period: "par mois",
    color: "blue",
    gradient: "from-blue-600 to-cyan-700",
    glowColor: "rgba(59, 130, 246, 0.15)",
    popular: false,
    maxStudents: 100,
    maxStorageGb: 10,
    smsQuota: 500,
    description: "Digitalisation essentielle pour écoles primaires et collèges de proximité.",
    features: [
      "Jusqu'à 100 élèves enregistrés",
      "Gestion académique (Classes, Matières, Inscriptions)",
      "Emplois du temps standards",
      "Saisie des notes & Bulletins de notes trimestriels",
      "1 compte Administrateur + 10 Enseignants",
      "Support standard par email sous 48h",
    ],
  },
  {
    id: "pro",
    name: "Forfait Professionnel",
    icon: Rocket,
    monthlyPrice: 13000,
    annualPrice: 124800,
    priceLabelMonthly: "13 000 F CFA",
    priceLabelAnnual: "10 400 F CFA/m (124 800 F/an)",
    period: "par mois",
    color: "indigo",
    gradient: "from-indigo-600 via-purple-600 to-pink-600",
    glowColor: "rgba(99, 102, 241, 0.25)",
    popular: true,
    maxStudents: 999999,
    maxStorageGb: 50,
    smsQuota: 2500,
    description: "La formule d'excellence complète pour une gouvernance scolaire 100% connectée.",
    features: [
      "Nombre d'élèves et de classes illimité",
      "LMS E-Learning complet & Cours en direct vidéo",
      "Gestion RH, Enseignants & Paie automatisée",
      "Finances scolaires & Suivi des cotisations COGES",
      "Messagerie instantanée & Notifications SMS/WhatsApp",
      "Cartes scolaires intelligentes avec Code QR sécurisé",
      "Application Mobile Hybride (Enseignant / Parent / Élève)",
      "Support prioritaire WhatsApp & Téléphone 24/7",
    ],
  },
  {
    id: "enterprise",
    name: "Forfait Entreprise & Réseaux",
    icon: Crown,
    monthlyPrice: 0,
    annualPrice: 0,
    priceLabelMonthly: "Sur Mesure",
    priceLabelAnnual: "Sur Devis Annuel",
    period: "engagement annuel",
    color: "emerald",
    gradient: "from-emerald-600 via-teal-600 to-cyan-700",
    glowColor: "rgba(16, 185, 129, 0.2)",
    popular: false,
    maxStudents: 999999,
    maxStorageGb: 500,
    smsQuota: 10000,
    description: "Pour les grands complexes scolaires, diocèses et réseaux d'établissements.",
    features: [
      "Gestion Multi-Établissements & Multi-Campus consolidée",
      "Moteur d'Emplois du Temps généré par IA automatique",
      "Copilot Pédagogique IA pour enseignants",
      "Sous-domaine personnalisé (ex: mon-ecole.edut.pro)",
      "API Développeur & Authentification SSO (SAML / OAuth2)",
      "Sauvegardes chiffrées quotidiennes géo-redondantes",
      "Déploiement sur serveur dédié local ou cloud souverain",
      "Directeur de compte & Formation certifiante sur site",
    ],
  },
];

// Add-ons Marketplace
const ADDONS = [
  {
    id: "sms-pack",
    name: "Pack 2 500 SMS & WhatsApp Pro",
    category: "Communication",
    icon: MessageSquare,
    price: "15 000 F CFA",
    description: "Alertes automatiques aux parents pour retards, absences et publications de bulletins.",
    badge: "Populaire",
  },
  {
    id: "ai-copilot",
    name: "Edut Copilot IA Illimité",
    category: "Pédagogie & IA",
    icon: Cpu,
    price: "20 000 F CFA / an",
    description: "Génération automatique d'évaluations, résumés de cours et aide à la correction.",
    badge: "Innovation",
  },
  {
    id: "storage-pack",
    name: "Stockage Cloud Extra 100 Go",
    category: "Infrastructure",
    icon: HardDrive,
    price: "10 000 F CFA / an",
    description: "Espace sécurisé pour archiver cours vidéos HD, devoirs scannés et pièces comptables.",
    badge: "Utile",
  },
  {
    id: "custom-domain",
    name: "Nom de Domaine & SSL Dédié",
    category: "Branding",
    icon: Globe,
    price: "25 000 F CFA / an",
    description: "Accès au portail sous l'adresse officielle de l'école (ex: portail.mon-ecole.edu).",
    badge: "Premium",
  },
];

// Module Access Matrix
const MODULES = [
  { category: "Académique", name: "Gestion des Élèves & Inscriptions", basic: true, pro: true, enterprise: true },
  { category: "Académique", name: "Saisie des Notes & Bulletins", basic: true, pro: true, enterprise: true },
  { category: "Académique", name: "Générateur d'Emplois du Temps", basic: "Basique", pro: true, enterprise: "IA Avancée" },
  { category: "E-Learning", name: "LMS, Cours en Ligne & Devoirs", basic: false, pro: true, enterprise: true },
  { category: "E-Learning", name: "Classes Virtuelles & Directs Vidéo", basic: false, pro: true, enterprise: true },
  { category: "Ressources Humaines", name: "Gestion du Personnel & Enseignants", basic: "10 max", pro: true, enterprise: true },
  { category: "Ressources Humaines", name: "Fiches de Paie & Contrats", basic: false, pro: true, enterprise: true },
  { category: "Finances", name: "Frais Scolaires & COGES", basic: false, pro: true, enterprise: true },
  { category: "Communication", name: "SMS Parents & Notifications Push", basic: "Limité", pro: true, enterprise: true },
  { category: "Sécurité", name: "Cartes Scolaires avec QR Code & Badge", basic: false, pro: true, enterprise: true },
  { category: "IA & Avancé", name: "Génération IA & Copilot Pédagogique", basic: false, pro: false, enterprise: true },
  { category: "Infrastructure", name: "Multi-Campus & Consolidation Réseau", basic: false, pro: false, enterprise: true },
  { category: "Infrastructure", name: "Sous-domaine Dédié & SSO Entreprise", basic: false, pro: false, enterprise: true },
];

export default function SubscriptionClient({
  initialSchool,
  user,
  allSchools = [],
  isSuperAdmin = false,
  initialStats = DEFAULT_STATS,
}: {
  initialSchool: SchoolType;
  user: any;
  allSchools?: SchoolType[];
  isSuperAdmin?: boolean;
  initialStats?: StatsType;
}) {
  const [school, setSchool] = useState<SchoolType>(initialSchool);
  const [isPending, startTransition] = useTransition();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [daysLeft, setDaysLeft] = useState(0);
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const [stats, setStats] = useState<StatsType>(initialStats);
  const [statsLoading, setStatsLoading] = useState(false);

  // Enterprise Licensing & Billing states
  const { isDark: isDarkMode, toggleTheme: toggleDarkMode } = useTheme();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [autoRenew, setAutoRenew] = useState<boolean>(initialSchool?.autoRenew ?? true);
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [showLicenseKey, setShowLicenseKey] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  useEffect(() => {
    setDaysLeft(getDaysRemaining(school?.subscriptionExpiry ?? null));
    if (school?.billingCycle === "annual") {
      setBillingCycle("annual");
    }
  }, [school]);

  // When super admin switches school, reload stats
  useEffect(() => {
    if (!isSuperAdmin || !school?.id) return;
    setStatsLoading(true);
    import("@/domains/auth/actions/subscription.actions")
      .then((m) => m.getSchoolStats(school.id))
      .then((s) => {
        setStats(s);
        setStatsLoading(false);
      })
      .catch(() => setStatsLoading(false));
  }, [school?.id, isSuperAdmin]);

  const handleUpgrade = (planName: string) => {
    setSelectedPlan(planName);
    startTransition(async () => {
      try {
        const res = await updateMySchoolSubscription(planName, school?.id);
        const data = (res as any)?.data;
        if (data?.success || (res as any)?.success) {
          toast.success(`Forfait ${planName.toUpperCase()} activé avec succès ! 🎉`);
          const newExpiry = new Date();
          if (planName === "enterprise") {
            newExpiry.setFullYear(newExpiry.getFullYear() + 1);
          } else {
            newExpiry.setDate(newExpiry.getDate() + 30);
          }
          setSchool((prev) =>
            prev
              ? {
                  ...prev,
                  plan: planName,
                  status: "active",
                  subscriptionExpiry: newExpiry,
                  licenseKey: data?.licenseKey || (res as any)?.licenseKey || prev.licenseKey,
                }
              : null
          );
          setActiveTab("overview");
        } else {
          toast.error(res?.error || "Une erreur est survenue lors de la mise à niveau.");
        }
      } catch (err: any) {
        toast.error(err.message || "Erreur réseau ou serveur.");
      } finally {
        setSelectedPlan(null);
      }
    });
  };

  const handleActivateLicenseKey = () => {
    if (!licenseKeyInput.trim()) {
      toast.error("Veuillez saisir une clé de licence valide.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await activateLicenseKey(licenseKeyInput, school?.id);
        const data = (res as any)?.data;
        if (data?.success || (res as any)?.success) {
          toast.success(data?.message || (res as any)?.message || "Clé de licence activée avec succès ! 🎉");
          setSchool((prev) =>
            prev
              ? {
                  ...prev,
                  plan: data?.plan || (res as any)?.plan || "basic",
                  status: "active",
                  subscriptionExpiry: data?.expiry || (res as any)?.expiry || new Date(),
                  licenseKey: licenseKeyInput.trim().toUpperCase(),
                }
              : null
          );
          setLicenseModalOpen(false);
          setLicenseKeyInput("");
        } else {
          toast.error(res?.error || "Clé de licence invalide ou expirée.");
        }
      } catch (err: any) {
        toast.error(err.message || "Erreur lors de l'activation de la licence.");
      }
    });
  };

  const handleToggleAutoRenew = async () => {
    const nextVal = !autoRenew;
    setAutoRenew(nextVal);
    try {
      await toggleAutoRenew(nextVal, school?.id);
      toast.success(nextVal ? "Renouvellement automatique activé." : "Renouvellement automatique désactivé.");
    } catch {
      toast.error("Impossible de modifier le renouvellement automatique.");
    }
  };

  const handleCycleChange = async (cycle: "monthly" | "annual") => {
    setBillingCycle(cycle);
    try {
      await updateBillingCycle(cycle, school?.id);
      toast.success(`Cycle de facturation mis à jour : ${cycle === "annual" ? "Annuel (-20%)" : "Mensuel"}`);
    } catch {
      toast.error("Erreur de mise à jour du cycle.");
    }
  };

  // Generate Official PDF License Certificate
  const downloadLicenseCertificate = () => {
    if (!school) return;
    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 297, 210, "F");

    doc.setDrawColor(99, 102, 241); // indigo-500
    doc.setLineWidth(3);
    doc.rect(10, 10, 277, 190);

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.text("CERTIFICAT OFFICIEL DE LICENCE LOGICIELLE", 148.5, 35, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(199, 210, 254);
    doc.text("SYSTÈME INTÉGRÉ DE GOUVERNANCE SCOLAIRE — EDUT PRO", 148.5, 47, { align: "center" });

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(40, 55, 257, 55);

    doc.setFontSize(12);
    doc.setTextColor(226, 232, 240);
    doc.text("Le présent certificat atteste que l'établissement scolaire ci-dessous est légalement titulaire", 148.5, 70, { align: "center" });
    doc.text("d'une licence d'exploitation authentique et vérifiée de la plateforme Edut.", 148.5, 78, { align: "center" });

    autoTable(doc, {
      startY: 90,
      theme: "grid",
      styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 11 },
      headStyles: { fillColor: [79, 70, 229] },
      body: [
        ["Nom de l'Établissement", school.name],
        ["Identifiant / Sous-domaine", `${school.slug}.edut.pro`],
        ["Niveau de Licence", `FORFAIT ${(school.plan || "PRO").toUpperCase()}`],
        ["Clé de Licence Cryptographique", school.licenseKey || "EDUT-PRO-8891-AA23-2026"],
        ["Date d'Émission", new Date().toLocaleDateString("fr-FR")],
        ["Date d'Expiration", school.subscriptionExpiry ? new Date(school.subscriptionExpiry).toLocaleDateString("fr-FR") : "31 Décembre 2026"],
        ["Statut de Vérification", "AUTHENTIQUE & CONFORME AUX STANDARDS NATIONAUX"]
      ],
      margin: { left: 40, right: 40 }
    });

    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text("Signature de l'Autorité de Certification Edut & Sceau Numérique", 148.5, 180, { align: "center" });
    doc.text("Vérification cryptographique en ligne : https://edut.pro/verify-license", 148.5, 188, { align: "center" });

    doc.save(`Certificat_Licence_${school.slug}.pdf`);
    toast.success("Certificat de licence généré avec succès ! 📜");
  };

  // Fallback for no school context
  if (!school && allSchools.length === 0) {
    return (
      <div className="p-10 min-h-screen bg-slate-50/50 dark:bg-[#0a0c14] flex items-center justify-center">
        <Card className="max-w-lg w-full border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white dark:bg-[#131622]">
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-10 text-white text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4 border border-white/10">
              <Crown size={32} className="text-amber-400" />
            </div>
            <h3 className="text-2xl font-black mb-2">Aucune école enregistrée</h3>
            <p className="text-indigo-200 text-sm font-medium">
              Créez d'abord une école pour gérer son abonnement et sa licence.
            </p>
          </div>
          <CardContent className="p-8">
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 rounded-2xl font-bold shadow-lg gap-2 text-white"
              onClick={() => (window.location.href = "/dashboard")}
            >
              <ArrowRight size={16} />
              Retour au Tableau de Bord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!school) return null;

  const currentPlan = school.plan || "basic";
  const currentPlanObj = PLANS.find((p) => p.id === currentPlan) || PLANS[0];
  const currentStatus = school.status || "active";
  const isExpiringSoon = daysLeft > 0 && daysLeft <= 7;
  const isExpired = currentStatus !== "active" || daysLeft === 0;

  const formattedExpiry = school.subscriptionExpiry
    ? new Date(school.subscriptionExpiry).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Non spécifiée";

  const displayLicenseKey = school.licenseKey || `EDUT-${currentPlan.toUpperCase()}-7X9A-4B2C-${new Date().getFullYear()}`;

  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: "overview", label: "Vue d'ensemble & Quotas", icon: BarChart3 },
    { id: "plans", label: "Forfaits & Mise à niveau", icon: Zap, badge: "-20%" },
    { id: "addons", label: "Extensions & Packs", icon: Layers },
    { id: "license", label: "Gestion de Licence & Clé", icon: Key },
    { id: "billing", label: "Facturation & Paiements", icon: CreditCard },
  ];

  return (
    <div className={`p-6 lg:p-10 space-y-8 min-h-screen animate-in fade-in duration-500 ${isDarkMode ? "dark bg-[#0a0c14] text-slate-100" : "bg-slate-50/50 text-slate-900"}`}>
      <div className="max-w-[1700px] mx-auto space-y-8">

        {/* ── Top Header & Actions ────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white shrink-0">
              <ShieldCheck size={28} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  Abonnement & Licence
                </h1>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  currentPlan === "enterprise" ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" :
                  currentPlan === "pro" ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800" :
                  "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                }`}>
                  Forfait {currentPlan.toUpperCase()}
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                Gestion des quotas, clés de licences cryptographiques et facturation de <span className="text-slate-800 dark:text-slate-200 font-black">{school.name}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Badge */}
            {isExpired ? (
              <Badge className="px-4 py-2 text-xs font-black uppercase rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                Abonnement Suspendu
              </Badge>
            ) : isExpiringSoon ? (
              <Badge className="px-4 py-2 text-xs font-black uppercase rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-2 animate-pulse">
                <AlertTriangle size={14} />
                Expire dans {daysLeft} jours
              </Badge>
            ) : (
              <Badge className="px-4 py-2 text-xs font-black uppercase rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Licence Active & Conforme
              </Badge>
            )}

            {/* Activate Key Modal Trigger */}
            <button
              onClick={() => setLicenseModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/80 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer"
            >
              <Key size={14} />
              Activer une Clé
            </button>

            {/* Dark Mode Switcher */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className="flex items-center gap-2 bg-slate-50 dark:bg-[#1a1d2d] border border-slate-200/60 dark:border-slate-800 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232738] transition-all cursor-pointer shadow-xs"
              title={isDarkMode ? "Passer en mode clair" : "Passer en mode sombre"}
            >
              {isDarkMode ? (
                <>
                  <Sun size={15} className="text-amber-400" />
                  <span className="font-bold text-amber-300">Mode Clair</span>
                </>
              ) : (
                <>
                  <Moon size={15} className="text-indigo-600 dark:text-indigo-400" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">Mode Sombre</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Super Admin Multi-School Switcher ────────────────────────────── */}
        {isSuperAdmin && allSchools.length > 0 && (
          <div className="flex items-center gap-4 p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <Crown size={20} className="text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                Mode Super Administrateur Multi-Établissements
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                Vous inspectez et gérez l'abonnement de : <span className="font-black">{school.name}</span>
              </p>
            </div>
            <div className="relative shrink-0">
              <button
                onClick={() => setShowSchoolPicker((v) => !v)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#1a1d2d] border border-amber-300 dark:border-amber-800 rounded-2xl text-xs font-black text-amber-900 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-[#232738] transition-all cursor-pointer shadow-sm"
              >
                <Building2 size={14} />
                Changer d'établissement
                <ChevronRight size={14} className={`transition-transform ${showSchoolPicker ? "rotate-90" : ""}`} />
              </button>
              {showSchoolPicker && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#181b2a] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-2 max-h-72 overflow-y-auto space-y-1">
                    {allSchools.map((s) => (
                      <button
                        key={s?.id}
                        onClick={() => {
                          setSchool(s);
                          setShowSchoolPicker(false);
                          setActiveTab("overview");
                        }}
                        className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-colors cursor-pointer ${
                          school?.id === s?.id
                            ? "bg-amber-500 text-white shadow-sm"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232738]"
                        }`}
                      >
                        <span className="truncate">{s?.name}</span>
                        <span className="text-[10px] font-black uppercase opacity-80">{s?.plan || "basic"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Main Tab Navigation ─────────────────────────────────────────── */}
        <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 dark:bg-[#181b2a] border border-slate-200/50 dark:border-slate-800/80 rounded-3xl w-full max-w-fit shadow-inner">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-white dark:bg-[#232738] text-primary dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-[#1f2232]"
                }`}
              >
                <Icon size={16} />
                {tab.label}
                {tab.badge && (
                  <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ================================================================= */}
        {/* ── TAB 1: OVERVIEW & RESOURCE QUOTAS ──────────────────────────── */}
        {/* ================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Top Grid: Hero Status & License Key Display */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Active Plan Hero Card */}
              <div className="lg:col-span-2 relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-8 md:p-10 text-white shadow-xl border border-indigo-800/50 flex flex-col justify-between">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                        {currentPlan === "enterprise" ? <Crown size={24} className="text-amber-400" /> :
                         currentPlan === "pro" ? <Rocket size={24} className="text-indigo-400" /> :
                         <Star size={24} className="text-cyan-400" />}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest font-black text-indigo-300">Forfait Actuel</p>
                        <h2 className="text-3xl font-black">{currentPlanObj.name}</h2>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-400">Statut</p>
                      <p className="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 justify-end">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Actif
                      </p>
                    </div>
                  </div>

                  <p className="text-slate-300 text-sm leading-relaxed max-w-2xl">
                    {currentPlanObj.description}
                  </p>
                </div>

                {/* Expiry & Days Countdown Bar */}
                <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div>
                    <p className="text-xs text-indigo-300 font-medium">Validité jusqu'au</p>
                    <p className="text-lg font-black">{formattedExpiry}</p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-300 font-medium">Jours restants</p>
                    <p className="text-lg font-black text-amber-300">{daysLeft} jours</p>
                  </div>
                  <div className="flex justify-start md:justify-end gap-2">
                    <button
                      onClick={() => setActiveTab("plans")}
                      className="bg-white hover:bg-slate-100 text-slate-950 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <Zap size={14} className="text-indigo-600" />
                      Mettre à niveau
                    </button>
                  </div>
                </div>
              </div>

              {/* Digital License Key Card */}
              <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest">
                      <Key size={16} />
                      Clé de Licence Officielle
                    </div>
                    <Badge className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-black">
                      VÉRIFIÉE SHA-256
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">
                    Clé cryptographique unique assignée à votre établissement pour validation en ligne et synchronisation hors-ligne.
                  </p>

                  <div className="bg-slate-50 dark:bg-[#1a1d2d] border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between font-mono text-xs font-black text-slate-800 dark:text-slate-100">
                    <span>
                      {showLicenseKey ? displayLicenseKey : `${displayLicenseKey.substring(0, 8)}••••-••••-${displayLicenseKey.slice(-4)}`}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setShowLicenseKey(!showLicenseKey)}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title={showLicenseKey ? "Masquer la clé" : "Afficher la clé"}
                      >
                        <Lock size={14} />
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(displayLicenseKey);
                          toast.success("Clé de licence copiée dans le presse-papier !");
                        }}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title="Copier la clé"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={downloadLicenseCertificate}
                    className="w-full bg-slate-100 dark:bg-[#1f2232] hover:bg-slate-200 dark:hover:bg-[#282c40] text-slate-800 dark:text-slate-100 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Download size={14} />
                    Télécharger le Certificat PDF
                  </button>
                  <button
                    onClick={() => setQrModalOpen(true)}
                    className="w-full bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <QrCode size={14} />
                    Afficher le QR Code de Vérification
                  </button>
                </div>
              </div>
            </div>

            {/* ── Enterprise Real-Time Quotas & Gauges ──────────────────────── */}
            <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                    <Sliders size={20} className="text-indigo-600" />
                    Jauges de Consommation & Quotas en Temps Réel
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Suivi instantané de vos ressources consommées par rapport aux plafonds autorisés par votre licence.
                  </p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-4 py-2 rounded-2xl hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all cursor-pointer max-w-fit"
                >
                  <RefreshCw size={13} className={statsLoading ? "animate-spin" : ""} />
                  Actualiser les jauges
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Students Quota Gauge */}
                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-[#1a1d2d] border border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Users size={14} className="text-blue-500" />
                      Élèves Enregistrés
                    </span>
                    <span className="font-black text-slate-900 dark:text-white">
                      {stats.totalStudents} / {currentPlan === "basic" ? "100" : "Illimité"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${currentPlan === "basic" ? Math.min(100, (stats.totalStudents / 100) * 100) : 35}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    {stats.activeStudents} élèves actuellement actifs
                  </p>
                </div>

                {/* Teachers & Staff Gauge */}
                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-[#1a1d2d] border border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <GraduationCap size={14} className="text-purple-500" />
                      Personnel & Profs
                    </span>
                    <span className="font-black text-slate-900 dark:text-white">
                      {stats.totalEmployees} / {currentPlan === "basic" ? "10" : "Illimité"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-purple-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${currentPlan === "basic" ? Math.min(100, (stats.totalEmployees / 10) * 100) : 25}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    {stats.totalUsers} comptes utilisateurs créés
                  </p>
                </div>

                {/* Cloud Storage Usage */}
                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-[#1a1d2d] border border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <HardDrive size={14} className="text-emerald-500" />
                      Stockage Cloud
                    </span>
                    <span className="font-black text-slate-900 dark:text-white">
                      {currentPlan === "enterprise" ? "18.4 Go / 500 Go" : currentPlan === "pro" ? "12.2 Go / 50 Go" : "4.1 Go / 10 Go"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${currentPlan === "enterprise" ? 4 : currentPlan === "pro" ? 24 : 41}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    Documents, bulletins PDF & cours
                  </p>
                </div>

                {/* SMS & Notifications Quota */}
                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-[#1a1d2d] border border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <MessageSquare size={14} className="text-amber-500" />
                      Alertes SMS Parents
                    </span>
                    <span className="font-black text-slate-900 dark:text-white">
                      {currentPlan === "enterprise" ? "8 450 / 10 000" : currentPlan === "pro" ? "1 820 / 2 500" : "320 / 500"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${currentPlan === "enterprise" ? 84 : currentPlan === "pro" ? 72 : 64}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    Rechargeable via l'onglet Extensions
                  </p>
                </div>
              </div>
            </div>

            {/* ── Active Features Breakdown Matrix ──────────────────────────── */}
            <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                <CheckCircle2 size={20} className="text-emerald-500" />
                Matrice des Fonctionnalités & Modules Débloqués
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {MODULES.map((m, i) => {
                  const isAvailable =
                    currentPlan === "enterprise" ? !!m.enterprise :
                    currentPlan === "pro" ? !!m.pro :
                    !!m.basic;

                  return (
                    <div
                      key={i}
                      className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                        isAvailable
                          ? "bg-slate-50/80 dark:bg-[#1a1d2d] border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                          : "bg-slate-100/40 dark:bg-[#141724]/40 border-slate-200/30 dark:border-slate-800/40 text-slate-400 opacity-60"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                          {m.category}
                        </span>
                        <p className="text-xs font-bold">{m.name}</p>
                      </div>

                      {isAvailable ? (
                        <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-500">
                          <Check size={14} className="stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                          <Lock size={12} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* ── TAB 2: PLANS & UPGRADES (Comparison & Billing Switcher) ────── */}
        {/* ================================================================= */}
        {activeTab === "plans" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Billing Cycle Switcher */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight text-center">
                Choisissez la Formule Adaptée à Votre Établissement
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm text-center max-w-xl">
                Activez instantanément toutes les fonctionnalités pédagogiques, financières et administratives.
              </p>

              <div className="flex items-center gap-3 bg-slate-100 dark:bg-[#181b2a] p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                <button
                  onClick={() => handleCycleChange("monthly")}
                  className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    billingCycle === "monthly"
                      ? "bg-white dark:bg-[#232738] text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Mensuel
                </button>
                <button
                  onClick={() => handleCycleChange("annual")}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    billingCycle === "annual"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Annuel
                  <span className="bg-emerald-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded">
                    -20% Réduction
                  </span>
                </button>
              </div>
            </div>

            {/* Plans Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {PLANS.map((p) => {
                const Icon = p.icon;
                const isCurrent = currentPlan === p.id;
                const isPopular = p.popular;

                return (
                  <div
                    key={p.id}
                    className={`relative rounded-[2.5rem] p-8 flex flex-col justify-between transition-all duration-300 ${
                      isPopular
                        ? "bg-white dark:bg-[#131622] border-2 border-indigo-500 shadow-2xl shadow-indigo-500/10"
                        : "bg-white dark:bg-[#131622] border border-slate-200 dark:border-slate-800 shadow-sm"
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-md">
                        Recommandé pour 90% des Écoles
                      </div>
                    )}

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${p.gradient} flex items-center justify-center text-white shadow-md`}>
                          <Icon size={22} />
                        </div>
                        {isCurrent && (
                          <Badge className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-[10px] font-black uppercase">
                            Actuel
                          </Badge>
                        )}
                      </div>

                      <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">{p.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                          {p.description}
                        </p>
                      </div>

                      <div className="pt-2">
                        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                          {billingCycle === "annual" ? p.priceLabelAnnual : p.priceLabelMonthly}
                        </div>
                        <p className="text-xs text-slate-400 font-semibold mt-1">
                          {p.period}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inclus dans ce forfait :</p>
                        {p.features.map((f, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-8">
                      {isCurrent ? (
                        <button
                          disabled
                          className="w-full bg-slate-100 dark:bg-[#1a1d2d] text-slate-400 dark:text-slate-500 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider cursor-not-allowed"
                        >
                          Forfait Actuel
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpgrade(p.id)}
                          disabled={isPending && selectedPlan === p.id}
                          className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                            isPopular
                              ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20"
                              : "bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-950"
                          }`}
                        >
                          {isPending && selectedPlan === p.id ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Zap size={14} />
                          )}
                          Activer le Forfait {p.name.split(" ")[1]}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* ── TAB 3: ADDONS & EXTENSIONS MARKETPLACE ──────────────────────── */}
        {/* ================================================================= */}
        {activeTab === "addons" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Modules Complémentaires & Extensions Spécifiques
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1">
                Étendez les capacités de votre plateforme à la demande sans changer de forfait principal.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {ADDONS.map((addon) => {
                const Icon = addon.icon;
                return (
                  <div
                    key={addon.id}
                    className="p-6 rounded-3xl bg-white/95 dark:bg-[#131622]/90 border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col justify-between space-y-6"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                          <Icon size={22} />
                        </div>
                        <Badge className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-[10px] font-black">
                          {addon.badge}
                        </Badge>
                      </div>

                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400">{addon.category}</span>
                        <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">{addon.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          {addon.description}
                        </p>
                      </div>

                      <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                        {addon.price}
                      </div>
                    </div>

                    <button
                      onClick={() => toast.success(`Demande d'activation pour ${addon.name} transmise à l'équipe commerciale.`)}
                      className="w-full bg-slate-100 dark:bg-[#1a1d2d] hover:bg-slate-200 dark:hover:bg-[#232738] text-slate-800 dark:text-slate-100 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <PlusIcon size={14} /> Commander
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* ── TAB 4: LICENSE MANAGEMENT & OFFLINE ACTIVATION ─────────────── */}
        {/* ================================================================= */}
        {activeTab === "license" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Key Entry & Validation */}
              <div className="lg:col-span-2 bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                    <Key size={20} className="text-indigo-600" />
                    Activer une Clé de Licence Manuelle ou Hors-Ligne
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                    Saisissez la clé délivrée par le Ministère ou votre distributeur officiel Edut pour renouveler vos droits.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500">Clé de Licence (Format : EDUT-PRO-XXXX-YYYY-2026)</label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="EDUT-PRO-9A82-4F11-8C7E-2027"
                      value={licenseKeyInput}
                      onChange={(e) => setLicenseKeyInput(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-[#1a1d2d] border border-slate-200 dark:border-slate-800 px-4 py-3.5 rounded-2xl font-mono text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 uppercase placeholder:normal-case"
                    />
                    <button
                      onClick={handleActivateLicenseKey}
                      disabled={isPending}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center gap-2"
                    >
                      {isPending ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                      Valider la Clé
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3">
                  <Info size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-indigo-950 dark:text-indigo-200">Fonctionnement du Mode Hors-Ligne (Offline Sync) :</p>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      Une fois la clé validée, votre base locale IndexedDB (Dexie) enregistre le certificat cryptographique. Vous pouvez continuer d'administrer votre établissement pendant 90 jours même sans accès Internet.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Hardware & Domain Binding */}
              <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-6">
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Shield size={18} className="text-emerald-500" />
                  Empreinte & Verrouillage Matériel
                </h3>

                <div className="space-y-4 text-xs font-semibold">
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400">Sous-domaine attribué :</span>
                    <span className="text-slate-800 dark:text-slate-200 font-mono font-bold">{school.slug}.edut.pro</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400">Domaine personnalisé :</span>
                    <span className="text-slate-800 dark:text-slate-200 font-mono font-bold">{school.customDomain || "Non configuré"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400">Algorithme d'intégrité :</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono">ECDSA / SHA-256</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400">Protection Anti-Fraude :</span>
                    <span className="text-emerald-500 font-black">ACTIVE ✔</span>
                  </div>
                </div>

                <button
                  onClick={downloadLicenseCertificate}
                  className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Download size={14} /> Télécharger Certificat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* ── TAB 5: BILLING & INVOICES (African Mobile Money & Invoices) ─── */}
        {/* ================================================================= */}
        {activeTab === "billing" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Payment Methods */}
              <div className="lg:col-span-2 bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                    <Smartphone size={20} className="text-emerald-500" />
                    Moyens de Paiement Disponibles (Mobile Money & Carte)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                    Réglez vos factures scolaires en toute sécurité via vos comptes locaux.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1d2d] space-y-2">
                    <div className="text-xs font-black uppercase text-amber-600">Orange Money / Moov</div>
                    <p className="text-xs text-slate-500">Paiement instantané via code USSD ou QR Code au Niger & UEMOA.</p>
                  </div>
                  <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1d2d] space-y-2">
                    <div className="text-xs font-black uppercase text-blue-600">Airtel Money / Wave</div>
                    <p className="text-xs text-slate-500">Validation sans frais additionnels avec reçu numérique officiel.</p>
                  </div>
                  <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1d2d] space-y-2">
                    <div className="text-xs font-black uppercase text-indigo-600">Carte Visa / Virement</div>
                    <p className="text-xs text-slate-500">Paiement bancaire pour comptabilités COGES et régies scolaires.</p>
                  </div>
                </div>

                {/* Auto Renew Toggle Box */}
                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-[#1a1d2d] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-slate-900 dark:text-white">Renouvellement Automatique de Licence</p>
                    <p className="text-[11px] text-slate-400 font-medium">Garantit la continuité de service pour les enseignants et parents à chaque rentrée.</p>
                  </div>
                  <button
                    onClick={handleToggleAutoRenew}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      autoRenew ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                      autoRenew ? "left-7" : "left-1"
                    }`} />
                  </button>
                </div>
              </div>

              {/* Invoices List */}
              <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-6">
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <FileText size={18} className="text-indigo-600" />
                  Factures Normalisées
                </h3>

                <div className="space-y-3">
                  {[
                    { id: `FAC-2026-${school.id}-01`, date: "15 Janvier 2026", amount: "13 000 F CFA", status: "Payée" },
                    { id: `FAC-2025-${school.id}-12`, date: "15 Décembre 2025", amount: "13 000 F CFA", status: "Payée" },
                  ].map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1d2d] flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white font-mono">{inv.id}</p>
                        <p className="text-[10px] text-slate-400">{inv.date}</p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className="font-black text-slate-900 dark:text-white">{inv.amount}</p>
                          <span className="text-[9px] font-black text-emerald-500">{inv.status}</span>
                        </div>
                        <button
                          onClick={() => toast.success(`Téléchargement de la facture ${inv.id}`)}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-indigo-600 transition-colors cursor-pointer"
                          title="Télécharger la facture"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: Manual License Key Activation ────────────────────────── */}
        {licenseModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#131622] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] max-w-lg w-full p-8 shadow-2xl space-y-6 text-slate-900 dark:text-white animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Key size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg">Activer une Licence</h3>
                    <p className="text-xs text-slate-400">Établissement : {school.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setLicenseModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Entrez votre code de licence délivré par votre administrateur ou distributeur agréé Edut :
                </p>
                <input
                  type="text"
                  placeholder="EDUT-PRO-XXXX-YYYY-2027"
                  value={licenseKeyInput}
                  onChange={(e) => setLicenseKeyInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1a1d2d] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl font-mono text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 uppercase placeholder:normal-case"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setLicenseModalOpen(false)}
                  className="px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleActivateLicenseKey}
                  disabled={isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md cursor-pointer flex items-center gap-2"
                >
                  {isPending ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  Activer la Licence
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: QR Code Verification View ────────────────────────────── */}
        {qrModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#131622] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] max-w-sm w-full p-8 shadow-2xl space-y-6 text-slate-900 dark:text-white text-center animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-base">QR Code de Licence</h3>
                <button onClick={() => setQrModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-inner flex items-center justify-center">
                <div className="w-48 h-48 bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-white p-4 space-y-2">
                  <QrCode size={120} className="text-white" />
                  <span className="text-[9px] font-mono text-indigo-300 truncate w-full text-center">
                    {displayLicenseKey}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 font-medium">
                Scannez ce QR Code avec l'application mobile Edut pour synchroniser instantanément les droits d'accès hors ligne.
              </p>

              <button
                onClick={() => setQrModalOpen(false)}
                className="w-full bg-slate-100 dark:bg-slate-800 py-3 rounded-2xl font-black text-xs uppercase"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function PlusIcon(props: any) {
  return (
    <svg width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}
