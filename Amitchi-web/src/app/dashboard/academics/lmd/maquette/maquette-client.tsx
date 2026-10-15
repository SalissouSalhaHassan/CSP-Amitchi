"use client";

import React, { useState, useTransition, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Layers, Plus, Trash2, Edit3, BookOpen, Clock, 
  User, CheckCircle2, AlertTriangle, ChevronRight, 
  Sparkles, Award, ArrowLeft, RefreshCw, Filter, HelpCircle,
  GraduationCap, Sun, Moon, School, BookMarked, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getMaquettePedagogique,
  saveUniteEnseignement,
  deleteUniteEnseignement,
  saveElementConstitutif,
  deleteElementConstitutif,
  saveUniversityProgram,
} from "@/domains/academics/actions/lmd.actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTheme } from "@/hooks/use-theme";

type Props = {
  initialPrograms: any[];
  initialFaculties: any[];
  subjects: any[];
  teachers: any[];
};

export default function MaquetteClient({
  initialPrograms,
  initialFaculties,
  subjects,
  teachers,
}: Props) {
  const { isDark, toggleTheme } = useTheme();
  const [programs, setPrograms] = useState(initialPrograms);
  const [selectedCycle, setSelectedCycle] = useState<string>("Tous");

  const filteredPrograms = useMemo(() => {
    if (!selectedCycle || selectedCycle === "Tous") return programs;
    return programs.filter((p) => {
      const level = (p.degreeLevel || "Licence").toLowerCase();
      return level.includes(selectedCycle.toLowerCase());
    });
  }, [programs, selectedCycle]);

  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(
    filteredPrograms.length > 0 ? filteredPrograms[0].id : null
  );

  useEffect(() => {
    if (filteredPrograms.length > 0) {
      const exists = filteredPrograms.some((p) => p.id === selectedProgramId);
      if (!exists) {
        setSelectedProgramId(filteredPrograms[0].id);
      }
    } else {
      setSelectedProgramId(null);
    }
  }, [filteredPrograms]);

  const [selectedSemester, setSelectedSemester] = useState<string>("S1");

  const [maquette, setMaquette] = useState<{
    ues: any[];
    totalCredits: number;
    isCompliant30Credits: boolean;
  }>({ ues: [], totalCredits: 0, isCompliant30Credits: false });

  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ─── Modal States ──────────────────────────────────────────────────────────
  const [isUeModalOpen, setIsUeModalOpen] = useState(false);
  const [selectedUe, setSelectedUe] = useState<any>(null);
  const [ueFormData, setUeFormData] = useState({
    codeUe: "",
    nameUe: "",
    typeUe: "Fondamentale",
    creditsEcts: 6,
    totalHours: 60,
    minPassingGrade: 10.0,
    isEliminatory: false,
  });

  const [isEcuModalOpen, setIsEcuModalOpen] = useState(false);
  const [selectedEcu, setSelectedEcu] = useState<any>(null);
  const [targetUeId, setTargetUeId] = useState<number | null>(null);
  const [ecuFormData, setEcuFormData] = useState({
    subjectId: "",
    codeEcu: "",
    nameEcu: "",
    creditsEcts: 3,
    coefficient: 1,
    hoursCm: 24,
    hoursTd: 12,
    hoursTp: 0,
    hoursTpe: 24,
    teacherEmployeeId: "",
    eliminatoryGrade: 7.0,
  });

  // Load Maquette whenever Program or Semester changes
  const loadMaquetteData = async () => {
    if (!selectedProgramId) return;
    setIsLoading(true);
    try {
      const res = await getMaquettePedagogique(selectedProgramId, selectedSemester);
      if (res.success && res.data) {
        setMaquette(res.data);
      }
    } catch (e: any) {
      toast.error("Erreur de chargement de la maquette");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMaquetteData();
  }, [selectedProgramId, selectedSemester]);

  const selectedProgram = programs.find((p) => p.id === selectedProgramId);
  const semesters = selectedProgram?.degreeLevel === "Master"
    ? ["S1", "S2", "S3", "S4"]
    : ["S1", "S2", "S3", "S4", "S5", "S6"];

  // ─── UE Handlers ───────────────────────────────────────────────────────────
  const handleOpenUeModal = (ue: any = null) => {
    if (ue) {
      setSelectedUe(ue);
      setUeFormData({
        codeUe: ue.codeUe,
        nameUe: ue.nameUe,
        typeUe: ue.typeUe || "Fondamentale",
        creditsEcts: ue.creditsEcts,
        totalHours: ue.totalHours || 60,
        minPassingGrade: Number(ue.minPassingGrade) || 10.0,
        isEliminatory: Boolean(ue.isEliminatory),
      });
    } else {
      setSelectedUe(null);
      const nextNum = (maquette.ues.length + 1);
      const semNum = selectedSemester.replace(/\D/g, "") || "1";
      setUeFormData({
        codeUe: `UE${semNum}${nextNum}`,
        nameUe: "",
        typeUe: "Fondamentale",
        creditsEcts: 6,
        totalHours: 60,
        minPassingGrade: 10.0,
        isEliminatory: false,
      });
    }
    setIsUeModalOpen(true);
  };

  const handleSaveUe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgramId) return;

    startTransition(async () => {
      const res = await saveUniteEnseignement({
        id: selectedUe?.id,
        programId: selectedProgramId,
        semester: selectedSemester,
        codeUe: ueFormData.codeUe,
        nameUe: ueFormData.nameUe,
        typeUe: ueFormData.typeUe,
        creditsEcts: Number(ueFormData.creditsEcts),
        totalHours: Number(ueFormData.totalHours),
        minPassingGrade: Number(ueFormData.minPassingGrade),
        isEliminatory: ueFormData.isEliminatory,
      });

      if (res.success) {
        toast.success(selectedUe ? "UE modifiée avec succès" : "Nouvelle UE créée");
        setIsUeModalOpen(false);
        loadMaquetteData();
      } else {
        toast.error(res.error || "Erreur lors de l'enregistrement de l'UE");
      }
    });
  };

  const handleDeleteUe = async (id: number) => {
    if (!confirm("Supprimer cette Unité d'Enseignement et tous ses éléments constitutifs ?")) return;
    startTransition(async () => {
      const res = await deleteUniteEnseignement(id);
      if (res.success) {
        toast.success("UE supprimée");
        loadMaquetteData();
      } else {
        toast.error(res.error || "Erreur de suppression");
      }
    });
  };

  // ─── ECU Handlers ──────────────────────────────────────────────────────────
  const handleOpenEcuModal = (ueId: number, ecu: any = null) => {
    setTargetUeId(ueId);
    if (ecu) {
      setSelectedEcu(ecu);
      setEcuFormData({
        subjectId: ecu.subjectId ? String(ecu.subjectId) : "",
        codeEcu: ecu.codeEcu || "",
        nameEcu: ecu.nameEcu,
        creditsEcts: Number(ecu.creditsEcts) || 3,
        coefficient: Number(ecu.coefficient) || 1,
        hoursCm: Number(ecu.hoursCm) || 24,
        hoursTd: Number(ecu.hoursTd) || 12,
        hoursTp: Number(ecu.hoursTp) || 0,
        hoursTpe: Number(ecu.hoursTpe) || 24,
        teacherEmployeeId: ecu.teacherEmployeeId ? String(ecu.teacherEmployeeId) : "",
        eliminatoryGrade: Number(ecu.eliminatoryGrade) || 7.0,
      });
    } else {
      setSelectedEcu(null);
      setEcuFormData({
        subjectId: "",
        codeEcu: "",
        nameEcu: "",
        creditsEcts: 3,
        coefficient: 1,
        hoursCm: 24,
        hoursTd: 12,
        hoursTp: 0,
        hoursTpe: 24,
        teacherEmployeeId: "",
        eliminatoryGrade: 7.0,
      });
    }
    setIsEcuModalOpen(true);
  };

  const handleSelectSubject = (subjectIdStr: string | null) => {
    if (!subjectIdStr) return;
    const sId = Number(subjectIdStr);
    const found = subjects.find((s) => s.id === sId);
    if (found) {
      setEcuFormData((prev) => ({
        ...prev,
        subjectId: subjectIdStr,
        nameEcu: found.subjectName || prev.nameEcu,
        codeEcu: found.subjectCode || prev.codeEcu,
      }));
    }
  };

  const handleSaveEcu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUeId) return;

    startTransition(async () => {
      const res = await saveElementConstitutif({
        id: selectedEcu?.id,
        ueId: targetUeId,
        subjectId: ecuFormData.subjectId ? Number(ecuFormData.subjectId) : undefined,
        codeEcu: ecuFormData.codeEcu,
        nameEcu: ecuFormData.nameEcu,
        creditsEcts: Number(ecuFormData.creditsEcts),
        coefficient: Number(ecuFormData.coefficient),
        hoursCm: Number(ecuFormData.hoursCm),
        hoursTd: Number(ecuFormData.hoursTd),
        hoursTp: Number(ecuFormData.hoursTp),
        hoursTpe: Number(ecuFormData.hoursTpe),
        teacherEmployeeId: ecuFormData.teacherEmployeeId ? Number(ecuFormData.teacherEmployeeId) : undefined,
        eliminatoryGrade: Number(ecuFormData.eliminatoryGrade),
      });

      if (res.success) {
        toast.success(selectedEcu ? "ECU modifié" : "ECU ajouté");
        setIsEcuModalOpen(false);
        loadMaquetteData();
      } else {
        toast.error(res.error || "Erreur lors de l'enregistrement de l'ECU");
      }
    });
  };

  const handleDeleteEcu = async (id: number) => {
    if (!confirm("Supprimer cet Élément Constitutif (ECU) ?")) return;
    startTransition(async () => {
      const res = await deleteElementConstitutif(id);
      if (res.success) {
        toast.success("ECU supprimé");
        loadMaquetteData();
      } else {
        toast.error(res.error || "Erreur de suppression");
      }
    });
  };

  return (
    <div className="min-h-screen space-y-6">
      {/* ─── TOP NAVIGATION & HEADER ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/academics/lmd"
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Maquette Pédagogique Universitaire
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                <Sparkles className="h-3 w-3" /> ECTS • REESAO
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Organisation modulaire par Semestres, Unités d’Enseignement (UE) et Crédits ECTS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            {isDark ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-indigo-500" />}
            <span>{isDark ? "Clair" : "Sombre"}</span>
          </button>

          <Button
            onClick={() => handleOpenUeModal()}
            disabled={!selectedProgramId}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm h-9 px-4 rounded-xl"
          >
            <Plus className="h-4 w-4" /> Ajouter une UE
          </Button>
        </div>
      </div>

      {/* ─── PROGRAM SELECTOR & SEMESTER BAR ────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 flex-1">
            {/* Cycle / Diplôme */}
            <div className="w-full sm:w-56">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Cycle / Diplôme
              </label>
              <Select value={selectedCycle} onValueChange={(val) => setSelectedCycle(val || "Tous")}>
                <SelectTrigger className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl h-10">
                  <SelectValue placeholder="Cycle LMD">
                    {selectedCycle === "Tous" ? "Tous les cycles" : selectedCycle === "Licence" ? "Licence (L1 - L3)" : selectedCycle === "Master" ? "Master (M1 - M2)" : selectedCycle}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <SelectItem value="Tous" className="text-xs">Tous les cycles</SelectItem>
                  <SelectItem value="Licence" className="text-xs">Licence (L1 - L3)</SelectItem>
                  <SelectItem value="Master" className="text-xs">Master (M1 - M2)</SelectItem>
                  <SelectItem value="Doctorat" className="text-xs">Doctorat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filière LMD */}
            <div className="flex-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Filière / Parcours LMD ({filteredPrograms.length})
              </label>
              <Select
                value={selectedProgramId ? String(selectedProgramId) : ""}
                onValueChange={(val) => setSelectedProgramId(Number(val))}
              >
                <SelectTrigger className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl h-10">
                  <SelectValue placeholder="Choisir la filière">
                    {selectedProgram ? `${selectedProgram.name} (${selectedProgram.degreeLevel || "Licence"} • ${selectedProgram.totalCredits || 180} ECTS)` : "Choisir la filière"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-h-72">
                  {filteredPrograms.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                      {p.name} ({p.degreeLevel || "Licence"} • {p.totalCredits} ECTS)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 30 ECTS Balance Bar */}
          <div className="flex items-center gap-3 self-start lg:self-center">
            <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 transition-all ${
              maquette.isCompliant30Credits
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
            }`}>
              {maquette.isCompliant30Credits ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                  Équilibre ECTS Semestre
                </div>
                <div className="text-sm font-black">
                  {maquette.totalCredits} / 30 Crédits ECTS
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Semesters Tabs */}
        <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-4 overflow-x-auto">
          {semesters.map((sem) => (
            <button
              key={sem}
              onClick={() => setSelectedSemester(sem)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                selectedSemester === sem
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-500/25 border border-indigo-600"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60"
              }`}
            >
              Semestre {sem}
            </button>
          ))}
        </div>
      </div>

      {/* ─── MAQUETTE TREE VIEW (UES AND ECUS) ──────────────────────────────── */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-slate-400 dark:text-slate-500">
            <RefreshCw className="h-7 w-7 animate-spin mx-auto mb-3 text-indigo-600 dark:text-indigo-400" />
            Chargement de la maquette pédagogique du {selectedSemester}...
          </div>
        ) : maquette.ues.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
            <Layers className="h-10 w-10 text-slate-400 dark:text-slate-600 mx-auto" />
            <h4 className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">Aucune UE configurée pour le {selectedSemester}</h4>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              Ajoutez les Unités d’Enseignement fondamentales, méthodologiques ou transversales pour atteindre les 30 ECTS requis.
            </p>
            <Button
              onClick={() => handleOpenUeModal()}
              className="mt-4 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-sm"
            >
              <Plus className="h-4 w-4" /> Créer la 1ère UE du {selectedSemester}
            </Button>
          </div>
        ) : (
          maquette.ues.map((ue) => (
            <div
              key={ue.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
            >
              {/* UE Header */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 dark:from-slate-950 dark:via-indigo-950/50 dark:to-slate-950 p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {ue.codeUe}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">{ue.nameUe}</h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-300 font-medium mt-0.5">
                      <span className="text-indigo-300 font-semibold">{ue.typeUe}</span>
                      <span>•</span>
                      <span>{ue.totalHours}h Volume global</span>
                      <span>•</span>
                      <span>Seuil validation : {ue.minPassingGrade}/20</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-black">
                    {ue.creditsEcts} ECTS
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenUeModal(ue)}
                    className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
                    title="Modifier l'UE"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => handleDeleteUe(ue.id)}
                    className="h-8 w-8 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg disabled:opacity-50"
                    title="Supprimer l'UE"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* ECUs List inside UE */}
              <div className="p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 px-1">
                  <span>Éléments Constitutifs (ECU / Matières)</span>
                  <button
                    onClick={() => handleOpenEcuModal(ue.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Ajouter un ECU
                  </button>
                </div>

                {ue.elementsConstitutifs?.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60">
                    Aucun élément constitutif rattaché à cette UE.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {ue.elementsConstitutifs.map((ecu: any) => (
                      <div
                        key={ecu.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-800/60 hover:border-indigo-200 dark:hover:border-indigo-800/60 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {ecu.codeEcu && (
                              <span className="font-mono text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                {ecu.codeEcu}
                              </span>
                            )}
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{ecu.nameEcu}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>Coeff : <strong className="text-slate-800 dark:text-slate-200">{ecu.coefficient}</strong></span>
                            <span>•</span>
                            <span>ECTS : <strong className="text-indigo-600 dark:text-indigo-400">{ecu.creditsEcts}</strong></span>
                            <span>•</span>
                            <span>CM: {ecu.hoursCm}h | TD: {ecu.hoursTd}h | TP: {ecu.hoursTp}h</span>
                            <span>•</span>
                            <span>Éliminatoire : &lt; {ecu.eliminatoryGrade}/20</span>
                            {ecu.teacher && (
                              <>
                                <span>•</span>
                                <span className="text-slate-700 dark:text-slate-300 font-medium">
                                  Prof. {ecu.teacher.firstName} {ecu.teacher.lastName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 self-end sm:self-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEcuModal(ue.id, ecu)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                            title="Modifier l'ECU"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => handleDeleteEcu(ecu.id)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg disabled:opacity-50"
                            title="Supprimer l'ECU"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── MODAL ADD/EDIT UE ────────────────────────────────────────────── */}
      <Dialog open={isUeModalOpen} onOpenChange={setIsUeModalOpen}>
        <DialogContent className="!max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-6 rounded-2xl">
          <form onSubmit={handleSaveUe}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {selectedUe ? "Modifier l'Unité d'Enseignement" : `Nouvelle UE — ${selectedSemester}`}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Définissez les paramètres de la composante UE et son volume d’heures.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Code UE</label>
                  <Input
                    value={ueFormData.codeUe}
                    onChange={(e) => setUeFormData({ ...ueFormData, codeUe: e.target.value })}
                    placeholder="Ex: INF1101"
                    className="text-xs mt-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Type d'UE</label>
                  <Select
                    value={ueFormData.typeUe}
                    onValueChange={(val) => setUeFormData({ ...ueFormData, typeUe: val || "Fondamentale" })}
                  >
                    <SelectTrigger className="text-xs mt-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                      <SelectItem value="Fondamentale" className="text-xs">Fondamentale</SelectItem>
                      <SelectItem value="Méthodologique" className="text-xs">Méthodologique</SelectItem>
                      <SelectItem value="Transversale" className="text-xs">Transversale</SelectItem>
                      <SelectItem value="Découverte / Optionnelle" className="text-xs">Optionnelle / Découverte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Intitulé de l'UE</label>
                <Input
                  value={ueFormData.nameUe}
                  onChange={(e) => setUeFormData({ ...ueFormData, nameUe: e.target.value })}
                  placeholder="Ex: Algorithmique & Structures de Données"
                  className="text-xs mt-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Crédits ECTS</label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={ueFormData.creditsEcts}
                    onChange={(e) => setUeFormData({ ...ueFormData, creditsEcts: Number(e.target.value) })}
                    className="text-xs mt-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Volume Total (h)</label>
                  <Input
                    type="number"
                    min="1"
                    value={ueFormData.totalHours}
                    onChange={(e) => setUeFormData({ ...ueFormData, totalHours: Number(e.target.value) })}
                    className="text-xs mt-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Seuil Valid. (/20)</label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="20"
                    value={ueFormData.minPassingGrade}
                    onChange={(e) => setUeFormData({ ...ueFormData, minPassingGrade: Number(e.target.value) })}
                    className="text-xs mt-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    required
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsUeModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <span>Enregistrer l'UE</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL ADD/EDIT ECU ───────────────────────────────────────────── */}
      <Dialog open={isEcuModalOpen} onOpenChange={setIsEcuModalOpen}>
        <DialogContent className="!max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-6 rounded-2xl">
          <form onSubmit={handleSaveEcu}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {selectedEcu ? "Modifier l'Élément Constitutif (ECU)" : "Nouvel Élément Constitutif (ECU)"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Matière composante, répartition horaire (CM/TD/TP) et enseignant responsable.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3.5 py-4">
              {/* Lier à une matière existante */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Matière du catalogue (Optionnel)
                </label>
                <Select value={ecuFormData.subjectId} onValueChange={handleSelectSubject}>
                  <SelectTrigger className="text-xs mt-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Sélectionner pour pré-remplir" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-h-56">
                    {subjects.map((sub) => (
                      <SelectItem key={sub.id} value={String(sub.id)} className="text-xs">
                        {sub.subjectName} {sub.subjectCode ? `(${sub.subjectCode})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Intitulé de l'ECU</label>
                  <Input
                    value={ecuFormData.nameEcu}
                    onChange={(e) => setEcuFormData({ ...ecuFormData, nameEcu: e.target.value })}
                    placeholder="Ex: Programmation C++"
                    className="text-xs mt-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Code ECU</label>
                  <Input
                    value={ecuFormData.codeEcu}
                    onChange={(e) => setEcuFormData({ ...ecuFormData, codeEcu: e.target.value })}
                    placeholder="ECU-101"
                    className="text-xs mt-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Crédits ECTS</label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={ecuFormData.creditsEcts}
                    onChange={(e) => setEcuFormData({ ...ecuFormData, creditsEcts: Number(e.target.value) })}
                    className="text-xs mt-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Coefficient</label>
                  <Input
                    type="number"
                    min="1"
                    value={ecuFormData.coefficient}
                    onChange={(e) => setEcuFormData({ ...ecuFormData, coefficient: Number(e.target.value) })}
                    className="text-xs mt-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Note Éliminatoire</label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="20"
                    value={ecuFormData.eliminatoryGrade}
                    onChange={(e) => setEcuFormData({ ...ecuFormData, eliminatoryGrade: Number(e.target.value) })}
                    className="text-xs mt-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Heures CM / TD / TP */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Cours Magistral (CM)</label>
                  <Input
                    type="number"
                    min="0"
                    value={ecuFormData.hoursCm}
                    onChange={(e) => setEcuFormData({ ...ecuFormData, hoursCm: Number(e.target.value) })}
                    className="text-xs mt-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Travaux Dirigés (TD)</label>
                  <Input
                    type="number"
                    min="0"
                    value={ecuFormData.hoursTd}
                    onChange={(e) => setEcuFormData({ ...ecuFormData, hoursTd: Number(e.target.value) })}
                    className="text-xs mt-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Travaux Pratiques (TP)</label>
                  <Input
                    type="number"
                    min="0"
                    value={ecuFormData.hoursTp}
                    onChange={(e) => setEcuFormData({ ...ecuFormData, hoursTp: Number(e.target.value) })}
                    className="text-xs mt-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Enseignant */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Enseignant Responsable</label>
                <Select
                  value={ecuFormData.teacherEmployeeId}
                  onValueChange={(val) => setEcuFormData({ ...ecuFormData, teacherEmployeeId: val || "" })}
                >
                  <SelectTrigger className="text-xs mt-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Sélectionner un enseignant" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-h-56">
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                        {t.nom} {t.prenom} {t.specialite ? `(${t.specialite})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEcuModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <span>Enregistrer l'ECU</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
