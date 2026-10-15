"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Users, Building2, Search, Filter, LayoutGrid, List, Download,
  Eye, Edit, Phone, Mail, Lock, Bell, ChevronDown, ChevronLeft, ChevronRight,
  Plus, ClipboardCheck, QrCode, BarChart3, Calendar, DollarSign, FileText,
  CheckCircle2, Clock, XCircle, AlertTriangle, ShieldCheck, Briefcase,
  Award, TrendingUp, Sparkles, UserCheck, UserX, FilePlus2, Check, RefreshCw,
  Printer, School, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import EmployeeDialog from "@/domains/hr/components/EmployeeDialog";
import HrDocumentPrintModal, { HrDocType } from "@/domains/hr/components/HrDocumentPrintModal";
import ActionMenu from "@/components/common/ActionMenu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

// ─── Stat Card Component ──────────────────────────────────────────────────────

function StatCard({ icon: Icon, color, bg, title, value, sub }: {
  icon: any; color: string; bg: string; title: string; value: string | number; sub?: string;
}) {
  return (
    <div className="bg-white dark:bg-[#131622]/90 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
      <div className={cn("w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 p-3.5", bg, color)}>
        <Icon size={22} strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest leading-tight">{title}</p>
        <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mt-0.5">{value}</h4>
        {sub && <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Status Badges ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const normalized = (status || "").toUpperCase();
  if (normalized === "ACTIF" || normalized === "APPROUVÉ" || normalized === "PAYÉ") {
    return <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50 text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm">ACTIF</span>;
  }
  if (normalized === "EN ATTENTE" || normalized === "BROUILLON") {
    return <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border border-amber-100 dark:border-amber-900/50 text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm">EN ATTENTE</span>;
  }
  return <span className="px-3 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-100 dark:border-rose-900/50 text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm">INACTIF</span>;
}

function UserAvatar({ size = 24, className }: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 20a6 6 0 0 0-12 0" />
      <circle cx="12" cy="10" r="4" />
      <circle cx="12" cy="12" r="10" opacity="0.2" />
    </svg>
  );
}

// ─── MAIN CLIENT COMPONENT ─────────────────────────────────────────────────────

export default function HrClient({
  allEmployees,
  headerConfig,
  canEdit,
  canDelete,
  deleteEmployeeAction,
}: {
  allEmployees: any[];
  headerConfig?: any;
  canEdit: boolean;
  canDelete: boolean;
  deleteEmployeeAction: (id: number) => Promise<any>;
}) {
  const [tab, setTab] = useState("employees");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // 250ms search debounce
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const [isPending, startTransition] = useTransition();

  // Official Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState<HrDocType>("certificate");
  const [selectedEmployeeForPrint, setSelectedEmployeeForPrint] = useState<any | null>(null);

  // Mock data for Leaves
  const [leaves, setLeaves] = useState([
    { id: 1, employee: "Ibrahim Diallo", type: "Congé Payé", from: "2026-08-10", to: "2026-08-24", days: 14, status: "Approuvé", reason: "Vacances annuelles" },
    { id: 2, employee: "Aminata Traoré", type: "Congé Maternité", from: "2026-09-01", to: "2026-11-30", days: 90, status: "Approuvé", reason: "Maternité" },
    { id: 3, employee: "Moussa Konaté", type: "Maladie", from: "2026-08-01", to: "2026-08-05", days: 4, status: "En attente", reason: "Repos médical" },
    { id: 4, employee: "Fatoumata Coulibaly", type: "Exceptionnel", from: "2026-08-15", to: "2026-08-17", days: 2, status: "En attente", reason: "Événement familial" },
  ]);

  // Mock data for Attendance today
  const [attendanceRecords, setAttendanceRecords] = useState([
    { id: 1, name: "Ibrahim Diallo", empId: "EMP-001", dept: "Informatique", checkIn: "07:55", checkOut: "17:05", status: "Présent", method: "Badge RFID" },
    { id: 2, name: "Aminata Traoré", empId: "EMP-002", dept: "Mathématiques", checkIn: "08:12", checkOut: "17:00", status: "Retard", method: "QR Code" },
    { id: 3, name: "Moussa Konaté", empId: "EMP-003", dept: "Physique", checkIn: "07:50", checkOut: "16:45", status: "Présent", method: "Badge RFID" },
    { id: 4, name: "Fatoumata Coulibaly", empId: "EMP-004", dept: "Administration", checkIn: "—", checkOut: "—", status: "Absent", method: "Manuel" },
  ]);

  // Leave Modal State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ employee: "", type: "Congé Payé", from: "", to: "", reason: "" });

  const handleAddLeave = () => {
    if (!leaveForm.employee || !leaveForm.from || !leaveForm.to) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    const d1 = new Date(leaveForm.from);
    const d2 = new Date(leaveForm.to);
    const diffDays = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)));
    setLeaves([
      { id: Date.now(), employee: leaveForm.employee, type: leaveForm.type, from: leaveForm.from, to: leaveForm.to, days: diffDays, status: "En attente", reason: leaveForm.reason },
      ...leaves
    ]);
    toast.success("Demande de congé enregistrée !");
    setShowLeaveModal(false);
    setLeaveForm({ employee: "", type: "Congé Payé", from: "", to: "", reason: "" });
  };

  const handleApproveLeave = (id: number) => {
    setLeaves(leaves.map(l => l.id === id ? { ...l, status: "Approuvé" } : l));
    toast.success("Congé approuvé avec succès !");
  };

  const handleRejectLeave = (id: number) => {
    setLeaves(leaves.map(l => l.id === id ? { ...l, status: "Refusé" } : l));
    toast.info("Congé refusé.");
  };

  // Memoized Filter Employees
  const departmentsList = React.useMemo(() => {
    return Array.from(new Set(allEmployees.map(e => e.departement).filter(Boolean)));
  }, [allEmployees]);

  const filteredEmployees = React.useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    return allEmployees.filter((e: any) => {
      const matchesSearch =
        !searchLower ||
        (e.nom || "").toLowerCase().includes(searchLower) ||
        (e.empId && e.empId.toLowerCase().includes(searchLower)) ||
        (e.poste && e.poste.toLowerCase().includes(searchLower)) ||
        (e.fonction && e.fonction.toLowerCase().includes(searchLower));

      const matchesDept = deptFilter === "all" || e.departement === deptFilter;
      const matchesStatus = statusFilter === "all" || (e.statut || "Actif").toUpperCase() === statusFilter.toUpperCase();

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [allEmployees, search, deptFilter, statusFilter]);

  const start = (page - 1) * itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(start, start + itemsPerPage);
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  // Memoized General Metrics
  const { totalEmployees, actifsCount, nouveauxCount, payrollTotal } = React.useMemo(() => {
    const total = allEmployees.length;
    const actifs = allEmployees.filter((e: any) => (e.statut || "Actif").toUpperCase() === "ACTIF").length;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const nouveaux = allEmployees.filter((e: any) => {
      if (!e.createdAt) return false;
      const d = new Date(e.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
    const payroll = allEmployees.reduce((acc, e) => acc + Number(e.salaireBase || 0), 0);

    return {
      totalEmployees: total,
      actifsCount: actifs,
      nouveauxCount: nouveaux,
      payrollTotal: payroll,
    };
  }, [allEmployees]);

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans p-4 md:p-8 space-y-6 animate-in fade-in duration-500">

      {/* ─── MAIN HEADER ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6">
        <div>
          <div className="flex items-center gap-4 mb-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 dark:shadow-none">
              <Users size={24} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                Ressources Humaines <span className="text-lg font-bold text-slate-400 font-arabic">الموارد البشرية</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                Gestion intégrée du personnel, des contrats, de la paie et des présences
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Sub-Navigation Selector */}
          <Select value={tab} onValueChange={(v) => setTab(v || "employees")}>
            <SelectTrigger className="w-48 h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold">
              <SelectValue placeholder="Navigation..." />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <SelectItem value="employees" className="text-xs font-bold">👥 Employés &amp; Personnel</SelectItem>
              <SelectItem value="attendance" className="text-xs font-bold">📅 Présences &amp; Pointage</SelectItem>
              <SelectItem value="payroll" className="text-xs font-bold">💰 Paie &amp; Salaires</SelectItem>
              <SelectItem value="leaves" className="text-xs font-bold">🏖️ Congés &amp; Absences</SelectItem>
              <SelectItem value="contracts" className="text-xs font-bold">📜 Contrats &amp; Carrière</SelectItem>
              <SelectItem value="analytics" className="text-xs font-bold">📊 Analytics RH</SelectItem>
            </SelectContent>
          </Select>

          <Link
            href="/dashboard/hr/reports"
            className="h-11 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold flex items-center gap-2 text-xs transition-all"
          >
            <BarChart3 size={15} /> Centre Rapports
          </Link>

          <Link
            href="/dashboard/hr/attendance/qrcodes"
            className="h-11 px-4 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/60 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 font-bold flex items-center gap-2 text-xs transition-all"
          >
            <QrCode size={15} /> QR Codes
          </Link>

          {canEdit && (
            <EmployeeDialog
              mode="add"
              trigger={
                <button className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-100 dark:shadow-none transition-all">
                  <Plus size={16} /> Ajouter Employé
                </button>
              }
            />
          )}
        </div>
      </div>

      {/* ─── OFFICIAL DOCUMENT HEADER LINKAGE BANNER ─── */}
      {headerConfig && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            {(headerConfig.leftLogo || headerConfig.centerLogo) ? (
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
                  En-tête Officiel Lié aux Documents RH
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Style: {headerConfig.style || "Classique"}
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

      {/* ─── KPI CARDS OVERVIEW ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <StatCard icon={Users} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50 dark:bg-indigo-950/50" title="Total Employés" value={totalEmployees} sub={`${actifsCount} actifs`} />
        <StatCard icon={UserCheck} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-950/50" title="Actifs" value={actifsCount} sub={`${totalEmployees > 0 ? Math.round((actifsCount / totalEmployees) * 100) : 0}% du total`} />
        <StatCard icon={TrendingUp} color="text-orange-500 dark:text-orange-400" bg="bg-orange-50 dark:bg-orange-950/50" title="Nouveaux" value={nouveauxCount} sub="Ce mois-ci" />
        <StatCard icon={Building2} color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-950/50" title="Départements" value={departmentsList.length || 1} sub="Secteurs d'activité" />
        <StatCard icon={DollarSign} color="text-purple-600 dark:text-purple-400" bg="bg-purple-50 dark:bg-purple-950/50" title="Masse Salariale" value={`${Math.round(payrollTotal / 1000).toLocaleString("fr-FR")}k CFA`} sub="Est. mensuelle" />
      </div>

      {/* ─── TAB NAVIGATION & CONTENTS ────────────────────────────────────────── */}
      <Tabs value={tab} onValueChange={(v) => setTab(v || "employees")} className="w-full space-y-6">

        {/* ─── TABS HEADER LIST ─── */}
        <div className="bg-white dark:bg-[#131622]/90 rounded-2xl border border-slate-100 dark:border-slate-800 p-2 shadow-sm">
          <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 bg-transparent h-auto p-0">
            <TabsTrigger value="employees" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white dark:data-[state=active]:bg-indigo-600 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all">
              👨‍💼 Employés
            </TabsTrigger>
            <TabsTrigger value="attendance" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white dark:data-[state=active]:bg-indigo-600 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all">
              📅 Pointage
            </TabsTrigger>
            <TabsTrigger value="payroll" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white dark:data-[state=active]:bg-indigo-600 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all">
              💰 Salaires
            </TabsTrigger>
            <TabsTrigger value="leaves" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white dark:data-[state=active]:bg-indigo-600 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all">
              🏖️ Congés
            </TabsTrigger>
            <TabsTrigger value="contracts" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white dark:data-[state=active]:bg-indigo-600 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all">
              📜 Contrats
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white dark:data-[state=active]:bg-indigo-600 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all">
              📊 Analytics RH
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 1: EMPLOYEES DIRECTORY
        ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="employees" className="outline-none space-y-5">
          {/* Controls Toolbar */}
          <div className="bg-white dark:bg-[#131622]/90 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-[400px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Rechercher par nom, matricule ou poste..."
                className="w-full pl-11 pr-4 h-11 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v || "all"); setPage(1); }}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold w-44">
                  <SelectValue placeholder="Tous les dépts." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <SelectItem value="all" className="text-xs font-bold">Tous les départements</SelectItem>
                  {departmentsList.map(d => <SelectItem key={d} value={d} className="text-xs font-bold">{d}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v || "all"); setPage(1); }}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold w-36">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <SelectItem value="all" className="text-xs font-bold">Tous statuts</SelectItem>
                  <SelectItem value="ACTIF" className="text-xs font-bold text-emerald-600 dark:text-emerald-400">ACTIF</SelectItem>
                  <SelectItem value="EN ATTENTE" className="text-xs font-bold text-amber-600 dark:text-amber-400">EN ATTENTE</SelectItem>
                  <SelectItem value="INACTIF" className="text-xs font-bold text-rose-600 dark:text-rose-400">INACTIF</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 h-11 border border-slate-200/50 dark:border-slate-800">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn("w-9 h-full rounded-lg flex items-center justify-center transition-all", viewMode === "grid" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300")}
                  title="Vue Grille"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn("w-9 h-full rounded-lg flex items-center justify-center transition-all", viewMode === "list" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300")}
                  title="Vue Liste"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Grid View */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4">
              {paginatedEmployees.length > 0 ? (
                paginatedEmployees.map((employee: any) => (
                  <div key={employee.id} className="bg-white dark:bg-[#131622]/90 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800 flex items-center justify-center">
                      {employee.photoPath ? (
                        <img src={employee.photoPath} alt={employee.nom} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-indigo-400 dark:text-indigo-400">
                          <UserAvatar size={24} className="text-indigo-500" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <h3 className="font-black text-sm text-slate-900 dark:text-white truncate uppercase">{employee.nom}</h3>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 mt-0.5 uppercase tracking-wider">ID: {employee.empId}</p>
                      </div>

                      <div className="flex flex-col gap-1 justify-center">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{employee.fonction || employee.poste || "Personnel"}</span>
                          {employee.departement && (
                            <span className="text-[9px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-semibold truncate max-w-[110px]">{employee.departement}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {employee.codeGrade && (
                            <span className="text-[10px] font-semibold text-slate-400">Grade: {employee.codeGrade}</span>
                          )}
                          <span className="text-[10px] font-semibold flex items-center gap-1">
                            {employee.sexe?.toLowerCase() === 'femme' ? (
                              <><span className="text-pink-500">♀</span> <span className="text-slate-400">Femme</span></>
                            ) : (
                              <><span className="text-blue-500">♂</span> <span className="text-slate-400">Homme</span></>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-2">
                      <StatusBadge status={employee.statut || "Actif"} />
                      <button
                        onClick={() => {
                          setSelectedEmployeeForPrint(employee);
                          setPrintDocType("certificate");
                          setIsPrintModalOpen(true);
                        }}
                        className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                        title="Imprimer Attestation Officielle"
                      >
                        <FileText size={16} />
                      </button>
                      <ActionMenu
                        title={`Gérer ${employee.nom}`}
                        onDelete={canDelete ? () => deleteEmployeeAction(employee.id) : undefined}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        editDialog={
                          <EmployeeDialog
                            mode="edit"
                            initialData={employee}
                            trigger={
                              <button className="flex items-center gap-2 p-2.5 rounded-xl cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors w-full text-left">
                                <Edit size={15} />
                                <span className="font-bold text-xs">Modifier</span>
                              </button>
                            }
                          />
                        }
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-16 text-center bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 border-dashed">
                  <Users size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                  <p className="text-base font-bold text-slate-500 dark:text-slate-400">Aucun employé trouvé</p>
                </div>
              )}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest">
                      <th className="px-5 py-4">Matricule</th>
                      <th className="px-5 py-4">Nom et Prénom</th>
                      <th className="px-5 py-4">Fonction / Poste</th>
                      <th className="px-5 py-4">Département</th>
                      <th className="px-5 py-4">Sexe</th>
                      <th className="px-5 py-4">Téléphone</th>
                      <th className="px-5 py-4">Salaire de Base</th>
                      <th className="px-5 py-4">Statut</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {paginatedEmployees.length > 0 ? (
                      paginatedEmployees.map((employee: any) => (
                        <tr key={employee.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors text-xs font-bold text-slate-700 dark:text-slate-200">
                          <td className="px-5 py-4">
                            <span className="bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 px-2 py-1 rounded text-[9px] font-black">{employee.empId || "N/A"}</span>
                          </td>
                          <td className="px-5 py-4 text-slate-900 dark:text-white uppercase font-black">{employee.nom}</td>
                          <td className="px-5 py-4">{employee.fonction || employee.poste || "—"}</td>
                          <td className="px-5 py-4">{employee.departement || "—"}</td>
                          <td className="px-5 py-4">{employee.sexe || "—"}</td>
                          <td className="px-5 py-4">{employee.mobile || "—"}</td>
                          <td className="px-5 py-4 font-black text-slate-900 dark:text-white">{employee.salaireBase ? `${Math.round(employee.salaireBase).toLocaleString("fr-FR")} CFA` : "—"}</td>
                          <td className="px-5 py-4"><StatusBadge status={employee.statut || "Actif"} /></td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setSelectedEmployeeForPrint(employee);
                                  setPrintDocType("certificate");
                                  setIsPrintModalOpen(true);
                                }}
                                className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                                title="Imprimer Attestation Officielle"
                              >
                                <FileText size={15} />
                              </button>
                              <ActionMenu
                                title={`Gérer ${employee.nom}`}
                                onDelete={canDelete ? () => deleteEmployeeAction(employee.id) : undefined}
                                canEdit={canEdit}
                                canDelete={canDelete}
                              />
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={9} className="px-5 py-12 text-center text-xs text-slate-400 italic">Aucun employé trouvé.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {filteredEmployees.length > 0 && (
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Affichage {start + 1} à {Math.min(start + itemsPerPage, filteredEmployees.length)} sur {filteredEmployees.length} employés
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="h-8 rounded-lg border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <ChevronLeft size={14} />
                </Button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setPage(i + 1)}
                    className={cn("w-8 h-8 rounded-lg text-xs font-black transition-all", page === i + 1 ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800")}
                  >
                    {i + 1}
                  </button>
                ))}
                <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="h-8 rounded-lg border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 2: ATTENDANCE & CHECK-IN
        ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="attendance" className="outline-none space-y-5">
          <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">Pointage &amp; Registre des Présences ({todayStr})</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Suivi en temps réel des arrivées et départs du personnel</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/dashboard/hr/attendance?date=${todayStr}`} className="h-10 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-black text-xs uppercase flex items-center gap-2 border border-emerald-200/60 dark:border-emerald-900/50">
                  <ClipboardCheck size={14} /> Feuille complète
                </Link>
                <Link href="/dashboard/hr/attendance/qrcodes" className="h-10 px-4 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-black text-xs uppercase flex items-center gap-2 border border-blue-200/60 dark:border-blue-900/50">
                  <QrCode size={14} /> Terminal QR
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 text-center">
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">18</p>
                <p className="text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-300 tracking-wider">Présents aujourd'hui</p>
              </div>
              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/40 text-center">
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400">3</p>
                <p className="text-[9px] font-black uppercase text-amber-700 dark:text-amber-300 tracking-wider">En retard (&gt;15 min)</p>
              </div>
              <div className="p-4 bg-rose-50/50 dark:bg-rose-950/30 rounded-2xl border border-rose-100 dark:border-rose-900/40 text-center">
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400">2</p>
                <p className="text-[9px] font-black uppercase text-rose-700 dark:text-rose-300 tracking-wider">Absences non justifiées</p>
              </div>
              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-center">
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">91%</p>
                <p className="text-[9px] font-black uppercase text-indigo-700 dark:text-indigo-300 tracking-wider">Taux de présence global</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-black text-slate-800 dark:text-white">Journaux de pointage du jour</h3>
              <span className="text-[10px] font-black text-slate-400 uppercase">{attendanceRecords.length} entrées</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-left">
                    <th className="px-5 py-4">Matricule</th>
                    <th className="px-5 py-4">Employé</th>
                    <th className="px-5 py-4">Département</th>
                    <th className="px-5 py-4">Heure Arrivée</th>
                    <th className="px-5 py-4">Heure Départ</th>
                    <th className="px-5 py-4">Méthode</th>
                    <th className="px-5 py-4">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {attendanceRecords.map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors text-xs font-bold text-slate-700 dark:text-slate-200">
                      <td className="px-5 py-4"><span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-[9px] font-black">{rec.empId}</span></td>
                      <td className="px-5 py-4 text-slate-900 dark:text-white font-black">{rec.name}</td>
                      <td className="px-5 py-4">{rec.dept}</td>
                      <td className="px-5 py-4 text-emerald-600 dark:text-emerald-400 font-mono">{rec.checkIn}</td>
                      <td className="px-5 py-4 text-indigo-600 dark:text-indigo-400 font-mono">{rec.checkOut}</td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{rec.method}</td>
                      <td className="px-5 py-4">
                        {rec.status === "Présent" && <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 text-[9px] font-black uppercase rounded-full">Présent</span>}
                        {rec.status === "Retard" && <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 text-[9px] font-black uppercase rounded-full">Retard</span>}
                        {rec.status === "Absent" && <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 text-[9px] font-black uppercase rounded-full">Absent</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 3: PAYROLL & SALARIES
        ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="payroll" className="outline-none space-y-5">
          <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">Gestion de la Paie &amp; Bulletins de Salaire</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Calculs automatizados, primes, retenues et fiches de paie</p>
              </div>
              <Link href="/dashboard/hr/payroll" className="h-10 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-xs uppercase flex items-center gap-2 shadow-lg shadow-violet-100 dark:shadow-none">
                <DollarSign size={15} /> Ouvrir le Module Paie Komple
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 space-y-1">
                <p className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">Masse Salariale Base</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{payrollTotal.toLocaleString("fr-FR")} CFA</p>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">Total salaire brut récurrent</p>
              </div>
              <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 space-y-1">
                <p className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Salaires Réglés Ce Mois</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{Math.round(payrollTotal * 0.85).toLocaleString("fr-FR")} CFA</p>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">85% des virements effectués</p>
              </div>
              <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 rounded-2xl border border-amber-100 dark:border-amber-900/40 space-y-1">
                <p className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">Restant en Attente</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{Math.round(payrollTotal * 0.15).toLocaleString("fr-FR")} CFA</p>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">3 employés en attente de validation</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-black text-slate-800 dark:text-white">Aperçu du Registre de Paie</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-left">
                    <th className="px-5 py-4">Matricule</th>
                    <th className="px-5 py-4">Employé</th>
                    <th className="px-5 py-4">Poste</th>
                    <th className="px-5 py-4">Salaire Base</th>
                    <th className="px-5 py-4">Primes / Ind.</th>
                    <th className="px-5 py-4">Net à Payer</th>
                    <th className="px-5 py-4">Statut Paie</th>
                    <th className="px-5 py-4 text-right">Bulletin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {allEmployees.slice(0, 6).map((emp: any, i: number) => {
                    const base = Number(emp.salaireBase || 150000);
                    const primes = Math.round(base * 0.1);
                    const net = base + primes;
                    const isPaid = i % 3 !== 2;
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors text-xs font-bold text-slate-700 dark:text-slate-200">
                        <td className="px-5 py-4"><span className="bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 px-2 py-1 rounded text-[9px] font-black">{emp.empId}</span></td>
                        <td className="px-5 py-4 text-slate-900 dark:text-white font-black">{emp.nom}</td>
                        <td className="px-5 py-4">{emp.fonction || emp.poste || "Enseignant"}</td>
                        <td className="px-5 py-4 font-mono">{base.toLocaleString("fr-FR")} CFA</td>
                        <td className="px-5 py-4 text-emerald-600 dark:text-emerald-400 font-mono">+{primes.toLocaleString("fr-FR")} CFA</td>
                        <td className="px-5 py-4 font-black text-slate-900 dark:text-white font-mono">{net.toLocaleString("fr-FR")} CFA</td>
                        <td className="px-5 py-4">
                          {isPaid ? (
                            <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 text-[8px] font-black uppercase rounded-full">PAYÉ</span>
                          ) : (
                            <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 text-[8px] font-black uppercase rounded-full">EN ATTENTE</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button onClick={() => toast.info(`Génération du bulletin pour ${emp.nom}`)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[9px] font-black uppercase transition-colors">
                            PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 4: LEAVES & ABSENCES
        ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="leaves" className="outline-none space-y-5">
          <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">Gestion des Congés &amp; Absences</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Demandes, validations et soldes de congés payés et autorisés</p>
              </div>
              <Button onClick={() => setShowLeaveModal(true)} className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-100 dark:shadow-none">
                <Plus size={16} /> Demande de Congé
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-center">
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{leaves.filter(l => l.status === "En attente").length}</p>
                <p className="text-[9px] font-black uppercase text-indigo-700 dark:text-indigo-300 tracking-wider">Demandes en attente</p>
              </div>
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 text-center">
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{leaves.filter(l => l.status === "Approuvé").length}</p>
                <p className="text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-300 tracking-wider">Congés en cours / Approuvés</p>
              </div>
              <div className="p-4 bg-purple-50/50 dark:bg-purple-950/30 rounded-2xl border border-purple-100 dark:border-purple-900/40 text-center">
                <p className="text-2xl font-black text-purple-600 dark:text-purple-400">30 jours</p>
                <p className="text-[9px] font-black uppercase text-purple-700 dark:text-purple-300 tracking-wider">Solde Moyen Général</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-black text-slate-800 dark:text-white">Registre des Demandes de Congé</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-left">
                    <th className="px-5 py-4">Employé</th>
                    <th className="px-5 py-4">Type de Congé</th>
                    <th className="px-5 py-4">Période (Du .. Au)</th>
                    <th className="px-5 py-4">Durée</th>
                    <th className="px-5 py-4">Motif</th>
                    <th className="px-5 py-4">Statut</th>
                    <th className="px-5 py-4 text-right">Décision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {leaves.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors text-xs font-bold text-slate-700 dark:text-slate-200">
                      <td className="px-5 py-4 text-slate-900 dark:text-white font-black">{l.employee}</td>
                      <td className="px-5 py-4"><span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full text-[9px] font-black">{l.type}</span></td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{l.from} au {l.to}</td>
                      <td className="px-5 py-4 font-black text-slate-900 dark:text-white">{l.days} jours</td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400 max-w-[150px] truncate">{l.reason}</td>
                      <td className="px-5 py-4">
                        {l.status === "Approuvé" && <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 text-[8px] font-black uppercase rounded-full">Approuvé</span>}
                        {l.status === "En attente" && <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 text-[8px] font-black uppercase rounded-full">En attente</span>}
                        {l.status === "Refusé" && <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 text-[8px] font-black uppercase rounded-full">Refusé</span>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {l.status === "En attente" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => handleApproveLeave(l.id)} className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100" title="Valider">
                              <Check size={14} />
                            </button>
                            <button onClick={() => handleRejectLeave(l.id)} className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100" title="Refuser">
                              <XCircle size={14} />
                            </button>
                          </div>
                        ) : <span className="text-[10px] text-slate-400 italic">Traité</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 5: CONTRACTS & CAREER
        ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="contracts" className="outline-none space-y-5">
          <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <h3 className="font-black text-slate-900 dark:text-white text-base">Contrats de Travail &amp; Évolution de Carrière</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Suivi des types de contrat (CDI, CDD, Vacataires) et alertes d'échéance</p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">14</p>
                <p className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Contrats CDI</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                <p className="text-2xl font-black text-purple-600 dark:text-purple-400">6</p>
                <p className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Contrats CDD</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">3</p>
                <p className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Vacataires / Prestations</p>
              </div>
              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/40 text-center">
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400">2</p>
                <p className="text-[9px] font-black uppercase text-amber-700 dark:text-amber-300 tracking-wider">Fin de contrat dans 30j</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-black text-slate-800 dark:text-white">Répertoire des Contrats du Personnel</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-left">
                    <th className="px-5 py-4">Employé</th>
                    <th className="px-5 py-4">Matricule</th>
                    <th className="px-5 py-4">Poste / Grade</th>
                    <th className="px-5 py-4">Type Contrat</th>
                    <th className="px-5 py-4">Date Prise d'Effet</th>
                    <th className="px-5 py-4">Date Fin Prévue</th>
                    <th className="px-5 py-4 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {allEmployees.map((emp: any, i: number) => {
                    const cType = i % 3 === 0 ? "CDI" : i % 3 === 1 ? "CDD" : "Vacataire";
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors text-xs font-bold text-slate-700 dark:text-slate-200">
                        <td className="px-5 py-4 text-slate-900 dark:text-white font-black">{emp.nom}</td>
                        <td className="px-5 py-4"><span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-[9px] font-black">{emp.empId}</span></td>
                        <td className="px-5 py-4">{emp.fonction || emp.poste || "Enseignant"} {emp.codeGrade ? `(${emp.codeGrade})` : ""}</td>
                        <td className="px-5 py-4">
                          <span className={cn("px-2.5 py-1 rounded-full text-[9px] font-black uppercase", cType === "CDI" ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300" : cType === "CDD" ? "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300" : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300")}>{cType}</span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{emp.dateAffectation || "2024-09-01"}</td>
                        <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{cType === "CDI" ? "Indéterminée" : "2026-12-31"}</td>
                        <td className="px-5 py-4 text-right"><StatusBadge status={emp.statut || "Actif"} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 6: ANALYTICS RH
        ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="analytics" className="outline-none space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* Department Headcount Chart */}
            <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
              <h3 className="font-black text-slate-800 dark:text-white">Répartition par Département</h3>
              <div className="space-y-3">
                {departmentsList.map(dept => {
                  const count = allEmployees.filter(e => e.departement === dept).length;
                  const pct = Math.round((count / Math.max(1, allEmployees.length)) * 100);
                  return (
                    <div key={dept} className="flex items-center gap-3">
                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 w-32 truncate">{dept}</p>
                      <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden relative">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg transition-all" style={{ width: `${Math.max(pct, 8)}%` }} />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-600 dark:text-slate-300">{count} ({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
                {departmentsList.length === 0 && <p className="text-xs text-slate-400 italic text-center py-6">Aucun département configuré</p>}
              </div>
            </div>

            {/* Gender Ratio */}
            <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
              <h3 className="font-black text-slate-800 dark:text-white">Parité &amp; Diversité des Genres</h3>
              {(() => {
                const hommes = allEmployees.filter(e => (e.sexe || "").toLowerCase() !== "femme").length;
                const femmes = allEmployees.filter(e => (e.sexe || "").toLowerCase() === "femme").length;
                const total = Math.max(1, hommes + femmes);
                const hPct = Math.round((hommes / total) * 100);
                const fPct = Math.round((femmes / total) * 100);
                return (
                  <div className="space-y-6 pt-2">
                    <div className="flex items-center justify-between text-xs font-black">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <span className="text-xl">♂</span> Hommes ({hommes})
                      </div>
                      <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
                        Femmes ({femmes}) <span className="text-xl">♀</span>
                      </div>
                    </div>
                    <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex">
                      <div className="h-full bg-blue-500 text-[9px] font-black text-white flex items-center justify-center transition-all" style={{ width: `${hPct}%` }}>{hPct}%</div>
                      <div className="h-full bg-pink-500 text-[9px] font-black text-white flex items-center justify-center transition-all" style={{ width: `${fPct}%` }}>{fPct}%</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40">
                        <p className="text-lg font-black text-blue-600 dark:text-blue-400">{hPct}%</p>
                        <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Personnel Masculin</p>
                      </div>
                      <div className="p-3 bg-pink-50/50 dark:bg-pink-950/30 rounded-xl border border-pink-100 dark:border-pink-900/40">
                        <p className="text-lg font-black text-pink-600 dark:text-pink-400">{fPct}%</p>
                        <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Personnel Féminin</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── MODAL: NEW LEAVE REQUEST ────────────────────────────────────────── */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131622] rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"><Calendar size={18} /></div>
                <h3 className="font-black text-slate-900 dark:text-white text-sm">Nouvelle Demande de Congé</h3>
              </div>
              <button onClick={() => setShowLeaveModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 flex items-center justify-center"><XCircle size={14} /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Employé *</Label>
                <Select value={leaveForm.employee} onValueChange={(v) => setLeaveForm({ ...leaveForm, employee: v || "" })}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"><SelectValue placeholder="Choisir l'employé..." /></SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    {allEmployees.map(e => <SelectItem key={e.id} value={e.nom} className="text-xs font-bold">{e.nom} ({e.empId})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Type de Congé</Label>
                <Select value={leaveForm.type} onValueChange={(v) => setLeaveForm({ ...leaveForm, type: v || "Congé Payé" })}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    {["Congé Payé", "Maladie", "Maternité", "Exceptionnel", "Sans Solde"].map(t => <SelectItem key={t} value={t} className="text-xs font-bold">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date de Début *</Label>
                  <Input type="date" value={leaveForm.from} onChange={e => setLeaveForm({ ...leaveForm, from: e.target.value })} className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date de Fin *</Label>
                  <Input type="date" value={leaveForm.to} onChange={e => setLeaveForm({ ...leaveForm, to: e.target.value })} className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Motif / Description</Label>
                <Input value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="Précisez le motif..." className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold" />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setShowLeaveModal(false)} className="h-11 px-5 rounded-xl border-slate-200 dark:border-slate-800 text-slate-500">Annuler</Button>
              <Button onClick={handleAddLeave} className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none">
                Enregistrer la Demande
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Official HR Document Printing Modal ─── */}
      <HrDocumentPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        headerConfig={headerConfig}
        docType={printDocType}
        employee={selectedEmployeeForPrint}
      />
    </div>
  );
}
