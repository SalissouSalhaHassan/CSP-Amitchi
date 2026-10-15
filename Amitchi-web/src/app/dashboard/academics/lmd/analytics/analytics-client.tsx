"use client";

import React, { useState } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  FileDown, 
  PieChart, 
  Layers, 
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Calendar,
  Filter,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { QualityAnalyticsData } from "@/domains/academics/actions/lmd-analytics.actions";
import { generateQualityAuditReportPDF } from "@/domains/academics/utils/lmd-quality-audit-generator";

export function AnalyticsClient({ initialData }: { initialData: QualityAnalyticsData }) {
  const [selectedYear, setSelectedYear] = useState("2025-2026");
  const [isExporting, setIsExporting] = useState(false);

  const m = initialData.metrics;

  const handleExportAuditPDF = async () => {
    try {
      setIsExporting(true);
      await generateQualityAuditReportPDF({
        institution: {
          name: "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES",
          countryName: "RÉPUBLIQUE DU NIGER",
          ministryName: "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE",
          facultyName: "FACULTÉ DES SCIENCES & TECHNIQUES",
          city: "Niamey",
          academicYear: selectedYear,
        },
        metrics: m,
        uePerformances: initialData.uePerformances,
        gradeDistribution: initialData.gradeDistribution,
      });
      toast.success("Rapport d'audit qualité généré avec succès");
    } catch (e) {
      toast.error("Erreur lors de la génération du rapport PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <BarChart3 className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                Statistiques &amp; Pilotage Qualité LMD
              </h1>
              <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-emerald-200 dark:border-emerald-800">
                Norme ANAQ-Sup • CAMES
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Tableau de bord d'évaluation de la performance pédagogique, rendement des ECTS et analyse de vulnérabilité par UE.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="h-11 px-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="2025-2026">Année 2025-2026</option>
            <option value="2024-2025">Année 2024-2025</option>
          </select>

          <Button
            onClick={handleExportAuditPDF}
            disabled={isExporting}
            className="h-11 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 shadow-md shadow-emerald-500/20"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            {isExporting ? "Génération en cours..." : "Rapport d'Audit (PDF)"}
          </Button>
        </div>
      </div>

      {/* ─── 4 MAIN KPI CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Taux Global de Réussite</p>
            <span className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{m.overallPassRate.toFixed(1)}%</p>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Admis &amp; Enjambement (&ge; 45 ECTS)</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Impact Session 2 (Rattrapage)</p>
            <span className="h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">+{m.session2RecoveryRate.toFixed(1)}%</p>
          <p className="text-[11px] font-bold text-slate-400 mt-1">De récupération des ajournés de S1</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Moyenne Générale (MGC)</p>
            <span className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Award className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{m.averageGpa.toFixed(2)} <span className="text-sm font-semibold text-slate-400">/ 20</span></p>
          <p className="text-[11px] font-bold text-indigo-600 mt-1">Cohorte de {m.totalStudents} étudiants</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Volume ECTS Capitalisé</p>
            <span className="h-8 w-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-purple-600 dark:text-purple-400 mt-2">{m.totalEctsAwarded} <span className="text-sm font-semibold text-slate-400">ECTS</span></p>
          <p className="text-[11px] font-bold text-slate-400 mt-1">Crédits validés sur le cycle</p>
        </div>
      </div>

      {/* ─── SECTION 2: UE PERFORMANCE TABLE & GRADE DISTRIBUTION ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* UE Performance Breakdown (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Rendement par Unité d'Enseignement (UE)</h3>
              <p className="text-xs text-slate-400">Taux de réussite et détection des matières à risque</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Code &amp; Intitulé UE</th>
                  <th className="py-3.5 px-5 text-center">Crédits</th>
                  <th className="py-3.5 px-5 text-center">Moyenne</th>
                  <th className="py-3.5 px-5">Taux de Réussite</th>
                  <th className="py-3.5 px-5 text-right">Vulnérabilité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {initialData.uePerformances.map((ue) => (
                  <tr key={ue.codeUe} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono font-bold text-[10px] text-slate-700 dark:text-slate-300">
                          {ue.codeUe}
                        </span>
                        <p className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{ue.nameUe}</p>
                      </div>
                    </td>

                    <td className="py-4 px-5 text-center font-bold text-indigo-600 dark:text-indigo-400">
                      {ue.creditsEcts} ECTS
                    </td>

                    <td className="py-4 px-5 text-center font-semibold text-slate-800 dark:text-slate-200">
                      {ue.averageGrade.toFixed(2)} / 20
                    </td>

                    <td className="py-4 px-5">
                      <div className="w-36 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-slate-600 dark:text-slate-300">{ue.passRate.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              ue.passRate >= 80 ? "bg-emerald-500" : ue.passRate >= 70 ? "bg-amber-500" : "bg-rose-500"
                            }`}
                            style={{ width: `${ue.passRate}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5 text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        ue.failureRisk === "Faible"
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          : ue.failureRisk === "Modéré"
                          ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                          : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                      }`}>
                        {ue.failureRisk === "Élevé" && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {ue.failureRisk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ECTS International Grade Distribution (1 col) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Échelle ECTS Européenne / CAMES</h3>
            <p className="text-xs text-slate-400">Distribution relative de la cohorte</p>
          </div>

          <div className="space-y-3">
            {initialData.gradeDistribution.map((g) => (
              <div key={g.grade} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                      {g.grade}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{g.label}</span>
                  </div>
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{g.percentage.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${g.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── SECTION 3: PROGRAM BREAKDOWN TABLE ─── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-black text-slate-900 dark:text-white">Comparatif de Performance par Filière / Mention</h3>
          <p className="text-xs text-slate-400">Rapport de pilotage pour l'évaluation interne de la faculté</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Programme / Filière LMD</th>
                <th className="py-3.5 px-5 text-center">Effectif Étudiants</th>
                <th className="py-3.5 px-5 text-center">Moyenne Générale</th>
                <th className="py-3.5 px-5 text-center">Taux de Réussite</th>
                <th className="py-3.5 px-5 text-right">Statut Qualité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {initialData.programBreakdown.map((prog) => (
                <tr key={prog.programName} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-5 font-bold text-slate-900 dark:text-white">
                    {prog.programName}
                  </td>
                  <td className="py-4 px-5 text-center font-bold text-slate-700 dark:text-slate-300">
                    {prog.totalStudents}
                  </td>
                  <td className="py-4 px-5 text-center font-semibold text-slate-800 dark:text-slate-200">
                    {prog.averageGpa.toFixed(2)} / 20
                  </td>
                  <td className="py-4 px-5 text-center font-black text-emerald-600 dark:text-emerald-400">
                    {prog.passRate.toFixed(1)} %
                  </td>
                  <td className="py-4 px-5 text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      Conforme CAMES
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
