"use client";

import React, { useState } from "react";
import {
  FileEdit,
  Send,
  ShieldCheck,
  Lock,
  Globe,
  AlertTriangle,
  RotateCcw,
  History,
  CheckCircle2,
  Clock,
  Unlock,
  Info,
  ChevronRight,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export type WorkflowStatus =
  | "BROUILLON"
  | "SAISIE_TERMINEE"
  | "CORRECTION_DEMANDEE"
  | "CONTROLE_PEDAGOGIQUE"
  | "VALIDATION_CONSEIL"
  | "VERROUILLE"
  | "PUBLIE"
  | "ARCHIVE";

export interface WorkflowRowData {
  id?: number;
  status?: WorkflowStatus;
  submittedBy?: number;
  submittedAt?: string | Date;
  submittedByName?: string;
  controlledBy?: number;
  controlledAt?: string | Date;
  controlledByName?: string;
  validatedBy?: number;
  validatedAt?: string | Date;
  validatedByName?: string;
  lockedBy?: number;
  lockedAt?: string | Date;
  lockedByName?: string;
  publishedBy?: number;
  publishedAt?: string | Date;
  publishedByName?: string;
  observation?: string;
}

interface GradeApprovalWorkflowBarProps {
  status: WorkflowStatus;
  workflowRow?: WorkflowRowData | null;
  totalStudents: number;
  gradedStudents: number;
  classAverage?: number;
  userRole?: string;
  isEnseignant: boolean;
  isCenseur: boolean;
  isDirecteur: boolean;
  isSuperAdmin: boolean;
  onRefresh?: () => void;
  onSubmitGrades: () => Promise<boolean>;
  onRequestCorrection: (observation: string) => Promise<boolean>;
  onValidateControl: () => Promise<boolean>;
  onValidateCouncil?: () => Promise<boolean>;
  onLockResults: () => Promise<boolean>;
  onPublishResults?: () => Promise<boolean>;
  onUnlockException?: (observation: string) => Promise<boolean>;
  loading?: boolean;
}

const STAGES = [
  {
    key: "BROUILLON",
    label: "1. Saisie Enseignant",
    shortLabel: "Saisie",
    icon: FileEdit,
    description: "Saisie libre et ajustement des notes par le professeur.",
  },
  {
    key: "SAISIE_TERMINEE",
    label: "2. Soumission & Contrôle",
    shortLabel: "Soumission",
    icon: Send,
    description: "Notes soumises. En attente de vérification par le Censeur/D.E.",
  },
  {
    key: "CONTROLE_PEDAGOGIQUE",
    label: "3. Validé Pédagogique",
    shortLabel: "Validation",
    icon: ShieldCheck,
    description: "Cohérence pédagogique et barèmes validés par la direction des études.",
  },
  {
    key: "VERROUILLE",
    label: "4. Verrouillé (Conseil)",
    shortLabel: "Verrouillé",
    icon: Lock,
    description: "Moyennes arrêtées et délibérées. Édition scellée.",
  },
  {
    key: "PUBLIE",
    label: "5. Publié & Visible",
    shortLabel: "Publié",
    icon: Globe,
    description: "Bulletins et notes consultables par les élèves et parents.",
  },
];

export function GradeApprovalWorkflowBar({
  status = "BROUILLON",
  workflowRow,
  totalStudents = 0,
  gradedStudents = 0,
  classAverage,
  isEnseignant,
  isCenseur,
  isDirecteur,
  isSuperAdmin,
  onSubmitGrades,
  onRequestCorrection,
  onValidateControl,
  onValidateCouncil,
  onLockResults,
  onPublishResults,
  onUnlockException,
  loading = false,
}: GradeApprovalWorkflowBarProps) {
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Determine active stage index (0 to 4)
  const getStageIndex = (st: WorkflowStatus) => {
    switch (st) {
      case "BROUILLON":
      case "CORRECTION_DEMANDEE":
        return 0;
      case "SAISIE_TERMINEE":
        return 1;
      case "CONTROLE_PEDAGOGIQUE":
      case "VALIDATION_CONSEIL":
        return 2;
      case "VERROUILLE":
        return 3;
      case "PUBLIE":
      case "ARCHIVE":
        return 4;
      default:
        return 0;
    }
  };

  const currentStageIndex = getStageIndex(status);
  const isCorrectionRequested = status === "CORRECTION_DEMANDEE";
  const isFullyGraded = totalStudents > 0 && gradedStudents >= totalStudents;
  const completionPercentage = totalStudents > 0 ? Math.round((gradedStudents / totalStudents) * 100) : 0;

  // Handlers
  const handleTeacherSubmit = async () => {
    if (!isFullyGraded) {
      const confirmIncomplete = window.confirm(
        `Attention : Seulement ${gradedStudents}/${totalStudents} élèves ont des notes saisies (${completionPercentage}%).\nSouhaitez-vous quand même soumettre cette grille pour contrôle pédagogique ?`
      );
      if (!confirmIncomplete) return;
    }

    setActionLoading(true);
    try {
      const success = await onSubmitGrades();
      if (success) {
        toast.success("Grille de notes transmise avec succès au Censeur !");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCenseurValidate = async () => {
    setActionLoading(true);
    try {
      const success = await onValidateControl();
      if (success) {
        toast.success("Contrôle pédagogique validé avec succès.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestCorrectionSubmit = async () => {
    if (!correctionReason.trim()) {
      toast.error("Veuillez saisir le motif de la demande de correction.");
      return;
    }
    setActionLoading(true);
    try {
      const success = await onRequestCorrection(correctionReason);
      if (success) {
        toast.success("Demande de correction transmise au professeur.");
        setCorrectionDialogOpen(false);
        setCorrectionReason("");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDirectorLock = async () => {
    if (!window.confirm("Confirmez-vous le verrouillage définitif des notes pour le Conseil de Classe ?")) {
      return;
    }
    setActionLoading(true);
    try {
      const success = await onLockResults();
      if (success) {
        toast.success("Grille de notes verrouillée.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublish = async () => {
    if (onPublishResults) {
      if (!window.confirm("Publier les notes et bulletins sur les portails Parents & Élèves ?")) return;
      setActionLoading(true);
      try {
        const success = await onPublishResults();
        if (success) {
          toast.success("Notes et bulletins publiés avec succès.");
        }
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleUnlockSubmit = async () => {
    if (!unlockReason.trim()) {
      toast.error("Veuillez indiquer le motif officiel du déverrouillage.");
      return;
    }
    if (onUnlockException) {
      setActionLoading(true);
      try {
        const success = await onUnlockException(unlockReason);
        if (success) {
          toast.success("Grille de notes déverrouillée à titre exceptionnel.");
          setUnlockDialogOpen(false);
          setUnlockReason("");
        }
      } finally {
        setActionLoading(false);
      }
    }
  };

  const quickReasons = [
    "Notes manquantes pour plusieurs élèves",
    "Moyenne générale de classe anormalement basse",
    "Erreur de barème / coefficient à vérifier",
    "Notes d'évaluation non conformes au devoir surveillé",
  ];

  return (
    <div className="bg-white dark:bg-[#131622]/95 border border-slate-200 dark:border-slate-800/80 rounded-[2rem] p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-3 duration-500 print:hidden">
      {/* Top Row: Title, Status Badge & Health Pill */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-3 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Circuit d'Approbation Académique
            </span>
          </div>

          {/* Current Status Pill */}
          <div
            className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1.5 border shadow-sm ${
              isCorrectionRequested
                ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 animate-pulse"
                : status === "BROUILLON"
                ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                : status === "SAISIE_TERMINEE"
                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50"
                : status === "CONTROLE_PEDAGOGIQUE" || status === "VALIDATION_CONSEIL"
                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50"
                : status === "VERROUILLE"
                ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50"
                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50"
            }`}
          >
            {isCorrectionRequested ? (
              <>
                <AlertTriangle size={14} /> Correction Demandée
              </>
            ) : status === "BROUILLON" ? (
              <>
                <FileEdit size={14} /> Saisie En Cours (Brouillon)
              </>
            ) : status === "SAISIE_TERMINEE" ? (
              <>
                <Clock size={14} /> En Attente Contrôle
              </>
            ) : status === "CONTROLE_PEDAGOGIQUE" || status === "VALIDATION_CONSEIL" ? (
              <>
                <ShieldCheck size={14} /> Validé Pédagogique
              </>
            ) : status === "VERROUILLE" ? (
              <>
                <Lock size={14} /> Verrouillé & Clôturé
              </>
            ) : (
              <>
                <CheckCircle2 size={14} /> Publié Officiellement
              </>
            )}
          </div>

          {/* Rejection / Supervisor Observation Banner */}
          {workflowRow?.observation && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs rounded-xl border border-amber-200 dark:border-amber-900/40 max-w-md truncate">
              <Info size={13} className="shrink-0 text-amber-600" />
              <span className="font-semibold">Note :</span>
              <span className="truncate" title={workflowRow.observation}>
                {workflowRow.observation}
              </span>
            </div>
          )}
        </div>

        {/* Right Side: Health check & Audit History button */}
        <div className="flex items-center gap-2">
          {/* Health check badge */}
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <span className="text-slate-500 dark:text-slate-400">Complétude :</span>
            <span className={isFullyGraded ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-amber-600 dark:text-amber-400 font-bold"}>
              {gradedStudents}/{totalStudents} ({completionPercentage}%)
            </span>
          </div>

          {/* Audit History Trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHistoryDialogOpen(true)}
            className="h-8 px-3 rounded-xl text-xs gap-1.5 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <History size={14} />
            <span className="hidden sm:inline">Historique & Audit</span>
          </Button>
        </div>
      </div>

      {/* Middle Row: Modern Multi-Stage Horizontal Stepper */}
      <div className="relative py-2">
        <div className="grid grid-cols-5 gap-2 md:gap-4 relative">
          {STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isPassed = currentStageIndex > idx;
            const isCurrent = currentStageIndex === idx;
            const isPending = currentStageIndex < idx;

            return (
              <div key={stage.key} className="flex flex-col items-center text-center group relative">
                {/* Step Connector Line */}
                {idx < STAGES.length - 1 && (
                  <div
                    className={`hidden md:block absolute top-4 left-[50%] w-full h-[2px] z-0 transition-colors duration-500 ${
                      isPassed
                        ? "bg-emerald-500 dark:bg-emerald-500/80"
                        : isCurrent
                        ? "bg-indigo-500 dark:bg-indigo-500/80"
                        : "bg-slate-200 dark:bg-slate-800"
                    }`}
                  />
                )}

                {/* Step Icon Bubble */}
                <div
                  className={`w-9 h-9 md:w-10 md:h-10 rounded-2xl flex items-center justify-center relative z-10 transition-all duration-300 shadow-sm ${
                    isCorrectionRequested && idx === 0
                      ? "bg-rose-500 text-white shadow-rose-500/30 shadow-lg ring-4 ring-rose-100 dark:ring-rose-950"
                      : isPassed
                      ? "bg-emerald-500 text-white shadow-emerald-500/20"
                      : isCurrent
                      ? "bg-indigo-600 text-white shadow-indigo-600/30 shadow-lg ring-4 ring-indigo-100 dark:ring-indigo-950/60"
                      : "bg-slate-100 dark:bg-slate-800/90 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700"
                  }`}
                  title={stage.description}
                >
                  {isPassed ? <CheckCircle2 size={18} className="stroke-[2.5]" /> : <Icon size={18} />}
                </div>

                {/* Step Label */}
                <span
                  className={`mt-2 text-[11px] md:text-xs font-bold leading-tight line-clamp-1 transition-colors ${
                    isCorrectionRequested && idx === 0
                      ? "text-rose-600 dark:text-rose-400"
                      : isCurrent
                      ? "text-indigo-600 dark:text-indigo-400 font-extrabold"
                      : isPassed
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-slate-400 dark:text-slate-600"
                  }`}
                >
                  <span className="hidden md:inline">{stage.label}</span>
                  <span className="md:hidden">{stage.shortLabel}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Row: Context-Sensitive Action Buttons based on RBAC Role & Stage */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <UserCheck size={14} className="text-indigo-600 dark:text-indigo-400" />
          <span>
            {status === "BROUILLON" || isCorrectionRequested
              ? "Édition active : Saisie et modifications autorisées pour le professeur."
              : status === "SAISIE_TERMINEE"
              ? "Notes en attente de vérification par le Censeur."
              : status === "CONTROLE_PEDAGOGIQUE" || status === "VALIDATION_CONSEIL"
              ? "Contrôle validé. Prêt pour le Conseil de classe et verrouillage."
              : status === "VERROUILLE"
              ? "Grille scellée et verrouillée. Modifications interdites sauf déverrouillage exceptionnel."
              : "Grille publiée aux familles."}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Enseignant Action : Soumettre les notes */}
          {(isEnseignant || isSuperAdmin) && (status === "BROUILLON" || isCorrectionRequested) && (
            <Button
              onClick={handleTeacherSubmit}
              disabled={actionLoading || loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-5 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-indigo-600/20 gap-2"
            >
              <Send size={15} />
              Soumettre pour Contrôle
            </Button>
          )}

          {/* 2. Censeur / D.E. Actions : Valider le contrôle ou Demander correction */}
          {(isCenseur || isDirecteur || isSuperAdmin) && status === "SAISIE_TERMINEE" && (
            <>
              <Button
                variant="outline"
                onClick={() => setCorrectionDialogOpen(true)}
                disabled={actionLoading || loading}
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800/60 font-bold h-10 px-4 rounded-xl text-xs uppercase tracking-wider gap-1.5"
              >
                <RotateCcw size={15} />
                Demander Correction
              </Button>

              <Button
                onClick={handleCenseurValidate}
                disabled={actionLoading || loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-5 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 gap-2"
              >
                <ShieldCheck size={16} />
                Valider le Contrôle
              </Button>
            </>
          )}

          {/* 3. Direction Actions : Verrouiller (Conseil de Classe) */}
          {(isDirecteur || isSuperAdmin) &&
            (status === "CONTROLE_PEDAGOGIQUE" || status === "VALIDATION_CONSEIL" || status === "SAISIE_TERMINEE") && (
              <Button
                onClick={handleDirectorLock}
                disabled={actionLoading || loading}
                className="bg-red-600 hover:bg-red-700 text-white font-bold h-10 px-5 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-red-600/20 gap-2"
              >
                <Lock size={15} />
                Verrouiller la Grille
              </Button>
            )}

          {/* 4. Super Admin / Direction Action : Déverrouillage Exceptionnel */}
          {(isDirecteur || isSuperAdmin) && (status === "VERROUILLE" || status === "PUBLIE") && (
            <>
              {onPublishResults && status === "VERROUILLE" && (
                <Button
                  onClick={handlePublish}
                  disabled={actionLoading || loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-5 rounded-xl text-xs uppercase tracking-wider gap-2 shadow-md shadow-emerald-600/20"
                >
                  <Globe size={15} />
                  Publier aux Familles
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => setUnlockDialogOpen(true)}
                disabled={actionLoading || loading}
                className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold h-10 px-4 rounded-xl text-xs uppercase tracking-wider gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Unlock size={15} />
                Déverrouillage Exceptionnel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Dialog 1: Request Correction Modal */}
      <Dialog open={correctionDialogOpen} onOpenChange={setCorrectionDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <RotateCcw size={18} />
              Demande de Correction au Professeur
            </DialogTitle>
            <DialogDescription>
              Indiquez la raison pour laquelle les notes doivent être révisées. La saisie sera réouverte immédiatement pour l'enseignant.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Suggestions rapides :</label>
              <div className="flex flex-wrap gap-1.5">
                {quickReasons.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setCorrectionReason(r)}
                    className="text-[11px] px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 rounded-lg text-slate-600 dark:text-slate-300 transition-colors text-left"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Motif détaillé :</label>
              <Textarea
                rows={3}
                placeholder="Ex : Veuillez vérifier les notes du Devoir n°2 et compléter les notes des 3 élèves absents..."
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                className="rounded-xl resize-none text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setCorrectionDialogOpen(false)} className="rounded-xl text-xs">
              Annuler
            </Button>
            <Button
              onClick={handleRequestCorrectionSubmit}
              disabled={actionLoading || !correctionReason.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
            >
              Envoyer la Demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog 2: Exceptional Unlock Modal */}
      <Dialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Unlock size={18} />
              Déverrouillage Exceptionnel
            </DialogTitle>
            <DialogDescription>
              Cette action réouvre la grille de notes en mode Brouillon. Un journal d'audit de sécurité sera consigné avec votre identifiant.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Motif officiel du déverrouillage :</label>
            <Textarea
              rows={3}
              placeholder="Ex : Rectification accordée suite au recours du conseil de classe..."
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              className="rounded-xl resize-none text-sm"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setUnlockDialogOpen(false)} className="rounded-xl text-xs">
              Annuler
            </Button>
            <Button
              onClick={handleUnlockSubmit}
              disabled={actionLoading || !unlockReason.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
            >
              Confirmer le Déverrouillage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog 3: Audit Trail / Workflow History Timeline Modal */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-600">
              <History size={18} />
              Journal d'Audit du Circuit d'Approbation
            </DialogTitle>
            <DialogDescription>
              Historique complet et traçabilité des signatures électroniques pour cette classe et matière.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-800">
              {/* Event 1: Soumission */}
              <div className="relative">
                <span
                  className={`absolute -left-[21px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                    workflowRow?.submittedAt ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">1. Soumission par l'Enseignant</p>
                <p className="text-[11px] text-slate-500">
                  {workflowRow?.submittedAt
                    ? `Soumis le ${new Date(workflowRow.submittedAt).toLocaleString("fr-FR")} par ${
                        workflowRow.submittedByName || "Enseignant titulaire"
                      }`
                    : "Non encore soumis"}
                </p>
              </div>

              {/* Event 2: Contrôle Pédagogique */}
              <div className="relative">
                <span
                  className={`absolute -left-[21px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                    workflowRow?.controlledAt ? "bg-amber-600" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">2. Contrôle Pédagogique (Censeur / D.E.)</p>
                <p className="text-[11px] text-slate-500">
                  {workflowRow?.controlledAt
                    ? `Validé le ${new Date(workflowRow.controlledAt).toLocaleString("fr-FR")} par ${
                        workflowRow.controlledByName || "Direction des Études"
                      }`
                    : "En attente de validation"}
                </p>
              </div>

              {/* Event 3: Verrouillage */}
              <div className="relative">
                <span
                  className={`absolute -left-[21px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                    workflowRow?.lockedAt ? "bg-red-600" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">3. Verrouillage & Clôture Conseil</p>
                <p className="text-[11px] text-slate-500">
                  {workflowRow?.lockedAt
                    ? `Scellé le ${new Date(workflowRow.lockedAt).toLocaleString("fr-FR")} par ${
                        workflowRow.lockedByName || "Direction Générale"
                      }`
                    : "Non verrouillé"}
                </p>
              </div>

              {/* Event 4: Publication */}
              <div className="relative">
                <span
                  className={`absolute -left-[21px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                    workflowRow?.publishedAt ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">4. Publication aux Familles</p>
                <p className="text-[11px] text-slate-500">
                  {workflowRow?.publishedAt
                    ? `Publié le ${new Date(workflowRow.publishedAt).toLocaleString("fr-FR")} par ${
                        workflowRow.publishedByName || "Administration"
                      }`
                    : "Non publié"}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryDialogOpen(false)} className="rounded-xl text-xs w-full">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
