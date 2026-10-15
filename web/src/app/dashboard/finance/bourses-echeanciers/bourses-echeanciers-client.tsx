"use client";

import React, { useState, useTransition, useMemo } from "react";
import { 
  Award, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  Search, 
  FileDown, 
  Send, 
  Trash2, 
  Edit3, 
  Clock, 
  Building2, 
  Layers, 
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  Percent,
  MessageCircle,
  FileSpreadsheet,
  FileText,
  Filter,
  Users,
  Check,
  ChevronsUpDown,
  ExternalLink,
  ChevronDown,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { 
  saveScholarship, 
  deleteScholarship, 
  initializeDefaultScholarships,
  assignScholarshipToStudent, 
  deleteStudentScholarship,
  generateStudentPaymentSchedule,
  generateBulkPaymentSchedules,
  recordSchedulePayment,
  triggerScheduleReminder,
  ScholarshipInput,
  StudentScholarshipAssignInput
} from "@/domains/finance/actions/bourses-echeanciers.actions";
import { 
  generateAttestationBoursePDF, 
  generateEcheancierPaiementPDF,
  generateLettreRelancePDF,
  exportSchedulesToCSV,
  ScholarshipAttestationParams, 
  PaymentSchedulePDFParams,
  OverdueNoticePDFParams
} from "@/domains/finance/utils/bourses-echeancier-pdf-generator";

interface StudentOption {
  id: number;
  nom: string;
  matricule: string;
  classe?: string | null;
  classId?: number | null;
  mobile?: string;
  whatsapp?: string;
  fraisMensuels?: number;
  totalExpected?: number;
  totalPaid?: number;
  totalReduction?: number;
  balance?: number;
}

interface ClassOption {
  id: number;
  className: string;
  scolariteMensuelle?: number;
}

export function BoursesEcheanciersClient({
  initialData,
  studentsList,
  classesList = [],
}: {
  initialData: any;
  studentsList: StudentOption[];
  classesList?: ClassOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"bourses" | "echeanciers" | "catalogue">("bourses");
  const [search, setSearch] = useState("");

  // Filters for schedules tab
  const [classFilter, setClassFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "overdue" | "pending" | "paid" | "reminded">("all");

  // Modals
  const [isNewBourseModal, setIsNewBourseModal] = useState(false);
  const [isAssignModal, setIsAssignModal] = useState(false);
  const [isGenerateScheduleModal, setIsGenerateScheduleModal] = useState(false);
  const [isBulkScheduleModal, setIsBulkScheduleModal] = useState(false);
  const [isPayModal, setIsPayModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<string>("Espèces");
  const [payRef, setPayRef] = useState<string>("");

  // Form states - Scholarship
  const [bName, setBName] = useState("");
  const [bProvider, setBProvider] = useState("Ministère de l'Enseignement Supérieur");
  const [bType, setBType] = useState("Pourcentage");
  const [bDiscount, setBDiscount] = useState(50);
  const [bAppliesTo, setBAppliesTo] = useState("Frais de Scolarité");

  // Form states - Assign with Searchable Combobox
  const [assignStudentSearch, setAssignStudentSearch] = useState("");
  const [assignStudentId, setAssignStudentId] = useState<number>(studentsList[0]?.id || 0);
  const [assignScholarshipId, setAssignScholarshipId] = useState<number>(initialData.scholarships[0]?.id || 0);
  const [assignDiscount, setAssignDiscount] = useState<number>(50);
  const [assignRef, setAssignRef] = useState(`DEC-BRS-${Date.now().toString().slice(-4)}`);

  // Form states - Schedule Generator with Searchable Combobox
  const [schedStudentSearch, setSchedStudentSearch] = useState("");
  const [schedStudentId, setSchedStudentId] = useState<number>(studentsList[0]?.id || 0);
  const [schedGross, setSchedGross] = useState<number>(700000);
  const [schedDiscount, setSchedDiscount] = useState<number>(50);
  const [schedType, setSchedType] = useState<"mensuel_9" | "mensuel_10" | "trimestriel" | "semestriel">("mensuel_9");

  // Form states - Bulk Generation
  const [bulkClassId, setBulkClassId] = useState<number>(classesList[0]?.id || 0);
  const [bulkSchedType, setBulkSchedType] = useState<"mensuel_9" | "mensuel_10" | "trimestriel" | "semestriel">("mensuel_9");

  // Keep assignScholarshipId in sync if scholarships catalog loads or updates
  React.useEffect(() => {
    if ((!assignScholarshipId || assignScholarshipId === 0) && (initialData.scholarships || []).length > 0) {
      setAssignScholarshipId(initialData.scholarships[0].id);
      setAssignDiscount(initialData.scholarships[0].discountValue || 50);
    }
  }, [initialData.scholarships, assignScholarshipId]);

  const m = initialData.metrics;

  // Find currently selected student in Assign modal
  const selectedAssignStudent = useMemo(() => {
    return studentsList.find((s) => s.id === assignStudentId) || studentsList[0];
  }, [assignStudentId, studentsList]);

  // Find currently selected student in Schedule modal
  const selectedSchedStudent = useMemo(() => {
    return studentsList.find((s) => s.id === schedStudentId) || studentsList[0];
  }, [schedStudentId, studentsList]);

  // Sync schedGross with student fee when selected student changes
  const handleSelectSchedStudent = (st: StudentOption) => {
    setSchedStudentId(st.id);
    setSchedStudentSearch(st.nom);
    if (st.totalExpected && st.totalExpected > 0) {
      setSchedGross(st.totalExpected);
    }
    // Check if this student already has an active scholarship in allocations
    const activeAlloc = initialData.allocations.find((a: any) => a.studentId === st.id && a.status === "Actif");
    if (activeAlloc) {
      setSchedDiscount(Number(activeAlloc.customDiscountPercentage || activeAlloc.scholarshipDiscountValue || 50));
    } else {
      setSchedDiscount(0);
    }
  };

  // Filter allocations
  const filteredAllocations = useMemo(() => {
    return (initialData.allocations || []).filter((a: any) => {
      const term = search.toLowerCase();
      return (
        (a.studentNom || "").toLowerCase().includes(term) ||
        (a.studentMatricule || "").toLowerCase().includes(term) ||
        (a.scholarshipName || "").toLowerCase().includes(term) ||
        (a.studentClasse || "").toLowerCase().includes(term)
      );
    });
  }, [initialData.allocations, search]);

  // Filter schedules with status and class
  const filteredSchedules = useMemo(() => {
    return (initialData.schedules || []).filter((s: any) => {
      // 1. Search filter
      const term = search.toLowerCase();
      const matchSearch = (
        (s.studentNom || "").toLowerCase().includes(term) ||
        (s.studentMatricule || "").toLowerCase().includes(term) ||
        (s.label || "").toLowerCase().includes(term) ||
        (s.studentClasse || "").toLowerCase().includes(term)
      );
      if (!matchSearch) return false;

      // 2. Class filter
      if (classFilter !== "all" && s.studentClasse !== classFilter) {
        return false;
      }

      // 3. Status filter
      if (statusFilter === "overdue") {
        return s.status === "En retard" || (s.balance > 0 && new Date(s.dueDate) < new Date() && s.status !== "Payé");
      }
      if (statusFilter === "pending") {
        return s.status === "À échoir" || (s.balance > 0 && new Date(s.dueDate) >= new Date());
      }
      if (statusFilter === "paid") {
        return s.status === "Payé" || s.balance === 0;
      }
      if (statusFilter === "reminded") {
        return s.status === "Relancé";
      }

      return true;
    });
  }, [initialData.schedules, search, classFilter, statusFilter]);

  // Counts for status pills
  const statusCounts = useMemo(() => {
    const all = initialData.schedules || [];
    const now = new Date();
    return {
      all: all.length,
      overdue: all.filter((s: any) => s.status === "En retard" || (s.balance > 0 && new Date(s.dueDate) < now && s.status !== "Payé")).length,
      pending: all.filter((s: any) => s.status === "À échoir" || (s.balance > 0 && new Date(s.dueDate) >= now)).length,
      paid: all.filter((s: any) => s.status === "Payé" || s.balance === 0).length,
      reminded: all.filter((s: any) => s.status === "Relancé").length,
    };
  }, [initialData.schedules]);

  // Handlers
  const handleSaveScholarship = () => {
    if (!bName) {
      toast.error("Nom de la bourse requis");
      return;
    }
    startTransition(async () => {
      const res = await saveScholarship({
        name: bName,
        provider: bProvider,
        type: bType,
        discountValue: Number(bDiscount),
        appliesTo: bAppliesTo,
        academicYear: "2025-2026",
      });
      if (res.success) {
        toast.success("Bourse ajoutée au catalogue avec succès");
        setIsNewBourseModal(false);
        setBName("");
        router.refresh();
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    });
  };

  const handleAssignScholarship = () => {
    if (!assignStudentId || !assignScholarshipId) {
      toast.error("Étudiant et Bourse requis");
      return;
    }
    startTransition(async () => {
      const res = await assignScholarshipToStudent({
        studentId: Number(assignStudentId),
        scholarshipId: Number(assignScholarshipId),
        customDiscountPercentage: Number(assignDiscount),
        decisionReference: assignRef,
        academicYear: "2025-2026",
      });
      if (res.success) {
        toast.success("Bourse attribuée et synchronisée avec le dossier financier");
        setIsAssignModal(false);
        router.refresh();
      } else {
        toast.error("Erreur lors de l'attribution");
      }
    });
  };

  const handleGenerateSchedule = () => {
    if (!schedStudentId) {
      toast.error("Veuillez sélectionner un étudiant");
      return;
    }
    startTransition(async () => {
      const res = await generateStudentPaymentSchedule({
        studentId: Number(schedStudentId),
        annualGrossAmount: Number(schedGross),
        scholarshipPercentage: Number(schedDiscount),
        scheduleType: schedType,
      });
      if (res.success) {
        toast.success(`Échéancier de ${res.count} tranches généré avec succès`);
        setIsGenerateScheduleModal(false);
        router.refresh();
      } else {
        toast.error("Erreur lors de la génération de l'échéancier");
      }
    });
  };

  const handleBulkSchedule = () => {
    if (!bulkClassId) {
      toast.error("Veuillez choisir une classe");
      return;
    }
    startTransition(async () => {
      const res = await generateBulkPaymentSchedules({
        classId: Number(bulkClassId),
        scheduleType: bulkSchedType,
      });
      if (res.success) {
        toast.success(`Génération terminée : ${res.processedStudents} étudiants traités (${res.totalInstallments} échéances créées)`);
        setIsBulkScheduleModal(false);
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de la génération groupée");
      }
    });
  };

  const handleRecordPayment = () => {
    if (!selectedSchedule || payAmount <= 0) {
      toast.error("Montant de règlement invalide");
      return;
    }
    startTransition(async () => {
      const res = await recordSchedulePayment(
        selectedSchedule.id, 
        Number(payAmount),
        payMode,
        payRef || undefined
      );
      if (res.success) {
        toast.success(`Paiement de ${payAmount.toLocaleString()} FCFA enregistré et comptabilisé`);
        setIsPayModal(false);
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de l'enregistrement");
      }
    });
  };

  const handleWhatsAppReminder = async (sched: any) => {
    startTransition(async () => {
      const res = await triggerScheduleReminder(sched.id);
      if (res.success && res.whatsappUrl) {
        toast.success("Avis de relance prêt, ouverture de WhatsApp...");
        window.open(res.whatsappUrl, "_blank");
        router.refresh();
      } else {
        toast.error("Impossible de préparer la relance");
      }
    });
  };

  const handleDownloadNoticePDF = async (sched: any) => {
    toast.info("Génération de l'Avis de Mise en Demeure...");
    try {
      const allStudentOverdue = (initialData.schedules || []).filter(
        (s: any) => s.studentId === sched.studentId && s.balance > 0
      );
      const totalBalance = allStudentOverdue.reduce((acc: number, curr: any) => acc + Number(curr.balance || 0), 0);

      await generateLettreRelancePDF({
        student: {
          id: sched.studentId,
          nom: sched.studentNom || "Étudiant",
          matricule: sched.studentMatricule || "N/A",
          classe: sched.studentClasse || "Licence",
          parentNom: sched.studentNomPere || undefined,
          telephone: sched.studentWhatsapp || sched.studentMobile || undefined,
        },
        schedule: {
          id: sched.id,
          label: sched.label,
          dueDate: sched.dueDate,
          grossAmount: sched.grossAmount,
          scholarshipDeduction: sched.scholarshipDeduction,
          netAmount: sched.netAmount,
          paidAmount: sched.paidAmount,
          balance: sched.balance,
        },
        allOverdueSchedules: allStudentOverdue.map((s: any) => ({
          label: s.label,
          dueDate: s.dueDate,
          netAmount: s.netAmount,
          balance: s.balance,
        })),
        totalBalanceDue: totalBalance || sched.balance,
        academicYear: "2025-2026",
      });
      toast.success("Mise en demeure téléchargée avec succès");
    } catch (e: any) {
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  const handleDownloadAttestation = async (alloc: any) => {
    toast.info("Génération de l'Attestation Officielle...");
    try {
      const gross = 700000;
      const discountVal = Number(alloc.customDiscountPercentage || alloc.scholarshipDiscountValue || 50);
      const allocated = Number(alloc.allocatedAmount || (gross * discountVal) / 100);
      const net = Math.max(0, gross - allocated);

      await generateAttestationBoursePDF({
        student: {
          id: alloc.studentId,
          nom: alloc.studentNom || "Étudiant",
          matricule: alloc.studentMatricule || "N/A",
          classe: alloc.studentClasse || "Licence",
        },
        scholarship: {
          name: alloc.scholarshipName || "Bourse d'Études",
          provider: alloc.scholarshipProvider || "Ministère de l'Enseignement Supérieur",
          type: alloc.scholarshipType || "Pourcentage",
          discountValue: discountVal,
          allocatedAmount: allocated,
          academicYear: alloc.academicYear || "2025-2026",
          decisionReference: alloc.decisionReference,
          decisionDate: alloc.decisionDate,
        },
        financialSummary: {
          totalGrossTuition: gross,
          scholarshipDeduction: allocated,
          netPayableTuition: net,
        },
      });
      toast.success("Attestation officielle téléchargée");
    } catch (err: any) {
      toast.error("Erreur lors de la génération de l'attestation");
    }
  };

  const handleDownloadFullSchedulePDF = async (studentId: number, studentNom: string, matricule: string, classe: string) => {
    const studentScheds = (initialData.schedules || []).filter((s: any) => s.studentId === studentId);
    if (studentScheds.length === 0) {
      toast.error("Aucune échéance enregistrée pour cet étudiant");
      return;
    }

    toast.info("Génération du calendrier d'amortissement...");
    try {
      const totalGross = studentScheds.reduce((acc: number, curr: any) => acc + Number(curr.grossAmount || 0), 0);
      const totalScholarship = studentScheds.reduce((acc: number, curr: any) => acc + Number(curr.scholarshipDeduction || 0), 0);
      const totalNet = studentScheds.reduce((acc: number, curr: any) => acc + Number(curr.netAmount || 0), 0);
      const totalPaid = studentScheds.reduce((acc: number, curr: any) => acc + Number(curr.paidAmount || 0), 0);
      const totalBalance = studentScheds.reduce((acc: number, curr: any) => acc + Number(curr.balance || 0), 0);

      await generateEcheancierPaiementPDF({
        student: {
          id: studentId,
          nom: studentNom,
          matricule: matricule,
          classe: classe,
        },
        academicYear: "2025-2026",
        schedules: studentScheds.map((s: any) => ({
          installmentNumber: s.installmentNumber,
          label: s.label,
          dueDate: s.dueDate,
          grossAmount: s.grossAmount,
          scholarshipDeduction: s.scholarshipDeduction,
          netAmount: s.netAmount,
          paidAmount: s.paidAmount,
          balance: s.balance,
          status: s.status,
        })),
        summary: {
          totalGross,
          totalScholarship,
          totalNet,
          totalPaid,
          totalBalance,
        },
      });
      toast.success("Échéancier complet téléchargé");
    } catch (err) {
      toast.error("Erreur lors de la génération de l'échéancier PDF");
    }
  };

  return (
    <div className="w-full space-y-6 text-slate-100">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <Link
              href="/dashboard/finance"
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-white transition-all shadow-md"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400">
                  <Award className="w-6 h-6" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  Bourses, Exonérations & Échéanciers
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" /> GESTION FINANCIÈRE & RECOUVREMENT
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Contrôle des bourses d'État et d'excellence, calcul automatique du Net à Payer et suivi des échéances mensuelles.
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsAssignModal(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-medium shadow-lg shadow-amber-600/20 border border-amber-500/30"
            >
              <Award className="w-4 h-4 mr-2" /> Attribuer une Bourse
            </Button>
            <Button
              onClick={() => setIsGenerateScheduleModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20 border border-indigo-500/30"
            >
              <Calendar className="w-4 h-4 mr-2" /> Échéancier Individuel
            </Button>
            <Button
              onClick={() => setIsBulkScheduleModal(true)}
              variant="outline"
              className="bg-slate-800/80 hover:bg-slate-700/80 border-indigo-500/40 text-indigo-300 hover:text-white font-medium shadow-md"
            >
              <Users className="w-4 h-4 mr-2" /> Générer par Classe
            </Button>
            <Button
              onClick={() => exportSchedulesToCSV(initialData.schedules || [])}
              variant="outline"
              className="bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300 hover:text-white font-medium shadow-md"
              title="Exporter les échéances au format Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-400" /> Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 tracking-wider uppercase">
              Étudiants Boursiers
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {m?.boursiersCount ?? 0}
            </span>
            <span className="text-xs text-amber-400 font-medium">
              Bourses & Exonérations actives
            </span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 tracking-wider uppercase">
              Volume Bourses Allouées
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-bold text-emerald-400 tracking-tight">
              {Number(m?.totalAllocatedBourses || 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">FCFA</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Déductions totales appliquées
          </p>
        </div>

        {/* KPI 3 */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 tracking-wider uppercase">
              Impayés & Retards
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-bold text-rose-500 tracking-tight">
              {Number(m?.totalOverdueSchedules || 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">FCFA</span>
          </div>
          <p className="mt-1 text-xs text-rose-400">
            Échéances échues non réglées
          </p>
        </div>

        {/* KPI 4 */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 tracking-wider uppercase">
              Taux de Recouvrement
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-indigo-400 tracking-tight">
              {m?.recoveryRate ?? 0}%
            </span>
            <span className="text-xs text-slate-400">
              {Number(m?.totalPaidSchedules || 0).toLocaleString()} FCFA encaissés
            </span>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("bourses")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "bourses"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Award className="w-4 h-4" /> Boursiers Actifs ({initialData.allocations?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab("echeanciers")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "echeanciers"
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Calendar className="w-4 h-4" /> Échéanciers & Impayés ({initialData.schedules?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab("catalogue")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "catalogue"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Building2 className="w-4 h-4" /> Types de Bourses ({initialData.scholarships?.length || 0})
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher étudiant, bourse..."
            className="pl-9 bg-slate-900/90 border-slate-800 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 text-sm rounded-xl"
          />
        </div>
      </div>

      {/* 4. Tab 1 Content: Boursiers Actifs */}
      {activeTab === "bourses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Liste des Étudiants Boursiers & Exonérés
            </h2>
            <Button
              onClick={() => setIsAssignModal(true)}
              size="sm"
              className="bg-amber-600 hover:bg-amber-500 text-white font-medium"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Nouvelle Attribution
            </Button>
          </div>

          {filteredAllocations.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-base font-medium">Aucun boursier actif trouvé</p>
              <p className="text-slate-500 text-sm mt-1">
                Attribuez une bourse à un étudiant pour calculer automatiquement ses déductions.
              </p>
              <Button
                onClick={() => setIsAssignModal(true)}
                className="mt-4 bg-amber-600 hover:bg-amber-500 text-white"
              >
                Attribuer une Bourse
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Étudiant</th>
                    <th className="py-3.5 px-4">Classe</th>
                    <th className="py-3.5 px-4">Programme de Bourse</th>
                    <th className="py-3.5 px-4">Taux / Déduction</th>
                    <th className="py-3.5 px-4">Réf. Décision</th>
                    <th className="py-3.5 px-4">Statut</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredAllocations.map((a: any) => (
                    <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white">{a.studentNom}</div>
                        <div className="text-xs text-slate-400 font-mono">{a.studentMatricule || `ID #${a.studentId}`}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                          {a.studentClasse || "Licence"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">{a.scholarshipName}</div>
                        <div className="text-xs text-slate-400">{a.scholarshipProvider}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                          {a.customDiscountPercentage || a.scholarshipDiscountValue}% 
                          <span className="text-xs font-normal text-slate-400">
                            (-{Number(a.allocatedAmount || 0).toLocaleString()} FCFA)
                          </span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                        {a.decisionReference || "N/A"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {a.status || "Actif"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            onClick={() => handleDownloadAttestation(a)}
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                            title="Télécharger l'attestation officielle de bourse"
                          >
                            <FileDown className="w-4 h-4 mr-1.5" /> Attestation
                          </Button>
                          <Button
                            onClick={() => {
                              if (confirm("Révoquer cette bourse ? Le dossier financier de l'étudiant sera automatiquement réajusté.")) {
                                startTransition(async () => {
                                  await deleteStudentScholarship(a.id);
                                  toast.success("Bourse révoquée et solde réajusté");
                                  router.refresh();
                                });
                              }
                            }}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2 Content: Échéanciers & Impayés */}
      {activeTab === "echeanciers" && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Calendrier d'Échéances & Suivi du Recouvrement
              </h2>
              <p className="text-xs text-slate-400">
                Gestion des mensualités, règlements partiels et alertes de retard par classe.
              </p>
            </div>

            {/* Class Filter & Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Class Dropdown Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Classe :</span>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">Toutes les classes</option>
                  {classesList.map((c) => (
                    <option key={c.id} value={c.className}>
                      {c.className}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                onClick={() => setIsBulkScheduleModal(true)}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
              >
                <Users className="w-4 h-4 mr-1.5" /> Génération Groupée
              </Button>
              <Button
                onClick={() => setIsGenerateScheduleModal(true)}
                size="sm"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Échéancier Individuel
              </Button>
            </div>
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === "all"
                  ? "bg-slate-700 text-white shadow"
                  : "bg-slate-900/90 text-slate-400 hover:bg-slate-800 border border-slate-800"
              }`}
            >
              Toutes ({statusCounts.all})
            </button>
            <button
              onClick={() => setStatusFilter("overdue")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === "overdue"
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                  : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              En retard ({statusCounts.overdue})
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === "pending"
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
                  : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30"
              }`}
            >
              À échoir ({statusCounts.pending})
            </button>
            <button
              onClick={() => setStatusFilter("paid")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === "paid"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                  : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
              }`}
            >
              Réglées ({statusCounts.paid})
            </button>
            <button
              onClick={() => setStatusFilter("reminded")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === "reminded"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                  : "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30"
              }`}
            >
              Relancées ({statusCounts.reminded})
            </button>
          </div>

          {filteredSchedules.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-base font-medium">Aucune échéance trouvée pour ces filtres</p>
              <p className="text-slate-500 text-sm mt-1">
                Générez un échéancier individuel ou groupé par classe pour automatiser le calendrier.
              </p>
              <Button
                onClick={() => setIsBulkScheduleModal(true)}
                className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Générer par Classe
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Étudiant</th>
                    <th className="py-3.5 px-4">Échéance</th>
                    <th className="py-3.5 px-4">Date Limite</th>
                    <th className="py-3.5 px-4">Brut</th>
                    <th className="py-3.5 px-4">Bourse</th>
                    <th className="py-3.5 px-4">Net Exigible</th>
                    <th className="py-3.5 px-4">Réglé</th>
                    <th className="py-3.5 px-4">Reste Dû</th>
                    <th className="py-3.5 px-4">Statut</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSchedules.map((s: any) => {
                    const isOverdue = s.status === "En retard" || (s.balance > 0 && new Date(s.dueDate) < new Date() && s.status !== "Payé");
                    return (
                      <tr key={s.id} className={`hover:bg-slate-800/40 transition-colors ${isOverdue ? "bg-rose-950/10" : ""}`}>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-white">{s.studentNom}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-slate-400 font-mono">{s.studentMatricule || `ID #${s.studentId}`}</span>
                            <span className="text-xs px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {s.studentClasse || "Licence"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-200">
                          {s.label}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-300">
                          {new Date(s.dueDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                          {Number(s.grossAmount).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-emerald-400">
                          {Number(s.scholarshipDeduction) > 0 ? `-${Number(s.scholarshipDeduction).toLocaleString()}` : "—"}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-indigo-400">
                          {Number(s.netAmount).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-emerald-300">
                          {Number(s.paidAmount).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-rose-400">
                          {Number(s.balance).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              s.status === "Payé"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : s.status === "Relancé"
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                                : isOverdue
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Record payment button */}
                            {s.balance > 0 && (
                              <Button
                                onClick={() => {
                                  setSelectedSchedule(s);
                                  setPayAmount(Number(s.balance));
                                  setPayRef(`REG-${s.installmentNumber}-${Date.now().toString().slice(-4)}`);
                                  setIsPayModal(true);
                                }}
                                size="sm"
                                className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                                title="Enregistrer un règlement"
                              >
                                <CreditCard className="w-3.5 h-3.5 mr-1" /> Régler
                              </Button>
                            )}

                            {/* WhatsApp Direct reminder button for overdue */}
                            {s.balance > 0 && (
                              <Button
                                onClick={() => handleWhatsAppReminder(s)}
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-600/40 text-emerald-400 hover:text-emerald-300"
                                title="Envoyer une relance par WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            {/* Notice PDF button */}
                            {isOverdue && (
                              <Button
                                onClick={() => handleDownloadNoticePDF(s)}
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 bg-rose-950/40 hover:bg-rose-900/60 border-rose-600/40 text-rose-400 hover:text-rose-300"
                                title="Télécharger l'Avis de Mise en Demeure"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            {/* Full student schedule PDF */}
                            <Button
                              onClick={() => handleDownloadFullSchedulePDF(s.studentId, s.studentNom, s.studentMatricule, s.studentClasse)}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10"
                              title="Télécharger l'échéancier complet de l'étudiant"
                            >
                              <FileDown className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. Tab 3 Content: Types de Bourses */}
      {activeTab === "catalogue" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Programmes & Types de Bourses Disponibles
              </h2>
              <p className="text-xs text-slate-400">
                Consultez, ajoutez ou personnalisez les programmes de bourses et d'exonérations applicables.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  startTransition(async () => {
                    const res = await initializeDefaultScholarships();
                    if (res.success) {
                      toast.success(`${res.count || 0} programmes standards initialisés / actualisés.`);
                      router.refresh();
                    } else {
                      toast.error(res.error || "Erreur lors de l'initialisation.");
                    }
                  });
                }}
                disabled={isPending}
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-9"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> Initialiser Standards
              </Button>
              <Button
                onClick={() => setIsNewBourseModal(true)}
                className="bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs h-9"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Ajouter une Bourse
              </Button>
            </div>
          </div>

          {(!initialData.scholarships || initialData.scholarships.length === 0) ? (
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <Award className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Aucun programme de bourse configuré</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  La liste est vide pour cet établissement. Vous pouvez initialiser en un clic les programmes standards (Excellence, Mérite, Sociale, Régionale, Fratrie) ou créer vos propres bourses personnalisées.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  onClick={() => {
                    startTransition(async () => {
                      const res = await initializeDefaultScholarships();
                      if (res.success) {
                        toast.success(`${res.count || 0} programmes standards initialisés avec succès !`);
                        router.refresh();
                      } else {
                        toast.error(res.error || "Erreur lors de l'initialisation.");
                      }
                    });
                  }}
                  disabled={isPending}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs h-9"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Initialiser les Programmes Standards
                </Button>
                <Button
                  onClick={() => setIsNewBourseModal(true)}
                  variant="outline"
                  className="border-slate-700 text-slate-200 hover:bg-slate-800 text-xs h-9"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Créer un Programme Personnalisé
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(initialData.scholarships || []).map((sch: any) => (
                <div
                  key={sch.id}
                  className="relative overflow-hidden rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-xl hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      <Award className="w-6 h-6" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {sch.discountValue} %
                    </span>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-lg font-bold text-white">{sch.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{sch.provider}</p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Appliqué à :</span>
                      <span className="font-medium text-slate-200">{sch.appliesTo || "Frais de Scolarité"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Année :</span>
                      <span className="font-medium text-slate-200">{sch.academicYear || "2025-2026"}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button
                      onClick={() => {
                        if (confirm("Supprimer ce type de bourse du catalogue ?")) {
                          startTransition(async () => {
                            await deleteScholarship(sch.id);
                            toast.success("Bourse supprimée du catalogue");
                            router.refresh();
                          });
                        }
                      }}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. Modal: Attribuer une Bourse */}
      {isAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <Award className="w-5 h-5 text-amber-400" /> Attribuer une Bourse à un Étudiant
              </div>
              <button onClick={() => setIsAssignModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4 text-sm">
              {/* Searchable Student Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Sélectionner l'Étudiant *
                </label>
                <div className="space-y-2">
                  <Input
                    value={assignStudentSearch}
                    onChange={(e) => setAssignStudentSearch(e.target.value)}
                    placeholder="Filtrer par nom ou matricule..."
                    className="bg-slate-950 border-slate-800 text-slate-200 text-xs"
                  />
                  <select
                    value={assignStudentId}
                    onChange={(e) => setAssignStudentId(Number(e.target.value))}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm p-2.5 focus:ring-1 focus:ring-amber-500"
                    size={4}
                  >
                    {studentsList
                      .filter((st) => {
                        const q = assignStudentSearch.toLowerCase();
                        return (st.nom || "").toLowerCase().includes(q) || (st.matricule || "").toLowerCase().includes(q);
                      })
                      .slice(0, 50)
                      .map((st) => (
                        <option key={st.id} value={st.id} className="p-1.5">
                          {st.nom} ({st.matricule}) — {st.classe || "Licence"} • Scolarité: {(st.totalExpected || 700000).toLocaleString()} FCFA
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Selected Student Ledger Preview Card */}
              {selectedAssignStudent && (
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">{selectedAssignStudent.nom}</div>
                    <div className="text-xs text-slate-400">Classe : {selectedAssignStudent.classe || "Licence"} • Matricule : {selectedAssignStudent.matricule}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Scolarité Annuelle</div>
                    <div className="font-mono font-bold text-amber-400">{(selectedAssignStudent.totalExpected || 700000).toLocaleString()} FCFA</div>
                  </div>
                </div>
              )}

              {/* Scholarship Type Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Programme de Bourse *
                </label>
                {(!initialData.scholarships || initialData.scholarships.length === 0) ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
                    <span>Aucun programme disponible pour le moment.</span>
                    <button
                      type="button"
                      onClick={() => {
                        startTransition(async () => {
                          const res = await initializeDefaultScholarships();
                          if (res.success) {
                            toast.success("Programmes standards initialisés !");
                            router.refresh();
                          }
                        });
                      }}
                      className="underline font-bold text-amber-400 hover:text-white ml-2"
                    >
                      Initialiser les bourses
                    </button>
                  </div>
                ) : (
                  <select
                    value={assignScholarshipId}
                    onChange={(e) => {
                      const sid = Number(e.target.value);
                      setAssignScholarshipId(sid);
                      const found = initialData.scholarships.find((s: any) => s.id === sid);
                      if (found) setAssignDiscount(found.discountValue);
                    }}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm p-2.5 focus:ring-1 focus:ring-amber-500"
                  >
                    {(initialData.scholarships || []).map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.discountValue}%) — {s.provider}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Taux de Réduction (%)
                  </label>
                  <Input
                    type="number"
                    value={assignDiscount}
                    onChange={(e) => setAssignDiscount(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="bg-slate-950 border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Réf. Décision / Arrêté
                  </label>
                  <Input
                    value={assignRef}
                    onChange={(e) => setAssignRef(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-200"
                  />
                </div>
              </div>

              {/* Live Financial Calculation Breakdown */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                <div className="flex justify-between">
                  <span>Scolarité de référence :</span>
                  <span className="font-mono font-bold">{(selectedAssignStudent?.totalExpected || 700000).toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Prise en charge ({assignDiscount}%) :</span>
                  <span className="font-mono font-bold">- {Math.round(((selectedAssignStudent?.totalExpected || 700000) * assignDiscount) / 100).toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between font-bold text-white border-t border-amber-500/30 pt-1">
                  <span>Nouveau Reste à Payer par l'étudiant :</span>
                  <span className="font-mono">{Math.round((selectedAssignStudent?.totalExpected || 700000) * (1 - assignDiscount / 100)).toLocaleString()} FCFA</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button variant="ghost" onClick={() => setIsAssignModal(false)} className="text-slate-400">
                Annuler
              </Button>
              <Button
                onClick={handleAssignScholarship}
                disabled={isPending}
                className="bg-amber-600 hover:bg-amber-500 text-white font-medium"
              >
                {isPending ? "Enregistrement..." : "Confirmer l'Attribution"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal: Échéancier Individuel */}
      {isGenerateScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <Calendar className="w-5 h-5 text-indigo-400" /> Générer un Échéancier de Paiement
              </div>
              <button onClick={() => setIsGenerateScheduleModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4 text-sm">
              {/* Searchable Student Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Sélectionner l'Étudiant *
                </label>
                <div className="space-y-2">
                  <Input
                    value={schedStudentSearch}
                    onChange={(e) => setSchedStudentSearch(e.target.value)}
                    placeholder="Filtrer par nom ou matricule..."
                    className="bg-slate-950 border-slate-800 text-slate-200 text-xs"
                  />
                  <select
                    value={schedStudentId}
                    onChange={(e) => {
                      const st = studentsList.find((s) => s.id === Number(e.target.value));
                      if (st) handleSelectSchedStudent(st);
                    }}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm p-2.5 focus:ring-1 focus:ring-indigo-500"
                    size={4}
                  >
                    {studentsList
                      .filter((st) => {
                        const q = schedStudentSearch.toLowerCase();
                        return (st.nom || "").toLowerCase().includes(q) || (st.matricule || "").toLowerCase().includes(q);
                      })
                      .slice(0, 50)
                      .map((st) => (
                        <option key={st.id} value={st.id} className="p-1.5">
                          {st.nom} ({st.matricule}) — {st.classe || "Licence"} • Scolarité: {(st.totalExpected || 700000).toLocaleString()} FCFA
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Installment Pattern */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Formule & Fréquence de Paiement *
                </label>
                <select
                  value={schedType}
                  onChange={(e: any) => setSchedType(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm p-2.5 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="mensuel_9">9 Mensualités (Octobre à Juin - Standard Universitaire)</option>
                  <option value="mensuel_10">10 Mensualités (Septembre à Juin - Scolaire)</option>
                  <option value="trimestriel">3 Trimestres (Tranche 1: 40%, Tranche 2: 30%, Tranche 3: 30%)</option>
                  <option value="semestriel">2 Semestres (50% / 50%)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Scolarité Brute Annuelle (FCFA)
                  </label>
                  <Input
                    type="number"
                    value={schedGross}
                    onChange={(e) => setSchedGross(Number(e.target.value))}
                    className="bg-slate-950 border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Déduction Bourse (%)
                  </label>
                  <Input
                    type="number"
                    value={schedDiscount}
                    onChange={(e) => setSchedDiscount(Number(e.target.value))}
                    min={0}
                    max={100}
                    className="bg-slate-950 border-slate-800 text-slate-200"
                  />
                </div>
              </div>

              {/* Simulation Box */}
              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 space-y-1.5">
                <div className="flex justify-between">
                  <span>Total Brut :</span>
                  <span className="font-mono font-bold">{schedGross.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Prise en Charge Bourse ({schedDiscount}%) :</span>
                  <span className="font-mono font-bold">- {Math.round((schedGross * schedDiscount) / 100).toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between font-bold text-white border-t border-indigo-500/30 pt-1">
                  <span>Net Total à Échelonner :</span>
                  <span className="font-mono text-indigo-400">{Math.round(schedGross * (1 - schedDiscount / 100)).toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Moyenne par tranche :</span>
                  <span className="font-mono text-white">
                    {Math.round((schedGross * (1 - schedDiscount / 100)) / (schedType === "semestriel" ? 2 : schedType === "trimestriel" ? 3 : schedType === "mensuel_10" ? 10 : 9)).toLocaleString()} FCFA
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button variant="ghost" onClick={() => setIsGenerateScheduleModal(false)} className="text-slate-400">
                Annuler
              </Button>
              <Button
                onClick={handleGenerateSchedule}
                disabled={isPending}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
              >
                {isPending ? "Génération..." : "Générer l'Échéancier"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modal: Génération Groupée par Classe */}
      {isBulkScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <Users className="w-5 h-5 text-indigo-400" /> Génération Groupée par Classe
              </div>
              <button onClick={() => setIsBulkScheduleModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4 text-sm">
              <p className="text-xs text-slate-400">
                Cette opération génère automatiquement les échéanciers pour l'ensemble des étudiants actifs de la classe sélectionnée, en appliquant automatiquement la bourse de chaque élève.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Classe Cible *
                </label>
                <select
                  value={bulkClassId}
                  onChange={(e) => setBulkClassId(Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm p-2.5 focus:ring-1 focus:ring-indigo-500"
                >
                  {classesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.className}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Formule d'Échelonnement *
                </label>
                <select
                  value={bulkSchedType}
                  onChange={(e: any) => setBulkSchedType(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm p-2.5 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="mensuel_9">9 Mensualités (Octobre à Juin - Standard)</option>
                  <option value="mensuel_10">10 Mensualités (Septembre à Juin)</option>
                  <option value="trimestriel">3 Trimestres (Tranche 1: 40%, Tranche 2: 30%, Tranche 3: 30%)</option>
                  <option value="semestriel">2 Semestres (50% / 50%)</option>
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="font-semibold text-white">Règles d'Entreprise Appliquées :</div>
                <div>• Les scolarités sont prélevées depuis le dossier financier de chaque élève</div>
                <div>• Les déductions de bourses actives sont déduites avant calcul du net</div>
                <div>• Les échéanciers préexistants de ces étudiants seront remplacés</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button variant="ghost" onClick={() => setIsBulkScheduleModal(false)} className="text-slate-400">
                Annuler
              </Button>
              <Button
                onClick={handleBulkSchedule}
                disabled={isPending}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/30"
              >
                {isPending ? "Génération en cours..." : "Lancer la Génération Groupée"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Modal: Règlement d'Échéance */}
      {isPayModal && selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <CreditCard className="w-5 h-5 text-emerald-400" /> Règlement d'Échéance
              </div>
              <button onClick={() => setIsPayModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs text-slate-400">Étudiant</div>
                <div className="font-bold text-white text-base">{selectedSchedule.studentNom}</div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Matricule : {selectedSchedule.studentMatricule || "N/A"} • {selectedSchedule.label}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400">Montant Net Exigible</div>
                  <div className="font-mono font-bold text-indigo-400 text-sm mt-0.5">
                    {Number(selectedSchedule.netAmount).toLocaleString()} FCFA
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400">Solde Restant Dû</div>
                  <div className="font-mono font-bold text-rose-400 text-sm mt-0.5">
                    {Number(selectedSchedule.balance).toLocaleString()} FCFA
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Montant à Encaisser (FCFA) *
                </label>
                <Input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  max={selectedSchedule.balance}
                  min={1}
                  className="bg-slate-950 border-slate-800 text-slate-200 font-mono text-base font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Mode de Règlement *
                </label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm p-2.5 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Espèces">Espèces (Caisse Centrale)</option>
                  <option value="Orange Money">Orange Money</option>
                  <option value="Moov Money">Moov Money</option>
                  <option value="Virement Bancaire">Virement Bancaire (BOA / BIA)</option>
                  <option value="Chèque">Chèque Certifié</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Référence de Transaction
                </label>
                <Input
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="Ex: REC-49102 ou N° Transaction"
                  className="bg-slate-950 border-slate-800 text-slate-200 text-xs font-mono"
                />
              </div>

              <p className="text-[11px] text-emerald-400/80 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                ✓ Ce règlement sera automatiquement synchronisé avec le Grand Livre Comptable et le compte élève.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button variant="ghost" onClick={() => setIsPayModal(false)} className="text-slate-400">
                Annuler
              </Button>
              <Button
                onClick={handleRecordPayment}
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              >
                {isPending ? "Traitement..." : "Confirmer le Règlement"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Modal: Nouveau Type de Bourse */}
      {isNewBourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <Building2 className="w-5 h-5 text-amber-400" /> Ajouter un Type de Bourse
              </div>
              <button onClick={() => setIsNewBourseModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Intitulé du Programme *
                </label>
                <Input
                  value={bName}
                  onChange={(e) => setBName(e.target.value)}
                  placeholder="Ex: Bourse d'Excellence Académique"
                  className="bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Organisme / Pourvoyeur
                </label>
                <Input
                  value={bProvider}
                  onChange={(e) => setBProvider(e.target.value)}
                  placeholder="Ex: Ministère de l'Enseignement Supérieur, Fondation..."
                  className="bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Valeur (%) *
                  </label>
                  <Input
                    type="number"
                    value={bDiscount}
                    onChange={(e) => setBDiscount(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="bg-slate-950 border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Appliqué à
                  </label>
                  <Input
                    value={bAppliesTo}
                    onChange={(e) => setBAppliesTo(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button variant="ghost" onClick={() => setIsNewBourseModal(false)} className="text-slate-400">
                Annuler
              </Button>
              <Button
                onClick={handleSaveScholarship}
                disabled={isPending}
                className="bg-amber-600 hover:bg-amber-500 text-white font-medium"
              >
                {isPending ? "Enregistrement..." : "Ajouter au Catalogue"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
