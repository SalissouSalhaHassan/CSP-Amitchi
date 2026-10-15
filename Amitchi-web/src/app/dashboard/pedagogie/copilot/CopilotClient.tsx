"use client";

import React, { useState, useTransition } from "react";
import { useTheme } from "@/hooks/use-theme";
import {
  Sparkles,
  BookOpen,
  HelpCircle,
  MessageSquareQuote,
  Copy,
  Check,
  Send,
  Loader2,
  BrainCircuit,
  GraduationCap,
  Layers,
  FileText,
  Clock,
  Award,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  generateLessonPlanAction,
  generateQuizAction,
  generateStudentAppreciationAction,
} from "@/domains/pedagogie/actions/copilot.actions";

export function CopilotClient({
  classes,
  subjects,
}: {
  classes: Array<{ id: number; className: string }>;
  subjects: Array<{ id: number; subjectName: string }>;
}) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<"lesson" | "quiz" | "appreciation">("lesson");
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  // Lesson Plan Form State
  const [lessonSubject, setLessonSubject] = useState(subjects[0]?.subjectName || "Mathématiques");
  const [lessonLevel, setLessonLevel] = useState(classes[0]?.className || "Terminale S");
  const [lessonTopic, setLessonTopic] = useState("");
  const [lessonDuration, setLessonDuration] = useState("60");
  const [lessonObjectives, setLessonObjectives] = useState("");
  const [lessonResult, setLessonResult] = useState<string | null>(null);

  // Quiz Form State
  const [quizSubject, setQuizSubject] = useState(subjects[0]?.subjectName || "Sciences Physiques");
  const [quizLevel, setQuizLevel] = useState(classes[0]?.className || "Terminale");
  const [quizTopic, setQuizTopic] = useState("");
  const [quizCount, setQuizCount] = useState("5");
  const [quizDifficulty, setQuizDifficulty] = useState<"facile" | "moyen" | "difficile">("moyen");
  const [quizResult, setQuizResult] = useState<string | null>(null);

  // Appreciation Form State
  const [apprStudent, setApprStudent] = useState("");
  const [apprSubject, setApprSubject] = useState(subjects[0]?.subjectName || "Français");
  const [apprScore, setApprScore] = useState("13.5");
  const [apprAttitude, setApprAttitude] = useState<"tres_attentif" | "moyen" | "bavard" | "progression">("progression");
  const [apprResult, setApprResult] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copié dans le presse-papier !");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTopic.trim()) {
      toast.error("Veuillez saisir le titre ou thème du cours.");
      return;
    }

    startTransition(async () => {
      const res = await generateLessonPlanAction({
        subject: lessonSubject,
        level: lessonLevel,
        topic: lessonTopic,
        durationMinutes: Number(lessonDuration) || 60,
        objectives: lessonObjectives,
      });

      if (res.success && res.data) {
        setLessonResult(res.data.content);
        toast.success("Fiche pédagogique générée avec succès !");
      } else {
        toast.error("Erreur lors de la génération.");
      }
    });
  };

  const handleGenerateQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTopic.trim()) {
      toast.error("Veuillez saisir le sujet du QCM.");
      return;
    }

    startTransition(async () => {
      const res = await generateQuizAction({
        subject: quizSubject,
        level: quizLevel,
        topic: quizTopic,
        questionCount: Number(quizCount) || 5,
        difficulty: quizDifficulty,
      });

      if (res.success && res.data) {
        setQuizResult(res.data.content);
        toast.success("QCM généré avec succès !");
      } else {
        toast.error("Erreur lors de la génération.");
      }
    });
  };

  const handleGenerateAppreciation = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await generateStudentAppreciationAction({
        studentName: apprStudent,
        subject: apprSubject,
        score: Number(apprScore) || 10,
        attitude: apprAttitude,
      });

      if (res.success && res.data) {
        setApprResult(res.data.content);
        toast.success("Propositions d'appréciations générées !");
      } else {
        toast.error("Erreur lors de la génération.");
      }
    });
  };

  return (
    <div className={`p-6 sm:p-8 space-y-8 min-h-screen transition-colors duration-200 ${isDark ? "dark bg-[#0B0F17] text-slate-100" : "bg-[#f8f9fc] text-slate-900"} animate-in fade-in duration-500`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
              <BrainCircuit className="text-indigo-600 dark:text-indigo-400 w-9 h-9" />
              Copilot Pédagogique IA
            </h1>
            <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-none text-[10px] font-black uppercase tracking-wider">
              Forfait Enterprise
            </Badge>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-semibold mt-1 text-sm">
            Assistant intelligent pour la préparation de cours, création d'évaluations et synthèses de bulletins.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-200/60 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("lesson")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "lesson"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <BookOpen size={15} />
            Plans de Cours
          </button>
          <button
            onClick={() => setActiveTab("quiz")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "quiz"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <HelpCircle size={15} />
            QCM & Devoirs
          </button>
          <button
            onClick={() => setActiveTab("appreciation")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "appreciation"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <MessageSquareQuote size={15} />
            Appréciations Bulletins
          </button>
        </div>
      </div>

      {/* TAB 1: LESSON PLANNER */}
      {activeTab === "lesson" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Card className="lg:col-span-5 border border-slate-200/80 dark:border-slate-800 rounded-[2.5rem] bg-white dark:bg-[#111827] shadow-sm">
            <CardHeader className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="text-indigo-600" size={20} />
                Générateur de Fiches de Cours
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Spécifiez la matière, le niveau et les objectifs pour générer un déroulé pédagogique complet.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleGenerateLesson} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Matière</label>
                    <input
                      type="text"
                      value={lessonSubject}
                      onChange={(e) => setLessonSubject(e.target.value)}
                      className="w-full h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-bold text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Classe / Niveau</label>
                    <input
                      type="text"
                      value={lessonLevel}
                      onChange={(e) => setLessonLevel(e.target.value)}
                      className="w-full h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-bold text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Thème / Titre de la leçon</label>
                  <input
                    type="text"
                    value={lessonTopic}
                    onChange={(e) => setLessonTopic(e.target.value)}
                    placeholder="Ex: Les Équations Différentielles du 1er Ordre"
                    className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-bold text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Durée (minutes)</label>
                  <select
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(e.target.value)}
                    className="w-full h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-bold text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes (1 heure)</option>
                    <option value="90">90 minutes (1h30)</option>
                    <option value="120">120 minutes (2 heures)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Objectifs spécifiques (facultatif)</label>
                  <textarea
                    value={lessonObjectives}
                    onChange={(e) => setLessonObjectives(e.target.value)}
                    placeholder="Ex: Mettre l'accent sur les applications en physique et la résolution graphique."
                    className="w-full h-24 bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-medium text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 gap-2 cursor-pointer"
                >
                  {isPending ? <Loader2 className="animate-spin size-4" /> : <Sparkles size={16} />}
                  Générer le Plan de Cours
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Results Display */}
          <Card className="lg:col-span-7 border border-slate-200/80 dark:border-slate-800 rounded-[2.5rem] bg-white dark:bg-[#111827] shadow-sm flex flex-col justify-between overflow-hidden">
            <CardHeader className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-slate-900 dark:text-white">
                  Fiche Pédagogique Générée
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Prête à être imprimée ou copiée dans votre cahier de textes.
                </CardDescription>
              </div>
              {lessonResult && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(lessonResult)}
                  className="rounded-xl font-bold text-xs gap-1.5 dark:border-slate-700"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  {copied ? "Copié" : "Copier"}
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6 sm:p-8 flex-1 overflow-y-auto max-h-[600px]">
              {lessonResult ? (
                <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap">
                  {lessonResult}
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400">
                  <BrainCircuit className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-700 animate-pulse" />
                  <p className="font-bold text-sm text-slate-600 dark:text-slate-400">Prêt à assister vos préparations</p>
                  <p className="text-xs max-w-xs mt-1">Remplissez les détails à gauche pour recevoir un plan de cours personnalisé et conforme au programme.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: QUIZ GENERATOR */}
      {activeTab === "quiz" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Card className="lg:col-span-5 border border-slate-200/80 dark:border-slate-800 rounded-[2.5rem] bg-white dark:bg-[#111827] shadow-sm">
            <CardHeader className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="text-indigo-600" size={20} />
                Générateur de QCM & Quiz
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Générez des questions à choix multiples avec corrigés et explications détaillées.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleGenerateQuiz} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Matière</label>
                    <input
                      type="text"
                      value={quizSubject}
                      onChange={(e) => setQuizSubject(e.target.value)}
                      className="w-full h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-bold text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Classe / Niveau</label>
                    <input
                      type="text"
                      value={quizLevel}
                      onChange={(e) => setQuizLevel(e.target.value)}
                      className="w-full h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-bold text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sujet d'évaluation</label>
                  <input
                    type="text"
                    value={quizTopic}
                    onChange={(e) => setQuizTopic(e.target.value)}
                    placeholder="Ex: La Révolution Industrielle & Conséquences"
                    className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-bold text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre de questions</label>
                    <select
                      value={quizCount}
                      onChange={(e) => setQuizCount(e.target.value)}
                      className="w-full h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-bold text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="3">3 Questions</option>
                      <option value="5">5 Questions</option>
                      <option value="10">10 Questions</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Niveau de difficulté</label>
                    <select
                      value={quizDifficulty}
                      onChange={(e: any) => setQuizDifficulty(e.target.value)}
                      className="w-full h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-bold text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="facile">Facile</option>
                      <option value="moyen">Moyen / Standard</option>
                      <option value="difficile">Avancé / Examen</option>
                    </select>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 gap-2 cursor-pointer"
                >
                  {isPending ? <Loader2 className="animate-spin size-4" /> : <Zap size={16} />}
                  Générer le QCM
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-7 border border-slate-200/80 dark:border-slate-800 rounded-[2.5rem] bg-white dark:bg-[#111827] shadow-sm flex flex-col justify-between overflow-hidden">
            <CardHeader className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-slate-900 dark:text-white">
                  QCM & Grille de Correction
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Questions à choix multiples avec justification des réponses.
                </CardDescription>
              </div>
              {quizResult && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(quizResult)}
                  className="rounded-xl font-bold text-xs gap-1.5 dark:border-slate-700"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  {copied ? "Copié" : "Copier"}
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6 sm:p-8 flex-1 overflow-y-auto max-h-[600px]">
              {quizResult ? (
                <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap">
                  {quizResult}
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400">
                  <HelpCircle className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-700 animate-pulse" />
                  <p className="font-bold text-sm text-slate-600 dark:text-slate-400">Création instantanée d'évaluations</p>
                  <p className="text-xs max-w-xs mt-1">Configurez le sujet à gauche pour générer un contrôle ou devoir sur table avec corrigé type.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: APPRECIATIONS & REPORT CARDS */}
      {activeTab === "appreciation" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Card className="lg:col-span-5 border border-slate-200/80 dark:border-slate-800 rounded-[2.5rem] bg-white dark:bg-[#111827] shadow-sm">
            <CardHeader className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquareQuote className="text-indigo-600" size={20} />
                Synthèse d'Appréciations de Bulletins
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Générez 3 propositions personnalisées (Formelle, Bienveillante, Amélioration).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleGenerateAppreciation} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nom de l'élève (facultatif)</label>
                  <input
                    type="text"
                    value={apprStudent}
                    onChange={(e) => setApprStudent(e.target.value)}
                    placeholder="Ex: Mariam Diallo"
                    className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-bold text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Matière</label>
                    <input
                      type="text"
                      value={apprSubject}
                      onChange={(e) => setApprSubject(e.target.value)}
                      className="w-full h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-bold text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Moyenne (/ 20)</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max="20"
                      value={apprScore}
                      onChange={(e) => setApprScore(e.target.value)}
                      className="w-full h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-bold text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comportement & Dynamique</label>
                  <select
                    value={apprAttitude}
                    onChange={(e: any) => setApprAttitude(e.target.value)}
                    className="w-full h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-bold text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="tres_attentif">Très attentif et rigoureux</option>
                    <option value="progression">En constante progression</option>
                    <option value="moyen">Régulier mais timide</option>
                    <option value="bavard">Potentiel certain mais dissipé</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 gap-2 cursor-pointer"
                >
                  {isPending ? <Loader2 className="animate-spin size-4" /> : <Award size={16} />}
                  Générer les Appréciations
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-7 border border-slate-200/80 dark:border-slate-800 rounded-[2.5rem] bg-white dark:bg-[#111827] shadow-sm flex flex-col justify-between overflow-hidden">
            <CardHeader className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-slate-900 dark:text-white">
                  Propositions d'Appréciations
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Choisissez et insérez l'appréciation la plus adaptée au bulletin.
                </CardDescription>
              </div>
              {apprResult && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(apprResult)}
                  className="rounded-xl font-bold text-xs gap-1.5 dark:border-slate-700"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  {copied ? "Copié" : "Copier"}
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6 sm:p-8 flex-1 overflow-y-auto max-h-[600px]">
              {apprResult ? (
                <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap">
                  {apprResult}
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400">
                  <MessageSquareQuote className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-700 animate-pulse" />
                  <p className="font-bold text-sm text-slate-600 dark:text-slate-400">Rapports & Bulletins Sans Effort</p>
                  <p className="text-xs max-w-xs mt-1">Saisissez la note de l'élève pour générer automatiquement 3 variantes d'appréciations de haute qualité.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
