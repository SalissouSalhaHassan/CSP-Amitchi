"use client";

import React, { useState, useTransition } from "react";
import { useTheme } from "@/hooks/use-theme";
import { 
  Building2, 
  Users, 
  Globe, 
  ShieldCheck, 
  BarChart3, 
  Settings2,
  AlertTriangle,
  Search,
  Plus,
  X,
  Filter,
  CheckCircle,
  AlertCircle,
  Eye,
  Layers,
  ExternalLink,
  Sun,
  Moon,
  Puzzle,
  Sparkles,
  GraduationCap,
  MessageSquare,
  CreditCard,
  Shield,
  Bus,
  UtensilsCrossed,
  ScanFace,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createSchoolAction, updateSchoolStatus } from "@/domains/auth/actions/super-admin.actions";
import { impersonateSchool } from "@/domains/platform/actions/platform.actions";

type SchoolType = {
  id: number | string;
  name: string;
  slug: string;
  plan: string | null;
  status: string | null;
  createdAt: Date | string | number | null;
};

type StatsType = {
  totalSchools: number;
  totalStudents: number;
  activeSchools: number;
  revenue: number;
};

export default function SuperAdminClient({
  initialSchools,
  stats,
  user
}: {
  initialSchools: SchoolType[];
  stats: StatsType;
  user: any;
}) {
  const { isDark, toggleTheme, isMounted } = useTheme();
  const [activeTab, setActiveTab] = useState<"schools" | "addons">("schools");

  const [schools, setSchools] = useState<SchoolType[]>(initialSchools);
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals visibility states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolType | null>(null);

  // Form states for manual school creation
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createPlan, setCreatePlan] = useState("basic");
  const [createStatus, setCreateStatus] = useState("active");
  const [createError, setCreateError] = useState("");
  const [isCreating, startCreateTransition] = useTransition();

  // Form states for editing school
  const [editPlan, setEditPlan] = useState("basic");
  const [editStatus, setEditStatus] = useState("active");
  const [editError, setEditError] = useState("");
  const [isEditing, startEditTransition] = useTransition();

  // Add-ons list for Super Admin
  const addons = [
    {
      id: "lmd",
      title: "Module LMD & Enseignement Supérieur",
      titleAr: "نظام LMD والتعليم العالي",
      description: "Gestion des crédits ECTS, maquettes pédagogiques, unités d'enseignement et délibérations semestrielles.",
      icon: GraduationCap,
      category: "Académique",
      includedIn: "Pro & Enterprise",
      color: "from-blue-600 to-indigo-600",
      activeCount: schools.filter((s) => s.plan === "pro" || s.plan === "enterprise").length,
    },
    {
      id: "sms",
      title: "Passerelle SMS & WhatsApp Direct",
      titleAr: "بوابة الرسائل القصيرة والواتساب",
      description: "Envoi automatique des relevés de notes, alertes retards/absences et quittances de paiement.",
      icon: MessageSquare,
      category: "Communication",
      includedIn: "Tous les forfaits",
      color: "from-emerald-600 to-teal-600",
      activeCount: schools.length,
    },
    {
      id: "payments",
      title: "Paiement Mobile Money & Banques",
      titleAr: "بوابات الدفع الإلكتروني والموبايل موني",
      description: "Encaissement des frais de scolarité via Airtel Money, Moov Money, Orange Money et Cartes Bancaires.",
      icon: CreditCard,
      category: "Finances",
      includedIn: "Basic, Pro & Enterprise",
      color: "from-amber-500 to-orange-600",
      activeCount: schools.filter((s) => s.plan !== "gratuit").length,
    },
    {
      id: "digital_integrity",
      title: "Portail de Vérification Numérique & Anti-Fraude",
      titleAr: "بوابة التحقق الرقمي ومكافحة التزوير",
      description: "Authentification W3C Verifiable Credentials et QR codes cryptographiques pour diplômes et bulletins.",
      icon: Shield,
      category: "Sécurité",
      includedIn: "Tous les forfaits",
      color: "from-violet-600 to-purple-600",
      activeCount: schools.length,
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
      activeCount: schools.filter((s) => s.plan === "pro" || s.plan === "enterprise").length,
    },
    {
      id: "transport",
      title: "Module Transport Scolaire & Géolocalisation",
      titleAr: "النقل المدرسي والتتبع الجغرافي",
      description: "Gestion des circuits de bus, arrêts, abonnements et suivi en temps réel des tournées.",
      icon: Bus,
      category: "Logistique",
      includedIn: "Basic, Pro & Enterprise",
      color: "from-cyan-600 to-blue-600",
      activeCount: Math.min(schools.length, 12),
    },
    {
      id: "canteen",
      title: "Module Cantine & Restauration Scolaire",
      titleAr: "المطعم المدرسي وتتبع الوجبات",
      description: "Gestion des formules repas, badges de cantine, menus hebdomadaires et suivi nutritionnel.",
      icon: UtensilsCrossed,
      category: "Logistique",
      includedIn: "Basic, Pro & Enterprise",
      color: "from-amber-600 to-yellow-600",
      activeCount: Math.min(schools.length, 9),
    },
    {
      id: "biometrics",
      title: "Pointage Biométrique & Présence Intelligente",
      titleAr: "البصمة الحيوية والحضور الذكي",
      description: "Intégration pointeuses ZKTeco et reconnaissance faciale pour élèves et enseignants.",
      icon: ScanFace,
      category: "Matériel & IOT",
      includedIn: "Sur Mesure",
      color: "from-slate-700 to-slate-900",
      activeCount: schools.filter((s) => s.plan === "enterprise").length,
    },
  ];

  // Calculate actual revenue based on plan pricing
  const calculateRevenue = () => {
    return schools
      .filter(s => s.status === "active")
      .reduce((acc, s) => {
        const monthlyCost = s.plan === "pro" ? 49000 : s.plan === "enterprise" ? 150000 : 19000;
        return acc + monthlyCost;
      }, 0);
  };

  // Filtered schools
  const filteredSchools = schools.filter((school) => {
    const matchesSearch = 
      school.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      school.slug.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPlan = planFilter === "all" || school.plan === planFilter;
    const matchesStatus = statusFilter === "all" || school.status === statusFilter;

    return matchesSearch && matchesPlan && matchesStatus;
  });

  const openCreateModal = () => {
    setCreateName("");
    setCreateSlug("");
    setCreatePlan("basic");
    setCreateStatus("active");
    setCreateError("");
    setIsCreateOpen(true);
  };

  const openEditModal = (school: SchoolType) => {
    setSelectedSchool(school);
    setEditPlan(school.plan || "basic");
    setEditStatus(school.status || "active");
    setEditError("");
    setIsEditOpen(true);
  };

  const handleCreateSchool = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (!createName.trim() || !createSlug.trim()) {
      setCreateError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    startCreateTransition(async () => {
      try {
        const res = await createSchoolAction({
          name: createName,
          slug: createSlug,
          plan: createPlan as any,
          status: createStatus as any,
        });

        if (res.success) {
          toast.success("Établissement créé avec succès !");
          if (res.data) {
            setSchools(prev => [res.data as SchoolType, ...prev]);
          } else {
            setSchools(prev => [{
              id: Date.now(),
              name: createName,
              slug: createSlug,
              plan: createPlan,
              status: createStatus,
              createdAt: new Date(),
            }, ...prev]);
          }
          setIsCreateOpen(false);
        } else {
          setCreateError(res.error || "Une erreur est survenue lors de la création.");
        }
      } catch (err: any) {
        setCreateError(err.message || "Erreur réseau.");
      }
    });
  };

  const handleEditSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool) return;

    setEditError("");

    startEditTransition(async () => {
      try {
        const res = await updateSchoolStatus({
          id: selectedSchool.id,
          plan: editPlan as any,
          status: editStatus as any,
        });

        if (res.success) {
          toast.success("Établissement mis à jour avec succès !");
          if (res.data) {
            setSchools(prev => prev.map(s => s.id === selectedSchool.id ? (res.data as SchoolType) : s));
          } else {
            setSchools(prev => prev.map(s => s.id === selectedSchool.id ? { ...s, plan: editPlan, status: editStatus } : s));
          }
          setIsEditOpen(false);
        } else {
          setEditError(res.error || "Une erreur est survenue.");
        }
      } catch (err: any) {
        setEditError(err.message || "Erreur réseau.");
      }
    });
  };

  return (
    <div className={`p-6 sm:p-8 space-y-8 min-h-screen transition-colors duration-200 ${isDark ? "dark bg-[#0B0F17] text-slate-100" : "bg-[#f8f9fc] text-slate-900"} animate-in fade-in duration-500`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
              <ShieldCheck className="text-blue-600 dark:text-blue-400 w-9 h-9" />
              Tableau de bord du Super Admin
            </h1>
            <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-wider">
              Gouvernance
            </Badge>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-semibold mt-1 text-sm">
            Supervision opérationnelle, gestion des établissements et activation des extensions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="w-12 h-12 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
            title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
          >
            {isMounted && isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
          </button>

          <Link
            href="/platform-admin"
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-2xl h-12 px-5 transition-all shadow-md"
          >
            <Layers size={16} />
            Tour de Contrôle SaaS
          </Link>

          <Button 
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 text-white font-black text-xs uppercase tracking-wider rounded-2xl h-12 px-6 gap-2 cursor-pointer transition-all"
          >
            <Plus size={16} />
            Ajouter une école
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 bg-slate-200/60 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
        <button
          onClick={() => setActiveTab("schools")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "schools"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Building2 size={15} />
          Établissements ({schools.length})
        </button>
        <button
          onClick={() => setActiveTab("addons")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "addons"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Puzzle size={15} />
          Extensions & Add-ons (إضافات)
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total des écoles", value: schools.length, icon: Building2, color: "blue", bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
          { label: "Total des élèves", value: stats.totalStudents, icon: Users, color: "indigo", bg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
          { label: "Écoles actives", value: schools.filter(s => s.status === "active").length, icon: Globe, color: "emerald", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
          { label: "Revenu mensuel estimé", value: `${calculateRevenue().toLocaleString("fr-FR")} F CFA`, icon: BarChart3, color: "amber", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
        ].map((stat, i) => (
          <Card key={i} className="border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden group hover:shadow-md transition-all rounded-[2rem] bg-white dark:bg-[#111827]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider">{stat.label}</p>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</h3>
                </div>
                <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner`}>
                  <stat.icon size={22} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* TAB 1: SCHOOLS MANAGEMENT */}
      {activeTab === "schools" && (
        <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-[2.5rem] bg-white dark:bg-[#111827] overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <CardTitle className="text-xl font-black flex items-center gap-2 text-slate-900 dark:text-white">
                <Building2 className="text-slate-400" size={22} />
                Liste des établissements abonnés
              </CardTitle>

              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row gap-4 items-center w-full lg:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text"
                    placeholder="Rechercher par nom..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-xl pl-10 pr-4 font-semibold text-sm text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner"
                  />
                </div>

                {/* Plan Filter */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Filter className="text-slate-400 shrink-0" size={16} />
                  <select 
                    value={planFilter}
                    onChange={(e) => setPlanFilter(e.target.value)}
                    className="h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-semibold text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="all">Tous les forfaits</option>
                    <option value="basic">Forfait Basique</option>
                    <option value="pro">Forfait Professionnel</option>
                    <option value="enterprise">Forfait Entreprise</option>
                  </select>
                </div>

                {/* Status Filter */}
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-semibold text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-auto"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actif</option>
                  <option value="suspended">Suspendu</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredSchools.length === 0 ? (
              <div className="p-16 text-center">
                <Building2 className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-semibold text-lg">Aucun établissement ne correspond à votre recherche.</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Essayez de modifier vos filtres ou d'ajouter une nouvelle école.</p>
              </div>
            ) : (
              <Table dir="ltr">
                <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <TableRow>
                    <TableHead className="text-left font-black py-5 pl-8 text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nom de l’école</TableHead>
                    <TableHead className="text-left font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest">Domaine de Connexion</TableHead>
                    <TableHead className="text-left font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest">Forfait</TableHead>
                    <TableHead className="text-left font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest">Statut</TableHead>
                    <TableHead className="text-left font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date de création</TableHead>
                    <TableHead className="text-center font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest pr-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchools.map((school) => (
                    <TableRow key={school.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100/60 dark:border-slate-800">
                      <TableCell className="font-bold text-slate-900 dark:text-white py-5 pl-8">{school.name}</TableCell>
                      <TableCell className="font-mono text-sm text-blue-600 dark:text-blue-400">
                        {school.slug}.edut.pro
                      </TableCell>
                      <TableCell>
                        <Badge className={`px-2.5 py-1 rounded-lg border-none text-[10px] font-black uppercase tracking-wider
                          ${school.plan === "pro" ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : school.plan === "enterprise" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"}`}
                        >
                          {school.plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`px-2.5 py-1 rounded-lg border-none text-[10px] font-black uppercase tracking-wider
                          ${school.status === "active" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}
                        >
                          {school.status === "active" ? "Actif" : "Suspendu"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500 dark:text-slate-400 text-sm font-semibold">
                        {school.createdAt ? new Date(school.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              toast.loading("Connexion à l'espace établissement...");
                              const res = await impersonateSchool(Number(school.id));
                              if (res.success) {
                                window.location.href = "/dashboard";
                              } else {
                                toast.error("Erreur d'accès à l'établissement.");
                              }
                            }}
                            className="h-9 px-3 rounded-xl text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-bold text-xs gap-1.5 transition-colors cursor-pointer"
                            title="Se connecter en tant qu'administrateur de cet établissement"
                          >
                            <Eye size={15} />
                            Accéder
                          </Button>
                          <Button 
                            onClick={() => openEditModal(school)}
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
                          >
                            <Settings2 size={18} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: EXTENSIONS & ADD-ONS (إضافات) */}
      {activeTab === "addons" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/40 border border-indigo-500/20 rounded-3xl p-6 sm:p-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Puzzle className="text-indigo-400 w-6 h-6" />
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Gestion des Extensions & Add-ons (إضافات المنصة)
                </h2>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
                Contrôlez la disponibilité des fonctionnalités avancées pour l'ensemble des établissements ou activez des quotas personnalisés.
              </p>
            </div>
            <Button
              onClick={() => toast.success("Modules synchronisés avec le moteur de licences centralisé.")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl h-12 px-6 shrink-0 shadow-lg shadow-indigo-600/30"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Synchroniser
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {addons.map((addon) => {
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
                        Disponible
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
                      <span className="text-slate-400 font-semibold">Forfait:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{addon.includedIn}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-semibold">Établissements:</span>
                      <span className="font-black text-indigo-600 dark:text-indigo-400">{addon.activeCount} actifs</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActiveTab("schools");
                        toast.info(`Sélectionnez un établissement pour gérer l'accès à ce module.`);
                      }}
                      className="w-full h-9 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Assigner à une École
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CREATE SCHOOL MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111827] rounded-[2.5rem] shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-slate-100 dark:border-slate-800 transform transition-all scale-100">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black tracking-tight">Ajouter un établissement</h3>
                <p className="text-blue-100 text-xs font-semibold mt-1">Créez manuellement un nouvel espace d'école sur la plateforme.</p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSchool} className="p-8 space-y-6">
              {createError && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 rounded-2xl flex items-start gap-3 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  <AlertCircle className="shrink-0 mt-0.5" size={16} />
                  <span>{createError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Nom de l'établissement</label>
                  <input 
                    type="text" 
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Ex: École Privée Les Champions"
                    className="w-full h-13 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-bold text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Sous-domaine (slug)</label>
                  <div className="flex items-center gap-1">
                    <input 
                      type="text" 
                      value={createSlug}
                      onChange={(e) => setCreateSlug(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
                      placeholder="champions"
                      className="w-full h-13 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-bold text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 text-right pr-2"
                      required
                    />
                    <span className="text-slate-500 font-bold text-sm bg-slate-100 dark:bg-slate-700 px-4 h-13 rounded-xl flex items-center shrink-0">
                      .edut.pro
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 pl-1 font-semibold">Caractères alphanumériques et tirets uniquement.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Forfait initial</label>
                    <select 
                      value={createPlan}
                      onChange={(e) => setCreatePlan(e.target.value)}
                      className="w-full h-13 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-bold text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="basic">Basique</option>
                      <option value="pro">Professionnel</option>
                      <option value="enterprise">Entreprise</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Statut</label>
                    <select 
                      value={createStatus}
                      onChange={(e) => setCreateStatus(e.target.value)}
                      className="w-full h-13 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-bold text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="active">Actif</option>
                      <option value="suspended">Suspendu</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 h-13 rounded-2xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={isCreating}
                  className="flex-1 h-13 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  {isCreating ? "Création en cours..." : "Créer l'école"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SCHOOL MODAL */}
      {isEditOpen && selectedSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111827] rounded-[2.5rem] shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-slate-100 dark:border-slate-800 transform transition-all scale-100">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black tracking-tight">Paramètres de l'école</h3>
                <p className="text-slate-400 text-xs font-semibold mt-1">Modifier le forfait ou l'accès pour {selectedSchool.name}</p>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSchool} className="p-8 space-y-6">
              {editError && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 rounded-2xl flex items-start gap-3 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  <AlertCircle className="shrink-0 mt-0.5" size={16} />
                  <span>{editError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Forfait d'abonnement</label>
                  <select 
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value)}
                    className="w-full h-13 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-bold text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="basic">Forfait Basique (150 Élèves)</option>
                    <option value="pro">Forfait Professionnel (500 Élèves - LMD/AI)</option>
                    <option value="enterprise">Forfait Entreprise & Univ (10 000 Élèves)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Statut d'accès</label>
                  <select 
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full h-13 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-bold text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="active">Actif (Accès autorisé)</option>
                    <option value="suspended">Suspendu (Accès bloqué)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsEditOpen(false)}
                  className="flex-1 h-13 rounded-2xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={isEditing}
                  className="flex-1 h-13 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  {isEditing ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
