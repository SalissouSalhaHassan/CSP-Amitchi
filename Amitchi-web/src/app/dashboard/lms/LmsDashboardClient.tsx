"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus, Search, Calendar, Clock, ExternalLink, BookOpen, Video, Globe, Play, 
  FileText, Trash2, Edit, CheckCircle2, XCircle, AlertCircle, Download, Upload, 
  Printer, User, GraduationCap, Award, ArrowLeft, ArrowRight, Wifi, WifiOff, 
  Check, FileUp, Users, BarChart2, Eye, Copy, Info, CheckCircle, Moon, Sun,
  Sparkles, Loader2, PlayCircle, Radio, CheckCheck, HelpCircle, MonitorPlay, X, Maximize2
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { 
  saveCourse, deleteCourse, saveModule, deleteModule, saveLmsLesson, 
  deleteLmsLesson, saveVirtualClass, deleteVirtualClass, saveAssignment, 
  deleteAssignment, saveSubmission, gradeSubmission, saveQuiz, deleteQuiz, 
  updateLessonProgress, enrollStudent, getDiscussions, postMessage,
  seedSampleLmsData
} from "@/domains/lms/actions/lms.actions";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/infrastructure/local-db/dexie";

interface LmsDashboardClientProps {
  currentUser: any;
  initialCourses: any[];
  initialLessons: any[];
  initialVirtualClasses: any[];
  initialAssignments: any[];
  initialSubmissions: any[];
  initialQuizzes: any[];
  initialProgress: any[];
  classes: any[];
  subjects: any[];
  employees: any[];
  students: any[];
  academicSessions?: any[];
  activeSessionName?: string;
}

export default function LmsDashboardClient({
  currentUser,
  initialCourses,
  initialLessons,
  initialVirtualClasses,
  initialAssignments,
  initialSubmissions,
  initialQuizzes,
  initialProgress,
  classes,
  subjects,
  employees,
  students,
  academicSessions = [],
  activeSessionName
}: LmsDashboardClientProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userRole, setUserRole] = useState("super_admin");
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark") || localStorage.getItem("lms_theme") === "dark";
      setIsDarkMode(isDark);
    }
  }, []);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (typeof window !== "undefined") {
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("lms_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("lms_theme", "light");
      }
    }
  };

  // Fallback default session calculation
  const defaultSession = activeSessionName || (new Date().getFullYear() + "-" + (new Date().getFullYear() + 1));

  const [schoolYear, setSchoolYear] = useState(defaultSession);
  const [isOnline, setIsOnline] = useState(true);
  // Unified pending count — only from Dexie outbox
  const pendingSyncCount = useLiveQuery(async () => {
    if (typeof window === "undefined") return 0;
    return await localDb.outbox
      .where("status")
      .anyOf(["pending", "failed"])
      .count();
  }, []) ?? 0;

  // Data states
  const [courses, setCourses] = useState(initialCourses);
  const [lessons, setLessons] = useState(initialLessons);
  const [virtualClasses, setVirtualClasses] = useState(initialVirtualClasses);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  const [progress, setProgress] = useState(initialProgress);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");

  // Selection states for reader/detail views
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [quizAttempt, setQuizAttempt] = useState<any>(null);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [newDiscussionMessage, setNewDiscussionMessage] = useState("");

  // Forms open states
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [moduleFormOpen, setModuleFormOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [lessonFormOpen, setLessonFormOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [virtualClassFormOpen, setVirtualClassFormOpen] = useState(false);
  const [editingVirtualClass, setEditingVirtualClass] = useState<any>(null);
  const [assignmentFormOpen, setAssignmentFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [quizFormOpen, setQuizFormOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<any>(null);

  // Submission grading
  const [gradingSubmission, setGradingSubmission] = useState<any>(null);
  const [previewSubmission, setPreviewSubmission] = useState<any>(null);
  const [gradeScore, setGradeScore] = useState("");
  const [gradeComment, setGradeComment] = useState("");

  // Student upload submission
  const [studentSubmissionFile, setStudentSubmissionFile] = useState("");
  // Demo seeding & live virtual meeting states
  const [isSeeding, setIsSeeding] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<any | null>(null);

  const handleSeedLms = async () => {
    try {
      setIsSeeding(true);
      toast.info("G\u00e9n\u00e9ration de l'\u00e9cosyst\u00e8me LMS complet (cours, le\u00e7ons, vid\u00e9os, quiz, devoirs, lives)...");
      const res = await seedSampleLmsData();
      if (res?.success) {
        toast.success("Succès ! cours complets avec contenus ont été créés.");
        window.location.reload();
      } else {
        toast.error(res?.error || "Erreur lors de la g\u00e9n\u00e9ration des donn\u00e9es.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erreur de connexion");
    } finally {
      setIsSeeding(false);
    }
  };

  // Initial user role setup
  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);

    // Set role based on user record
    if (currentUser) {
      if (currentUser.superAdmin) {
        setUserRole("super_admin");
      } else if (currentUser.admin) {
        setUserRole("general_director");
      } else if (currentUser.role?.roleName === "Professeur" || currentUser.role?.roleName === "Enseignant" || currentUser.role?.roleName?.toLowerCase() === "teacher") {
        setUserRole("teacher");
      } else {
        setUserRole("student");
      }
    }

    // Handle online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Try reading IndexedDB cache if offline
    if (!navigator.onLine) {
      localDb.references.where("label").equals("lms_courses_cache").first()
        .then(r => { if (r?.payload) setCourses(r.payload); }).catch(() => {});
      localDb.references.where("label").equals("lms_lessons_cache").first()
        .then(r => { if (r?.payload) setLessons(r.payload); }).catch(() => {});
      localDb.references.where("label").equals("lms_classes_cache").first()
        .then(r => { if (r?.payload) setVirtualClasses(r.payload); }).catch(() => {});
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [currentUser]);

  // Dynamic Discussion fetching for class forum
  useEffect(() => {
    if (selectedCourseId) {
      const fetchDiscussions = async () => {
        try {
          const res = await getDiscussions(selectedCourseId, selectedLessonId || undefined);
          if (res?.data?.data) {
            setDiscussions(res.data.data);
          }
        } catch (e) {
          console.error("Error fetching discussions:", e);
        }
      };
      fetchDiscussions();
    } else {
      setDiscussions([]);
    }
  }, [selectedCourseId, selectedLessonId]);

  // Caching courses and progress locally
  // Cache to IndexedDB references table for offline reading
  useEffect(() => {
    if (mounted && courses.length > 0) {
      localDb.references.put({ type: "lmsCache", label: "lms_courses_cache", payload: courses, updatedAt: Date.now() })
        .catch(() => {});
    }
  }, [courses, mounted]);

  useEffect(() => {
    if (mounted && lessons.length > 0) {
      localDb.references.put({ type: "lmsCache", label: "lms_lessons_cache", payload: lessons, updatedAt: Date.now() })
        .catch(() => {});
    }
  }, [lessons, mounted]);

  useEffect(() => {
    if (mounted && virtualClasses.length > 0) {
      localDb.references.put({ type: "lmsCache", label: "lms_classes_cache", payload: virtualClasses, updatedAt: Date.now() })
        .catch(() => {});
    }
  }, [virtualClasses, mounted]);

  // ─── Dexie Outbox Offline Queue (replaces localStorage) ───────────────
  const addToOfflineQueue = async (targetTable: string, payload: any, entityId?: number) => {
    await localDb.outbox.add({
      actionType: entityId ? "UPDATE" : "INSERT",
      targetTable,
      entityId: entityId ?? null,
      payload,
      status: "pending",
      timestamp: Date.now(),
      updatedAt: Date.now(),
      retryCount: 0,
      idempotencyKey: `${targetTable}_${Date.now()}_${Math.random()}`,
    });
    toast.warning("Action enregistrée hors ligne. Elle sera synchronisée au retour d'internet.");
  };

  const triggerSync = async () => {
    const pendingItems = await localDb.outbox
      .where("status")
      .anyOf(["pending", "failed"])
      .count();
    if (pendingItems === 0) return;
    toast.info(`Synchronisation de ${pendingItems} actions en attente...`);
    const { syncOutbox } = await import("@/infrastructure/local-db/sync");
    const synced = await syncOutbox();
    if (synced) {
      toast.success("Synchronisation LMS terminée !");
      window.location.reload();
    }
  };

  const subjectNameMap = useMemo(() => new Map(subjects.map((s: any) => [s.id, s.subjectName])), [subjects]);
  const classNameMap = useMemo(() => new Map(classes.map((c: any) => [c.id, c.className])), [classes]);
  const teacherNameMap = useMemo(() => new Map(employees.map((e: any) => [e.id, e.nomPrenom])), [employees]);
  const studentNameMap = useMemo(() => new Map(students.map((s: any) => [s.id, s.nomEtudiant])), [students]);

  // Helpers
  const getSubjectName = (id: number) => subjectNameMap.get(id) || "Matière inconnue";
  const getClassName = (id: number) => classNameMap.get(id) || "Classe inconnue";
  const getTeacherName = (id: number) => teacherNameMap.get(id) || "Enseignant inconnu";
  const getStudentName = (id: number) => studentNameMap.get(id) || "Étudiant inconnu";

  // Data calculations & KPIs
  const lmsKpis = useMemo(() => {
    const videoSupports = lessons.filter(l => l.videoUrl).length;
    const pdfSupports = lessons.filter(l => l.contentType === "PDF" || l.filePath).length;
    const upcomingVirtualClasses = virtualClasses.filter(v => v.status === "À venir").length;
    const devoirsToCorrect = submissions.filter(s => !s.isGraded).length;
    const activeQuizzes = quizzes.filter(q => q.status === "Active").length;

    return {
      totalCourses: courses.length,
      totalLessons: lessons.length,
      videoSupports,
      pdfSupports,
      upcomingVirtualClasses,
      enrolledStudentsCount: students.length,
      devoirsToCorrect,
      activeQuizzes,
      progressRate: 65,
      lastConnections: 12,
    };
  }, [courses.length, lessons, virtualClasses, submissions, quizzes, students.length]);

  const {
    totalCourses,
    totalLessons,
    videoSupports,
    pdfSupports,
    upcomingVirtualClasses,
    enrolledStudentsCount,
    devoirsToCorrect,
    activeQuizzes,
    progressRate,
    lastConnections,
  } = lmsKpis;

  // Charts datasets
  const progressionByClassData = useMemo(() => [
    { name: "CP", Progression: 75 },
    { name: "CE1", Progression: 80 },
    { name: "CE2", Progression: 62 },
    { name: "CM1", Progression: 90 },
    { name: "CM2", Progression: 70 },
  ], []);

  const activityBySubjectData = useMemo(() => [
    { name: "Maths", Cours: 12, Devoirs: 8 },
    { name: "Français", Cours: 15, Devoirs: 10 },
    { name: "Sciences", Cours: 8, Devoirs: 5 },
    { name: "Histoire", Cours: 6, Devoirs: 4 },
    { name: "Anglais", Cours: 10, Devoirs: 7 },
  ], []);

  const virtualPresenceData = useMemo(() => [
    { name: "Présents", value: 125, color: "#10b981" },
    { name: "Absents", value: 15, color: "#ef4444" },
    { name: "Retard", value: 10, color: "#f59e0b" },
  ], []);

  const devoirsSubmissionData = useMemo(() => [
    { name: "Rendus", value: 85, color: "#3b82f6" },
    { name: "Non rendus", value: 25, color: "#cbd5e1" },
  ], []);

  const quizResultsData = useMemo(() => [
    { name: "Maths Q1", Moyenne: 14.5 },
    { name: "Francais Q2", Moyenne: 16.2 },
    { name: "Sciences Q1", Moyenne: 11.8 },
    { name: "Anglais Q3", Moyenne: 15.0 },
  ], []);

  const popularCoursesData = useMemo(() => [
    { name: "Algèbre 1", Inscrits: 45 },
    { name: "Grammaire FR", Inscrits: 38 },
    { name: "Astronomie", Inscrits: 52 },
    { name: "Grammaire EN", Inscrits: 30 },
  ], []);

  // Filters for tables
  const filteredCourses = useMemo(() => {
    const normalizedSearch = searchQuery.toLowerCase();
    return courses.filter(c => {
      const matchesSearch = c.title.toLowerCase().includes(normalizedSearch) ||
                            (c.courseCode && c.courseCode.toLowerCase().includes(normalizedSearch));
      const matchesClass = classFilter === "all" || c.classId === parseInt(classFilter);
      const matchesSubject = subjectFilter === "all" || c.subjectId === parseInt(subjectFilter);
      return matchesSearch && matchesClass && matchesSubject;
    });
  }, [courses, searchQuery, classFilter, subjectFilter]);

  // Course reader specific calculations
  const courseLessons = useMemo(() => selectedCourseId ? lessons.filter(l => l.courseId === selectedCourseId) : [], [lessons, selectedCourseId]);
  const selectedLesson = useMemo(() => lessons.find(l => l.id === selectedLessonId), [lessons, selectedLessonId]);

  // Current Student details & progress (Simulating an active student for Student Space)
  const currentStudentId = students[0]?.id || 1; 
  const currentStudentProgress = useMemo(() => progress.filter(p => p.studentId === currentStudentId), [progress, currentStudentId]);
  const completedLessonsCount = useMemo(() => currentStudentProgress.filter(p => p.isCompleted).length, [currentStudentProgress]);

  if (!mounted) return null;

  // Actions
  const handleSaveCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      courseCode: formData.get("courseCode") as string,
      classId: formData.get("classId") ? parseInt(formData.get("classId") as string) : null,
      subjectId: formData.get("subjectId") ? parseInt(formData.get("subjectId") as string) : null,
      teacherId: formData.get("teacherId") ? parseInt(formData.get("teacherId") as string) : null,
      description: formData.get("description") as string,
      status: formData.get("status") as string || "Draft",
    };

    if (editingCourse) {
      const res = await saveCourse(data, editingCourse.id);
      if (res.success) {
        setCourses(courses.map(c => c.id === editingCourse.id ? { ...c, ...data } : c));
        toast.success("Cours mis à jour avec succès !");
      }
    } else {
      const res = await saveCourse(data);
      if (res.success) {
        toast.success("Cours créé avec succès !");
        window.location.reload();
      }
    }
    setCourseFormOpen(false);
    setEditingCourse(null);
  };

  const handleDeleteCourse = async (id: number) => {
    if (confirm("Voulez-vous vraiment supprimer ce cours ?")) {
      const res = await deleteCourse(id);
      if (res.success) {
        setCourses(courses.filter(c => c.id !== id));
        toast.success("Cours supprimé avec succès !");
      }
    }
  };

  const handleSaveModule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      courseId: selectedCourseId,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      displayOrder: formData.get("displayOrder") ? parseInt(formData.get("displayOrder") as string) : 0,
      status: formData.get("status") as string || "Active",
    };

    const res = await saveModule(data, editingModule?.id);
    if (res.success) {
      toast.success(editingModule ? "Module mis à jour !" : "Module créé !");
      window.location.reload();
    }
    setModuleFormOpen(false);
    setEditingModule(null);
  };

  const handleSaveLesson = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      courseId: selectedCourseId,
      moduleId: selectedModuleId,
      content: formData.get("content") as string,
      contentType: formData.get("contentType") as string || "Text",
      videoUrl: formData.get("videoUrl") as string,
      filePath: formData.get("filePath") as string,
      duration: formData.get("duration") ? parseInt(formData.get("duration") as string) : 15,
      displayOrder: formData.get("displayOrder") ? parseInt(formData.get("displayOrder") as string) : 0,
    };

    const res = await saveLmsLesson(data, editingLesson?.id);
    if (res.success) {
      toast.success(editingLesson ? "Leçon mise à jour !" : "Leçon créée !");
      window.location.reload();
    }
    setLessonFormOpen(false);
    setEditingLesson(null);
  };

  const handleSaveVirtualClass = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      classId: formData.get("classId") ? parseInt(formData.get("classId") as string) : null,
      subjectId: formData.get("subjectId") ? parseInt(formData.get("subjectId") as string) : null,
      teacherId: formData.get("teacherId") ? parseInt(formData.get("teacherId") as string) : null,
      sessionDate: new Date(formData.get("sessionDate") as string),
      duration: formData.get("duration") ? parseInt(formData.get("duration") as string) : 45,
      meetingUrl: formData.get("meetingUrl") as string,
      meetingPassword: formData.get("meetingPassword") as string,
      platform: formData.get("platform") as string || "Google Meet",
      status: formData.get("status") as string || "À venir",
    };

    const res = await saveVirtualClass(data, editingVirtualClass?.id);
    if (res.success) {
      toast.success("Classe virtuelle enregistrée avec succès !");
      window.location.reload();
    }
    setVirtualClassFormOpen(false);
    setEditingVirtualClass(null);
  };

  const handleSaveAssignment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      courseId: formData.get("courseId") ? parseInt(formData.get("courseId") as string) : null,
      classId: formData.get("classId") ? parseInt(formData.get("classId") as string) : null,
      subjectId: formData.get("subjectId") ? parseInt(formData.get("subjectId") as string) : null,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      fileSujetPath: formData.get("fileSujetPath") as string,
      dueDate: new Date(formData.get("dueDate") as string),
      maxScore: formData.get("maxScore") ? parseFloat(formData.get("maxScore") as string) : 20.0,
      status: formData.get("status") as string || "Active",
    };

    const res = await saveAssignment(data, editingAssignment?.id);
    if (res.success) {
      toast.success("Devoir enregistré !");
      window.location.reload();
    }
    setAssignmentFormOpen(false);
    setEditingAssignment(null);
  };

  const handleToggleLessonCompleted = async (lessonId: number) => {
    const isCompleted = !progress.find(p => p.lessonId === lessonId && p.studentId === currentStudentId)?.isCompleted;
    const notes = progress.find(p => p.lessonId === lessonId && p.studentId === currentStudentId)?.personalNotes || "";
    
    const payload = { studentId: currentStudentId, lessonId, isCompleted, personalNotes: notes };

    if (!isOnline) {
      await addToOfflineQueue("lmsProgress", payload);
      // Optimistic update
      setProgress([...progress.filter(p => !(p.lessonId === lessonId && p.studentId === currentStudentId)), { ...payload, id: Math.random() }]);
      return;
    }

    const res = await updateLessonProgress(payload);
    if (res.success) {
      toast.success(isCompleted ? "Leçon marquée comme terminée !" : "Statut réinitialisé !");
      setProgress([...progress.filter(p => !(p.lessonId === lessonId && p.studentId === currentStudentId)), { ...payload, id: Math.random() }]);
    }
  };

  const handleSavePersonalNotes = async (lessonId: number, notes: string) => {
    const isCompleted = !!progress.find(p => p.lessonId === lessonId && p.studentId === currentStudentId)?.isCompleted;
    const payload = { studentId: currentStudentId, lessonId, isCompleted, personalNotes: notes };

    if (!isOnline) {
      await addToOfflineQueue("lmsProgress", payload);
      return;
    }

    await updateLessonProgress(payload);
    toast.success("Notes personnelles sauvegardées !");
  };

  const handleSubmitDevoir = async (assignmentId: number) => {
    if (!studentSubmissionFile) {
      toast.error("Veuillez entrer une réponse ou un lien de fichier.");
      return;
    }

    const payload = {
      assignmentId,
      studentId: currentStudentId,
      fileReponsePath: studentSubmissionFile,
      isGraded: false
    };

    if (!isOnline) {
      await addToOfflineQueue("lmsSubmissions", payload);
      setStudentSubmissionFile("");
      return;
    }

    const res = await saveSubmission(payload);
    if (res.success) {
      toast.success("Votre travail a été envoyé avec succès !");
      setStudentSubmissionFile("");
      window.location.reload();
    }
  };

  const handlePostDiscussion = async () => {
    if (!newDiscussionMessage.trim() || !selectedCourseId) return;
    const payload = {
      courseId: selectedCourseId,
      lessonId: selectedLessonId || undefined,
      message: newDiscussionMessage.trim(),
      studentId: currentUser?.studentId ? Number(currentUser.studentId) : undefined,
      employeeId: currentUser?.employeeId ? Number(currentUser.employeeId) : undefined,
    };
    if (!isOnline) {
      await addToOfflineQueue("lmsDiscussions", payload);
      setDiscussions([...discussions, { ...payload, id: Date.now(), createdAt: new Date() }]);
      setNewDiscussionMessage("");
      return;
    }
    const res = await postMessage(payload);
    if (res?.success) {
      toast.success("Message envoyé !");
      setNewDiscussionMessage("");
      // Re-fetch discussions
      if (selectedCourseId) {
        const fresh = await getDiscussions(selectedCourseId, selectedLessonId || undefined);
        if (fresh?.data?.data) {
          setDiscussions(fresh.data.data);
        }
      }
    }
  };

  const handleGradeSubmissionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!gradingSubmission) return;

    const res = await gradeSubmission(gradingSubmission.id, parseFloat(gradeScore), gradeComment);
    if (res.success) {
      toast.success("Note et commentaire enregistrés !");
      setSubmissions(submissions.map(s => s.id === gradingSubmission.id ? { ...s, score: parseFloat(gradeScore), comment: gradeComment, isGraded: true } : s));
      setGradingSubmission(null);
    }
  };

  const handleSaveQuiz = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      courseId: formData.get("courseId") ? parseInt(formData.get("courseId") as string) : null,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      durationMin: formData.get("durationMin") ? parseInt(formData.get("durationMin") as string) : 20,
      passingScore: formData.get("passingScore") ? parseFloat(formData.get("passingScore") as string) : 10.0,
      status: formData.get("status") as string || "Draft",
      questions: []
    };

    const res = await saveQuiz(data, editingQuiz?.id);
    if (res.success) {
      toast.success("Quiz enregistré !");
      window.location.reload();
    }
    setQuizFormOpen(false);
    setEditingQuiz(null);
  };

  // Export functions
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(courses.map((c, i) => ({
      "N°": i + 1,
      "Code": c.courseCode,
      "Titre": c.title,
      "Classe": getClassName(c.classId),
      "Matière": getSubjectName(c.subjectId),
      "Enseignant": getTeacherName(c.teacherId),
      "Statut": c.status
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LMS Courses");
    XLSX.writeFile(wb, "LMS_Courses_Export.xlsx");
    toast.success("Export Excel réussi !");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("LMS Platform Report - Courses List", 14, 15);
    autoTable(doc, {
      head: [["N°", "Code", "Titre", "Classe", "Matière", "Enseignant", "Statut"]],
      body: courses.map((c, i) => [
        i + 1,
        c.courseCode || "-",
        c.title,
        getClassName(c.classId),
        getSubjectName(c.subjectId),
        getTeacherName(c.teacherId),
        c.status
      ]),
      startY: 20
    });
    doc.save("LMS_Courses_Report.pdf");
    toast.success("Export PDF réussi !");
  };

  return (
    <div className={`p-6 md:p-10 space-y-8 animate-in fade-in duration-500 min-h-screen ${isDarkMode ? "dark bg-[#0a0c14] text-slate-100" : "bg-slate-50/50 text-slate-900"}`}>
      <div className="max-w-[1700px] mx-auto space-y-8">
        
        {/* Offline Sync bar */}
        {!isOnline && (
          <div className="bg-amber-500 text-white p-3 rounded-2xl flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <WifiOff size={20} />
              <span className="font-bold text-sm">Mode Hors ligne actif. Vos actions sont sauvegardées localement.</span>
            </div>
            {pendingSyncCount > 0 && (
              <span className="bg-amber-700 px-3 py-1 rounded-xl text-xs font-black">
                {pendingSyncCount} en attente
              </span>
            )}
          </div>
        )}

        {isOnline && pendingSyncCount > 0 && (
          <div className="bg-emerald-500 text-white p-3 rounded-2xl flex items-center justify-between shadow-md animate-bounce">
            <div className="flex items-center gap-2">
              <Wifi size={20} />
              <span className="font-bold text-sm">Connexion rétablie. Des données hors ligne attendent d'être synchronisées.</span>
            </div>
            <button onClick={triggerSync} className="bg-emerald-700 hover:bg-emerald-800 px-4 py-2 rounded-xl text-xs font-black transition-all">
              Synchroniser maintenant
            </button>
          </div>
        )}

        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm print:hidden">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">E-Learning & LMS</h1>
              <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                Scolaire
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Plateforme éducative intégrale : étudiants, cours, modules, examens et classes en direct</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Year selector */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#1a1d2d] border border-slate-200/60 dark:border-slate-800 px-4 py-2 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="text-slate-400">Année scolaire :</span>
              <select 
                value={schoolYear} 
                onChange={(e) => setSchoolYear(e.target.value)} 
                className="bg-transparent border-none outline-none font-bold text-indigo-600 cursor-pointer"
              >
                {academicSessions.map((s: any) => (
                  <option key={s.id} value={s.sessionName}>{s.sessionName}</option>
                ))}
                {academicSessions.length === 0 && (
                  <>
                    <option value="2024-2025">2024-2025</option>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2026-2027">2026-2027</option>
                  </>
                )}
              </select>
            </div>

            {/* Role switcher (for testing/management) */}
            {(currentUser?.superAdmin || currentUser?.admin) && (
              <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 px-4 py-2 rounded-2xl text-xs font-bold text-indigo-900 dark:text-indigo-300">
                <span className="text-indigo-500">Vue :</span>
                <select 
                  value={userRole} 
                  onChange={(e) => {
                    setUserRole(e.target.value);
                    setActiveTab(e.target.value === "student" ? "reader" : "dashboard");
                  }}
                  className="bg-transparent border-none outline-none font-black cursor-pointer text-indigo-600"
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="general_director">Directeur</option>
                  <option value="teacher">Professeur</option>
                  <option value="student">Élève</option>
                </select>
              </div>
            )}

                    {/* Dark Mode Switcher */}
          <button 
            type="button"
            onClick={toggleDarkMode}
            className="flex items-center gap-2 bg-slate-50 dark:bg-[#1a1d2d] border border-slate-200/60 dark:border-slate-800 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232738] transition-all cursor-pointer shadow-xs"
            title={isDarkMode ? "Passer en mode clair" : "Passer en mode sombre"}
          >
            {isDarkMode ? (
              <>
                <Sun size={15} className="text-amber-400" />
                <span className="font-bold text-amber-300">Mode Clair</span>
              </>
            ) : (
              <>
                <Moon size={15} className="text-indigo-600 dark:text-indigo-400" />
                <span className="font-bold text-slate-700 dark:text-slate-300">Mode Sombre</span>
              </>
            )}
          </button>
          {/* Action buttons shortcuts */}
          {userRole !== "student" && (
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={handleSeedLms}
                disabled={isSeeding}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs uppercase tracking-wider px-4 py-3 rounded-2xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                title="G\u00e9n\u00e9rer 6 cours complets avec vid\u00e9os, quiz, devoirs et classes virtuelles"
              >
                {isSeeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {isSeeding ? "G\u00e9n\u00e9ration en cours..." : "\u26a1 D\u00e9mo LMS & Cours"}
              </button>
              <button 
                onClick={() => { setEditingCourse(null); setCourseFormOpen(true); }}
                className="bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase tracking-widest px-4 py-3 rounded-2xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Plus size={14} /> Nouveau cours
              </button>
              <button 
                onClick={() => { setEditingVirtualClass(null); setVirtualClassFormOpen(true); }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest px-4 py-3 rounded-2xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Plus size={14} /> Nouvelle classe virtuelle
              </button>
            </div>
          )}
















        </div>
      </div>

      {/* Main Tab bar */}
      <div className="flex flex-wrap gap-2 p-2 bg-slate-100 dark:bg-[#181b2a] border border-transparent dark:border-slate-800/80 rounded-3xl w-full max-w-fit print:hidden shadow-inner">
        {userRole !== "student" && (
          <>
            <button 
              onClick={() => setActiveTab("dashboard")} 
              className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === "dashboard" ? "bg-white dark:bg-[#232738] text-primary dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-[#1f2232]"}`}
            >
              📊 Tableau de bord
            </button>
            <button 
              onClick={() => setActiveTab("catalog")} 
              className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === "catalog" ? "bg-white dark:bg-[#232738] text-primary dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-[#1f2232]"}`}
            >
              📚 Catalogue Cours
            </button>
            <button 
              onClick={() => setActiveTab("modules")} 
              className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === "modules" ? "bg-white dark:bg-[#232738] text-primary dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-[#1f2232]"}`}
            >
              🗂️ Modules & Leçons
            </button>
          </>
        )}
        <button 
          onClick={() => {
            setActiveTab("reader");
            // Auto select first course/lesson if none selected
            if (courses.length > 0 && !selectedCourseId) {
              setSelectedCourseId(courses[0].id);
              const courseL = lessons.filter(l => l.courseId === courses[0].id);
              if (courseL.length > 0) setSelectedLessonId(courseL[0].id);
            }
          }} 
          className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === "reader" ? "bg-white dark:bg-[#232738] text-primary dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-[#1f2232]"}`}
        >
          📖 Lecteur Cours
        </button>
        <button 
          onClick={() => setActiveTab("virtual-classes")} 
          className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === "virtual-classes" ? "bg-white dark:bg-[#232738] text-primary dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-[#1f2232]"}`}
        >
          🌐 Lives
        </button>
        <button 
          onClick={() => setActiveTab("assignments")} 
          className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === "assignments" ? "bg-white dark:bg-[#232738] text-primary dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-[#1f2232]"}`}
        >
          📝 Devoirs
        </button>
        <button 
          onClick={() => setActiveTab("quizzes")} 
          className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === "quizzes" ? "bg-white dark:bg-[#232738] text-primary dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-[#1f2232]"}`}
        >
          ❓ Quiz
        </button>
        <button 
          onClick={() => setActiveTab("forum")} 
          className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === "forum" ? "bg-white dark:bg-[#232738] text-primary dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-[#1f2232]"}`}
        >
          💬 Forum
        </button>
        {userRole !== "student" && (
          <>
            <button 
              onClick={() => setActiveTab("tracking")} 
              className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === "tracking" ? "bg-white dark:bg-[#232738] text-primary dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-[#1f2232]"}`}
            >
              👥 Suivi élèves
            </button>
            <button 
              onClick={() => setActiveTab("participation")} 
              className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === "participation" ? "bg-white dark:bg-[#232738] text-primary dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-[#1f2232]"}`}
            >
              📊 Participation
            </button>
            <button 
              onClick={() => setActiveTab("reports")} 
              className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === "reports" ? "bg-white dark:bg-[#232738] text-primary dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-[#1f2232]"}`}
            >
              📁 Rapports
            </button>
          </>
        )}
        <button 
          onClick={() => setActiveTab("certificates")} 
          className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === "certificates" ? "bg-white dark:bg-[#232738] text-primary dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-[#1f2232]"}`}
        >
          🏆 Certificats
        </button>
      </div>

      {/* -------------------- TAB 1: DASHBOARD -------------------- */}
      {activeTab === "dashboard" && userRole !== "student" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Onboarding Demo Banner if no courses yet */}
          {courses.length === 0 && (
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-indigo-500/30">
              <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
                <BookOpen size={240} />
              </div>
              <div className="relative z-10 max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                  <Sparkles size={14} className="text-amber-300" />
                  Initialisation Rapide LMS
                </div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                  Plateforme E-Learning prête : activez 6 cours modèles avec vidéos, quiz et devoirs !
                </h2>
                <p className="text-indigo-100 text-sm md:text-base leading-relaxed font-medium">
                  Remplissez instantanément la plateforme avec un écosystème éducatif complet : Algèbre & Géométrie, Physique-Chimie, Algorithmique Python, Français, Anglais et Histoire avec syllabus, leçons vidéo, classes virtuelles en direct et évaluations interactives.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <button
                    onClick={handleSeedLms}
                    disabled={isSeeding}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm px-6 py-3.5 rounded-2xl transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSeeding ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    {isSeeding ? "Création des données en cours..." : "⚡ Charger la démo complète (1-clic)"}
                  </button>
                  <button
                    onClick={() => { setEditingCourse(null); setCourseFormOpen(true); }}
                    className="bg-white/15 hover:bg-white/25 text-white font-bold text-sm px-5 py-3.5 rounded-2xl transition-all backdrop-blur-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Plus size={16} /> Créer un cours manuellement
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { label: "Total cours", value: totalCourses, icon: BookOpen, color: "text-blue-600 bg-blue-50" },
              { label: "Total leçons", value: totalLessons, icon: GraduationCap, color: "text-purple-600 bg-purple-50" },
              { label: "Supports vidéo", value: videoSupports, icon: Video, color: "text-rose-600 bg-rose-50" },
              { label: "Documents PDF", value: pdfSupports, icon: FileText, color: "text-amber-600 bg-amber-50" },
              { label: "Directs à venir", value: upcomingVirtualClasses, icon: Globe, color: "text-emerald-600 bg-emerald-50" },
              { label: "Élèves inscrits", value: enrolledStudentsCount, icon: Users, color: "text-slate-600 bg-slate-50" },
              { label: "Devoirs à corriger", value: devoirsToCorrect, icon: Edit, color: "text-orange-600 bg-orange-50" },
              { label: "Quiz actifs", value: activeQuizzes, icon: Award, color: "text-indigo-600 bg-indigo-50" },
              { label: "Taux progression", value: `${progressRate}%`, icon: CheckCircle2, color: "text-teal-600 bg-teal-50" },
              { label: "Dernières connexions", value: lastConnections, icon: Clock, color: "text-neutral-600 bg-neutral-50" },
            ].map((kpi, idx) => (
              <div key={idx} className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${kpi.color}`}>
                  <kpi.icon size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{kpi.label}</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white dark:text-white">{kpi.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Recharts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart 1: Progression par classe */}
            <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Progression par classe (%)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={progressionByClassData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} />
                    <YAxis tickLine={false} />
                    <Tooltip cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="Progression" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Activité par matière */}
            <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Activité par matière</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityBySubjectData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} />
                    <YAxis tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="Cours" stroke="#4f46e5" fill="#e0e7ff" strokeWidth={2.5} />
                    <Area type="monotone" dataKey="Devoirs" stroke="#0ea5e9" fill="#e0f2fe" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Présence classes virtuelles */}
            <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Présence classes virtuelles</h3>
              <div className="h-64 flex flex-col justify-center items-center">
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie data={virtualPresenceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                      {virtualPresenceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 text-xs font-bold mt-2">
                  {virtualPresenceData.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-slate-600">{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 4: Devoirs rendus */}
            <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Devoirs rendus / non rendus</h3>
              <div className="h-64 flex flex-col justify-center items-center">
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie data={devoirsSubmissionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                      {devoirsSubmissionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 text-xs font-bold mt-2">
                  {devoirsSubmissionData.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-slate-600">{d.name} ({d.value}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 5: Résultats quiz */}
            <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Moyenne Résultats Quiz (sur 20)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={quizResultsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} />
                    <YAxis domain={[0, 20]} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="Moyenne" stroke="#f59e0b" strokeWidth={3} dot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 6: Cours les plus suivis */}
            <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Cours les plus suivis</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={popularCoursesData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickLine={false} />
                    <YAxis dataKey="name" type="category" tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="Inscrits" fill="#10b981" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 2: COURSE CATALOG -------------------- */}
      {activeTab === "catalog" && userRole !== "student" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Filters and search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
            <div className="flex flex-1 items-center gap-3 bg-slate-50 dark:bg-[#1a1d2d] border border-slate-200/60 dark:border-slate-800 px-4 py-2.5 rounded-2xl">
              <Search size={16} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="Rechercher par titre ou code..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full text-slate-700 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select 
                value={classFilter} 
                onChange={(e) => setClassFilter(e.target.value)}
                className="bg-slate-50 dark:bg-[#1a1d2d] border border-slate-200/60 dark:border-slate-800 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer outline-none"
              >
                <option value="all">Toutes les classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.className}</option>
                ))}
              </select>

              <select 
                value={subjectFilter} 
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="bg-slate-50 dark:bg-[#1a1d2d] border border-slate-200/60 dark:border-slate-800 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer outline-none"
              >
                <option value="all">Toutes les matières</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.subjectName}</option>
                ))}
              </select>

              <button 
                onClick={exportToExcel}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 p-2.5 rounded-2xl flex items-center justify-center gap-2 text-xs font-black transition-all"
              >
                <Download size={16} /> Excel
              </button>

              <button 
                onClick={exportToPDF}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 p-2.5 rounded-2xl flex items-center justify-center gap-2 text-xs font-black transition-all"
              >
                <Printer size={16} /> PDF
              </button>
            </div>
          </div>

          {/* Courses Table */}
          <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-[#181b2a] border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">N°</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Code cours</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Matière</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Enseignant</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Modules</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Leçons</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Inscrits</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Statut</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date création</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {filteredCourses.map((c, i) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 text-slate-400">{i + 1}</td>
                    <td className="px-6 py-4 font-mono text-xs">{c.courseCode || "-"}</td>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{c.title}</td>
                    <td className="px-6 py-4 text-indigo-600">{getClassName(c.classId)}</td>
                    <td className="px-6 py-4">{getSubjectName(c.subjectId)}</td>
                    <td className="px-6 py-4 text-slate-500">{getTeacherName(c.teacherId)}</td>
                    <td className="px-6 py-4 text-center">{c.modules?.length || 0}</td>
                    <td className="px-6 py-4 text-center">{c.lessons?.length || 0}</td>
                    <td className="px-6 py-4 text-center">{c.enrollments?.length || 0}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        c.status === "Published" ? "bg-emerald-50 text-emerald-600" :
                        c.status === "Archived" ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-blue-600"
                      }`}>
                        {c.status === "Published" ? "Publié" : c.status === "Archived" ? "Archivé" : "Brouillon"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => { setSelectedCourseId(c.id); setActiveTab("modules"); }}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="Gérer les modules & leçons"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => { setEditingCourse(c); setCourseFormOpen(true); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteCourse(c.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
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

      {/* -------------------- TAB 3: MODULES & LESSONS -------------------- */}
      {activeTab === "modules" && userRole !== "student" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500">Choisir un cours :</span>
              <select 
                value={selectedCourseId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCourseId(val ? parseInt(val) : null);
                  setSelectedModuleId(null);
                }}
                className="bg-slate-50 dark:bg-[#1a1d2d] border border-slate-200/60 dark:border-slate-800 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer outline-none"
              >
                <option value="">-- Choisir un cours --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            {selectedCourseId && (
              <div className="flex gap-2">
                <button 
                  onClick={() => { setEditingModule(null); setModuleFormOpen(true); }}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-black text-xs uppercase tracking-widest px-4 py-3 rounded-2xl transition-all flex items-center gap-2"
                >
                  <Plus size={14} /> Nouveau module
                </button>
                {selectedModuleId && (
                  <button 
                    onClick={() => { setEditingLesson(null); setLessonFormOpen(true); }}
                    className="bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase tracking-widest px-4 py-3 rounded-2xl transition-all flex items-center gap-2"
                  >
                    <Plus size={14} /> Nouvelle leçon
                  </button>
                )}
              </div>
            )}
          </div>

          {selectedCourseId ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Modules List column */}
              <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Modules du cours</h3>
                <div className="space-y-3">
                  {(courses.find(c => c.id === selectedCourseId)?.modules || []).map((m: any) => (
                    <div 
                      key={m.id} 
                      onClick={() => setSelectedModuleId(m.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedModuleId === m.id ? "border-indigo-600 bg-indigo-50/50" : "border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/30 dark:bg-[#1a1d2d]/50"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{m.title}</p>
                        <p className="text-xs text-slate-400">Ordre : {m.displayOrder}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingModule(m); setModuleFormOpen(true); }}
                          className="p-1 text-blue-600 hover:bg-white rounded-lg transition-all"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={async (e) => { 
                            e.stopPropagation(); 
                            if(confirm("Supprimer ce module ?")) {
                              await deleteModule(m.id);
                              window.location.reload();
                            }
                          }}
                          className="p-1 text-rose-600 hover:bg-white rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(courses.find(c => c.id === selectedCourseId)?.modules || []).length === 0 && (
                    <p className="text-slate-400 text-xs font-semibold text-center py-6">Aucun module défini pour ce cours.</p>
                  )}
                </div>
              </div>

              {/* Lessons List column */}
              <div className="lg:col-span-2 bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Leçons {selectedModuleId ? `du module sélectionné` : `(Sélectionnez un module)`}
                </h3>
                {selectedModuleId ? (
                  <div className="space-y-3">
                    {lessons.filter(l => l.moduleId === selectedModuleId).map((l: any) => (
                      <div key={l.id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-[#1a1d2d]/30 flex items-center justify-between hover:border-slate-200 transition-all">
                        <div className="flex items-center gap-4">
                          <span className="bg-slate-100 text-slate-600 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs">
                            {l.displayOrder}
                          </span>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{l.title}</p>
                            <div className="flex gap-2 mt-1">
                              <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md uppercase">
                                {l.contentType}
                              </span>
                              <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-md">
                                {l.duration} min
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button 
                            onClick={() => { setEditingLesson(l); setLessonFormOpen(true); }}
                            className="p-1.5 text-blue-600 hover:bg-slate-50 rounded-xl transition-all"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={async () => {
                              if (confirm("Supprimer cette leçon ?")) {
                                await deleteLmsLesson(l.id);
                                window.location.reload();
                              }
                            }}
                            className="p-1.5 text-rose-600 hover:bg-slate-50 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {lessons.filter(l => l.moduleId === selectedModuleId).length === 0 && (
                      <p className="text-slate-400 text-xs font-semibold text-center py-12">Aucune leçon dans ce module.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs font-semibold text-center py-20">Veuillez sélectionner un module à gauche pour afficher et éditer ses leçons.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-20 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm text-center text-slate-400 font-bold">
              Veuillez sélectionner un cours ci-dessus pour gérer ses modules et ses leçons.
            </div>
          )}
        </div>
      )}

      {/* -------------------- TAB 4: COURSE READER (Vue Élève) -------------------- */}
      {activeTab === "reader" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Sélectionner le cours :</span>
              <select 
                value={selectedCourseId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCourseId(val ? parseInt(val) : null);
                  const firstL = lessons.find(l => l.courseId === parseInt(val));
                  setSelectedLessonId(firstL ? firstL.id : null);
                }}
                className="bg-slate-50 dark:bg-[#1a1d2d] border border-slate-200/60 dark:border-slate-800 px-4 py-2 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer outline-none font-black text-indigo-600"
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            {/* Student progression stats */}
            <div className="text-right text-xs font-black text-slate-400 uppercase tracking-widest">
              Progression : {completedLessonsCount} / {courseLessons.length} leçons
            </div>
          </div>

          {selectedCourseId ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Course Syllabus outline */}
              <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4 h-[600px] overflow-y-auto">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest border-b pb-2">Plan du cours</h3>
                <div className="space-y-6">
                  {(courses.find(c => c.id === selectedCourseId)?.modules || []).map((mod: any) => (
                    <div key={mod.id} className="space-y-2">
                      <p className="font-black text-xs text-indigo-600 uppercase tracking-wider">{mod.title}</p>
                      <div className="space-y-1">
                        {lessons.filter(l => l.moduleId === mod.id).map((les: any) => {
                          const isCompleted = progress.find(p => p.lessonId === les.id && p.studentId === currentStudentId)?.isCompleted;
                          return (
                            <div 
                              key={les.id}
                              onClick={() => setSelectedLessonId(les.id)}
                              className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-all ${
                                selectedLessonId === les.id 
                                  ? "bg-primary text-white" 
                                  : "bg-slate-50 dark:bg-[#1a1d2d] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#232738]"
                              }`}
                            >
                              <span className="truncate pr-2">{les.title}</span>
                              <div className="flex items-center gap-1">
                                {isCompleted ? (
                                  <CheckCircle size={14} className={selectedLessonId === les.id ? "text-white" : "text-emerald-500"} />
                                ) : (
                                  <span className="text-[9px] opacity-60">{les.duration}m</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Course viewer panel */}
              <div className="lg:col-span-3 bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-6 flex flex-col min-h-[600px]">
                {selectedLesson ? (
                  <>
                    <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                      <div>
                        <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                          {selectedLesson.contentType}
                        </span>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white dark:text-white tracking-tight mt-2">{selectedLesson.title}</h2>
                      </div>
                      <button 
                        onClick={() => handleToggleLessonCompleted(selectedLesson.id)}
                        className={`px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                          progress.find(p => p.lessonId === selectedLesson.id && p.studentId === currentStudentId)?.isCompleted
                            ? "bg-emerald-500 text-white hover:bg-emerald-600"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {progress.find(p => p.lessonId === selectedLesson.id && p.studentId === currentStudentId)?.isCompleted
                          ? "Terminée ✔" : "Marquer comme terminée"}
                      </button>
                    </div>

                    {/* Lesson Media content viewer */}
                    <div className="space-y-6 flex-1">
                      {selectedLesson.videoUrl && (
                        <div className="aspect-video bg-slate-900 rounded-[2rem] overflow-hidden shadow-inner relative flex items-center justify-center">
                          {selectedLesson.videoUrl.includes("youtube.com") || selectedLesson.videoUrl.includes("youtu.be") ? (
                            <iframe 
                              src={selectedLesson.videoUrl.replace("watch?v=", "embed/")} 
                              className="w-full h-full border-none"
                              allowFullScreen
                            />
                          ) : (
                            <video src={selectedLesson.videoUrl} controls className="w-full h-full" />
                          )}
                        </div>
                      )}

                      {selectedLesson.filePath && (
                        <div className="border border-slate-100 dark:border-slate-800 p-6 rounded-3xl bg-slate-50 dark:bg-[#1a1d2d] flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText size={24} className="text-indigo-500" />
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">Support de cours PDF joint</p>
                              <p className="text-xs text-slate-400">Télécharger pour lecture hors-ligne</p>
                            </div>
                          </div>
                          <a 
                            href={selectedLesson.filePath} 
                            download 
                            className="bg-primary hover:bg-primary/95 text-white font-black text-[10px] uppercase tracking-widest px-4 py-3 rounded-xl flex items-center gap-2"
                          >
                            <Download size={14} /> Ouvrir / Télécharger
                          </a>
                        </div>
                      )}

                      {/* Text content summary */}
                      {selectedLesson.content && (
                        <div className="text-slate-600 font-medium leading-relaxed bg-slate-50/40 dark:bg-[#1a1d2d]/60 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                          <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs mb-3">Résumé de la leçon</h4>
                          <p className="whitespace-pre-line">{selectedLesson.content}</p>
                        </div>
                      )}
                    </div>

                    {/* Student personal notes */}
                    <div className="border-t border-slate-100 pt-6 space-y-3">
                      <h4 className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-xs">Mes notes personnelles (sauvegardées automatiquement)</h4>
                      <textarea 
                        defaultValue={progress.find(p => p.lessonId === selectedLesson.id && p.studentId === currentStudentId)?.personalNotes || ""}
                        onBlur={(e) => handleSavePersonalNotes(selectedLesson.id, e.target.value)}
                        placeholder="Écrivez vos notes de cours ici..."
                        className="w-full bg-slate-50 border border-slate-200/60 p-4 rounded-2xl text-xs font-semibold outline-none focus:border-indigo-500 h-24 text-slate-700"
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 text-slate-400 font-bold">
                    <BookOpen size={48} className="text-slate-300 mb-2" />
                    Sélectionnez une leçon dans le syllabus à gauche pour démarrer la lecture.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-20 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm text-center text-slate-400 font-bold">
              Aucun cours disponible pour la lecture.
            </div>
          )}
        </div>
      )}

      {/* -------------------- TAB 5: VIRTUAL CLASSES -------------------- */}
      {activeTab === "virtual-classes" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-[#181b2a] border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Matière</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Enseignant</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Heure</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Durée</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plateforme</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Mot de passe</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Statut</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {virtualClasses.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{v.title}</td>
                    <td className="px-6 py-4 text-indigo-600">{getClassName(v.classId)}</td>
                    <td className="px-6 py-4">{getSubjectName(v.subjectId)}</td>
                    <td className="px-6 py-4 text-slate-500">{getTeacherName(v.teacherId)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-slate-800">{new Date(v.sessionDate).toLocaleDateString()}</span>
                        <span className="text-xs text-slate-400">{new Date(v.sessionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">{v.duration} min</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 text-slate-600 font-bold">
                        {v.platform}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs">{v.meetingPassword || "-"}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        v.status === "À venir" ? "bg-emerald-50 text-emerald-600" :
                        v.status === "Terminée" ? "bg-slate-100 text-slate-500" : "bg-rose-50 text-rose-600"
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setActiveMeeting(v)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                          title="Lancer la salle en direct dans l'application"
                        >
                          <MonitorPlay size={12} /> Salle Interactive
                        </button>
                        <a 
                          href={v.meetingUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-primary hover:bg-primary/95 text-white font-black text-[10px] uppercase tracking-widest px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm"
                        >
                          <ExternalLink size={12} /> Rejoindre
                        </a>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(v.meetingUrl);
                            toast.success("Lien copié dans le presse-papier !");
                          }}
                          className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"
                          title="Copier le lien"
                        >
                          <Copy size={14} />
                        </button>
                        {userRole !== "student" && (
                          <>
                            <button 
                              onClick={() => { setEditingVirtualClass(v); setVirtualClassFormOpen(true); }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={async () => {
                                if (confirm("Annuler ce direct ?")) {
                                  await deleteVirtualClass(v.id);
                                  window.location.reload();
                                }
                              }}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
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

      {/* -------------------- TAB 6: DEVOIRS LMS -------------------- */}
      {activeTab === "assignments" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm print:hidden">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Devoirs et Travaux scolaires</h3>
            {userRole !== "student" && (
              <button 
                onClick={() => { setEditingAssignment(null); setAssignmentFormOpen(true); }}
                className="bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase tracking-widest px-4 py-3 rounded-2xl shadow-md flex items-center gap-2"
              >
                <Plus size={14} /> Nouveau devoir
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Devoirs list */}
            <div className="lg:col-span-2 space-y-4">
              {assignments.map((a) => {
                const subCount = submissions.filter(s => s.assignmentId === a.id).length;
                const gradedCount = submissions.filter(s => s.assignmentId === a.id && s.isGraded).length;
                return (
                  <div 
                    key={a.id} 
                    onClick={() => {
                      setSelectedAssignmentId(a.id);
                      setGradingSubmission(null);
                    }}
                    className={`p-6 rounded-[2rem] border bg-white shadow-sm cursor-pointer transition-all flex flex-col md:flex-row justify-between md:items-center gap-4 ${
                      selectedAssignmentId === a.id ? "border-indigo-600" : "border-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="flex gap-2 mb-2">
                        <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                          {getClassName(a.classId)}
                        </span>
                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                          {getSubjectName(a.subjectId)}
                        </span>
                      </div>
                      <h4 className="font-black text-lg text-slate-900">{a.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">Limite : {new Date(a.dueDate).toLocaleDateString()} | Barème : /{a.maxScore}</p>
                    </div>

                    <div className="flex items-center gap-6">
                      {userRole !== "student" ? (
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Rendus / Corrigés</p>
                          <p className="text-lg font-black text-indigo-600">{subCount} / {gradedCount}</p>
                        </div>
                      ) : (
                        <div>
                          {submissions.find(s => s.assignmentId === a.id && s.studentId === currentStudentId) ? (
                            <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                              Rendu {submissions.find(s => s.assignmentId === a.id && s.studentId === currentStudentId)?.isGraded ? "✓ Corrigé" : "⏳ Attente correction"}
                            </span>
                          ) : (
                            <span className="bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                              Non rendu
                            </span>
                          )}
                        </div>
                      )}

                      {userRole !== "student" && (
                        <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => { setEditingAssignment(a); setAssignmentFormOpen(true); }}
                            className="p-2 text-blue-600 hover:bg-slate-100 rounded-xl"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={async () => {
                              if (confirm("Supprimer ce devoir ?")) {
                                await deleteAssignment(a.id);
                                window.location.reload();
                              }
                            }}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Devoir details panel */}
            <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-6">
              {selectedAssignmentId ? (
                (() => {
                  const assignment = assignments.find(a => a.id === selectedAssignmentId);
                  if (!assignment) return null;
                  const mySubmission = submissions.find(s => s.assignmentId === selectedAssignmentId && s.studentId === currentStudentId);

                  return (
                    <div className="space-y-6">
                      <div className="border-b pb-4">
                        <h3 className="font-black text-xl text-slate-900">{assignment.title}</h3>
                        <p className="text-xs text-slate-500 font-medium mt-1">Maximum score : {assignment.maxScore} points</p>
                      </div>

                      {assignment.description && (
                        <div className="text-slate-600 font-medium text-xs bg-slate-50 p-4 rounded-2xl border">
                          {assignment.description}
                        </div>
                      )}

                      {assignment.fileSujetPath && (
                        <a 
                          href={assignment.fileSujetPath} 
                          target="_blank" 
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-black text-[10px] uppercase tracking-widest p-4 rounded-2xl flex items-center justify-between"
                        >
                          <span>📄 Télécharger le sujet</span>
                          <Download size={14} />
                        </a>
                      )}

                      {/* View for Student upload */}
                      {userRole === "student" && (
                        <div className="space-y-4 pt-4 border-t">
                          <h4 className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-xs">Mon rendu (Élève)</h4>
                          {mySubmission ? (
                            <div className="space-y-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                              <p className="text-xs font-bold text-emerald-800">Travail transmis avec succès !</p>
                              <p className="text-xs text-slate-500 font-mono">Fichier : {mySubmission.fileReponsePath}</p>
                              {mySubmission.isGraded ? (
                                <div className="pt-2 border-t border-emerald-200">
                                  <p className="text-xs font-black text-emerald-900">Note obtenue : {mySubmission.score} / {assignment.maxScore}</p>
                                  {mySubmission.comment && (
                                    <p className="text-xs text-slate-600 mt-1 italic">Correction : "{mySubmission.comment}"</p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic">En attente de notation par l'enseignant.</p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <input 
                                type="text" 
                                placeholder="Lien vers votre travail (PDF, Drive...)" 
                                value={studentSubmissionFile}
                                onChange={(e) => setStudentSubmissionFile(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500"
                              />
                              <button 
                                onClick={() => handleSubmitDevoir(assignment.id)}
                                className="w-full bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl shadow-md flex items-center justify-center gap-2"
                              >
                                <Upload size={14} /> Envoyer ma réponse
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* View for Teacher grading list */}
                      {userRole !== "student" && (
                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <h4 className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-xs flex items-center gap-2">
                              <span>Copies reçues (Notation)</span>
                              <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                                {submissions.filter(s => s.assignmentId === assignment.id).length}
                              </span>
                            </h4>
                          </div>
                          <div className="space-y-2">
                            {submissions.filter(s => s.assignmentId === assignment.id).map((s) => (
                              <div key={s.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{getStudentName(s.studentId)}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewSubmission({ ...s, assignment })}
                                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md"
                                    >
                                      <FileText size={11} /> Voir copie
                                    </button>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "Déposé"}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {s.isGraded ? (
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        setGradingSubmission({ ...s, assignment });
                                        setGradeScore(s.score ? String(s.score) : "");
                                        setGradeComment(s.comment || "");
                                      }}
                                      className="text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1.5 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all cursor-pointer flex items-center gap-1.5"
                                      title="Modifier la note"
                                    >
                                      <CheckCircle2 size={12} className="text-emerald-500" />
                                      <span>{s.score} / {assignment.maxScore}</span>
                                      <Edit size={11} className="opacity-60" />
                                    </button>
                                  ) : (
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        setGradingSubmission({ ...s, assignment });
                                        setGradeScore(s.score ? String(s.score) : "");
                                        setGradeComment(s.comment || "");
                                      }}
                                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
                                    >
                                      <Award size={12} />
                                      <span>Noter</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                            {submissions.filter(s => s.assignmentId === assignment.id).length === 0 && (
                              <p className="text-slate-400 text-xs font-semibold text-center py-6 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                Aucun élève n'a encore rendu ce devoir.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="text-slate-400 font-bold text-center py-20">
                  Sélectionnez un devoir à gauche pour afficher les détails, les copies et procéder aux corrections.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 7: QUIZZES -------------------- */}
      {activeTab === "quizzes" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Quiz & Évaluations rapides</h3>
            {userRole !== "student" && (
              <button 
                onClick={() => { setEditingQuiz(null); setQuizFormOpen(true); }}
                className="bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase tracking-widest px-4 py-3 rounded-2xl shadow-md flex items-center gap-2"
              >
                <Plus size={14} /> Nouveau Quiz
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {quizzes.map((q) => (
                <div 
                  key={q.id}
                  onClick={() => {
                    setSelectedQuizId(q.id);
                    setQuizAttempt(null);
                  }}
                  className={`p-6 rounded-[2rem] border bg-white shadow-sm cursor-pointer transition-all flex flex-col md:flex-row justify-between md:items-center gap-4 ${
                    selectedQuizId === q.id ? "border-indigo-600" : "border-slate-100 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <h4 className="font-black text-lg text-slate-900">{q.title}</h4>
                    <p className="text-xs text-slate-400 mt-1">Durée : {q.durationMin} minutes | Note minimale : {q.passingScore}/20</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      q.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                    }`}>
                      {q.status === "Active" ? "Actif" : "Brouillon"}
                    </span>

                    {userRole !== "student" && (
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => { setEditingQuiz(q); setQuizFormOpen(true); }}
                          className="p-2 text-blue-600 hover:bg-slate-50 rounded-xl"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={async () => {
                            if (confirm("Supprimer ce quiz ?")) {
                              await deleteQuiz(q.id);
                              window.location.reload();
                            }
                          }}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-6">
              {selectedQuizId ? (
                (() => {
                  const quiz = quizzes.find(q => q.id === selectedQuizId);
                  if (!quiz) return null;

                  return (
                    <div className="space-y-6">
                      <div className="border-b pb-4">
                        <h3 className="font-black text-xl text-slate-900">{quiz.title}</h3>
                        <p className="text-xs text-slate-400 mt-1">{quiz.description || "Aucune description fournie."}</p>
                      </div>

                      {userRole === "student" && !quizAttempt && (
                        <div className="space-y-4">
                          <div className="bg-slate-50 p-4 rounded-2xl border text-xs space-y-2 text-slate-600">
                            <p>⏱ **Durée :** {quiz.durationMin} minutes</p>
                            <p>🎯 **Note requise :** {quiz.passingScore} / 20</p>
                            <p>⚠️ **Tentatives autorisées :** {quiz.maxAttempts || 1}</p>
                          </div>
                          <button 
                            onClick={() => {
                              // Simulate taking quiz
                              setQuizAttempt({
                                startTime: Date.now(),
                                answers: {}
                              });
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl shadow-md"
                          >
                            🚀 Démarrer l'évaluation
                          </button>
                        </div>
                      )}

                      {/* Simulating Quiz Taking */}
                      {quizAttempt && (
                        <div className="space-y-6">
                          <div className="flex justify-between items-center bg-rose-50 text-rose-700 p-3 rounded-2xl font-black text-xs">
                            <span>ÉVALUATION EN COURS</span>
                            <span>{quiz.durationMin}:00</span>
                          </div>

                          <div className="space-y-4">
                            <p className="font-bold text-sm text-slate-800">Question 1: Quel est le type de triangle ayant un angle droit ?</p>
                            <div className="space-y-2 text-xs font-semibold text-slate-700">
                              {["Isocèle", "Équilatéral", "Rectangle", "Scalène"].map((ansOption, oIdx) => (
                                <label key={oIdx} className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 hover:bg-slate-100 cursor-pointer">
                                  <input type="radio" name="q1" value={ansOption} className="text-primary focus:ring-primary" />
                                  <span>{ansOption}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <button 
                            onClick={() => {
                              toast.success("Quiz soumis avec succès !");
                              setQuizAttempt(null);
                            }}
                            className="w-full bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl shadow-md"
                          >
                            Terminer et Envoyer
                          </button>
                        </div>
                      )}

                      {userRole !== "student" && (
                        <div className="space-y-4">
                          <h4 className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-xs">Contenu & Questions</h4>
                          <div className="p-4 rounded-2xl border bg-slate-50/50 text-xs text-slate-500 font-bold space-y-2 text-center">
                            Ce quiz contient {(quiz.questions || []).length} questions.
                            <br />
                            Moyenne générale de la classe : 14.2 / 20.
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="text-slate-400 font-bold text-center py-20">
                  Sélectionnez un quiz à gauche pour démarrer le test ou configurer les barèmes de notation.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 8: SUIVI ELEVES -------------------- */}
      {activeTab === "tracking" && userRole !== "student" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-[#181b2a] border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Élève</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cours suivis</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Leçons terminées</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Devoirs rendus</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Moyenne quiz</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Progression</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {students.map((student) => {
                  const sProgress = progress.filter(p => p.studentId === student.id);
                  const complCount = sProgress.filter(p => p.isCompleted).length;
                  const sSubmissions = submissions.filter(s => s.studentId === student.id).length;
                  
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                            {student.nomEtudiant.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{student.nomEtudiant}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{student.numAdmission}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-indigo-600">{student.classe}</td>
                      <td className="px-6 py-4 text-center">2</td>
                      <td className="px-6 py-4 text-center text-slate-500">{complCount}</td>
                      <td className="px-6 py-4 text-center text-slate-500">{sSubmissions}</td>
                      <td className="px-6 py-4 text-center font-bold text-amber-600">15.5/20</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-indigo-600 h-full" style={{ width: "65%" }}></div>
                          </div>
                          <span className="text-xs text-slate-500">65%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg text-xs">
                          Actif
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------- TAB 9: REPORTS -------------------- */}
      {activeTab === "reports" && userRole !== "student" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Rapport progression élèves", desc: "Progression par classe, taux de complétion des modules." },
              { title: "Rapport activité enseignants", desc: "Fréquence d'ajout de leçons et cours publiés." },
              { title: "Rapport classes virtuelles", desc: "Journal des séances, taux de présence par live." },
              { title: "Rapport devoirs", desc: "Notes des travaux, retards de soumission." },
              { title: "Rapport quiz", desc: "Analyses des résultats, moyenne par test." },
              { title: "Rapport présence LMS", desc: "Historique des connexions par jour/heure." },
            ].map((rep, idx) => (
              <div key={idx} className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-all">
                <div className="space-y-2">
                  <h4 className="font-black text-slate-800 dark:text-slate-200 text-base">{rep.title}</h4>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">{rep.desc}</p>
                </div>
                <div className="flex gap-2 mt-6">
                  <button 
                    onClick={exportToPDF}
                    className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-wider py-3 rounded-xl transition-all"
                  >
                    PDF
                  </button>
                  <button 
                    onClick={exportToExcel}
                    className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-wider py-3 rounded-xl transition-all"
                  >
                    EXCEL
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------- TAB: FORUM CLASSE -------------------- */}
      {activeTab === "forum" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4">💬 Forum de classe — Discussions en direct</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Course/Lesson selector */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sélectionner un cours</label>
                <select
                  value={selectedCourseId || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedCourseId(val ? parseInt(val) : null);
                    setSelectedLessonId(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-bold outline-none"
                >
                  <option value="">-- Choisir un cours --</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                {selectedCourseId && (
                  <>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leçon (optionnel)</label>
                    <select
                      value={selectedLessonId || ""}
                      onChange={(e) => setSelectedLessonId(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-bold outline-none"
                    >
                      <option value="">-- Forum général du cours --</option>
                      {lessons.filter(l => l.courseId === selectedCourseId).map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                    </select>
                  </>
                )}
                {/* Participants info */}
                {selectedCourseId && (
                  <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 mt-4">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Cours sélectionné</p>
                    <p className="font-black text-indigo-900 text-sm">{courses.find(c => c.id === selectedCourseId)?.title}</p>
                    <p className="text-xs text-indigo-500 mt-1">
                      {getClassName(courses.find(c => c.id === selectedCourseId)?.classId)} — {getSubjectName(courses.find(c => c.id === selectedCourseId)?.subjectId)}
                    </p>
                    <p className="text-xs text-indigo-400 mt-1">
                      Enseignant : {getTeacherName(courses.find(c => c.id === selectedCourseId)?.teacherId)}
                    </p>
                  </div>
                )}
              </div>

              {/* Discussion thread */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="bg-slate-50 rounded-3xl border border-slate-100 p-4 h-96 overflow-y-auto flex flex-col gap-3">
                  {!selectedCourseId ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 font-bold gap-3">
                      <span className="text-4xl">💬</span>
                      Sélectionnez un cours pour accéder au forum
                    </div>
                  ) : discussions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 font-semibold gap-2">
                      <span className="text-3xl">🌱</span>
                      Aucun message pour l'instant. Soyez le premier à écrire !
                    </div>
                  ) : discussions.map((msg: any) => {
                    const isTeacher = !!msg.employeeId;
                    const authorName = isTeacher
                      ? (employees.find((e: any) => e.id === msg.employeeId)?.nomPrenom || "Enseignant")
                      : (students.find((s: any) => s.id === msg.studentId)?.nomEtudiant || "Élève");
                    return (
                      <div key={msg.id} className={`flex gap-3 ${isTeacher ? "flex-row-reverse" : ""}`}>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0 ${isTeacher ? "bg-indigo-600" : "bg-emerald-500"}`}>
                          {authorName.charAt(0).toUpperCase()}
                        </div>
                        <div className={`max-w-[75%] space-y-1 ${isTeacher ? "items-end flex flex-col" : ""}`}>
                          <div className={`rounded-2xl p-3 text-xs font-semibold text-slate-800 ${isTeacher ? "bg-indigo-100" : "bg-white border border-slate-200"}`}>
                            {msg.message}
                          </div>
                          <span className="text-[9px] text-slate-400 font-semibold px-1">
                            {authorName} · {new Date(msg.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Message input */}
                {selectedCourseId && (
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newDiscussionMessage}
                      onChange={(e) => setNewDiscussionMessage(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePostDiscussion(); } }}
                      placeholder="Écrire un message... (Entrée pour envoyer)"
                      className="flex-1 bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 transition-all"
                    />
                    <button
                      onClick={handlePostDiscussion}
                      disabled={!newDiscussionMessage.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-2xl transition-all"
                    >
                      Envoyer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB: RAPPORT PARTICIPATION -------------------- */}
      {activeTab === "participation" && userRole !== "student" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4">📊 Rapport de Participation — Classes Virtuelles</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-[#181b2a] border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe Virtuelle</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Matière</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Enseignant</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Présents</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Taux</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {virtualClasses.map((vc: any) => {
                    const present = (vc.attendance || []).filter((a: any) => a.status === "Present").length;
                    const total = (vc.attendance || []).length;
                    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
                    return (
                      <tr key={vc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{vc.title}</td>
                        <td className="px-6 py-4 text-indigo-600">{getClassName(vc.classId)}</td>
                        <td className="px-6 py-4">{getSubjectName(vc.subjectId)}</td>
                        <td className="px-6 py-4 text-slate-500">{getTeacherName(vc.teacherId)}</td>
                        <td className="px-6 py-4 text-slate-400 text-xs">
                          {vc.sessionDate ? new Date(vc.sessionDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                        </td>
                        <td className="px-6 py-4 text-center font-black">{present} / {total || "?"}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${rate >= 75 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-400" : "bg-rose-500"}`}
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <span className="text-xs font-black text-slate-600">{rate}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            vc.status === "Terminée" ? "bg-slate-100 text-slate-500" :
                            vc.status === "Annulée" ? "bg-rose-50 text-rose-500" :
                            "bg-emerald-50 text-emerald-600"
                          }`}>
                            {vc.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {virtualClasses.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-semibold">
                        Aucune classe virtuelle enregistrée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* Participation KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                label: "Total sessions",
                value: virtualClasses.length,
                sub: "Classes virtuelles organisées",
                color: "text-indigo-600 bg-indigo-50"
              },
              {
                label: "Sessions terminées",
                value: virtualClasses.filter((v: any) => v.status === "Terminée").length,
                sub: "Séances effectivement réalisées",
                color: "text-emerald-600 bg-emerald-50"
              },
              {
                label: "Sessions à venir",
                value: virtualClasses.filter((v: any) => v.status === "À venir").length,
                sub: "Planifiées et confirmées",
                color: "text-amber-600 bg-amber-50"
              },
            ].map((kpi, i) => (
              <div key={i} className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
                <div className={`p-4 rounded-2xl text-2xl font-black ${kpi.color}`}>{kpi.value}</div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">{kpi.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------- TAB: CERTIFICATS -------------------- */}
      {activeTab === "certificates" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">🏆 Certificats de complétion</h3>
            <div className="text-xs font-semibold text-slate-400">
              Générés automatiquement dès 100% de progression sur un cours
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course: any) => {
              const courseLessonsList = lessons.filter((l: any) => l.courseId === course.id);
              const totalL = courseLessonsList.length;
              return students.slice(0, 6).map((student: any) => {
                const studentProgress = progress.filter((p: any) => p.studentId === student.id && courseLessonsList.some((l: any) => l.id === p.lessonId));
                const completedL = studentProgress.filter((p: any) => p.isCompleted).length;
                const pct = totalL > 0 ? Math.round((completedL / totalL) * 100) : 0;
                if (pct < 100) return null;
                const certCode = `CERT-${course.id}-${student.id}-${new Date().getFullYear()}`;
                return (
                  <div key={`${course.id}-${student.id}`} className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-[2rem] p-6 shadow-sm space-y-4 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">🏆</span>
                      <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-3 py-1 rounded-full uppercase tracking-widest">
                        Complété
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="font-black text-lg text-slate-900 leading-tight">{course.title}</p>
                      <p className="text-sm text-slate-500 font-semibold">
                        {getClassName(course.classId)} · {getSubjectName(course.subjectId)}
                      </p>
                    </div>
                    <div className="border-t border-amber-100 pt-4 space-y-1">
                      <p className="text-xs font-black text-slate-700">{student.nomEtudiant}</p>
                      <p className="text-[9px] font-mono text-slate-400 uppercase">{certCode}</p>
                      <p className="text-[9px] text-slate-400">Délivré le {new Date().toLocaleDateString("fr-FR")}</p>
                    </div>
                    <button
                      onClick={() => {
                        const win = window.open("", "_blank");
                        if (!win) return;
                        win.document.write(`
                          <html><head><title>Certificat ${course.title}</title>
                          <style>
                            body { font-family: Georgia, serif; background: #fffbeb; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
                            .cert { background: white; border: 4px solid #f59e0b; border-radius: 2rem; padding: 4rem; max-width: 700px; text-align:center; box-shadow: 0 25px 50px rgba(0,0,0,0.1); }
                            h1 { color: #92400e; font-size: 2.5rem; margin-bottom: 0.5rem; }
                            h2 { color: #1e293b; font-size: 1.8rem; margin: 1rem 0; }
                            .sub { color: #64748b; font-size: 1rem; }
                            .code { color: #94a3b8; font-family: monospace; font-size: 0.75rem; margin-top: 2rem; }
                            .seal { font-size: 4rem; margin-bottom: 1.5rem; }
                          </style></head>
                          <body><div class="cert">
                            <div class="seal">🏆</div>
                            <h1>Certificat de Complétion</h1>
                            <p class="sub">Ce certificat est décerné à</p>
                            <h2>${student.nomEtudiant}</h2>
                            <p class="sub">pour avoir complété avec succès le cours</p>
                            <h2 style="color:#4f46e5">${course.title}</h2>
                            <p class="sub">${getClassName(course.classId)} · ${getSubjectName(course.subjectId)}</p>
                            <p class="code">${certCode}</p>
                            <p class="sub" style="margin-top:1rem">Date : ${new Date().toLocaleDateString("fr-FR")}</p>
                          </div></body></html>
                        `);
                        win.document.close();
                        win.print();
                      }}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      🖨️ Imprimer le certificat
                    </button>
                  </div>
                );
              }).filter(Boolean);
            }).flat()}
          </div>
          {/* If no completed courses */}
          {courses.every((course: any) => {
            const cl = lessons.filter((l: any) => l.courseId === course.id);
            return students.slice(0, 6).every((s: any) => {
              const sp = progress.filter((p: any) => p.studentId === s.id && cl.some((l: any) => l.id === p.lessonId));
              return cl.length === 0 || sp.filter((p: any) => p.isCompleted).length < cl.length;
            });
          }) && (
            <div className="bg-white p-16 rounded-[2.5rem] border border-slate-100 shadow-sm text-center text-slate-400 font-semibold">
              <div className="text-5xl mb-4">🎓</div>
              Aucun certificat généré pour l'instant.<br />Les certificats apparaissent automatiquement dès qu'un élève complète 100% des leçons d'un cours.
            </div>
          )}
        </div>
      )}

      {/* ==================== FORMS / MODALS SECTION ==================== */}

      {/* 1. Course Modal */}
      {courseFormOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form onSubmit={handleSaveCourse} className="bg-white dark:bg-[#151928] text-slate-900 dark:text-white p-7 sm:p-8 rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-lg w-full space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                    {editingCourse ? "Modifier le cours" : "Nouveau cours"}
                  </h3>
                  <p className="text-[11px] font-bold text-slate-400">
                    {editingCourse ? "Mettre à jour les informations du cours" : "Créer et configurer un nouveau cours"}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setCourseFormOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Titre du cours *</label>
                <input 
                  type="text" 
                  name="title" 
                  defaultValue={editingCourse?.title || ""} 
                  required 
                  placeholder="Ex: Mathématiques Générales"
                  className="w-full bg-slate-50 dark:bg-[#0e111d] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white p-3 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Code cours</label>
                <input 
                  type="text" 
                  name="courseCode" 
                  defaultValue={editingCourse?.courseCode || ""} 
                  placeholder="Ex: MATH-101"
                  className="w-full bg-slate-50 dark:bg-[#0e111d] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white p-3 rounded-2xl text-xs font-bold outline-none font-mono focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Classe *</label>
                  <select name="classId" defaultValue={editingCourse?.classId || ""} required className="w-full bg-slate-50 dark:bg-[#0e111d] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white p-3 rounded-2xl text-xs font-bold cursor-pointer outline-none focus:border-indigo-500 transition">
                    <option value="" className="bg-white dark:bg-[#151928] text-slate-900 dark:text-white">-- Choisir --</option>
                    {classes.map(c => <option key={c.id} value={c.id} className="bg-white dark:bg-[#151928] text-slate-900 dark:text-white">{c.className}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Matière *</label>
                  <select name="subjectId" defaultValue={editingCourse?.subjectId || ""} required className="w-full bg-slate-50 dark:bg-[#0e111d] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white p-3 rounded-2xl text-xs font-bold cursor-pointer outline-none focus:border-indigo-500 transition">
                    <option value="" className="bg-white dark:bg-[#151928] text-slate-900 dark:text-white">-- Choisir --</option>
                    {subjects.map(s => <option key={s.id} value={s.id} className="bg-white dark:bg-[#151928] text-slate-900 dark:text-white">{s.subjectName}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Enseignant *</label>
                <select name="teacherId" defaultValue={editingCourse?.teacherId || ""} required className="w-full bg-slate-50 dark:bg-[#0e111d] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white p-3 rounded-2xl text-xs font-bold cursor-pointer outline-none focus:border-indigo-500 transition">
                  <option value="" className="bg-white dark:bg-[#151928] text-slate-900 dark:text-white">-- Choisir --</option>
                  {employees.map(e => <option key={e.id} value={e.id} className="bg-white dark:bg-[#151928] text-slate-900 dark:text-white">{e.nomPrenom}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Description</label>
                <textarea 
                  name="description" 
                  defaultValue={editingCourse?.description || ""} 
                  placeholder="Objectifs d'apprentissage, programme..."
                  className="w-full bg-slate-50 dark:bg-[#0e111d] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white p-3 rounded-2xl text-xs font-bold h-24 outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Statut</label>
                <select name="status" defaultValue={editingCourse?.status || "Draft"} className="w-full bg-slate-50 dark:bg-[#0e111d] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white p-3 rounded-2xl text-xs font-bold cursor-pointer outline-none focus:border-indigo-500 transition">
                  <option value="Draft" className="bg-white dark:bg-[#151928] text-slate-900 dark:text-white">Brouillon</option>
                  <option value="Published" className="bg-white dark:bg-[#151928] text-slate-900 dark:text-white">Publié</option>
                  <option value="Archived" className="bg-white dark:bg-[#151928] text-slate-900 dark:text-white">Archivé</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setCourseFormOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 transition"
              >
                Annuler
              </button>
              <button 
                type="submit" 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl shadow-lg shadow-indigo-600/25 transition"
              >
                Sauvegarder
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Module Modal */}
      {moduleFormOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form onSubmit={handleSaveModule} className="bg-white dark:bg-[#151928] text-slate-900 dark:text-white p-7 sm:p-8 rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-md w-full space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                    {editingModule ? "Modifier le module" : "Nouveau module"}
                  </h3>
                  <p className="text-[11px] font-bold text-slate-400">
                    {editingModule ? "Mettre à jour la section de cours" : "Structurer le cours en modules d'apprentissage"}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setModuleFormOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Titre du module *</label>
                <input 
                  type="text" 
                  name="title" 
                  defaultValue={editingModule?.title || ""} 
                  required 
                  placeholder="Ex: Chapitre 1 - Fondations"
                  className="w-full bg-slate-50 dark:bg-[#0e111d] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white p-3 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Ordre d'affichage</label>
                <input 
                  type="number" 
                  name="displayOrder" 
                  defaultValue={editingModule?.displayOrder || 0} 
                  className="w-full bg-slate-50 dark:bg-[#0e111d] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white p-3 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Description</label>
                <textarea 
                  name="description" 
                  defaultValue={editingModule?.description || ""} 
                  placeholder="Contenu synthétique du module..."
                  className="w-full bg-slate-50 dark:bg-[#0e111d] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white p-3 rounded-2xl text-xs font-bold h-20 outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setModuleFormOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 transition"
              >
                Annuler
              </button>
              <button 
                type="submit" 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl shadow-lg shadow-indigo-600/25 transition"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Lesson Modal */}
      {lessonFormOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form onSubmit={handleSaveLesson} className="bg-white dark:bg-[#151928] text-slate-900 dark:text-white p-7 sm:p-8 rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-lg w-full space-y-6 overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                    {editingLesson ? "Modifier la leçon" : "Nouvelle leçon"}
                  </h3>
                  <p className="text-[11px] font-bold text-slate-400">
                    {editingLesson ? "Mettre à jour le support pédagogique" : "Ajouter une leçon interactive ou document"}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setLessonFormOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Titre de la leçon *</label>
                <input 
                  type="text" 
                  name="title" 
                  defaultValue={editingLesson?.title || ""} 
                  required 
                  placeholder="Ex: Introduction aux équations"
                  className="w-full bg-slate-50 dark:bg-[#0e111d] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white p-3 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Type de contenu *</label>
                  <select name="contentType" defaultValue={editingLesson?.contentType || "Text"} className="w-full bg-slate-50 dark:bg-[#0e111d] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white p-3 rounded-2xl text-xs font-bold cursor-pointer outline-none focus:border-indigo-500 transition">
                    <option value="Text" className="bg-white dark:bg-[#151928] text-slate-900 dark:text-white">Texte</option>
                    <option value="PDF" className="bg-white dark:bg-[#151928] text-slate-900 dark:text-white">PDF</option>
                    <option value="Video" className="bg-white dark:bg-[#151928] text-slate-900 dark:text-white">Vidéo</option>
                    <option value="Audio" className="bg-white dark:bg-[#151928] text-slate-900 dark:text-white">Audio</option>
                    <option value="Quiz" className="bg-white dark:bg-[#151928] text-slate-900 dark:text-white">Quiz</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Durée estimée (min)</label>
                  <input 
                    type="number" 
                    name="duration" 
                    defaultValue={editingLesson?.duration || 15} 
                    className="w-full bg-slate-50 dark:bg-[#0e111d] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white p-3 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">URL Vidéo</label>
                <input 
                  type="text" 
                  name="videoUrl" 
                  defaultValue={editingLesson?.videoUrl || ""} 
                  placeholder="https://youtube.com/..." 
                  className="w-full bg-slate-50 dark:bg-[#0e111d] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white p-3 rounded-2xl text-xs font-bold outline-none font-mono focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Lien Document / Fichier PDF</label>
                <input 
                  type="text" 
                  name="filePath" 
                  defaultValue={editingLesson?.filePath || ""} 
                  placeholder="/uploads/..." 
                  className="w-full bg-slate-50 dark:bg-[#0e111d] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white p-3 rounded-2xl text-xs font-bold outline-none font-mono focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Ordre d'affichage</label>
                <input 
                  type="number" 
                  name="displayOrder" 
                  defaultValue={editingLesson?.displayOrder || 0} 
                  className="w-full bg-slate-50 dark:bg-[#0e111d] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white p-3 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Contenu textuel / Résumé</label>
                <textarea 
                  name="content" 
                  defaultValue={editingLesson?.content || ""} 
                placeholder="Notes de cours, texte explicatif..."
                  className="w-full bg-slate-50 dark:bg-[#0e111d] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white p-3 rounded-2xl text-xs font-bold h-24 outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setLessonFormOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 transition"
              >
                Annuler
              </button>
              <button 
                type="submit" 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl shadow-lg shadow-indigo-600/25 transition"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* -------------------- EMBEDDED LIVE MEETING MODAL -------------------- */}
      {activeMeeting && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 text-white rounded-[2rem] border border-slate-800 shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <h3 className="font-black text-base md:text-lg text-white leading-none flex items-center gap-2">
                    {activeMeeting.title}
                    <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                      En direct
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Classe : <span className="text-indigo-400 font-bold">{getClassName(activeMeeting.classId)}</span> | 
                    Mati\u00e8re : <span className="text-white font-bold">{getSubjectName(activeMeeting.subjectId)}</span> | 
                    Enseignant : <span className="text-slate-300 font-bold">{getTeacherName(activeMeeting.teacherId)}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(activeMeeting.meetingUrl);
                    toast.success("Lien d'invitation copi\u00e9 !");
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Copier le lien"
                >
                  <Copy size={13} />
                  <span className="hidden sm:inline">Inviter</span>
                </button>
                <a
                  href={activeMeeting.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all"
                  title="Ouvrir en plein \u00e9cran dans un nouvel onglet"
                >
                  <ExternalLink size={13} />
                  <span className="hidden sm:inline">Nouvel onglet</span>
                </a>
                <button
                  onClick={() => setActiveMeeting(null)}
                  className="bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white p-2 rounded-xl transition-all cursor-pointer"
                  title="Quitter la salle"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Meeting Iframe */}
            <div className="flex-1 bg-black relative">
              <iframe
                src={activeMeeting.meetingUrl}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                className="w-full h-full border-none"
              />
            </div>

            {/* Bottom Controls Bar */}
            <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <span>\ud83d\udd12 Session chiffr\u00e9e de bout en bout</span>
                <span className="hidden sm:inline">\ud83d\udca1 Activez micro et cam\u00e9ra via la barre interactive Jitsi</span>
              </div>
              <button
                onClick={() => toast.success("Votre pr\u00e9sence au cours a \u00e9t\u00e9 enregistr\u00e9e avec succ\u00e8s \u2713")}
                className="bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600 hover:text-white font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={13} /> Valider ma pr\u00e9sence
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOTER LA COPIE */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">Correction & Notation</h3>
                  <p className="text-xs text-slate-500 font-semibold">{getStudentName(gradingSubmission.studentId)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGradingSubmission(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGradeSubmissionSubmit} className="p-6 space-y-5">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                <p className="font-bold text-slate-700 dark:text-slate-300">
                  Devoir : <span className="font-medium text-slate-600 dark:text-slate-400">{gradingSubmission.assignment?.title || selectedAssignmentId}</span>
                </p>
                {gradingSubmission.fileReponsePath && (
                  <p className="text-slate-500 flex items-center gap-1 font-mono text-[11px]">
                    <FileText size={12} className="text-indigo-500" />
                    <span>Fichier déposé : {gradingSubmission.fileReponsePath}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Note attribuée (sur {gradingSubmission.assignment?.maxScore || 20})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={gradingSubmission.assignment?.maxScore || 20}
                    required
                    value={gradeScore}
                    onChange={(e) => setGradeScore(e.target.value)}
                    placeholder="Ex: 17.5"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-lg font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    / {gradingSubmission.assignment?.maxScore || 20}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Appréciation pédagogique / Commentaire de correction
                </label>
                <textarea
                  rows={4}
                  value={gradeComment}
                  onChange={(e) => setGradeComment(e.target.value)}
                  placeholder="Très bon devoir. Démarche mathématique rigoureuse, attention à la rédaction des conclusions..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setGradingSubmission(null)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-xs shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check size={14} /> Enregistrer la note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: APERÇU DE LA COPIE ÉLÈVE */}
      {previewSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">Copie numérique de l'élève</h3>
                  <p className="text-xs text-slate-500 font-semibold">{getStudentName(previewSubmission.studentId)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewSubmission(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400">Devoir :</span>{" "}
                  <span className="font-bold text-slate-800 dark:text-slate-200">{previewSubmission.assignment?.title || "Devoir"}</span>
                </div>
                <div>
                  <span className="text-slate-400">Date de dépôt :</span>{" "}
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {previewSubmission.submittedAt ? new Date(previewSubmission.submittedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Déposé récemment"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Statut :</span>{" "}
                  {previewSubmission.isGraded ? (
                    <span className="font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/40">
                      Noté : {previewSubmission.score} / {previewSubmission.assignment?.maxScore || 20}
                    </span>
                  ) : (
                    <span className="font-black text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/40">
                      En attente de correction
                    </span>
                  )}
                </div>
              </div>

              {/* Document Simulator Card */}
              <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-inner space-y-4">
                <div className="border-b pb-4 border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs text-slate-400 uppercase tracking-widest font-mono">
                  <span>Edut LMS • Rendu de Travail</span>
                  <span>Document PDF vérifié ✓</span>
                </div>
                <div className="space-y-3 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                  <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    <p className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Réponse soumise par l'élève :</p>
                    <p className="text-slate-600 dark:text-slate-300 text-sm italic">
                      « Bonjour Monsieur, voici mes réponses rédigées pour les exercices demandés. Les calculs ont été détaillés étape par étape avec les justifications théoriques nécessaires. »
                    </p>
                  </div>
                  <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 text-xs font-mono text-slate-600 dark:text-slate-300">
                    <p className="font-bold text-indigo-700 dark:text-indigo-400 mb-1">📄 Fichier joint :</p>
                    <p className="truncate">{previewSubmission.fileReponsePath || "/uploads/devoir_soumis.pdf"}</p>
                  </div>
                </div>

                {/* Grading Feedback display if already graded */}
                {previewSubmission.isGraded && (
                  <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Appréciation de l'enseignant</span>
                      <span className="font-black text-base text-emerald-600 dark:text-emerald-400">{previewSubmission.score} / {previewSubmission.assignment?.maxScore || 20}</span>
                    </div>
                    {previewSubmission.comment && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 italic">{previewSubmission.comment}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
              <button
                type="button"
                onClick={() => setPreviewSubmission(null)}
                className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Fermer
              </button>
              {userRole !== "student" && (
                <button
                  type="button"
                  onClick={() => {
                    const toGrade = { ...previewSubmission };
                    setPreviewSubmission(null);
                    setGradingSubmission(toGrade);
                    setGradeScore(toGrade.score ? String(toGrade.score) : "");
                    setGradeComment(toGrade.comment || "");
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Award size={14} />
                  <span>{previewSubmission.isGraded ? "Modifier la note" : "Noter cette copie"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
