"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  GraduationCap, 
  Award, 
  TrendingUp, 
  FileText, 
  Printer, 
  Calendar, 
  User, 
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStudentPersonalGradesAction } from "@/domains/academics/actions/academics.actions";
import { generateBulletinPDF, generateReleveNotesPDF } from "@/domains/academics/utils/bulletin-generator";
import { getDocumentHeaderConfig } from "@/domains/settings/actions/settings.actions";
import OfficialDocumentHeader from "@/domains/printing/components/OfficialDocumentHeader";
import { toast } from "sonner";

interface StudentGradesViewProps {
  currentUser: any;
}

export default function StudentGradesView({ currentUser }: StudentGradesViewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [headerConfig, setHeaderConfig] = useState<any>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    async function loadHeader() {
      try {
        const studentLevel = data?.student?.educationalLevel || currentUser?.educationalLevel || data?.class?.level || undefined;
        const res = await getDocumentHeaderConfig(studentLevel);
        if (res?.data) setHeaderConfig(res.data);
      } catch (e) {
        console.warn("Failed to load header config:", e);
      }
    }
    loadHeader();
  }, [data?.student?.educationalLevel, currentUser?.educationalLevel, data?.class?.level]);

  const loadGrades = async (period?: string) => {
    setLoading(true);
    try {
      const res = await getStudentPersonalGradesAction({ period });
      if (res.success && res.data) {
        setData(res.data);
        if (!selectedPeriod && res.data.selectedPeriod) {
          setSelectedPeriod(res.data.selectedPeriod);
        }
      } else {
        toast.error(res.error || "Impossible de charger vos notes.");
      }
    } catch (err: any) {
      toast.error("Erreur de connexion au serveur.");
      console.error("[StudentGradesView] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGrades(selectedPeriod || undefined);
  }, [selectedPeriod]);

  const student = data?.student;
  const grades: any[] = data?.grades || [];
  const summary = data?.summary || { average: 0, rank: "-", mention: "-", decision: "-" };
  const periods: any[] = data?.periods || [];
  const sessionName = data?.session?.name || "2024-2025";
  const className = data?.class?.name || student?.classe || "Classe";
  const eduLevel = student?.educationalLevel || "Lycée";

  const isUniversity = eduLevel.toUpperCase().includes("UNIVERSIT") || 
                       eduLevel.toUpperCase().includes("LICENCE") || 
                       eduLevel.toUpperCase().includes("SUPÉRIEUR") || 
                       eduLevel.toUpperCase().includes("LMD") ||
                       className.toUpperCase().startsWith("L1") ||
                       className.toUpperCase().startsWith("L2") ||
                       className.toUpperCase().startsWith("L3");

  const handleDownloadBulletin = async () => {
    if (!data) return;
    setGeneratingPdf(true);
    try {
      const bulletinPayload = {
        student: {
          id: student.id,
          nomEtudiant: student.nomEtudiant,
          nomArabe: student.nomArabe,
          numAdmission: student.numAdmission,
          classe: className,
          educationalLevel: eduLevel,
          dateNaissance: student.dateNaissance,
          lieuNaissance: student.lieuNaissance,
          sexe: student.sexe,
        },
        session: sessionName,
        term: selectedPeriod || data.selectedPeriod || "Semestre 1",
        results: grades.map((g) => ({
          subjectId: g.subjectId,
          subjectName: g.subjectName,
          subjectCode: g.subjectCode,
          coefficient: g.coefficient,
          classWorkScore: g.classWorkScore,
          examScore: g.examScore,
          totalScore: g.totalScore,
          weightedScore: g.weightedScore,
          rank: g.rank,
          appreciation: g.appreciation,
          observation: g.observation,
        })),
        summary: {
          termAverage: summary.average,
          termRank: summary.rank,
          totalStudents: summary.totalStudents,
          classAverage: summary.classAvg,
          totalWeightedScore: summary.totalPoints,
          totalCoefficients: summary.totalCoef,
          decision: summary.decision,
          mention: summary.mention,
        },
        totalStudents: summary.totalStudents || 30,
        branchInfo: headerConfig?.branchInfo || null,
        headerConfig,
      };

      if (isUniversity) {
        await generateReleveNotesPDF(bulletinPayload);
      } else {
        await generateBulletinPDF(bulletinPayload);
      }
      toast.success("Bulletin de notes officiel généré avec succès !");
    } catch (err: any) {
      console.error("[generateBulletin] Error:", err);
      toast.error("Erreur lors de la génération du bulletin PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Official Header Preview */}
      {headerConfig && (
        <div className="bg-white text-slate-900 border border-slate-200 rounded-2xl p-6 shadow-sm">
          <OfficialDocumentHeader config={headerConfig} variant="compact" />
        </div>
      )}

      {/* 1. Header & Identity Card */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 p-6 md:p-8 text-white shadow-xl"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="size-16 md:size-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner text-white">
              <GraduationCap className="size-8 md:size-10 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs font-semibold px-2.5 py-0.5">
                  <ShieldCheck className="size-3.5 mr-1 text-emerald-400 inline" />
                  Espace Personnel Sécurisé
                </Badge>
                <Badge variant="outline" className="text-white/80 border-white/20 text-xs">
                  {sessionName}
                </Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-black mt-1 tracking-tight">
                {student?.nomEtudiant || currentUser?.name || "Mes Notes & Résultats"}
              </h1>
              <p className="text-sm text-indigo-200 mt-1 flex flex-wrap items-center gap-3">
                <span><strong>Classe :</strong> {className}</span>
                <span>•</span>
                <span><strong>Niveau :</strong> {eduLevel}</span>
                <span>•</span>
                <span><strong>Matricule :</strong> {student?.numAdmission || currentUser?.username || "N/A"}</span>
              </p>
            </div>
          </div>

          {/* Action Download & Verification Buttons */}
          <div className="flex items-center flex-wrap gap-3">
            <Link
              href={`/verify/${encodeURIComponent(student?.numAdmission || student?.id || currentUser?.username || "345")}`}
              target="_blank"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg hover:shadow-emerald-500/20 rounded-xl px-4 h-12 flex items-center gap-2 text-xs transition-all border border-emerald-400/40"
            >
              <ShieldCheck className="size-4 text-slate-950" />
              <span>Vérifier l&apos;Authenticité (Portail Public)</span>
            </Link>

            <Button
              onClick={handleDownloadBulletin}
              disabled={generatingPdf || loading || grades.length === 0}
              className="bg-amber-400 hover:bg-amber-300 text-indigo-950 font-black shadow-lg hover:shadow-amber-400/20 rounded-xl px-5 h-12 flex items-center gap-2 text-sm transition-all"
            >
              {generatingPdf ? (
                <span className="flex items-center gap-2">
                  <Clock className="size-4 animate-spin" /> Génération en cours...
                </span>
              ) : (
                <>
                  <Printer className="size-4" />
                  <span>{isUniversity ? "Télécharger le Relevé LMD (PDF)" : "Télécharger Mon Bulletin (PDF)"}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-16 -top-16 size-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 size-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      </motion.div>

      {/* 2. Period Switcher */}
      {periods.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2 flex items-center gap-1">
            <Calendar className="size-3.5" /> Période d&apos;évaluation :
          </span>
          {periods.map((p) => {
            const isSelected = selectedPeriod === p.name;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPeriod(p.name)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                }`}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Moyenne Générale */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Moyenne Générale</span>
            <TrendingUp className="size-4 text-indigo-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-black ${summary.average >= 10 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {summary.average ? summary.average.toFixed(2) : "0.00"}
            </span>
            <span className="text-xs text-slate-400 font-bold">/ 20</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Moyenne de classe : <strong>{summary.classAvg ? summary.classAvg.toFixed(2) : "12.00"}</strong>
          </p>
        </motion.div>

        {/* Rang */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Rang dans la classe</span>
            <Award className="size-4 text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-500">
              {summary.rank || "1er"}
            </span>
            {summary.totalStudents > 0 && (
              <span className="text-xs text-slate-400 font-bold">/ {summary.totalStudents} élèves</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Position officielle</p>
        </motion.div>

        {/* Mention */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Mention Académique</span>
            <Sparkles className="size-4 text-purple-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {summary.mention || (summary.average >= 16 ? "Très Bien" : summary.average >= 14 ? "Bien" : summary.average >= 12 ? "Assez Bien" : summary.average >= 10 ? "Passable" : "Insuffisant")}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Appréciation globale</p>
        </motion.div>

        {/* Décision / Statut */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Décision du Conseil</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <div className="mt-3">
            <span className={`text-lg font-black ${summary.average >= 10 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {summary.decision || (summary.average >= 10 ? (isUniversity ? "Semestre Validé" : "Admis(e)") : (isUniversity ? "Rattrapage" : "À surveiller"))}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Total Points : <strong>{summary.totalPoints || 0}</strong> (Coef: {summary.totalCoef || 1})
          </p>
        </motion.div>
      </div>

      {/* 4. Grades Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-indigo-600" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Détail des Notes par Matière
            </h2>
          </div>
          <Badge variant="outline" className="text-xs font-bold">
            {grades.length} Matière(s) évaluée(s)
          </Badge>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Clock className="size-8 animate-spin text-indigo-600 mb-3" />
            <p className="text-sm font-semibold">Chargement de vos résultats sécurisés...</p>
          </div>
        ) : grades.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <AlertCircle className="size-10 mx-auto text-amber-500 mb-2 opacity-60" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Aucune note publiée pour cette période</h3>
            <p className="text-xs text-slate-400 mt-1">Les résultats pour cette période n&apos;ont pas encore été validés par l&apos;administration.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3.5 px-4">{isUniversity ? "Code & Intitulé de l'UE" : "Matière"}</th>
                  <th className="py-3.5 px-3 text-center">{isUniversity ? "Contrôle Continu" : "Devoir / Éval"}</th>
                  <th className="py-3.5 px-3 text-center">{isUniversity ? "Examen Final" : "Composition"}</th>
                  <th className="py-3.5 px-3 text-center font-black text-indigo-900 dark:text-indigo-300">Moyenne /20</th>
                  <th className="py-3.5 px-3 text-center">{isUniversity ? "Crédits (ECTS)" : "Coef"}</th>
                  <th className="py-3.5 px-3 text-center">{isUniversity ? "Résultat" : "Points"}</th>
                  <th className="py-3.5 px-3 text-center">Rang</th>
                  <th className="py-3.5 px-4">Appréciation de l&apos;enseignant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-200">
                {grades.map((g, idx) => {
                  const moy = g.totalScore ? Number(g.totalScore) : 0;
                  const isPass = moy >= 10;
                  return (
                    <tr key={idx} className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          {g.subjectCode && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                              {g.subjectCode}
                            </span>
                          )}
                          <span>{g.subjectName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300">
                        {g.classWorkScore !== null ? Number(g.classWorkScore).toFixed(1) : "-"}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300">
                        {g.examScore !== null ? Number(g.examScore).toFixed(1) : "-"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-lg font-black text-xs ${
                          isPass 
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400" 
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"
                        }`}>
                          {moy.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-500">
                        {g.coefficient}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold">
                        {isUniversity ? (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                            isPass ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          }`}>
                            {isPass ? "VALIDÉ" : "NON VALIDÉ"}
                          </span>
                        ) : (
                          g.weightedScore?.toFixed(2) || (moy * g.coefficient).toFixed(2)
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-500">
                        {g.rank || "-"}
                      </td>
                      <td className="py-3 px-4 text-xs italic text-slate-500 dark:text-slate-400">
                        {g.appreciation || (isPass ? "Bon travail" : "Doit redoubler d'efforts")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
