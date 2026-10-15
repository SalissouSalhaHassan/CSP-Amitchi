"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  BookOpen, Video, Globe, Play, FileText, Plus, Search, Calendar, Clock, ExternalLink, 
  GraduationCap, Users, Award, CheckCircle2, AlertCircle, FileUp, Sparkles, Send, Trash, 
  Edit3, ShieldAlert, Download, RefreshCw, BarChart2, HelpCircle, Save, Check, X, 
  FileSpreadsheet, Printer, BookOpenCheck, ListChecks, Radio, ClipboardList, CheckSquare, MessageSquare
} from "lucide-react";
import { 
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart
} from "recharts";
import { 
  saveCourse, deleteCourse, saveModule, deleteModule, 
  saveLmsLesson, deleteLmsLesson, enrollStudent, updateLessonProgress, 
  saveVirtualClass, deleteVirtualClass, saveAssignment, deleteAssignment, 
  saveSubmission, gradeSubmission, saveQuiz, deleteQuiz, postMessage
} from "@/domains/lms/actions/lms.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ActionMenu from "@/components/common/ActionMenu";

export interface LmsClientProps {
  user: any;
  courses: any[];
  lessons: any[];
  sessions: any[];
  assignments: any[];
  quizzes: any[];
  classes: any[];
  subjects: any[];
  employees: any[];
  students: any[];
}

export default function LmsClient({
  user,
  courses: initialCourses,
  lessons: initialLessons,
  sessions: initialSessions,
  assignments: initialAssignments,
  quizzes: initialQuizzes,
  classes,
  subjects,
  employees,
  students
}: LmsClientProps) {
  // --- Core State ---
  const [activeTab, setActiveTab] = useState("dashboard");
  const [courses, setCourses] = useState(initialCourses);
  const [lessons, setLessons] = useState(initialLessons);
  const [sessions, setSessions] = useState(initialSessions);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [quizzes, setQuizzes] = useState(initialQuizzes);

  // --- Offline & Sync State ---
  const [isOnline, setIsOnline] = useState(true);
  const [syncQueue, setSyncQueue] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => {
        setIsOnline(true);
        triggerOfflineSync();
      };
      const handleOffline = () => setIsOnline(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, [syncQueue]);

  // Load sync queue from localStorage on mount
  useEffect(() => {
    const cached = localStorage.getItem("lms_sync_queue");
    if (cached) {
      setSyncQueue(JSON.parse(cached));
    }
  }, []);

  const addToSyncQueue = (action: string, payload: any) => {
    const updated = [...syncQueue, { id: Date.now(), action, payload }];
    setSyncQueue(updated);
    localStorage.setItem("lms_sync_queue", JSON.stringify(updated));
    alert("Vous êtes hors ligne. L'action a été enregistrée localement et sera synchronisée dès la connexion rétablie.");
  };

  const triggerOfflineSync = async () => {
    if (syncQueue.length === 0) return;
    console.log("Syncing offline queue...", syncQueue);
    let successCount = 0;
    for (const item of syncQueue) {
      try {
        if (item.action === "saveCourse") await saveCourse(item.payload.data, item.payload.id);
        else if (item.action === "saveLmsLesson") await saveLmsLesson(item.payload.data, item.payload.id);
        else if (item.action === "saveVirtualClass") await saveVirtualClass(item.payload.data, item.payload.id);
        else if (item.action === "updateProgress") await updateLessonProgress(item.payload);
        successCount++;
      } catch (err) {
        console.error("Failed to sync item:", item, err);
      }
    }
    const remaining = syncQueue.slice(successCount);
    setSyncQueue(remaining);
    localStorage.setItem("lms_sync_queue", JSON.stringify(remaining));
    alert(`${successCount} actions synchronisées avec succès !`);
  };

  // --- Role resolution ---
  const userRole = user?.role?.roleName || "Consultation";
  const isTeacher = userRole === "Professeur" || userRole === "Enseignant";
  const isStudent = userRole === "Élève" || userRole === "Etudiant";
  const isAdmin = ["Super Admin", "Directeur", "Responsable pédagogique"].includes(userRole);

  // --- Search / Filters ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<number | string>("all");

  // Filtered lists
  const filteredCourses = useMemo(() => {
    return courses.filter((c: any) => {
      const matchSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.courseCode?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchClass = selectedClassId === "all" || c.classId === Number(selectedClassId);
      return matchSearch && matchClass;
    });
  }, [courses, searchQuery, selectedClassId]);

  // --- Modals / Creation State ---
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [courseForm, setCourseForm] = useState({
    title: "",
    courseCode: "",
    classId: "",
    subjectId: "",
    teacherId: "",
    description: "",
    status: "Draft"
  });

  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    courseId: "",
    moduleId: "",
    classId: "",
    subjectId: "",
    contentType: "Text",
    content: "",
    videoUrl: "",
    filePath: "",
    duration: 15,
    displayOrder: 0
  });

  const [virtualClassModalOpen, setVirtualClassModalOpen] = useState(false);
  const [editingVirtualClass, setEditingVirtualClass] = useState<any>(null);
  const [virtualClassForm, setVirtualClassForm] = useState({
    title: "",
    classId: "",
    subjectId: "",
    teacherId: "",
    sessionDate: "",
    duration: 45,
    meetingUrl: "",
    meetingPassword: "",
    platform: "Google Meet",
    status: "À venir"
  });

  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [assignmentForm, setAssignmentForm] = useState({
    courseId: "",
    classId: "",
    subjectId: "",
    title: "",
    description: "",
    fileSujetPath: "",
    dueDate: "",
    maxScore: 20
  });

  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [quizForm, setQuizForm] = useState({
    courseId: "",
    title: "",
    description: "",
    durationMin: 20,
    maxAttempts: 1,
    passingScore: 10,
    status: "Draft",
    questions: [] as any[]
  });

  // --- Active Course Selection for modules management ---
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(courses[0]?.id || null);
  const activeCourseForModules = useMemo(() => {
    return courses.find(c => c.id === selectedCourseId) || courses[0];
  }, [courses, selectedCourseId]);

  // --- Course Player State (Espace Élève / Reader) ---
  const [currentPlayerCourseId, setCurrentPlayerCourseId] = useState<number | null>(courses[0]?.id || null);
  const [currentPlayerLessonId, setCurrentPlayerLessonId] = useState<number | null>(null);
  const [studentProgressMap, setStudentProgressMap] = useState<Record<number, boolean>>({});
  const [studentNotes, setStudentNotes] = useState("");

  const activePlayerCourse = useMemo(() => {
    return courses.find(c => c.id === currentPlayerCourseId) || courses[0];
  }, [courses, currentPlayerCourseId]);

  const activePlayerLesson = useMemo(() => {
    if (!activePlayerCourse) return null;
    const allLessons: any[] = [];
    activePlayerCourse.modules?.forEach((m: any) => {
      m.lessons?.forEach((l: any) => allLessons.push(l));
    });
    return allLessons.find(l => l.id === currentPlayerLessonId) || allLessons[0];
  }, [activePlayerCourse, currentPlayerLessonId]);

  // Sync player lesson id
  useEffect(() => {
    if (activePlayerCourse && !currentPlayerLessonId) {
      const firstLesson = activePlayerCourse.modules?.[0]?.lessons?.[0];
      if (firstLesson) {
        setCurrentPlayerLessonId(firstLesson.id);
      }
    }
  }, [activePlayerCourse, currentPlayerLessonId]);

  // --- CRUD Handlers ---
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...courseForm,
      classId: courseForm.classId ? Number(courseForm.classId) : null,
      subjectId: courseForm.subjectId ? Number(courseForm.subjectId) : null,
      teacherId: courseForm.teacherId ? Number(courseForm.teacherId) : null,
    };
    if (!isOnline) {
      addToSyncQueue("saveCourse", { data, id: editingCourse?.id });
      setCourseModalOpen(false);
      return;
    }
    const res = await saveCourse(data, editingCourse?.id);
    if (res.success) {
      alert("Cours enregistré avec succès !");
      setCourseModalOpen(false);
      window.location.reload();
    }
  };

  const handleDeleteCourse = async (id: number) => {
    if (confirm("Voulez-vous vraiment supprimer ce cours ?")) {
      const res = await deleteCourse(id);
      if (res.success) {
        alert("Cours supprimé !");
        window.location.reload();
      }
    }
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...lessonForm,
      courseId: lessonForm.courseId ? Number(lessonForm.courseId) : null,
      moduleId: lessonForm.moduleId ? Number(lessonForm.moduleId) : null,
      classId: lessonForm.classId ? Number(lessonForm.classId) : null,
      subjectId: lessonForm.subjectId ? Number(lessonForm.subjectId) : null,
      duration: Number(lessonForm.duration),
      displayOrder: Number(lessonForm.displayOrder)
    };
    if (!isOnline) {
      addToSyncQueue("saveLmsLesson", { data, id: editingLesson?.id });
      setLessonModalOpen(false);
      return;
    }
    const res = await saveLmsLesson(data, editingLesson?.id);
    if (res.success) {
      alert("Leçon enregistrée !");
      setLessonModalOpen(false);
      window.location.reload();
    }
  };

  const handleDeleteLesson = async (id: number) => {
    if (confirm("Supprimer cette leçon ?")) {
      const res = await deleteLmsLesson(id);
      if (res.success) {
        alert("Leçon supprimée !");
        window.location.reload();
      }
    }
  };

  const handleSaveVirtualClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...virtualClassForm,
      classId: virtualClassForm.classId ? Number(virtualClassForm.classId) : null,
      subjectId: virtualClassForm.subjectId ? Number(virtualClassForm.subjectId) : null,
      teacherId: virtualClassForm.teacherId ? Number(virtualClassForm.teacherId) : null,
      sessionDate: new Date(virtualClassForm.sessionDate),
      duration: Number(virtualClassForm.duration)
    };
    if (!isOnline) {
      addToSyncQueue("saveVirtualClass", { data, id: editingVirtualClass?.id });
      setVirtualClassModalOpen(false);
      return;
    }
    const res = await saveVirtualClass(data, editingVirtualClass?.id);
    if (res.success) {
      alert("Classe virtuelle enregistrée !");
      setVirtualClassModalOpen(false);
      window.location.reload();
    }
  };

  const handleDeleteVirtualClass = async (id: number) => {
    if (confirm("Supprimer cette session ?")) {
      const res = await deleteVirtualClass(id);
      if (res.success) {
        alert("Classe virtuelle supprimée !");
        window.location.reload();
      }
    }
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...assignmentForm,
      courseId: Number(assignmentForm.courseId),
      classId: assignmentForm.classId ? Number(assignmentForm.classId) : null,
      subjectId: assignmentForm.subjectId ? Number(assignmentForm.subjectId) : null,
      dueDate: new Date(assignmentForm.dueDate),
      maxScore: Number(assignmentForm.maxScore)
    };
    const res = await saveAssignment(data, editingAssignment?.id);
    if (res.success) {
      alert("Devoir enregistré !");
      setAssignmentModalOpen(false);
      window.location.reload();
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    if (confirm("Supprimer ce devoir ?")) {
      const res = await deleteAssignment(id);
      if (res.success) {
        alert("Devoir supprimé !");
        window.location.reload();
      }
    }
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...quizForm,
      courseId: Number(quizForm.courseId),
      durationMin: Number(quizForm.durationMin),
      maxAttempts: Number(quizForm.maxAttempts),
      passingScore: Number(quizForm.passingScore)
    };
    const res = await saveQuiz(data, editingQuiz?.id);
    if (res.success) {
      alert("Quiz enregistré !");
      setQuizModalOpen(false);
      window.location.reload();
    }
  };

  const handleDeleteQuiz = async (id: number) => {
    if (confirm("Supprimer ce quiz ?")) {
      const res = await deleteQuiz(id);
      if (res.success) {
        alert("Quiz supprimé !");
        window.location.reload();
      }
    }
  };

  // --- Student Specific Player Handlers ---
  const markLessonCompleted = async (lessonId: number) => {
    const sId = students[0]?.id || 1; // Fallback student ID for simulation
    setStudentProgressMap(prev => ({ ...prev, [lessonId]: true }));
    if (!isOnline) {
      addToSyncQueue("updateProgress", { studentId: sId, lessonId, isCompleted: true, personalNotes: studentNotes });
      return;
    }
    await updateLessonProgress({
      studentId: sId,
      lessonId,
      isCompleted: true,
      personalNotes: studentNotes
    });
    alert("Leçon marquée comme terminée !");
  };

  // --- Exports / Analytics Exports ---
  const handlePrint = () => {
    window.print();
  };

  const handleCsvExport = () => {
    let csv = "ID,Code,Titre,Classe,Matiere,Modules,Lecons,Statut\n";
    courses.forEach((c: any) => {
      csv += `${c.id},${c.courseCode || ""},"${c.title}","${c.class?.className || ""}","${c.subject?.subjectName || ""}",${c.modules?.length || 0},${c.lessons?.length || 0},${c.status}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "lms_courses_report.csv");
    link.click();
  };

  // --- Chart Mock Data ---
  const classProgressData = useMemo(() => {
    return classes.map(c => {
      const classCourses = courses.filter(co => co.classId === c.id);
      let avgProgress = 0;
      if (classCourses.length > 0) {
        avgProgress = Math.round(classCourses.reduce((sum, co) => sum + (co.status === "Published" ? 75 : 10), 0) / classCourses.length);
      }
      return { name: c.className, progression: avgProgress || Math.floor(Math.random() * 50) + 30 };
    });
  }, [classes, courses]);

  const subjectActivityData = useMemo(() => {
    return subjects.map(s => ({
      subject: s.subjectName,
      lecons: lessons.filter(l => l.subjectId === s.id).length,
      video: lessons.filter(l => l.subjectId === s.id && l.videoUrl).length
    }));
  }, [subjects, lessons]);

  const homeworkSubmissionsData = useMemo(() => {
    return assignments.map(a => ({
      name: a.title,
      Rendus: a.submissions?.length || 0,
      NonRendus: Math.max(0, (students.length - (a.submissions?.length || 0)))
    })).slice(0, 5);
  }, [assignments, students]);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 bg-slate-50/50 min-h-screen">
      {/* --- Top Header Card --- */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.15),transparent)] pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black tracking-tight">E-Learning & LMS</h1>
              {!isOnline && (
                <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                  <AlertCircle size={12} /> Hors-ligne
                </span>
              )}
              {isOnline && syncQueue.length > 0 && (
                <button onClick={triggerOfflineSync} className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-amber-500/35 transition-all">
                  <RefreshCw size={12} className="animate-spin" /> Synchroniser ({syncQueue.length})
                </button>
              )}
            </div>
            <p className="text-indigo-200 mt-2 font-medium text-sm">Gestion des cours en ligne, modules, leçons multimédias et classes virtuelles.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/10 text-xs font-bold flex items-center gap-2">
              <Calendar size={14} className="text-indigo-300" /> Année Scolaire: 2025-2026
            </div>
            {isAdmin && (
              <>
                <button 
                  onClick={() => { setEditingCourse(null); setCourseForm({ title: "", courseCode: "", classId: "", subjectId: "", teacherId: "", description: "", status: "Draft" }); setCourseModalOpen(true); }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-900/30 transition-all active:scale-95"
                >
                  <Plus size={16} /> Nouveau Cours
                </button>
                <button 
                  onClick={() => { setEditingLesson(null); setLessonForm({ title: "", courseId: "", moduleId: "", classId: "", subjectId: "", contentType: "Text", content: "", videoUrl: "", filePath: "", duration: 15, displayOrder: 0 }); setLessonModalOpen(true); }}
                  className="bg-white hover:bg-slate-50 text-slate-900 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all active:scale-95"
                >
                  <Plus size={16} /> Nouvelle Leçon
                </button>
                <button 
                  onClick={() => { setEditingVirtualClass(null); setVirtualClassForm({ title: "", classId: "", subjectId: "", teacherId: "", sessionDate: "", duration: 45, meetingUrl: "", meetingPassword: "", platform: "Google Meet", status: "À venir" }); setVirtualClassModalOpen(true); }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                >
                  <Globe size={16} /> Classe Virtuelle
                </button>
              </>
            )}
            <div className="flex items-center bg-white/10 rounded-2xl p-1 border border-white/15">
              <button onClick={handlePrint} className="p-2 hover:bg-white/10 rounded-xl text-white/80 hover:text-white transition-all" title="Imprimer">
                <Printer size={16} />
              </button>
              <button onClick={handleCsvExport} className="p-2 hover:bg-white/10 rounded-xl text-white/80 hover:text-white transition-all" title="Exporter CSV">
                <FileSpreadsheet size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- Tabs Switcher --- */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
        {[
          { id: "dashboard", label: "📊 Tableau de Bord" },
          { id: "courses", label: "📚 Catalogue des Cours" },
          { id: "modules", label: "⚙️ Modules & Leçons" },
          { id: "player", label: "🎬 Lecteur de Cours" },
          { id: "virtual", label: "🌐 Classes Virtuelles" },
          { id: "assignments", label: "📝 Devoirs LMS" },
          { id: "quiz", label: "❓ Quiz & Évaluations" },
          { id: "tracking", label: "👥 Suivi des Élèves" },
          { id: "reports", label: "📈 Centre de Rapports" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
              activeTab === tab.id 
                ? "bg-slate-900 text-white shadow-md scale-[1.02]" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- Main Contents --- */}
      {activeTab === "dashboard" && (
        <div className="space-y-8 animate-in fade-in duration-400">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { label: "Total Cours", value: courses.length, icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Leçons Publiées", value: lessons.length, icon: BookOpenCheck, color: "text-indigo-600", bg: "bg-indigo-50" },
              { label: "Supports Vidéo", value: lessons.filter((l: any) => l.videoUrl).length, icon: Video, color: "text-rose-600", bg: "bg-rose-50" },
              { label: "Documents PDF", value: lessons.filter((l: any) => l.filePath).length, icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Classes Virtuelles", value: sessions.filter((s: any) => s.status === "À venir").length, icon: Globe, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Élèves Inscrits", value: students.length, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
              { label: "Devoirs Actifs", value: assignments.length, icon: ClipboardList, color: "text-sky-600", bg: "bg-sky-50" },
              { label: "Quiz Disponibles", value: quizzes.length, icon: HelpCircle, color: "text-violet-600", bg: "bg-violet-50" },
              { label: "Progression Moy.", value: "68 %", icon: Sparkles, color: "text-pink-600", bg: "bg-pink-50" },
              { label: "Connexions (24h)", value: "42", icon: Clock, color: "text-slate-600", bg: "bg-slate-50" },
            ].map((kpi, idx) => (
              <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
                <div className={`p-4 rounded-xl ${kpi.bg} ${kpi.color} w-fit mb-4`}>
                  <kpi.icon size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{kpi.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-6">Progression Moyenne par Classe</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classProgressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="progression" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-6">Activité par Matière (Volume de Contenu)</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={subjectActivityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="subject" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="lecons" stackId="1" stroke="#4f46e5" fill="#e0e7ff" />
                    <Area type="monotone" dataKey="video" stackId="2" stroke="#e11d48" fill="#ffe4e6" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-6">Devoirs Rendus vs Non Rendus (Top 5 Devoirs)</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={homeworkSubmissionsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Rendus" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="NonRendus" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-6">Taux de Présence Moyen aux Classes Virtuelles</h3>
              <div className="flex items-center justify-center h-full gap-8">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="80" cy="80" r="70" stroke="#f1f5f9" strokeWidth="16" fill="transparent" />
                    <circle cx="80" cy="80" r="70" stroke="#10b981" strokeWidth="16" fill="transparent" strokeDasharray="440" strokeDashoffset="440" style={{ strokeDashoffset: 440 - (440 * 85) / 100 }} />
                  </svg>
                  <span className="absolute text-3xl font-black text-slate-800">85%</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-600">Présence Active (Élèves en ligne)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-slate-200" />
                    <span className="text-xs font-bold text-slate-600">Absence ou Connexion tardive</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "courses" && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={16} />
              <Input 
                placeholder="Rechercher par titre ou code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 rounded-2xl h-11 text-xs"
              />
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-slate-50 border border-slate-100 text-xs px-4 py-2.5 rounded-2xl"
              >
                <option value="all">Toutes les classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.className}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">N°</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Code</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Matière</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Modules</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Inscrits</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredCourses.map((c: any, index) => (
                  <tr key={c.id} className="hover:bg-slate-50/40">
                    <td className="px-6 py-4 text-xs font-bold text-slate-400">{index + 1}</td>
                    <td className="px-6 py-4 text-xs font-black text-indigo-600">{c.courseCode || "N/A"}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-800">{c.title}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{c.subject?.subjectName}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{c.class?.className}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600 text-center">{c.modules?.length || 0}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600 text-center">{c.enrollments?.length || 0}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${
                        c.status === "Published" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                      }`}>
                        {c.status === "Published" ? "Publié" : "Brouillon"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setEditingCourse(c); setCourseForm({ title: c.title, courseCode: c.courseCode || "", classId: String(c.classId), subjectId: String(c.subjectId), teacherId: String(c.teacherId), description: c.description || "", status: c.status }); setCourseModalOpen(true); }}
                          className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-800"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => handleDeleteCourse(c.id)} className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600">
                          <Trash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "modules" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left panel: Courses List */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Choisir un Cours</h3>
            <div className="space-y-2">
              {courses.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCourseId(c.id)}
                  className={`w-full text-left p-4 rounded-2xl border text-xs font-bold transition-all ${
                    selectedCourseId === c.id 
                      ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-sm" 
                      : "border-slate-100 hover:bg-slate-50"
                  }`}
                >
                  <p className="font-black text-slate-900">{c.title}</p>
                  <p className="text-[10px] text-slate-400 uppercase mt-1">{c.class?.className} • {c.subject?.subjectName}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Right panel: Modules & Lessons */}
          <div className="md:col-span-2 space-y-8">
            {activeCourseForModules ? (
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">{activeCourseForModules.title}</h2>
                    <p className="text-xs text-slate-400 mt-1 uppercase font-bold">{activeCourseForModules.class?.className} • Modules et plan d'études</p>
                  </div>
                  <button 
                    onClick={() => {
                      const title = prompt("Nom du nouveau module :");
                      if (title) saveModule({ courseId: activeCourseForModules.id, title });
                    }}
                    className="bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-black uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Nouveau Module
                  </button>
                </div>

                <div className="space-y-6">
                  {activeCourseForModules.modules?.map((m: any, index: number) => (
                    <div key={m.id} className="border border-slate-100 rounded-3xl p-6 bg-slate-50/30 space-y-4">
                      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-50 shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 grid place-items-center font-black text-xs">{index + 1}</span>
                          <h4 className="font-black text-slate-900 text-sm">{m.title}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setEditingLesson(null);
                              setLessonForm({
                                title: "",
                                courseId: String(activeCourseForModules.id),
                                moduleId: String(m.id),
                                classId: String(activeCourseForModules.classId),
                                subjectId: String(activeCourseForModules.subjectId),
                                contentType: "Text",
                                content: "",
                                videoUrl: "",
                                filePath: "",
                                duration: 15,
                                displayOrder: m.lessons?.length || 0
                              });
                              setLessonModalOpen(true);
                            }}
                            className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider"
                          >
                            + Leçon
                          </button>
                          <button onClick={() => deleteModule(m.id)} className="p-2 text-slate-400 hover:text-rose-600">
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Lessons inside this module */}
                      <div className="pl-6 space-y-2">
                        {m.lessons?.length > 0 ? (
                          m.lessons.map((l: any, lIndex: number) => (
                            <div key={l.id} className="flex items-center justify-between bg-white/70 p-4 rounded-xl border border-slate-100">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-slate-400">{lIndex + 1}.</span>
                                <div>
                                  <p className="text-xs font-bold text-slate-800">{l.title}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{l.contentType} • {l.duration} min</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => {
                                    setEditingLesson(l);
                                    setLessonForm({
                                      title: l.title,
                                      courseId: String(l.courseId),
                                      moduleId: String(l.moduleId),
                                      classId: String(l.classId),
                                      subjectId: String(l.subjectId),
                                      contentType: l.contentType,
                                      content: l.content || "",
                                      videoUrl: l.videoUrl || "",
                                      filePath: l.filePath || "",
                                      duration: l.duration || 15,
                                      displayOrder: l.displayOrder || 0
                                    });
                                    setLessonModalOpen(true);
                                  }}
                                  className="p-1 text-slate-400 hover:text-slate-800"
                                >
                                  <Edit3 size={12} />
                                </button>
                                <button onClick={() => handleDeleteLesson(l.id)} className="p-1 text-slate-400 hover:text-rose-600">
                                  <Trash size={12} />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 italic pl-2">Aucune leçon dans ce module.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center py-20">
                <p className="text-slate-400 italic">Créez d'abord un cours pour y ajouter des modules et leçons.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "player" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Syllabus sidebar */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <div>
              <select
                value={currentPlayerCourseId || ""}
                onChange={(e) => {
                  setCurrentPlayerCourseId(Number(e.target.value));
                  setCurrentPlayerLessonId(null);
                }}
                className="w-full bg-slate-50 border border-slate-100 text-xs px-4 py-2.5 rounded-xl font-bold"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              {activePlayerCourse?.modules?.map((m: any) => (
                <div key={m.id} className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{m.title}</h4>
                  <div className="space-y-1 pl-2 border-l border-slate-100">
                    {m.lessons?.map((l: any) => (
                      <button
                        key={l.id}
                        onClick={() => {
                          setCurrentPlayerLessonId(l.id);
                          setStudentNotes(l.progress?.find((p: any) => p.isCompleted)?.personalNotes || "");
                        }}
                        className={`w-full text-left p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
                          currentPlayerLessonId === l.id 
                            ? "bg-indigo-600 text-white shadow-sm" 
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <span className="truncate">{l.title}</span>
                        {studentProgressMap[l.id] && <CheckCircle2 size={14} className="text-emerald-400 shrink-0 ml-2" />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Player view */}
          <div className="lg:col-span-3 space-y-6">
            {activePlayerLesson ? (
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                <div>
                  <span className="px-3 py-1 rounded bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider">{activePlayerLesson.contentType}</span>
                  <h2 className="text-3xl font-black text-slate-900 mt-2">{activePlayerLesson.title}</h2>
                </div>

                {/* Multipurpose content viewer */}
                <div className="border border-slate-100 rounded-3xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center text-white relative">
                  {activePlayerLesson.contentType === "Video" || activePlayerLesson.videoUrl ? (
                    <video 
                      src={activePlayerLesson.videoUrl} 
                      controls 
                      className="w-full h-full object-contain"
                    />
                  ) : activePlayerLesson.contentType === "PDF" || activePlayerLesson.filePath ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-slate-800">
                      <FileText size={64} className="text-indigo-400" />
                      <p className="font-bold text-sm">Visualisation du document PDF</p>
                      <a href={activePlayerLesson.filePath} target="_blank" className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider">Ouvrir dans un nouvel onglet</a>
                    </div>
                  ) : (
                    <div className="w-full h-full p-8 bg-white text-slate-800 overflow-y-auto text-sm leading-relaxed">
                      {activePlayerLesson.content || "Aucun contenu textuel disponible pour cette leçon."}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 pt-6">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => markLessonCompleted(activePlayerLesson.id)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider px-6 py-3.5 rounded-2xl shadow-lg shadow-indigo-200 flex items-center gap-2"
                    >
                      <Check size={16} /> Marquer comme terminé
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-64">
                      <Input
                        placeholder="Prendre des notes personnelles..."
                        value={studentNotes}
                        onChange={(e) => setStudentNotes(e.target.value)}
                        className="text-xs h-10 rounded-xl"
                      />
                    </div>
                    <button 
                      onClick={async () => {
                        const sId = students[0]?.id || 1;
                        await updateLessonProgress({ studentId: sId, lessonId: activePlayerLesson.id, isCompleted: true, personalNotes: studentNotes });
                        alert("Note sauvegardée !");
                      }}
                      className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700"
                    >
                      <Save size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center py-40">
                <BookOpen size={48} className="text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 italic">Veuillez sélectionner un cours et une leçon pour démarrer la lecture.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "virtual" && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Classes Virtuelles et Conférences en Direct</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Matière</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Heure</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plateforme</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Durée</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Réunion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sessions.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/40">
                    <td className="px-6 py-4 text-xs font-black text-slate-800">{s.title}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{s.class?.className}</td>
                    <td className="px-6 py-4 text-xs text-indigo-600 font-bold">{s.subject?.subjectName}</td>
                    <td className="px-6 py-4 text-xs">
                      <p className="font-bold text-slate-800">{new Date(s.sessionDate).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{new Date(s.sessionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="flex items-center gap-1.5 font-bold text-slate-600">
                        <Globe size={14} className="text-indigo-500" /> {s.platform || "Google Meet"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-center font-bold text-slate-500">{s.duration} min</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${
                        s.status === "À venir" ? "bg-emerald-50 text-emerald-600 animate-pulse" : 
                        s.status === "Terminée" ? "bg-slate-100 text-slate-500" : "bg-rose-50 text-rose-600"
                      }`}>
                        {s.status || "À venir"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a 
                        href={s.meetingUrl} 
                        target="_blank" 
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-100 flex items-center gap-1.5 w-fit ml-auto transition-all"
                      >
                        <ExternalLink size={12} /> Rejoindre
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "assignments" && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Devoirs et Travaux de Course</h3>
            {isAdmin && (
              <button 
                onClick={() => { setEditingAssignment(null); setAssignmentForm({ courseId: "", classId: "", subjectId: "", title: "", description: "", fileSujetPath: "", dueDate: "", maxScore: 20 }); setAssignmentModalOpen(true); }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-1.5"
              >
                <Plus size={14} /> Créer un Devoir
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Matière</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Limite</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Barème</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Soumissions</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {assignments.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50/40">
                    <td className="px-6 py-4 text-xs font-black text-slate-800">{a.title}</td>
                    <td className="px-6 py-4 text-xs text-indigo-600 font-bold">{a.subject?.subjectName}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{a.class?.className}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{new Date(a.dueDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-xs text-center font-bold text-slate-500">/{a.maxScore}</td>
                    <td className="px-6 py-4 text-xs text-center font-bold text-slate-600">{a.submissions?.length || 0}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {a.fileSujetPath && (
                          <a href={a.fileSujetPath} target="_blank" className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-800" title="Télécharger">
                            <Download size={14} />
                          </a>
                        )}
                        {isAdmin && (
                          <button onClick={() => handleDeleteAssignment(a.id)} className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600">
                            <Trash size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "quiz" && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Quiz & Évaluations</h3>
            {isAdmin && (
              <button 
                onClick={() => { setEditingQuiz(null); setQuizForm({ courseId: "", title: "", description: "", durationMin: 20, maxAttempts: 1, passingScore: 10, status: "Draft", questions: [] }); setQuizModalOpen(true); }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-1.5"
              >
                <Plus size={14} /> Créer un Quiz
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cours</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Durée</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tentatives Max</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Seuil</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {quizzes.map((q: any) => (
                  <tr key={q.id} className="hover:bg-slate-50/40">
                    <td className="px-6 py-4 text-xs font-black text-slate-800">{q.title}</td>
                    <td className="px-6 py-4 text-xs text-indigo-600 font-bold">{q.course?.title}</td>
                    <td className="px-6 py-4 text-xs text-center text-slate-600">{q.durationMin} min</td>
                    <td className="px-6 py-4 text-xs text-center text-slate-600">{q.maxAttempts}</td>
                    <td className="px-6 py-4 text-xs text-center font-bold text-emerald-600">{q.passingScore}/20</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${
                        q.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                      }`}>
                        {q.status === "Active" ? "Actif" : "Brouillon"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isAdmin && (
                          <button onClick={() => handleDeleteQuiz(q.id)} className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600">
                            <Trash size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "tracking" && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Suivi Global de la Progression des Élèves</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Élève</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cours suivis</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Quiz complétés</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Moyenne Quiz</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Progression</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/40">
                    <td className="px-6 py-4 text-xs font-black text-slate-800">{s.nomEtudiant}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{s.classe}</td>
                    <td className="px-6 py-4 text-xs text-center font-bold text-slate-500">2</td>
                    <td className="px-6 py-4 text-xs text-center font-bold text-slate-500">3</td>
                    <td className="px-6 py-4 text-xs font-bold text-emerald-600">14.5/20</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600" style={{ width: "72%" }} />
                        </div>
                        <span className="text-[10px] font-black text-indigo-600">72 %</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600">Actif</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "reports" && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Générateur de Rapports LMS & E-Learning</h3>
          <p className="text-slate-500 text-sm">Générez et téléchargez des rapports complets sur les activités de la plateforme.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {[
              { title: "Rapport de Progression des Élèves", desc: "Suivi détaillé de l'avancement de chaque élève dans ses cours et leçons." },
              { title: "Statistiques de Connexion et Activité", desc: "Volume d'utilisation de la plateforme et logs de présence en direct." },
              { title: "Rapport des Résultats aux Quiz", desc: "Notes moyennes, taux de réussite et tentatives détaillées par quiz." }
            ].map((rep, idx) => (
              <div key={idx} className="border border-slate-100 rounded-3xl p-6 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <h4 className="font-black text-slate-900 text-sm">{rep.title}</h4>
                  <p className="text-slate-400 text-xs mt-2 leading-relaxed">{rep.desc}</p>
                </div>
                <div className="flex gap-2 mt-6">
                  <Button variant="outline" size="sm" onClick={handlePrint} className="flex-1 text-[10px] font-black uppercase tracking-wider rounded-xl">
                    <Printer size={12} className="mr-1.5" /> Imprimer
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCsvExport} className="flex-1 text-[10px] font-black uppercase tracking-wider rounded-xl">
                    <Download size={12} className="mr-1.5" /> CSV
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- Course Modals --- */}
      {courseModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm grid place-items-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full border border-slate-100 shadow-2xl relative">
            <button onClick={() => setCourseModalOpen(false)} className="absolute right-6 top-6 p-2 text-slate-400 hover:text-slate-700">
              <X size={20} />
            </button>
            <h3 className="text-xl font-black text-slate-900 mb-6">{editingCourse ? "Modifier le Cours" : "Créer un Cours"}</h3>
            <form onSubmit={handleSaveCourse} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Titre du Cours</label>
                <Input value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})} required className="rounded-xl h-10 mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Code Cours</label>
                  <Input value={courseForm.courseCode} onChange={e => setCourseForm({...courseForm, courseCode: e.target.value})} className="rounded-xl h-10 mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Statut</label>
                  <select value={courseForm.status} onChange={e => setCourseForm({...courseForm, status: e.target.value})} className="w-full bg-slate-50 border border-slate-100 text-xs px-3 h-10 rounded-xl mt-1">
                    <option value="Draft">Brouillon</option>
                    <option value="Published">Publié</option>
                    <option value="Archived">Archivé</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Classe</label>
                  <select value={courseForm.classId} onChange={e => setCourseForm({...courseForm, classId: e.target.value})} required className="w-full bg-slate-50 border border-slate-100 text-xs px-3 h-10 rounded-xl mt-1">
                    <option value="">Sélectionner</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Matière</label>
                  <select value={courseForm.subjectId} onChange={e => setCourseForm({...courseForm, subjectId: e.target.value})} required className="w-full bg-slate-50 border border-slate-100 text-xs px-3 h-10 rounded-xl mt-1">
                    <option value="">Sélectionner</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Description</label>
                <textarea value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} className="w-full bg-slate-50 border border-slate-100 text-xs p-3 rounded-xl mt-1 h-24" />
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-xl font-black text-xs uppercase tracking-wider h-11">
                Enregistrer
              </Button>
            </form>
          </div>
        </div>
      )}

      {lessonModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm grid place-items-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full border border-slate-100 shadow-2xl relative">
            <button onClick={() => setLessonModalOpen(false)} className="absolute right-6 top-6 p-2 text-slate-400 hover:text-slate-700">
              <X size={20} />
            </button>
            <h3 className="text-xl font-black text-slate-900 mb-6">{editingLesson ? "Modifier la Leçon" : "Ajouter une Leçon"}</h3>
            <form onSubmit={handleSaveLesson} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Titre de la Leçon</label>
                <Input value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} required className="rounded-xl h-10 mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Type de Contenu</label>
                  <select value={lessonForm.contentType} onChange={e => setLessonForm({...lessonForm, contentType: e.target.value})} className="w-full bg-slate-50 border border-slate-100 text-xs px-3 h-10 rounded-xl mt-1">
                    <option value="Text">Texte</option>
                    <option value="PDF">PDF</option>
                    <option value="Video">Vidéo</option>
                    <option value="Audio">Audio</option>
                    <option value="Quiz">Quiz</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Durée (minutes)</label>
                  <Input type="number" value={lessonForm.duration} onChange={e => setLessonForm({...lessonForm, duration: Number(e.target.value)})} className="rounded-xl h-10 mt-1" />
                </div>
              </div>
              {lessonForm.contentType === "Video" && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">URL de la Vidéo</label>
                  <Input value={lessonForm.videoUrl} onChange={e => setLessonForm({...lessonForm, videoUrl: e.target.value})} className="rounded-xl h-10 mt-1" />
                </div>
              )}
              {lessonForm.contentType === "PDF" && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Chemin du Fichier PDF</label>
                  <Input value={lessonForm.filePath} onChange={e => setLessonForm({...lessonForm, filePath: e.target.value})} className="rounded-xl h-10 mt-1" />
                </div>
              )}
              {lessonForm.contentType === "Text" && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Contenu Textuel</label>
                  <textarea value={lessonForm.content} onChange={e => setLessonForm({...lessonForm, content: e.target.value})} className="w-full bg-slate-50 border border-slate-100 text-xs p-3 rounded-xl mt-1 h-32" />
                </div>
              )}
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-xl font-black text-xs uppercase tracking-wider h-11">
                Enregistrer Leçon
              </Button>
            </form>
          </div>
        </div>
      )}

      {virtualClassModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm grid place-items-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full border border-slate-100 shadow-2xl relative">
            <button onClick={() => setVirtualClassModalOpen(false)} className="absolute right-6 top-6 p-2 text-slate-400 hover:text-slate-700">
              <X size={20} />
            </button>
            <h3 className="text-xl font-black text-slate-900 mb-6">{editingVirtualClass ? "Modifier la Classe Virtuelle" : "Programmer un Live"}</h3>
            <form onSubmit={handleSaveVirtualClass} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Titre du Live</label>
                <Input value={virtualClassForm.title} onChange={e => setVirtualClassForm({...virtualClassForm, title: e.target.value})} required className="rounded-xl h-10 mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Plateforme</label>
                  <select value={virtualClassForm.platform} onChange={e => setVirtualClassForm({...virtualClassForm, platform: e.target.value})} className="w-full bg-slate-50 border border-slate-100 text-xs px-3 h-10 rounded-xl mt-1">
                    <option value="Google Meet">Google Meet</option>
                    <option value="Zoom">Zoom</option>
                    <option value="Microsoft Teams">Microsoft Teams</option>
                    <option value="Custom">Lien personnalisé</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Durée (min)</label>
                  <Input type="number" value={virtualClassForm.duration} onChange={e => setVirtualClassForm({...virtualClassForm, duration: Number(e.target.value)})} className="rounded-xl h-10 mt-1" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Date et Heure du Session</label>
                <Input type="datetime-local" value={virtualClassForm.sessionDate} onChange={e => setVirtualClassForm({...virtualClassForm, sessionDate: e.target.value})} required className="rounded-xl h-10 mt-1" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Lien de la Réunion</label>
                <Input value={virtualClassForm.meetingUrl} onChange={e => setVirtualClassForm({...virtualClassForm, meetingUrl: e.target.value})} required className="rounded-xl h-10 mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Classe</label>
                  <select value={virtualClassForm.classId} onChange={e => setVirtualClassForm({...virtualClassForm, classId: e.target.value})} required className="w-full bg-slate-50 border border-slate-100 text-xs px-3 h-10 rounded-xl mt-1">
                    <option value="">Sélectionner</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Matière</label>
                  <select value={virtualClassForm.subjectId} onChange={e => setVirtualClassForm({...virtualClassForm, subjectId: e.target.value})} required className="w-full bg-slate-50 border border-slate-100 text-xs px-3 h-10 rounded-xl mt-1">
                    <option value="">Sélectionner</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                  </select>
                </div>
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-xl font-black text-xs uppercase tracking-wider h-11">
                Programmer Live
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
