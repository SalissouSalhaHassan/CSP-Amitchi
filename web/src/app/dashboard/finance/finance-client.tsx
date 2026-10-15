"use client";

import * as React from "react";
import { useRef, useState, useCallback } from "react";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Filter, 
  History, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Smartphone,
  CreditCard,
  Building,
  HelpCircle,
  Banknote,
  LayoutDashboard,
  CreditCard as CardIcon,
  BarChart3,
  AlertTriangle,
  Printer,
  Wrench,
  RefreshCw,
  Award,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import PaymentDialog from "@/domains/finance/components/PaymentDialog";
import ReceiptPreviewDialog from "@/domains/finance/components/ReceiptPreviewDialog";
import FinanceDashboard from "@/domains/finance/components/FinanceDashboard";
import FinanceReports from "@/domains/finance/components/FinanceReports";
import UnpaidAlerts from "@/domains/finance/components/UnpaidAlerts";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter, useSearchParams } from "next/navigation";
import { deleteStudentFee, repairStudentFeeTotals } from "@/domains/finance/actions/finance.actions";
import { toast } from "sonner";
import { localDb } from "@/infrastructure/local-db/dexie";

// --- Types ---
interface FinanceClientProps {
  fees: any[];
  stats: any;
  classes: any[];
  advancedStats: any | null;
  headerConfig?: any | null;
  canEdit?: boolean;
  canDelete?: boolean;
  activeSessionName?: string;
  schoolName?: string;
  currentUser?: any;
  currentSchoolId?: number | null;
}

type TabId = "dashboard" | "payments" | "reports" | "unified-balance" | "alerts";
import { UnifiedFinancialReportView } from "@/domains/finance/components/UnifiedFinancialReportView";
import { Scale } from "lucide-react";


const getModeIcon = (mode: string) => {
  switch (mode) {
    case "Espèces": return <Banknote size={14} />;
    case "Mobile Money": return <Smartphone size={14} />;
    case "Virement": return <Building size={14} />;
    case "Carte Bancaire": return <CreditCard size={14} />;
    default: return <HelpCircle size={14} />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Soldé":
    case "Payé":
      return (
        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 rounded-full border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider">Payé</span>
        </div>
      );
    case "Partiel":
      return (
        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 rounded-full border border-amber-100 dark:border-amber-900/50 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-xs font-black uppercase tracking-wider">Partiel</span>
        </div>
      );
    case "En retard":
    case "Impayé":
      return (
        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 rounded-full border border-rose-100 dark:border-rose-900/50 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-rose-500" />
          <span className="text-xs font-black uppercase tracking-wider">En Retard</span>
        </div>
      );
    default:
      return null;
  }
};

export default function FinanceClient({
  fees,
  stats,
  classes,
  advancedStats,
  headerConfig,
  canEdit = true,
  canDelete = true,
  activeSessionName,
  schoolName,
  currentUser,
  currentSchoolId,
}: FinanceClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = React.useState<TabId>("dashboard");
  const [search, setSearch] = React.useState(searchParams.get("search") || "");
  const [selectedClass, setSelectedClass] = React.useState(searchParams.get("class") || "Toutes");
  const [selectedStatus, setSelectedStatus] = React.useState(searchParams.get("status") || "Tous");
  const [isMounted, setIsMounted] = React.useState(false);
  const [previewFee, setPreviewFee] = React.useState<any>(null);

  const [selectedPeriod, setSelectedPeriod] = React.useState<string>("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const [localFees, setLocalFees] = React.useState<any[]>(fees);
  const [isLocal, setIsLocal] = React.useState(false);
  const [isRepairing, setIsRepairing] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    setLocalFees(fees);
  }, [fees]);

  const cleanString = (val?: string | null) => {
    if (!val) return "";
    return String(val)
      .replace(/\u00a0/g, " ")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const normalizeClass = (val?: string | null) => {
    if (!val) return "";
    return String(val)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents/diacritics: è, é, ê, È -> e, E
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") // Remove spaces, hyphens, punctuation
      .trim();
  };

  // Available classes computed dynamically from schoolClasses + actual student classes
  const availableClasses = React.useMemo(() => {
    const map = new Map<string, string>();
    (classes || []).forEach(c => {
      const name = c?.className?.trim();
      if (name) {
        const norm = normalizeClass(name);
        if (norm && !map.has(norm)) map.set(norm, name);
      }
    });
    (localFees || []).forEach(f => {
      const name = f?.student?.classe?.trim();
      if (name) {
        const norm = normalizeClass(name);
        if (norm && !map.has(norm)) map.set(norm, name);
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.localeCompare(b, "fr", { sensitivity: "base", numeric: true })
    );
  }, [classes, localFees]);

  // High-speed client-side instant filtering logic (runs 100% in-memory and silently)
  const filteredFees = React.useMemo(() => {
    const searchLower = cleanString(search).toLowerCase();
    const normSelectedClass = normalizeClass(selectedClass);

    return localFees.filter((fee) => {
      const studentName = cleanString(fee.student?.nomEtudiant).toLowerCase();
      const numAdmission = cleanString(fee.student?.numAdmission).toLowerCase();
      const studentClassClean = cleanString(fee.student?.classe);
      const studentClassNorm = normalizeClass(studentClassClean);
      const statusLower = cleanString(fee.status).toLowerCase();
      const paymentModeLower = cleanString(fee.payments?.[0]?.paymentMode).toLowerCase();

      // 1. Search filter (student name, admission number, class, status)
      const matchesSearch =
        !searchLower ||
        studentName.includes(searchLower) ||
        numAdmission.includes(searchLower) ||
        studentClassClean.toLowerCase().includes(searchLower) ||
        statusLower.includes(searchLower) ||
        paymentModeLower.includes(searchLower);

      // 2. Class filter - Completely silent and resilient to accents, case, and spacing
      let matchesClass = true;
      if (selectedClass && selectedClass !== "Toutes") {
        if (!studentClassNorm) {
          matchesClass = false;
        } else {
          matchesClass =
            studentClassNorm === normSelectedClass ||
            studentClassNorm.includes(normSelectedClass) ||
            studentClassClean.toLowerCase() === cleanString(selectedClass).toLowerCase();
        }
      }

      // 3. Status filter
      const matchesStatus =
        selectedStatus === "Tous" ||
        (selectedStatus === "Soldé" && (fee.status === "Soldé" || fee.status === "Payé")) ||
        (selectedStatus === "Partiel" && fee.status === "Partiel") ||
        (selectedStatus === "Impayé" && (fee.status === "Impayé" || fee.status === "En retard"));

      // 4. Period filter (filters by the date of the last payment)
      let matchesPeriod = true;
      if (selectedPeriod !== "all") {
        const lastPaymentDateStr = fee.payments?.[0]?.datePaid;
        if (!lastPaymentDateStr) {
          matchesPeriod = false;
        } else {
          const lastPaymentDate = new Date(lastPaymentDateStr);
          const now = new Date();
          if (selectedPeriod === "today") {
            matchesPeriod = lastPaymentDate.toDateString() === now.toDateString();
          } else if (selectedPeriod === "week") {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(now.getDate() - 7);
            matchesPeriod = lastPaymentDate >= oneWeekAgo;
          } else if (selectedPeriod === "month") {
            matchesPeriod =
              lastPaymentDate.getMonth() === now.getMonth() &&
              lastPaymentDate.getFullYear() === now.getFullYear();
          } else if (selectedPeriod === "year") {
            matchesPeriod = lastPaymentDate.getFullYear() === now.getFullYear();
          }
        }
      }

      return matchesSearch && matchesClass && matchesStatus && matchesPeriod;
    });
  }, [localFees, search, selectedClass, selectedStatus, selectedPeriod]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedClass, selectedStatus, selectedPeriod]);

  const paginatedFees = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredFees.slice(startIndex, startIndex + pageSize);
  }, [filteredFees, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredFees.length / pageSize) || 1;

  const handleRepair = async () => {
    if (!confirm("Réparer les totaux financiers ? Cette opération recalcule les montants payés depuis les transactions réelles.")) return;
    setIsRepairing(true);
    try {
      const res = await repairStudentFeeTotals();
      if ((res as any)?.success) {
        const repaired = (res as any).repaired ?? 0;
        const dups = (res as any).duplicatesRemoved ?? 0;
        const msg = dups > 0
          ? `✅ ${dups} doublon(s) supprimé(s) + ${repaired} dossier(s) recalculé(s). Rechargement...`
          : `✅ Réparation terminée — ${repaired} dossier(s) recalculé(s). Rechargement...`;
        toast.success(msg);
        setTimeout(() => window.location.reload(), 1200);

      } else {
        toast.error((res as any)?.error || "Erreur lors de la réparation.");
      }
    } catch (e) {
      toast.error("Erreur inattendue lors de la réparation.");
    } finally {
      setIsRepairing(false);
    }
  };

  // ── Column Resize ──────────────────────────────────────────────
  const COL_KEYS = ["check", "student", "attendu", "paye", "solde", "statut", "date", "mode", "actions"] as const;
  type ColKey = typeof COL_KEYS[number];
  const DEFAULT_WIDTHS: Record<ColKey, number> = {
    check: 50, student: 340, attendu: 140, paye: 130, solde: 130,
    statut: 140, date: 140, mode: 160, actions: 150,
  };
  const [colWidths, setColWidths] = React.useState<Record<ColKey, number>>(DEFAULT_WIDTHS);
  const resizing = useRef<{ col: ColKey; startX: number; startW: number } | null>(null);

  const onResizeStart = useCallback((col: ColKey, e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = { col, startX: e.clientX, startW: colWidths[col] };

    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const delta = ev.clientX - resizing.current.startX;
      const newW = Math.max(60, resizing.current.startW + delta);
      setColWidths(prev => ({ ...prev, [resizing.current!.col]: newW }));
    };
    const onUp = () => {
      resizing.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [colWidths]);

  // ── Resize Handle component ─────────────────────────────────────
  const ResizeHandle = ({ col }: { col: ColKey }) => (
    <span
      onMouseDown={(e) => onResizeStart(col, e)}
      className="absolute right-0 top-0 h-full w-2 cursor-col-resize flex items-center justify-center group/rz select-none z-10"
      title="Faire glisser pour redimensionner"
    >
      <span className="w-px h-4 bg-slate-200 group-hover/rz:bg-indigo-400 group-hover/rz:w-0.5 transition-all rounded-full" />
    </span>
  );
  // ─────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    async function loadData() {
      // 1. If online, update Dexie cache with fresh server fees if available
      if (typeof navigator !== "undefined" && navigator.onLine && fees && fees.length > 0) {
        try {
          const { cacheStudentFees } = await import("@/infrastructure/local-db/cache");
          await cacheStudentFees(fees);
        } catch (e) {
          console.warn("Failed to update studentFees local cache:", e);
        }
      }

      let baseFees = fees || [];
      let isUsingLocal = false;

      // 2. Fall back to local Dexie cache if the browser is TRULY offline OR if server returned empty/0 fees
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      const isFeesEmptyOrZero = !fees || fees.length === 0 || fees.every((f: any) => (f.totalPaid || 0) === 0);

      if (isOffline || isFeesEmptyOrZero) {
        try {
          const { getCachedStudentFees } = await import("@/infrastructure/local-db/cache");
          const cached = await getCachedStudentFees();
          if (cached && cached.length > 0) {
            const hasPaymentsInCache = cached.some((f: any) => (f.totalPaid || 0) > 0);
            if (isOffline || hasPaymentsInCache) {
              baseFees = cached;
              isUsingLocal = true;
            }
          }
        } catch (e) {
          console.warn("Failed to read cached studentFees:", e);
        }
      }

      try {
        const outboxItems = await localDb.outbox
          .where("targetTable")
          .equals("feePayments")
          .toArray();

        const unsyncedPayments = outboxItems.filter(
          (item) => item.status !== "synced" && item.status !== "cancelled"
        );

        if (unsyncedPayments.length > 0 && baseFees?.length > 0) {
          const updatedFees = baseFees.map((fee: any) => {
            const studentOfflinePayments = unsyncedPayments
              .filter((item: any) => item.payload.feeId === fee.id)
              .map((item: any) => ({
                ...item.payload,
                isProvisoire: true,
                recordedBy: "Local Offline",
              }));

            if (studentOfflinePayments.length > 0) {
              const totalOfflinePaid = studentOfflinePayments.reduce((acc, p) => acc + p.amount, 0);
              const totalOfflineReduc = studentOfflinePayments.reduce((acc, p) => acc + (p.reduction || 0), 0);

              const mergedPayments = [...studentOfflinePayments, ...(fee.payments || [])];
              const updatedPaid = (fee.totalPaid || 0) + totalOfflinePaid;
              const updatedReduction = (fee.totalReduction || 0) + totalOfflineReduc;
              const updatedBalance = Math.max(0, fee.totalExpected - updatedPaid - updatedReduction);

              return {
                ...fee,
                payments: mergedPayments,
                totalPaid: updatedPaid,
                totalReduction: updatedReduction,
                balance: updatedBalance,
                status: updatedBalance <= 0 ? "Soldé" : "Partiel",
              };
            }
            return fee;
          });

          setLocalFees(updatedFees);
          setIsLocal(isUsingLocal || isOffline);
          return;
        }
      } catch (e) {
        console.warn("Failed to merge offline outbox payments:", e);
      }

      setLocalFees(baseFees || []);
      setIsLocal(isUsingLocal);
    }
    loadData();
  }, [fees]);

  // Completely silent URL filter sync - No page reload, no router.push, no server re-fetch, no progress bar
  const updateFiltersSilently = (newParams: Record<string, string>) => {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      Object.entries(newParams).forEach(([key, value]) => {
        if (value && value !== "Toutes" && value !== "Tous" && value !== "all") {
          url.searchParams.set(key, value);
        } else {
          url.searchParams.delete(key);
        }
      });
      const newPath = url.pathname + (url.search ? url.search : "");
      window.history.replaceState(null, "", newPath);
    } catch (e) {
      console.warn("Failed to update URL silently:", e);
    }
  };

  const updateFilters = updateFiltersSilently;

  const formatAmount = (val: number) => {
    if (typeof val !== "number" || isNaN(val)) return "0 CFA";
    return `${Math.round(val).toLocaleString("fr-FR")} CFA`;
  };

  const formatDate = (dateStr?: string | Date | null) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch {
      return "-";
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    updateFiltersSilently({ search, class: selectedClass, status: selectedStatus, period: selectedPeriod });
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedClass("Toutes");
    setSelectedStatus("Tous");
    setSelectedPeriod("all");
    setCurrentPage(1);
    updateFiltersSilently({ search: "", class: "", status: "", period: "" });
  };

  const hasActiveFilters = Boolean(
    search || 
    (selectedClass && selectedClass !== "Toutes") || 
    (selectedStatus && selectedStatus !== "Tous") || 
    (selectedPeriod && selectedPeriod !== "all")
  );

  const handleDelete = async (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette opération ? Cette action est irréversible.")) return;
    const res = await deleteStudentFee(id);
    if (res.success) toast.success("Opération supprimée avec succès.");
    else toast.error("Erreur lors de la suppression.");
  };

  const handlePaymentSuccess = (updatedFee: any) => {
    // 1. Instantly update in-memory localFees so the table updates without page reloads
    setLocalFees((prevFees) => {
      const idx = prevFees.findIndex((f) => f.id === updatedFee.id);
      const copy = idx === -1 ? [updatedFee, ...prevFees] : [...prevFees];
      if (idx !== -1) {
        copy[idx] = { ...copy[idx], ...updatedFee };
      }

      // 1.1 Asynchronously persist updated fees into Dexie cache
      import("@/infrastructure/local-db/cache").then(({ cacheStudentFees }) => {
        cacheStudentFees(copy).catch(() => {});
      }).catch(() => {});

      return copy;
    });

    // 2. Automatically open the official Receipt Preview / Print Dialog!
    setPreviewFee(updatedFee);
    toast.success("Paiement enregistré avec succès ! Reçu de paiement prêt pour l'impression.");
  };

  // Dynamic metrics when offline or when payments change locally
  const dynamicTotalExpected = React.useMemo(() => {
    return localFees.reduce((sum, f) => sum + (Number(f.totalExpected) || 0), 0);
  }, [localFees]);

  const dynamicTotalPaid = React.useMemo(() => {
    return localFees.reduce((sum, f) => sum + (Number(f.totalPaid) || 0), 0);
  }, [localFees]);

  const dynamicRecoveryRate = React.useMemo(() => {
    if (dynamicTotalExpected <= 0) return advancedStats?.recoveryRate || 0;
    return Math.round((dynamicTotalPaid / dynamicTotalExpected) * 100);
  }, [dynamicTotalExpected, dynamicTotalPaid, advancedStats?.recoveryRate]);

  const dynamicAlertCount = React.useMemo(() => {
    return localFees.filter((f) => f.status === "Impayé" || f.status === "En retard" || f.status === "Partiel").length;
  }, [localFees]);

  const alertCount = isLocal
    ? dynamicAlertCount
    : (advancedStats ? ((advancedStats.countUnpaid || 0) + (advancedStats.countPartial || 0)) : dynamicAlertCount);

  const recoveryRate = isLocal
    ? dynamicRecoveryRate
    : (advancedStats?.recoveryRate ?? dynamicRecoveryRate);

  const sideItems = [
    { label: "Tableau de bord", tab: "dashboard" as TabId, icon: LayoutDashboard },
    { label: "Paiements", tab: "payments" as TabId, icon: CardIcon },
    { label: "Bilan Recettes vs Dépenses (Unifié)", tab: "unified-balance" as TabId, icon: Scale },
    { label: "Rapports avancés", tab: "reports" as TabId, icon: BarChart3 },
    { label: "Alertes & Notifications", tab: "alerts" as TabId, icon: AlertTriangle, badge: alertCount },
  ];

  return (
    <div className="min-h-screen bg-[#f7f9fc] dark:bg-[#0B0D14] font-sans text-slate-950 dark:text-slate-100">


      <main className="min-w-0 space-y-0 p-0">
      {/* ── ÉCOLE EXCELLENCE — HORIZONTAL TOP BAR ── */}
      <div className="border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#131622]/95 shadow-[0_2px_20px_rgba(15,23,42,0.05)] backdrop-blur sticky top-0 z-30">
        {/* Row 1: Branding + Stats */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none">
              <Wallet size={18} />
            </div>
            <div className="leading-tight">
              <p className="text-[12px] font-black uppercase tracking-widest text-slate-900 dark:text-white">{schoolName || headerConfig?.schoolName || "Établissement"}</p>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400">Année {activeSessionName || "2025–2026"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest">
            <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-slate-600 dark:text-slate-300">Total élèves: {localFees.length || advancedStats?.totalStudents || 0}</span>
            <span className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 text-emerald-700 dark:text-emerald-300">Recouvrement: {recoveryRate}%</span>
            <span className="rounded-lg bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 text-rose-600 dark:text-rose-400">Alertes: {alertCount}</span>
            <div className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-white">
              <div className="h-1 w-16 overflow-hidden rounded-full bg-white/30">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${Math.min(100, recoveryRate)}%` }} />
              </div>
              <span>{recoveryRate}%</span>
            </div>
          </div>
        </div>
        {/* Row 2: Horizontal Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto px-6 py-2">
          {sideItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.tab;
            return (
              <button
                key={item.label}
                onClick={() => setActiveTab(item.tab)}
                className={cn(
                  "relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all",
                  active
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400"
                )}
              >
                <Icon size={14} />
                {item.label}
                {!!item.badge && item.badge > 0 && (
                  <span className={cn(
                    "ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-black",
                    active ? "bg-white text-indigo-600" : "bg-rose-500 text-white"
                  )}>
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-6 p-4 md:p-6 xl:p-8">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-5 rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-[#131622]/90 p-5 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
            <Wallet size={24} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Gestion Financière</h1>
              {isLocal && (
                <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-widest rounded-xl animate-pulse">
                  Données locales
                </span>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">Centre de Reporting Financier Intelligent</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/dashboard/finance/expenses">
            <Button className="h-12 px-5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-rose-500/20 cursor-pointer transition-all">
              <TrendingDown size={18} /> Gestion des Dépenses
            </Button>
          </Link>
          <Link href="/dashboard/finance/bourses-echeanciers">
            <Button className="h-12 px-5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all">
              <Award size={18} /> Bourses &amp; Échéanciers
            </Button>
          </Link>
          {canEdit && (
            <PaymentDialog
              feeData={localFees[0] || { id: 0, balance: 0, totalExpected: 0, totalPaid: 0, student: null }}
              allFees={localFees}
              headerConfig={headerConfig}
              onPaymentSuccess={handlePaymentSuccess}
              currentUser={currentUser}
              currentSchoolId={currentSchoolId}
              trigger={
                <Button className="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100 dark:shadow-none transition-all cursor-pointer">
                  <Plus size={18} /> Ajouter un paiement
                </Button>
              }
            />
          )}
          {canEdit && (
            <Button
              variant="ghost"
              onClick={handleRepair}
              disabled={isRepairing}
              title="Recalculer les montants payés depuis les transactions réelles"
              className="h-12 px-5 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all"
            >
              {isRepairing
                ? <><RefreshCw size={16} className="animate-spin" /> Réparation...</>
                : <><Wrench size={16} /> Réparer les totaux</>
              }
            </Button>
          )}
          {activeTab === "reports" && (
            <Button
              variant="ghost"
              onClick={() => document.querySelector<HTMLButtonElement>("[data-print-btn]")?.click()}
              className="h-12 px-6 rounded-2xl text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Printer size={18} /> Exporter PDF
            </Button>
          )}
        </div>

      </div>


      {/* ── TAB CONTENT ── */}

      
      {/* DASHBOARD TAB */}
      {activeTab === "dashboard" && (
        <FinanceDashboard
          stats={advancedStats || {
            totalExpected: stats?.totalExpected || 0,
            totalPaid: stats?.totalCollected || 0,
            totalDebts: stats?.totalDebts || 0,
            totalReductions: 0,
            currentBalance: stats?.totalCollected || 0,
            recoveryRate: stats?.totalExpected > 0 ? Math.round(((stats?.totalCollected || 0) / stats?.totalExpected) * 100) : 0,
            totalPaymentsCount: 0,
            countPaid: 0,
            countPartial: 0,
            countUnpaid: 0,
            totalStudents: localFees.length,
            revenueToday: 0,
            revenueWeek: 0,
            revenueMonth: 0,
            revenueYear: 0,
            monthlyData: [],
            classSummary: [],
            unpaidAlerts: [],
          }}
          isMounted={isMounted}
        />
      )}

      {/* PAYMENTS TAB */}
      {activeTab === "payments" && (
        <div className="bg-white dark:bg-[#131622]/90 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-8 space-y-6">
            <div className="flex flex-col lg:flex-row gap-6 items-end lg:items-center">
              <form onSubmit={handleSearch} className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500" size={18} />
                <Input 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un élève, une classe, un paiement..." 
                  className="pl-12 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 h-12 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" 
                />
              </form>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full lg:w-auto">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest ml-1">Classe</label>
                  <div className="relative">
                    <select 
                      value={selectedClass}
                      onChange={(e) => { 
                        const val = e.target.value;
                        setSelectedClass(val); 
                        setCurrentPage(1);
                        updateFiltersSilently({ class: val, status: selectedStatus, period: selectedPeriod, search }); 
                      }}
                      className="w-full md:min-w-[140px] h-11 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 text-[11px] font-bold text-slate-700 dark:text-slate-200 appearance-none outline-none cursor-pointer"
                    >
                      <option value="Toutes">Toutes les classes</option>
                      {availableClasses.map(cName => (
                        <option key={cName} value={cName}>{cName}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest ml-1">Statut</label>
                  <div className="relative">
                    <select 
                      value={selectedStatus}
                      onChange={(e) => { 
                        const val = e.target.value;
                        setSelectedStatus(val); 
                        setCurrentPage(1);
                        updateFiltersSilently({ status: val, class: selectedClass, period: selectedPeriod, search }); 
                      }}
                      className="w-full md:w-32 h-11 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 text-[11px] font-bold text-slate-700 dark:text-slate-200 appearance-none outline-none cursor-pointer"
                    >
                      <option value="Tous">Tous</option>
                      <option value="Soldé">Soldé</option>
                      <option value="Partiel">Partiel</option>
                      <option value="Impayé">Impayé</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest ml-1">Période</label>
                  <div className="relative">
                    <select 
                      value={selectedPeriod}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedPeriod(val);
                        setCurrentPage(1);
                        updateFiltersSilently({ period: val, class: selectedClass, status: selectedStatus, search });
                      }}
                      className="w-full md:w-36 h-11 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 text-[11px] font-bold text-slate-700 dark:text-slate-200 appearance-none outline-none cursor-pointer"
                    >
                      <option value="all">Toute période</option>
                      <option value="today">Aujourd'hui</option>
                      <option value="week">Cette semaine</option>
                      <option value="month">Ce mois-ci</option>
                      <option value="year">Cette année</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
                  </div>
                </div>

                <div className="flex items-end gap-2">
                  <Button 
                    type="button"
                    onClick={() => {
                      setCurrentPage(1);
                      updateFiltersSilently({ search, class: selectedClass, status: selectedStatus, period: selectedPeriod });
                    }}
                    className="flex-1 md:flex-initial h-11 px-5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all cursor-pointer"
                  >
                    <Filter size={14} /> Filtrer
                  </Button>
                  {hasActiveFilters && (
                    <Button 
                      type="button"
                      onClick={handleResetFilters}
                      title="Effacer les filtres"
                      className="h-11 px-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all cursor-pointer"
                    >
                      <RotateCcw size={13} />
                      <span className="hidden sm:inline">Effacer</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-slate-400 font-bold text-[11px]">Filtres actifs :</span>
                {selectedClass !== "Toutes" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black text-[10px]">
                    Classe: {selectedClass}
                    <button 
                      type="button" 
                      onClick={() => { setSelectedClass("Toutes"); updateFiltersSilently({ class: "Toutes", status: selectedStatus, period: selectedPeriod, search }); }} 
                      className="hover:text-indigo-900 dark:hover:text-indigo-100 cursor-pointer font-bold"
                    >
                      ×
                    </button>
                  </span>
                )}
                {selectedStatus !== "Tous" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black text-[10px]">
                    Statut: {selectedStatus}
                    <button 
                      type="button" 
                      onClick={() => { setSelectedStatus("Tous"); updateFiltersSilently({ status: "Tous", class: selectedClass, period: selectedPeriod, search }); }} 
                      className="hover:text-indigo-900 dark:hover:text-indigo-100 cursor-pointer font-bold"
                    >
                      ×
                    </button>
                  </span>
                )}
                {selectedPeriod !== "all" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black text-[10px]">
                    Période: {selectedPeriod}
                    <button 
                      type="button" 
                      onClick={() => { setSelectedPeriod("all"); updateFiltersSilently({ period: "all", class: selectedClass, status: selectedStatus, search }); }} 
                      className="hover:text-indigo-900 dark:hover:text-indigo-100 cursor-pointer font-bold"
                    >
                      ×
                    </button>
                  </span>
                )}
                {search && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black text-[10px]">
                    « {search} »
                    <button 
                      type="button" 
                      onClick={() => { setSearch(""); updateFiltersSilently({ search: "", class: selectedClass, status: selectedStatus, period: selectedPeriod }); }} 
                      className="hover:text-indigo-900 dark:hover:text-indigo-100 cursor-pointer font-bold"
                    >
                      ×
                    </button>
                  </span>
                )}
                <span className="text-[11px] font-bold text-slate-400 ml-auto">
                  {filteredFees.length} élève{filteredFees.length > 1 ? "s" : ""} trouvé{filteredFees.length > 1 ? "s" : ""} sur {localFees.length}
                </span>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse min-w-full">
              <colgroup>
                {COL_KEYS.map(k => <col key={k} style={{ width: colWidths[k], minWidth: colWidths[k] }} />)}
              </colgroup>
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800">
                  {/* Checkbox */}
                  <th className="relative px-4 py-5 text-left" style={{ width: colWidths.check }}>
                    <Checkbox className="rounded-md border-slate-200 dark:border-slate-700" />
                    <ResizeHandle col="check" />
                  </th>
                  <th className="relative px-4 py-5 text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-left" style={{ width: colWidths.student }}>
                    ÉLÈVE / CLASSE
                    <ResizeHandle col="student" />
                  </th>
                  <th className="relative px-4 py-5 text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-left" style={{ width: colWidths.attendu }}>
                    ATTENDU
                    <ResizeHandle col="attendu" />
                  </th>
                  <th className="relative px-4 py-5 text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-left" style={{ width: colWidths.paye }}>
                    PAYÉ
                    <ResizeHandle col="paye" />
                  </th>
                  <th className="relative px-4 py-5 text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-left" style={{ width: colWidths.solde }}>
                    SOLDE
                    <ResizeHandle col="solde" />
                  </th>
                  <th className="relative px-4 py-5 text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-left" style={{ width: colWidths.statut }}>
                    STATUT
                    <ResizeHandle col="statut" />
                  </th>
                  <th className="relative px-4 py-5 text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-left" style={{ width: colWidths.date }}>
                    DATE
                    <ResizeHandle col="date" />
                  </th>
                  <th className="relative px-4 py-5 text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-left" style={{ width: colWidths.mode }}>
                    MODE DE PAIEMENT
                    <ResizeHandle col="mode" />
                  </th>
                  <th className="relative px-4 py-5 text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-right" style={{ width: colWidths.actions }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {paginatedFees.length > 0 ? (
                  paginatedFees.map((fee) => {
                    const lastPayment = fee.payments?.[0];
                    const date = lastPayment?.datePaid ? new Date(lastPayment.datePaid).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "-";
                    const mode = lastPayment?.paymentMode || "Non spécifié";

                    return (
                      <tr key={fee.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-4.5">
                          <Checkbox className="rounded-md border-slate-200 dark:border-slate-700" />
                        </td>
                        <td className="px-4 py-4.5">
                          <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800 shrink-0">
                              {fee.student?.photoPath && !fee.student.photoPath.startsWith("file://") ? (
                                <img src={fee.student.photoPath} alt={fee.student.nomEtudiant} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center">
                                  <span className="text-sm font-black text-indigo-400 dark:text-indigo-400">{fee.student?.nomEtudiant?.[0]}</span>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-900 dark:text-white leading-tight truncate">{fee.student?.nomEtudiant}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-tight">{fee.student?.classe}</p>
                                {fee.scholarship && (
                                  <span 
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                                    title={`Bourse: ${fee.scholarship.scholarshipName || 'Bourse'} (${fee.scholarship.scholarshipProvider || 'Établissement'})`}
                                  >
                                    🎓 {fee.scholarship.customDiscountPercentage ? `${fee.scholarship.customDiscountPercentage}%` : "Boursier"}
                                  </span>
                                )}
                                {fee.schedules && fee.schedules.length > 0 && (
                                  <span 
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
                                    title={`${fee.schedules.length} échéances planifiées (${fee.schedules.filter((s: any) => s.status === "Payé").length} soldées)`}
                                  >
                                    📅 {fee.schedules.filter((s: any) => s.status === "Payé").length}/{fee.schedules.length}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4.5">
                          <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{formatAmount(fee.totalExpected || 0)}</p>
                        </td>
                        <td className="px-4 py-4.5">
                          <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatAmount(fee.totalPaid || 0)}</p>
                        </td>
                        <td className="px-4 py-4.5">
                          <p className={cn(
                            "text-sm font-black",
                            fee.balance > 0 ? "text-rose-500 dark:text-rose-400" : "text-emerald-500 dark:text-emerald-400"
                          )}>
                            {formatAmount(fee.balance || 0)}
                          </p>
                        </td>
                        <td className="px-4 py-4.5">
                          {getStatusBadge(fee.status)}
                        </td>
                        <td className="px-4 py-4.5">
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">{isMounted ? date : "-"}</p>
                        </td>
                        <td className="px-4 py-4.5">
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            {getModeIcon(mode)}
                            <span className="text-xs font-bold">{mode}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button 
                              onClick={() => setPreviewFee(fee)}
                              className="p-2.5 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition-all"
                            >
                              <Eye size={17} />
                            </button>
                            {canEdit && (
                              <PaymentDialog 
                                feeData={fee}
                                allFees={localFees}
                                headerConfig={headerConfig}
                                onPaymentSuccess={handlePaymentSuccess}
                                currentUser={currentUser}
                                currentSchoolId={currentSchoolId}
                                trigger={
                                  <div className="p-2.5 text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-xl transition-all cursor-pointer">
                                    <Edit size={17} />
                                  </div>
                                }
                              />
                            )}
                            {canDelete && (
                              <button 
                                onClick={() => handleDelete(fee.id)}
                                className="p-2.5 text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-all"
                              >
                                <Trash2 size={17} />
                              </button>
                            )}
                            <button className="p-2.5 text-slate-300 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors ml-1">
                              <History size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-32 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-20 dark:opacity-40">
                        <Wallet size={64} />
                        <p className="text-xl font-bold italic">Aucune donnée financière trouvée</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400">Affichage</span>
                  <div className="relative">
                     <select 
                       value={pageSize}
                       onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                       className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg px-3 py-1.5 text-[11px] font-black text-slate-700 dark:text-slate-200 appearance-none pr-8 outline-none cursor-pointer"
                     >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                     </select>
                     <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={10} />
                  </div>
               </div>
               <p className="text-xs font-bold text-slate-400 dark:text-slate-400">
                 Affichage de {Math.min(filteredFees.length, (currentPage - 1) * pageSize + 1)}-{Math.min(filteredFees.length, currentPage * pageSize)} sur {filteredFees.length} élèves
               </p>
            </div>

            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-100 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-all cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-lg font-bold text-xs transition-all cursor-pointer",
                    p === currentPage
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  )}
                >
                  {p}
                </button>
              ))}

              <button 
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-100 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-all cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNIFIED FINANCIAL REPORT (RECETTES VS DÉPENSES & RESTE À PAYER) */}
      {activeTab === "unified-balance" && (
        <UnifiedFinancialReportView
          schoolName={schoolName || headerConfig?.schoolName}
          activeSessionName={activeSessionName}
          headerConfig={headerConfig}
        />
      )}

      {/* REPORTS TAB */}
      {activeTab === "reports" && (
        <FinanceReports
          fees={localFees}
          classes={classes}
          classSummary={advancedStats?.classSummary || []}
          stats={advancedStats || {
            totalExpected: stats?.totalExpected || 0,
            totalPaid: stats?.totalCollected || 0,
            totalDebts: stats?.totalDebts || 0,
            recoveryRate: 0,
            countPaid: 0,
            countUnpaid: 0,
            countPartial: 0,
            totalStudents: fees.length,
            revenueMonth: 0,
            revenueYear: 0,
          }}
          isMounted={isMounted}
          headerConfig={headerConfig}
        />
      )}

      {/* ALERTS TAB */}
      {activeTab === "alerts" && (
        <UnpaidAlerts
          alerts={advancedStats?.unpaidAlerts || []}
          isMounted={isMounted}
          canEdit={canEdit}
          fees={fees}
        />
      )}

      {/* Receipt Preview Dialog */}
      {Boolean(previewFee) && (
        <ReceiptPreviewDialog 
          open={!!previewFee} 
          onOpenChange={(open) => !open && setPreviewFee(null)} 
          feeData={previewFee} 
          headerConfig={headerConfig}
          currentUser={currentUser}
          canDelete={canDelete ?? true}
          onPaymentCancelled={() => {
            router.refresh();
          }}
        />
      )}
      </div>{/* end space-y-6 content wrapper */}
      </main>
    </div>
  );
}
