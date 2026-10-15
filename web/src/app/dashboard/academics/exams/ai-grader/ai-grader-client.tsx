"use client";

import * as React from "react";
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Save,
  RotateCw,
  Edit3,
  FileText,
  User,
  BookOpen,
  Award,
  ChevronRight,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { saveCameraGradedResult } from "@/domains/academics/actions/ai-camera-grader.actions";

interface Exam {
  id: number;
  examName: string;
  maxMarks: number;
  class?: { id: number; className: string };
  subject?: { id: number; subjectName: string };
}

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  admissionNumber?: string;
  classId?: number;
}

interface GradedQuestion {
  questionNumber: number;
  questionText?: string;
  detectedStudentAnswer: string;
  expectedAnswer?: string;
  isCorrect: boolean;
  scoreAwarded: number;
  maxScore: number;
  explanation: string;
}

interface AiResult {
  detectedStudentName?: string;
  detectedMatricule?: string;
  matchedStudentId?: number;
  totalScore: number;
  maxMarks: number;
  percentage: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  questions: GradedQuestion[];
}

interface Props {
  schoolId: number;
  exams: Exam[];
  classes: any[];
  students: Student[];
}

export default function AiCameraGraderClient({ schoolId, exams, classes, students }: Props) {
  const [selectedExamId, setSelectedExamId] = React.useState<string>(exams[0]?.id ? String(exams[0].id) : "");
  const [selectedStudentId, setSelectedStudentId] = React.useState<string>("");
  const [answerKey, setAnswerKey] = React.useState<string>("");
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [imageBase64, setImageBase64] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [result, setResult] = React.useState<AiResult | null>(null);
  const [saveSuccess, setSaveSuccess] = React.useState<boolean>(false);
  const [adjustedScore, setAdjustedScore] = React.useState<number | null>(null);

  const selectedExam = exams.find((e) => String(e.id) === selectedExamId);
  const filteredStudents = selectedExam?.class?.id
    ? students.filter((s) => s.classId === selectedExam.class?.id)
    : students;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl);
      setResult(null);
      setSaveSuccess(false);
    };
    reader.readAsDataURL(file);
  };

  const handleGrade = async () => {
    if (!imageBase64) return;
    setLoading(true);
    setSaveSuccess(false);

    try {
      const response = await fetch("/api/exams/ai/grade-camera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          examId: selectedExamId ? Number(selectedExamId) : undefined,
          studentId: selectedStudentId ? Number(selectedStudentId) : undefined,
          answerKey: answerKey.trim() || undefined,
          subjectName: selectedExam?.subject?.subjectName,
          maxMarks: selectedExam?.maxMarks || 20,
        }),
      });

      const json = await response.json();
      if (json.success && json.data) {
        setResult(json.data);
        setAdjustedScore(json.data.totalScore);
        if (json.data.matchedStudentId && !selectedStudentId) {
          setSelectedStudentId(String(json.data.matchedStudentId));
        }
      } else {
        alert(json.error || "Erreur de traitement par l'IA");
      }
    } catch (err: any) {
      alert("Erreur réseau lors de la communication avec le serveur IA.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const targetStudentId = selectedStudentId || (result?.matchedStudentId ? String(result.matchedStudentId) : null);
    if (!selectedExamId || !targetStudentId) {
      alert("Veuillez sélectionner l'examen et l'élève pour enregistrer la note.");
      return;
    }

    setSaving(true);
    try {
      const res = await saveCameraGradedResult({
        examId: Number(selectedExamId),
        studentId: Number(targetStudentId),
        schoolId,
        marksObtained: adjustedScore ?? (result?.totalScore || 0),
        remarks: result?.feedback || "Corrigé par IA Caméra",
        detailedAnalysis: result,
        notifyParent: true,
      });

      if (res.success) {
        setSaveSuccess(true);
      } else {
        alert(res.error || "Erreur d'enregistrement.");
      }
    } catch (err) {
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md">
              <Sparkles className="size-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Correcteur d&apos;Examens IA Caméra
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Numérisez ou téléversez les copies manuscrites et QCM pour une correction et notation instantanée.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload & Configuration */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 shadow-sm space-y-5">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <BookOpen className="size-4 text-indigo-600" /> Paramètres de l&apos;Examen
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                  Examen ciblé
                </label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Sélectionner un examen --</option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.examName} ({exam.class?.className || "Classe"} - {exam.subject?.subjectName || "Matière"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                  Élève associé (Optionnel si écrit sur la copie)
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Détection automatique par l&apos;IA --</option>
                  {filteredStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.admissionNumber || `ID ${s.id}`})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                  Corrigé type / Barème spécifique (Optionnel)
                </label>
                <textarea
                  rows={2}
                  value={answerKey}
                  onChange={(e) => setAnswerKey(e.target.value)}
                  placeholder="Ex : 1: A, 2: C, 3: x=12, 4: Vrai..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Image Upload Dropzone */}
          <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/50 dark:bg-indigo-950/20 p-6 text-center space-y-4">
            {imagePreview ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-64 flex items-center justify-center bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Copie d'examen"
                    className="max-h-64 object-contain"
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 cursor-pointer hover:underline">
                  <RotateCw className="size-3.5" /> Changer l&apos;image
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
            ) : (
              <div>
                <div className="mx-auto size-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 mb-3">
                  <Camera className="size-6" />
                </div>
                <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  Téléversez ou photographiez la copie
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Prend en charge les formats JPG, PNG, WEBP (manuscrit ou QCM)
                </p>
                <label className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 cursor-pointer transition-colors">
                  <Upload className="size-4" /> Sélectionner un fichier
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
            )}
          </div>

          {/* Grade Button */}
          <button
            onClick={handleGrade}
            disabled={!imageBase64 || loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 font-semibold text-white shadow-lg hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Analyse & Correction IA en cours...
              </>
            ) : (
              <>
                <Sparkles className="size-5" />
                Lancer la Correction Intelligente
              </>
            )}
          </button>
        </div>

        {/* Right Column: AI Analysis Results */}
        <div className="lg:col-span-7 space-y-6">
          {result ? (
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm overflow-hidden space-y-6">
              {/* Header Card */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                    Résultat de l&apos;Évaluation
                  </span>
                  <h3 className="text-xl font-bold mt-1">
                    {result.detectedStudentName || "Élève Détecté"}
                  </h3>
                  {result.detectedMatricule && (
                    <p className="text-xs text-slate-300 mt-0.5">Matricule: {result.detectedMatricule}</p>
                  )}
                </div>

                <div className="text-right">
                  <div className="inline-flex items-baseline gap-1 bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max={result.maxMarks}
                      value={adjustedScore ?? result.totalScore}
                      onChange={(e) => setAdjustedScore(parseFloat(e.target.value) || 0)}
                      className="w-16 bg-transparent text-2xl font-black text-white text-right focus:outline-none focus:bg-white/20 rounded px-1"
                    />
                    <span className="text-slate-300 font-semibold">/ {result.maxMarks}</span>
                  </div>
                  <p className="text-xs text-emerald-400 font-semibold mt-1">
                    {((adjustedScore ?? result.totalScore) / result.maxMarks * 100).toFixed(1)}% de réussite
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Feedback Box */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 dark:border-indigo-900/30 dark:bg-indigo-950/20 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-semibold text-sm">
                    <TrendingUp className="size-4" /> Appréciation Pédagogique
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {result.feedback}
                  </p>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-indigo-100 dark:border-indigo-900/30">
                    <div>
                      <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mb-1">
                        <CheckCircle2 className="size-3.5" /> Points Forts
                      </p>
                      <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5 list-disc list-inside">
                        {result.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 mb-1">
                        <AlertCircle className="size-3.5" /> Axes d&apos;amélioration
                      </p>
                      <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5 list-disc list-inside">
                        {result.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Questions Breakdown */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                    Détail par Question
                  </h4>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {result.questions?.map((q, idx) => (
                      <div
                        key={idx}
                        className={`rounded-xl border p-3.5 flex items-start justify-between gap-3 text-sm ${
                          q.isCorrect
                            ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                            : "border-rose-200 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20"
                        }`}
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            {q.isCorrect ? (
                              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                            ) : (
                              <XCircle className="size-4 text-rose-600 shrink-0" />
                            )}
                            <span className="font-semibold">Question {q.questionNumber}</span>
                            {q.questionText && (
                              <span className="text-xs text-slate-500 truncate max-w-xs">
                                — {q.questionText}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Réponse élève : <span className="font-medium text-slate-800 dark:text-slate-200">{q.detectedStudentAnswer}</span>
                            {q.expectedAnswer && !q.isCorrect && (
                              <span className="text-emerald-700 dark:text-emerald-400 ml-2">(Attendu : {q.expectedAnswer})</span>
                            )}
                          </p>
                          {q.explanation && (
                            <p className="text-xs text-slate-500 italic mt-0.5">{q.explanation}</p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`font-bold text-sm ${q.isCorrect ? "text-emerald-600" : "text-rose-600"}`}>
                            +{q.scoreAwarded} / {q.maxScore}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save to Gradebook Actions */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                  {saveSuccess ? (
                    <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                      <CheckCircle2 className="size-5" /> Note enregistrée avec succès dans le carnet !
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Vous pouvez ajuster la note manuellement ci-dessus avant de confirmer.
                    </p>
                  )}

                  <button
                    onClick={handleSave}
                    disabled={saving || saveSuccess}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Enregistrement...
                      </>
                    ) : saveSuccess ? (
                      <>
                        <CheckCircle2 className="size-4" /> Enregistré
                      </>
                    ) : (
                      <>
                        <Save className="size-4" /> Enregistrer dans le carnet
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-12 text-center space-y-4">
              <div className="mx-auto size-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <FileText className="size-8" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                En attente d&apos;analyse
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Chargez une copie d&apos;examen à gauche puis cliquez sur « Lancer la Correction » pour voir l&apos;analyse détaillée de l&apos;IA.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
