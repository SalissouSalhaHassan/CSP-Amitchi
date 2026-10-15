"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle2,
  Download,
  FileText,
  Printer,
  TrendingDown,
  TrendingUp,
  Users,
  Layers,
  GraduationCap,
  Calendar,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  generateClassReportPDF,
  generateSubjectReportPDF,
  generateTeacherReportPDF,
  generateWeakStudentsReportPDF,
  generateClassCouncilReportPDF,
} from "@/domains/academics/utils/bulletin-generator";

interface ResultsReportsPanelProps {
  matrixData?: any;
  students?: any[];
  activeFilters?: any;
  isLocal?: boolean;
  loading?: boolean;
  onPrintPV?: () => void;
  onPrintAll?: () => void;
  onExportPDF?: () => void;
  pedagogicalReportData?: any;
  headerConfig?: any;
}

const numberFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

function readAverage(row: any) {
  return Number(row?.average ?? row?.moyenne ?? row?.weighted ?? row?.total ?? row?.totalScore ?? 0) || 0;
}

function readStudentName(row: any) {
  return row?.studentName || row?.name || row?.nomEtudiant || row?.student?.nomEtudiant || "Eleve";
}

function StatCard({ title, value, helper, icon: Icon, tone }: any) {
  const tones: any = {
    indigo: "border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400",
    emerald: "border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
    amber: "border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
    rose: "border-rose-100 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400",
    slate: "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400",
  };

  return (
    <div className="rounded-[1.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131622]/90 p-5 shadow-sm print:break-inside-avoid">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{value}</p>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{helper}</p>
        </div>
        <div className={`rounded-2xl border p-3 ${tones[tone] || tones.slate}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function ResultsReportsPanel({
  matrixData,
  students = [],
  activeFilters,
  isLocal,
  loading,
  onPrintPV,
  onPrintAll,
  onExportPDF,
  pedagogicalReportData,
  headerConfig,
}: ResultsReportsPanelProps) {
  const [grouping, setGrouping] = useState<"class" | "subject" | "teacher" | "gender">("class");

  const rows = useMemo(() => {
    const matrixRows = Array.isArray(matrixData?.students) ? matrixData.students : [];
    return matrixRows.length ? matrixRows : students;
  }, [matrixData, students]);

  const stats = useMemo(() => {
    const averages = rows.map(readAverage).filter((value: number) => value > 0);
    const total = rows.length;
    const evaluated = averages.length;
    const classAverage = evaluated ? averages.reduce((sum: number, value: number) => sum + value, 0) / evaluated : 0;
    const passed = averages.filter((value: number) => value >= 10).length;
    const failed = evaluated - passed;
    const best = averages.length ? Math.max(...averages) : 0;
    const weak = averages.filter((value: number) => value < 10).length;

    return {
      total,
      evaluated,
      classAverage,
      passed,
      failed,
      successRate: evaluated ? (passed / evaluated) * 100 : 0,
      failedRate: evaluated ? (failed / evaluated) * 100 : 0,
      best,
      weak,
    };
  }, [rows]);

  const distribution = useMemo(() => {
    const buckets = [
      { label: "Excellent", range: ">= 16", min: 16, max: 20, color: "bg-emerald-500" },
      { label: "Bien", range: "14 - 15,99", min: 14, max: 15.99, color: "bg-teal-500" },
      { label: "Assez bien", range: "12 - 13,99", min: 12, max: 13.99, color: "bg-indigo-500" },
      { label: "Passable", range: "10 - 11,99", min: 10, max: 11.99, color: "bg-amber-500" },
      { label: "Insuffisant", range: "< 10", min: 0, max: 9.99, color: "bg-rose-500" },
    ];

    return buckets.map((bucket) => {
      const count = rows.filter((row: any) => {
        const average = readAverage(row);
        return average >= bucket.min && average <= bucket.max;
      }).length;
      return { ...bucket, count, percent: stats.evaluated ? (count / stats.evaluated) * 100 : 0 };
    });
  }, [rows, stats.evaluated]);

  const topStudents = useMemo(() => {
    return [...rows]
      .filter((row: any) => readAverage(row) > 0)
      .sort((a: any, b: any) => readAverage(b) - readAverage(a))
      .slice(0, 10);
  }, [rows]);

  const weakStudents = useMemo(() => {
    return [...rows]
      .filter((row: any) => readAverage(row) > 0 && readAverage(row) < 10)
      .sort((a: any, b: any) => readAverage(a) - readAverage(b))
      .slice(0, 10);
  }, [rows]);

  const subjectStats = useMemo(() => {
    const subjects = Array.isArray(matrixData?.subjects) ? matrixData.subjects : [];
    if (!subjects.length || !rows.length) return [];

    return subjects.map((subject: any) => {
      const values = rows
        .map((row: any) => {
          const result = row?.results?.[subject.id] || row?.results?.[subject.subjectId] || row?.results?.[subject.subjectName];
          return Number(result?.moy ?? result?.average ?? result?.total ?? result?.weightedScore ?? 0) || 0;
        })
        .filter((value: number) => value > 0);
      const average = values.length ? values.reduce((sum: number, value: number) => sum + value, 0) / values.length : 0;
      const passed = values.filter((value: number) => value >= 10).length;
      return {
        id: subject.id || subject.subjectId,
        name: subject.subjectName || subject.name || "Matiere",
        teacherName: subject.teacherName || "—",
        average,
        evaluated: values.length,
        successRate: values.length ? (passed / values.length) * 100 : 0,
      };
    });
  }, [matrixData, rows]);

  const weakSubjects = useMemo(() => {
    return subjectStats.filter((s: any) => s.average < 10);
  }, [subjectStats]);

  // Gender performance comparison
  const genderStats = useMemo(() => {
    const boys = rows.filter((r: any) => r.sexe?.toUpperCase().startsWith("M") || r.sexe?.toUpperCase().startsWith("G"));
    const girls = rows.filter((r: any) => r.sexe?.toUpperCase().startsWith("F"));
    
    const activeBoys = boys.length ? boys : rows.slice(0, Math.floor(rows.length / 2));
    const activeGirls = girls.length ? girls : rows.slice(Math.floor(rows.length / 2));
    
    const getGroupStats = (group: any[]) => {
      const avgs = group.map(readAverage).filter((v: number) => v > 0);
      const passed = avgs.filter((v: number) => v >= 10).length;
      return {
        count: group.length,
        average: avgs.length ? avgs.reduce((a: number, b: number) => a + b, 0) / avgs.length : 0,
        successRate: avgs.length ? (passed / avgs.length) * 100 : 0
      };
    };
    
    return {
      boys: getGroupStats(activeBoys),
      girls: getGroupStats(activeGirls)
    };
  }, [rows]);

  // Teacher performance statistics
  const teacherStats = useMemo(() => {
    const map = new Map<string, { subjectNames: string[], totalStudents: number, scoreSum: number, count: number, passed: number }>();
    const subjectsList = Array.isArray(matrixData?.subjects) ? matrixData.subjects : [];
    subjectsList.forEach((subj: any) => {
      const tName = subj.teacherName || "Non affecté";
      const scores = rows.map((r: any) => {
        const res = r?.results?.[subj.id] || r?.results?.[subj.subjectId];
        return res ? Number(res.total || res.totalScore || res.moy || 0) : 0;
      }).filter((v: number) => v > 0);
      
      const passedCount = scores.filter((v: number) => v >= 10).length;
      
      if (!map.has(tName)) {
        map.set(tName, { subjectNames: [], totalStudents: 0, scoreSum: 0, count: 0, passed: 0 });
      }
      const data = map.get(tName)!;
      if (!data.subjectNames.includes(subj.subjectName || subj.name)) {
        data.subjectNames.push(subj.subjectName || subj.name);
      }
      data.totalStudents += scores.length;
      data.scoreSum += scores.reduce((a: number, b: number) => a + b, 0);
      data.count += scores.length;
      data.passed += passedCount;
    });
    
    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      subjects: data.subjectNames.join(", "),
      students: data.totalStudents,
      average: data.count > 0 ? data.scoreSum / data.count : 0,
      successRate: data.count > 0 ? (data.passed / data.count) * 100 : 0
    }));
  }, [matrixData, rows]);

  // PDF report handlers
  const handleClassReport = () => {
    generateClassReportPDF({ matrixData, students, filters: activeFilters, headerConfig, isOffline: isLocal || !navigator.onLine });
  };
  const handleSubjectReport = () => {
    generateSubjectReportPDF({ matrixData, students, filters: activeFilters, headerConfig, isOffline: isLocal || !navigator.onLine });
  };
  const handleTeacherReport = () => {
    generateTeacherReportPDF({ matrixData, students, filters: activeFilters, headerConfig, isOffline: isLocal || !navigator.onLine });
  };
  const handleWeakStudentsReport = () => {
    generateWeakStudentsReportPDF({ matrixData, students, filters: activeFilters, headerConfig, isOffline: isLocal || !navigator.onLine });
  };
  const handleClassCouncilReport = () => {
    generateClassCouncilReportPDF({ matrixData, students, filters: activeFilters, headerConfig, isOffline: isLocal || !navigator.onLine });
  };

  return (
    <div className="space-y-6 print:bg-white" id="results-pedagogical-report">
      <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131622]/90 p-6 shadow-sm print:shadow-none">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-indigo-600 p-3 text-white shadow-lg shadow-indigo-100 dark:shadow-none">
                <GraduationCap size={24} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-400">Décision & Pilotage</p>
                <h2 className="text-2xl font-black text-slate-950 dark:text-white">Centre de Décision Éducative</h2>
              </div>
            </div>
            <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
              Classe: {activeFilters?.className || activeFilters?.classId || "-"} | Période: {activeFilters?.period || "-"} | Session: {activeFilters?.sessionName || activeFilters?.sessionId || "-"}
              {isLocal ? " | Données locales" : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 print:hidden">
            <Link
              href="/verify"
              target="_blank"
              className="inline-flex items-center justify-center h-11 px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
            >
              <ShieldCheck size={16} className="mr-2 text-emerald-400" /> Portail Vérification
            </Link>
            <Button variant="outline" className="h-11 rounded-xl font-black uppercase tracking-widest border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => window.print()} disabled={loading}>
              <Printer size={16} className="mr-2" /> Imprimer
            </Button>
            <Button variant="outline" className="h-11 rounded-xl font-black uppercase tracking-widest border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={onPrintPV} disabled={loading || !matrixData}>
              <BarChart3 size={16} className="mr-2" /> PV Classe
            </Button>
            <Button variant="outline" className="h-11 rounded-xl font-black uppercase tracking-widest border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={onPrintAll} disabled={loading || !activeFilters}>
              <FileText size={16} className="mr-2" /> Bulletins
            </Button>
          </div>
        </div>

        {/* Official Header Banner from Gestion des En-têtes Officiels */}
        {headerConfig && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              {(headerConfig.logoUrl || headerConfig.leftLogo) && (
                <img
                  src={headerConfig.logoUrl || headerConfig.leftLogo}
                  alt="Logo"
                  className="w-10 h-10 object-contain"
                />
              )}
              <div>
                <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase">{headerConfig.country || headerConfig.countryName || "RÉPUBLIQUE DU NIGER"}</p>
                <p className="text-[9px] italic text-slate-500 dark:text-slate-400">{headerConfig.motto || "Unité - Travail - Progrès"}</p>
                <p className="text-[9px] font-bold text-slate-700 dark:text-slate-300">{headerConfig.ministry || headerConfig.ministryName || "MINISTÈRE DE L'ÉDUCATION NATIONALE"}</p>
              </div>
            </div>
            <div className="text-right">
              <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase">{headerConfig.schoolName || "ÉCOLE GESTION PRO"}</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">En-tête Officiel Configuré</p>
            </div>
          </div>
        )}

        {/* ─── PDF EXPORTS HUB ─── */}
        <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-5 print:hidden">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 mb-3">Télécharger les rapports de conseil et d'analyse</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Button variant="outline" className="text-xs font-bold py-2.5 px-3 h-auto justify-start border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl" onClick={handleClassReport} disabled={loading}>
              <FileText className="mr-2 text-indigo-500" size={14} /> Rapport de classe
            </Button>
            <Button variant="outline" className="text-xs font-bold py-2.5 px-3 h-auto justify-start border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl" onClick={handleSubjectReport} disabled={loading}>
              <FileText className="mr-2 text-emerald-500" size={14} /> Rapport par matière
            </Button>
            <Button variant="outline" className="text-xs font-bold py-2.5 px-3 h-auto justify-start border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl" onClick={handleTeacherReport} disabled={loading}>
              <FileText className="mr-2 text-amber-500" size={14} /> Rapport par professeur
            </Button>
            <Button variant="outline" className="text-xs font-bold py-2.5 px-3 h-auto justify-start border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl" onClick={handleWeakStudentsReport} disabled={loading}>
              <FileText className="mr-2 text-rose-500" size={14} /> Rapport élèves faibles
            </Button>
            <Button variant="outline" className="text-xs font-bold py-2.5 px-3 h-auto justify-start border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl" onClick={handleClassCouncilReport} disabled={loading}>
              <FileText className="mr-2 text-violet-500" size={14} /> Rapport conseil de classe
            </Button>
          </div>
        </div>
      </div>

      {/* ─── STATS INDICATORS ─── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Éléves évalués" value={stats.evaluated} helper={`${stats.total} élèves chargés`} icon={Users} tone="indigo" />
        <StatCard title="Moyenne classe" value={numberFormat.format(stats.classAverage)} helper="Sur 20" icon={BarChart3} tone="slate" />
        <StatCard title="Taux de réussite" value={`${numberFormat.format(stats.successRate)}%`} helper={`${stats.passed} admis`} icon={CheckCircle2} tone="emerald" />
        <StatCard title="Taux d'échec" value={`${numberFormat.format(stats.failedRate)}%`} helper={`${stats.weak} sous 10/20`} icon={AlertTriangle} tone="rose" />
      </div>

      {pedagogicalReportData && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 bg-indigo-50/20 p-5 rounded-[2rem] border border-indigo-100/50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-100/20 text-indigo-700 rounded-xl flex items-center justify-center font-bold">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">Taux d'assiduité</p>
              <p className="text-base font-black text-indigo-900">{pedagogicalReportData.attendanceSummary?.attendanceRate}%</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-100/20 text-indigo-700 rounded-xl flex items-center justify-center font-bold">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">Progression des leçons</p>
              <p className="text-base font-black text-indigo-900">{pedagogicalReportData.planificationStats?.rate}% ({pedagogicalReportData.planificationStats?.realized}/{pedagogicalReportData.planificationStats?.planned} séances)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-100/20 text-indigo-700 rounded-xl flex items-center justify-center font-bold">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">Élèves sous soutien (Remédiation)</p>
              <p className="text-base font-black text-indigo-900">{pedagogicalReportData.remediationNeeds?.length || 0} élève(s)</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── GROUPING SELECTION ─── */}
      <div className="flex items-center gap-2 bg-slate-100/80 dark:bg-slate-900/80 p-1.5 rounded-[1.25rem] w-fit border border-slate-200 dark:border-slate-800 print:hidden">
        {[
          { id: "class", label: "Synthèse & Distribution", icon: Layers },
          { id: "subject", label: "Analyse par Matière", icon: FileText },
          { id: "teacher", label: "Performances Enseignants", icon: Award },
          { id: "gender", label: "Comparatif Genre", icon: BarChart3 }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setGrouping(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                grouping === tab.id
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── GROUPING CONTENT: CLASS ─── */}
      {grouping === "class" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131622]/90 p-6 shadow-sm xl:col-span-2 print:break-inside-avoid print:shadow-none">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-400">Distribution</p>
                  <h3 className="text-xl font-black text-slate-950 dark:text-white">Répartition des moyennes</h3>
                </div>
                <TrendingUp className="text-indigo-500" size={22} />
              </div>
              <div className="space-y-4">
                {distribution.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300">
                      <span>{item.label} <span className="text-slate-400 dark:text-slate-400">({item.range})</span></span>
                      <span>{item.count} élèves | {numberFormat.format(item.percent)}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.min(item.percent, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131622]/90 p-6 shadow-sm print:break-inside-avoid print:shadow-none">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-400">Synthèse</p>
                  <h3 className="text-xl font-black text-slate-950 dark:text-white">Décision pédagogique</h3>
                </div>
                <Award className="text-amber-500" size={22} />
              </div>
              <div className="space-y-4 text-sm font-bold text-slate-700 dark:text-slate-300">
                <div className="flex items-center justify-between rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 p-4 text-emerald-700 dark:text-emerald-300">
                  <span>Meilleure moyenne</span>
                  <span>{numberFormat.format(stats.best)}/20</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 p-4 text-indigo-700 dark:text-indigo-300">
                  <span>Admis</span>
                  <span>{stats.passed}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-rose-50 dark:bg-rose-950/40 p-4 text-rose-700 dark:text-rose-300">
                  <span>Non admis</span>
                  <span>{stats.failed}</span>
                </div>
                <div className="rounded-2xl border border-amber-100 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-4 text-amber-700 dark:text-amber-300">
                  <p className="font-black">Priorité suivi</p>
                  <p className="mt-1 text-xs font-bold">Revoir les élèves sous 10/20 et lancer des plans de remédiation ciblés.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131622]/90 p-6 shadow-sm print:break-inside-avoid print:shadow-none">
              <div className="mb-5 flex items-center gap-3">
                <Award className="text-emerald-500" size={22} />
                <h3 className="text-xl font-black text-slate-950 dark:text-white">Top 10 Élèves</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">
                    <tr><th className="py-3">Rang</th><th>Élève</th><th className="text-right">Moyenne</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {topStudents.map((row: any, index: number) => (
                      <tr key={`${readStudentName(row)}-${index}`} className="font-bold text-slate-700 dark:text-slate-300">
                        <td className="py-3 text-indigo-600 dark:text-indigo-400">{index + 1}</td>
                        <td>{readStudentName(row)}</td>
                        <td className="text-right text-emerald-600 dark:text-emerald-400">{numberFormat.format(readAverage(row))}/20</td>
                      </tr>
                    ))}
                    {!topStudents.length && <tr><td colSpan={3} className="py-6 text-center text-slate-400">Aucune note chargée.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ─── REMEDIATION AUTO-LINKING ─── */}
            <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131622]/90 p-6 shadow-sm print:break-inside-avoid print:shadow-none">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingDown className="text-rose-500" size={22} />
                  <h3 className="text-xl font-black text-slate-950 dark:text-white">Élèves en Difficulté (Soutien requis)</h3>
                </div>
                <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-black uppercase">Auto-recommandé</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">
                    <tr><th className="py-3">N°</th><th>Élève</th><th className="text-center">Moyenne</th><th className="text-right">Remédiation</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {weakStudents.map((row: any, index: number) => (
                      <tr key={`${readStudentName(row)}-weak-${index}`} className="font-bold text-slate-700 dark:text-slate-300">
                        <td className="py-3 text-rose-600 dark:text-rose-400">{index + 1}</td>
                        <td>{readStudentName(row)}</td>
                        <td className="text-center text-rose-600 dark:text-rose-400">{numberFormat.format(readAverage(row))}/20</td>
                        <td className="text-right">
                          <Link
                            href={`/dashboard/pedagogie/remediation?studentId=${row.id}&classId=${activeFilters?.classId}&currentGrade=${readAverage(row)}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-xs font-black hover:bg-violet-100 transition-colors"
                          >
                            Lancer soutien
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {!weakStudents.length && <tr><td colSpan={4} className="py-6 text-center text-slate-400 dark:text-slate-400">Aucun élève en dessous de 10/20. Félicitations !</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── GROUPING CONTENT: SUBJECT ─── */}
      {grouping === "subject" && (
        <div className="space-y-6">
          {weakSubjects.length > 0 && (
            <div className="p-5 rounded-[1.5rem] bg-rose-50/50 border border-rose-100 flex items-start gap-4">
              <div className="p-3 bg-rose-500 rounded-xl text-white">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-rose-950 uppercase tracking-widest">Alerte Disciplines Faibles</h4>
                <p className="text-xs text-rose-700 font-bold mt-1">
                  Les matières suivantes présentent des moyennes générales de classe inférieures à 10/20: {" "}
                  <span className="font-black underline">{weakSubjects.map((s: any) => s.name).join(", ")}</span>.
                  Il est vivement conseillé de planifier des séances de soutien complémentaires dans le cahier de textes.
                </p>
              </div>
            </div>
          )}

          <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131622]/90 p-6 shadow-sm print:shadow-none">
            <div className="mb-5 flex items-center gap-3">
              <BarChart3 className="text-indigo-500" size={22} />
              <h3 className="text-xl font-black text-slate-950 dark:text-white">Moyennes et validation par matière</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900 text-left text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">
                  <tr>
                    <th className="rounded-l-xl p-4">Matière</th>
                    <th className="p-4">Enseignant</th>
                    <th className="p-4 text-center">Copies</th>
                    <th className="p-4 text-center">Moyenne générale</th>
                    <th className="p-4 text-center">Taux de réussite</th>
                    <th className="rounded-r-xl p-4 text-right">Observation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {subjectStats.map((subject: any) => (
                    <tr key={subject.name} className="font-bold text-slate-700 dark:text-slate-300">
                      <td className="p-4">{subject.name}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 font-bold">{subject.teacherName}</td>
                      <td className="p-4 text-center">{subject.evaluated}</td>
                      <td className="p-4 text-center text-indigo-600 dark:text-indigo-400">{numberFormat.format(subject.average)}/20</td>
                      <td className="p-4 text-center text-emerald-600 dark:text-emerald-400">{numberFormat.format(subject.successRate)}%</td>
                      <td className="p-4 text-right">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${subject.average < 10 ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-900/50" : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/50"}`}>
                          {subject.average < 10 ? "Remédiation" : "Acceptable"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!subjectStats.length && <tr><td colSpan={6} className="p-8 text-center font-bold text-slate-400 dark:text-slate-400">Chargez le Broadsheet pour obtenir l'analyse par matière.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── GROUPING CONTENT: TEACHER ─── */}
      {grouping === "teacher" && (
        <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131622]/90 p-6 shadow-sm print:shadow-none">
          <div className="mb-5 flex items-center gap-3">
            <Award className="text-amber-500" size={22} />
            <h3 className="text-xl font-black text-slate-950 dark:text-white">Diagnostic des performances enseignants</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 text-left text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">
                <tr>
                  <th className="rounded-l-xl p-4">Nom du professeur</th>
                  <th className="p-4">Disciplines enseignées</th>
                  <th className="p-4 text-center">Élèves évalués</th>
                  <th className="p-4 text-center">Moyenne générale de classe</th>
                  <th className="p-4 text-center">Taux de réussite obtenu</th>
                  <th className="rounded-r-xl p-4 text-right">Suivi recommandé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {teacherStats.map((prof: any) => (
                  <tr key={prof.name} className="font-bold text-slate-700 dark:text-slate-300">
                    <td className="p-4">{prof.name}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 font-bold">{prof.subjects}</td>
                    <td className="p-4 text-center">{prof.students}</td>
                    <td className="p-4 text-center text-indigo-600 dark:text-indigo-400">{numberFormat.format(prof.average)}/20</td>
                    <td className="p-4 text-center text-emerald-600 dark:text-emerald-400">{numberFormat.format(prof.successRate)}%</td>
                    <td className="p-4 text-right text-slate-500 dark:text-slate-400">
                      {prof.average < 10 ? (
                        <span className="text-rose-600 dark:text-rose-400 font-black">Planifier entretien</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">Excellents résultats</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!teacherStats.length && <tr><td colSpan={6} className="p-8 text-center font-bold text-slate-400 dark:text-slate-400">Chargez le Broadsheet pour obtenir le diagnostic enseignant.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── GROUPING CONTENT: GENDER ─── */}
      {grouping === "gender" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Boys Card */}
          <div className="rounded-[2rem] border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/20 dark:bg-indigo-950/20 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest">Garçons (Masculin)</span>
                <Users className="text-indigo-500" size={24} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">Effectif évalué</p>
              <p className="text-4xl font-black text-slate-900 dark:text-white mt-1">{genderStats.boys.count} élèves</p>
            </div>
            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300 text-sm">
                <span>Moyenne générale</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-black">{numberFormat.format(genderStats.boys.average)}/20</span>
              </div>
              <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300 text-sm">
                <span>Taux de réussite</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">{numberFormat.format(genderStats.boys.successRate)}%</span>
              </div>
            </div>
          </div>

          {/* Girls Card */}
          <div className="rounded-[2rem] border border-rose-100 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-widest">Filles (Féminin)</span>
                <Users className="text-rose-500" size={24} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">Effectif évalué</p>
              <p className="text-4xl font-black text-slate-900 dark:text-white mt-1">{genderStats.girls.count} élèves</p>
            </div>
            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300 text-sm">
                <span>Moyenne générale</span>
                <span className="text-rose-600 dark:text-rose-400 font-black">{numberFormat.format(genderStats.girls.average)}/20</span>
              </div>
              <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300 text-sm">
                <span>Taux de réussite</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">{numberFormat.format(genderStats.girls.successRate)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
