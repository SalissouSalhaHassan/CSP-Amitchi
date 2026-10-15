"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  UserPlus,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Search,
  Filter,
  Eye,
  Plus,
  Trash2,
  Check,
  Send,
  Loader2,
  Calendar,
  Phone,
  MessageSquare,
  Award,
  BookOpen,
  MapPin,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  QrCode,
  Share2,
  Copy,
  Printer,
  Globe,
  Download,
  School,
  GraduationCap,
  Briefcase,
  Layers,
  HelpCircle,
  FileCheck,
  Camera,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  getAdmissionsDashboardStats,
  getAdmissionApplicationsList,
  submitAdmissionApplicationAction,
  reviewAdmissionApplicationAction,
  scoreAdmissionApplicationAction,
  deleteAdmissionApplicationAction,
  getPublicSchoolInfoForAdmissionsAction,
} from "@/domains/admissions/actions/admissions.actions";
import { UNIVERSITY_FACULTIES } from "@/domains/admissions/constants/admissions.constants";
import { getDocumentHeaderConfig } from "@/domains/settings/actions/settings.actions";
import AdmissionsPrintModal, { AdmissionsDocType } from "@/domains/admissions/components/AdmissionsPrintModal";
import AdmissionDocumentViewerModal from "@/domains/admissions/components/AdmissionDocumentViewerModal";

export default function AdmissionsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalApplications: 0,
    pendingReview: 0,
    admitted: 0,
    rejected: 0,
    universityCount: 0,
  });

  const [applications, setApplications] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [levelFilter, setLevelFilter] = useState("ALL"); // 'ALL' | 'UNIV' | 'GENERAL'
  const [facultyFilter, setFacultyFilter] = useState("ALL");
  const [classesList, setClassesList] = useState<string[]>([]);
  const [headerConfig, setHeaderConfig] = useState<any>(null);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Print Modal States
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState<AdmissionsDocType>("letter");
  const [printSelectedApp, setPrintSelectedApp] = useState<any | null>(null);

  // Selected Application for Review Modal
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [assignedClass, setAssignedClass] = useState("");
  const [admissionScore, setAdmissionScore] = useState<number | undefined>(undefined);
  const [interviewScore, setInterviewScore] = useState<number | undefined>(undefined);
  const [juryDecision, setJuryDecision] = useState<string>("Admis / Accepté");

  // Document Viewer Modal States
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [activeDocKey, setActiveDocKey] = useState<string>("bacTranscriptUrl");
  const [docViewerApp, setDocViewerApp] = useState<any | null>(null);

  // Share & QR Modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [publicUrl, setPublicUrl] = useState("https://edut.pro/admissions/apply");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPublicUrl(`${window.location.origin}/admissions/apply`);
    }
  }, []);

  // New Direct Application Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [newApp, setNewApp] = useState({
    educationLevel: "Université / Supérieur",
    faculty: "Faculté des Sciences & Technologies",
    department: "Informatique & Génie Logiciel",
    degreeProgram: "Licence Informatique & Génie Logiciel (L1-L3)",
    degreeLevel: "Licence 1",
    studyMode: "Présentiel / Temps plein",
    targetClass: "Licence 1 Informatique & Génie Logiciel",
    studentFirstName: "",
    studentLastName: "",
    dateOfBirth: "",
    gender: "M",
    placeOfBirth: "Niamey",
    nationality: "Nigérienne",
    candidateEmail: "",
    candidatePhone: "",
    candidateWhatsapp: "",
    bacSeries: "Série D",
    bacYear: "2026",
    bacMention: "Bien",
    bacRollNumber: "",
    previousSchool: "",
    previousGradeAvg: "",
    parentName: "",
    parentRelation: "Père",
    parentPhone: "",
    parentWhatsapp: "",
    parentEmail: "",
    parentProfession: "",
    address: "",
    city: "Niamey",
    medicalNotes: "",
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [statsRes, listRes, schoolInfoRes, headerConfigRes] = await Promise.all([
        getAdmissionsDashboardStats(),
        getAdmissionApplicationsList({
          status: statusFilter,
          query: searchQuery,
        }),
        getPublicSchoolInfoForAdmissionsAction(),
        getDocumentHeaderConfig().catch(() => null),
      ]);

      if (statsRes) setStats((statsRes as any)?.data || statsRes);
      const apps = (listRes as any)?.data?.applications || (listRes as any)?.applications || [];
      setApplications(apps);

      if (schoolInfoRes?.classes) {
        setClassesList(schoolInfoRes.classes);
      }
      if (headerConfigRes) {
        setHeaderConfig((headerConfigRes as any)?.data || headerConfigRes);
      }
    } catch (error) {
      console.error("Failed to load admissions data:", error);
      toast.error("Erreur de chargement des candidatures.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Client-Side Level & Faculty Filtering
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const isUniv = (app.educationLevel || "").toLowerCase().includes("univ") || (app.educationLevel || "").toLowerCase().includes("sup");
      if (levelFilter === "UNIV" && !isUniv) return false;
      if (levelFilter === "GENERAL" && isUniv) return false;
      if (facultyFilter !== "ALL" && app.faculty !== facultyFilter) return false;
      return true;
    });
  }, [applications, levelFilter, facultyFilter]);

  // Handle Review Submission
  const handleReview = async (decision: "Admis / Accepté" | "Refusé" | "Liste d'attente" | "En examen" | "Admis sous condition") => {
    if (!selectedApp) return;

    try {
      setIsSubmittingReview(true);
      const res: any = await reviewAdmissionApplicationAction({
        applicationId: selectedApp.id,
        decision,
        reviewNotes,
        assignedClass: assignedClass || selectedApp.degreeProgram || selectedApp.targetClass,
        admissionScore: admissionScore,
      });

      const payload = res?.data || res;
      if (payload?.success) {
        toast.success(payload.message || `Dossier marqué comme : ${decision}`);
        setIsReviewModalOpen(false);
        setSelectedApp(null);
        loadData();
      } else {
        toast.error(payload?.error || res?.error || "Erreur lors de la décision.");
      }
    } catch (err: any) {
      toast.error("Erreur serveur lors de la validation.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Handle Adding New Candidate from Dashboard
  const handleAddNewCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApp.studentFirstName || !newApp.studentLastName || !newApp.parentName || !newApp.parentPhone) {
      toast.error("Veuillez renseigner les champs obligatoires (*).");
      return;
    }

    try {
      setIsSubmittingNew(true);
      const res = await submitAdmissionApplicationAction({
        ...newApp,
      });

      if (res.success) {
        toast.success(`Candidature créée avec succès ! N° ${res.applicationNumber}`);
        setIsAddModalOpen(false);
        loadData();
      } else {
        toast.error(res.error || "Erreur lors de la création.");
      }
    } catch (err: any) {
      toast.error("Erreur serveur lors de l'enregistrement.");
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Handle Deleting Application
  const handleDelete = async (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer ce dossier de candidature ?")) return;

    try {
      const res = await deleteAdmissionApplicationAction(id);
      if (res.success) {
        toast.success("Dossier supprimé.");
        setApplications(prev => prev.filter(a => a.id !== id));
      } else {
        toast.error(res.error || "Erreur lors de la suppression.");
      }
    } catch (err: any) {
      toast.error("Erreur serveur.");
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredApplications.length === 0) {
      toast.info("Aucune candidature à exporter.");
      return;
    }

    const headers = [
      "Numéro Dossier",
      "Nom",
      "Prénom",
      "Niveau / Cycle",
      "Faculté",
      "Filière / Classe",
      "Série Bac",
      "Année Bac",
      "Mention",
      "Statut",
      "Téléphone Candidat",
      "Parent / Tuteur",
      "Téléphone Parent",
      "Date de Dépôt"
    ];

    const rows = filteredApplications.map(a => [
      `"${a.applicationNumber || ""}"`,
      `"${a.studentLastName || ""}"`,
      `"${a.studentFirstName || ""}"`,
      `"${a.educationLevel || ""}"`,
      `"${a.faculty || ""}"`,
      `"${a.degreeProgram || a.targetClass || ""}"`,
      `"${a.bacSeries || ""}"`,
      `"${a.bacYear || ""}"`,
      `"${a.bacMention || ""}"`,
      `"${a.status || ""}"`,
      `"${a.candidatePhone || ""}"`,
      `"${a.parentName || ""}"`,
      `"${a.parentPhone || ""}"`,
      `"${a.createdAt ? new Date(a.createdAt).toLocaleDateString("fr-FR") : ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Admissions_Export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exportation CSV réussie !");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50 dark:bg-slate-950/50">

      {/* ─── Top Header & Global Actions ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="size-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <GraduationCap className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                Admissions &amp; Nouvelles Inscriptions
                <span className="text-xs uppercase font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300 px-3 py-1 rounded-full border border-emerald-200/50 dark:border-emerald-800">
                  LMD &amp; Multi-Cycles
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Pilotage centralisé des candidatures universitaires, jurys de sélection, notations et immatriculation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black flex items-center gap-2 transition"
          >
            <Share2 className="size-4" />
            Lien &amp; QR Candidat
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black flex items-center gap-2 transition"
          >
            <Download className="size-4" />
            Export CSV
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
          >
            <Plus className="size-4" />
            Nouveau Dossier
          </button>
        </div>
      </div>

      {/* ─── KPI Metrics ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Candidatures</span>
            <FileText className="size-4" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">{stats.totalApplications}</p>
          <span className="text-[10px] font-bold text-slate-500">Toutes filières confondues</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-blue-500">
            <span className="text-[10px] font-black uppercase tracking-wider">Pôle Universitaire</span>
            <GraduationCap className="size-4" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 font-mono">{stats.universityCount}</p>
          <span className="text-[10px] font-bold text-slate-500">Licence • Master • Doctorat</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-[10px] font-black uppercase tracking-wider">En Attente / Examen</span>
            <Clock className="size-4" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">{stats.pendingReview}</p>
          <span className="text-[10px] font-bold text-slate-500">Dossiers à délibérer</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-emerald-500">
            <span className="text-[10px] font-black uppercase tracking-wider">Admis Définitivement</span>
            <CheckCircle2 className="size-4" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{stats.admitted}</p>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            {stats.totalApplications > 0 ? `${Math.round((stats.admitted / stats.totalApplications) * 100)}% d'admission` : "0%"}
          </span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-rose-500">
            <span className="text-[10px] font-black uppercase tracking-wider">Non Retenus</span>
            <XCircle className="size-4" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">{stats.rejected}</p>
          <span className="text-[10px] font-bold text-slate-500">Dossiers refusés</span>
        </div>
      </div>

      {/* ─── Main Filters & Search Toolbar ─────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Level Switcher (Tabs style) */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl w-full md:w-auto">
            <button
              onClick={() => setLevelFilter("ALL")}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                levelFilter === "ALL"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Tous les Niveaux ({applications.length})
            </button>
            <button
              onClick={() => setLevelFilter("UNIV")}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition ${
                levelFilter === "UNIV"
                  ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <GraduationCap className="size-3.5" />
              Pôle Universitaire ({stats.universityCount})
            </button>
            <button
              onClick={() => setLevelFilter("GENERAL")}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition ${
                levelFilter === "GENERAL"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <School className="size-3.5" />
              Général / Lycée ({applications.length - stats.universityCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
            <input
              type="text"
              placeholder="Rechercher candidat, dossier, email, matricule..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Statut :</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="En attente">En attente de commission</option>
              <option value="En examen">En examen / Entretien</option>
              <option value="Admis / Accepté">Admis Définitivement</option>
              <option value="Admis sous condition">Admis sous condition</option>
              <option value="Liste d'attente">Liste d&apos;attente</option>
              <option value="Refusé">Refusé</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Faculté :</span>
            <select
              value={facultyFilter}
              onChange={(e) => setFacultyFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="ALL">Toutes les facultés</option>
              {UNIVERSITY_FACULTIES.map(f => (
                <option key={f.name} value={f.name}>{f.name}</option>
              ))}
            </select>
          </div>

          <span className="text-xs text-slate-400 ml-auto font-bold">
            {filteredApplications.length} dossier(s) affiché(s)
          </span>
        </div>
      </div>

      {/* ─── Applications Data Table ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-24 text-center space-y-3">
            <Loader2 className="size-8 text-emerald-500 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-400">Chargement des dossiers d&apos;admissions...</p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <FileText className="size-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-sm font-black text-slate-700 dark:text-slate-300">Aucun dossier de candidature trouvé</p>
            <p className="text-xs text-slate-400">Modifiez vos critères de recherche ou ajoutez un nouveau dossier.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-4">Dossier / Date</th>
                  <th className="px-5 py-4">Candidat &amp; Identité</th>
                  <th className="px-5 py-4">Programme &amp; Faculté</th>
                  <th className="px-5 py-4">Baccalauréat / Score</th>
                  <th className="px-5 py-4">Statut &amp; Décision</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredApplications.map((app) => {
                  const isUniv = (app.educationLevel || "").toLowerCase().includes("univ") || (app.educationLevel || "").toLowerCase().includes("sup");

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      
                      {/* 1. Dossier Number & Date */}
                      <td className="px-5 py-4">
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 block">
                          {app.applicationNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {app.createdAt ? new Date(app.createdAt).toLocaleDateString("fr-FR") : "—"}
                        </span>
                        {/* Attached Docs Badge */}
                        {(() => {
                          const docCount = [
                            app.bacTranscriptUrl,
                            app.bacCertificateUrl,
                            app.idCardPassportUrl,
                            app.birthCertificateUrl,
                            app.cvUrl,
                            app.higherEdTranscriptUrl,
                            app.photoUrl,
                            app.reportCardUrl,
                            app.coverLetter,
                          ].filter(Boolean).length;

                          if (docCount === 0) return null;
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                setDocViewerApp(app);
                                setActiveDocKey("bacTranscriptUrl");
                                setIsDocViewerOpen(true);
                              }}
                              className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 px-2 py-0.5 rounded-md border border-emerald-200/50 dark:border-emerald-900 transition"
                              title="Voir les pièces numérisées"
                            >
                              <FileCheck className="size-3" />
                              <span>{docCount} pièce(s)</span>
                            </button>
                          );
                        })()}
                      </td>


                      {/* 2. Candidate & Identity */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {app.studentLastName?.toUpperCase()} {app.studentFirstName}
                          {app.gender === "F" ? (
                            <span className="text-[10px] text-pink-500 font-bold">(F)</span>
                          ) : (
                            <span className="text-[10px] text-blue-500 font-bold">(M)</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{app.candidatePhone || app.parentPhone}</span>
                          {app.candidateEmail && (
                            <span className="text-slate-500 truncate max-w-[140px]">{app.candidateEmail}</span>
                          )}
                        </div>
                      </td>

                      {/* 3. Program & Faculty */}
                      <td className="px-5 py-4">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">
                          {app.degreeProgram || app.targetClass}
                        </span>
                        {app.faculty && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[200px] block">
                            {app.faculty}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-emerald-500 uppercase">
                          {isUniv ? (app.degreeLevel || "Licence") : (app.educationLevel || "Secondaire")}
                        </span>
                      </td>

                      {/* 4. Bac & Score */}
                      <td className="px-5 py-4">
                        {app.bacSeries ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-700 dark:text-slate-300 block text-[11px]">
                              {app.bacSeries} ({app.bacYear || "2026"})
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Mention : <strong className="text-slate-200">{app.bacMention || "Passable"}</strong>
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                        {app.admissionScore !== null && app.admissionScore !== undefined && (
                          <span className="inline-block mt-1 text-[10px] font-black bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300 px-2 py-0.5 rounded-md">
                            Score : {app.admissionScore}/100
                          </span>
                        )}
                      </td>

                      {/* 5. Status & Decision */}
                      <td className="px-5 py-4">
                        {app.status === "Admis / Accepté" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900">
                            <CheckCircle2 className="size-3" /> Admis
                          </span>
                        )}
                        {app.status === "Admis sous condition" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/60 dark:border-teal-900">
                            <CheckCircle2 className="size-3" /> Sous Réserve
                          </span>
                        )}
                        {app.status === "En attente" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900">
                            <Clock className="size-3" /> En attente
                          </span>
                        )}
                        {app.status === "En examen" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900">
                            <Clock className="size-3" /> En examen
                          </span>
                        )}
                        {app.status === "Liste d'attente" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900">
                            Attente
                          </span>
                        )}
                        {app.status === "Refusé" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900">
                            <XCircle className="size-3" /> Refusé
                          </span>
                        )}

                        {app.generatedMatricule && (
                          <span className="text-[10px] font-mono text-emerald-500 font-bold block mt-1">
                            {app.generatedMatricule}
                          </span>
                        )}
                      </td>

                      {/* 6. Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedApp(app);
                              setReviewNotes(app.reviewNotes || "");
                              setAssignedClass(app.targetClass || app.degreeProgram || "");
                              setAdmissionScore(app.admissionScore || undefined);
                              setIsReviewModalOpen(true);
                            }}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                            title="Examiner et Délibérer"
                          >
                            <Eye className="size-4" />
                          </button>

                          <button
                            onClick={() => {
                              setDocViewerApp(app);
                              setActiveDocKey("bacTranscriptUrl");
                              setIsDocViewerOpen(true);
                            }}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400 transition"
                            title="Consulter les Pièces Justificatives Numérisées"
                          >
                            <FileCheck className="size-4" />
                          </button>

                          <button
                            onClick={() => {
                              setPrintSelectedApp(app);
                              setPrintDocType("letter");
                              setIsPrintModalOpen(true);
                            }}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                            title="Imprimer l'Attestation / Récépissé"
                          >
                            <Printer className="size-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(app.id)}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 transition"
                            title="Supprimer"
                          >
                            <Trash2 className="size-4" />
                          </button>
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

      {/* ─── REVIEW & JURY DELIBERATION MODAL ──────────────────────────────── */}

      {isReviewModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-3xl w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200 my-8">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500">
                  Dossier : {selectedApp.applicationNumber}
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Délibération du Jury • {selectedApp.studentLastName?.toUpperCase()} {selectedApp.studentFirstName}
                </h3>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Candidate Dossier Overview Grid */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Cycle &amp; Niveau</span>
                <strong className="text-slate-800 dark:text-slate-200">{selectedApp.educationLevel || "Université"} ({selectedApp.degreeLevel || "L1"})</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Filière / Programme</span>
                <strong className="text-slate-800 dark:text-slate-200">{selectedApp.degreeProgram || selectedApp.targetClass}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Régime d&apos;Étude</span>
                <strong className="text-slate-800 dark:text-slate-200">{selectedApp.studyMode || "Présentiel"}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Baccalauréat</span>
                <strong className="text-slate-800 dark:text-slate-200">{selectedApp.bacSeries || "—"} ({selectedApp.bacYear || "—"}) - {selectedApp.bacMention || "—"}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact Candidat</span>
                <strong className="text-slate-800 dark:text-slate-200 font-mono">{selectedApp.candidatePhone || selectedApp.parentPhone}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Email</span>
                <strong className="text-slate-800 dark:text-slate-200">{selectedApp.candidateEmail || selectedApp.parentEmail || "—"}</strong>
              </div>
            </div>

            {/* Pièces Justificatives Numérisées */}
            <div className="space-y-2.5 p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="size-4 text-emerald-500" />
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                    Pièces Justificatives Numérisées :
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDocViewerApp(selectedApp);
                    setActiveDocKey("bacTranscriptUrl");
                    setIsDocViewerOpen(true);
                  }}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 flex items-center gap-1 transition"
                >
                  <Eye className="size-3.5" />
                  Ouvrir la Visionneuse
                </button>
              </div>

              {/* Document Action Chips */}
              <div className="flex flex-wrap gap-2">
                {selectedApp.bacTranscriptUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setDocViewerApp(selectedApp);
                      setActiveDocKey("bacTranscriptUrl");
                      setIsDocViewerOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-xs font-bold text-blue-600 dark:text-blue-300 flex items-center gap-1.5 border border-blue-200/60 dark:border-blue-800 transition shadow-sm group"
                  >
                    <Award className="size-3.5 group-hover:scale-110 transition-transform" />
                    <span>Relevé Bac</span>
                    <span className="size-1.5 rounded-full bg-blue-500" />
                  </button>
                )}

                {selectedApp.bacCertificateUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setDocViewerApp(selectedApp);
                      setActiveDocKey("bacCertificateUrl");
                      setIsDocViewerOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-xs font-bold text-purple-600 dark:text-purple-300 flex items-center gap-1.5 border border-purple-200/60 dark:border-purple-800 transition shadow-sm group"
                  >
                    <GraduationCap className="size-3.5 group-hover:scale-110 transition-transform" />
                    <span>Diplôme Bac</span>
                    <span className="size-1.5 rounded-full bg-purple-500" />
                  </button>
                )}

                {selectedApp.idCardPassportUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setDocViewerApp(selectedApp);
                      setActiveDocKey("idCardPassportUrl");
                      setIsDocViewerOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-xs font-bold text-teal-600 dark:text-teal-300 flex items-center gap-1.5 border border-teal-200/60 dark:border-teal-800 transition shadow-sm group"
                  >
                    <FileText className="size-3.5 group-hover:scale-110 transition-transform" />
                    <span>Pièce d&apos;Identité</span>
                    <span className="size-1.5 rounded-full bg-teal-500" />
                  </button>
                )}

                {selectedApp.birthCertificateUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setDocViewerApp(selectedApp);
                      setActiveDocKey("birthCertificateUrl");
                      setIsDocViewerOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/60 text-xs font-bold text-cyan-600 dark:text-cyan-300 flex items-center gap-1.5 border border-cyan-200/60 dark:border-cyan-800 transition shadow-sm group"
                  >
                    <Calendar className="size-3.5 group-hover:scale-110 transition-transform" />
                    <span>Acte de Naissance</span>
                    <span className="size-1.5 rounded-full bg-cyan-500" />
                  </button>
                )}

                {selectedApp.cvUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setDocViewerApp(selectedApp);
                      setActiveDocKey("cvUrl");
                      setIsDocViewerOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-xs font-bold text-indigo-600 dark:text-indigo-300 flex items-center gap-1.5 border border-indigo-200/60 dark:border-indigo-800 transition shadow-sm group"
                  >
                    <Briefcase className="size-3.5 group-hover:scale-110 transition-transform" />
                    <span>CV Candidat</span>
                    <span className="size-1.5 rounded-full bg-indigo-500" />
                  </button>
                )}

                {selectedApp.higherEdTranscriptUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setDocViewerApp(selectedApp);
                      setActiveDocKey("higherEdTranscriptUrl");
                      setIsDocViewerOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-xs font-bold text-emerald-600 dark:text-emerald-300 flex items-center gap-1.5 border border-emerald-200/60 dark:border-emerald-800 transition shadow-sm group"
                  >
                    <Layers className="size-3.5 group-hover:scale-110 transition-transform" />
                    <span>Relevés Supérieur</span>
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                  </button>
                )}

                {selectedApp.photoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setDocViewerApp(selectedApp);
                      setActiveDocKey("photoUrl");
                      setIsDocViewerOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/60 dark:hover:bg-pink-900/60 text-xs font-bold text-pink-600 dark:text-pink-300 flex items-center gap-1.5 border border-pink-200/60 dark:border-pink-800 transition shadow-sm group"
                  >
                    <Camera className="size-3.5 group-hover:scale-110 transition-transform" />
                    <span>Photo d&apos;Identité</span>
                    <span className="size-1.5 rounded-full bg-pink-500" />
                  </button>
                )}

                {selectedApp.reportCardUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setDocViewerApp(selectedApp);
                      setActiveDocKey("reportCardUrl");
                      setIsDocViewerOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-xs font-bold text-amber-600 dark:text-amber-300 flex items-center gap-1.5 border border-amber-200/60 dark:border-amber-800 transition shadow-sm group"
                  >
                    <FileCheck className="size-3.5 group-hover:scale-110 transition-transform" />
                    <span>Bulletins</span>
                    <span className="size-1.5 rounded-full bg-amber-500" />
                  </button>
                )}

                {selectedApp.coverLetter && (
                  <button
                    type="button"
                    onClick={() => {
                      setDocViewerApp(selectedApp);
                      setActiveDocKey("coverLetter");
                      setIsDocViewerOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 transition shadow-sm group"
                  >
                    <FileText className="size-3.5 group-hover:scale-110 transition-transform" />
                    <span>Lettre Motivation</span>
                    <span className="size-1.5 rounded-full bg-slate-500" />
                  </button>
                )}

                {/* Add / Scan New Piece Button */}
                <button
                  type="button"
                  onClick={() => {
                    setDocViewerApp(selectedApp);
                    setActiveDocKey("bacTranscriptUrl");
                    setIsDocViewerOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 border border-dashed border-emerald-500/40 transition shadow-sm"
                >
                  <Plus className="size-3.5" />
                  <span>Joindre / Numériser</span>
                </button>
              </div>
            </div>


            {/* Deliberation Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Score / Note du Dossier (sur 100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={admissionScore ?? ""}
                  onChange={(e) => setAdmissionScore(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Ex: 85"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Classe / Filière d&apos;Affectation Finale</label>
                <input
                  type="text"
                  value={assignedClass}
                  onChange={(e) => setAssignedClass(e.target.value)}
                  placeholder="Ex: Licence 1 Informatique"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Observations &amp; Décision du Jury</label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Mentionnez les motifs d'admission, les dispenses accordées ou les réserves pédagogiques..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Decision Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleReview("Refusé")}
                  disabled={isSubmittingReview}
                  className="px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 text-xs font-black transition"
                >
                  Refuser
                </button>
                <button
                  type="button"
                  onClick={() => handleReview("Liste d'attente")}
                  disabled={isSubmittingReview}
                  className="px-4 py-2.5 rounded-2xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-600 text-xs font-black transition"
                >
                  Liste d&apos;Attente
                </button>
                <button
                  type="button"
                  onClick={() => handleReview("En examen")}
                  disabled={isSubmittingReview}
                  className="px-4 py-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-600 text-xs font-black transition"
                >
                  Mettre en Examen
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleReview("Admis / Accepté")}
                disabled={isSubmittingReview}
                className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
              >
                {isSubmittingReview ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Valider l&apos;Admission &amp; Immatriculer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─── SHARE & QR CODE MODAL ────────────────────────────────────────── */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Portail Candidatures Public</h3>
              <p className="text-xs text-slate-500">Partagez ce QR Code ou ce lien sur vos affiches, site web et réseaux sociaux.</p>
            </div>

            <div className="p-4 bg-white rounded-3xl shadow-inner inline-block mx-auto border border-slate-100">
              <QRCodeSVG value={publicUrl} size={180} level="H" />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate">{publicUrl}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(publicUrl);
                  toast.success("Lien copié dans le presse-papier !");
                }}
                className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 shrink-0 shadow-sm"
              >
                <Copy className="size-4" />
              </button>
            </div>

            <button
              onClick={() => setIsShareModalOpen(false)}
              className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold transition"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* ─── PRINT MODAL ──────────────────────────────────────────────────── */}
      {isPrintModalOpen && printSelectedApp && (
        <AdmissionsPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          selectedApp={printSelectedApp}
          initialDocType={printDocType}
          headerConfig={headerConfig}
          applicationsList={filteredApplications}
          stats={stats}
        />
      )}

      {/* ─── DOCUMENT VIEWER & MANAGEMENT MODAL ────────────────────────── */}
      {isDocViewerOpen && docViewerApp && (
        <AdmissionDocumentViewerModal
          isOpen={isDocViewerOpen}
          onClose={() => setIsDocViewerOpen(false)}
          application={docViewerApp}
          initialDocKey={activeDocKey}
          onDocumentsUpdated={(updatedApp) => {
            setDocViewerApp(updatedApp);
            setApplications((prev) =>
              prev.map((a) => (a.id === updatedApp.id ? updatedApp : a))
            );
            if (selectedApp?.id === updatedApp.id) {
              setSelectedApp(updatedApp);
            }
          }}
        />
      )}

    </div>
  );
}

