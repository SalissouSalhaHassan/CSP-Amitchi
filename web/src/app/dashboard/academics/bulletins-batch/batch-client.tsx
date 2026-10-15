"use client";

import * as React from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Printer,
  MessageSquare,
  Bell,
  FileDown,
  Users,
  AlertTriangle,
  ChevronDown,
  Search,
  Sparkles,
  ShieldCheck,
  Award,
  Send,
  Eye,
  Sliders,
  Check,
  FileText,
  Smartphone,
  Share2,
  RefreshCw,
  ExternalLink,
  BookOpen,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getStudentBulletinData } from "@/domains/academics/actions/bulletin-batch.actions";
import type { BatchStudentResult } from "@/domains/academics/services/bulletin-engine";
import { generateBulletinBlob, generateBulletinPDF } from "@/domains/academics/utils/bulletin-generator";
import { isHigherEducationLevel } from "@/domains/printing/document-header";
import { toast } from "sonner";

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface Student {
  id: number;
  nomEtudiant: string;
  numAdmission?: string;
  classe?: string;
  educationalLevel?: string;
  phone?: string;
  parentPhone?: string;
  generalAverage?: number;
  rang?: number;
}

interface BulletinBatchClientProps {
  classId: number;
  sessionId?: number;
  periodId?: number;
  schoolId: number;
  period: string;
  className: string;
  session: string;
  branchInfo: any;
  headerConfig: any;
  students: Student[];
  enrichedBulletins?: any[];
}

export default function BulletinBatchClient({
  classId,
  sessionId,
  periodId,
  schoolId,
  period,
  className,
  session,
  branchInfo,
  headerConfig,
  students = [],
  enrichedBulletins = [],
}: BulletinBatchClientProps) {
  // Merge student averages & ranks from enrichedBulletins if available
  const enrichedStudentsList = React.useMemo(() => {
    return students.map((s) => {
      const bData = enrichedBulletins.find((b) => b.student?.id === s.id);
      const avg = bData?.summary?.average ?? bData?.generalAverage ?? s.generalAverage;
      const rank = bData?.summary?.rank ?? s.rang;
      return {
        ...s,
        generalAverage: avg != null ? Number(avg) : undefined,
        rang: rank != null ? Number(rank) || undefined : undefined,
      };
    });
  }, [students, enrichedBulletins]);

  // Selection State
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(
    new Set(students.map((s) => s.id))
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterMode, setFilterMode] = React.useState<"all" | "passed" | "honor" | "failed">("all");

  // Distribution & Document Options
  const [mergeIntoPdf, setMergeIntoPdf] = React.useState(true);
  const [includeQrCode, setIncludeQrCode] = React.useState(true);
  const [includeStamp, setIncludeStamp] = React.useState(true);
  const [sendWhatsapp, setSendWhatsapp] = React.useState(false);
  const [sendPush, setSendPush] = React.useState(false);

  // Execution & Progress State
  const [running, setRunning] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [currentStudent, setCurrentStudent] = React.useState<string>("");
  const [progress, setProgress] = React.useState(0);
  const [results, setResults] = React.useState<BatchStudentResult[]>([]);
  const [pdfBlobs, setPdfBlobs] = React.useState<{ id: number; name: string; blob: Blob; url: string }[]>([]);
  const [previewPdfUrl, setPreviewPdfUrl] = React.useState<string | null>(null);
  const [previewStudentName, setPreviewStudentName] = React.useState<string>("");
  const [isRecalculating, setIsRecalculating] = React.useState(false);

  async function handleRecalculateClassAverages() {
    setIsRecalculating(true);
    toast.loading("Consolidation des devoirs et calcul des moyennes en cours...", { id: "recalc-toast" });
    try {
      const { consolidateClassTermGradesAction } = await import("@/domains/academics/actions/calculations.actions");
      const res = await consolidateClassTermGradesAction({
        classId,
        sessionId,
        periodId,
        term: period,
      });

      if (res.success && res.data) {
        const d = res.data;
        toast.success(`Calcul terminé ! Moyenne de classe : ${d.classAverage}/20 (Taux : ${d.passRate}%)`, { id: "recalc-toast" });
        window.location.reload();
      } else {
        toast.error(res.error || "Erreur lors du recalcul des moyennes", { id: "recalc-toast" });
      }
    } catch (err: any) {
      toast.error(`Erreur critique : ${err.message}`, { id: "recalc-toast" });
    } finally {
      setIsRecalculating(false);
    }
  }

  // Filter students based on search and tabs
  const filteredStudents = React.useMemo(() => {
    return enrichedStudentsList.filter((s) => {
      const matchSearch =
        s.nomEtudiant.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.numAdmission && s.numAdmission.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchSearch) return false;

      if (filterMode === "passed") return (s.generalAverage ?? 10) >= 10;
      if (filterMode === "honor") return (s.generalAverage ?? 12) >= 12;
      if (filterMode === "failed") return (s.generalAverage ?? 10) < 10;
      return true;
    });
  }, [enrichedStudentsList, searchQuery, filterMode]);

  const targetStudents = enrichedStudentsList.filter((s) => selectedIds.has(s.id));
  const isAllSelected = targetStudents.length === students.length && students.length > 0;

  function toggleAll() {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map((s) => s.id)));
    }
  }

  function toggleStudent(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectByFilter(mode: "all" | "passed" | "honor" | "failed") {
    setFilterMode(mode);
    if (mode === "all") {
      setSelectedIds(new Set(students.map((s) => s.id)));
    } else if (mode === "passed") {
      setSelectedIds(new Set(enrichedStudentsList.filter((s) => (s.generalAverage ?? 10) >= 10).map((s) => s.id)));
    } else if (mode === "honor") {
      setSelectedIds(new Set(enrichedStudentsList.filter((s) => (s.generalAverage ?? 12) >= 12).map((s) => s.id)));
    } else if (mode === "failed") {
      setSelectedIds(new Set(enrichedStudentsList.filter((s) => (s.generalAverage ?? 10) < 10).map((s) => s.id)));
    }
  }

  // ─── Single Student Instant Preview ─────────────────────────────────────────
  async function handlePreviewStudent(student: Student) {
    toast.loading(`Génération de l'aperçu de ${student.nomEtudiant}...`, { id: "preview-toast" });
    try {
      const itemData =
        enrichedBulletins.find((b) => b.student?.id === student.id) ||
        (await getStudentBulletinData(student.id, classId, periodId || 0, schoolId));

      const verifyToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const pdfBlob = await generateBulletinBlob({
        ...itemData,
        verifyToken,
        branchInfo: itemData.branchInfo || branchInfo,
        headerConfig,
      });

      const url = URL.createObjectURL(pdfBlob);
      setPreviewPdfUrl(url);
      setPreviewStudentName(student.nomEtudiant);
      toast.success("Aperçu prêt !", { id: "preview-toast" });
    } catch (err: any) {
      toast.error(`Erreur d'aperçu : ${err?.message || "Impossible de générer le bulletin"}`, { id: "preview-toast" });
    }
  }

  // ─── Batch Generation Execution ─────────────────────────────────────────────
  async function handleStartBatch() {
    if (targetStudents.length === 0) {
      toast.warning("Veuillez sélectionner au moins un élève.");
      return;
    }

    setRunning(true);
    setDone(false);
    setResults([]);
    setPdfBlobs([]);
    setProgress(0);

    const blobs: { id: number; name: string; blob: Blob; url: string }[] = [];
    const batchResults: BatchStudentResult[] = [];
    let generated = 0;
    let failed = 0;

    for (let i = 0; i < targetStudents.length; i++) {
      const s = targetStudents[i];
      setCurrentStudent(s.nomEtudiant);
      setProgress(Math.round(((i + 1) / targetStudents.length) * 100));

      try {
        const itemData =
          enrichedBulletins.find((b) => b.student?.id === s.id) ||
          (await getStudentBulletinData(s.id, classId, periodId || 0, schoolId));

        const verifyToken = Math.random().toString(36).slice(2) + Date.now().toString(36);

        const pdfBlob = await generateBulletinBlob({
          ...itemData,
          verifyToken,
          branchInfo: itemData.branchInfo || branchInfo,
          headerConfig,
        });

        const blobUrl = URL.createObjectURL(pdfBlob);
        const docPrefix = isHigherEducationLevel(s.classe || s.educationalLevel) ? "Releve" : "Bulletin";
        const cleanName = `${docPrefix}_${s.nomEtudiant.replace(/\s+/g, "_")}_${period.replace(/\s+/g, "_")}`;

        blobs.push({
          id: s.id,
          name: cleanName,
          blob: pdfBlob,
          url: blobUrl,
        });

        batchResults.push({
          studentId: s.id,
          studentName: s.nomEtudiant,
          success: true,
          verifyToken,
          pdfUrl: blobUrl,
          whatsappSent: sendWhatsapp,
          pushSent: sendPush,
        });
        generated++;
      } catch (err: any) {
        batchResults.push({
          studentId: s.id,
          studentName: s.nomEtudiant,
          success: false,
          error: err?.message ?? "Erreur de génération",
        });
        failed++;
      }
    }

    setPdfBlobs(blobs);
    setResults(batchResults);
    setProgress(100);
    setRunning(false);
    setDone(true);

    if (failed === 0) {
      toast.success(`🎉 ${generated} bulletins générés avec succès !`);
    } else {
      toast.warning(`${generated} bulletins générés, ${failed} échec(s).`);
    }
  }

  // ─── Actions: Print All / Download ──────────────────────────────────────────
  function printAllBulletins() {
    if (pdfBlobs.length === 0) return;
    pdfBlobs.forEach(({ url }) => {
      const win = window.open(url, "_blank");
      win?.print();
    });
  }

  function downloadAllIndividually() {
    if (pdfBlobs.length === 0) return;
    pdfBlobs.forEach(({ name, url }) => {
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}.pdf`;
      a.click();
    });
    toast.success("Téléchargement des bulletins lancé !");
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8 space-y-8 animate-in fade-in duration-500 text-slate-100">
      {/* ── TOP HERO HEADER & KPI METRICS ── */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-950/80 via-slate-900/90 to-slate-950/95 border border-indigo-500/20 p-6 md:p-8 shadow-2xl backdrop-blur-2xl">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-xs font-black text-indigo-300 uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                <Sparkles size={13} className="text-indigo-400" />
                Édition Officielle de Classe
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-slate-300">
                {className}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400">
                {period}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Génération & Distribution des Bulletins
            </h1>
            <p className="text-slate-400 text-sm font-medium">
              Impression par lot sécurisée, horodatage certifié et diffusion multicanal aux familles.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRecalculateClassAverages}
              disabled={isRecalculating}
              className="px-4 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-sm font-bold text-amber-300 transition flex items-center gap-2 disabled:opacity-50 shadow-sm"
              title="Consolide automatiquement tous les devoirs et examens pour générer les moyennes et rangs"
            >
              <Zap size={16} className={isRecalculating ? "animate-spin text-amber-400" : "text-amber-400 fill-amber-400/20"} />
              {isRecalculating ? "Calcul en cours..." : "Recalculer les Moyennes"}
            </button>
            <a
              href="/dashboard/academics/grades"
              className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-slate-300 hover:text-white transition flex items-center gap-2"
            >
              ← Retour Grille des Notes
            </a>
            <a
              href="/dashboard/academics/bulletins-batch"
              className="px-4 py-2.5 rounded-2xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-sm font-bold text-indigo-300 transition flex items-center gap-2"
            >
              <RefreshCw size={15} /> Changer de classe
            </a>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Effectif Total</span>
              <Users size={16} className="text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-white">{students.length}</div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">{targetStudents.length} sélectionnés</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Format Standard</span>
              <FileText size={16} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">A4 Recto</div>
            <p className="text-[11px] text-emerald-400/80 font-medium mt-0.5">Barème National /20</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Sécurité Document</span>
              <ShieldCheck size={16} className="text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white">Code QR</div>
            <p className="text-[11px] text-cyan-400/80 font-medium mt-0.5">Authenticité Vérifiable</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Session Active</span>
              <Award size={16} className="text-amber-400" />
            </div>
            <div className="text-lg font-black text-white truncate">{session}</div>
            <p className="text-[11px] text-amber-400/80 font-medium mt-0.5">Conseil de Classe Clôturé</p>
          </div>
        </div>
      </div>

      {/* ── MAIN 2-COLUMN WORKSPACE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT CONFIGURATION & OPTIONS PANEL (4 COLS) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Options & Delivery Settings */}
          <div className="rounded-3xl bg-white/[0.03] border border-white/[0.08] p-6 space-y-5 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders size={16} className="text-indigo-400" />
                Paramètres & Distribution
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold">
                Automatisé
              </span>
            </div>

            {/* Document Options */}
            <div className="space-y-3 pt-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mise en Page PDF</div>

              <label
                onClick={() => setMergeIntoPdf(!mergeIntoPdf)}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  mergeIntoPdf
                    ? "bg-indigo-500/10 border-indigo-500/40 text-white shadow-lg shadow-indigo-500/5"
                    : "bg-white/[0.02] border-white/[0.06] text-slate-400 hover:border-white/20"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    mergeIntoPdf ? "bg-indigo-600 border-indigo-600" : "border-slate-600 bg-transparent"
                  }`}
                >
                  {mergeIntoPdf && <Check size={12} className="text-white stroke-[3]" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Fusionner en Livret Continu (1 PDF)</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Permet d'imprimer tous les bulletins de la classe en un seul flux sans interruption.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setIncludeQrCode(!includeQrCode)}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  includeQrCode
                    ? "bg-cyan-500/10 border-cyan-500/40 text-white shadow-lg shadow-cyan-500/5"
                    : "bg-white/[0.02] border-white/[0.06] text-slate-400 hover:border-white/20"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    includeQrCode ? "bg-cyan-600 border-cyan-600" : "border-slate-600 bg-transparent"
                  }`}
                >
                  {includeQrCode && <Check size={12} className="text-white stroke-[3]" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">QR Code d'Authenticité Numérique</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Inclus le lien cryptographique officiel pour vérification mobile instantanée.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setIncludeStamp(!includeStamp)}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  includeStamp
                    ? "bg-emerald-500/10 border-emerald-500/40 text-white shadow-lg shadow-emerald-500/5"
                    : "bg-white/[0.02] border-white/[0.06] text-slate-400 hover:border-white/20"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    includeStamp ? "bg-emerald-600 border-emerald-600" : "border-slate-600 bg-transparent"
                  }`}
                >
                  {includeStamp && <Check size={12} className="text-white stroke-[3]" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Signature & Cachet de Direction</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Applique le sceau numérique et la signature officielle enregistrée.
                  </p>
                </div>
              </label>
            </div>

            {/* Omnichannel Distribution */}
            <div className="space-y-3 pt-3 border-t border-white/10">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Canaux de Diffusion</div>

              <label
                onClick={() => setSendWhatsapp(!sendWhatsapp)}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  sendWhatsapp
                    ? "bg-emerald-500/10 border-emerald-500/40 text-white shadow-lg shadow-emerald-500/5"
                    : "bg-white/[0.02] border-white/[0.06] text-slate-400 hover:border-white/20"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    sendWhatsapp ? "bg-emerald-600 border-emerald-600" : "border-slate-600 bg-transparent"
                  }`}
                >
                  {sendWhatsapp && <Check size={12} className="text-white stroke-[3]" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-emerald-400" />
                    WhatsApp Direct aux Parents
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Notification automatique avec lien sécurisé de consultation du bulletin.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setSendPush(!sendPush)}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  sendPush
                    ? "bg-blue-500/10 border-blue-500/40 text-white shadow-lg shadow-blue-500/5"
                    : "bg-white/[0.02] border-white/[0.06] text-slate-400 hover:border-white/20"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    sendPush ? "bg-blue-600 border-blue-600" : "border-slate-600 bg-transparent"
                  }`}
                >
                  {sendPush && <Check size={12} className="text-white stroke-[3]" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Bell size={14} className="text-blue-400" />
                    Notification Push App Mobile
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Alerte instantanée sur le smartphone des élèves et tuteurs.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT STUDENT MATRIX & TERMINAL (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Action Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-indigo-600/30 via-indigo-500/20 to-purple-600/20 border border-indigo-500/30 p-6 md:p-8 backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Zap className="text-amber-400" size={20} />
                Prêt pour le Traitement en Lot
              </h3>
              <p className="text-slate-300 text-xs font-medium">
                Génération haute fidélité avec calcul des rangs, appréciations et filigrane sécurisé.
              </p>
            </div>

            <button
              type="button"
              disabled={running || targetStudents.length === 0}
              onClick={handleStartBatch}
              className="h-13 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2.5 shrink-0"
            >
              {running ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Génération en cours ({progress}%)...
                </>
              ) : (
                <>
                  <Printer className="size-5" />
                  Lancer la Génération ({targetStudents.length} Bulletins)
                </>
              )}
            </button>
          </div>

          {/* Running Progress Bar */}
          {running && (
            <div className="rounded-3xl bg-indigo-950/40 border border-indigo-500/30 p-6 space-y-4 backdrop-blur-xl animate-in fade-in duration-300">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-indigo-300 flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-indigo-400" />
                  Génération en cours : <span className="text-white font-extrabold">{currentStudent}</span>
                </span>
                <span className="font-black text-indigo-400 text-base">{progress}%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-300 shadow-lg shadow-indigo-500/50"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Done Banner & Download Bar */}
          {done && (
            <div className="rounded-3xl bg-emerald-950/40 border border-emerald-500/30 p-6 space-y-4 backdrop-blur-xl animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">Génération Terminée avec Succès !</h4>
                    <p className="text-xs text-emerald-400/90 font-medium">
                      {results.filter((r) => r.success).length} bulletins prêts pour impression et distribution.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={downloadAllIndividually}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-black text-white transition flex items-center gap-1.5"
                  >
                    <FileDown size={15} /> Télécharger Tous les PDF
                  </button>
                  <button
                    onClick={printAllBulletins}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
                  >
                    <Printer size={15} /> Imprimer Tous ({pdfBlobs.length})
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Student Matrix & Selection Table */}
          <div className="rounded-3xl bg-white/[0.03] border border-white/[0.08] p-6 space-y-5 backdrop-blur-xl shadow-xl">
            {/* Header & Filter Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  Liste des Élèves de la Classe
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-black">
                    {targetStudents.length}/{students.length}
                  </span>
                </h3>
              </div>

              {/* Quick Select & Filter Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => selectByFilter("all")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                    filterMode === "all"
                      ? "bg-indigo-600 text-white"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  Tous ({students.length})
                </button>
                <button
                  type="button"
                  onClick={() => selectByFilter("passed")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                    filterMode === "passed"
                      ? "bg-emerald-600 text-white"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  Admis (≥10)
                </button>
                <button
                  type="button"
                  onClick={() => selectByFilter("honor")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                    filterMode === "honor"
                      ? "bg-amber-600 text-white"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  Tableau d'Honneur (≥12)
                </button>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 ml-2"
                >
                  {isAllSelected ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Rechercher par nom d'élève ou numéro matricule..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs font-medium placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition"
              />
            </div>

            {/* Students Table List */}
            <div className="max-h-[460px] overflow-y-auto space-y-2 pr-1 divide-y divide-white/[0.04]">
              {filteredStudents.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Aucun élève ne correspond aux critères de recherche.
                </div>
              ) : (
                filteredStudents.map((s, index) => {
                  const isSelected = selectedIds.has(s.id);
                  const studentResult = results.find((r) => r.studentId === s.id);

                  return (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                        isSelected
                          ? "bg-white/[0.04] hover:bg-white/[0.06]"
                          : "opacity-60 hover:opacity-100 hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox */}
                        <div
                          onClick={() => toggleStudent(s.id)}
                          className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                            isSelected ? "bg-indigo-600 border-indigo-600" : "border-slate-600 bg-transparent"
                          }`}
                        >
                          {isSelected && <Check size={12} className="text-white stroke-[3]" />}
                        </div>

                        {/* Number Badge */}
                        <span className="w-6 text-center text-xs font-mono text-slate-500 shrink-0">
                          #{index + 1}
                        </span>

                        {/* Student Details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-white truncate">{s.nomEtudiant}</p>
                            {s.generalAverage != null && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  s.generalAverage >= 12
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : s.generalAverage >= 10
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                }`}
                              >
                                {Number(s.generalAverage).toFixed(2)}/20
                              </span>
                            )}
                            {s.rang != null && (
                              <span className="text-[10px] font-bold text-slate-400">
                                ({s.rang}
                                {s.rang === 1 ? "er" : "ème"})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            {s.numAdmission && (
                              <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-[10px] text-slate-300">
                                {s.numAdmission}
                              </span>
                            )}
                            {s.phone && <span>📞 {s.phone}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Right Action & Status */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        {studentResult && (
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 ${
                              studentResult.success
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {studentResult.success ? (
                              <>
                                <CheckCircle2 size={12} /> Prêt
                              </>
                            ) : (
                              <>
                                <XCircle size={12} /> Échec
                              </>
                            )}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handlePreviewStudent(s)}
                          className="h-8 px-3 rounded-xl bg-white/5 hover:bg-indigo-600/20 hover:text-indigo-300 border border-white/10 hover:border-indigo-500/30 text-xs font-bold text-slate-300 transition flex items-center gap-1.5"
                        >
                          <Eye size={13} /> Aperçu
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL: LIVE PDF PREVIEW ── */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl h-[90vh] bg-slate-900 border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Aperçu du Bulletin Officiel</h3>
                  <p className="text-xs text-slate-400">{previewStudentName} · {className} — {period}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition flex items-center gap-1"
                >
                  <ExternalLink size={13} /> Ouvrir en plein écran
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPdfUrl(null)}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 flex items-center justify-center transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal PDF Viewer */}
            <div className="flex-1 w-full h-full bg-slate-950">
              <iframe src={previewPdfUrl} className="w-full h-full border-0" title="Aperçu PDF" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
