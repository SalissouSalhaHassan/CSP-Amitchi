"use client";

import React, { useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import {
  Building2,
  Users,
  GraduationCap,
  DollarSign,
  Bell,
  TrendingUp,
  Activity,
  House,
  Sun,
  Moon,
  Puzzle,
  LayoutDashboard,
  Sparkles,
  CheckCircle2,
  Shield,
  Layers,
  Smartphone,
  CreditCard,
  MessageSquare,
  Bus,
  UtensilsCrossed,
  ScanFace,
  Globe,
  Sliders,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AddSchoolDialog } from "./AddSchoolDialog";
import { SchoolManagerNew } from "./SchoolManagerNew";
import { PlatformChartsNew } from "./PlatformChartsNew";
import { PlanDonutChart } from "./PlanDonutChart";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

function formatCfa(amount: number) {
  return `${Math.round(amount).toLocaleString("fr-FR")} CFA`;
}

import { PlatformUsageSummary } from "./PlatformUsageSummary";
import { Gauge } from "lucide-react";

interface PlatformAdminClientProps {
  stats: {
    schools: number;
    students: number;
    users: number;
    revenue: number;
  };
  schoolsList: any[];
  logs: any[];
  usageData?: any;
  userName: string;
}

export function PlatformAdminClient({
  stats,
  schoolsList,
  logs,
  usageData,
  userName,
}: PlatformAdminClientProps) {
  const { isDark, toggleTheme, isMounted } = useTheme();
  const [activeTab, setActiveTab] = useState<"overview" | "schools" | "usage" | "addons">("overview");

  // SaaS Add-ons State
  const [addonsList, setAddonsList] = useState([
    {
      id: "lmd",
      title: "Module LMD & Enseignement Supérieur",
      titleAr: "نظام LMD والتعليم العالي",
      description: "Gestion des crédits ECTS, maquettes pédagogiques, unités d'enseignement et délibérations semestrielles.",
      icon: GraduationCap,
      category: "Académique & Université",
      includedIn: "Pro & Enterprise",
      color: "from-blue-600 to-indigo-600",
      activeCount: schoolsList.filter((s) => s.plan === "pro" || s.plan === "enterprise").length,
      status: "active",
    },
    {
      id: "sms",
      title: "Passerelle SMS & WhatsApp Direct",
      titleAr: "بوابة الرسائل القصيرة والواتساب",
      description: "Envoi automatique des relevés de notes, alertes retards/absences et quittances de paiement aux parents.",
      icon: MessageSquare,
      category: "Communication",
      includedIn: "Tous les forfaits",
      color: "from-emerald-600 to-teal-600",
      activeCount: schoolsList.length,
      status: "active",
    },
    {
      id: "payments",
      title: "Paiement Mobile Money & Banques",
      titleAr: "بوابات الدفع الإلكتروني والموبايل موني",
      description: "Encaissement des frais de scolarité via Airtel Money, Moov Money, Orange Money et Cartes Bancaires.",
      icon: CreditCard,
      category: "Finances & Comptabilité",
      includedIn: "Basic, Pro & Enterprise",
      color: "from-amber-500 to-orange-600",
      activeCount: schoolsList.filter((s) => s.plan !== "gratuit").length,
      status: "active",
    },
    {
      id: "digital_integrity",
      title: "Portail de Vérification Numérique & Anti-Fraude",
      titleAr: "بوابة التحقق الرقمي ومكافحة التزوير",
      description: "Authentification W3C Verifiable Credentials et QR codes cryptographiques pour diplômes et bulletins.",
      icon: Shield,
      category: "Sécurité & Intégrité",
      includedIn: "Tous les forfaits",
      color: "from-violet-600 to-purple-600",
      activeCount: schoolsList.length,
      status: "active",
    },
    {
      id: "ai_insights",
      title: "Intelligence Artificielle & Alerte Précoce",
      titleAr: "الذكاء الاصطناعي والتنبيه المبكر",
      description: "Analyse prédictive des risques de décrochage scolaire et recommandations pédagogiques assistées par IA.",
      icon: Sparkles,
      category: "IA & Analytique",
      includedIn: "Pro & Enterprise",
      color: "from-pink-500 to-rose-600",
      activeCount: schoolsList.filter((s) => s.plan === "pro" || s.plan === "enterprise").length,
      status: "active",
    },
    {
      id: "transport",
      title: "Module Transport Scolaire & Géolocalisation",
      titleAr: "النقل المدرسي والتتبع الجغرافي",
      description: "Gestion des circuits de bus, arrêts, abonnements et suivi en temps réel des tournées.",
      icon: Bus,
      category: "Vie Scolaire & Logistique",
      includedIn: "Basic, Pro & Enterprise",
      color: "from-cyan-600 to-blue-600",
      activeCount: Math.min(schoolsList.length, 12),
      status: "active",
    },
    {
      id: "canteen",
      title: "Module Cantine & Restauration Scolaire",
      titleAr: "المطعم المدرسي وتتبع الوجبات",
      description: "Gestion des formules repas, badges de cantine, menus hebdomadaires et suivi nutritionnel.",
      icon: UtensilsCrossed,
      category: "Vie Scolaire & Logistique",
      includedIn: "Basic, Pro & Enterprise",
      color: "from-amber-600 to-yellow-600",
      activeCount: Math.min(schoolsList.length, 9),
      status: "active",
    },
    {
      id: "biometrics",
      title: "Pointage Biométrique & Présence Intelligente",
      titleAr: "البصمة الحيوية والحضور الذكي",
      description: "Intégration pointeuses ZKTeco et reconnaissance faciale pour élèves et enseignants.",
      icon: ScanFace,
      category: "Matériel & IOT",
      includedIn: "Sur Mesure (Enterprise)",
      color: "from-slate-700 to-slate-900",
      activeCount: schoolsList.filter((s) => s.plan === "enterprise").length,
      status: "active",
    },
  ]);

  const now = new Date();

  // Compute plan distribution
  const planCounts = { premium: 0, basic: 0, gratuit: 0 };
  for (const s of schoolsList) {
    if (s.plan === "premium" || s.plan === "enterprise") planCounts.premium++;
    else if (s.plan === "basic") planCounts.basic++;
    else planCounts.gratuit++;
  }
  const totalSchoolsForPlan = schoolsList.length || 1;

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? "dark bg-[#0B0F17] text-slate-100" : "bg-[#f8f9fc] text-slate-900"} font-sans`}>
      {/* TOP HEADER */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#111827]/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-6 sm:px-8 py-4 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Tour de Contrôle SaaS
              </h1>
              <Badge className="bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-black uppercase tracking-wider">
                Super Admin
              </Badge>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
              Bonjour, <strong className="text-slate-700 dark:text-slate-300">{userName}</strong> • Supervision globale de la plateforme EDUT
            </p>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "overview"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <LayoutDashboard size={15} />
              Vue d'ensemble
            </button>
            <button
              onClick={() => setActiveTab("schools")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "schools"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Building2 size={15} />
              Établissements ({schoolsList.length})
            </button>
            <button
              onClick={() => setActiveTab("usage")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "usage"
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Gauge size={15} />
              Usage & Quotas (الاستهلاك)
            </button>
            <button
              onClick={() => setActiveTab("addons")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "addons"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Puzzle size={15} />
              Extensions & Add-ons (إضافات)
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
          >
            {isMounted && isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
          </button>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            <House className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard École</span>
          </Link>

          <AddSchoolDialog />

          <Link
            href="/dashboard"
            className="relative w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
              3
            </span>
          </Link>
        </div>
      </header>

      {/* Mobile Tab Bar */}
      <div className="lg:hidden px-6 pt-4 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
            activeTab === "overview" ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          }`}
        >
          <LayoutDashboard size={14} />
          Vue d'ensemble
        </button>
        <button
          onClick={() => setActiveTab("schools")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
            activeTab === "schools" ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          }`}
        >
          <Building2 size={14} />
          Établissements
        </button>
        <button
          onClick={() => setActiveTab("usage")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
            activeTab === "usage" ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          }`}
        >
          <Gauge size={14} />
          Usage & Quotas
        </button>
        <button
          onClick={() => setActiveTab("addons")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
            activeTab === "addons" ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          }`}
        >
          <Puzzle size={14} />
          Extensions & Add-ons
        </button>
      </div>

      <main className="p-6 sm:p-8 space-y-8 max-w-[1600px] mx-auto">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <>
            {/* STATS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {[
                {
                  label: "TOTAL ÉTABLISSEMENTS",
                  value: stats.schools,
                  sub: "Écoles & universités actives",
                  icon: Building2,
                  iconBg: "bg-blue-500/10 text-blue-500",
                },
                {
                  label: "TOTAL ÉLÈVES & ÉTUDIANTS",
                  value: stats.students,
                  sub: "+12 ce mois",
                  icon: GraduationCap,
                  iconBg: "bg-violet-500/10 text-violet-500",
                  trend: "+12",
                  trendUp: true,
                },
                {
                  label: "UTILISATEURS & STAFF",
                  value: stats.users,
                  sub: "Administrateurs & Enseignants",
                  icon: Users,
                  iconBg: "bg-pink-500/10 text-pink-500",
                },
                {
                  label: "REVENU GLOBAL COLLECTÉ",
                  value: formatCfa(stats.revenue),
                  sub: "+8.5% ce mois",
                  icon: DollarSign,
                  iconBg: "bg-emerald-500/10 text-emerald-500",
                  trend: "+8.5%",
                  trendUp: true,
                },
              ].map((card, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 flex items-start gap-4 hover:shadow-lg transition-all"
                >
                  <div className={`w-12 h-12 rounded-2xl ${card.iconBg} flex items-center justify-center shrink-0`}>
                    <card.icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                      {card.label}
                    </p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                      {card.value}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {card.trend && (
                        <span className={`text-xs font-bold ${card.trendUp ? "text-emerald-500" : "text-rose-500"} flex items-center gap-0.5`}>
                          {card.trendUp ? <TrendingUp className="w-3 h-3" /> : null}
                          {card.trend}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 dark:text-slate-500 truncate">{card.sub}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <PlatformChartsNew
                  schoolsCount={stats.schools}
                  studentsCount={stats.students}
                  usersCount={stats.users}
                  revenue={stats.revenue}
                />
              </div>

              {/* Plan Distribution Donut */}
              <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      RÉPARTITION DES FORFAITS
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      {schoolsList.length} écoles
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">
                    Distribution par type d'abonnement SaaS actif.
                  </p>
                  <PlanDonutChart
                    premium={planCounts.premium}
                    basic={planCounts.basic}
                    gratuit={planCounts.gratuit}
                    total={totalSchoolsForPlan}
                  />
                </div>

                <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-indigo-600" />
                      <span className="font-bold text-slate-700 dark:text-slate-300">Entreprise & Pro</span>
                    </div>
                    <span className="font-black text-slate-900 dark:text-white">
                      {planCounts.premium} ({Math.round((planCounts.premium / totalSchoolsForPlan) * 100)}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-cyan-500" />
                      <span className="font-bold text-slate-700 dark:text-slate-300">Basique</span>
                    </div>
                    <span className="font-black text-slate-900 dark:text-white">
                      {planCounts.basic} ({Math.round((planCounts.basic / totalSchoolsForPlan) * 100)}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <span className="font-bold text-slate-700 dark:text-slate-300">Gratuit / Découverte</span>
                    </div>
                    <span className="font-black text-slate-900 dark:text-white">
                      {planCounts.gratuit} ({Math.round((planCounts.gratuit / totalSchoolsForPlan) * 100)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* QUICK SCHOOLS TABLE */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Établissements Récemment Enregistrés
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Gestion des licences, accès rapide et paramétrages des sous-domaines.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("schools")}
                  className="rounded-xl font-bold text-xs gap-1 dark:border-slate-700"
                >
                  Voir toute la liste ({schoolsList.length})
                  <ChevronRight size={14} />
                </Button>
              </div>
              <SchoolManagerNew schools={schoolsList} />
            </div>
          </>
        )}

        {/* TAB 2: SCHOOLS LIST */}
        {activeTab === "schools" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Gestion Complète des Établissements
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Générez des clés de licences, modifiez les sous-domaines ou connectez-vous directement en tant qu'administrateur.
              </p>
            </div>
            <SchoolManagerNew schools={schoolsList} />
          </div>
        )}

        {/* TAB: USAGE & QUOTAS (الاستهلاك والقيود) */}
        {activeTab === "usage" && usageData && (
          <PlatformUsageSummary usageData={usageData} />
        )}

        {/* TAB 3: EXTENSIONS & ADD-ONS (إضافات) */}
        {activeTab === "addons" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/40 border border-indigo-500/20 rounded-3xl p-6 sm:p-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Puzzle className="text-indigo-400 w-6 h-6" />
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    Catalogue des Extensions & Modules SaaS (إضافات المنصة)
                  </h2>
                </div>
                <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
                  Supervisez et activez les modules technologiques avancés de la plateforme EDUT. Chaque extension peut être déployée ou débloquée pour des établissements spécifiques.
                </p>
              </div>
              <Button
                onClick={() => toast.info("Tous les modules principaux sont synchronisés avec les plans SaaS.")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl h-12 px-6 shrink-0 shadow-lg shadow-indigo-600/30"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Synchroniser les Quotas
              </Button>
            </div>

            {/* Grid of Add-ons */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {addonsList.map((addon) => {
                const IconComponent = addon.icon;
                return (
                  <div
                    key={addon.id}
                    className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between hover:shadow-xl hover:border-indigo-500/30 transition-all group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${addon.color} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none text-[10px] font-black uppercase">
                          Actif
                        </Badge>
                      </div>

                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        {addon.category}
                      </p>
                      <h3 className="text-base font-black text-slate-900 dark:text-white mb-0.5">
                        {addon.title}
                      </h3>
                      <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                        {addon.titleAr}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                        {addon.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-semibold">Forfait inclus:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{addon.includedIn}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-semibold">Écoles utilisatrices:</span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400">{addon.activeCount} établissements</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveTab("schools");
                          toast.info(`Sélectionnez une école pour lui assigner le ${addon.title}.`);
                        }}
                        className="w-full h-9 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Configurer les Quotas
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
