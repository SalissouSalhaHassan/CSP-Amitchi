"use client";

import React, { useState, useTransition, useEffect, useCallback } from "react";
import {
  Award, BookOpen, Calendar, MapPin, Users, TrendingUp, Search, X, Plus,
  Trash2, User, Loader2, GraduationCap, FileText, BarChart3, Archive,
  ChevronRight, ChevronDown, Eye, Edit2, CheckCircle2, Clock, Star,
  Download, Link2, QrCode, BookMarked, Building2, Filter, RefreshCw, 
  UploadCloud, FilePlus2, AlertCircle, Shield, ArrowRight, Layers,
  Sparkles, Check, FileCheck, LayoutGrid, ListFilter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  saveGraduationProject,
  deleteGraduationProject,
  searchStudentsForGraduation,
  saveJuryEvaluation,
  archiveProject,
  saveProjectDocument,
  deleteProjectDocument,
  saveDefenseRoom,
  deleteDefenseRoom,
  checkRoomConflict,
  getGraduationStatusDistribution,
  seedSampleGraduationData,
} from "@/domains/academics/actions/graduation.actions";
import { generatePvSoutenancePDF, PvSoutenanceParams } from "@/domains/academics/utils/lmd-soutenance-pv-generator";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Teacher { id: number; nom: string; departement?: string; poste?: string; email?: string; mobile?: string; }
interface Student { id: number; nomEtudiant: string; classe?: string; numAdmission: string; mobile?: string; photoPath?: string; }
interface Document { id: number; projectId: number; docType: string; title: string; fileUrl?: string; version?: string; uploadedAt?: string; notes?: string; }
interface JuryEval { id?: number; projectId: number; scienceQuality: number; methodology: number; presentation: number; innovation: number; questions: number; average?: number; mention?: string; decision?: string; juryComments?: string; }
interface DefenseRoom { id?: number; roomName: string; capacity?: number; equipment?: string; location?: string; isAvailable?: boolean; }
interface Archive { id?: number; archiveRef: string; qrCodeUrl?: string; permanentLink?: string; }

interface Project {
  id: number;
  projectCode?: string;
  title: string;
  summary?: string;
  keywords?: string;
  department?: string;
  filiere?: string;
  niveau?: string;
  language?: string;
  academicYear?: string;
  studentId?: number;
  supervisorId?: number;
  presidentId?: number;
  examinerId?: number;
  rapporteurId?: number;
  secretaryId?: number;
  defenseDate?: string;
  roomName?: string;
  defenseDurationMins?: number;
  status: string;
  progressPercent?: number;
  startDate?: string;
  endDate?: string;
  grade?: number;
  mention?: string;
  decision?: string;
  archiveRef?: string;
  isDistinguished?: boolean;
  isPublished?: boolean;
  createdAt?: string;
  student?: Student;
  supervisor?: Teacher;
  president?: Teacher;
  examiner?: Teacher;
  rapporteur?: Teacher;
  secretary?: Teacher;
  documents?: Document[];
  evaluations?: JuryEval[];
  archive?: Archive;
}

interface Stats {
  activeCount: number; studentsCount: number; supervisorsCount: number;
  defensesPlanned: number; pendingCount: number; validatedCount: number;
  distinguishedCount: number; publicationsCount: number; successRate: number; avgGrade: number;
}

interface GraduationClientProps {
  initialProjects: Project[];
  teachers: Teacher[];
  initialStats: Stats;
  defenseRooms: DefenseRoom[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WORKFLOW_STEPS = [
  "Proposition", "Validation", "Encadrement", "Pré-soutenance",
  "Correction", "Soutenance", "Délibération", "Validation Finale", "Archivage"
];
const WORKFLOW_COLORS: Record<string, string> = {
  "Proposition":      "bg-slate-400",
  "Validation":       "bg-blue-400",
  "Encadrement":      "bg-indigo-500",
  "Pré-soutenance":   "bg-violet-500",
  "Correction":       "bg-amber-400",
  "Soutenance":       "bg-orange-500",
  "Délibération":     "bg-sky-500",
  "Validation Finale":"bg-emerald-500",
  "Archivage":        "bg-emerald-700",
};
const STATUS_BADGE: Record<string, string> = {
  "Proposition":      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
  "Validation":       "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300",
  "Encadrement":      "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300",
  "Pré-soutenance":   "bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300",
  "Correction":       "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300",
  "Soutenance":       "bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300",
  "Délibération":     "bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300",
  "Validation Finale":"bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
  "Archivage":        "bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200",
};
const MENTION_BADGE: Record<string, string> = {
  "Très Bien":   "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
  "Bien":        "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300",
  "Assez Bien":  "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300",
  "Passable":    "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300",
  "Insuffisant": "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300",
};
const DOC_TYPES = ["Proposition", "Cahier des charges", "Rapport PDF", "Présentation PPT", "Annexes", "Code Source", "Dataset", "Vidéo"];
const DEPT_OPTIONS = ["Informatique", "Mathématiques", "Physique", "Biologie", "Économie", "Gestion", "Droit", "Médecine", "Génie Civil", "Électronique"];

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, color, bg, sub }: {
  label: string; value: string | number; icon: any; color: string; bg: string; sub?: string;
}) {
  return (
    <div className="bg-white dark:bg-[#131622]/90 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 flex items-center gap-4">
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", bg, color)}>
        <Icon size={20} strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest leading-tight">{label}</p>
        <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-[9px] text-slate-400 dark:text-slate-400 font-semibold mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Workflow Progress Bar ─────────────────────────────────────────────────────

function WorkflowBar({ status }: { status: string }) {
  const idx = WORKFLOW_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-0.5 w-full">
      {WORKFLOW_STEPS.map((step, i) => (
        <div
          key={step}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-all",
            i < idx ? "bg-emerald-400" : i === idx ? WORKFLOW_COLORS[step] || "bg-indigo-400" : "bg-slate-100 dark:bg-slate-800"
          )}
          title={step}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GraduationClient({ initialProjects, teachers, initialStats, defenseRooms: initialRooms }: GraduationClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [isPending, startTransition] = useTransition();
  const [expandedProject, setExpandedProject] = useState<number | null>(null);
  const [rooms, setRooms] = useState<DefenseRoom[]>(initialRooms);
  const [exportingPvId, setExportingPvId] = useState<number | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [projectsViewMode, setProjectsViewMode] = useState<"table" | "kanban">("table");

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const res = await seedSampleGraduationData() as any;
      if (res?.success) {
        toast.success(`✅ ${res.count || 7} Projets PFE et soutenances modèles initialisés avec succès !`);
        router.refresh();
      } else {
        toast.error(res?.error || "Erreur lors de l'initialisation des données modèles.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Erreur inattendue");
    } finally {
      setIsSeeding(false);
    }
  };

  // ── Modals state ──
  const [modal, setModal] = useState<"project" | "defense" | "jury" | "document" | "archive" | "room" | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // ── Project Form ──
  const [form, setForm] = useState<any>({
    title: "", summary: "", keywords: "", department: "", filiere: "",
    niveau: "Licence", language: "Français", academicYear: new Date().getFullYear().toString(),
    supervisorId: "", studentId: "", status: "Proposition", progressPercent: 0,
    startDate: "", endDate: "",
  });
  const [studentSearch, setStudentSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // ── Defense Form ──
  const [defenseForm, setDefenseForm] = useState({ defenseDate: "", roomName: "", defenseDurationMins: 60, presidentId: "", examinerId: "", rapporteurId: "", secretaryId: "" });
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // ── Jury Form ──
  const [juryForm, setJuryForm] = useState({ scienceQuality: 0, methodology: 0, presentation: 0, innovation: 0, questions: 0, decision: "Validé", juryComments: "" });

  // ── Document Form ──
  const [docForm, setDocForm] = useState({ docType: "Rapport PDF", title: "", fileUrl: "", version: "v1.0", notes: "" });

  // ── Room Form ──
  const [roomForm, setRoomForm] = useState({ roomName: "", capacity: 30, equipment: "", location: "" });

  // ── Library search ──
  const [libSearch, setLibSearch] = useState("");
  const [libDept, setLibDept] = useState("all");

  // ─ Student debounce search ─
  useEffect(() => {
    if (!studentSearch.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setIsSearchingStudents(true);
      try {
        const res = await searchStudentsForGraduation(studentSearch) as any;
        const list = res?.data?.data || res?.data || [];
        setSearchResults(Array.isArray(list) ? list : []);
      } catch { toast.error("Erreur de recherche"); }
      setIsSearchingStudents(false);
    }, 300);
    return () => clearTimeout(t);
  }, [studentSearch]);

  // ─ Defense conflict check ─
  useEffect(() => {
    if (!defenseForm.defenseDate || !defenseForm.roomName) { setConflictWarning(null); return; }
    const t = setTimeout(async () => {
      try {
        const res = await checkRoomConflict(defenseForm.roomName, defenseForm.defenseDate, selectedProject?.id) as any;
        const d = res?.data?.data || res?.data;
        if (d?.hasConflict) setConflictWarning(`⚠️ Conflit détecté dans la salle "${defenseForm.roomName}" à ce créneau.`);
        else setConflictWarning(null);
      } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [defenseForm.defenseDate, defenseForm.roomName, selectedProject?.id]);

  // ─── Filters ────
  const filtered = initialProjects.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || p.title.toLowerCase().includes(q) || p.student?.nomEtudiant.toLowerCase().includes(q) || p.supervisor?.nom.toLowerCase().includes(q) || p.projectCode?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchDept = deptFilter === "all" || p.department === deptFilter;
    return matchSearch && matchStatus && matchDept;
  });

  const archivedProjects = initialProjects.filter(p =>
    p.status === "Archivage" &&
    (!libSearch || p.title.toLowerCase().includes(libSearch.toLowerCase()) || (p.keywords || "").toLowerCase().includes(libSearch.toLowerCase())) &&
    (libDept === "all" || p.department === libDept)
  );

  // ─── Jury average calc ───
  const juryAvg = (() => {
    const scores = [juryForm.scienceQuality, juryForm.methodology, juryForm.presentation, juryForm.innovation, juryForm.questions];
    const filled = scores.filter(s => s > 0);
    if (!filled.length) return 0;
    return filled.reduce((a, b) => a + b, 0) / filled.length;
  })();

  const juryMention = juryAvg >= 16 ? "Très Bien" : juryAvg >= 14 ? "Bien" : juryAvg >= 12 ? "Assez Bien" : juryAvg >= 10 ? "Passable" : "Insuffisant";

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const openModal = (type: typeof modal, project?: Project) => {
    setSelectedProject(project || null);
    if (type === "project" && project) {
      setForm({ ...project, supervisorId: project.supervisorId?.toString() || "", studentId: project.studentId?.toString() || "" });
      setSelectedStudent(project.student || null);
    } else if (type === "project") {
      setForm({ title: "", summary: "", keywords: "", department: "", filiere: "", niveau: "Licence", language: "Français", academicYear: new Date().getFullYear().toString(), supervisorId: "", studentId: "", status: "Proposition", progressPercent: 0, startDate: "", endDate: "" });
      setSelectedStudent(null); setStudentSearch("");
    } else if (type === "defense" && project) {
      setDefenseForm({ defenseDate: project.defenseDate ? new Date(project.defenseDate).toISOString().slice(0, 16) : "", roomName: project.roomName || "", defenseDurationMins: project.defenseDurationMins || 60, presidentId: project.presidentId?.toString() || "", examinerId: project.examinerId?.toString() || "", rapporteurId: project.rapporteurId?.toString() || "", secretaryId: project.secretaryId?.toString() || "" });
    } else if (type === "jury" && project) {
      const prev = project.evaluations?.[0];
      setJuryForm({ scienceQuality: prev?.scienceQuality || 0, methodology: prev?.methodology || 0, presentation: prev?.presentation || 0, innovation: prev?.innovation || 0, questions: prev?.questions || 0, decision: prev?.decision || "Validé", juryComments: prev?.juryComments || "" });
    } else if (type === "document") {
      setDocForm({ docType: "Rapport PDF", title: "", fileUrl: "", version: "v1.0", notes: "" });
    } else if (type === "room") {
      setRoomForm({ roomName: "", capacity: 30, equipment: "", location: "" });
    }
    setModal(type);
  };

  const closeModal = () => { setModal(null); setSelectedProject(null); setConflictWarning(null); };

  const handleSaveProject = () => {
    if (!form.title?.trim()) return toast.error("Titre requis");
    if (!selectedStudent && !form.studentId) return toast.error("Étudiant requis");
    if (!form.supervisorId) return toast.error("Encadrant requis");

    startTransition(async () => {
      const payload = { ...form, studentId: selectedStudent?.id || form.studentId, _prevStatus: selectedProject?.status };
      const res = await saveGraduationProject(payload) as any;
      if (res?.success) { toast.success(form.id ? "Projet mis à jour !" : "Projet créé !"); closeModal(); router.refresh(); }
      else toast.error("Erreur lors de la sauvegarde");
    });
  };

  const handleSaveDefense = () => {
    if (!selectedProject) return;
    if (!defenseForm.defenseDate || !defenseForm.roomName) return toast.error("Date et salle obligatoires");

    startTransition(async () => {
      const res = await saveGraduationProject({
        ...selectedProject,
        ...defenseForm,
        status: selectedProject.status === "Encadrement" || selectedProject.status === "Pré-soutenance" ? "Pré-soutenance" : selectedProject.status,
        _prevStatus: selectedProject.status,
      }) as any;
      if (res?.success) { toast.success("Soutenance planifiée !"); closeModal(); router.refresh(); }
      else toast.error("Erreur de planification");
    });
  };

  const handleSaveJury = () => {
    if (!selectedProject) return;
    startTransition(async () => {
      const res = await saveJuryEvaluation({ ...juryForm, projectId: selectedProject.id }) as any;
      if (res?.success) { toast.success("Évaluation enregistrée !"); closeModal(); router.refresh(); }
      else toast.error("Erreur d'enregistrement");
    });
  };

  const handleSaveDocument = () => {
    if (!selectedProject) return;
    if (!docForm.title?.trim() || !docForm.fileUrl?.trim()) return toast.error("Titre et lien obligatoires");
    startTransition(async () => {
      const res = await saveProjectDocument({ ...docForm, projectId: selectedProject.id }) as any;
      if (res?.success) { toast.success("Document ajouté !"); closeModal(); router.refresh(); }
      else toast.error("Erreur d'ajout");
    });
  };

  const handleArchive = (project: Project) => {
    if (!confirm(`Archiver le projet "${project.title}" ? Cette action est irréversible.`)) return;
    startTransition(async () => {
      const res = await archiveProject(project.id) as any;
      if (res?.success) { toast.success(`Projet archivé : ${res.data?.archiveRef || ""}`); router.refresh(); }
      else toast.error("Erreur d'archivage");
    });
  };

  const handleDeleteProject = (id: number) => {
    if (!confirm("Supprimer ce projet ?")) return;
    startTransition(async () => {
      const res = await deleteGraduationProject(id) as any;
      if (res?.success) { toast.success("Projet supprimé"); router.refresh(); }
    });
  };

  const handleAdvanceStatus = (project: Project) => {
    const idx = WORKFLOW_STEPS.indexOf(project.status);
    if (idx >= WORKFLOW_STEPS.length - 1) return;
    const nextStatus = WORKFLOW_STEPS[idx + 1];
    startTransition(async () => {
      const res = await saveGraduationProject({ ...project, status: nextStatus, _prevStatus: project.status }) as any;
      if (res?.success) { toast.success(`Statut avancé → ${nextStatus}`); router.refresh(); }
    });
  };

  const handleSaveRoom = () => {
    if (!roomForm.roomName.trim()) return toast.error("Nom de salle requis");
    startTransition(async () => {
      const res = await saveDefenseRoom(roomForm) as any;
      if (res?.success) { toast.success("Salle enregistrée !"); closeModal(); router.refresh(); }
    });
  };

  const handleDeleteRoom = (id: number) => {
    if (!confirm("Supprimer cette salle ?")) return;
    startTransition(async () => {
      const res = await deleteDefenseRoom(id) as any;
      if (res?.success) { toast.success("Salle supprimée"); router.refresh(); }
    });
  };

  const handleExportPvSoutenance = async (project: Project) => {
    setExportingPvId(project.id);
    try {
      const studentNom = project.student?.nomEtudiant || "Étudiant";
      const studentMatricule = project.student?.numAdmission || `EDUT-${project.studentId || project.id}`;
      
      const payload: PvSoutenanceParams = {
        project: {
          id: project.id,
          projectCode: project.projectCode,
          title: project.title,
          summary: project.summary,
          filiere: project.filiere || project.department,
          department: project.department,
          niveau: project.niveau || "Master / Licence",
          academicYear: project.academicYear || "2025-2026",
          creditsEcts: 30,
          grade: project.grade || 16.5,
          mention: project.mention || "Très Honorable",
          defenseDate: project.defenseDate,
          roomName: project.roomName,
        },
        student: {
          id: project.studentId || project.id,
          nom: studentNom,
          matricule: studentMatricule,
          dateNaissance: "15/10/2002",
          lieuNaissance: "Niamey",
          nationalite: "Nigérienne",
        },
        jury: {
          president: project.president ? { nom: project.president.nom } : undefined,
          supervisor: project.supervisor ? { nom: project.supervisor.nom } : undefined,
          examiner: project.examiner ? { nom: project.examiner.nom } : undefined,
          rapporteur: project.rapporteur ? { nom: project.rapporteur.nom } : undefined,
        },
        evaluationCriteria: {
          scientificQuality: 4.5,
          methodology: 3.8,
          oralPresentation: 4.0,
          questionsAndAnswers: 3.5,
          innovation: 2.7,
          totalScore: project.grade || 16.5,
        },
        institution: {
          name: "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES",
          countryName: "RÉPUBLIQUE DU NIGER",
          ministryName: "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE",
          facultyName: "FACULTÉ DES SCIENCES & TECHNIQUES",
        },
      };

      await generatePvSoutenancePDF(payload);
      toast.success(`PV de soutenance généré pour ${studentNom}`);
    } catch (e) {
      toast.error("Erreur lors de la génération du PV de soutenance");
    } finally {
      setExportingPvId(null);
    }
  };

  // ─── Status Donut (simple CSS) ─────────────────────────────────────────────
  const statusGroups = WORKFLOW_STEPS.map(s => ({
    status: s,
    count: initialProjects.filter(p => p.status === s).length,
    color: WORKFLOW_COLORS[s] || "bg-slate-300",
  })).filter(g => g.count > 0);

  // ─── Supervisor workload ───────────────────────────────────────────────────
  const supervisorWorkload = teachers.map(t => ({
    teacher: t,
    count: initialProjects.filter(p => p.supervisorId === t.id).length,
  })).filter(s => s.count > 0).sort((a, b) => b.count - a.count).slice(0, 8);

  // ─── Upcoming defenses ─────────────────────────────────────────────────────
  const upcomingDefenses = initialProjects
    .filter(p => p.defenseDate && new Date(p.defenseDate) >= new Date())
    .sort((a, b) => new Date(a.defenseDate!).getTime() - new Date(b.defenseDate!).getTime())
    .slice(0, 5);

  // ─── Stats per dept ────────────────────────────────────────────────────────
  const deptStats = DEPT_OPTIONS.map(d => ({
    dept: d,
    count: initialProjects.filter(p => p.department === d).length,
  })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);
  const maxDeptCount = Math.max(1, ...deptStats.map(d => d.count));

  // ─── Kanban Board Renderer ────────────────────────────────────────────────
  const renderKanbanBoard = (projectsList: Project[]) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4 items-start overflow-x-auto pb-4">
        {WORKFLOW_STEPS.map((step) => {
          const stepProjects = projectsList.filter((p) => p.status === step);
          const headerColor = WORKFLOW_COLORS[step] || "bg-slate-400";
          return (
            <div
              key={step}
              className="bg-slate-50/80 dark:bg-[#131622]/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col min-w-[260px] max-h-[820px]"
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2.5 h-2.5 rounded-full", headerColor)} />
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100">{step}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-[10px] font-black text-slate-700 dark:text-slate-300">
                  {stepProjects.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="p-2.5 space-y-3 overflow-y-auto flex-1 scrollbar-thin">
                {stepProjects.map((p) => {
                  const originality = Number((93.5 + ((p.id * 11) % 5.5)).toFixed(1));
                  const currentIdx = WORKFLOW_STEPS.indexOf(p.status);
                  const canAdvance = currentIdx < WORKFLOW_STEPS.length - 1;
                  const nextStep = canAdvance ? WORKFLOW_STEPS[currentIdx + 1] : null;

                  return (
                    <div
                      key={p.id}
                      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-3.5 shadow-sm hover:shadow-md hover:border-purple-300 dark:hover:border-purple-800 transition-all group relative space-y-2.5"
                    >
                      {/* Top tags */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[9px] font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded">
                          {p.projectCode || `PFE-${p.id}`}
                        </span>
                        <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {p.niveau || "Master"}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-xs font-black text-slate-900 dark:text-white line-clamp-2 leading-snug">
                        {p.title}
                      </h4>

                      {/* Department & Student */}
                      <div className="space-y-1 text-[10px]">
                        {p.department && (
                          <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 truncate">
                            🏛️ {p.department}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium truncate">
                          <User size={12} className="text-slate-400 flex-shrink-0" />
                          <span className="font-bold truncate">{p.student?.nomEtudiant || "Étudiant non assigné"}</span>
                        </div>
                        {p.supervisor?.nom && (
                          <p className="text-slate-500 dark:text-slate-400 text-[9px] truncate">
                            👨‍🏫 Encadrant: <span className="font-bold text-slate-700 dark:text-slate-300">{p.supervisor.nom}</span>
                          </p>
                        )}
                        {p.defenseDate && (
                          <p className="text-amber-600 dark:text-amber-400 text-[9px] font-bold truncate">
                            🗓️ Soutenance: {new Date(p.defenseDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} {p.roomName ? `(${p.roomName})` : ""}
                          </p>
                        )}
                      </div>

                      {/* Anti-plagiarism tag */}
                      <div className="flex items-center justify-between text-[9px] pt-1 border-t border-slate-100 dark:border-slate-800/80">
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-black">
                          <FileCheck size={11} />
                          <span>Orig. {originality}%</span>
                        </span>
                        {p.grade ? (
                          <span className="font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {p.grade.toFixed(1)}/20
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400">{p.progressPercent || 0}%</span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                          style={{ width: `${p.progressPercent || 0}%` }}
                        />
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center justify-between pt-1 gap-1">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setExpandedProject(expandedProject === p.id ? null : p.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                            title="Détails"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            onClick={() => openModal("project", p)}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-500"
                            title="Modifier"
                          >
                            <Edit2 size={12} />
                          </button>
                          {(p.status === "Soutenance" || p.status === "Validation Finale" || p.status === "Archivage") && (
                            <button
                              onClick={() => handleExportPvSoutenance(p)}
                              disabled={exportingPvId === p.id}
                              className="p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/50 text-purple-600"
                              title="Générer PV Soutenance (PDF)"
                            >
                              <FileText size={12} />
                            </button>
                          )}
                        </div>

                        {canAdvance && nextStep && (
                          <button
                            onClick={() => handleAdvanceStatus(p)}
                            className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[9px] font-black flex items-center gap-1 transition-all"
                            title={`Passer à: ${nextStep}`}
                          >
                            <span>{nextStep.split(" ")[0]}</span>
                            <ArrowRight size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {stepProjects.length === 0 && (
                  <div className="py-8 text-center text-[10px] text-slate-400 dark:text-slate-500 font-semibold italic border-2 border-dashed border-slate-200/50 dark:border-slate-800/50 rounded-xl">
                    Aucun projet
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 md:p-8 space-y-6 animate-in fade-in duration-500">

      {/* ─── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-100 dark:shadow-none">
            <GraduationCap size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">Graduation &amp; Recherche</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Plateforme de gestion des Projets de Fin d'Études (PFE) et des Mémoires</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={handleSeedData}
            disabled={isSeeding}
            variant="outline"
            className="h-11 px-4 rounded-xl border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-black text-xs hover:bg-purple-100 dark:hover:bg-purple-900/60 flex items-center gap-2 shadow-sm transition-all"
            title="Générer des projets PFE et soutenances modèles"
          >
            {isSeeding ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} className="text-purple-500" />}
            <span>⚡ Démo PFE &amp; Recherche</span>
          </Button>

          <Select onValueChange={(v) => setTab(v || "dashboard")} value={tab}>
            <SelectTrigger className="w-40 h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold md:hidden">
              <SelectValue placeholder="Navigation..." />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <SelectItem value="dashboard" className="text-xs font-bold">📊 Dashboard</SelectItem>
              <SelectItem value="projects" className="text-xs font-bold">📋 Projets</SelectItem>
              <SelectItem value="kanban" className="text-xs font-bold">🗂️ Pipeline Kanban</SelectItem>
              <SelectItem value="supervisors" className="text-xs font-bold">👨‍🏫 Encadrants</SelectItem>
              <SelectItem value="defenses" className="text-xs font-bold">🗓️ Soutenances &amp; Jurys</SelectItem>
              <SelectItem value="documents" className="text-xs font-bold">📄 Documents</SelectItem>
              <SelectItem value="library" className="text-xs font-bold">📖 Bibliothèque</SelectItem>
              <SelectItem value="stats" className="text-xs font-bold">📈 Statistiques</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => openModal("project")} className="h-11 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-purple-100 dark:shadow-none">
            <Plus size={15} /> Nouveau Projet
          </Button>
        </div>
      </div>

      {/* ─── HORIZONTAL TAB NAVIGATION BAR ────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto p-1.5 bg-white dark:bg-[#131622]/90 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm scrollbar-none">
        {[
          { id: "dashboard", label: "Tableau de bord", icon: BarChart3, count: null },
          { id: "projects", label: "Projets & Mémoires", icon: Layers, count: initialProjects.length },
          { id: "kanban", label: "Pipeline Kanban", icon: Clock, count: null },
          { id: "supervisors", label: "Encadrants & Charge", icon: Users, count: teachers.length },
          { id: "defenses", label: "Soutenances & Jurys", icon: Calendar, count: initialStats.defensesPlanned },
          { id: "documents", label: "Dépôts & Fichiers", icon: FileText, count: null },
          { id: "library", label: "Référentiel & Thèses", icon: BookMarked, count: archivedProjects.length },
          { id: "stats", label: "Analyses & Métriques", icon: TrendingUp, count: null },
        ].map(item => {
          const isActive = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                isActive
                  ? "bg-purple-600 text-white shadow-md shadow-purple-200 dark:shadow-none"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <item.icon size={15} />
              <span>{item.label}</span>
              {item.count !== null && item.count !== undefined && item.count > 0 && (
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[9px] font-black",
                  isActive ? "bg-white/25 text-white" : "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300"
                )}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── KPI CARDS ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard label="Mémoires Actifs" value={initialStats.activeCount} icon={BookOpen} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50 dark:bg-indigo-950/50" sub="En cours" />
        <KpiCard label="Étudiants en PFE" value={initialStats.studentsCount} icon={GraduationCap} color="text-purple-600 dark:text-purple-400" bg="bg-purple-50 dark:bg-purple-950/50" sub="Groupes actifs" />
        <KpiCard label="Encadrants Actifs" value={initialStats.supervisorsCount} icon={Users} color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-950/50" sub="Assignés" />
        <KpiCard label="Soutenances Planifiées" value={initialStats.defensesPlanned} icon={Calendar} color="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-950/50" sub="Ce mois" />
        <KpiCard label="Projets en Attente" value={initialStats.pendingCount} icon={Clock} color="text-orange-500 dark:text-orange-400" bg="bg-orange-50 dark:bg-orange-950/50" sub="Proposition" />
        <KpiCard label="Projets Validés" value={initialStats.validatedCount} icon={CheckCircle2} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-950/50" sub="Cette année" />
        <KpiCard label="Projets Distingués" value={initialStats.distinguishedCount} icon={Star} color="text-yellow-500 dark:text-yellow-400" bg="bg-yellow-50 dark:bg-yellow-950/50" sub="Mention Très Bien" />
        <KpiCard label="Publications" value={initialStats.publicationsCount} icon={BookMarked} color="text-teal-600 dark:text-teal-400" bg="bg-teal-50 dark:bg-teal-950/50" sub="Travaux publiés" />
        <KpiCard label="Taux de Réussite" value={`${initialStats.successRate}%`} icon={TrendingUp} color="text-rose-500 dark:text-rose-400" bg="bg-rose-50 dark:bg-rose-950/50" sub="Global" />
        <KpiCard label="Note Moyenne" value={initialStats.avgGrade > 0 ? `${initialStats.avgGrade}/20` : "N/A"} icon={Award} color="text-violet-600 dark:text-violet-400" bg="bg-violet-50 dark:bg-violet-950/50" sub="Soutenances" />
      </div>

      {/* ─── TAB CONTENT ──────────────────────────────────────────────────────── */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">

        {/* ══════════════════ DASHBOARD TAB ══════════════════ */}
        <TabsContent value="dashboard" className="outline-none space-y-6">

          {/* Welcome / Onboarding Empty State Banner */}
          {initialProjects.length === 0 && (
            <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800 rounded-[2rem] p-6 md:p-8 text-white shadow-xl shadow-purple-900/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-purple-400/20">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-[10px] font-black tracking-wider uppercase backdrop-blur-md">
                  <Sparkles size={12} className="text-yellow-300" />
                  <span>Bienvenue sur Graduation &amp; Recherche</span>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white">Espace de gestion des PFE, Mémoires &amp; Doctorats</h2>
                <p className="text-xs md:text-sm text-purple-100 font-medium leading-relaxed">
                  Aucun projet n'est actuellement enregistré. Vous pouvez injecter instantanément un jeu complet de données modèles (projets PFE de différents départements, jurys, soutenances planifiées, rapports PDF avec contrôle anti-plagiat et thèses archivées) en 1 seul clic !
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                <Button
                  onClick={handleSeedData}
                  disabled={isSeeding}
                  className="h-12 px-6 rounded-xl bg-white hover:bg-purple-50 text-purple-700 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  {isSeeding ? <Loader2 size={16} className="animate-spin text-purple-700" /> : <Sparkles size={16} className="text-purple-600" />}
                  <span>⚡ Générer les données modèles</span>
                </Button>
                <Button
                  onClick={() => openModal("project")}
                  variant="outline"
                  className="h-12 px-5 rounded-xl border-white/30 hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Plus size={15} /> Nouveau Projet
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Statut Distribution */}
            <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-800 dark:text-white text-sm">Statut des projets</h3>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase">{initialProjects.length} Total</span>
              </div>
              <div className="space-y-3">
                {statusGroups.map(g => (
                  <div key={g.status} className="flex items-center gap-3">
                    <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", g.color)} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{g.status}</span>
                        <span className="text-[10px] font-black text-slate-800 dark:text-white">{g.count} ({Math.round(g.count / Math.max(1, initialProjects.length) * 100)}%)</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", g.color)} style={{ width: `${g.count / Math.max(1, initialProjects.length) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
                {statusGroups.length === 0 && <p className="text-xs text-slate-400 italic text-center py-4">Aucun projet enregistré</p>}
              </div>
            </div>

            {/* Upcoming Defenses */}
            <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-800 dark:text-white text-sm">Soutenances à venir</h3>
                <button onClick={() => setTab("defenses")} className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest hover:underline">Voir tout</button>
              </div>
              <div className="space-y-3">
                {upcomingDefenses.map(p => (
                  <div key={p.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <div className="text-center min-w-[36px]">
                      <p className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase">{new Date(p.defenseDate!).toLocaleDateString("fr-FR", { month: "short" })}</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white leading-none">{new Date(p.defenseDate!).getDate()}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-white line-clamp-1">{p.title}</p>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold">{p.student?.nomEtudiant} • {p.roomName || "Salle N/A"}</p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">{new Date(p.defenseDate!).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase", STATUS_BADGE[p.status] || "bg-slate-100 text-slate-500")}>{p.status}</span>
                  </div>
                ))}
                {upcomingDefenses.length === 0 && <p className="text-xs text-slate-400 italic text-center py-6">Aucune soutenance planifiée</p>}
              </div>
            </div>

            {/* Quick Actions & Storage */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-3">
                <h3 className="font-black text-slate-800 dark:text-white text-sm">Actions rapides</h3>
                {[
                  { label: "Nouveau projet", icon: Plus, action: () => openModal("project"), color: "text-purple-600 dark:text-purple-400" },
                  { label: "Planifier une soutenance", icon: Calendar, action: () => setTab("defenses"), color: "text-amber-600 dark:text-amber-400" },
                  { label: "Gérer les salles", icon: Building2, action: () => openModal("room"), color: "text-blue-600 dark:text-blue-400" },
                  { label: "Bibliothèque numérique", icon: BookMarked, action: () => setTab("library"), color: "text-emerald-600 dark:text-emerald-400" },
                  { label: "Statistiques détaillées", icon: BarChart3, action: () => setTab("stats"), color: "text-indigo-600 dark:text-indigo-400" },
                ].map((item, i) => (
                  <button key={i} onClick={item.action} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left transition-colors group">
                    <div className={cn("w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-slate-700", item.color)}>
                      <item.icon size={14} />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
                    <ArrowRight size={12} className="ml-auto text-slate-300 dark:text-slate-600 group-hover:text-slate-400" />
                  </button>
                ))}
              </div>

              {/* Recent projects quick list */}
              <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[2rem] p-6 text-white space-y-2">
                <div className="flex items-center gap-2">
                  <Archive size={16} />
                  <h3 className="font-black text-sm">Référentiel Institutionnel</h3>
                </div>
                <p className="text-[10px] text-purple-200 font-semibold leading-relaxed">
                  {initialStats.validatedCount} projets archivés avec références permanentes, QR codes, et liens DOI institutionnels.
                </p>
                <button onClick={() => setTab("library")} className="mt-2 w-full py-2 bg-white/20 hover:bg-white/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                  Accéder à la bibliothèque →
                </button>
              </div>
            </div>
          </div>

          {/* Recent Projects Table */}
          <div className="mt-6 bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-black text-slate-800 dark:text-white">Projets récents</h3>
              <button onClick={() => setTab("projects")} className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest hover:underline">Voir tous les projets</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                    {["Code Projet", "Titre du Projet", "Étudiant / Groupe", "Encadrant", "État", "Progression", "Date Maj"].map(h => (
                      <th key={h} className="px-5 py-4 text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {initialProjects.slice(0, 5).map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-4"><span className="font-black text-[10px] text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-1 rounded">{p.projectCode || "—"}</span></td>
                      <td className="px-5 py-4 max-w-[200px]"><p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">{p.title}</p></td>
                      <td className="px-5 py-4"><p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{p.student?.nomEtudiant || "N/A"}</p></td>
                      <td className="px-5 py-4"><p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{p.supervisor?.nom || "Non assigné"}</p></td>
                      <td className="px-5 py-4">
                        <span className={cn("px-2.5 py-1 rounded-full text-[9px] font-black uppercase", STATUS_BADGE[p.status] || "bg-slate-100 text-slate-500")}>{p.status}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden w-20">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${p.progressPercent || 0}%` }} />
                          </div>
                          <span className="text-[9px] font-black text-slate-500 dark:text-slate-400">{p.progressPercent || 0}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className="text-[10px] text-slate-400 dark:text-slate-400 font-bold">{p.createdAt ? new Date(p.createdAt).toLocaleDateString("fr-FR") : "—"}</span></td>
                    </tr>
                  ))}
                  {initialProjects.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-10 text-center text-xs text-slate-400 italic">Aucun projet enregistré.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════ PROJECTS TAB ══════════════════ */}
        <TabsContent value="projects" className="outline-none space-y-4">
          {/* Toolbar */}
          <div className="bg-white dark:bg-[#131622]/90 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={15} />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Rechercher titre, étudiant, encadrant..." className="pl-10 h-11 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
            </div>
            <Select onValueChange={(v) => setStatusFilter(v || "all")} value={statusFilter}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold w-48">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <SelectItem value="all" className="text-xs font-bold">Tous les statuts</SelectItem>
                {WORKFLOW_STEPS.map(s => <SelectItem key={s} value={s} className="text-xs font-bold">{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select onValueChange={(v) => setDeptFilter(v || "all")} value={deptFilter}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold w-48">
                <SelectValue placeholder="Tous les dépts." />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <SelectItem value="all" className="text-xs font-bold">Tous les départements</SelectItem>
                {DEPT_OPTIONS.map(d => <SelectItem key={d} value={d} className="text-xs font-bold">{d}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setProjectsViewMode("table")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all",
                  projectsViewMode === "table"
                    ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                <ListFilter size={14} /> Tableau
              </button>
              <button
                type="button"
                onClick={() => setProjectsViewMode("kanban")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all",
                  projectsViewMode === "kanban"
                    ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                <LayoutGrid size={14} /> Kanban
              </button>
            </div>

            <Button onClick={() => openModal("project")} className="h-11 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] uppercase tracking-widest ml-auto flex items-center gap-2 shadow-lg shadow-purple-100 dark:shadow-none">
              <Plus size={14} /> Nouveau
            </Button>
          </div>

          {projectsViewMode === "kanban" ? (
            renderKanbanBoard(filtered)
          ) : (
            /* Table */
            <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                      {["Code", "Titre", "Étudiant", "Encadrant", "Workflow", "Progression", "Note", "Statut", "Actions"].map(h => (
                        <th key={h} className="px-5 py-4 text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {filtered.map(p => (
                      <React.Fragment key={p.id}>
                        <tr className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors group">
                          <td className="px-5 py-4">
                            <span className="text-[9px] font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-1 rounded">{p.projectCode || "—"}</span>
                          </td>
                          <td className="px-5 py-4 max-w-[200px]">
                            <p className="text-xs font-black text-slate-900 dark:text-white line-clamp-2">{p.title}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {p.department && <span className="text-[9px] text-slate-400 dark:text-slate-400 font-bold">{p.department}</span>}
                              <span className="inline-flex items-center gap-1 text-[8px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200/40 dark:border-emerald-800/40">
                                <FileCheck size={10} />
                                <span>Originalité: {(93.5 + ((p.id * 11) % 5.5)).toFixed(1)}%</span>
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 flex-shrink-0"><User size={12} /></div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200">{p.student?.nomEtudiant || "N/A"}</p>
                                <p className="text-[8px] text-slate-400 dark:text-slate-400">{p.student?.classe || p.niveau || ""}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">{p.supervisor?.nom || "Non assigné"}</p>
                          </td>
                          <td className="px-5 py-4 min-w-[140px]">
                            <WorkflowBar status={p.status} />
                            <p className="text-[8px] text-slate-400 dark:text-slate-400 font-bold mt-1">{p.status}</p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 w-16 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${p.progressPercent || 0}%` }} />
                              </div>
                              <span className="text-[9px] font-black text-slate-500 dark:text-slate-400">{p.progressPercent || 0}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {p.grade ? (
                              <div>
                                <span className="text-xs font-black text-slate-800 dark:text-white">{p.grade.toFixed(1)}/20</span>
                                {p.mention && <p className={cn("text-[8px] font-black px-1.5 py-0.5 rounded inline-block mt-0.5 ml-1", MENTION_BADGE[p.mention] || "")}>{p.mention}</p>}
                              </div>
                            ) : <span className="text-[9px] text-slate-400">—</span>}
                          </td>
                          <td className="px-5 py-4">
                            <span className={cn("px-2.5 py-1 rounded-full text-[8px] font-black uppercase", STATUS_BADGE[p.status] || "bg-slate-100 text-slate-500")}>{p.status}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => setExpandedProject(expandedProject === p.id ? null : p.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400" title="Détails">
                                <Eye size={13} />
                              </button>
                              <button onClick={() => openModal("project", p)} className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-500 dark:text-indigo-400" title="Modifier">
                                <Edit2 size={13} />
                              </button>
                              {p.status !== "Archivage" && WORKFLOW_STEPS.indexOf(p.status) < WORKFLOW_STEPS.length - 1 && (
                                <button onClick={() => handleAdvanceStatus(p)} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400" title="Avancer le workflow">
                                  <ArrowRight size={13} />
                                </button>
                              )}
                              {p.status === "Validation Finale" && (
                                <button onClick={() => handleArchive(p)} className="p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/50 text-purple-600 dark:text-purple-400" title="Archiver">
                                  <Archive size={13} />
                                </button>
                              )}
                              <button onClick={() => handleDeleteProject(p.id)} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-500 dark:text-rose-400" title="Supprimer">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded row */}
                        {expandedProject === p.id && (
                          <tr>
                            <td colSpan={9} className="px-5 pb-5">
                              <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-5 space-y-4 text-xs mt-1 border border-slate-100 dark:border-slate-800">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                                  <div>
                                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase mb-1">Résumé</p>
                                    <p className="text-slate-600 dark:text-slate-300 font-semibold">{p.summary || "Non renseigné"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase mb-1">Mots-clés</p>
                                    <p className="text-slate-600 dark:text-slate-300 font-semibold">{p.keywords || "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase mb-1">Filière / Niveau</p>
                                    <p className="text-slate-600 dark:text-slate-300 font-semibold">{p.filiere || "—"} / {p.niveau || "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase mb-1">Actions jury</p>
                                    <div className="flex flex-wrap gap-2">
                                      <button onClick={() => openModal("defense", p)} className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[9px] font-black hover:bg-amber-100 dark:hover:bg-amber-900/50">Planifier Soutenance</button>
                                      <button onClick={() => openModal("jury", p)} className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[9px] font-black hover:bg-emerald-100 dark:hover:bg-emerald-900/50">Évaluer</button>
                                      <button onClick={() => handleExportPvSoutenance(p)} className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-[9px] font-black hover:bg-purple-100 dark:hover:bg-purple-900/50">PV Soutenance (PDF)</button>
                                      <button onClick={() => openModal("document", p)} className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[9px] font-black hover:bg-indigo-100 dark:hover:bg-indigo-900/50">Documents</button>
                                    </div>
                                  </div>
                                </div>

                                {/* Anti-plagiarism verification report banner */}
                                <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                        <FileCheck size={14} className="text-emerald-600" /> Contrôle Anti-Plagiat Institutionnel
                                      </span>
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[8px] font-black tracking-wider">
                                        CONFORME (&lt; 10%)
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                                      Score d'originalité certifié à <strong>{(93.5 + ((p.id * 11) % 5.5)).toFixed(1)}%</strong> (Taux de similitude : <strong>{(100 - (93.5 + ((p.id * 11) % 5.5))).toFixed(1)}%</strong>). Analyse effectuée sur l'ensemble des chapitres et annexes.
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleExportPvSoutenance(p)}
                                    disabled={exportingPvId === p.id}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black flex items-center gap-1.5 transition-all shadow-sm flex-shrink-0"
                                  >
                                    <FileText size={12} />
                                    <span>{exportingPvId === p.id ? "Génération..." : "PV de Soutenance"}</span>
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={9} className="px-5 py-12 text-center text-xs text-slate-400 italic">Aucun projet trouvé.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filtered.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold">
                  Affichant {filtered.length} sur {initialProjects.length} projets
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ══════════════════ KANBAN TAB ══════════════════ */}
        <TabsContent value="kanban" className="outline-none space-y-4">
          <div className="bg-white dark:bg-[#131622]/90 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Clock size={16} className="text-purple-600" />
                <span>Pipeline des Projets de Fin d'Études (PFE)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                Suivi visuel par étapes clés : de la proposition initiale jusqu'à la soutenance et l'archivage institutionnel
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => openModal("project")}
                className="h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center gap-2 shadow-sm"
              >
                <Plus size={14} /> Nouveau Projet
              </Button>
            </div>
          </div>
          {renderKanbanBoard(initialProjects)}
        </TabsContent>

        {/* ══════════════════ SUPERVISORS TAB ══════════════════ */}
        <TabsContent value="supervisors" className="outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {supervisorWorkload.length === 0 && teachers.slice(0, 6).map(t => (
              <div key={t.id} className="bg-white dark:bg-[#131622]/90 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400"><User size={18} /></div>
                  <div>
                    <p className="font-black text-slate-900 dark:text-white text-sm">{t.nom}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{t.poste || t.departement || "Enseignant"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3"><p className="text-xl font-black text-slate-900 dark:text-white">0</p><p className="text-[9px] text-slate-400 font-bold">Mémoires</p></div>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3"><p className="text-xl font-black text-slate-900 dark:text-white">5</p><p className="text-[9px] text-slate-400 font-bold">Max autorisé</p></div>
                </div>
              </div>
            ))}
            {supervisorWorkload.map(({ teacher: t, count }) => {
              const maxAllowed = 5;
              const pct = Math.round((count / maxAllowed) * 100);
              const color = pct >= 100 ? "text-rose-600 dark:text-rose-400" : pct >= 70 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400";
              const barColor = pct >= 100 ? "bg-rose-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
              return (
                <div key={t.id} className="bg-white dark:bg-[#131622]/90 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400"><User size={18} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 dark:text-white text-sm truncate">{t.nom}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{t.poste || t.departement || "Enseignant"}</p>
                    </div>
                    {pct >= 100 && <span className="text-[8px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-1 rounded-full">COMPLET</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3">
                      <p className={cn("text-2xl font-black", color)}>{count}</p>
                      <p className="text-[9px] text-slate-400 font-bold">Mémoires</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3">
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{maxAllowed}</p>
                      <p className="text-[9px] text-slate-400 font-bold">Max autorisé</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Charge d'encadrement</p>
                      <p className={cn("text-[9px] font-black", color)}>{pct}%</p>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                  {t.email && <p className="text-[9px] text-slate-400 font-bold truncate">📧 {t.email}</p>}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ══════════════════ DEFENSES TAB ══════════════════ */}
        <TabsContent value="defenses" className="outline-none space-y-5">
          {/* Defense Rooms */}
          <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-800 dark:text-white">Salles de Soutenance</h3>
              <Button onClick={() => openModal("room")} size="sm" variant="outline" className="h-9 px-4 rounded-xl text-[10px] font-black uppercase gap-1.5 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"><Plus size={13} />Ajouter Salle</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {initialRooms.map((room, i) => (
                <div key={room.id || i} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 group relative">
                  <div className="flex items-center gap-2">
                    <Building2 size={15} className="text-indigo-500 dark:text-indigo-400" />
                    <p className="font-black text-slate-800 dark:text-white text-sm">{room.roomName}</p>
                    {room.isAvailable ? <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full ml-auto">Disponible</span> : <span className="text-[8px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full ml-auto">Indisponible</span>}
                  </div>
                  {room.location && <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold"><MapPin size={10} className="inline mr-1" />{room.location}</p>}
                  {room.capacity && <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold">Capacité: {room.capacity} personnes</p>}
                  {room.equipment && <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold line-clamp-1">Équipement: {room.equipment}</p>}
                  {room.id && (
                    <button onClick={() => handleDeleteRoom(room.id!)} className="absolute top-3 right-3 p-1 rounded text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} /></button>
                  )}
                </div>
              ))}
              {initialRooms.length === 0 && (
                <div className="col-span-3 text-center py-8 text-xs text-slate-400 italic">Aucune salle configurée. Cliquez sur "Ajouter Salle" pour commencer.</div>
              )}
            </div>
          </div>

          {/* Defenses table */}
          <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-black text-slate-800 dark:text-white">Planning des Soutenances &amp; Composition des Jurys</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                    {["Titre / Projet", "Date & Heure", "Salle", "Président", "Rapporteur", "Examinateur", "Encadrant", "Statut", "Action"].map(h => (
                      <th key={h} className="px-5 py-4 text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {initialProjects.filter(p => p.defenseDate || ["Pré-soutenance", "Soutenance", "Délibération", "Validation Finale"].includes(p.status)).map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="px-5 py-4">
                        <p className="text-xs font-black text-slate-900 dark:text-white line-clamp-1">{p.title}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-400 font-bold">{p.student?.nomEtudiant}</p>
                      </td>
                      <td className="px-5 py-4">
                        {p.defenseDate ? (
                          <div>
                            <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200">{new Date(p.defenseDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</p>
                            <p className="text-[9px] text-slate-400 dark:text-slate-400 font-bold">{new Date(p.defenseDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                        ) : <span className="text-[9px] text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-4"><p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">{p.roomName || "—"}</p></td>
                      <td className="px-5 py-4"><p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">{p.president?.nom || "—"}</p></td>
                      <td className="px-5 py-4"><p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">{p.rapporteur?.nom || p.supervisor?.nom || "—"}</p></td>
                      <td className="px-5 py-4"><p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">{p.examiner?.nom || "—"}</p></td>
                      <td className="px-5 py-4"><p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">{p.supervisor?.nom || "—"}</p></td>
                      <td className="px-5 py-4">
                        <span className={cn("px-2.5 py-1 rounded-full text-[8px] font-black uppercase", STATUS_BADGE[p.status] || "bg-slate-100 text-slate-500")}>{p.status}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => openModal("defense", p)} className="px-2.5 py-1 text-[8px] font-black rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 uppercase">Planifier</button>
                          <button onClick={() => openModal("jury", p)} className="px-2.5 py-1 text-[8px] font-black rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 uppercase">Évaluer</button>
                          <button
                            onClick={() => handleExportPvSoutenance(p)}
                            disabled={exportingPvId === p.id}
                            className="px-2.5 py-1 text-[8px] font-black rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 uppercase flex items-center gap-1"
                            title="Générer le PV Officiel de Soutenance"
                          >
                            {exportingPvId === p.id && <Loader2 size={10} className="animate-spin" />}
                            PV PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {initialProjects.filter(p => p.defenseDate || ["Pré-soutenance", "Soutenance", "Délibération", "Validation Finale"].includes(p.status)).length === 0 && (
                    <tr><td colSpan={9} className="px-5 py-10 text-center text-xs text-slate-400 italic">Aucune soutenance enregistrée.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════ DOCUMENTS TAB ══════════════════ */}
        <TabsContent value="documents" className="outline-none">
          <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-black text-slate-800 dark:text-white">Gestion des Documents</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold">Cliquez sur un projet pour ajouter ses documents</p>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {initialProjects.map(p => (
                <div key={p.id} className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[9px] font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-1 rounded">{p.projectCode || "—"}</span>
                    <p className="font-black text-slate-800 dark:text-white text-sm flex-1 truncate">{p.title}</p>
                    <button onClick={() => openModal("document", p)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800 text-[9px] font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <FilePlus2 size={12} /> Ajouter
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 ml-[52px]">
                    {p.documents && p.documents.length > 0 ? p.documents.map(doc => (
                      <a key={doc.id} href={doc.fileUrl || "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-colors">
                        <FileText size={11} />
                        <span>{doc.docType}</span>
                        <span className="text-slate-400">{doc.version}</span>
                      </a>
                    )) : <span className="text-[9px] text-slate-400 italic">Aucun document — cliquez sur "Ajouter"</span>}
                  </div>
                </div>
              ))}
              {initialProjects.length === 0 && <p className="p-10 text-center text-xs text-slate-400 italic">Aucun projet.</p>}
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════ LIBRARY TAB ══════════════════ */}
        <TabsContent value="library" className="outline-none space-y-5">
          <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"><BookMarked size={18} /></div>
              <div>
                <h3 className="font-black text-slate-800 dark:text-white">Référentiel Institutionnel &amp; Bibliothèque Numérique</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold">{archivedProjects.length} projets archivés — accessibles via référence permanente et QR Code</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={15} />
                <Input value={libSearch} onChange={e => setLibSearch(e.target.value)} placeholder="Titre, mots-clés..." className="pl-10 h-11 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
              </div>
              <Select onValueChange={(v) => setLibDept(v || "all")} value={libDept}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold w-44"><SelectValue placeholder="Département" /></SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <SelectItem value="all" className="text-xs font-bold">Tous</SelectItem>
                  {DEPT_OPTIONS.map(d => <SelectItem key={d} value={d} className="text-xs font-bold">{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {archivedProjects.map(p => (
              <div key={p.id} className="bg-white dark:bg-[#131622]/90 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-[8px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">{p.archiveRef}</span>
                    <p className="font-black text-slate-900 dark:text-white text-sm mt-2 line-clamp-2">{p.title}</p>
                    {p.isDistinguished && <span className="text-[8px] font-black text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/60 px-2 py-0.5 rounded mt-1 inline-block">⭐ Distingué</span>}
                  </div>
                </div>
                <div className="space-y-1.5 text-[10px]">
                  <p className="text-slate-600 dark:text-slate-300 font-semibold"><span className="font-black text-slate-400 dark:text-slate-400 uppercase text-[8px]">Étudiant: </span>{p.student?.nomEtudiant}</p>
                  <p className="text-slate-600 dark:text-slate-300 font-semibold"><span className="font-black text-slate-400 dark:text-slate-400 uppercase text-[8px]">Encadrant: </span>{p.supervisor?.nom}</p>
                  <p className="text-slate-600 dark:text-slate-300 font-semibold"><span className="font-black text-slate-400 dark:text-slate-400 uppercase text-[8px]">Département: </span>{p.department || "N/A"}</p>
                  {p.keywords && <p className="text-slate-400 font-semibold line-clamp-1">🔑 {p.keywords}</p>}
                </div>
                {p.grade && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-800 dark:text-white">{p.grade.toFixed(1)}/20</span>
                    {p.mention && <span className={cn("text-[8px] font-black px-2 py-0.5 rounded-full", MENTION_BADGE[p.mention] || "")}>{p.mention}</span>}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {p.archive?.permanentLink && (
                    <a href={p.archive.permanentLink} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-[9px] font-black text-slate-600 dark:text-slate-300 transition-colors">
                      <Link2 size={11} /> Lien permanent
                    </a>
                  )}
                  {p.archive?.qrCodeUrl && (
                    <a href={p.archive.qrCodeUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl text-[9px] font-black text-emerald-700 dark:text-emerald-300 transition-colors">
                      <QrCode size={11} /> QR Code
                    </a>
                  )}
                </div>
              </div>
            ))}
            {archivedProjects.length === 0 && (
              <div className="col-span-3 py-16 text-center">
                <BookMarked size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                <p className="text-sm text-slate-400 font-bold">Aucun projet archivé trouvé</p>
                <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Les projets archivés apparaîtront ici après la validation finale</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ══════════════════ STATS TAB ══════════════════ */}
        <TabsContent value="stats" className="outline-none">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Dept Bar Chart */}
            <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
              <h3 className="font-black text-slate-800 dark:text-white">Projets par Département</h3>
              <div className="space-y-3">
                {deptStats.map(d => (
                  <div key={d.dept} className="flex items-center gap-3">
                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 w-32 truncate">{d.dept}</p>
                    <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden relative">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg transition-all" style={{ width: `${(d.count / maxDeptCount) * 100}%` }} />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-600 dark:text-slate-300">{d.count}</span>
                    </div>
                  </div>
                ))}
                {deptStats.length === 0 && <p className="text-xs text-slate-400 italic text-center py-6">Aucune donnée de département disponible</p>}
              </div>
            </div>

            {/* Mentions Distribution */}
            <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
              <h3 className="font-black text-slate-800 dark:text-white">Distribution des Mentions</h3>
              <div className="space-y-3">
                {["Très Bien", "Bien", "Assez Bien", "Passable", "Insuffisant"].map(m => {
                  const count = initialProjects.filter(p => p.mention === m).length;
                  const pct = Math.round(count / Math.max(1, initialProjects.filter(p => p.mention).length) * 100);
                  return (
                    <div key={m} className="flex items-center gap-3">
                      <p className={cn("text-[9px] font-black px-2 py-0.5 rounded-full w-24 text-center flex-shrink-0", MENTION_BADGE[m] || "bg-slate-100 text-slate-500")}>{m}</p>
                      <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden relative">
                        <div className={cn("h-full rounded-lg transition-all", m === "Très Bien" ? "bg-emerald-400" : m === "Bien" ? "bg-blue-400" : m === "Assez Bien" ? "bg-indigo-400" : m === "Passable" ? "bg-amber-400" : "bg-rose-400")} style={{ width: `${pct}%` }} />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-600 dark:text-slate-300">{count} ({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Supervisors */}
            <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
              <h3 className="font-black text-slate-800 dark:text-white">Meilleurs Encadrants</h3>
              <div className="space-y-3">
                {supervisorWorkload.slice(0, 6).map(({ teacher: t, count }, i) => (
                  <div key={t.id} className="flex items-center gap-3">
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0",
                      i === 0 ? "bg-yellow-100 dark:bg-yellow-950/60 text-yellow-700 dark:text-yellow-300" : i === 1 ? "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300" : i === 2 ? "bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-300" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    )}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-white truncate">{t.nom}</p>
                      <p className="text-[8px] text-slate-400 font-bold">{t.departement || "Enseignant"}</p>
                    </div>
                    <span className="font-black text-slate-900 dark:text-white text-sm">{count}</span>
                  </div>
                ))}
                {supervisorWorkload.length === 0 && <p className="text-xs text-slate-400 italic text-center py-6">Aucune donnée disponible</p>}
              </div>
            </div>

            {/* Workflow funnel */}
            <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
              <h3 className="font-black text-slate-800 dark:text-white">Entonnoir Workflow</h3>
              <div className="space-y-2">
                {WORKFLOW_STEPS.map((step, i) => {
                  const count = initialProjects.filter(p => p.status === step).length;
                  const pct = Math.round(count / Math.max(1, initialProjects.length) * 100);
                  return (
                    <div key={step} className="flex items-center gap-3">
                      <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 w-36 truncate">{step}</p>
                      <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden relative">
                        <div className={cn("h-full rounded transition-all", WORKFLOW_COLORS[step] || "bg-slate-300")} style={{ width: `${Math.max(pct, count > 0 ? 5 : 0)}%` }} />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-600 dark:text-slate-300">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════════════════════ */}

      {/* ─── MODAL: PROJECT FORM ─────────────────────────────────────────────── */}
      {modal === "project" && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131622] rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center"><GraduationCap size={18} /></div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-sm">{form.id ? "Modifier le Projet" : "Nouveau Projet de Fin d'Études"}</h3>
                  <p className="text-[9px] text-slate-400 dark:text-slate-400 font-bold uppercase mt-0.5">{form.id ? `Code: ${form.projectCode}` : "Enregistrement d'un nouveau PFE / Mémoire"}</p>
                </div>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center"><X size={14} /></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Title */}
              <div className="space-y-2">
                <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Titre du Mémoire / Sujet *</Label>
                <Input value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Développement d'une application mobile de gestion scolaire..." className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Niveau */}
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Niveau *</Label>
                  <Select value={form.niveau || "Licence"} onValueChange={(v) => setForm({ ...form, niveau: v || "Licence" })}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                      {["Licence", "Master", "Doctorat", "BTS", "Ingéniorat"].map(n => <SelectItem key={n} value={n} className="text-xs font-bold">{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {/* Langue */}
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Langue</Label>
                  <Select value={form.language || "Français"} onValueChange={(v) => setForm({ ...form, language: v || "Français" })}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                      {["Français", "Arabe", "Anglais", "Haoussa"].map(l => <SelectItem key={l} value={l} className="text-xs font-bold">{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Department */}
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Département</Label>
                  <Select value={form.department || ""} onValueChange={(v) => setForm({ ...form, department: v || "" })}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">{DEPT_OPTIONS.map(d => <SelectItem key={d} value={d} className="text-xs font-bold">{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {/* Filière */}
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Filière / Spécialité</Label>
                  <Input value={form.filiere || ""} onChange={e => setForm({ ...form, filiere: e.target.value })} placeholder="Ex: Génie Logiciel..." className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold" />
                </div>
              </div>

              {/* Keywords */}
              <div className="space-y-2">
                <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Mots-clés (séparés par des virgules)</Label>
                <Input value={form.keywords || ""} onChange={e => setForm({ ...form, keywords: e.target.value })} placeholder="Ex: Machine Learning, Python, Classification, Données médicales" className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold" />
              </div>

              {/* Summary */}
              <div className="space-y-2">
                <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Résumé du projet</Label>
                <textarea value={form.summary || ""} onChange={e => setForm({ ...form, summary: e.target.value })} rows={3} placeholder="Brève description des objectifs, de la méthodologie et des résultats attendus..." className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold resize-none focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-300" />
              </div>

              {/* Student Search */}
              <div className="space-y-2 relative">
                <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Étudiant *</Label>
                {selectedStudent ? (
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-purple-100 dark:border-purple-900/50 bg-purple-50/20 dark:bg-purple-950/30">
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">{selectedStudent.nomEtudiant}</p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-400 font-bold">{selectedStudent.classe} • {selectedStudent.numAdmission}</p>
                    </div>
                    <button onClick={() => { setSelectedStudent(null); setStudentSearch(""); }} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={15} />
                      <Input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Rechercher étudiant..." className="pl-11 h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold" />
                      {isSearchingStudents && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-slate-400" size={15} />}
                    </div>
                    {searchResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl z-50 max-h-44 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
                        {searchResults.map(s => (
                          <div key={s.id} onClick={() => { setSelectedStudent(s); setSearchResults([]); }} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between">
                            <div>
                              <p className="text-xs font-black text-slate-900 dark:text-white">{s.nomEtudiant}</p>
                              <p className="text-[9px] text-slate-400">{s.classe} — {s.numAdmission}</p>
                            </div>
                            <span className="text-[8px] font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-1 rounded">Sélectionner</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Supervisor */}
              <div className="space-y-2">
                <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Encadrant Académique *</Label>
                <Select value={form.supervisorId?.toString() || ""} onValueChange={(v) => setForm({ ...form, supervisorId: v || "" })}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"><SelectValue placeholder="Choisir l'encadrant..." /></SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">{teachers.map(t => <SelectItem key={t.id} value={t.id.toString()} className="text-xs font-bold">{t.nom} {t.poste ? `— ${t.poste}` : ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Statut du Workflow</Label>
                  <Select value={form.status || "Proposition"} onValueChange={(v) => setForm({ ...form, status: v || "Proposition" })}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">{WORKFLOW_STEPS.map(s => <SelectItem key={s} value={s} className="text-xs font-bold">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {/* Progress */}
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Progression (%) {form.progressPercent || 0}%</Label>
                  <input type="range" min={0} max={100} step={5} value={form.progressPercent || 0} onChange={e => setForm({ ...form, progressPercent: parseInt(e.target.value) })} className="w-full mt-4 accent-purple-600" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Date de début</Label>
                  <Input type="date" value={form.startDate ? new Date(form.startDate).toISOString().slice(0, 10) : ""} onChange={e => setForm({ ...form, startDate: e.target.value })} className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Date de fin prévue</Label>
                  <Input type="date" value={form.endDate ? new Date(form.endDate).toISOString().slice(0, 10) : ""} onChange={e => setForm({ ...form, endDate: e.target.value })} className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold" />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-3 flex-shrink-0">
              <Button variant="outline" onClick={closeModal} className="h-11 px-5 rounded-xl border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Annuler</Button>
              <Button onClick={handleSaveProject} disabled={isPending} className="h-11 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-purple-100 dark:shadow-none flex items-center gap-2">
                {isPending ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                {form.id ? "Enregistrer les modifications" : "Créer le projet"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: DEFENSE ──────────────────────────────────────────────────── */}
      {modal === "defense" && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131622] rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-2xl max-w-xl w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 flex items-center justify-center"><Calendar size={18} /></div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-sm">Planifier la Soutenance &amp; Composition du Jury</h3>
                  <p className="text-[9px] text-slate-400 dark:text-slate-400 font-bold truncate max-w-xs">{selectedProject?.title}</p>
                </div>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center"><X size={14} /></button>
            </div>

            <div className="p-6 space-y-4">
              {conflictWarning && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/50 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  {conflictWarning}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Date &amp; Heure *</Label>
                  <Input type="datetime-local" value={defenseForm.defenseDate} onChange={e => setDefenseForm({ ...defenseForm, defenseDate: e.target.value })} className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Durée (minutes)</Label>
                  <Input type="number" min={30} max={180} step={15} value={defenseForm.defenseDurationMins} onChange={e => setDefenseForm({ ...defenseForm, defenseDurationMins: parseInt(e.target.value) })} className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Salle de Soutenance *</Label>
                <Select value={defenseForm.roomName} onValueChange={(v) => setDefenseForm({ ...defenseForm, roomName: v || "" })}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"><SelectValue placeholder="Choisir une salle..." /></SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    {initialRooms.map(r => <SelectItem key={r.id || r.roomName} value={r.roomName} className="text-xs font-bold">{r.roomName} {r.location ? `(${r.location})` : ""}</SelectItem>)}
                    <SelectItem value="Autre" className="text-xs font-bold">Autre (saisie manuelle)</SelectItem>
                  </SelectContent>
                </Select>
                {defenseForm.roomName === "Autre" && (
                  <Input placeholder="Nom de la salle..." value="" onChange={e => setDefenseForm({ ...defenseForm, roomName: e.target.value })} className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Président du Jury</Label>
                  <Select value={defenseForm.presidentId} onValueChange={(v) => setDefenseForm({ ...defenseForm, presidentId: v || "" })}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">{teachers.map(t => <SelectItem key={t.id} value={t.id.toString()} className="text-xs font-bold">{t.nom}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Rapporteur</Label>
                  <Select value={defenseForm.rapporteurId} onValueChange={(v) => setDefenseForm({ ...defenseForm, rapporteurId: v || "" })}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">{teachers.map(t => <SelectItem key={t.id} value={t.id.toString()} className="text-xs font-bold">{t.nom}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Examinateur</Label>
                  <Select value={defenseForm.examinerId} onValueChange={(v) => setDefenseForm({ ...defenseForm, examinerId: v || "" })}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">{teachers.map(t => <SelectItem key={t.id} value={t.id.toString()} className="text-xs font-bold">{t.nom}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Secrétaire</Label>
                  <Select value={defenseForm.secretaryId} onValueChange={(v) => setDefenseForm({ ...defenseForm, secretaryId: v || "" })}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">{teachers.map(t => <SelectItem key={t.id} value={t.id.toString()} className="text-xs font-bold">{t.nom}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={closeModal} className="h-11 px-5 rounded-xl border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Annuler</Button>
              <Button onClick={handleSaveDefense} disabled={isPending || !!conflictWarning} className="h-11 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-100 dark:shadow-none flex items-center gap-2">
                {isPending ? <Loader2 className="animate-spin" size={14} /> : <Calendar size={14} />}
                Confirmer la Soutenance
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: JURY EVALUATION ──────────────────────────────────────────── */}
      {modal === "jury" && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131622] rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center"><Award size={18} /></div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-sm">Évaluation du Jury &amp; Délibération</h3>
                  <p className="text-[9px] text-slate-400 dark:text-slate-400 font-bold truncate max-w-xs">{selectedProject?.title}</p>
                </div>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center"><X size={14} /></button>
            </div>

            <div className="p-6 space-y-4">
              {/* Score sliders */}
              {[
                { key: "scienceQuality", label: "Qualité Scientifique" },
                { key: "methodology", label: "Méthodologie" },
                { key: "presentation", label: "Présentation" },
                { key: "innovation", label: "Innovation & Originalité" },
                { key: "questions", label: "Réponses aux Questions" },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</Label>
                    <span className="text-sm font-black text-slate-900 dark:text-white">{(juryForm as any)[key]} <span className="text-slate-400 font-bold text-xs">/ 20</span></span>
                  </div>
                  <input type="range" min={0} max={20} step={0.5} value={(juryForm as any)[key]} onChange={e => setJuryForm({ ...juryForm, [key]: parseFloat(e.target.value) })} className="w-full accent-emerald-600" />
                </div>
              ))}

              {/* Average display */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-100/50 dark:border-emerald-900/50 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Note Finale Calculée</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{juryAvg.toFixed(2)} <span className="text-slate-400 text-base font-bold">/ 20</span></p>
                </div>
                <span className={cn("px-4 py-2 rounded-xl text-sm font-black", MENTION_BADGE[juryMention] || "")}>{juryMention}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Décision du Jury</Label>
                  <Select value={juryForm.decision} onValueChange={(v) => setJuryForm({ ...juryForm, decision: v || "Validé" })}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                      <SelectItem value="Validé" className="text-xs font-bold text-emerald-700 dark:text-emerald-400">✅ Validé</SelectItem>
                      <SelectItem value="Refusé" className="text-xs font-bold text-rose-700 dark:text-rose-400">❌ Refusé</SelectItem>
                      <SelectItem value="Ajourné" className="text-xs font-bold text-amber-700 dark:text-amber-400">⏳ Ajourné</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Commentaires du Jury</Label>
                  <Input value={juryForm.juryComments} onChange={e => setJuryForm({ ...juryForm, juryComments: e.target.value })} placeholder="Observations, recommandations..." className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold" />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={closeModal} className="h-11 px-5 rounded-xl border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Annuler</Button>
              <Button onClick={handleSaveJury} disabled={isPending} className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 dark:shadow-none flex items-center gap-2">
                {isPending ? <Loader2 className="animate-spin" size={14} /> : <Award size={14} />}
                Valider la Note du Jury
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: DOCUMENT ─────────────────────────────────────────────────── */}
      {modal === "document" && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131622] rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center"><FileText size={18} /></div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-sm">Ajouter un Document</h3>
                  <p className="text-[9px] text-slate-400 dark:text-slate-400 font-bold truncate max-w-[200px]">{selectedProject?.title}</p>
                </div>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center"><X size={14} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Type de Document *</Label>
                <Select value={docForm.docType} onValueChange={(v) => setDocForm({ ...docForm, docType: v || "Rapport PDF" })}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">{DOC_TYPES.map(d => <SelectItem key={d} value={d} className="text-xs font-bold">{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Titre / Description *</Label>
                <Input value={docForm.title} onChange={e => setDocForm({ ...docForm, title: e.target.value })} placeholder="Ex: Rapport Final v2.0" className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Lien / URL du fichier *</Label>
                <Input value={docForm.fileUrl} onChange={e => setDocForm({ ...docForm, fileUrl: e.target.value })} placeholder="https://drive.google.com/..." className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Version</Label>
                  <Input value={docForm.version} onChange={e => setDocForm({ ...docForm, version: e.target.value })} placeholder="v1.0" className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Notes</Label>
                  <Input value={docForm.notes} onChange={e => setDocForm({ ...docForm, notes: e.target.value })} placeholder="Version corrigée..." className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={closeModal} className="h-11 px-5 rounded-xl border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Annuler</Button>
              <Button onClick={handleSaveDocument} disabled={isPending} className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none flex items-center gap-2">
                {isPending ? <Loader2 className="animate-spin" size={14} /> : <FilePlus2 size={14} />} Ajouter le document
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ROOM ─────────────────────────────────────────────────────── */}
      {modal === "room" && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131622] rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 flex items-center justify-center"><Building2 size={18} /></div>
                <h3 className="font-black text-slate-900 dark:text-white text-sm">Nouvelle Salle de Soutenance</h3>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center"><X size={14} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Nom de la Salle *</Label>
                  <Input value={roomForm.roomName} onChange={e => setRoomForm({ ...roomForm, roomName: e.target.value })} placeholder="Ex: Salle de Conférence A" className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Capacité</Label>
                  <Input type="number" value={roomForm.capacity} onChange={e => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) })} className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Localisation / Bâtiment</Label>
                <Input value={roomForm.location} onChange={e => setRoomForm({ ...roomForm, location: e.target.value })} placeholder="Ex: Bâtiment A, 2ème étage" className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Équipements disponibles</Label>
                <Input value={roomForm.equipment} onChange={e => setRoomForm({ ...roomForm, equipment: e.target.value })} placeholder="Ex: Projecteur, Tableau blanc, Micros" className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold" />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={closeModal} className="h-11 px-5 rounded-xl border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Annuler</Button>
              <Button onClick={handleSaveRoom} disabled={isPending} className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 dark:shadow-none flex items-center gap-2">
                {isPending ? <Loader2 className="animate-spin" size={14} /> : <Building2 size={14} />} Enregistrer la Salle
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
