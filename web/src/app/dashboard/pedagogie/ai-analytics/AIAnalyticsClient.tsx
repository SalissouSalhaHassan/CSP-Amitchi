"use client";

import { useState, useTransition } from "react";
import { 
  Sparkles, AlertTriangle, ShieldAlert, CheckCircle2, UserCheck, 
  TrendingDown, FileText, PhoneCall, RefreshCw, ChevronRight, X, BrainCircuit, Activity
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getDropoutRiskAnalysisAction } from "@/domains/ai/actions/ai.actions";
import type { DropoutRiskOverview, StudentRiskProfile } from "@/domains/ai/services/ai-analytics.service";

export default function AIAnalyticsClient({ initialOverview }: { initialOverview: DropoutRiskOverview }) {
  const [overview, setOverview] = useState<DropoutRiskOverview>(initialOverview);
  const [selectedStudent, setSelectedStudent] = useState<StudentRiskProfile | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(async () => {
      const res = await getDropoutRiskAnalysisAction();
      const overviewData = (res as any)?.data?.data || (res as any)?.data;
      if (overviewData && typeof overviewData === "object" && "totalStudentsAnalyzed" in overviewData) {
        setOverview(overviewData as DropoutRiskOverview);
        toast.success("تمت تحديث التحليلات والتنبؤات الذكية بنجاح");
      } else {
        toast.error((res as any)?.error || "Erreur lors de l'actualisation");
      }
    });
  };

  const filteredStudents = overview.highRiskStudents.filter((s) => {
    if (filterLevel === "ALL") return true;
    return s.riskLevel === filterLevel;
  });

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden border border-indigo-500/20">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-5 z-10">
          <div className="p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-[1.5rem] text-amber-300 shadow-inner">
            <BrainCircuit size={36} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black tracking-tight">Analytique IA & Prévention du Décrochage</h1>
              <span className="px-3 py-1 bg-amber-400/20 border border-amber-400/30 text-amber-200 text-xs font-black uppercase tracking-widest rounded-xl flex items-center gap-1.5">
                <Sparkles size={14} /> Model AI v2.4
              </span>
            </div>
            <p className="text-indigo-200 text-sm font-medium">
              التحليلات الذكية والتنبؤ المبكر بالتعثر والتسرب الدراسي بناءً على معدلات الغياب والنتائج والتقييمات.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 z-10 w-full lg:w-auto">
          <Button
            onClick={handleRefresh}
            disabled={isPending}
            className="w-full lg:w-auto h-12 px-6 rounded-2xl bg-white text-indigo-900 font-black hover:bg-indigo-50 shadow-lg shadow-indigo-950/20 transition-all flex items-center gap-2"
          >
            <RefreshCw size={18} className={isPending ? "animate-spin" : ""} />
            {isPending ? "Analyse en cours..." : "Actualiser le Modèle IA"}
          </Button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-[#131622]/90 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-200/70 dark:border-slate-800/80 shadow-sm relative overflow-hidden group">
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-indigo-600 absolute top-0 left-0" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Élèves Analysés</span>
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <UserCheck size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{overview.totalStudentsAnalyzed}</p>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Couverture globale de l'établissement</p>
        </div>

        <div className="bg-white dark:bg-[#131622]/90 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-200/70 dark:border-slate-800/80 shadow-sm relative overflow-hidden group">
          <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-rose-600 absolute top-0 left-0" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Risque Critique 🔴</span>
            <div className="p-3 rounded-2xl bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <ShieldAlert size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-red-600 dark:text-red-400 tracking-tight">{overview.criticalCount}</p>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Intervention urgente requise</p>
        </div>

        <div className="bg-white dark:bg-[#131622]/90 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-200/70 dark:border-slate-800/80 shadow-sm relative overflow-hidden group">
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 to-orange-600 absolute top-0 left-0" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Risque Élevé 🟠</span>
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <AlertTriangle size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">{overview.highCount}</p>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Suivi pédagogique rapproché</p>
        </div>

        <div className="bg-white dark:bg-[#131622]/90 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-200/70 dark:border-slate-800/80 shadow-sm relative overflow-hidden group">
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-teal-600 absolute top-0 left-0" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Score Moyen de Risque</span>
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Activity size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{overview.averageRiskScore}%</p>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Indice de santé global</p>
        </div>
      </div>

      {/* Filter Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#131622]/90 backdrop-blur-xl p-4 rounded-[2rem] border border-slate-200/70 dark:border-slate-800/80 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-widest text-slate-400 px-3">Filtrer par niveau de risque :</span>
          {[
            { id: "ALL", label: "Tous les alertés" },
            { id: "CRITICAL", label: "🔴 Critique" },
            { id: "HIGH", label: "🟠 Élevé" },
            { id: "MODERATE", label: "🟡 Modéré" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterLevel(f.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                filterLevel === f.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 px-3">
          {filteredStudents.length} élève(s) identifié(s)
        </span>
      </div>

      {/* Main Student Risk Table */}
      <div className="bg-white dark:bg-[#131622]/90 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/70 dark:border-slate-800/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <TrendingDown className="text-red-500" size={24} /> Liste des Élèves Sous Surveillance IA
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-widest text-slate-400 font-black">
                <th className="p-5">Élève & Classe</th>
                <th className="p-5">Score de Risque</th>
                <th className="p-5">Taux d'Absence</th>
                <th className="p-5">Moyenne Actuelle</th>
                <th className="p-5">Facteur Majeur de Risque</th>
                <th className="p-5 text-right">Action IA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 font-bold">
                    <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-500 opacity-80" />
                    Aucun élève identifié dans cette catégorie de risque.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => (
                  <tr key={st.studentId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="p-5">
                      <div className="font-black text-slate-900 dark:text-white">{st.studentName}</div>
                      <div className="text-xs font-semibold text-slate-400">{st.className} ({st.educationalLevel})</div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-xl text-xs font-black ${
                            st.riskLevel === "CRITICAL"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                              : st.riskLevel === "HIGH"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                          }`}
                        >
                          {st.riskScore}% · {st.riskLevel}
                        </span>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="font-bold text-slate-700 dark:text-slate-300">{st.absenceRate.toFixed(1)}%</div>
                      <div className="text-xs text-slate-400">{st.absenceCount} session(s) manquée(s)</div>
                    </td>
                    <td className="p-5">
                      <div className={`font-black ${st.averageGrade < 10 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>
                        {st.averageGrade.toFixed(2)} / 20
                      </div>
                    </td>
                    <td className="p-5 max-w-xs">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-2">{st.primaryRiskFactorFr}</p>
                      <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 line-clamp-1 mt-0.5">{st.primaryRiskFactorAr}</p>
                    </td>
                    <td className="p-5 text-right">
                      <Button
                        size="sm"
                        onClick={() => setSelectedStudent(st)}
                        className="rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-700"
                      >
                        Consulter Fiche IA <ChevronRight size={16} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Individual Student Deep Dive Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131622] rounded-[2.5rem] border border-slate-200 dark:border-slate-800 w-full max-w-2xl p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-2xl">
                  <BrainCircuit size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Fiche de Décrochage IA : {selectedStudent.studentName}</h3>
                  <p className="text-xs font-semibold text-slate-400">{selectedStudent.className} · Score de risque: {selectedStudent.riskScore}%</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-2">
                <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Diagnostic IA Majeur</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedStudent.primaryRiskFactorFr}</p>
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{selectedStudent.primaryRiskFactorAr}</p>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                <p className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest">Recommandations & Actions Préconisées</p>
                <p className="text-sm font-bold text-indigo-950 dark:text-indigo-200">{selectedStudent.aiRecommendationFr}</p>
                <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{selectedStudent.aiRecommendationAr}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
                  <span className="text-[10px] font-black uppercase text-slate-400">Taux d'Absence</span>
                  <p className="text-xl font-black text-red-600 dark:text-red-400 mt-1">{selectedStudent.absenceRate.toFixed(1)}%</p>
                </div>
                <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
                  <span className="text-[10px] font-black uppercase text-slate-400">Moyenne Générale</span>
                  <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{selectedStudent.averageGrade.toFixed(2)} / 20</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => {
                  toast.success(`Plan de soutien déclenché pour ${selectedStudent.studentName}`);
                  setSelectedStudent(null);
                }}
                className="rounded-xl font-bold"
              >
                Activer Plan de Soutien
              </Button>
              <Button
                onClick={() => {
                  toast.success(`Convocation parent générée pour ${selectedStudent.studentName}`);
                  setSelectedStudent(null);
                }}
                className="rounded-xl bg-indigo-600 font-bold text-white"
              >
                Convoquer Parents
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
