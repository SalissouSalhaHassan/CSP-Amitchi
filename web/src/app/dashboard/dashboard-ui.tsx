"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Bell,
  Calendar as CalendarIcon,
  ChevronDown,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Moon,
  Sun,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
  Users,
  CalendarDays,
  CreditCard,
  Send,
  Video,
  ArrowUpRight,
  ArrowDownRight,
  Server,
  UserCheck,
  BookOpen,
  Award,
  CheckCircle,
  LogOut,
} from "lucide-react";
import { logout } from "@/domains/auth/actions/login";

import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";

type SparkPoint = { i: number; v: number };
type AnalyticPoint = { month: string; recettes: number; depenses: number; recouvrement: number };

type BreakdownItem = { label: string; percent: number; amount: number; color: string };
type EventIconName = "meeting" | "exam" | "holiday";
type EventItem = { title: string; date: string; pill: string; pillTone: "purple" | "green" | "orange"; icon: EventIconName };

export type DashboardUIProps = {
  user?: any;
  branding?: {
    name: string;
    logoPath: string | null;
    level: string;
  };
  sessionLabel: string;
  notificationsCount: number;
  stats: {
    students: number;
    employees: number;
    revenue: number;
    expense: number;
    studentGrowth?: number;
    revenueGrowth?: number;
  };
  analytic: AnalyticPoint[];
  revenue: { total: number; items: BreakdownItem[] };
  expense: { total: number; items: BreakdownItem[] };
  system: Array<{ label: string; value: string; tone: "green" | "blue" }>;
  services?: Array<{ name: string; status: "online" | "offline"; type: "microservice" | "platform" }>;
  events: EventItem[];
};

function formatCfa(amount: number) {
  return `${Math.round(amount).toLocaleString("fr-FR")} CFA`;
}

function formatShortCfa(amount: number) {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M CFA`;
  if (abs >= 1_000) return `${(amount / 1_000).toFixed(0)}K CFA`;
  return `${Math.round(amount).toLocaleString("fr-FR")} CFA`;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const id = React.useId();
  const chartData = React.useMemo<SparkPoint[]>(() => data.map((v, i) => ({ i, v })), [data]);
  return (
    <div className="h-12 w-28">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="10%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
          <Bar dataKey="v" fill={`url(#spark-${id})`} opacity={0.6} barSize={6} radius={[8, 8, 0, 0]} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  iconFg,
  label,
  value,
  pill,
  pillTone,
  spark,
  sparkColor,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconFg: string;
  label: string;
  value: string;
  pill: string;
  pillTone: "green" | "gray" | "red";
  spark: number[];
  sparkColor: string;
}) {
  const isPositive = !pill.startsWith("-");
  return (
    <div className="rounded-[24px] bg-white/85 dark:bg-[#181a24]/90 backdrop-blur-sm border border-white/40 dark:border-slate-800/80 shadow-[0_20px_80px_rgba(15,23,42,0.06)] p-6 flex items-center justify-between gap-6 group hover:bg-white dark:hover:bg-[#1f2230] transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className={cn("w-14 h-14 rounded-2xl grid place-items-center transition-transform group-hover:scale-110 duration-300", iconBg, iconFg)}>
          {icon}
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
          <div className="mt-4 flex items-center gap-2">
            <span
              className={cn(
                "h-7 px-3 rounded-full text-[11px] font-black inline-flex items-center gap-1",
                pillTone === "green"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                  : pillTone === "red"
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              )}
            >
              {isPositive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {pill}
            </span>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400">vs mois dernier</span>
          </div>
        </div>
      </div>
      <Sparkline data={spark} color={sparkColor} />
    </div>
  );
}

function DonutCard({
  title,
  totalValue,
  items,
}: {
  title: string;
  totalValue: string;
  items: BreakdownItem[];
}) {
  const pieData = items.map((i) => ({ name: i.label, value: i.amount, color: i.color }));
  return (
    <div className="rounded-[24px] bg-white/85 dark:bg-[#181a24]/90 backdrop-blur-sm border border-white/40 dark:border-slate-800/80 shadow-[0_20px_80px_rgba(15,23,42,0.06)] p-7">
      <h4 className="text-[12px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">{title}</h4>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8 items-center">
        <div className="relative mx-auto w-[200px] h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                innerRadius={70}
                outerRadius={92}
                stroke="transparent"
                startAngle={90}
                endAngle={-270}
              >
                {pieData.map((p, idx) => (
                  <Cell key={idx} fill={p.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{totalValue}</p>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-400 mt-1">CFA</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {items.map((row) => (
            <div key={row.label} className="grid grid-cols-[14px_1fr_auto_auto] items-center gap-3">
              <span className="size-2 rounded-full" style={{ backgroundColor: row.color }} />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{row.label}</span>
              <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{Math.round(row.percent)}%</span>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-400 tabular-nums">{formatShortCfa(row.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Pill({ tone, children }: { tone: "purple" | "green" | "orange"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "h-7 px-3 rounded-full text-[11px] font-black inline-flex items-center justify-center whitespace-nowrap",
        tone === "purple"
          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400"
          : tone === "green"
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
          : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
      )}
    >
      {children}
    </span>
  );
}

export default function DashboardUI(props: DashboardUIProps) {
  const { isDark, toggleTheme: toggleDarkMode } = useTheme();

  const roleName = (props.user?.role?.roleName || props.user?.role || "").toLowerCase();
  const isStudent =
    roleName.includes("élève") ||
    roleName.includes("eleve") ||
    roleName.includes("étudiant") ||
    roleName.includes("etudiant") ||
    roleName.includes("student") ||
    Boolean(props.user?.studentId);
  const isTeacher =
    !isStudent &&
    (roleName.includes("enseignant") ||
      roleName.includes("professeur") ||
      roleName.includes("teacher") ||
      Boolean(props.user?.employeeId));
  const isParent =
    !isStudent && !isTeacher && (roleName.includes("parent") || roleName.includes("famille"));

  const welcomeMessage = isStudent
    ? `Bienvenue sur votre espace élève de ${props.branding?.name || "votre établissement"}.`
    : isTeacher
    ? `Bienvenue sur votre espace enseignant de ${props.branding?.name || "votre établissement"}.`
    : isParent
    ? `Bienvenue sur votre espace famille de ${props.branding?.name || "votre établissement"}.`
    : `Bienvenue sur le centre de commande de ${props.branding?.name || "votre établissement"}.`;

  const quickActions = isStudent
    ? [
        {
          label: "PRÉSENCES &\nASSIDUITÉ",
          icon: <UserCheck className="size-5" />,
          tone: "from-indigo-600 to-violet-600",
          href: "/dashboard/attendance",
        },
        {
          label: "NOTES &\nRÉSULTATS",
          icon: <GraduationCap className="size-5" />,
          tone: "from-emerald-600 to-green-600",
          href: "/dashboard/academics/grades",
        },
        {
          label: "EMPLOI\nDU TEMPS",
          icon: <CalendarDays className="size-5" />,
          tone: "from-blue-600 to-indigo-600",
          href: "/dashboard/academics/timetable",
        },
        {
          label: "DEVOIRS &\nEXERCICES",
          icon: <BookOpen className="size-5" />,
          tone: "from-amber-500 to-orange-500",
          href: "/dashboard/academics/homework",
        },
        {
          label: "MES FRAIS &\nPAIEMENTS",
          icon: <CreditCard className="size-5" />,
          tone: "from-violet-600 to-fuchsia-600",
          href: "/dashboard/finance",
        },
      ]
    : isTeacher
    ? [
        {
          label: "FAIRE\nL'APPEL",
          icon: <UserCheck className="size-5" />,
          tone: "from-indigo-600 to-violet-600",
          href: "/dashboard/attendance",
        },
        {
          label: "SAISIR\nNOTES",
          icon: <GraduationCap className="size-5" />,
          tone: "from-emerald-600 to-green-600",
          href: "/dashboard/academics/grades",
        },
        {
          label: "EMPLOI\nDU TEMPS",
          icon: <CalendarDays className="size-5" />,
          tone: "from-blue-600 to-indigo-600",
          href: "/dashboard/academics/timetable",
        },
        {
          label: "DONNER UN\nDEVOIR",
          icon: <BookOpen className="size-5" />,
          tone: "from-amber-500 to-orange-500",
          href: "/dashboard/academics/homework",
        },
        {
          label: "RESSOURCES\nPÉDAGOGIQUES",
          icon: <FileText className="size-5" />,
          tone: "from-violet-600 to-indigo-600",
          href: "/dashboard/pedagogie",
        },
      ]
    : isParent
    ? [
        {
          label: "SUIVI\nPRÉSENCES",
          icon: <UserCheck className="size-5" />,
          tone: "from-indigo-600 to-violet-600",
          href: "/dashboard/attendance",
        },
        {
          label: "BULLETINS &\nNOTES",
          icon: <GraduationCap className="size-5" />,
          tone: "from-emerald-600 to-green-600",
          href: "/dashboard/academics/grades",
        },
        {
          label: "EMPLOI\nDU TEMPS",
          icon: <CalendarDays className="size-5" />,
          tone: "from-blue-600 to-indigo-600",
          href: "/dashboard/academics/timetable",
        },
        {
          label: "DEVOIRS\nENFANTS",
          icon: <BookOpen className="size-5" />,
          tone: "from-amber-500 to-orange-500",
          href: "/dashboard/academics/homework",
        },
        {
          label: "PAIEMENT\nSCOLARITÉ",
          icon: <CreditCard className="size-5" />,
          tone: "from-emerald-600 to-green-600",
          href: "/dashboard/finance",
        },
      ]
    : [
        {
          label: "INSCRIRE\nUN ÉLÈVE",
          icon: <Users className="size-5" />,
          tone: "from-indigo-600 to-violet-600",
          href: "/dashboard/students",
        },
        {
          label: "PAIEMENT\nFRAIS",
          icon: <CreditCard className="size-5" />,
          tone: "from-emerald-600 to-green-600",
          href: "/dashboard/finance",
        },
        {
          label: "ENVOYER\nSMS",
          icon: <Send className="size-5" />,
          tone: "from-amber-500 to-orange-500",
          href: "/dashboard/messaging",
        },
        {
          label: "EMPLOI\nDU TEMPS",
          icon: <CalendarDays className="size-5" />,
          tone: "from-blue-600 to-indigo-600",
          href: "/dashboard/academics/timetable",
        },
        {
          label: "GÉNÉRER\nRAPPORT",
          icon: <FileText className="size-5" />,
          tone: "from-violet-600 to-indigo-600",
          href: "/dashboard/reports",
        },
      ];

  return (
    <div className="p-6 lg:p-10 space-y-8 lg:space-y-10 animate-in fade-in duration-700 min-h-full transition-colors duration-300 bg-transparent text-slate-900 dark:text-slate-100">
      {/* Header + Topbar */}
      <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-6">
        <div className="space-y-2 flex items-start gap-4">
          {(() => {
            const b = props.branding as any;
            const s = props.user?.school as any;
            const logo = b?.logoPath || 
                         b?.logo_path || 
                         b?.logoUrl || 
                         s?.logoPath || 
                         s?.logo_path || 
                         s?.logoUrl || 
                         s?.logo;
            return (
              <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border border-indigo-200/80 dark:border-indigo-800/40 flex items-center justify-center overflow-hidden shrink-0 shadow-lg shadow-indigo-100/50 dark:shadow-none mt-1 ring-2 ring-indigo-500/20">
                {logo ? (
                  <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full bg-indigo-600 font-black text-2xl text-white">
                    {(props.branding?.name || props.user?.school?.name || "E").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            );
          })()}
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight drop-shadow-sm">
                Tableau de Bord
              </h1>
              {props.branding?.name && (
                <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/80 px-3.5 py-1 rounded-full shadow-sm">
                  {props.branding.name}
                </span>
              )}
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-2 mt-2 text-sm">
              <Zap className="size-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              {welcomeMessage}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            className="h-12 px-5 rounded-2xl bg-white/85 dark:bg-[#181a24]/90 backdrop-blur-sm border border-white/40 dark:border-slate-800/80 shadow-sm flex items-center gap-3 text-slate-700 dark:text-slate-200 font-bold"
          >
            <CalendarIcon className="size-4 text-slate-500 dark:text-slate-400" />
            <span className="text-sm">Session : {props.sessionLabel}</span>
            <ChevronDown className="size-4 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={toggleDarkMode}
            className="h-12 w-12 rounded-2xl bg-white/85 dark:bg-[#181a24]/90 backdrop-blur-sm border border-white/40 dark:border-slate-800/80 shadow-sm grid place-items-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#222534] transition-all duration-300 cursor-pointer"
            aria-label="Mode sombre"
            title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
          >
            {isDark ? (
              <Sun className="size-5 text-amber-400 animate-in spin-in-180 duration-500" />
            ) : (
              <Moon className="size-5 text-slate-600 dark:text-slate-300 animate-in fade-in duration-300" />
            )}
          </button>

          <Link
            href="/dashboard/notifications"
            className="relative h-12 w-12 rounded-2xl bg-white/85 dark:bg-[#181a24]/90 backdrop-blur-sm border border-white/40 dark:border-slate-800/80 shadow-sm grid place-items-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#222534] transition-colors"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="size-5" />
            {props.notificationsCount > 0 ? (
              <span className="absolute -top-1 -right-1 size-5 rounded-full bg-rose-500 text-white text-[11px] font-black grid place-items-center">
                {props.notificationsCount}
              </span>
            ) : null}
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-12 px-4 rounded-2xl bg-white/85 dark:bg-[#181a24]/90 backdrop-blur-sm border border-white/40 dark:border-slate-800/80 shadow-sm flex items-center gap-3 text-left"
            >
              <div className="size-9 rounded-full bg-indigo-600 text-white grid place-items-center font-black text-xs shadow-md shadow-indigo-100 dark:shadow-none">
                {props.user?.nomPrenom?.charAt(0) || props.user?.utilisateur?.charAt(0) || "A"}
              </div>
              <div className="leading-tight">
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  {props.user?.nomPrenom || props.user?.utilisateur || "Admin GROUP AIIU-NIGER"}
                </p>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-400">
                  {props.user?.admin || !props.user?.role ? "Administrateur" : props.user?.role?.roleName || "Administrateur"}
                </p>
              </div>
            </button>
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
              className="h-12 w-12 rounded-2xl bg-white/85 dark:bg-[#181a24]/90 backdrop-blur-sm border border-white/40 dark:border-slate-800/80 shadow-sm grid place-items-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-6">
        <StatCard
          icon={<GraduationCap className="size-6" />}
          iconBg="bg-indigo-50 dark:bg-indigo-950/50"
          iconFg="text-indigo-700 dark:text-indigo-400"
          label="Élèves actifs"
          value={String(props.stats.students ?? 0)}
          pill={`${props.stats.studentGrowth || 12.5}%`}
          pillTone={props.stats.studentGrowth && props.stats.studentGrowth > 0 ? "green" : "red"}
          spark={[6, 7, 6.5, 7.2, 7.9, 7.6, 8.1, 8.4, 8.0, 8.9, 9.2, 9.0]}
          sparkColor="#7c3aed"
        />
        <StatCard
          icon={<Users className="size-6" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
          iconFg="text-blue-700 dark:text-blue-400"
          label="Personnel HR"
          value={String(props.stats.employees ?? 0)}
          pill="+4.2%"
          pillTone="green"
          spark={[40, 42, 41, 45, 44, 46, 48, 47, 49, 50, 48, 52]}
          sparkColor="#2563eb"
        />
        <StatCard
          icon={<TrendingUp className="size-6" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
          iconFg="text-emerald-700 dark:text-emerald-400"
          label="Recettes"
          value={formatShortCfa(props.stats.revenue)}
          pill={`${props.stats.revenueGrowth || 8.2}%`}
          pillTone={props.stats.revenueGrowth && props.stats.revenueGrowth > 0 ? "green" : "red"}
          spark={[2.5, 3.1, 2.8, 3.5, 3.2, 3.8, 4.1, 3.9, 4.5, 5.2, 4.8, 5.5]}
          sparkColor="#10b981"
        />
        <StatCard
          icon={<TrendingDown className="size-6" />}
          iconBg="bg-rose-50 dark:bg-rose-950/50"
          iconFg="text-rose-700 dark:text-rose-400"
          label="Dépenses"
          value={formatShortCfa(props.stats.expense)}
          pill="-2.1%"
          pillTone="green"
          spark={[1.8, 1.5, 1.9, 1.4, 1.7, 1.6, 1.8, 1.5, 1.9, 1.4, 1.6, 1.3]}
          sparkColor="#f43f5e"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 2xl:grid-cols-12 gap-6">
        {/* Left column */}
        <div className="2xl:col-span-8 space-y-6">
          {/* Actions rapides */}
          <div className="rounded-[24px] bg-white/85 dark:bg-[#181a24]/90 backdrop-blur-sm border border-white/40 dark:border-slate-800/80 shadow-[0_20px_80px_rgba(15,23,42,0.06)] p-7">
            <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Actions rapides</h3>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {quickActions.map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className="group rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-[#1f2230] hover:border-indigo-100 dark:hover:border-indigo-900 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 p-4 flex items-center gap-3"
                >
                  <div className={cn("w-11 h-11 rounded-2xl bg-gradient-to-br text-white grid place-items-center shadow-lg transition-transform group-hover:scale-110 duration-300", a.tone)}>
                    {a.icon}
                  </div>
                  <p className="text-[11px] font-black text-slate-900 dark:text-white whitespace-pre-line leading-tight">
                    {a.label}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* Aperçu analytique */}
          <div className="rounded-[24px] bg-white/85 dark:bg-[#181a24]/90 backdrop-blur-sm border border-white/40 dark:border-slate-800/80 shadow-[0_20px_80px_rgba(15,23,42,0.06)] p-7">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 grid place-items-center border border-indigo-100 dark:border-indigo-900/50">
                  <LayoutDashboard className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Aperçu Analytique</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-6 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full bg-blue-600" /> Recettes (CFA)
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full bg-rose-500" /> Dépenses (CFA)
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-600" /> Recouvrement(%)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="h-10 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm inline-flex items-center gap-2"
                >
                  12 Mois <ChevronDown className="size-4 text-slate-400" />
                </button>
                <button
                  type="button"
                  className="h-10 w-10 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 grid place-items-center"
                  aria-label="Options"
                  title="Options"
                >
                  <span className="text-xl leading-none">⋯</span>
                </button>
              </div>
            </div>

            <div className="mt-6 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={props.analytic}
                  margin={{ top: 10, right: 16, left: 10, bottom: 0 }}
                  barCategoryGap="35%"
                  barGap={6}
                >
                  <CartesianGrid stroke={isDark ? "#2a2e3d" : "#e2e8f0"} strokeDasharray="6 6" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 12 }} />
                  <YAxis
                    yAxisId="left"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 12 }}
                    tickFormatter={(v) => `${Math.round(v / 1_000_000)}M`}
                    domain={[0, (max: number) => Math.ceil(max / 1_000_000) * 1_000_000]}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 12 }}
                    tickFormatter={(v) => `${v}%`}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 16,
                      border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
                      backgroundColor: isDark ? "#1e293b" : "#ffffff",
                      color: isDark ? "#f8fafc" : "#0f172a",
                      boxShadow: "0 12px 40px rgba(15, 23, 42, 0.2)",
                    }}
                    formatter={(value: unknown, name: unknown) => {
                      const label = String(name);
                      if (label === "Recouvrement") return [`${Number(value)}%`, "Recouvrement"];
                      return [formatShortCfa(Number(value)), label];
                    }}
                    labelStyle={{ fontWeight: 800, color: isDark ? "#f8fafc" : "#0f172a" }}
                  />

                  <Bar
                    yAxisId="left"
                    dataKey="recettes"
                    name="Recettes"
                    fill="#2563eb"
                    radius={[8, 8, 0, 0]}
                    barSize={16}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="depenses"
                    name="Dépenses"
                    fill="#ef4444"
                    radius={[8, 8, 0, 0]}
                    barSize={16}
                  />
                  <Line yAxisId="right" type="monotone" dataKey="recouvrement" name="Recouvrement" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donuts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <DonutCard
              title="Répartition des Recettes"
              totalValue={`${(props.revenue.total / 1_000_000).toFixed(1)}M`}
              items={props.revenue.items}
            />
            <DonutCard
              title="Répartition des Dépenses"
              totalValue={`${(props.expense.total / 1_000_000).toFixed(1)}M`}
              items={props.expense.items}
            />
          </div>
        </div>

        {/* Right column */}
        <div className="2xl:col-span-4 space-y-6">
          {/* Etat du système */}
          <div className="rounded-[24px] bg-white/85 dark:bg-[#181a24]/90 backdrop-blur-sm border border-white/40 dark:border-slate-800/80 shadow-[0_20px_80px_rgba(15,23,42,0.06)] p-7 space-y-6">
            <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">État du système</h3>
            <div className="space-y-5">
              {props.system.map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{row.label}</span>
                  <span
                    className={cn(
                      "text-[11px] font-black uppercase tracking-widest",
                      row.tone === "green" ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400"
                    )}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-[20px] bg-slate-50/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 grid place-items-center text-indigo-700 dark:text-indigo-300">
                <ShieldCheck className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Mode sécurisé</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2">
                  Toutes les transactions sont chiffrées et auditées en temps réel.
                </p>
              </div>
              <div className="ml-auto w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 grid place-items-center border border-emerald-100 dark:border-emerald-900/50">
                <span className="text-lg">🔒</span>
              </div>
            </div>

            {/* Microservices Status Card */}
            {props.services && (
              <div className="rounded-[24px] bg-white/85 dark:bg-[#181a24]/90 backdrop-blur-sm border border-white/40 dark:border-slate-800/80 shadow-sm p-7 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">État des Services</h3>
                  <div className="size-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 grid place-items-center text-slate-400">
                    <Server className="size-4" />
                  </div>
                </div>
                <div className="space-y-3">
                  {props.services.map((svc) => (
                    <div key={svc.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "size-2 rounded-full",
                          svc.status === 'online' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500"
                        )} />
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200">{svc.name}</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">
                        {svc.type === 'microservice' ? 'Service' : 'Core'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Prochaine session live */}
          <div className="rounded-[24px] bg-gradient-to-br from-indigo-700 to-violet-700 shadow-[0_30px_100px_rgba(79,70,229,0.35)] p-7 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.35),transparent_55%)]" />
            <div className="relative space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-black uppercase tracking-widest text-white/70">Prochaine session live</p>
                <span className="h-7 px-3 rounded-full bg-white/15 border border-white/20 text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-2">
                  <span className="size-2 rounded-full bg-rose-300" /> En direct
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-2xl font-black">Mathématiques 4ème</h4>
                  <p className="text-sm font-bold text-white/80 mt-1">Aujourd&apos;hui à 15:30</p>
                </div>
                <div className="size-14 rounded-full bg-white/15 border border-white/20 grid place-items-center font-black">
                  M
                </div>
              </div>
              <button
                type="button"
                className="w-full h-12 rounded-2xl bg-white text-indigo-700 font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <Video className="size-4" /> Rejoindre la salle
              </button>
            </div>
          </div>

          {/* Évènements */}
          <div className="rounded-[24px] bg-white/85 dark:bg-[#181a24]/90 backdrop-blur-sm border border-white/40 dark:border-slate-800/80 shadow-[0_20px_80px_rgba(15,23,42,0.06)] p-7">
            <div className="flex items-center justify-between">
              <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Évènements à venir</h3>
              <Link href="#" className="text-xs font-black text-indigo-700 dark:text-indigo-400 hover:underline">
                Voir tout
              </Link>
            </div>
            <div className="mt-6 space-y-4">
              {props.events.map((e) => (
                <div
                  key={e.title}
                  className="rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-4"
                >
                  <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 grid place-items-center text-indigo-700 dark:text-indigo-400">
                    <EventIcon name={e.icon} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900 dark:text-white truncate">{e.title}</p>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-400 mt-1">{e.date}</p>
                  </div>
                  <div className="ml-auto">
                    <Pill tone={e.pillTone}>{e.pill}</Pill>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventIcon({ name }: { name: EventIconName }) {
  switch (name) {
    case "meeting":
      return <CalendarIcon className="size-5" />;
    case "exam":
      return <ClipboardList className="size-5" />;
    case "holiday":
      return <Sun className="size-5" />;
  }
}
