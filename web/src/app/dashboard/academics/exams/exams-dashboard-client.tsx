"use client";

import React, { useState, useEffect } from "react";
import { 
  Award, 
  Calendar, 
  Users, 
  BookOpen, 
  Sparkles, 
  Clock, 
  MapPin, 
  UserCheck, 
  QrCode, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Cpu, 
  Activity, 
  Download, 
  Search, 
  Scan,
  RefreshCw,
  Info
} from "lucide-react";
import { getClassDisplayName } from "@/domains/academics/utils/class-name";

const BACKEND_URL = "http://localhost:8000";

interface ExamsDashboardClientProps {
  initialClasses: any[];
  initialSessions: any[];
  initialSubjects: any[];
}

export default function ExamsDashboardClient({
  initialClasses,
  initialSessions,
  initialSubjects
}: ExamsDashboardClientProps) {
  // Tabs State
  const [activeTab, setActiveTab] = useState<"ai_generator" | "planning" | "admissions" | "attendance" | "bank" | "marks">("ai_generator");
  const [planningSubTab, setPlanningSubTab] = useState<"campaigns" | "rooms" | "schedule" | "ai_solver">("campaigns");

  // Local state initialized with server props or fallbacks
  const [classes, setClasses] = useState<any[]>(initialClasses || []);
  const [sessions, setSessions] = useState<any[]>(initialSessions || []);
  const [subjects, setSubjects] = useState<any[]>(initialSubjects || []);
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    async function checkLocalCache() {
      if (navigator.onLine) {
        try {
          const { cacheReferenceItems } = await import("@/infrastructure/local-db/references");
          if (initialClasses?.length > 0) await cacheReferenceItems("class", initialClasses, "className");
          if (initialSessions?.length > 0) await cacheReferenceItems("session", initialSessions, "sessionName");
          if (initialSubjects?.length > 0) await cacheReferenceItems("subject", initialSubjects, "subjectName");
        } catch (e) {
          console.warn("Failed to cache exams reference data:", e);
        }
      }

      if (!initialClasses || initialClasses.length === 0 || !navigator.onLine) {
        try {
          const { getCachedReferenceItems } = await import("@/infrastructure/local-db/references");
          const cachedClasses = await getCachedReferenceItems("class");
          const cachedSessions = await getCachedReferenceItems("session");
          const cachedSubjects = await getCachedReferenceItems("subject");

          if (cachedClasses?.length > 0) {
            setClasses(cachedClasses);
            setIsLocal(true);
          }
          if (cachedSessions?.length > 0) setSessions(cachedSessions);
          if (cachedSubjects?.length > 0) setSubjects(cachedSubjects);
        } catch (e) {
          console.warn("Failed to load cached exams reference data:", e);
        }
      }
    }
    checkLocalCache();
  }, [initialClasses, initialSessions, initialSubjects]);
  
  // States fetched dynamically from Python backend
  const [teachers, setTeachers] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loadingContext, setLoadingContext] = useState(false);
  const [backendOffline, setBackendOffline] = useState(false);

  // Global Alerts
  const [globalAlert, setGlobalAlert] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  const showAlert = (type: "success" | "error" | "info", msg: string) => {
    setGlobalAlert({ type, msg });
    setTimeout(() => setGlobalAlert(null), 6000);
  };

  // Fetch Python backend entities safely on load
  useEffect(() => {
    fetchBackendEntities();
  }, []);

  const fetchBackendEntities = async () => {
    setLoadingContext(true);
    setBackendOffline(false);
    try {
      // Backend is always online via Next.js APIs now

      // 1. Fetch Teachers
      try {
        const resTeachers = await fetch('/api/exams/teachers');
        if (resTeachers.ok) {
          const data = await resTeachers.json();
          setTeachers(data);
        }
      } catch (e) {
        console.warn("Failed to fetch teachers from Next.js API:", e);
      }

      // 2. Fetch Campaigns
      try {
        const resCampaigns = await fetch('/api/exams/campaigns');
        if (resCampaigns.ok) {
          const data = await resCampaigns.json();
          setCampaigns(data);
        }
      } catch (e) {
        console.warn("Failed to fetch campaigns from Next.js API:", e);
      }

      // 3. Fetch Rooms
      try {
        const resRooms = await fetch('/api/exams/rooms');
        if (resRooms.ok) {
          const data = await resRooms.json();
          setRooms(data);
        }
      } catch (e) {
        console.warn("Failed to fetch rooms from Next.js API:", e);
      }
    } catch (err) {
      console.error("Error in fetchBackendEntities:", err);
    } finally {
      setLoadingContext(false);
    }
  };

  // ====================================================
  // TAB 1: AI QUESTION GENERATOR STATE & HANDLERS
  // ====================================================
  const [aiForm, setAiForm] = useState({
    subject_name: "",
    topic: "",
    difficulty: "Moyen",
    q_type: "QCM (Choix Multiples)",
    count: 3
  });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);

  const handleGenerateAIQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiForm.subject_name || !aiForm.topic) {
      showAlert("error", "Veuillez renseigner la matière et le sujet.");
      return;
    }
    setAiGenerating(true);
    setGeneratedQuestions([]);
    try {
      const response = await fetch('/api/exams/ai/generate', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiForm)
      });
      if (response.ok) {
        const data = await response.json();
        setGeneratedQuestions(data.questions);
        showAlert("success", `${data.questions.length} questions générées avec succès !`);
      } else {
        const errData = await response.json().catch(() => ({}));
        showAlert("error", errData.error || "Erreur de génération.");
      }
    } catch (err) {
      showAlert("error", "Le serveur d'IA est actuellement hors ligne ou indisponible.");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveQuestionsToBank = async () => {
    if (generatedQuestions.length === 0) return;
    
    // Find subject ID
    const selectedSub = subjects.find(s => s.subjectName === aiForm.subject_name || s.name === aiForm.subject_name);
    const subId = selectedSub?.id || 1;

    try {
      const response = await fetch('/api/exams/ai/save', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: generatedQuestions,
          subject_id: subId,
          topic: aiForm.topic,
          difficulty: aiForm.difficulty
        })
      });
      if (response.ok) {
        const data = await response.json();
        showAlert("success", data.message || "Questions sauvegardées dans la banque !");
        setGeneratedQuestions([]);
      } else {
        const errData = await response.json().catch(() => ({}));
        showAlert("error", errData.error || errData.detail || "Erreur de sauvegarde.");
      }
    } catch (err) {
      showAlert("error", "Erreur de communication avec le serveur.");
    }
  };

  // ====================================================
  // TAB 2: PLANNING & AI SOLVER STATE & HANDLERS
  // ====================================================
  // 2.1 Campaigns Form
  const [campForm, setCampForm] = useState({
    name: "",
    session_id: "",
    start_date: "",
    end_date: ""
  });
  const [campSaving, setCampSaving] = useState(false);
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campForm.name || !campForm.session_id || !campForm.start_date || !campForm.end_date) {
      showAlert("error", "Veuillez remplir tous les champs de la campagne.");
      return;
    }
    setCampSaving(true);
    try {
      const response = await fetch('/api/exams/campaigns', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campForm.name,
          session_id: parseInt(campForm.session_id),
          start_date: campForm.start_date,
          end_date: campForm.end_date
        })
      });
      if (response.ok) {
        showAlert("success", "Campagne d'examen créée !");
        setCampForm({ name: "", session_id: "", start_date: "", end_date: "" });
        fetchBackendEntities();
      } else {
        const errData = await response.json().catch(() => ({}));
        showAlert("error", errData.error || errData.detail || "Erreur lors de la création.");
      }
    } catch (err) {
      showAlert("error", "Erreur de communication avec le serveur.");
    } finally {
      setCampSaving(false);
    }
  };

  // 2.2 Rooms Form
  const [roomForm, setRoomForm] = useState({ name: "", capacity: 30 });
  const [roomSaving, setRoomSaving] = useState(false);
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomForm.name || !roomForm.capacity) {
      showAlert("error", "Veuillez renseigner le nom et la capacité de la salle.");
      return;
    }
    setRoomSaving(true);
    try {
      const response = await fetch('/api/exams/rooms', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roomForm.name,
          capacity: parseInt(roomForm.capacity.toString())
        })
      });
      if (response.ok) {
        showAlert("success", "Salle créée avec succès !");
        setRoomForm({ name: "", capacity: 30 });
        fetchBackendEntities();
      } else {
        const errData = await response.json().catch(() => ({}));
        showAlert("error", errData.error || errData.detail || "Erreur lors de la création.");
      }
    } catch (err) {
      showAlert("error", "Erreur de communication avec le serveur.");
    } finally {
      setRoomSaving(false);
    }
  };

  // 2.3 Scheduling Timetable Form
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [timetables, setTimetables] = useState<any[]>([]);
  const [ttForm, setTtForm] = useState({
    class_id: "",
    subject_id: "",
    date: "",
    start_time: "",
    end_time: "",
    max_marks: 20
  });
  const [ttSaving, setTtSaving] = useState(false);

  useEffect(() => {
    if (selectedCampaignId) {
      fetchTimetables(selectedCampaignId);
    } else {
      setTimetables([]);
    }
  }, [selectedCampaignId]);

  const fetchTimetables = async (campId: string) => {
    try {
      const res = await fetch(`/api/exams/planning/timetable/${campId}`);
      if (res.ok) {
        const data = await res.json();
        setTimetables(data);
      }
    } catch (err) {
      console.warn("Failed to load timetables:", err);
    }
  };

  const handleSaveTimetable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignId) {
      showAlert("error", "Veuillez sélectionner une campagne d'examen.");
      return;
    }
    if (!ttForm.class_id || !ttForm.subject_id || !ttForm.date || !ttForm.start_time || !ttForm.end_time) {
      showAlert("error", "Tous les champs de planification sont obligatoires.");
      return;
    }
    setTtSaving(true);
    try {
      const response = await fetch('/api/exams/planning/timetable', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: parseInt(selectedCampaignId),
          class_id: parseInt(ttForm.class_id),
          subject_id: parseInt(ttForm.subject_id),
          date: ttForm.date,
          start_time: ttForm.start_time,
          end_time: ttForm.end_time,
          max_marks: parseFloat(ttForm.max_marks.toString())
        })
      });
      if (response.ok) {
        showAlert("success", "Épreuve planifiée avec succès !");
        setTtForm({ class_id: "", subject_id: "", date: "", start_time: "", end_time: "", max_marks: 20 });
        fetchTimetables(selectedCampaignId);
      } else {
        const errData = await response.json().catch(() => ({}));
        showAlert("error", errData.error || errData.detail || "Erreur de planification.");
      }
    } catch (err) {
      showAlert("error", "Erreur de communication.");
    } finally {
      setTtSaving(false);
    }
  };

  // 2.4 Manual / Auto Invigilator Assignment
  const [assignForm, setAssignForm] = useState({
    timetable_id: "",
    room_id: "",
    employee_id: ""
  });
  const [assignSaving, setAssignSaving] = useState(false);

  const handleAssignInvigilator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.timetable_id || !assignForm.room_id || !assignForm.employee_id) {
      showAlert("error", "Veuillez remplir tous les champs d'affectation.");
      return;
    }
    setAssignSaving(true);
    try {
      const response = await fetch('/api/exams/planning/assign-invigilator', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timetable_id: parseInt(assignForm.timetable_id),
          room_id: parseInt(assignForm.room_id),
          employee_id: parseInt(assignForm.employee_id)
        })
      });
      if (response.ok) {
        showAlert("success", "Affectation enregistrée avec succès !");
        setAssignForm({ timetable_id: "", room_id: "", employee_id: "" });
      } else {
        const errData = await response.json().catch(() => ({}));
        showAlert("error", errData.error || errData.detail || "Erreur d'affectation.");
      }
    } catch (err) {
      showAlert("error", "Erreur de communication.");
    } finally {
      setAssignSaving(false);
    }
  };

  const [aiSolverLoading, setAiSolverLoading] = useState(false);
  const handleTriggerAISolver = async () => {
    if (!selectedCampaignId) {
      showAlert("error", "Sélectionnez d'abord une campagne d'examen.");
      return;
    }
    setAiSolverLoading(true);
    try {
      const response = await fetch('/api/exams/planning/auto-assign-invigilators', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: parseInt(selectedCampaignId) })
      });
      if (response.ok) {
        showAlert("success", "Planification intelligente des surveillants terminée !");
      } else {
        const errData = await response.json().catch(() => ({}));
        showAlert("error", errData.error || errData.detail || "Le planificateur a échoué.");
      }
    } catch (err) {
      showAlert("error", "Erreur lors de l'appel du solveur de contraintes.");
    } finally {
      setAiSolverLoading(false);
    }
  };

  // ====================================================
  // TAB 3: ADMISSIONS & CANDIDATES VETTING STATE & HANDLERS
  // ====================================================
  const [admitCampaignId, setAdmitCampaignId] = useState("");
  const [admitClassId, setAdmitClassId] = useState("");
  const [candidatesList, setCandidatesList] = useState<any[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [admitCardsLink, setAdmitCardsLink] = useState<string | null>(null);

  const fetchCandidatesStatus = async () => {
    if (!admitCampaignId || !admitClassId) return;
    setCandidatesLoading(true);
    setAdmitCardsLink(null);
    try {
      const res = await fetch(`/api/exams/candidates/status?campaign_id=${admitCampaignId}&class_id=${admitClassId}`);
      if (res.ok) {
        const data = await res.json();
        setCandidatesList(data);
      }
    } catch (err) {
      console.warn("Failed to fetch candidates:", err);
      showAlert("error", "Erreur lors du chargement des candidats.");
    } finally {
      setCandidatesLoading(false);
    }
  };

  const handleProcessCandidates = async () => {
    if (!admitCampaignId || !admitClassId) {
      showAlert("error", "Sélectionnez une campagne et une classe.");
      return;
    }
    setCandidatesLoading(true);
    try {
      const response = await fetch('/api/exams/candidates/process', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: parseInt(admitCampaignId),
          class_id: parseInt(admitClassId)
        })
      });
      if (response.ok) {
        showAlert("success", "Vérification et Anonymat générés !");
        fetchCandidatesStatus();
      } else {
        const errData = await response.json().catch(() => ({}));
        showAlert("error", errData.error || errData.detail || "Erreur de traitement.");
      }
    } catch (err) {
      showAlert("error", "Erreur de communication.");
    } finally {
      setCandidatesLoading(false);
    }
  };

  const [generatingPDF, setGeneratingPDF] = useState(false);
  const handleGenerateAdmitCards = async () => {
    if (!admitCampaignId || !admitClassId) {
      showAlert("error", "Sélectionnez une campagne et une classe.");
      return;
    }
    setGeneratingPDF(true);
    try {
      const response = await fetch('/api/exams/candidates/admit-cards', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: parseInt(admitCampaignId),
          class_id: parseInt(admitClassId),
          school_name: "ECOLE PRIVEE INTERNATIONALE EDUT"
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          setAdmitCardsLink(data.url);
          showAlert("success", "Cartes d'admission générées et stockées sur Supabase !");
        } else if (data.pdf_base64) {
          const link = document.createElement("a");
          link.href = `data:application/pdf;base64,${data.pdf_base64}`;
          link.download = `cartes_admission_classe_${admitClassId}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showAlert("success", "Cartes d'admission téléchargées avec succès !");
        } else if (data.local_path) {
          showAlert("success", `Cartes générées localement: ${data.local_path}`);
          setAdmitCardsLink(data.local_path);
        } else {
          showAlert("success", data.message || "Génération terminée.");
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        showAlert("error", errData.error || errData.detail || "Erreur de génération PDF.");
      }
    } catch (err) {
      showAlert("error", "Erreur réseau.");
    } finally {
      setGeneratingPDF(false);
    }
  };

  // ====================================================
  // TAB 4: LIVE ATTENDANCE & QR SCANNER STATE & HANDLERS
  // ====================================================
  const [attCampaignId, setAttCampaignId] = useState("");
  const [attClassId, setAttClassId] = useState("");
  const [classTimetables, setClassTimetables] = useState<any>({});
  const [selectedTimetableId, setSelectedTimetableId] = useState("");
  const [attendanceRoster, setAttendanceRoster] = useState<any[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Fetch timetables when Campaign or Class change in attendance
  useEffect(() => {
    if (attCampaignId && attClassId) {
      fetchAttendanceTimetables();
    } else {
      setClassTimetables({});
      setSelectedTimetableId("");
      setAttendanceRoster([]);
    }
  }, [attCampaignId, attClassId]);

  const fetchAttendanceTimetables = async () => {
    try {
      const res = await fetch(`/api/exams/planning/timetable/${attCampaignId}`);
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((t: any) => t.class_id === parseInt(attClassId));
        const mapping: any = {};
        filtered.forEach((t: any) => {
          mapping[`${t.subject_name} (${t.exam_date} à ${t.start_time})`] = t.id;
        });
        setClassTimetables(mapping);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  // Fetch roster when selected timetable changes
  useEffect(() => {
    if (selectedTimetableId) {
      fetchAttendanceRoster(selectedTimetableId);
    } else {
      setAttendanceRoster([]);
    }
  }, [selectedTimetableId]);

  const fetchAttendanceRoster = async (ttId: string) => {
    setRosterLoading(true);
    try {
      const res = await fetch(`/api/exams/attendance/${ttId}`);
      if (res.ok) {
        const data = await res.json();
        setAttendanceRoster(data);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setRosterLoading(false);
    }
  };

  const handleMarkAttendance = async (recordId: number, status: string) => {
    try {
      const response = await fetch('/api/exams/attendance/mark', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record_id: recordId, status })
      });
      if (response.ok) {
        setAttendanceRoster(prev => prev.map(r => r.id === recordId ? { ...r, status } : r));
        showAlert("success", `Statut de présence mis à jour en '${status}'.`);
      }
    } catch (err) {
      showAlert("error", "Erreur réseau.");
    }
  };

  // QR Code Scanner Simulation
  const [qrInput, setQrInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const handleSimulateQRScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTimetableId) {
      showAlert("error", "Veuillez choisir une épreuve.");
      return;
    }
    if (!qrInput) {
      showAlert("error", "Entrez le texte de code QR.");
      return;
    }
    setScanning(true);
    try {
      const response = await fetch('/api/exams/attendance/scan-qr', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qr_data: qrInput,
          timetable_id: parseInt(selectedTimetableId)
        })
      });
      if (response.ok) {
        const data = await response.json();
        showAlert("success", `Présence enregistrée pour l'élève : ${data.student_name} !`);
        setQrInput("");
        fetchAttendanceRoster(selectedTimetableId);
      } else {
        const errData = await response.json().catch(() => ({}));
        showAlert("error", errData.error || errData.detail || "Code QR non reconnu.");
      }
    } catch (err) {
      showAlert("error", "Erreur de traitement.");
    } finally {
      setScanning(false);
    }
  };

  // Incident Dialogue
  const [incidentDialog, setIncidentDialog] = useState<{ recordId: number; name: string } | null>(null);
  const [incidentType, setIncidentType] = useState("Fraude (Triche)");
  const [incidentReport, setIncidentReport] = useState("");
  const [reportingIncident, setReportingIncident] = useState(false);

  const handleReportIncident = async () => {
    if (!incidentDialog) return;
    setReportingIncident(true);
    try {
      const response = await fetch('/api/exams/attendance/incident', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record_id: incidentDialog.recordId,
          incident_type: incidentType,
          report_text: incidentReport
        })
      });
      if (response.ok) {
        showAlert("success", `Incident de type ${incidentType} enregistré.`);
        setIncidentDialog(null);
        setIncidentReport("");
        if (selectedTimetableId) fetchAttendanceRoster(selectedTimetableId);
      } else {
        const errData = await response.json().catch(() => ({}));
        showAlert("error", errData.error || errData.detail || "Erreur.");
      }
    } catch (err) {
      showAlert("error", "Erreur réseau.");
    } finally {
      setReportingIncident(false);
    }
  };

  // ====================================================
  // TAB 5: AI QUESTION BANK STATE & HANDLERS
  // ====================================================
  const [bankFilterSubjectId, setBankFilterSubjectId] = useState("");
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [bankLoading, setBankLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "bank") {
      fetchQuestionBank();
    }
  }, [activeTab, bankFilterSubjectId]);

  const fetchQuestionBank = async () => {
    setBankLoading(true);
    try {
      let url = '/api/exams/ai/bank';
      if (bankFilterSubjectId) {
        url += `?subject_id=${bankFilterSubjectId}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setBankQuestions(data);
      }
    } catch (err) {
      console.warn("Failed to load question bank:", err);
    } finally {
      setBankLoading(false);
    }
  };

  // ====================================================
  // TAB 6: NOTES & RESULTATS STATE & HANDLERS
  // ====================================================
  const [marksCampaignId, setMarksCampaignId] = useState("");
  const [marksClassId, setMarksClassId] = useState("");
  const [marksTimetables, setMarksTimetables] = useState<any[]>([]);
  const [selectedMarksTimetableId, setSelectedMarksTimetableId] = useState("");
  const [marksList, setMarksList] = useState<any[]>([]);
  const [marksLoading, setMarksLoading] = useState(false);
  const [marksSaving, setMarksSaving] = useState(false);
  const [deAnonymize, setDeAnonymize] = useState(false);
  const [smartImportText, setSmartImportText] = useState("");
  const [smartImportLoading, setSmartImportLoading] = useState(false);
  const [parsedPreviewList, setParsedPreviewList] = useState<any[]>([]);
  const [showSmartImportModal, setShowSmartImportModal] = useState(false);

  useEffect(() => {
    if (marksCampaignId && marksClassId) {
      fetchMarksTimetables();
    } else {
      setMarksTimetables([]);
      setSelectedMarksTimetableId("");
      setMarksList([]);
    }
  }, [marksCampaignId, marksClassId]);

  const fetchMarksTimetables = async () => {
    try {
      const res = await fetch(`/api/exams/planning/timetable/${marksCampaignId}`);
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((t: any) => t.class_id === parseInt(marksClassId));
        setMarksTimetables(filtered);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  useEffect(() => {
    if (selectedMarksTimetableId) {
      fetchMarksRoster(selectedMarksTimetableId);
    } else {
      setMarksList([]);
    }
  }, [selectedMarksTimetableId]);

  const fetchMarksRoster = async (ttId: string) => {
    setMarksLoading(true);
    try {
      const res = await fetch(`/api/exams/attendance/${ttId}`);
      if (res.ok) {
        const data = await res.json();
        setMarksList(data);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setMarksLoading(false);
    }
  };

  const handleSaveMarks = async () => {
    if (marksList.length === 0) return;
    setMarksSaving(true);
    try {
      const response = await fetch('/api/exams/marks/save', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marks: marksList.map(item => ({
            record_id: item.id,
            marks_obtained: item.marks_obtained !== "" && item.marks_obtained !== null ? parseFloat(item.marks_obtained) : null
          }))
        })
      });
      if (response.ok) {
        showAlert("success", "Toutes les notes ont été enregistrées avec succès !");
        fetchMarksRoster(selectedMarksTimetableId);
      } else {
        const errData = await response.json().catch(() => ({}));
        showAlert("error", errData.error || "Erreur lors de la sauvegarde.");
      }
    } catch (err) {
      showAlert("error", "Erreur de communication.");
    } finally {
      setMarksSaving(false);
    }
  };

  const handleAIParseMarks = async () => {
    if (!smartImportText.trim()) {
      showAlert("error", "Veuillez coller du texte d'abord.");
      return;
    }
    setSmartImportLoading(true);
    try {
      const response = await fetch('/api/exams/marks/parse', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: smartImportText,
          max_marks: 20
        })
      });
      if (response.ok) {
        const data = await response.json();
        setParsedPreviewList(data.parsed || []);
        showAlert("success", `Extraction intelligente terminée (${data.method}) ! ${data.parsed?.length || 0} notes identifiées.`);
      } else {
        const errData = await response.json().catch(() => ({}));
        showAlert("error", errData.error || "Erreur de parsing.");
      }
    } catch (err) {
      showAlert("error", "Erreur réseau.");
    } finally {
      setSmartImportLoading(false);
    }
  };

  const handleApplyParsedMarks = () => {
    if (parsedPreviewList.length === 0) return;
    
    setMarksList(prev => {
      const updated = [...prev];
      let matchCount = 0;
      
      for (const parsed of parsedPreviewList) {
        const index = updated.findIndex(item => item.anonymity_code === parsed.anonymity_code);
        if (index !== -1) {
          updated[index] = {
            ...updated[index],
            marks_obtained: parsed.mark
          };
          matchCount++;
        }
      }
      
      showAlert("success", `${matchCount} notes appliquées avec succès aux candidats correspondants !`);
      return updated;
    });
    
    setSmartImportText("");
    setParsedPreviewList([]);
    setShowSmartImportModal(false);
  };

  return (
    <div className="space-y-10">
      
      {/* Top Banner Alert */}
      {globalAlert && (
        <div 
          className={`fixed top-6 right-6 z-50 p-4 rounded-[20px] shadow-2xl border flex items-center gap-3 animate-in slide-in-from-top duration-300 max-w-md ${
            globalAlert.type === "success" 
              ? "bg-emerald-500 border-emerald-400 text-white" 
              : globalAlert.type === "error" 
              ? "bg-rose-500 border-rose-400 text-white" 
              : "bg-indigo-500 border-indigo-400 text-white"
          }`}
        >
          {globalAlert.type === "success" ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
          <div>
            <p className="font-bold text-sm leading-snug">{globalAlert.msg}</p>
          </div>
        </div>
      )}

      {/* Backend Status Alert */}
      {backendOffline && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-600 shrink-0" />
          <p className="text-xs font-semibold">
            Le backend Python est actuellement inaccessible. Assurez-vous que le serveur tourne localement sur le port 8000 pour accéder aux fonctionnalités IA, calendrier et PDF.
          </p>
        </div>
      )}

      {/* Header Panel */}
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-r from-slate-900 to-indigo-950 p-10 md:p-12 text-white border border-slate-800 shadow-[0_20px_60px_rgba(15,23,42,0.15)] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_120%,rgba(99,102,241,0.15),transparent_50%)] pointer-events-none" />
        <div className="space-y-3 z-10">
          <div className="flex items-center gap-3">
            <span className="px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
              <Cpu size={14} className="animate-spin duration-3000" /> Module Propulsé par l'IA
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent flex items-center gap-3">
            Gestion des Examens
            {isLocal && (
              <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-widest rounded-xl animate-pulse self-center">
                Données locales
              </span>
            )}
          </h1>
          <p className="text-slate-400 font-semibold max-w-xl text-sm md:text-base">
            Générez des questions intelligentes avec Gemini, configurez le calendrier sans conflits d'invigilation et validez les admissions par QR Code en temps réel.
          </p>
        </div>
        
        {loadingContext && (
          <div className="px-6 py-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-3 z-10">
            <RefreshCw className="size-5 text-indigo-400 animate-spin" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-300">Synchronisation...</span>
          </div>
        )}
      </div>

      {/* Core Tabs Navigation */}
      <div className="flex flex-wrap gap-2 p-2 bg-white/80 backdrop-blur-md rounded-[2rem] border border-slate-100 shadow-sm max-w-fit">
        <button
          onClick={() => setActiveTab("ai_generator")}
          className={`flex items-center gap-2.5 px-6 py-3.5 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
            activeTab === "ai_generator" 
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <Sparkles size={16} /> Générateur AI
        </button>
        <button
          onClick={() => setActiveTab("planning")}
          className={`flex items-center gap-2.5 px-6 py-3.5 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
            activeTab === "planning" 
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <Calendar size={16} /> Planification & AI Solver
        </button>
        <button
          onClick={() => setActiveTab("admissions")}
          className={`flex items-center gap-2.5 px-6 py-3.5 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
            activeTab === "admissions" 
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <UserCheck size={16} /> Admissions & QR
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={`flex items-center gap-2.5 px-6 py-3.5 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
            activeTab === "attendance" 
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <QrCode size={16} /> Présence & Scanner
        </button>
        <button
          onClick={() => setActiveTab("bank")}
          className={`flex items-center gap-2.5 px-6 py-3.5 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
            activeTab === "bank" 
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <BookOpen size={16} /> Banque de Questions
        </button>
        <button
          onClick={() => setActiveTab("marks")}
          className={`flex items-center gap-2.5 px-6 py-3.5 rounded-[1.5rem] font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
            activeTab === "marks" 
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <Award size={16} /> Notes & Résultats
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: AI GENERATOR PANEL */}
      {/* ---------------------------------------------------- */}
      {activeTab === "ai_generator" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Inputs Card */}
          <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm space-y-6">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">Paramètres de l'IA</h3>
              <p className="text-xs text-slate-400 font-semibold">Générez des questions sur-mesure instantanément</p>
            </div>
            
            <form onSubmit={handleGenerateAIQuestions} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Matière / Cours</label>
                <select
                  value={aiForm.subject_name}
                  onChange={(e) => setAiForm({ ...aiForm, subject_name: e.target.value })}
                  className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choisir la matière --</option>
                  {subjects.map(s => <option key={s.id} value={s.subjectName || s.name}>{s.subjectName || s.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Sujet du Chapitre</label>
                <input
                  type="text"
                  placeholder="Ex: Équations quadratiques, Révolution..."
                  value={aiForm.topic}
                  onChange={(e) => setAiForm({ ...aiForm, topic: e.target.value })}
                  className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Niveau de Difficulté</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Facile", "Moyen", "Difficile"].map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setAiForm({ ...aiForm, difficulty: lvl })}
                      className={`h-11 rounded-2xl font-bold text-xs uppercase transition-all ${
                        aiForm.difficulty === lvl 
                          ? "bg-slate-900 text-white shadow-md" 
                          : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Format des Questions</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "QCM", val: "QCM (Choix Multiples)" },
                    { label: "Directe", val: "Questions Directes" }
                  ].map(t => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => setAiForm({ ...aiForm, q_type: t.val })}
                      className={`h-11 rounded-2xl font-bold text-xs uppercase transition-all ${
                        aiForm.q_type === t.val 
                          ? "bg-slate-900 text-white shadow-md" 
                          : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nombre de questions ({aiForm.count})</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={aiForm.count}
                  onChange={(e) => setAiForm({ ...aiForm, count: parseInt(e.target.value) })}
                  className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={aiGenerating}
                className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
              >
                {aiGenerating ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Générer avec Gemini
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Results Card */}
          <div className="lg:col-span-2 space-y-6">
            
            {generatedQuestions.length > 0 && (
              <div className="flex justify-between items-center bg-indigo-50 border border-indigo-100/50 p-6 rounded-[2rem]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white grid place-items-center">
                    <Sparkles size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-base">Questions Générées avec Succès</h4>
                    <p className="text-xs font-semibold text-slate-500">Revoyez les questions et enregistrez-les dans la banque</p>
                  </div>
                </div>
                <button
                  onClick={handleSaveQuestionsToBank}
                  className="px-6 py-3 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-black uppercase tracking-wider transition-all"
                >
                  Valider & Sauvegarder
                </button>
              </div>
            )}

            <div className="space-y-6">
              {generatedQuestions.map((q, idx) => (
                <div key={idx} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start gap-4">
                    <span className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                      Question {idx + 1}
                    </span>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      aiForm.difficulty === "Difficile" 
                        ? "bg-rose-50 text-rose-600 border border-rose-100" 
                        : aiForm.difficulty === "Moyen" 
                        ? "bg-amber-50 text-amber-600 border border-amber-100" 
                        : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    }`}>
                      {aiForm.difficulty}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-800 leading-snug">{q.question}</h3>

                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {q.options.map((opt: string, oIdx: number) => (
                        <div 
                          key={oIdx} 
                          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center gap-3 transition-colors ${
                            opt === q.correct_answer 
                              ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                              : "bg-slate-50/50 border-slate-100 text-slate-600"
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                            opt === q.correct_answer 
                              ? "bg-emerald-500 text-white" 
                              : "bg-white border border-slate-200 text-slate-400"
                          }`}>
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span className="truncate">{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-5 rounded-2xl bg-indigo-50/30 border border-indigo-50 text-sm space-y-1">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Réponse Attendue / Corrigé</p>
                    <p className="font-bold text-indigo-900">{q.correct_answer}</p>
                  </div>
                </div>
              ))}

              {generatedQuestions.length === 0 && !aiGenerating && (
                <div className="py-24 text-center bg-white rounded-[3rem] border border-slate-100 shadow-sm max-w-xl mx-auto space-y-6">
                  <div className="p-6 bg-slate-50 rounded-full w-fit mx-auto shadow-inner text-indigo-500">
                    <Cpu size={56} className="animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-wider">Aucune Question Générée</h4>
                    <p className="text-slate-400 text-sm max-w-sm mx-auto font-medium">Configurez les paramètres à gauche pour générer instantanément des questions de haute qualité pédagogique.</p>
                  </div>
                </div>
              )}

              {aiGenerating && (
                <div className="py-24 text-center bg-white rounded-[3rem] border border-slate-100 shadow-sm max-w-xl mx-auto space-y-6">
                  <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin mx-auto" />
                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-wider">Modèle Gemini en action</h4>
                    <p className="text-slate-400 text-sm max-w-sm mx-auto font-medium">L'intelligence artificielle analyse le chapitre et structure un tableau de questions interactives...</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: PLANNING & CONSTRAINTS SOLVER */}
      {/* ---------------------------------------------------- */}
      {activeTab === "planning" && (
        <div className="space-y-8">
          
          {/* Sub Navigation */}
          <div className="flex gap-2 border-b border-slate-100 pb-3">
            {[
              { id: "campaigns", label: "1. Campagnes d'Examens", icon: <Award size={14} /> },
              { id: "rooms", label: "2. Gestion des Salles", icon: <MapPin size={14} /> },
              { id: "schedule", label: "3. Calendrier des Épreuves", icon: <Calendar size={14} /> },
              { id: "ai_solver", label: "4. Planificateur AI (Surveillants)", icon: <Cpu size={14} /> },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setPlanningSubTab(st.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black transition-all ${
                  planningSubTab === st.id 
                    ? "bg-slate-900 text-white" 
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                {st.icon} {st.label}
              </button>
            ))}
          </div>

          {/* Sub-Tab 1: Campaigns */}
          {planningSubTab === "campaigns" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Campaign Creator Form */}
              <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm space-y-6">
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900">Nouvelle Campagne</h3>
                  <p className="text-xs text-slate-400 font-semibold">Créez une session d'examens bloquante</p>
                </div>

                <form onSubmit={handleSaveCampaign} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nom de la Campagne</label>
                    <input
                      type="text"
                      placeholder="Ex: Examens Trimestriels Q3"
                      value={campForm.name}
                      onChange={(e) => setCampForm({ ...campForm, name: e.target.value })}
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Session Académique</label>
                    <select
                      value={campForm.session_id}
                      onChange={(e) => setCampForm({ ...campForm, session_id: e.target.value })}
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700"
                    >
                      <option value="">-- Choisir la session --</option>
                      {sessions.map(s => <option key={s.id} value={s.id}>{s.sessionName || s.name}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Date Début</label>
                      <input
                        type="text"
                        placeholder="DD/MM/YYYY"
                        value={campForm.start_date}
                        onChange={(e) => setCampForm({ ...campForm, start_date: e.target.value })}
                        className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Date Fin</label>
                      <input
                        type="text"
                        placeholder="DD/MM/YYYY"
                        value={campForm.end_date}
                        onChange={(e) => setCampForm({ ...campForm, end_date: e.target.value })}
                        className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={campSaving}
                    className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {campSaving ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
                    Créer la Campagne
                  </button>
                </form>
              </div>

              {/* Campaigns list */}
              <div className="lg:col-span-2 bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm space-y-6">
                <h3 className="text-xl font-black text-slate-900">Campagnes Actives</h3>
                
                <div className="space-y-4">
                  {campaigns.map((c) => (
                    <div key={c.id} className="p-6 rounded-[2rem] border border-slate-100 bg-slate-50/50 hover:bg-white transition-all flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 grid place-items-center">
                          <Award size={22} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-base">{c.name}</h4>
                          <p className="text-xs text-slate-400 font-semibold mt-0.5">
                            Du {c.start_date} au {c.end_date}
                          </p>
                        </div>
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        c.is_locked 
                          ? "bg-slate-100 text-slate-500" 
                          : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      }`}>
                        {c.is_locked ? "Verrouillé" : "Ouvert (Actif)"}
                      </span>
                    </div>
                  ))}

                  {campaigns.length === 0 && (
                    <div className="py-16 text-center text-slate-400 text-sm font-semibold">Aucune campagne configurée.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Rooms */}
          {planningSubTab === "rooms" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Room creator Form */}
              <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm space-y-6">
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900">Ajouter une Salle</h3>
                  <p className="text-xs text-slate-400 font-semibold">Configurez l'espace et la capacité maximale</p>
                </div>

                <form onSubmit={handleSaveRoom} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nom de la Salle</label>
                    <input
                      type="text"
                      placeholder="Ex: Bloc C - Salle 45"
                      value={roomForm.name}
                      onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Capacité d'élèves</label>
                    <input
                      type="number"
                      placeholder="30"
                      value={roomForm.capacity}
                      onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) })}
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={roomSaving}
                    className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {roomSaving ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
                    Enregistrer la salle
                  </button>
                </form>
              </div>

              {/* Rooms list */}
              <div className="lg:col-span-2 bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm space-y-6">
                <h3 className="text-xl font-black text-slate-900">Salles de Réception</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rooms.map((r) => (
                    <div key={r.id} className="p-6 rounded-[2rem] border border-slate-100 bg-slate-50/50 hover:bg-white transition-all flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 grid place-items-center">
                          <MapPin size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{r.name}</h4>
                          <p className="text-xs text-slate-400 font-semibold mt-0.5">
                            {r.description || "Salle principale pour examens"}
                          </p>
                        </div>
                      </div>
                      <div className="px-4 py-2 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-black">
                        {r.capacity} Élèves
                      </div>
                    </div>
                  ))}

                  {rooms.length === 0 && (
                    <div className="col-span-full py-16 text-center text-slate-400 text-sm font-semibold">Aucune salle configurée.</div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Sub-Tab 3: Timetable Calendar Scheduling */}
          {planningSubTab === "schedule" && (
            <div className="space-y-6">
              
              {/* Campaign Filter Bar */}
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider">Sélectionner la Campagne</h4>
                  <p className="text-xs text-slate-400 font-semibold">Toutes les épreuves et validations dépendent de cette sélection</p>
                </div>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="w-full md:w-80 h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Choisir une campagne --</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {selectedCampaignId ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Create Timetable entry Form */}
                  <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm space-y-6 h-fit">
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-slate-900">Planifier une Épreuve</h3>
                      <p className="text-xs text-slate-400 font-semibold">Contrôle automatique anti-chevauchement des élèves</p>
                    </div>

                    <form onSubmit={handleSaveTimetable} className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Classe</label>
                        <select
                          value={ttForm.class_id}
                          onChange={(e) => setTtForm({ ...ttForm, class_id: e.target.value })}
                          className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700"
                        >
                          <option value="">-- Choisir la classe --</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{getClassDisplayName(c)}</option>)}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Matière</label>
                        <select
                          value={ttForm.subject_id}
                          onChange={(e) => setTtForm({ ...ttForm, subject_id: e.target.value })}
                          className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700"
                        >
                          <option value="">-- Choisir la matière --</option>
                          {subjects.map(s => <option key={s.id} value={s.id}>{s.subjectName || s.name}</option>)}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Date de l'épreuve</label>
                        <input
                          type="text"
                          placeholder="DD/MM/YYYY"
                          value={ttForm.date}
                          onChange={(e) => setTtForm({ ...ttForm, date: e.target.value })}
                          className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Heure Début</label>
                          <input
                            type="text"
                            placeholder="08:30"
                            value={ttForm.start_time}
                            onChange={(e) => setTtForm({ ...ttForm, start_time: e.target.value })}
                            className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Heure Fin</label>
                          <input
                            type="text"
                            placeholder="10:30"
                            value={ttForm.end_time}
                            onChange={(e) => setTtForm({ ...ttForm, end_time: e.target.value })}
                            className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Note Maximale</label>
                        <input
                          type="number"
                          placeholder="20"
                          value={ttForm.max_marks}
                          onChange={(e) => setTtForm({ ...ttForm, max_marks: parseFloat(e.target.value) })}
                          className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={ttSaving}
                        className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        {ttSaving ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
                        Ajouter au Calendrier
                      </button>
                    </form>
                  </div>

                  {/* Programmed Timetable roster */}
                  <div className="lg:col-span-2 bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm space-y-6">
                    <h3 className="text-xl font-black text-slate-900">Épreuves Programmées</h3>
                    
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {timetables.map((t) => (
                        <div key={t.id} className="p-6 rounded-[2rem] border border-slate-100 bg-slate-50/50 hover:bg-white transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black uppercase">
                                {t.class_name}
                              </span>
                              <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase">
                                {t.subject_name}
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                              <Calendar size={14} className="text-slate-400" /> Le {t.exam_date}
                            </h4>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right space-y-0.5">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-end gap-1">
                                <Clock size={10} /> Plage Horaire
                              </p>
                              <p className="text-xs font-bold text-slate-700">{t.start_time} - {t.end_time}</p>
                            </div>
                            <div className="h-8 w-px bg-slate-200" />
                            <div className="text-right space-y-0.5">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Barème</p>
                              <p className="text-xs font-black text-slate-900">/{t.max_marks}</p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {timetables.length === 0 && (
                        <div className="py-24 text-center text-slate-400 font-semibold flex flex-col items-center justify-center gap-3">
                          <Calendar size={48} className="text-slate-200 animate-bounce" />
                          <span>Aucune épreuve planifiée pour cette campagne d'examen.</span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="py-24 text-center bg-white rounded-[3rem] border border-slate-100 shadow-sm max-w-xl mx-auto space-y-6">
                  <div className="p-6 bg-slate-50 rounded-full w-fit mx-auto shadow-inner text-indigo-500">
                    <Calendar size={56} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-wider">Sélectionnez une Campagne</h4>
                    <p className="text-slate-400 text-sm max-w-sm mx-auto font-medium">Pour planifier les épreuves des différentes filières, veuillez d'abord désigner la campagne académique correspondante.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 4: AI Constraints Invigilator Assigning Solver */}
          {planningSubTab === "ai_solver" && (
            <div className="space-y-6">
              
              {/* Campaign Filter Bar */}
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider">Sélectionner la Campagne</h4>
                  <p className="text-xs text-slate-400 font-semibold">L'algorithme de planification automatique affectera les enseignants à cette campagne uniquement</p>
                </div>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="w-full md:w-80 h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Choisir une campagne --</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {selectedCampaignId ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* AI Constraint Solver trigger card */}
                  <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[3rem] p-8 text-white border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[400px]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(99,102,241,0.2),transparent_60%)]" />
                    
                    <div className="space-y-6 z-10">
                      <span className="px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit">
                        <Cpu size={14} className="animate-pulse" /> Algorithme CSP (Constraint Satisfaction)
                      </span>
                      <div className="space-y-2">
                        <h3 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                          Planification Intelligente des Surveillants
                        </h3>
                        <p className="text-slate-300 font-semibold text-xs leading-relaxed max-w-md">
                          En un seul clic, l'algorithme intelligent parcourt l'intégralité des épreuves programmées, croise les salles d'examen et les enseignants actifs, vérifie les disponibilités horaires en évitant les conflits et répartit équitablement la charge de travail de chaque professeur.
                        </p>
                      </div>
                    </div>

                    <div className="pt-8 z-10">
                      <button
                        onClick={handleTriggerAISolver}
                        disabled={aiSolverLoading}
                        className="w-full md:w-auto px-8 h-14 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 disabled:bg-slate-800 disabled:text-slate-600"
                      >
                        {aiSolverLoading ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" />
                            Résolution en cours...
                          </>
                        ) : (
                          <>
                            <Cpu size={16} />
                            Lancer le Planificateur AI
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Manual Assignment Form */}
                  <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm space-y-6">
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-slate-900">Affectation Manuelle</h3>
                      <p className="text-xs text-slate-400 font-semibold">Attribuez une salle et un enseignant de force à une épreuve</p>
                    </div>

                    <form onSubmit={handleAssignInvigilator} className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Épreuve / Date</label>
                        <select
                          value={assignForm.timetable_id}
                          onChange={(e) => setAssignForm({ ...assignForm, timetable_id: e.target.value })}
                          className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700"
                        >
                          <option value="">-- Choisir l'épreuve --</option>
                          {timetables.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.class_name} | {t.subject_name} ({t.exam_date} - {t.start_time})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Salle assignée</label>
                          <select
                            value={assignForm.room_id}
                            onChange={(e) => setAssignForm({ ...assignForm, room_id: e.target.value })}
                            className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700"
                          >
                            <option value="">-- Choisir la salle --</option>
                            {rooms.map(r => <option key={r.id} value={r.id}>{r.name} (Cap: {r.capacity})</option>)}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Surveillant libre</label>
                          <select
                            value={assignForm.employee_id}
                            onChange={(e) => setAssignForm({ ...assignForm, employee_id: e.target.value })}
                            className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700"
                          >
                            <option value="">-- Choisir l'enseignant --</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={assignSaving}
                        className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        {assignSaving ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
                        Confirmer l'affectation
                      </button>
                    </form>
                  </div>

                </div>
              ) : (
                <div className="py-24 text-center bg-white rounded-[3rem] border border-slate-100 shadow-sm max-w-xl mx-auto space-y-6">
                  <div className="p-6 bg-slate-50 rounded-full w-fit mx-auto shadow-inner text-indigo-500">
                    <Cpu size={56} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-wider">Sélectionnez une Campagne</h4>
                    <p className="text-slate-400 text-sm max-w-sm mx-auto font-medium">Pour lancer la répartition automatique intelligente des surveillants, veuillez d'abord désigner la campagne académique correspondante.</p>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: ADMISSIONS & CANDIDATES VETTING */}
      {/* ---------------------------------------------------- */}
      {activeTab === "admissions" && (
        <div className="space-y-8">
          
          {/* Controls Bar */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Campagne d'Examens</label>
              <select
                value={admitCampaignId}
                onChange={(e) => setAdmitCampaignId(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- Choisir la campagne --</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Classe / Division</label>
              <select
                value={admitClassId}
                onChange={(e) => setAdmitClassId(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- Choisir la classe --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{getClassDisplayName(c)}</option>)}
              </select>
            </div>

            <button
              onClick={fetchCandidatesStatus}
              disabled={!admitCampaignId || !admitClassId || candidatesLoading}
              className="h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <Search size={16} />
              Rechercher les élèves
            </button>
          </div>

          {candidatesList.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Candidates list vetting table */}
              <div className="lg:col-span-2 bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h3 className="text-xl font-black text-slate-900">Registre d'Admission</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleProcessCandidates}
                      className="px-5 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                    >
                      <Cpu size={14} /> Vétér la Finance & Créer l'Anonymat
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {candidatesList.map((cand) => (
                    <div key={cand.id} className="py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${cand.cleared ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                        <div>
                          <p className="font-bold text-slate-800 text-sm leading-snug">{cand.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Place : {cand.roll_no}</p>
                        </div>
                      </div>

                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        cand.cleared 
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                          : "bg-rose-50 text-rose-600 border border-rose-100"
                      }`}>
                        {cand.financial_status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admit Cards Action block */}
              <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-between min-h-[400px]">
                <div className="space-y-6">
                  <div className="p-4 rounded-3xl bg-indigo-50 text-indigo-600 w-fit">
                    <QrCode size={36} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-900 leading-tight">Impression des Cartes d'Admission</h3>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                      Générez les convocations d'examen en un clic pour les étudiants autorisés. Chaque carte contient un Code QR crypté unique contenant la campagne, le candidat et son anonymat, facilitant le scanning d'entrée le jour J.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-6">
                  <button
                    onClick={handleGenerateAdmitCards}
                    disabled={generatingPDF}
                    className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {generatingPDF ? <RefreshCw className="animate-spin" size={16} /> : <Cpu size={16} />}
                    Calculer & Imprimer les cartes
                  </button>

                  {admitCardsLink && (
                    <a
                      href={admitCardsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-14 rounded-2xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <Download size={16} />
                      Télécharger le PDF
                    </a>
                  )}
                </div>
              </div>

            </div>
          )}

          {candidatesList.length === 0 && !candidatesLoading && (
            <div className="py-24 text-center bg-white rounded-[3rem] border border-slate-100 shadow-sm max-w-xl mx-auto space-y-6">
              <div className="p-6 bg-slate-50 rounded-full w-fit mx-auto shadow-inner text-indigo-500">
                <UserCheck size={56} />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-black text-slate-900 uppercase tracking-wider">Recherche de Candidats</h4>
                <p className="text-slate-400 text-sm max-w-sm mx-auto font-medium">Spécifiez la campagne académique et la classe ci-dessus pour inspecter les relevés de scolarité et imprimer les cartes d'entrée.</p>
              </div>
            </div>
          )}

          {candidatesLoading && (
            <div className="py-24 text-center bg-white rounded-[3rem] border border-slate-100 shadow-sm max-w-xl mx-auto space-y-6">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin mx-auto" />
              <div className="space-y-2">
                <h4 className="text-xl font-black text-slate-900 uppercase tracking-wider">Traitement Financier Avancé</h4>
                <p className="text-slate-400 text-sm max-w-sm mx-auto font-medium">Calcul des dettes des élèves, recoupement des frais mensuels et d'inscription en temps réel...</p>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 4: LIVE ATTENDANCE & QR SCANNER */}
      {/* ---------------------------------------------------- */}
      {activeTab === "attendance" && (
        <div className="space-y-8">
          
          {/* Controls bar */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Campagne</label>
              <select
                value={attCampaignId}
                onChange={(e) => setAttCampaignId(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700 focus:outline-none"
              >
                <option value="">-- Campagne --</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Classe</label>
              <select
                value={attClassId}
                onChange={(e) => setAttClassId(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700 focus:outline-none"
              >
                <option value="">-- Classe --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{getClassDisplayName(c)}</option>)}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Sélectionner l'Épreuve</label>
              <select
                value={selectedTimetableId}
                onChange={(e) => setSelectedTimetableId(e.target.value)}
                disabled={!attCampaignId || !attClassId}
                className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">-- Épreuve planifiée --</option>
                {Object.entries(classTimetables).map(([label, id]: any) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedTimetableId ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Live Attendance List */}
              <div className="lg:col-span-2 bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="space-y-0.5">
                    <h3 className="text-xl font-black text-slate-900">Feuille de Présence</h3>
                    <p className="text-xs text-slate-400 font-semibold">Feuille de présence interactive actualisée en direct</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {attendanceRoster.map((item) => (
                    <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-bold">Table : {item.roll_no}</span>
                          {item.incident !== "-" && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[8px] font-black uppercase flex items-center gap-1 border border-rose-100">
                              <AlertTriangle size={8} /> {item.incident}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {["Présent", "Absent", "Retard"].map((st) => (
                          <button
                            key={st}
                            onClick={() => handleMarkAttendance(item.id, st)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase transition-all ${
                              item.status === st 
                                ? st === "Présent" 
                                  ? "bg-emerald-500 text-white shadow-sm" 
                                  : st === "Absent" 
                                  ? "bg-rose-500 text-white shadow-sm" 
                                  : "bg-amber-500 text-white shadow-sm" 
                                : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                        <div className="h-6 w-px bg-slate-200 mx-1" />
                        <button
                          onClick={() => setIncidentDialog({ recordId: item.id, name: item.name })}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors border border-rose-100"
                          title="Signaler un incident"
                        >
                          <AlertTriangle size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {attendanceRoster.length === 0 && !rosterLoading && (
                    <div className="py-16 text-center text-slate-400 font-semibold">Aucun élève enregistré.</div>
                  )}

                  {rosterLoading && (
                    <div className="py-16 text-center text-slate-400 font-semibold flex items-center justify-center gap-2">
                      <RefreshCw className="animate-spin" size={16} />
                      <span>Chargement...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Simulated QR Code Scan Controller */}
              <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm space-y-6">
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900">Scan QR Code</h3>
                  <p className="text-xs text-slate-400 font-semibold">Simulez le bip de scan d'admission</p>
                </div>

                {/* Glow Scanner Simulation Screen */}
                <div className="w-full aspect-square rounded-[2rem] bg-slate-950 border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col items-center justify-between p-6">
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-500 shadow-[0_0_15px_rgba(99,102,241,1)] animate-bounce duration-3000 pointer-events-none" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08),transparent_70%)] pointer-events-none" />

                  <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1 z-10">
                    <Activity size={10} className="animate-pulse" /> Caméra d'entrée active
                  </span>

                  <div className="w-48 h-48 border-2 border-dashed border-indigo-500/40 rounded-2xl flex items-center justify-center relative z-10 bg-slate-900/40 backdrop-blur-sm">
                    <Scan className="size-20 text-indigo-400/60 animate-pulse" />
                  </div>

                  <p className="text-[10px] text-slate-500 font-bold z-10">Pointez la carte devant le capteur</p>
                </div>

                {/* Simulated Input field for testing */}
                <form onSubmit={handleSimulateQRScan} className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Code QR Scanné</label>
                    <input
                      type="text"
                      placeholder="Ex: CAMP:1|CAND:45|STU:102"
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-700"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={scanning || !qrInput}
                    className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {scanning ? <RefreshCw className="animate-spin" size={14} /> : <QrCode size={14} />}
                    Simuler le bip
                  </button>
                </form>
              </div>

            </div>
          ) : (
            <div className="py-24 text-center bg-white rounded-[3rem] border border-slate-100 shadow-sm max-w-xl mx-auto space-y-6">
              <div className="p-6 bg-slate-50 rounded-full w-fit mx-auto shadow-inner text-indigo-500">
                <QrCode size={56} />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-black text-slate-900 uppercase tracking-wider">Sélectionnez l'Épreuve d'Examen</h4>
                <p className="text-slate-400 text-sm max-w-sm mx-auto font-medium">Pour charger la feuille de présence et configurer le scanning QR code, veuillez d'abord désigner l'épreuve à évaluer.</p>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 5: AI QUESTION BANK */}
      {/* ---------------------------------------------------- */}
      {activeTab === "bank" && (
        <div className="space-y-8">
          
          {/* Controls Bar */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">Banque de Questions AI</h3>
              <p className="text-xs text-slate-400 font-semibold">Toutes les questions générées et enregistrées par l'IA</p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-fit">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap block">Filtrer par Matière</label>
              <select
                value={bankFilterSubjectId}
                onChange={(e) => setBankFilterSubjectId(e.target.value)}
                className="w-full md:w-64 h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-700 focus:outline-none"
              >
                <option value="">Toutes les matières</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.subjectName || s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Question cards list */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {bankQuestions.map((q) => (
              <div key={q.id} className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm space-y-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase">
                      {q.subject}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase">
                      {q.topic}
                    </span>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    q.difficulty === "Difficile" 
                      ? "bg-rose-50 text-rose-600 border border-rose-100" 
                      : q.difficulty === "Moyen" 
                      ? "bg-amber-50 text-amber-600 border border-amber-100" 
                      : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                  }`}>
                    {q.difficulty}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-800 leading-snug">{q.question}</h3>

                {q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((opt: string, oIdx: number) => (
                      <div 
                        key={oIdx} 
                        className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-3 transition-colors ${
                          opt === q.answer 
                            ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                            : "bg-slate-50/50 border-slate-100 text-slate-600"
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black ${
                          opt === q.answer 
                            ? "bg-emerald-500 text-white" 
                            : "bg-white border border-slate-200 text-slate-400"
                        }`}>
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span className="truncate">{opt}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-indigo-50/30 border border-indigo-50 text-xs space-y-1">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Réponse Type</p>
                  <p className="font-bold text-indigo-900">{q.answer}</p>
                </div>
              </div>
            ))}

            {bankQuestions.length === 0 && !bankLoading && (
              <div className="col-span-full py-32 text-center bg-white rounded-[4rem] border border-slate-100 shadow-sm max-w-xl mx-auto space-y-6">
                <div className="p-6 bg-slate-50 rounded-full w-fit mx-auto shadow-inner text-indigo-500">
                  <BookOpen size={56} />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-black text-slate-900 uppercase tracking-wider">Aucune Question Enregistrée</h4>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto font-medium">Configurez le Générateur AI pour insérer de magnifiques questions directement dans la banque centrale.</p>
                </div>
              </div>
            )}

            {bankLoading && (
              <div className="col-span-full py-32 text-center bg-white rounded-[4rem] border border-slate-100 shadow-sm max-w-xl mx-auto space-y-6">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin mx-auto" />
                <div className="space-y-2">
                  <h4 className="text-xl font-black text-slate-900 uppercase tracking-wider">Synchro de la banque</h4>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto font-medium">Récupération des questions de la base de données...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 6: NOTES & RESULTATS (MARKS ENTRY) PANEL */}
      {/* ---------------------------------------------------- */}
      {activeTab === "marks" && (
        <div className="space-y-8">
          <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-wide">Saisie & Importation des Notes</h2>
                <p className="text-slate-400 text-sm font-medium">Saisissez les notes d'examens manuellement ou via notre système d'analyse intelligente par IA.</p>
              </div>
              
              {/* De-anonymize Toggle */}
              {marksList.length > 0 && (
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-600 cursor-pointer flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-full select-none hover:bg-slate-100 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={deAnonymize} 
                      onChange={(e) => setDeAnonymize(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mr-2" 
                    />
                    🔓 Lever l'Anonymat (Voir les Noms)
                  </label>
                </div>
              )}
            </div>

            {/* Filters Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Campagne d'Examens</label>
                <select
                  value={marksCampaignId}
                  onChange={(e) => setMarksCampaignId(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Choisir une campagne...</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Classe</label>
                <select
                  value={marksClassId}
                  onChange={(e) => setMarksClassId(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Choisir une classe...</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{getClassDisplayName(c)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Épreuve / Examen</label>
                <select
                  value={selectedMarksTimetableId}
                  onChange={(e) => setSelectedMarksTimetableId(e.target.value)}
                  disabled={!marksCampaignId || !marksClassId}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Choisir une épreuve...</option>
                  {marksTimetables.map(t => (
                    <option key={t.id} value={t.id}>{`${t.class_name} - ${t.subject_name} (${t.exam_date})`}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Marks roster panel */}
          {selectedMarksTimetableId && (
            <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-50 pb-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide">Candidats & Correction</h3>
                  <p className="text-slate-400 text-xs font-semibold">Toutes les modifications sont locales tant que vous ne sauvegardez pas.</p>
                </div>
                
                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSmartImportModal(true)}
                    className="h-12 px-5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2"
                  >
                    <Sparkles size={16} /> Importation Intelligente (IA)
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMarks}
                    disabled={marksSaving || marksList.length === 0}
                    className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
                  >
                    {marksSaving ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                    Enregistrer les Notes
                  </button>
                </div>
              </div>

              {/* Roster list */}
              {marksLoading ? (
                <div className="py-24 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin mx-auto" />
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Chargement des copies...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Code Anonymat</th>
                        <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Présence</th>
                        <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-40">Note / 20</th>
                        {deAnonymize && (
                          <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-6">Nom de l'élève</th>
                        )}
                        <th className="py-4 text-[10px] font-black text-slate-400 tracking-widest w-24"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {marksList.map((item) => {
                        const isAbsent = item.status === "Absent";
                        
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            {/* Anonymity Code */}
                            <td className="py-4 font-mono font-bold text-xs text-indigo-600">
                              <span className="bg-indigo-50/50 border border-indigo-100/50 px-3 py-1.5 rounded-lg">
                                🕵️ {item.anonymity_code}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="py-4">
                              <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                item.status === "Présent" 
                                  ? "bg-emerald-50 text-emerald-600" 
                                  : item.status === "Retard" 
                                  ? "bg-amber-50 text-amber-600" 
                                  : "bg-rose-50 text-rose-600"
                              }`}>
                                {item.status}
                              </span>
                            </td>

                            {/* Marks Input */}
                            <td className="py-4 text-center">
                              <div className="inline-flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="20"
                                  step="0.25"
                                  disabled={isAbsent}
                                  value={item.marks_obtained !== null && item.marks_obtained !== undefined ? item.marks_obtained : ""}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? null : parseFloat(e.target.value);
                                    setMarksList(prev => prev.map(m => m.id === item.id ? { ...m, marks_obtained: val } : m));
                                  }}
                                  className="w-20 h-10 border border-slate-200 bg-slate-50 rounded-lg text-center font-bold text-xs text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <span className="text-xs font-bold text-slate-400">/ 20</span>
                              </div>
                            </td>

                            {/* Student name if de-anonymized */}
                            {deAnonymize && (
                              <td className="py-4 pl-6 text-xs font-bold text-slate-700">
                                👤 {item.name}
                              </td>
                            )}

                            {/* Incidents Warning */}
                            <td className="py-4 text-right">
                              {item.incident !== "-" && (
                                <span 
                                  title={item.report}
                                  className="px-2.5 py-1 rounded bg-rose-100 text-rose-600 text-[9px] font-black uppercase inline-flex items-center gap-1 cursor-help"
                                >
                                  ⚠️ {item.incident}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {marksList.length === 0 && (
                        <tr>
                          <td colSpan={deAnonymize ? 5 : 4} className="py-12 text-center text-slate-400 text-xs font-semibold">
                            Aucun candidat n'a encore été inscrit ou traité pour cette épreuve.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Smart Import Modal */}
          {showSmartImportModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-8 max-w-2xl w-full space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center gap-3 text-indigo-600">
                  <Sparkles size={28} />
                  <div>
                    <h4 className="font-black text-slate-900 text-lg leading-snug">Importation Intelligente par IA</h4>
                    <p className="text-xs text-slate-400 font-semibold">Gemini extrait automatiquement les codes et notes depuis n'importe quel texte.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Texte brut à analyser (Notes rédigées, tableau Excel copié...)</label>
                    <textarea
                      placeholder="Exemple :
C2-S45-12-XYZ : 14.5
C2-S46-12-ABC = 18
L'élève C2-S47 a obtenu 11.25..."
                      value={smartImportText}
                      onChange={(e) => setSmartImportText(e.target.value)}
                      rows={6}
                      className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Extract action */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAIParseMarks}
                      disabled={smartImportLoading || !smartImportText.trim()}
                      className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {smartImportLoading ? <RefreshCw className="animate-spin" size={14} /> : <Cpu size={14} />}
                      Extraire avec l'IA
                    </button>
                  </div>

                  {/* Parsed results preview table */}
                  {parsedPreviewList.length > 0 && (
                    <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                      <div className="px-4 py-3 bg-slate-100/50 border-b border-slate-100 flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Résultats détectés ({parsedPreviewList.length})</span>
                      </div>
                      
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase bg-white">
                              <th className="px-4 py-2">Code d'Anonymat</th>
                              <th className="px-4 py-2 text-center w-28">Note</th>
                              <th className="px-4 py-2 text-right">Statut Base</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                            {parsedPreviewList.map((parsed, pIdx) => {
                              // Check if this anonymity code matches any candidate loaded in roster
                              const match = marksList.find(m => m.anonymity_code === parsed.anonymity_code);
                              
                              return (
                                <tr key={pIdx} className="hover:bg-white transition-colors">
                                  <td className="px-4 py-2.5 font-mono text-indigo-600">{parsed.anonymity_code}</td>
                                  <td className="px-4 py-2.5 text-center font-bold">{parsed.mark} / 20</td>
                                  <td className="px-4 py-2.5 text-right">
                                    {match ? (
                                      <span className="text-emerald-500 text-[10px] uppercase font-black">✔️ Trouvé ({match.name.substring(0, 12)}...)</span>
                                    ) : (
                                      <span className="text-rose-500 text-[10px] uppercase font-black">⚠️ Inexistant dans la classe</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSmartImportText("");
                      setParsedPreviewList([]);
                      setShowSmartImportModal(false);
                    }}
                    className="flex-1 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider transition-all"
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyParsedMarks}
                    disabled={parsedPreviewList.length === 0}
                    className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <CheckCircle2 size={14} />
                    Appliquer au tableau
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Incident reporting modal dialog */}
      {incidentDialog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-8 max-w-md w-full space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle size={28} />
              <div>
                <h4 className="font-black text-slate-900 text-lg leading-snug">Signaler un Incident</h4>
                <p className="text-xs text-slate-400 font-semibold">Signalement d'incident pour {incidentDialog.name}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Type d'Incident</label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-700"
                >
                  <option value="Fraude (Triche)">Fraude (Triche)</option>
                  <option value="Exclusion">Exclusion de la salle</option>
                  <option value="Retard Majeur">Retard Majeur (&gt; 30 min)</option>
                  <option value="Indiscipline">Indiscipline / Comportement</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Rapport descriptif</label>
                <textarea
                  placeholder="Décrivez précisément les faits..."
                  value={incidentReport}
                  onChange={(e) => setIncidentReport(e.target.value)}
                  rows={4}
                  className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIncidentDialog(null)}
                className="flex-1 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleReportIncident}
                disabled={reportingIncident || !incidentReport}
                className="flex-1 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-100 hover:shadow-rose-200 transition-all flex items-center justify-center gap-1.5 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {reportingIncident ? <RefreshCw className="animate-spin" size={14} /> : <AlertTriangle size={14} />}
                Valider l'Alerte
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
