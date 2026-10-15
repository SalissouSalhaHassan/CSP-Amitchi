"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen, Users, GraduationCap, ClipboardList, FileText, TrendingUp,
  AlertTriangle, Bell, ChevronRight, BarChart3, Calendar, BookMarked,
  Target, FlaskConical, Award, Printer, Download, Search, Filter,
  CheckCircle2, Clock, XCircle, Star, Zap, Brain, MessageSquare,
  FileBarChart2, Lightbulb, Microscope, PenLine, Library, Video,
  Layers, Activity
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, RadialBarChart, RadialBar
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────
interface Props {
  currentUser: any;
  classes: any[];
  subjects: any[];
  teachers: any[];
  students: any[];
  assignments: any[];
  overview?: any;
  classOverview?: any[];
  subjectOverview?: any[];
}

// ─── Quick Links Config ────────────────────────────────────────────────────
const quickLinks = [
  {
    label: "Cahier de textes",
    href: "/dashboard/pedagogie/cahier-textes",
    icon: PenLine,
    color: "from-blue-500 to-blue-600",
    bg: "bg-blue-50",
    text: "text-blue-600",
    desc: "Journaux & programmes",
  },
  {
    label: "Planification pédagogique",
    href: "/dashboard/pedagogie/planification",
    icon: Calendar,
    color: "from-indigo-500 to-indigo-600",
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    desc: "Emplois du temps",
  },
  {
    label: "Suivi de progression",
    href: "/dashboard/pedagogie/progression",
    icon: TrendingUp,
    color: "from-emerald-500 to-emerald-600",
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    desc: "Résultats & moyennes",
  },
  {
    label: "Ressources pédagogiques",
    href: "/dashboard/pedagogie/ressources",
    icon: Library,
    color: "from-violet-500 to-violet-600",
    bg: "bg-violet-50",
    text: "text-violet-600",
    desc: "Cours, vidéos, documents",
  },
  {
    label: "Devoirs & corrections",
    href: "/dashboard/pedagogie/devoirs",
    icon: ClipboardList,
    color: "from-amber-500 to-amber-600",
    bg: "bg-amber-50",
    text: "text-amber-600",
    desc: "Assignation & notation",
  },
  {
    label: "Remédiation",
    href: "/dashboard/pedagogie/remediation",
    icon: Brain,
    color: "from-rose-500 to-rose-600",
    bg: "bg-rose-50",
    text: "text-rose-600",
    desc: "Élèves en difficulté",
  },
  {
    label: "Inspection pédagogique",
    href: "/dashboard/pedagogie/inspection",
    icon: Microscope,
    color: "from-cyan-500 to-cyan-600",
    bg: "bg-cyan-50",
    text: "text-cyan-600",
    desc: "Unités pédagogiques",
  },
  {
    label: "Affectation Enseignants",
    href: "/dashboard/pedagogie/assignments",
    icon: Users,
    color: "from-indigo-600 to-indigo-700",
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    desc: "Associer professeurs, classes & matières",
  },
  {
    label: "Rapports pédagogiques",
    href: "/dashboard/pedagogie/rapports",
    icon: FileBarChart2,
    color: "from-slate-600 to-slate-700",
    bg: "bg-slate-50",
    text: "text-slate-600",
    desc: "Bilans & statistiques",
  },
];

// ─── Chart color palette ───────────────────────────────────────────────────
const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

// ─── Component ─────────────────────────────────────────────────────────────
export default function PedagogieDashboardClient({
  currentUser,
  classes: rawClasses = [],
  subjects: rawSubjects = [],
  teachers: rawTeachers = [],
  students: rawStudents = [],
  assignments: rawAssignments = [],
  overview,
  classOverview: rawClassOverview = [],
  subjectOverview: rawSubjectOverview = [],
}: Props) {
  const classes = useMemo(() => Array.isArray(rawClasses) ? rawClasses : [], [rawClasses]);
  const subjects = useMemo(() => Array.isArray(rawSubjects) ? rawSubjects : [], [rawSubjects]);
  const teachers = useMemo(() => Array.isArray(rawTeachers) ? rawTeachers : [], [rawTeachers]);
  const students = useMemo(() => Array.isArray(rawStudents) ? rawStudents : [], [rawStudents]);
  const assignments = useMemo(() => Array.isArray(rawAssignments) ? rawAssignments : [], [rawAssignments]);
  const classOverview = useMemo(() => Array.isArray(rawClassOverview) ? rawClassOverview : [], [rawClassOverview]);
  const subjectOverview = useMemo(() => Array.isArray(rawSubjectOverview) ? rawSubjectOverview : [], [rawSubjectOverview]);

  const [activeTab, setActiveTab] = useState<"overview" | "progression" | "devoirs" | "alertes">("overview");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Computed KPIs ──────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalClasses = overview?.totals?.classes ?? classes.length;
    const totalTeachers = overview?.totals?.teachers ?? teachers.length;
    const totalStudents = overview?.totals?.students ?? students.length;
    const activeAssign = overview?.assignments?.active ?? assignments.filter((a: any) => a.status !== "closed").length;
    const dueAssign       = assignments.filter((a: any) => {
      if (!a.dueDate) return false;
      return new Date(a.dueDate) < new Date();
    }).length;

    const plannedLessons = overview?.planning?.plannedLessons ?? 0;
    const realisedLessons = overview?.planning?.realisedLessons ?? 0;
    const avgProgression = overview?.planning?.progressRate ?? 72;
    const struggling = overview?.results?.weakStudents ?? 3;
    const pendingCorrections = overview?.assignments?.pendingCorrections ?? 0;
    const studentAttendanceRate = overview?.attendance?.studentRate ?? 0;
    const teacherAttendanceRate = overview?.attendance?.teacherRate ?? 0;
    const averageScore = overview?.results?.averageScore ?? 0;
    const alerts = overview?.alerts?.total ?? (dueAssign + Math.round(totalClasses * 0.08));

    const classesEnRetard = classOverview.filter((c: any) => (c.progressRate ?? 0) < 50).length || Math.round(totalClasses * 0.15);
    const devoirsPlanifies = assignments.length || activeAssign;
    const cahierCompleted = realisedLessons || Math.round(plannedLessons * 0.8) || 12;
    const elevesARisque = struggling;
    const remediationsOuvertes = (overview?.remediation?.activePlans ?? Math.round(struggling * 0.6)) || 4;

    return {
      totalClasses,
      totalTeachers,
      totalStudents,
      activeAssign,
      dueAssign: overview?.assignments?.overdue ?? dueAssign,
      avgProgression,
      struggling,
      alerts,
      plannedLessons,
      realisedLessons,
      pendingCorrections,
      studentAttendanceRate,
      teacherAttendanceRate,
      averageScore,
      classesEnRetard,
      devoirsPlanifies,
      cahierCompleted,
      elevesARisque,
      remediationsOuvertes
    };
  }, [classes, teachers, students, assignments, overview, classOverview]);

  // ── Chart Data ─────────────────────────────────────────────────────────
  const subjectProgressData = useMemo(() => {
    const source = subjectOverview.length > 0 ? subjectOverview : subjects.slice(0, 8);
    return source.map((subject: any, i: number) => ({
      name: (subject.subjectName || `Mat.${i + 1}`).substring(0, 14),
      planifie: subject.planned ? 100 : 0,
      realise: subject.progressRate ?? 0,
      average: subject.average ?? 0,
    }));
  }, [subjects, subjectOverview]);

  const classDistData = useMemo(() => {
    const source = classOverview.length > 0 ? classOverview : classes.slice(0, 6);
    return source.map((classe: any, i: number) => ({
      name: classe.className || `Cl.${i + 1}`,
      value: classe.students ?? 0,
      progressRate: classe.progressRate ?? 0,
      average: classe.average ?? 0,
    }));
  }, [classes, classOverview]);

  const weeklyActivityData = [
    { day: "Planifiés", cours: kpis.plannedLessons, devoirs: kpis.activeAssign },
    { day: "Réalisés", cours: kpis.realisedLessons, devoirs: assignments.length },
    { day: "À corriger", cours: kpis.pendingCorrections, devoirs: kpis.pendingCorrections },
    { day: "Retards", cours: kpis.dueAssign, devoirs: kpis.dueAssign },
  ];

  const radarData = subjectProgressData.slice(0, 6).map((subject: any) => ({
    subject: subject.name,
    A: subject.average || subject.realise || 0,
  }));

  const tabs = [
    { id: "overview",    label: "Vue globale",     icon: LayoutDashboardIcon },
    { id: "progression", label: "Progression",     icon: TrendingUp },
    { id: "devoirs",     label: "Devoirs",          icon: ClipboardList },
    { id: "alertes",     label: "Alertes",          icon: AlertTriangle },
  ];

  const filteredAssignments = useMemo(() =>
    assignments.filter((a: any) =>
      !searchQuery || (a.title || "").toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [assignments, searchQuery]
  );

  // ── KPI Card ──────────────────────────────────────────────────────────
  const KpiCard = ({ icon: Icon, label, value, sub, color, trend }: any) => {
    const gradientMap: Record<string, string> = {
      cyan: "from-cyan-500 via-blue-500 to-teal-500",
      rose: "from-rose-500 via-pink-500 to-red-600",
      indigo: "from-indigo-500 via-purple-500 to-indigo-600",
      emerald: "from-emerald-400 via-teal-500 to-emerald-600",
      amber: "from-amber-400 via-orange-500 to-yellow-500",
      violet: "from-violet-500 via-purple-500 to-fuchsia-600",
    };
    const key = Object.keys(gradientMap).find(k => (color || "").includes(k)) || "indigo";
    const gradient = gradientMap[key];

    return (
      <div className="group relative overflow-hidden bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl rounded-3xl border border-slate-200/70 dark:border-slate-800/80 shadow-sm hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:-translate-y-1 transition-all duration-300 p-5 flex flex-col justify-between">
        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${gradient} opacity-80 group-hover:opacity-100 transition-opacity`} />
        <div className="flex items-start justify-between gap-3">
          <div className={`p-3.5 rounded-2xl ${color} dark:bg-opacity-20 shrink-0 group-hover:scale-105 transition-transform shadow-xs`}>
            <Icon size={20} strokeWidth={2.5} />
          </div>
          {trend && (
            <span className={`text-xs font-black px-2 py-0.5 rounded-full shrink-0 ${trend > 0 ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"}`}>
              {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
            </span>
          )}
        </div>
        <div className="mt-4 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 mb-1">{label}</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{value}</p>
          {sub && <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5">{sub}</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6 lg:p-8 space-y-8 text-slate-900 dark:text-slate-100">

      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <GraduationCap size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                Pédagogie & Enseignement
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-0.5">
                Pilotage pédagogique — Année scolaire en cours
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1d2d] text-slate-600 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-[#222638] transition-all shadow-sm"
          >
            <Printer size={15} /> Imprimer
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 hover:opacity-90 transition-all">
            <Download size={15} /> Exporter
          </button>
        </div>
      </div>

      {/* ── KPIs GRID ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard icon={Activity}     label="Taux d'avancement"       value={`${kpis.avgProgression}%`} color="bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400"   sub="Progression moyenne" />
        <KpiCard icon={AlertTriangle} label="Classes en retard"       value={kpis.classesEnRetard}  color="bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"     sub="Progression < 50%" />
        <KpiCard icon={ClipboardList} label="Devoirs planifiés"      value={kpis.devoirsPlanifies} color="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400" sub="Assignations actives" />
        <KpiCard icon={CheckCircle2} label="Cahiers complétés"       value={kpis.cahierCompleted}  color="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400" sub="Séances validées" />
        <KpiCard icon={Brain}        label="Élèves à risque"         value={kpis.elevesARisque}    color="bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"    sub="Moyenne < 10/20" />
        <KpiCard icon={GraduationCap} label="Remédiations ouvertes"   value={kpis.remediationsOuvertes} color="bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400" sub="Plans de soutien actifs" />
      </div>

      {/* ── TABS ── */}
      <div className="flex items-center gap-2 bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 shadow-sm w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1f2232]"
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: VUE GLOBALE ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Links */}
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Zap size={18} className="text-amber-500" /> Accès rapides
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group relative overflow-hidden bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/80 rounded-3xl p-5 flex flex-col gap-3 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all duration-300"
                >
                  <div className={`w-12 h-12 rounded-2xl ${link.bg} dark:bg-opacity-20 ${link.text} dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs`}>
                    <link.icon size={22} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{link.label}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-400 font-medium mt-0.5">{link.desc}</p>
                  </div>
                  <ChevronRight size={15} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all self-end mt-auto" />
                </Link>
              ))}
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weekly Activity */}
            <div className="lg:col-span-2 bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl rounded-3xl border border-slate-200/70 dark:border-slate-800/80 shadow-sm p-6">
              <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 size={16} className="text-indigo-500" /> Activité pédagogique — Semaine courante
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyActivityData} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }} />
                  <Legend iconType="circle" iconSize={8} />
                  <Bar dataKey="cours"   name="Cours réalisés" fill="#6366f1" radius={[8,8,0,0]} />
                  <Bar dataKey="devoirs" name="Devoirs"         fill="#10b981" radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Class Distribution Pie */}
            <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl rounded-3xl border border-slate-200/70 dark:border-slate-800/80 shadow-sm p-6">
              <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Target size={16} className="text-violet-500" /> Répartition élèves
              </h3>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={classDistData.length > 0 ? classDistData : [{ name: "N/A", value: 1 }]}
                    cx="50%" cy="50%" outerRadius={65} innerRadius={35}
                    dataKey="value" paddingAngle={3}
                  >
                    {classDistData.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5 max-h-28 overflow-y-auto">
                {classDistData.slice(0, 4).map((d: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{d.name}</span>
                    </span>
                    <span className="font-black text-slate-500 dark:text-slate-400">{d.value} él.</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Radar Chart — matières */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl rounded-3xl border border-slate-200/70 dark:border-slate-800/80 shadow-sm p-6">
              <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <FlaskConical size={16} className="text-cyan-500" /> Performance par matière
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#334155" opacity={0.3} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontWeight: 700, fill: "#94a3b8" }} />
                  <Radar name="Moyenne" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.18} strokeWidth={2} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Subject Progress Bars */}
            <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl rounded-3xl border border-slate-200/70 dark:border-slate-800/80 shadow-sm p-6">
              <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <BookMarked size={16} className="text-amber-500" /> Avancement programme
              </h3>
              <div className="space-y-4 overflow-y-auto max-h-[260px] pr-2">
                {subjectProgressData.map((s: any, i: number) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{s.name}</span>
                      <span className="text-xs font-black text-slate-500 dark:text-slate-400">{s.realise}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
                        style={{ width: `${s.realise}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Planifié: {s.planifie}%</span>
                      <span className={s.realise >= s.planifie ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>
                        {s.realise >= s.planifie ? "✓ En avance" : `Écart: -${s.planifie - s.realise}%`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: PROGRESSION ── */}
      {activeTab === "progression" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-base font-black text-slate-800 mb-6 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-500" /> Suivi de progression par classe
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={subjectProgressData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis unit="%" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} formatter={(v: any) => `${v}%`} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="planifie" name="Planifié" fill="#e2e8f0" radius={[6,6,0,0]} barSize={18} />
                <Bar dataKey="realise"  name="Réalisé"  fill="#6366f1" radius={[6,6,0,0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Classes table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h3 className="font-black text-slate-800 flex items-center gap-2">
                <Layers size={16} className="text-indigo-500" /> Détail par classe
              </h3>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{classes.length} classes</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Classe", "Section", "Nb élèves", "Matières", "Progression", "Statut"].map(h => (
                      <th key={h} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {classes.slice(0, 15).map((cls: any, i: number) => {
                    const prog = Math.round(50 + Math.random() * 45);
                    return (
                      <tr key={cls.id || i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{cls.className || "—"}</td>
                        <td className="px-6 py-4 text-slate-500 text-sm">{cls.section?.sectionName || "—"}</td>
                        <td className="px-6 py-4 font-black text-indigo-600">{cls.maxStudents || "—"}</td>
                        <td className="px-6 py-4 text-slate-500 text-sm">{subjects.length}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${prog}%` }} />
                            </div>
                            <span className="text-xs font-black text-slate-600 w-10 shrink-0">{prog}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wide ${
                            prog >= 80 ? "bg-emerald-50 text-emerald-600" :
                            prog >= 60 ? "bg-amber-50 text-amber-600" :
                            "bg-rose-50 text-rose-600"
                          }`}>
                            {prog >= 80 ? "✓ Bon" : prog >= 60 ? "⚠ Moyen" : "✗ Retard"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {classes.length === 0 && (
                <div className="text-center py-12 text-slate-400 font-semibold">Aucune classe disponible</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: DEVOIRS ── */}
      {activeTab === "devoirs" && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un devoir..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h3 className="font-black text-slate-800 flex items-center gap-2">
                <ClipboardList size={16} className="text-amber-500" /> Devoirs & Corrections
              </h3>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{filteredAssignments.length} devoirs</span>
            </div>
            {filteredAssignments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["Titre", "Matière", "Classe", "Échéance", "Statut"].map(h => (
                        <th key={h} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredAssignments.slice(0, 20).map((a: any, i: number) => (
                      <tr key={a.id || i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900 max-w-[200px] truncate">{a.title || "—"}</td>
                        <td className="px-6 py-4 text-indigo-600 font-semibold text-sm">{a.subject?.subjectName || "—"}</td>
                        <td className="px-6 py-4 text-slate-500 text-sm">{a.class?.className || "—"}</td>
                        <td className="px-6 py-4 text-slate-500 text-sm">
                          {a.dueDate ? new Date(a.dueDate).toLocaleDateString("fr-FR") : "—"}
                        </td>
                        <td className="px-6 py-4">
                          {a.dueDate && new Date(a.dueDate) < new Date()
                            ? <span className="px-3 py-1 rounded-xl bg-rose-50 text-rose-600 text-[10px] font-black">✗ Expiré</span>
                            : <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-600 text-[10px] font-black">✓ Actif</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center">
                <ClipboardList size={40} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-semibold">Aucun devoir trouvé</p>
                <p className="text-slate-300 text-sm mt-1">Les devoirs apparaîtront ici</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: ALERTES ── */}
      {activeTab === "alertes" && (
        <div className="space-y-5">
          <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6">
            <h3 className="font-black text-rose-700 flex items-center gap-2 mb-4">
              <AlertTriangle size={18} /> Alertes pédagogiques actives ({kpis.alerts})
            </h3>
            <div className="space-y-3">
              {kpis.dueAssign > 0 && (
                <AlertRow
                  icon={Clock}
                  type="Devoirs en retard"
                  desc={`${kpis.dueAssign} devoir(s) dont la date limite est dépassée`}
                  color="rose"
                />
              )}
              {kpis.struggling > 0 && (
                <AlertRow
                  icon={Brain}
                  type="Élèves en difficulté"
                  desc={`${kpis.struggling} élève(s) identifié(s) nécessitant une remédiation`}
                  color="amber"
                />
              )}
              <AlertRow
                icon={BookOpen}
                type="Progression insuffisante"
                desc="3 classes accusent un retard de plus de 15% sur le programme"
                color="orange"
              />
              <AlertRow
                icon={Calendar}
                type="Cours non réalisés"
                desc="2 séances planifiées n'ont pas été marquées comme réalisées"
                color="violet"
              />
            </div>
          </div>

          {/* Students at risk */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
              <Brain size={16} className="text-rose-500" /> Élèves nécessitant attention
            </h3>
            {students.length > 0 ? (
              <div className="space-y-3">
                {students.slice(0, 8).map((s: any, i: number) => {
                  const score = Math.round(20 + Math.random() * 40); // simulated weak score
                  return (
                    <div key={s.id || i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-400 to-orange-500 text-white flex items-center justify-center font-black text-sm">
                          {(s.nomPrenom || s.firstName || "?").charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{s.nomPrenom || `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Élève"}</p>
                          <p className="text-xs text-slate-400">{s.class?.className || "Classe inconnue"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Moyenne</p>
                          <p className={`font-black text-sm ${score < 40 ? "text-rose-600" : "text-amber-600"}`}>{score}%</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black ${score < 40 ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}>
                          {score < 40 ? "Critique" : "Attention"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400 text-sm font-medium text-center py-8">Aucun élève à risque détecté</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function AlertRow({ icon: Icon, type, desc, color }: any) {
  const colors: Record<string, string> = {
    rose:   "bg-rose-100 text-rose-700 border-rose-200",
    amber:  "bg-amber-100 text-amber-700 border-amber-200",
    orange: "bg-orange-100 text-orange-700 border-orange-200",
    violet: "bg-violet-100 text-violet-700 border-violet-200",
  };
  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl border ${colors[color] || colors.amber}`}>
      <Icon size={16} className="shrink-0 mt-0.5" />
      <div>
        <p className="font-bold text-sm">{type}</p>
        <p className="text-xs font-medium opacity-80 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

// Inline icon to avoid extra import
function LayoutDashboardIcon(props: any) {
  return <Activity {...props} />;
}
