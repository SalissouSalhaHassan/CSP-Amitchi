"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNavigationProgress } from "@/components/providers/navigation-progress";
import {
  Award,
  Backpack,
  BarChart3,
  BookOpen,
  BookMarked,
  Brain,
  BrainCircuit,
  BriefcaseBusiness,
  Bus,
  Building2,
  ClipboardCheck,
  ClipboardList,
  FileBarChart2,
  FileText,
  CalendarCheck2,
  Globe,
  GraduationCap,
  HeartPulse,
  Home,
  IdCard,
  LibraryBig,
  Mail,
  LayoutDashboard,
  MessageSquare,
  Microscope,
  Package,
  MapPin,
  Printer,
  Radio,
  Sparkles,
  Store,
  Settings,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UsersRound,
  UserRound,
  UserPlus,
  UserCheck,
  Users,
  Wallet,
  TrendingDown,
  Smartphone,
  Loader2,
  LogOut,
  Bookmark,
  ChevronRight,
  ChevronsLeft,
  ChevronDown,
  Bell,
  HelpCircle,
  Info,
  Download,
  RefreshCw,
} from "lucide-react";
import { logout } from "@/domains/auth/actions/login";
import { PWAInstallButton } from "@/components/common/PWAInstallButton";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  badge?: string;
  badgeColor?: string;
};

type NavSection = {
  id: string;
  title: string;
  dotColor: string;
  items: NavItem[];
};

const sectionThemes: Record<string, {
  text: string;
  badgeBg: string;
  badgeBorder: string;
  dot: string;
  divider: string;
}> = {
  general: {
    text: "text-indigo-600 dark:text-indigo-400",
    badgeBg: "bg-indigo-50/90 dark:bg-indigo-950/50",
    badgeBorder: "border-indigo-200/80 dark:border-indigo-800/60",
    dot: "bg-indigo-500",
    divider: "from-indigo-300/60 dark:from-indigo-700/50",
  },
  schooling: {
    text: "text-blue-600 dark:text-blue-400",
    badgeBg: "bg-blue-50/90 dark:bg-blue-950/50",
    badgeBorder: "border-blue-200/80 dark:border-blue-800/60",
    dot: "bg-blue-500",
    divider: "from-blue-300/60 dark:from-blue-700/50",
  },
  pedagogie: {
    text: "text-violet-600 dark:text-violet-400",
    badgeBg: "bg-violet-50/90 dark:bg-violet-950/50",
    badgeBorder: "border-violet-200/80 dark:border-violet-800/60",
    dot: "bg-violet-500",
    divider: "from-violet-300/60 dark:from-violet-700/50",
  },
  finance: {
    text: "text-emerald-600 dark:text-emerald-400",
    badgeBg: "bg-emerald-50/90 dark:bg-emerald-950/50",
    badgeBorder: "border-emerald-200/80 dark:border-emerald-800/60",
    dot: "bg-emerald-500",
    divider: "from-emerald-300/60 dark:from-emerald-700/50",
  },
  administration: {
    text: "text-purple-600 dark:text-purple-400",
    badgeBg: "bg-purple-50/90 dark:bg-purple-950/50",
    badgeBorder: "border-purple-200/80 dark:border-purple-800/60",
    dot: "bg-purple-500",
    divider: "from-purple-300/60 dark:from-purple-700/50",
  },
  canevas: {
    text: "text-cyan-600 dark:text-cyan-400",
    badgeBg: "bg-cyan-50/90 dark:bg-cyan-950/50",
    badgeBorder: "border-cyan-200/80 dark:border-cyan-800/60",
    dot: "bg-cyan-500",
    divider: "from-cyan-300/60 dark:from-cyan-700/50",
  },
  resources: {
    text: "text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-50/90 dark:bg-amber-950/50",
    badgeBorder: "border-amber-200/80 dark:border-amber-800/60",
    dot: "bg-amber-500",
    divider: "from-amber-300/60 dark:from-amber-700/50",
  },
  communication: {
    text: "text-pink-600 dark:text-pink-400",
    badgeBg: "bg-pink-50/90 dark:bg-pink-950/50",
    badgeBorder: "border-pink-200/80 dark:border-pink-800/60",
    dot: "bg-pink-500",
    divider: "from-pink-300/60 dark:from-pink-700/50",
  },
  owner: {
    text: "text-rose-600 dark:text-rose-400",
    badgeBg: "bg-rose-50/90 dark:bg-rose-950/50",
    badgeBorder: "border-rose-200/80 dark:border-rose-800/60",
    dot: "bg-rose-500",
    divider: "from-rose-300/60 dark:from-rose-700/50",
  },
};

const sections: NavSection[] = [
  {
    id: "general",
    title: "VUE GÉNÉRALE",
    dotColor: "bg-indigo-500",
    items: [
      { href: "/dashboard", label: "Tableau de bord", icon: <LayoutDashboard className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/reports", label: "Rapports généraux", icon: <BarChart3 className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/data-quality", label: "Qualité des données", icon: <ShieldAlert className="size-[18px]" />, color: "text-rose-500" },
    ],
  },
  {
    id: "schooling",
    title: "SCOLARITÉ",
    dotColor: "bg-blue-500",
    items: [
      { href: "/dashboard/parent", label: "Portail Parents & App", icon: <Smartphone className="size-[18px]" />, color: "text-purple-500", badge: "Mobile", badgeColor: "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400" },
      { href: "/dashboard/admissions", label: "Inscriptions & Admissions", icon: <UserPlus className="size-[18px]" />, color: "text-emerald-500", badge: "En ligne", badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
      { href: "/dashboard/students", label: "Élèves", icon: <Users className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/students/discipline", label: "Discipline", icon: <Shield className="size-[18px]" />, color: "text-rose-500" },
      { href: "/dashboard/students/promote", label: "Promotions", icon: <GraduationCap className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/attendance", label: "Présences élèves", icon: <CalendarCheck2 className="size-[18px]" />, color: "text-emerald-500" },
      { href: "/dashboard/academics", label: "Gestion académique", icon: <BookOpen className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/academics/lmd", label: "Système LMD / ECTS", icon: <GraduationCap className="size-[18px]" />, color: "text-indigo-600", badge: "Supérieur", badgeColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400" },
      { href: "/dashboard/academics/sections", label: "Sections / Filières", icon: <Bookmark className="size-[18px]" />, color: "text-amber-500" },
      { href: "/dashboard/academics/pedagogical-units", label: "Unités pédagogiques", icon: <UsersRound className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/academics/exams", label: "Examens", icon: <ClipboardList className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/academics/exams/ai-grader", label: "Correcteur IA Caméra", icon: <Sparkles className="size-[18px]" />, color: "text-amber-500", badge: "Vision IA", badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" },
      { href: "/dashboard/academics/grades", label: "Notes & résultats", icon: <ClipboardCheck className="size-[18px]" />, color: "text-emerald-500" },
      { href: "/dashboard/academics/bulletins-batch", label: "Impression Bulletins", icon: <Printer className="size-[18px]" />, color: "text-blue-500", badge: "Batch PDF", badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
      { href: "/dashboard/academics/timetable", label: "Emploi du temps", icon: <CalendarCheck2 className="size-[18px]" />, color: "text-amber-500" },

      { href: "/dashboard/hr/attendance/teacher/me", label: "Ma présence", icon: <ClipboardCheck className="size-[18px]" />, color: "text-emerald-500" },
      { href: "/dashboard/academics/homework", label: "Devoirs", icon: <FileBarChart2 className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/academics/devoirs", label: "Devoirs IA", icon: <BriefcaseBusiness className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/academics/research-graduation", label: "Mémoires & PFE", icon: <GraduationCap className="size-[18px]" />, color: "text-purple-500" },
      { href: "/dashboard/alumni", label: "Alumni & Diplômes", icon: <Award className="size-[18px]" />, color: "text-violet-500", badge: "QR Code", badgeColor: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400" },
      { href: "/verify", label: "Portail Vérification Public", icon: <ShieldCheck className="size-[18px]" />, color: "text-emerald-400", badge: "Officiel", badgeColor: "bg-emerald-500/20 text-emerald-300" },
    ],
  },
  {
    id: "pedagogie",
    title: "PÉDAGOGIE",
    dotColor: "bg-violet-500",
    items: [
      { href: "/dashboard/pedagogie/copilot", label: "Copilot Pédagogique IA", icon: <Sparkles className="size-[18px]" />, color: "text-purple-600", badge: "Enterprise", badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400" },
      { href: "/dashboard/pedagogie", label: "Tableau de bord pédagogique", icon: <LayoutDashboard className="size-[18px]" />, color: "text-violet-600" },
      { href: "/dashboard/pedagogie/ai-analytics", label: "Analytique IA & Décrochage", icon: <BrainCircuit className="size-[18px]" />, color: "text-purple-500" },
      { href: "/dashboard/analytics", label: "Analyses prédictives & BI", icon: <BarChart3 className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/pedagogie/cahier-textes", label: "Cahier de textes", icon: <BookMarked className="size-[18px]" />, color: "text-violet-500" },
      { href: "/dashboard/pedagogie/planification", label: "Planification pédagogique", icon: <CalendarCheck2 className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/pedagogie/progression", label: "Suivi de progression", icon: <FileBarChart2 className="size-[18px]" />, color: "text-emerald-500" },
      { href: "/dashboard/pedagogie/ressources", label: "Ressources pédagogiques", icon: <LibraryBig className="size-[18px]" />, color: "text-violet-500" },
      { href: "/dashboard/pedagogie/devoirs", label: "Devoirs & corrections", icon: <ClipboardList className="size-[18px]" />, color: "text-amber-500" },
      { href: "/dashboard/pedagogie/remediation", label: "Remédiation pédagogique", icon: <GraduationCap className="size-[18px]" />, color: "text-rose-500" },
      { href: "/dashboard/pedagogie/inspection", label: "Inspection pédagogique", icon: <Microscope className="size-[18px]" />, color: "text-cyan-500" },
      { href: "/dashboard/pedagogie/rapports", label: "Rapports pédagogiques", icon: <FileText className="size-[18px]" />, color: "text-slate-600" },
    ],
  },
  {
    id: "finance",
    title: "FINANCES",
    dotColor: "bg-emerald-500",
    items: [
      { href: "/dashboard/finance", label: "Gestion financière", icon: <Wallet className="size-[18px]" />, color: "text-emerald-500" },
      { href: "/dashboard/finance/mobile-money", label: "Mobile Money & UEMOA", icon: <Smartphone className="size-[18px]" />, color: "text-emerald-500", badge: "Direct", badgeColor: "bg-emerald-500/20 text-emerald-400" },
      { href: "/dashboard/finance/bourses-echeanciers", label: "Bourses & Échéanciers", icon: <Award className="size-[18px]" />, color: "text-amber-500" },
      { href: "/dashboard/finance/expenses", label: "Gestion des Dépenses", icon: <TrendingDown className="size-[18px]" />, color: "text-rose-500" },
      { href: "/dashboard/finance/syscohada", label: "Paiements Mobile & SYSCOHADA", icon: <Smartphone className="size-[18px]" />, color: "text-orange-500", badge: "Phase 3", badgeColor: "bg-orange-500/20 text-orange-400" },
      { href: "/dashboard/coges", label: "Paiement COGES", icon: <BriefcaseBusiness className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/verify", label: "Vérifier Quittances & Reçus", icon: <ShieldCheck className="size-[18px]" />, color: "text-amber-400", badge: "SYSCOHADA", badgeColor: "bg-amber-500/20 text-amber-300" },
    ],
  },
  {
    id: "administration",
    title: "ADMINISTRATION",
    dotColor: "bg-violet-500",
    items: [
      { href: "/dashboard/admin-docs", label: "Administration & attestations", icon: <FileText className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/admin-docs/admit-cards", label: "Cartes d'admission", icon: <IdCard className="size-[18px]" />, color: "text-emerald-500" },
      { href: "/dashboard/id-cards", label: "Cartes d'identité", icon: <IdCard className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/importation", label: "Importation intelligente", icon: <Package className="size-[18px]" />, color: "text-indigo-600" },
      { href: "/dashboard/front-office", label: "Accueil administratif", icon: <Building2 className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/print-demo", label: "Impression officielle", icon: <Printer className="size-[18px]" />, color: "text-slate-500" },
    ],
  },
  {
    id: "canevas",
    title: "CANEVAS SCOLAIRES",
    dotColor: "bg-cyan-500",
    items: [
      { href: "/dashboard/canevas", label: "Tableau de bord canevas", icon: <FileBarChart2 className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/canevas/etablissements", label: "Établissements", icon: <Building2 className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/ministry", label: "Portail Ministère", icon: <Globe className="size-[18px]" />, color: "text-rose-500" },
      { href: "/dashboard/inspection", label: "Portail Inspection", icon: <Shield className="size-[18px]" />, color: "text-cyan-500" },
      { href: "/dashboard/canevas/reporting", label: "Centre de reporting", icon: <BarChart3 className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/canevas/export", label: "Export canevas", icon: <Download className="size-[18px]" />, color: "text-slate-500" },
    ],
  },
  {
    id: "resources",
    title: "RESSOURCES",
    dotColor: "bg-amber-500",
    items: [
      { href: "/dashboard/hr", label: "Personnel", icon: <UserRound className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/hr/self-service", label: "Espace Personnel & RH", icon: <UserCheck className="size-[18px]" />, color: "text-emerald-500", badge: "Agent", badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
      { href: "/dashboard/hr/reports", label: "Rapports du personnel", icon: <FileBarChart2 className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/inventory", label: "Inventaire", icon: <Package className="size-[18px]" />, color: "text-amber-500" },
      { href: "/dashboard/library", label: "Bibliothèque", icon: <LibraryBig className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/transport", label: "Transport", icon: <Bus className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/transport/live-map", label: "Radar GPS en direct", icon: <Radio className="size-[18px]" />, color: "text-emerald-500", badge: "GPS Live", badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
      { href: "/dashboard/health", label: "Infirmerie & Santé", icon: <HeartPulse className="size-[18px]" />, color: "text-rose-500" },

      { href: "/dashboard/hostel", label: "Internat", icon: <Home className="size-[18px]" />, color: "text-emerald-500" },
      { href: "/dashboard/pos", label: "Point de vente (POS)", icon: <Store className="size-[18px]" />, color: "text-purple-500" },
      { href: "/dashboard/lms", label: "Formation en ligne", icon: <BookOpen className="size-[18px]" />, color: "text-indigo-500" },
    ],
  },
  {
    id: "communication",
    title: "COMMUNICATION",
    dotColor: "bg-pink-500",
    items: [
      { href: "/dashboard/messaging", label: "Messagerie", icon: <MessageSquare className="size-[18px]" />, color: "text-pink-500", badge: "12", badgeColor: "bg-pink-50 text-pink-600" },
      { href: "/dashboard/notifications", label: "Notifications", icon: <Bell className="size-[18px]" />, color: "text-amber-500", badge: "5", badgeColor: "bg-amber-50 text-amber-600" },
    ],
  },
  {
    id: "system",
    title: "SYSTÈME",
    dotColor: "bg-slate-500",
    items: [
      { href: "/dashboard/security", label: "Sécurité", icon: <Shield className="size-[18px]" />, color: "text-emerald-500" },
      { href: "/dashboard/security/users", label: "Utilisateurs & équipes", icon: <UserRound className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/security/audit-logs", label: "Journal d'audit", icon: <ClipboardList className="size-[18px]" />, color: "text-rose-500" },
      { href: "/dashboard/settings", label: "Paramètres", icon: <Settings className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/settings/headers", label: "En-têtes Officiels & Designer", icon: <FileText className="size-[18px]" />, color: "text-purple-500" },
      { href: "/dashboard/synchronisation", label: "Synchronisation", icon: <RefreshCw className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/campus-setup", label: "Configuration campus", icon: <MapPin className="size-[18px]" />, color: "text-amber-500" },
    ],
  },
  {
    id: "support",
    title: "ASSISTANCE",
    dotColor: "bg-blue-500",
    items: [
      { href: "/dashboard/help", label: "Aide et support", icon: <HelpCircle className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/about", label: "À propos", icon: <Info className="size-[18px]" />, color: "text-slate-500" },
    ],
  },
];
const allItems = sections.flatMap((s) => s.items);
const sortedItems = [...allItems].sort((a, b) => b.href.length - a.href.length);

export default function DashboardSidebar({ 
  user, 
  branch,
  branding,
  allBranches = [],
  unreadNotificationsCount
}: { 
  user: any; 
  branch: any;
  branding?: {
    name: string;
    logoPath: string | null;
    level: string;
  };
  allBranches?: any[];
  unreadNotificationsCount?: number;
}) {
  const handleBranchChange = (branchId: string) => {
    document.cookie = `selected_branch_id=${branchId}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  };

  const isAdmin = user?.admin === true || user?.superAdmin === true || user?.superAdmin === 1;
  const showBranchSwitcher = isAdmin && allBranches && allBranches.length > 1;
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);
  const { startNavigation } = useNavigationProgress();

  const dynamicSections = React.useMemo(() => {
    const isSuperAdmin = Boolean(user?.superAdmin === true || user?.superAdmin === 1);
    const roleNameLower = (user?.role?.roleName || "").toLowerCase();

    // 1. Is Comptable / Caissier? Check role name first
    const isComptable = (
      roleNameLower.includes("comptable") || 
      roleNameLower.includes("caissier") || 
      roleNameLower.includes("financier")
    ) && !roleNameLower.includes("directeur général") && !roleNameLower.includes("directeur general");

    // 2. Is Teacher, Student, Parent?
    const isTeacher = roleNameLower.includes("professeur") || roleNameLower.includes("enseignant") || roleNameLower.includes("teacher");
    const isStudent = roleNameLower.includes("élève") || roleNameLower.includes("etudiant") || roleNameLower.includes("student");
    const isParent = roleNameLower.includes("parent") || roleNameLower.includes("tuteur") || roleNameLower.includes("famille");

    // 3. Is Level Director? (Directeur Primaire, Collège, Lycée, LMD, or restricted educationalLevel)
    const isLevelDirector = !isSuperAdmin && (
      (user?.educationalLevel && !["tous", "all", "tous les niveaux"].includes(user.educationalLevel.toLowerCase())) ||
      roleNameLower.includes("primaire") ||
      roleNameLower.includes("collège") ||
      roleNameLower.includes("college") ||
      roleNameLower.includes("lycée") ||
      roleNameLower.includes("lycee") ||
      roleNameLower.includes("licence") ||
      roleNameLower.includes("master") ||
      roleNameLower.includes("lmd")
    );

    let filtered = sections.map((section) => {
      let items = [...section.items].map((item) => {
        if (item.href === "/dashboard/notifications") {
          return {
            ...item,
            badge: unreadNotificationsCount && unreadNotificationsCount > 0 ? String(unreadNotificationsCount) : undefined,
          };
        }
        return { ...item };
      });

      if (isTeacher) {
        if (section.id === "general") {
          items = items.filter((item) => item.href === "/dashboard");
        } else if (section.id === "schooling") {
          items = items.filter((item) => [
            "/dashboard/students",
            "/dashboard/attendance",
            "/dashboard/academics/exams",
            "/dashboard/academics/grades",
            "/dashboard/academics/timetable",
            "/dashboard/hr/attendance/teacher/me",
            "/dashboard/academics/homework",
            "/dashboard/academics/pedagogical-units",
          ].includes(item.href));
        } else if (["finance", "administration", "canevas", "resources", "system"].includes(section.id)) {
          items = [];
        } else if (section.id === "pedagogie") {
          items = items.filter((item) => [
            "/dashboard/pedagogie",
            "/dashboard/pedagogie/cahier-textes",
            "/dashboard/pedagogie/planification",
            "/dashboard/pedagogie/progression",
            "/dashboard/pedagogie/ressources",
            "/dashboard/pedagogie/devoirs",
            "/dashboard/pedagogie/remediation"
          ].includes(item.href));
        }
      } else if (isStudent) {
        if (section.id === "general") {
          items = items.filter((item) => item.href === "/dashboard");
        } else if (section.id === "schooling") {
          items = items.filter((item) => [
            "/dashboard/attendance",
            "/dashboard/academics/grades",
            "/dashboard/academics/timetable",
            "/dashboard/academics/homework"
          ].includes(item.href));
        } else if (section.id === "pedagogie") {
          items = items.filter((item) => [
            "/dashboard/pedagogie/ressources",
            "/dashboard/pedagogie/devoirs",
            "/dashboard/pedagogie/progression"
          ].includes(item.href));
        } else if (["finance", "administration", "canevas", "resources", "system"].includes(section.id)) {
          items = [];
        }
      } else if (isParent) {
        if (section.id === "general") {
          items = items.filter((item) => item.href === "/dashboard");
        } else if (section.id === "schooling") {
          items = items.filter((item) => [
            "/dashboard/attendance",
            "/dashboard/academics/grades",
            "/dashboard/academics/timetable",
            "/dashboard/academics/homework"
          ].includes(item.href));
        } else if (section.id === "pedagogie") {
          items = items.filter((item) => [
            "/dashboard/pedagogie/progression",
            "/dashboard/pedagogie/devoirs"
          ].includes(item.href));
        } else if (["finance", "administration", "canevas", "resources", "system"].includes(section.id)) {
          items = [];
        }
      } else if (isComptable) {
        if (section.id === "general") {
          items = items.filter((item) => ["/dashboard", "/dashboard/reports"].includes(item.href));
        } else if (section.id === "schooling") {
          // Accountant ONLY sees student management for viewing fees/invoices
          items = items.filter((item) => ["/dashboard/students"].includes(item.href));
        } else if (section.id === "finance") {
          items = items; // /dashboard/finance, /dashboard/coges
        } else if (section.id === "administration") {
          items = items.filter((item) => [
            "/dashboard/admin-docs",
            "/dashboard/admin-docs/admit-cards",
            "/dashboard/id-cards"
          ].includes(item.href));
        } else if (section.id === "communication" || section.id === "support") {
          items = items;
        } else if (["pedagogie", "canevas", "resources", "system"].includes(section.id)) {
          items = [];
        }
      } else {
        // Administration / Directeur / Responsable pédagogique (Admin permissions)
        items = items.filter((item) => item.href !== "/dashboard/hr/attendance/teacher/me");

        if (isLevelDirector && section.id === "system") {
          // Level Director (Collège / Lycée / Primaire / LMD) CANNOT modify security roles (/dashboard/security).
          // They only see Utilisateurs & Équipes (/dashboard/security/users) filtered by their level!
          items = items.filter((item) => [
            "/dashboard/security/users"
          ].includes(item.href));
        }

        if (isLevelDirector && section.id === "canevas") {
          items = items.filter((item) => [
            "/dashboard/canevas",
            "/dashboard/canevas/etablissements",
            "/dashboard/canevas/reporting",
            "/dashboard/canevas/export"
          ].includes(item.href));
        }
      }

      if (isSuperAdmin && section.id === "system") {
        items = items.filter((item) => item.href !== "/dashboard/security/audit-logs");
      }

      return {
        ...section,
        items,
      };
    });

    filtered = filtered.filter((section) => section.items.length > 0);

    if (isSuperAdmin) {
      filtered.unshift({
        id: "owner",
        title: "PROPRIÉTAIRE",
        dotColor: "bg-red-500",
        items: [
          {
            href: "/platform-admin",
            label: "Gestion de la plateforme",
            icon: <Globe className="size-[18px]" />,
            color: "text-red-500",
          },
          {
            href: "/dashboard/security/audit-logs",
            label: "Audit global",
            icon: <Shield className="size-[18px]" />,
            color: "text-indigo-500",
          },
          {
            href: "/dashboard/super-admin",
            label: "Console administrateur",
            icon: <Settings className="size-[18px]" />,
            color: "text-amber-500",
          },
          {
            href: "/dashboard/subscription",
            label: "Gestion des abonnements",
            icon: <Wallet className="size-[18px]" />,
            color: "text-emerald-500",
          },
          {
            href: "/register-school",
            label: "Inscription école",
            icon: <Building2 className="size-[18px]" />,
            color: "text-pink-500",
          },
        ],
      });
    }

    if (!isTeacher && !isSuperAdmin) {
      const systemSection = filtered.find((section) => section.id === "system");
      if (systemSection) {
        systemSection.items.push({
          href: "/dashboard/subscription",
          label: "Mon abonnement",
          icon: <Wallet className="size-[18px]" />,
          color: "text-indigo-600",
        });
      }
    }

    return filtered;
  }, [unreadNotificationsCount, user?.superAdmin, user?.admin, user?.role?.roleName, user?.educationalLevel, user?.id]);
  const allPlatformItems = dynamicSections.flatMap((s) => s.items);
  const sortedPlatformItems = [...allPlatformItems].sort((a, b) => b.href.length - a.href.length);

  React.useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const activeHref = React.useMemo(() => {
    if (pathname === "/dashboard") return "/dashboard";
    for (const item of sortedPlatformItems) {
      if (item.href !== "/dashboard" && (pathname === item.href || pathname.startsWith(`${item.href}/`))) {
        return item.href;
      }
    }
    return "/dashboard";
  }, [pathname, sortedPlatformItems]);

  return (
    <aside className="w-[300px] shrink-0 rounded-[32px] bg-white dark:bg-[#12141d] border border-indigo-200/50 dark:border-slate-800/80 shadow-[0_0_40px_-10px_rgba(99,102,241,0.08)] dark:shadow-[0_20px_80px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-full relative print:hidden transition-colors duration-300">
      {/* HEADER */}
      <div className="p-6 shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {(() => {
              const b = branding as any;
              const br = branch as any;
              const s = user?.school as any;
              const ab = (allBranches as any[]) || [];
              const firstBranch = ab.find((x: any) => x.logoPath || x.logo_path || x.logoUrl);
              const logo = b?.logoPath || 
                           b?.logo_path || 
                           b?.logoUrl || 
                           br?.logoPath || 
                           br?.logo_path || 
                           br?.logoUrl || 
                           s?.logoPath || 
                           s?.logo_path || 
                           s?.logoUrl || 
                           s?.logo ||
                           firstBranch?.logoPath ||
                           firstBranch?.logo_path ||
                           firstBranch?.logoUrl;
              return (
                <div className="w-12 h-12 rounded-[18px] bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none overflow-hidden shrink-0 border border-indigo-500/30">
                  {logo ? (
                    <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-indigo-600 font-black text-xl text-white">
                      {(branding?.name || branch?.branchName || user?.school?.name || "E").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="min-w-0">
              <p className="font-bold text-slate-900 dark:text-white text-[17px] leading-tight truncate">
                {branding?.name || branch?.branchName || "École Plus"}
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                {branding?.level || user?.educationalLevel || "Gestion Scolaire"}
              </p>
            </div>
          </div>
          <button className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors shrink-0">
            <ChevronsLeft className="size-4" />
          </button>
        </div>

        {showBranchSwitcher && (
          <div className="relative">
            <select
              value={branch?.id?.toString() || "all"}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="w-full appearance-none rounded-xl border border-indigo-100/80 dark:border-slate-800 bg-slate-50 dark:bg-[#181a24] hover:bg-slate-100/70 dark:hover:bg-[#1f2230] px-3 py-2 pr-8 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none transition-all cursor-pointer shadow-sm"
            >
              <option value="all" className="dark:bg-[#181a24] dark:text-white">Administration générale (toutes)</option>
              {allBranches.map((b: any) => (
                <option key={b.id} value={b.id?.toString()} className="dark:bg-[#181a24] dark:text-white">
                  {b.branchName} ({b.instType})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-500 dark:text-slate-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* NAVIGATION */}
      <nav className="px-4 pb-4 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
        {dynamicSections.map((section, sIdx) => {
          const theme = sectionThemes[section.id] || {
            text: "text-slate-600 dark:text-slate-400",
            badgeBg: "bg-slate-100/80 dark:bg-slate-800/50",
            badgeBorder: "border-slate-200/80 dark:border-slate-700/60",
            dot: "bg-slate-400",
            divider: "from-slate-200/60 dark:from-slate-700/50",
          };

          return (
            <div
              key={section.id}
              className={cn(
                "space-y-2.5",
                sIdx > 0 && "pt-5 mt-3 border-t border-slate-200/70 dark:border-slate-800/80"
              )}
            >
              {/* Distinctive Section Header with Glowing Dot & Divider Line */}
              <div className="px-1 flex items-center justify-between gap-2.5 select-none">
                <div
                  className={cn(
                    "inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border shadow-xs transition-colors",
                    theme.badgeBg,
                    theme.badgeBorder
                  )}
                >
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-60", theme.dot)} />
                    <span className={cn("relative inline-flex rounded-full h-2 w-2", theme.dot)} />
                  </span>
                  <span className={cn("text-[10px] font-black uppercase tracking-wider", theme.text)}>
                    {section.title}
                  </span>
                </div>

                {/* Horizontal Gradient Divider Line */}
                <div
                  className={cn(
                    "h-px flex-1 bg-gradient-to-r to-transparent",
                    theme.divider
                  )}
                />

                {/* Counter Badge */}
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded-md bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                  {section.items.length}
                </span>
              </div>
              <div className="space-y-1">
              {section.items.map((item) => {
                const active = activeHref === item.href;
                const isPending = pendingHref === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    scroll={true}
                    prefetch={false}
                    onClick={() => {
                        setPendingHref(item.href);
                        startNavigation();
                      }}
                    className={cn(
                      "group relative flex items-center justify-between gap-3 rounded-2xl px-3 py-3 transition-all duration-300",
                      active
                        ? "bg-gradient-to-r from-transparent to-indigo-100/50 dark:to-indigo-950/40"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    )}
                  >
                    {/* Active Right Indicator Line */}
                    {active && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-l-full" />
                    )}

                    <span className="flex items-center gap-4">
                      <span
                        className={cn(
                          "w-10 h-10 rounded-[14px] flex items-center justify-center transition-all duration-300 relative",
                          active
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none"
                            : cn("bg-white dark:bg-[#181a24] border border-slate-100/80 dark:border-slate-800/80 group-hover:border-slate-200 dark:group-hover:border-slate-700 group-hover:bg-slate-50 dark:group-hover:bg-[#1f2230] shadow-sm", item.color)
                        )}
                      >
                        {isPending ? <Loader2 className="size-[18px] animate-spin text-indigo-600 dark:text-indigo-400" /> : item.icon}
                      </span>
                      <span className={cn("text-sm", active ? "font-bold text-indigo-700 dark:text-indigo-400" : "font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors")}>
                        {item.label}
                      </span>
                    </span>

                    {/* Right Chevron or Badge */}
                    {item.badge && !isPending ? (
                      <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black", item.badgeColor)}>
                        {item.badge}
                      </span>
                    ) : !active ? (
                      <ChevronRight className="size-[15px] text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-400 transition-colors mr-1" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
      </nav>

      {/* PWA Install Action */}
      <div className="px-4 pb-2">
        <PWAInstallButton variant="sidebar" />
      </div>

      {/* FOOTER (Profile & Logout) */}
      <div className="p-4 mt-auto shrink-0 border-t border-slate-50/50 dark:border-slate-800/60">
        <div className="rounded-[24px] bg-indigo-50/50 dark:bg-[#181a24]/90 hover:bg-indigo-50 dark:hover:bg-[#1f2230] border border-indigo-100/30 dark:border-slate-800 p-2.5 flex items-center justify-between transition-colors group">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-[14px] bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-200/50 dark:shadow-none overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.nomPrenom || "User"} className="w-full h-full object-cover" />
                ) : (
                  user?.nomPrenom?.charAt(0) || user?.utilisateur?.charAt(0) || "A"
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-[#181a24] shadow-sm" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                {user?.nomPrenom || user?.utilisateur || "Admin GROUP AIIU-NIGER"}
              </p>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                {user?.admin || !user?.role ? "Administrateur" : user?.role?.roleName || "Administrateur"}
              </p>
            </div>
          </div>
          <button
            type="button"
            title="Déconnexion"
            onClick={async () => {
              try {
                localStorage.removeItem("edut_user_session");
                localStorage.removeItem("edut_last_session_user");
                localStorage.removeItem("edut_offline_mode");
                document.cookie = "edut_session_user=; path=/; max-age=0";
              } catch (_) {}
              await logout();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors ml-2 shrink-0 cursor-pointer"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
