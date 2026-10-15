"use client";

import React, { useState } from "react";
import {
  UtensilsCrossed,
  Calendar,
  Wallet,
  Users,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldAlert,
  CreditCard,
  QrCode,
  Printer,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  X,
  Phone,
  MessageSquare,
  Lock,
  Unlock,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  saveWeeklyMenuItemAction,
  deleteWeeklyMenuItemAction,
  saveMealSubscriptionAction,
  cancelMealSubscriptionAction,
  topUpStudentWalletAction,
  updateWalletSpendingLimitAction,
  recordMealConsumptionAction,
} from "@/domains/canteen/actions/canteen.actions";
import { searchStudentsAction } from "@/domains/transport/actions/transport.actions";

interface CanteenClientProps {
  initialStats: {
    activeSubscriptions: number;
    mealsServedToday: number;
    totalWalletBalance: number;
    lowBalanceCount: number;
    totalMenuItems: number;
  };
  initialMenu: any[];
  initialWeekStartDate: string;
  initialSubscriptions: any[];
  initialWallets: any[];
  initialLogs: any[];
  initialItems: any[];
}

const DAYS_OF_WEEK = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const COMMON_ALLERGENS = [
  "Arachides",
  "Lactose / Lait",
  "Gluten / Blé",
  "Poisson",
  "Crustacés",
  "Oeufs",
  "Soja",
  "Sésame",
];

export default function CanteenClient({
  initialStats,
  initialMenu,
  initialWeekStartDate,
  initialSubscriptions,
  initialWallets,
  initialLogs,
  initialItems,
}: CanteenClientProps) {
  const [activeTab, setActiveTab] = useState<"menu" | "subscriptions" | "wallets" | "service">("menu");

  // State
  const [stats, setStats] = useState(initialStats);
  const [menu, setMenu] = useState(initialMenu);
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [wallets, setWallets] = useState(initialWallets);
  const [logs, setLogs] = useState(initialLogs);

  // Selected Day Filter for Menu
  const [selectedDay, setSelectedDay] = useState<string>("Lundi");

  // Search & Filters
  const [searchSubQuery, setSearchSubQuery] = useState("");
  const [searchWalletQuery, setSearchWalletQuery] = useState("");
  const [selectedPlanFilter, setSelectedPlanFilter] = useState("ALL");

  // Modals
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState<any>(null);

  // Form State: Menu
  const [menuForm, setMenuForm] = useState<{
    id?: number;
    weekStartDate: string;
    dayOfWeek: string;
    mealType: string;
    starterDish: string;
    mainDish: string;
    sideDish: string;
    dessert: string;
    allergens: string[];
    calories: number;
    isVegetarian: boolean;
    notes: string;
  }>({
    weekStartDate: initialWeekStartDate,
    dayOfWeek: "Lundi",
    mealType: "Déjeuner",
    starterDish: "",
    mainDish: "",
    sideDish: "",
    dessert: "",
    allergens: [],
    calories: 650,
    isVegetarian: false,
    notes: "",
  });

  // Form State: Subscription
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentSearchResults, setStudentSearchResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [subForm, setSubForm] = useState({
    planType: "Demi-pension (Déjeuner)",
    monthlyPrice: 25000,
    specialDiet: "Normal",
    allergiesNotice: "",
    parentPhone: "",
    parentWhatsapp: "",
  });

  // Form State: Top-Up Wallet
  const [topupTargetStudent, setTopupTargetStudent] = useState<any>(null);
  const [topupForm, setTopupForm] = useState({
    amount: 5000,
    paymentMethod: "Espèces",
    itemsDesc: "Recharge manuelle cantine",
  });

  // Form State: Live Service Pointage
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [serviceSearchResults, setServiceSearchResults] = useState<any[]>([]);
  const [serviceSelectedStudent, setServiceSelectedStudent] = useState<any>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Search Students Helper ───────────────────────────────────────────────
  const handleSearchStudents = async (q: string, target: "sub" | "service") => {
    if (target === "sub") {
      setStudentSearchQuery(q);
    } else {
      setServiceSearchQuery(q);
    }

    if (!q || q.trim().length < 2) {
      if (target === "sub") setStudentSearchResults([]);
      else setServiceSearchResults([]);
      return;
    }

    const res = await searchStudentsAction(q);
    const data = (res as any)?.data?.data || (res as any)?.data || [];
    if (target === "sub") setStudentSearchResults(data);
    else setServiceSearchResults(data);
  };

  // ─── Save Menu Item ───────────────────────────────────────────────────────
  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuForm.mainDish) {
      toast.error("Veuillez renseigner le plat principal.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res: any = await saveWeeklyMenuItemAction({
        id: menuForm.id,
        weekStartDate: menuForm.weekStartDate,
        dayOfWeek: menuForm.dayOfWeek,
        mealType: menuForm.mealType,
        starterDish: menuForm.starterDish,
        mainDish: menuForm.mainDish,
        sideDish: menuForm.sideDish,
        dessert: menuForm.dessert,
        allergens: menuForm.allergens.join(", "),
        calories: menuForm.calories,
        isVegetarian: menuForm.isVegetarian,
        notes: menuForm.notes,
      });

      const payload = res?.data || res;
      if (payload?.success) {
        toast.success(payload.message || "Menu enregistré !");
        setIsMenuModalOpen(false);
        window.location.reload();
      } else {
        toast.error(res?.error || payload?.error);
      }
    } catch (err) {
      toast.error("Erreur enregistrement menu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMenu = async (id: number) => {
    if (!confirm("Voulez-vous supprimer ce plat du menu ?")) return;
    try {
      const res: any = await deleteWeeklyMenuItemAction(id);
      const payload = res?.data || res;
      if (payload?.success) {
        toast.success("Plat supprimé.");
        setMenu(menu.filter((m) => m.id !== id));
      }
    } catch (err) {
      toast.error("Erreur suppression.");
    }
  };

  // ─── Save Subscription ───────────────────────────────────────────────────
  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error("Veuillez sélectionner un élève.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res: any = await saveMealSubscriptionAction({
        studentId: selectedStudent.id,
        planType: subForm.planType,
        monthlyPrice: Number(subForm.monthlyPrice),
        specialDiet: subForm.specialDiet,
        allergiesNotice: subForm.allergiesNotice,
        parentPhone: subForm.parentPhone || selectedStudent.mobile,
        parentWhatsapp: subForm.parentWhatsapp || selectedStudent.whatsapp,
      });

      const payload = res?.data || res;
      if (payload?.success) {
        toast.success(payload.message || "Élève abonné à la cantine avec succès !");
        setIsSubModalOpen(false);
        setSelectedStudent(null);
        window.location.reload();
      } else {
        toast.error(res?.error || payload?.error);
      }
    } catch (err) {
      toast.error("Erreur lors de l'abonnement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Top-Up Wallet ────────────────────────────────────────────────────────
  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupTargetStudent || !topupForm.amount) {
      toast.error("Veuillez spécifier le montant.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res: any = await topUpStudentWalletAction({
        studentId: topupTargetStudent.id,
        amount: Number(topupForm.amount),
        paymentMethod: topupForm.paymentMethod,
        itemsDesc: topupForm.itemsDesc,
      });

      const payload = res?.data || res;
      if (payload?.success) {
        toast.success(payload.message || "Recharge effectuée avec succès !");
        setIsTopupModalOpen(false);
        window.location.reload();
      } else {
        toast.error(res?.error || payload?.error);
      }
    } catch (err) {
      toast.error("Erreur lors de la recharge.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Record Cafeteria Meal Service ────────────────────────────────────────
  const handleServeMeal = async (student: any) => {
    // Find day's menu to check allergens
    const dayMenu = menu.find((m) => m.dayOfWeek === selectedDay) || menu[0];

    try {
      toast.loading("Vérification des allergies et validation du repas...");
      const res: any = await recordMealConsumptionAction({
        studentId: student.id,
        mealType: "Déjeuner",
        dishName: dayMenu?.mainDish || "Plat du jour",
        dishAllergens: dayMenu?.allergens || "",
        mealPrice: 1000,
      });
      toast.dismiss();

      const payload = res?.data || res;
      if (payload?.success) {
        if (payload.allergyWarningTriggered) {
          toast.warning(payload.message, { duration: 6000 });
        } else {
          toast.success(payload.message);
        }
        setServiceSelectedStudent(null);
        setServiceSearchQuery("");
        window.location.reload();
      } else {
        toast.error(res?.error || payload?.error || "Erreur lors du service.");
      }
    } catch (err) {
      toast.dismiss();
      toast.error("Erreur serveur.");
    }
  };

  // Filtered Subscriptions
  const filteredSubs = subscriptions.filter((s) => {
    const matchQuery =
      !searchSubQuery ||
      s.student?.nomEtudiant?.toLowerCase().includes(searchSubQuery.toLowerCase()) ||
      s.student?.numAdmission?.toLowerCase().includes(searchSubQuery.toLowerCase()) ||
      s.specialDiet?.toLowerCase().includes(searchSubQuery.toLowerCase());
    const matchPlan = selectedPlanFilter === "ALL" || s.planType === selectedPlanFilter;
    return matchQuery && matchPlan;
  });

  // Filtered Wallets
  const filteredWallets = wallets.filter((w) => {
    return (
      !searchWalletQuery ||
      w.student?.nomEtudiant?.toLowerCase().includes(searchWalletQuery.toLowerCase()) ||
      w.student?.numAdmission?.toLowerCase().includes(searchWalletQuery.toLowerCase())
    );
  });

  // Filtered Day Menu Items
  const dayMenuItems = menu.filter((m) => m.dayOfWeek === selectedDay);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ─── Header & Top Banner ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold backdrop-blur-md border border-emerald-400/20">
            <UtensilsCrossed className="w-3.5 h-3.5" />
            Module Restauration, Diététique & Caisse
          </div>
          <h1 className="text-3xl font-black tracking-tight">🍽️ Restaurant Scolaire & Nutrition</h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Menus hebdomadaires équilibrés, détection automatique des allergies, abonnements demi-pension, porte-monnaie électronique et caisse POS.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-3">
          <Link
            href="/dashboard/pos"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-md border border-white/10 transition"
          >
            <ShoppingBag className="w-4 h-4" />
            Caisse POS Rapide
          </Link>
          <button
            onClick={() => {
              setMenuForm({
                weekStartDate: initialWeekStartDate,
                dayOfWeek: selectedDay,
                mealType: "Déjeuner",
                starterDish: "",
                mainDish: "",
                sideDish: "",
                dessert: "",
                allergens: [],
                calories: 650,
                isVegetarian: false,
                notes: "",
              });
              setIsMenuModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-md border border-white/10 transition"
          >
            <Plus className="w-4 h-4" />
            Ajouter un Plat au Menu
          </button>
          <button
            onClick={() => setIsSubModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 transition transform active:scale-95"
          >
            <Users className="w-4 h-4" />
            Abonner un Élève
          </button>
        </div>
      </div>

      {/* ─── KPI Widgets ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{stats.activeSubscriptions}</div>
            <div className="text-xs text-slate-500 font-medium">Élèves Demi-Pension</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{stats.mealsServedToday}</div>
            <div className="text-xs text-slate-500 font-medium">Repas Servis Aujourd'hui</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {stats.totalWalletBalance.toLocaleString()} <span className="text-xs font-normal">CFA</span>
            </div>
            <div className="text-xs text-slate-500 font-medium">Soldes Comptes Actifs</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{stats.lowBalanceCount}</div>
            <div className="text-xs text-slate-500 font-medium">Soldes Faibles (&lt;2000 CFA)</div>
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("menu")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition ${
            activeTab === "menu"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Calendar className="w-4 h-4" />
          🥗 Menus & Nutrition ({menu.length})
        </button>

        <button
          onClick={() => setActiveTab("service")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition ${
            activeTab === "service"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          🍽️ Pointage Réfectoire & Allergies
        </button>

        <button
          onClick={() => setActiveTab("subscriptions")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition ${
            activeTab === "subscriptions"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Users className="w-4 h-4" />
          👥 Abonnés & Régimes ({subscriptions.length})
        </button>

        <button
          onClick={() => setActiveTab("wallets")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition ${
            activeTab === "wallets"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Wallet className="w-4 h-4" />
          💳 Comptes & Porte-Monnaie ({wallets.length})
        </button>
      </div>

      {/* ─── TAB 1: WEEKLY MENU & NUTRITION ───────────────────────────────── */}
      {activeTab === "menu" && (
        <div className="space-y-6">
          {/* Day-of-Week Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition shrink-0 ${
                  selectedDay === day
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/30"
                    : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Dishes for Selected Day */}
          {dayMenuItems.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <UtensilsCrossed className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700">Aucun menu programmé pour {selectedDay}</h4>
              <p className="text-slate-400 text-xs">
                Cliquez sur "Ajouter un Plat au Menu" pour composer les entrées, plats chauds et desserts.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dayMenuItems.map((item) => {
                const allergensList = item.allergens
                  ? item.allergens.split(/[,;]+/).map((a: string) => a.trim()).filter(Boolean)
                  : [];

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4 hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {item.mealType}
                          </span>
                          <h3 className="text-xl font-black text-slate-900 mt-2">{item.mainDish}</h3>
                        </div>
                        <div className="flex items-center gap-1 text-amber-600 font-bold text-xs bg-amber-50 px-2.5 py-1 rounded-xl">
                          <Flame className="w-3.5 h-3.5" />
                          {item.calories || 650} kcal
                        </div>
                      </div>

                      {/* Course Details */}
                      <div className="bg-slate-50 p-3.5 rounded-2xl space-y-2 text-xs">
                        {item.starterDish && (
                          <div className="text-slate-700">
                            <span className="font-bold text-slate-400 block text-[10px] uppercase">Entrée :</span>
                            <span className="font-semibold">{item.starterDish}</span>
                          </div>
                        )}
                        {item.sideDish && (
                          <div className="text-slate-700">
                            <span className="font-bold text-slate-400 block text-[10px] uppercase">
                              Accompagnement :
                            </span>
                            <span className="font-semibold">{item.sideDish}</span>
                          </div>
                        )}
                        {item.dessert && (
                          <div className="text-slate-700">
                            <span className="font-bold text-slate-400 block text-[10px] uppercase">Dessert :</span>
                            <span className="font-semibold">{item.dessert}</span>
                          </div>
                        )}
                      </div>

                      {/* Allergens Notice */}
                      {allergensList.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">
                            ⚠️ Allergènes déclarés :
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {allergensList.map((alg: string, i: number) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200"
                              >
                                {alg}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setMenuForm({
                            id: item.id,
                            weekStartDate: item.weekStartDate,
                            dayOfWeek: item.dayOfWeek,
                            mealType: item.mealType,
                            starterDish: item.starterDish || "",
                            mainDish: item.mainDish,
                            sideDish: item.sideDish || "",
                            dessert: item.dessert || "",
                            allergens: allergensList,
                            calories: item.calories || 650,
                            isVegetarian: item.isVegetarian || false,
                            notes: item.notes || "",
                          });
                          setIsMenuModalOpen(true);
                        }}
                        className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition text-center"
                      >
                        Modifier le Plat
                      </button>
                      <button
                        onClick={() => handleDeleteMenu(item.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: LIVE CAFETERIA ROLL CALL & ALLERGIES ──────────────────── */}
      {activeTab === "service" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-slate-900">Pointage du Réfectoire & Détection Allergies</h3>
            <p className="text-slate-400 text-xs">
              Scannez le code-barres ou recherchez l'élève par son nom ou matricule. Le système vérifie instantanément son dossier médical pour détecter toute allergie avec le menu du jour ({selectedDay}).
            </p>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tapez le nom de l'élève ou son matricule..."
                value={serviceSearchQuery}
                onChange={(e) => handleSearchStudents(e.target.value, "service")}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {serviceSearchResults.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xl divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {serviceSearchResults.map((st) => {
                  const sub = subscriptions.find((s) => s.studentId === st.id);
                  const wallet = wallets.find((w) => w.studentId === st.id);

                  return (
                    <div
                      key={st.id}
                      className="p-4 hover:bg-slate-50 transition flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{st.nomEtudiant}</div>
                        <div className="text-xs text-slate-400 font-mono">
                          {st.numAdmission} • {st.classe}
                        </div>
                        <div className="flex gap-2 mt-1">
                          {sub ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Abonné ({sub.planType})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Solde : {wallet?.balance || 0} CFA
                            </span>
                          )}
                          {sub?.specialDiet && sub.specialDiet !== "Normal" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Régime : {sub.specialDiet}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleServeMeal(st)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Servir le Repas
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Today's Consumption Logs */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h4 className="font-black text-slate-900 text-base">Historique des Repas Servis Aujourd'hui</h4>

            <div className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  Aucun repas encore validé aujourd'hui.
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                          log.allergyWarningTriggered
                            ? "bg-rose-100 text-rose-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {log.allergyWarningTriggered ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <UtensilsCrossed className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{log.student?.nomEtudiant}</div>
                        <div className="text-xs text-slate-400">
                          {log.menuDescription} • Servi par {log.servedBy}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-slate-700">
                        {new Date(log.servedAt).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      {log.allergyWarningTriggered && (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                          Alerte Allergie Parent Notifié
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: SUBSCRIPTIONS & SPECIAL DIETS ─────────────────────────── */}
      {activeTab === "subscriptions" && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par nom d'élève, matricule, régime..."
                value={searchSubQuery}
                onChange={(e) => setSearchSubQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <select
              value={selectedPlanFilter}
              onChange={(e) => setSelectedPlanFilter(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Toutes les Formules</option>
              <option value="Demi-pension (Déjeuner)">Demi-pension (Déjeuner)</option>
              <option value="Complet (Déjeuner + Goûter)">Complet (Déjeuner + Goûter)</option>
              <option value="Pension Complète (Internat)">Pension Complète (Internat)</option>
            </select>
          </div>

          {/* Subscriptions Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Élève</th>
                    <th className="py-3.5 px-4">Formule</th>
                    <th className="py-3.5 px-4">Régime & Allergies</th>
                    <th className="py-3.5 px-4">Tarif Mensuel</th>
                    <th className="py-3.5 px-4">Parent</th>
                    <th className="py-3.5 px-4 text-center">Carte QR</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredSubs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Aucun abonné à la cantine trouvé.
                      </td>
                    </tr>
                  ) : (
                    filteredSubs.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div>{sub.student?.nomEtudiant}</div>
                          <div className="text-xs font-mono text-slate-400">{sub.student?.numAdmission}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {sub.planType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{sub.specialDiet || "Normal"}</div>
                          {sub.allergiesNotice && (
                            <div className="text-xs text-rose-600 font-semibold">{sub.allergiesNotice}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {sub.monthlyPrice?.toLocaleString()} CFA
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono">{sub.parentPhone || "N/A"}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setSelectedPass(sub)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold text-xs transition"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            Pass Cantine
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={async () => {
                              if (confirm("Suspendre cet abonnement ?")) {
                                await cancelMealSubscriptionAction(sub.id);
                                window.location.reload();
                              }
                            }}
                            className="text-xs text-rose-600 font-bold hover:underline"
                          >
                            Suspendre
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: DIGITAL WALLETS & TOP-UP ──────────────────────────────── */}
      {activeTab === "wallets" && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par élève ou matricule..."
                value={searchWalletQuery}
                onChange={(e) => setSearchWalletQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWallets.map((w) => {
              const isLow = Number(w.balance) < 2000;

              return (
                <div
                  key={w.id}
                  className={`bg-white rounded-3xl border p-5 space-y-4 transition ${
                    isLow ? "border-amber-200 bg-amber-50/20" : "border-slate-100"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{w.student?.nomEtudiant}</h4>
                      <div className="text-xs text-slate-400 font-mono">
                        {w.student?.numAdmission} • {w.student?.classe}
                      </div>
                    </div>
                    {w.isLocked ? (
                      <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600" title="Compte verrouillé">
                        <Lock className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                        <Unlock className="w-4 h-4" />
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Solde Actuel</div>
                      <div className="text-2xl font-black text-slate-900 font-mono">
                        {Number(w.balance).toLocaleString()} <span className="text-sm font-normal">CFA</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setTopupTargetStudent(w.student);
                        setIsTopupModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
                    >
                      + Recharger
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>Plafond journalier : {w.dailySpendingLimit || 2000} CFA</span>
                    <span>Mis à jour : {new Date(w.updatedAt).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── MODAL: AJOUTER / MODIFIER PLAT MENU ─────────────────────────── */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">
                {menuForm.id ? "Modifier le Plat du Menu" : "Ajouter un Plat au Menu"}
              </h3>
              <button onClick={() => setIsMenuModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMenu} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Jour de la Semaine *</label>
                  <select
                    value={menuForm.dayOfWeek}
                    onChange={(e) => setMenuForm({ ...menuForm, dayOfWeek: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Type de Repas *</label>
                  <select
                    value={menuForm.mealType}
                    onChange={(e) => setMenuForm({ ...menuForm, mealType: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Déjeuner">Déjeuner</option>
                    <option value="Goûter / Pause">Goûter / Pause</option>
                    <option value="Dîner Internat">Dîner Internat</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Plat Principal *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Riz gras au poisson rouge & légumes"
                  value={menuForm.mainDish}
                  onChange={(e) => setMenuForm({ ...menuForm, mainDish: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Entrée</label>
                  <input
                    type="text"
                    placeholder="Ex: Salade composée"
                    value={menuForm.starterDish}
                    onChange={(e) => setMenuForm({ ...menuForm, starterDish: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Accompagnement</label>
                  <input
                    type="text"
                    placeholder="Ex: Alloco & haricots"
                    value={menuForm.sideDish}
                    onChange={(e) => setMenuForm({ ...menuForm, sideDish: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Dessert</label>
                  <input
                    type="text"
                    placeholder="Ex: Yaourt ou Fruit"
                    value={menuForm.dessert}
                    onChange={(e) => setMenuForm({ ...menuForm, dessert: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              {/* Allergens Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 block">Allergènes Présents</label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_ALLERGENS.map((alg) => {
                    const isSelected = menuForm.allergens.includes(alg);
                    return (
                      <button
                        type="button"
                        key={alg}
                        onClick={() => {
                          if (isSelected) {
                            setMenuForm({
                              ...menuForm,
                              allergens: menuForm.allergens.filter((a) => a !== alg),
                            });
                          } else {
                            setMenuForm({ ...menuForm, allergens: [...menuForm.allergens, alg] });
                          }
                        }}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                          isSelected
                            ? "bg-rose-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "}
                        {alg}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMenuModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition"
                >
                  {isSubmitting ? "Enregistrement..." : "Enregistrer le Plat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: NOUVEL ABONNEMENT CANTINE ────────────────────────────── */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Abonner un Élève à la Cantine</h3>
              <button onClick={() => setIsSubModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubscription} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Rechercher l'Élève *</label>
                <input
                  type="text"
                  placeholder="Nom ou matricule..."
                  value={studentSearchQuery}
                  onChange={(e) => handleSearchStudents(e.target.value, "sub")}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                />

                {studentSearchResults.length > 0 && !selectedStudent && (
                  <div className="mt-2 bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 max-h-40 overflow-y-auto">
                    {studentSearchResults.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => {
                          setSelectedStudent(st);
                          setSubForm({
                            ...subForm,
                            parentPhone: st.mobile || "",
                            parentWhatsapp: st.whatsapp || st.mobile || "",
                          });
                        }}
                        className="p-2.5 hover:bg-emerald-50 cursor-pointer text-xs flex items-center justify-between"
                      >
                        <span className="font-bold text-slate-900">{st.nomEtudiant}</span>
                        <span className="text-slate-400 font-mono">
                          {st.numAdmission} ({st.classe})
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedStudent && (
                  <div className="mt-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-emerald-900">{selectedStudent.nomEtudiant}</div>
                      <div className="text-emerald-700">
                        {selectedStudent.classe} | {selectedStudent.numAdmission}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(null)}
                      className="text-emerald-600 hover:text-emerald-800 font-bold"
                    >
                      Changer
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Formule d'Abonnement *</label>
                  <select
                    value={subForm.planType}
                    onChange={(e) => setSubForm({ ...subForm, planType: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Demi-pension (Déjeuner)">Demi-pension (Déjeuner)</option>
                    <option value="Complet (Déjeuner + Goûter)">Complet (Déjeuner + Goûter)</option>
                    <option value="Pension Complète (Internat)">Pension Complète (Internat)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Tarif Mensuel (CFA)</label>
                  <input
                    type="number"
                    value={subForm.monthlyPrice}
                    onChange={(e) => setSubForm({ ...subForm, monthlyPrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Régime Spécial</label>
                  <select
                    value={subForm.specialDiet}
                    onChange={(e) => setSubForm({ ...subForm, specialDiet: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Sans arachides">Sans arachides</option>
                    <option value="Sans lactose">Sans lactose</option>
                    <option value="Végétarien">Végétarien</option>
                    <option value="Sans gluten">Sans gluten</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Téléphone Parent</label>
                  <input
                    type="text"
                    value={subForm.parentPhone}
                    onChange={(e) => setSubForm({ ...subForm, parentPhone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">
                  Allergies et Restrictions Spécifiques
                </label>
                <input
                  type="text"
                  placeholder="Ex: Fortement allergique aux poissons de mer"
                  value={subForm.allergiesNotice}
                  onChange={(e) => setSubForm({ ...subForm, allergiesNotice: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition"
                >
                  {isSubmitting ? "Abonnement..." : "Valider l'Abonnement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: RECHARGER LE SOLDE ───────────────────────────────────── */}
      {isTopupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Recharger le Compte Cantine</h3>
              <button onClick={() => setIsTopupModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTopupSubmit} className="space-y-4">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs">
                <span className="text-emerald-700 font-medium">Bénéficiaire :</span>
                <div className="font-bold text-emerald-950 text-sm">{topupTargetStudent?.nomEtudiant}</div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Montant de la Recharge (CFA) *</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {[2000, 5000, 10000].map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setTopupForm({ ...topupForm, amount: amt })}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        topupForm.amount === amt
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {amt.toLocaleString()} F
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  required
                  value={topupForm.amount}
                  onChange={(e) => setTopupForm({ ...topupForm, amount: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono text-emerald-700"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Mode de Paiement</label>
                <select
                  value={topupForm.paymentMethod}
                  onChange={(e) => setTopupForm({ ...topupForm, paymentMethod: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                >
                  <option value="Espèces">Espèces (Guichet)</option>
                  <option value="Flooz">Moov Flooz</option>
                  <option value="Airtel Money">Airtel Money</option>
                  <option value="Virement">Virement Bancaire</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTopupModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition"
                >
                  {isSubmitting ? "Recharge..." : "Confirmer la Recharge"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CARTE CANTINE & QR PASS ──────────────────────────────── */}
      {selectedPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-6 shadow-2xl text-center">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                Pass Restaurant Scolaire
              </span>
              <button onClick={() => setSelectedPass(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gradient-to-br from-emerald-900 to-teal-900 text-white p-6 rounded-2xl space-y-4 shadow-xl text-left relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] uppercase font-bold text-emerald-300">Edut Pro • Restaurant Scolaire</div>
                  <div className="text-base font-black">{selectedPass.student?.nomEtudiant}</div>
                  <div className="text-xs font-mono text-slate-300">{selectedPass.student?.numAdmission}</div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-white/20 text-white font-bold text-[10px]">
                  {selectedPass.student?.classe}
                </span>
              </div>

              <div className="bg-white/10 p-3 rounded-xl backdrop-blur-md space-y-1 text-xs">
                <div>
                  <span className="text-slate-300">Formule : </span>
                  <span className="font-bold">{selectedPass.planType}</span>
                </div>
                <div>
                  <span className="text-slate-300">Régime : </span>
                  <span className="font-semibold text-amber-300">{selectedPass.specialDiet || "Normal"}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-center">
                <div className="bg-white p-3 rounded-xl text-slate-900 flex flex-col items-center">
                  <QrCode className="w-24 h-24 text-slate-900" />
                  <span className="text-[9px] font-mono text-slate-500 mt-1">
                    CANTINE-PASS-{selectedPass.studentId}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition"
            >
              <Printer className="w-4 h-4" />
              Imprimer le Pass
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
