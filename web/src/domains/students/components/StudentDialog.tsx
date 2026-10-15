"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStudent, updateStudent, getStudentCategories, getStudentById } from "@/domains/students/actions/students.actions";
import { createNotification } from "@/domains/messaging/actions/notifications.actions";
import { StudentFormData } from "../validators/student.schema";
import { getClasses, getSections, getEducationalLevels, getSessions } from "@/domains/academics/actions/academics.actions";
import { Camera, Upload, Zap, X, Check, User, ChevronLeft, Fingerprint, Lock, Key, Eye, EyeOff, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOfflineMutation } from "@/hooks/use-offline-mutation";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { resolveOnlineOrCached } from "@/infrastructure/local-db/references";

function formatDateForInput(dateVal: any): string {
  if (!dateVal) return "";
  const s = String(dateVal).trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.includes("T")) return s.split("T")[0];
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }
  } catch {}
  return "";
}

function normalizeGender(val?: string | null): "Garçon" | "Fille" {
  if (!val) return "Garçon";
  const low = val.toLowerCase().trim();
  if (low === "fille" || low === "feminin" || low === "féminin" || low === "f") return "Fille";
  return "Garçon";
}

interface StudentDialogProps {
  mode?: "add" | "edit";
  initialData?: any;
  trigger?: React.ReactNode;
  open?: boolean;
  onClose?: () => void;
  onSuccess?: (student: any) => void;
}

export default function StudentDialog({ mode = "add", initialData, trigger, open: controlledOpen, onClose, onSuccess }: StudentDialogProps) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const { mutate } = useOfflineMutation<StudentFormData & { id?: number; originalData?: any }>();
  const [open, setOpen] = useState(controlledOpen ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [step, setStep] = useState(1);

  // Complete student record state (ensures full hydration upon edit)
  const [currentData, setCurrentData] = useState<any>(initialData);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (controlledOpen !== undefined) {
      setOpen(controlledOpen);
    }
  }, [controlledOpen]);

  const close = useCallback(() => { 
    setOpen(false); 
    setStep(1); 
    setIsDataLoaded(false);
    if (onClose) onClose();
    if (mode === "add") {
      setFraisMensuels("");
      setFraisInscription("");
      setFraisCogesCard("");
      setFraisTransportInternat("");
      setAncienSoldeValue("");
      setStatutValue("Actif");
    }
  }, [mode, onClose]);

  // ── Cascading select & Academic Details state ──────────────────────────────
  const [selectedSession, setSelectedSession] = useState(initialData?.session || "");
  const [selectedLevel,   setSelectedLevel]   = useState(initialData?.educationalLevel || "");
  const [selectedClasse,  setSelectedClasse]  = useState(initialData?.classe  || "");
  const [selectedSection, setSelectedSection] = useState(initialData?.section || "");
  const [selectedCategorie, setSelectedCategorie] = useState(initialData?.categorie || "Général");
  const [behaviorScoreValue, setBehaviorScoreValue] = useState(initialData?.behaviorScore ?? 18);

  // ── Financial planning state ──────────────────────────────────────────────
  const [fraisMensuels, setFraisMensuels] = useState(initialData?.fraisMensuels ?? "");
  const [fraisInscription, setFraisInscription] = useState(initialData?.fraisInscription ?? "");
  const [fraisCogesCard, setFraisCogesCard] = useState(initialData?.fraisCogesCard ?? "");
  const [fraisTransportInternat, setFraisTransportInternat] = useState(initialData?.fraisTransportInternat ?? "");
  const [ancienSoldeValue, setAncienSoldeValue] = useState(initialData?.ancienSolde ?? "");
  const [statutValue, setStatutValue] = useState(initialData?.statut ?? "Actif");
  // ── Biometric & Security state ─────────────────────────────────────────────
  const [activationPin, setActivationPin] = useState<string>(initialData?.activationPin || "");
  const [fingerprintHash, setFingerprintHash] = useState<string>(initialData?.fingerprintHash || "");
  const [isScanningFingerprint, setIsScanningFingerprint] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const generateRandomPin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setActivationPin(pin);
  };

  const scanFingerprint = () => {
    setIsScanningFingerprint(true);
    setTimeout(() => {
      const generatedHash = `FP-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setFingerprintHash(generatedHash);
      setIsScanningFingerprint(false);
    }, 1000);
  };

  // ── Raw data from DB ──────────────────────────────────────────────────────
  const [sessionsList,    setSessionsList]    = useState<any[]>([]);
  const [levelsList,      setLevelsList]      = useState<any[]>([]);
  const [allClassesList,  setAllClassesList]  = useState<any[]>([]);
  const [allSectionsList, setAllSectionsList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);

  // ── Derived (filtered) lists ──────────────────────────────────────────────
  const [classesList,  setClassesList]  = useState<any[]>([]);
  const [sectionsList, setSectionsList] = useState<any[]>([]);

  const populateFromStudent = useCallback((data: any) => {
    if (!data) return;
    setSelectedSession(data.session || "");
    setSelectedLevel(data.educationalLevel || "");
    setSelectedClasse(data.classe || "");
    setSelectedSection(data.section || "");
    setSelectedCategorie(data.categorie || "Général");
    setBehaviorScoreValue(data.behaviorScore ?? 18);

    setFraisMensuels(data.fraisMensuels ?? "");
    setFraisInscription(data.fraisInscription ?? "");
    setFraisCogesCard(data.fraisCogesCard ?? "");
    setFraisTransportInternat(data.fraisTransportInternat ?? "");
    setAncienSoldeValue(data.ancienSolde ?? "");
    setStatutValue(data.statut ?? "Actif");
    setActivationPin(data.activationPin || "");
    setFingerprintHash(data.fingerprintHash || "");

    if (data.photoPath?.startsWith("local:photo:")) {
      import("@/infrastructure/local-db/dexie").then(({ localDb }) => {
        localDb.studentPhotos.get(data.numAdmission).then(p => {
          if (p?.photoData) setPreview(p.photoData);
        });
      });
    } else {
      setPreview(data.photoPath || null);
    }
  }, []);

  // ── Sync states whenever the dialog opens or initialData changes ───────────
  useEffect(() => {
    if (!open) {
      setIsDataLoaded(false);
      return;
    }

    setCurrentData(initialData);
    populateFromStudent(initialData);

    // If in edit mode, fetch the 100% full, fresh student record by ID
    if (mode === "edit" && initialData?.id) {
      let isSubscribed = true;
      getStudentById(initialData.id)
        .then(async (res) => {
          if (!isSubscribed) return;
          if (res?.success && res?.data) {
            setCurrentData(res.data);
            populateFromStudent(res.data);
            setIsDataLoaded(true);
          } else {
            // Server returned error (e.g. offline or school filter mismatch) -> fallback to local DB
            try {
              const { localDb } = await import("@/infrastructure/local-db/dexie");
              const localStudent = await localDb.students.get(initialData.id);
              if (isSubscribed && localStudent) {
                setCurrentData(localStudent);
                populateFromStudent(localStudent);
                setIsDataLoaded(true);
              }
            } catch {}
          }
        })
        .catch(async (err) => {
          console.warn("[StudentDialog] Error fetching full student, falling back to local DB:", err);
          try {
            const { localDb } = await import("@/infrastructure/local-db/dexie");
            const localStudent = await localDb.students.get(initialData.id);
            if (isSubscribed && localStudent) {
              setCurrentData(localStudent);
              populateFromStudent(localStudent);
              setIsDataLoaded(true);
            }
          } catch {}
        });

      return () => {
        isSubscribed = false;
      };
    }
  }, [open, initialData, mode, populateFromStudent]);


  // ── Load everything once when the dialog opens ────────────────────────────
  useEffect(() => {
    if (!open) return;

    // 1. Sessions from school_sessions table
    resolveOnlineOrCached("session", () => getSessions(), "sessionName").then(setSessionsList);

    // 2. Levels — ignoreActiveFilter=true → ALL levels from Paramètres → Académique
    getEducationalLevels(true).then(res => {
      if (res.success && res.data) {
        setLevelsList(Array.isArray(res.data) ? res.data : []);
      }
    });

    // 3. All classes (with optional section.educationalLevel field)
    resolveOnlineOrCached("class", () => getClasses(true), "className").then(raw => {
      setAllClassesList(raw);
      setClassesList(raw); // show all before a level is chosen
    });

    // 4. All sections
    resolveOnlineOrCached("section", () => getSections(true), "sectionName").then(raw => {
      setAllSectionsList(raw);
      setSectionsList(raw);
    });

    // 5. Student categories from existing students, with offline cache
    resolveOnlineOrCached("studentCategory", () => getStudentCategories(), "label").then(setCategoriesList);
  }, [open]);

  // ── Infer level and section from initialData.classe if missing ──────────────
  useEffect(() => {
    if (!allClassesList.length) return;
    const targetClasse = initialData?.classe || selectedClasse;
    if (targetClasse) {
      const clsObj = allClassesList.find(c => c.className === targetClasse || c.id === initialData?.classId);
      if (clsObj) {
        const inferredLevel = clsObj.section?.educationalLevel || clsObj.educationalLevel;
        if (inferredLevel && !selectedLevel) {
          setSelectedLevel(inferredLevel);
        }
        if (clsObj.section?.sectionName && !selectedSection) {
          setSelectedSection(clsObj.section.sectionName);
        }
      }
    }
  }, [allClassesList, initialData, selectedClasse, selectedLevel, selectedSection]);

  // ── Cascade filter when level changes → update classes & sections ─────────
  useEffect(() => {
    if (!selectedLevel) {
      // No level → show full lists
      setClassesList(allClassesList);
      setSectionsList(allSectionsList);
      return;
    }

    // Filter classes by educational level (support both joined and flat structures)
    const fc = allClassesList.filter(c =>
      c.section?.educationalLevel === selectedLevel ||
      c.educationalLevel          === selectedLevel
    );
    setClassesList(fc.length > 0 ? fc : allClassesList);

    // Filter sections
    const fs = allSectionsList.filter(s => s.educationalLevel === selectedLevel);
    setSectionsList(fs.length > 0 ? fs : allSectionsList);
  }, [selectedLevel, allClassesList, allSectionsList]);

  // Sync photo preview when initialData changes
  useEffect(() => {
    if (initialData?.photoPath?.startsWith("local:photo:")) {
      import("@/infrastructure/local-db/dexie").then(({ localDb }) => {
        localDb.studentPhotos.get(initialData.numAdmission).then(p => {
          if (p?.photoData) setPreview(p.photoData);
        });
      });
    } else {
      setPreview(initialData?.photoPath || null);
    }
  }, [initialData]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, close]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Photo states
  const [preview, setPreview] = useState<string | null>(initialData?.photoPath || null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const startCamera = async () => {
    setIsCameraOpen(true);
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setIsCameraOpen(false);
      if (err.name === "NotAllowedError") {
        setCameraError("Accès caméra refusé. Veuillez autoriser la caméra dans votre navigateur.");
      } else {
        setCameraError("Impossible d'accéder à la caméra. Vérifiez qu'elle n'est pas utilisée par une autre application.");
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setPreview(dataUrl);
      stopCamera();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { compressImage } = await import("@/shared/utils/image-compression");
        const compressed = await compressImage(file, {
          maxWidth: 400,
          maxHeight: 400,
          quality: 0.82,
          format: "image/webp",
        });
        setPreview(compressed.dataUrl);
      } catch (err) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  async function handleFinalSubmit() {
    if (!formRef.current) return;
    setLoading(true);
    setError("");

    const form = new FormData(formRef.current);
    const numAdmission = form.get("numAdmission") as string;
    
    let photoPath = preview || "";

    // If online, upload the new photo to Supabase. Offline mode keeps the data URL locally.
    if (isOnline && preview && preview.startsWith("data:image")) {
      try {
        const { uploadStudentPhoto } = await import("@/shared/utils/supabase/storage");
        const fileName = `${numAdmission}_${Date.now()}.jpg`;
        const uploadedUrl = await uploadStudentPhoto(preview, fileName);
        if (uploadedUrl) {
          photoPath = uploadedUrl;
        }
      } catch (err: any) {
        console.warn("Non-fatal photo upload error, keeping local image:", err);
        // Student creation will still succeed using local image preview
      }
    }

    const data: StudentFormData = {
      numAdmission,
      nomEtudiant: form.get("nomEtudiant") as string,
      nomArabe: form.get("nomArabe") as string,
      sexe: form.get("sexe") as "Garçon" | "Fille",
      religion: form.get("religion") as string,
      dateNaissance: form.get("dateNaissance") as string,
      lieuNaissance: form.get("lieuNaissance") as string,
      cnic: form.get("cnic") as string,
      groupeSanguin: form.get("groupeSanguin") as string,

      session: form.get("session") as string,
      educationalLevel: form.get("educationalLevel") as string,
      classe: form.get("classe") as string,
      section: form.get("section") as string,
      categorie: form.get("categorie") as string,

      nomPere: form.get("nomPere") as string,
      cnicPere: form.get("cnicPere") as string,
      mobile: form.get("mobile") as string,
      whatsapp: form.get("whatsapp") as string,

      fraisMensuels: Number(form.get("fraisMensuels")) || 0,
      ancienSolde: Number(form.get("ancienSolde")) || 0,
      fraisInscription: Number(form.get("fraisInscription")) || 0,
      fraisCogesCard: Number(form.get("fraisCogesCard")) || 0,
      fraisTransportInternat: Number(form.get("fraisTransportInternat")) || 0,

      statut: (form.get("statut") as string) || "Actif",
      behaviorScore: Number(form.get("behaviorScore")) || 0,
      photoPath: photoPath,
      activationPin: (form.get("activationPin") as string) || activationPin || null,
      fingerprintHash: (form.get("fingerprintHash") as string) || fingerprintHash || null,
    };

    let payload: StudentFormData & { id?: number; originalData?: any } = 
      mode === "edit" && (currentData?.id || initialData?.id)
        ? { ...data, id: currentData?.id || initialData?.id }
        : data;

    if (!isOnline && preview && preview.startsWith("data:image")) {
      try {
        const { localDb } = await import("@/infrastructure/local-db/dexie");
        await localDb.studentPhotos.put({
          numAdmission,
          photoData: preview,
          updatedAt: Date.now()
        });
        payload = {
          ...payload,
          photoPath: `local:photo:${numAdmission}`
        };
      } catch (e) {
        console.warn("Failed to store student photo locally:", e);
      }
    }

    if (mode === "edit") {
      payload = {
        ...payload,
        originalData: currentData || initialData
      };
    }

    const result = await mutate(payload, {
      targetTable: "students",
      onlineAction: async (studentPayload) => {
        const { id, originalData, ...studentData } = studentPayload;
        return id ? updateStudent(id, studentData, originalData) : createStudent(studentData);
      },
    });

    setLoading(false);

    if (result.success) {
      // Send Smart Notification
      try {
        await createNotification({
          title: mode === "edit" ? "Dossier Étudiant Mis à Jour" : "Nouvelle Inscription",
          content: mode === "edit" 
            ? `Le dossier de ${data.nomEtudiant} (${data.numAdmission}) a été modifié avec succès.`
            : `L'élève ${data.nomEtudiant} a été inscrit avec succès en classe de ${data.classe}.`,
          type: "success",
          category: "system"
        });
      } catch (e) {
        console.warn("Failed to send notification:", e);
      }

      setOpen(false);
      setStep(1);
      onSuccess?.(payload);
      router.refresh(); // Ensure the page data is re-fetched
    } else if (result.error) {
      setError(result.error);
    }
  }

  const nextStep = () => setStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const STEPS = [
    { n: 1, t: "Profil Élève",    d: "Identité & Photo",  color: "bg-indigo-500",  ring: "ring-indigo-300" },
    { n: 2, t: "Dossier Famille", d: "Parents & Contact", color: "bg-violet-500",  ring: "ring-violet-300" },
    { n: 3, t: "Plan Financier",  d: "Scolarité & Bourse",color: "bg-emerald-500", ring: "ring-emerald-300" },
  ];

  const modal = open ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={close} aria-hidden="true" />

      {/* Panel */}
      <div
        className="relative w-full max-w-5xl bg-white dark:bg-[#0c0e17] rounded-[2.5rem] shadow-2xl shadow-indigo-950/40 border border-slate-200/80 dark:border-slate-800/80 flex overflow-hidden animate-in zoom-in-95 fade-in duration-200"
        style={{ height: "90vh", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <div className="w-64 bg-gradient-to-b from-slate-950 via-[#0f121d] to-slate-950 border-r border-slate-800/60 flex flex-col justify-between shrink-0 hidden md:flex">
          {/* Top branding */}
          <div className="p-8 space-y-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-3">
                <Sparkles size={11} className="text-amber-400" />
                Plateforme GS
              </div>
              <h2 className="text-white text-3xl font-black tracking-tight leading-none">
                GS PRO<br /><span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300 bg-clip-text text-transparent not-italic font-black text-2xl tracking-widest">STUDENT</span>
              </h2>
              <div className="h-1 w-12 bg-gradient-to-r from-indigo-500 to-violet-500 mt-4 rounded-full" />
            </div>

            {/* Step navigation */}
            <nav className="space-y-4">
              {STEPS.map((s) => {
                const done = step > s.n;
                const active = step === s.n;
                return (
                  <div key={s.n} className={`flex items-center gap-4 transition-all duration-300 ${active ? "translate-x-2" : "opacity-50 hover:opacity-80"}`}>
                    <div className={`h-11 w-11 rounded-2xl flex items-center justify-center font-black text-sm transition-all
                      ${active ? `${s.color} text-white shadow-xl shadow-indigo-500/30 ${s.ring} ring-4 ring-offset-slate-950 ring-offset-2 scale-105`
                        : done  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                        : "bg-slate-800/80 text-slate-400 border border-slate-700/50"}`}>
                      {done ? <Check size={18} strokeWidth={3} /> : s.n}
                    </div>
                    <div>
                      <p className={`font-black text-sm leading-tight transition-colors ${active ? "text-white" : "text-slate-300"}`}>{s.t}</p>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">{s.d}</p>
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Bottom status */}
          <div className="p-6">
            <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800/80 shadow-inner">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
                <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Système Actif</p>
              </div>
              <p className="text-[11px] text-slate-400 font-bold">Admin v2.4.0 • Sécurisé</p>
            </div>
          </div>
        </div>

        {/* ── Main content ────────────────────────────────────────────── */}
        <div className="flex-1 grid grid-rows-[auto_1fr_auto] overflow-hidden min-w-0 bg-slate-50/60 dark:bg-[#0c0e17]">

          {/* Header */}
          <div className="shrink-0 bg-white dark:bg-[#111422] border-b border-slate-200/80 dark:border-slate-800/80 shadow-sm">
            {/* Coloured progress bar */}
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 transition-all duration-500 shadow-sm shadow-indigo-500/30"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
            <div className="px-8 pt-5 pb-5 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                  <p className="text-indigo-600 dark:text-indigo-400 font-black text-[11px] uppercase tracking-[0.25em]">Administration Scolaire</p>
                </div>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                    {mode === "edit" ? "MODIFICATION DU DOSSIER" : "NOUVELLE INSCRIPTION"}
                  </h2>
                  <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 font-black uppercase tracking-widest text-[11px]">
                    Dossier Élève
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Étape</span>
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{step}</span>
                  <span className="text-sm font-bold text-slate-400">/ 3</span>
                </div>
                {/* Close X */}
                <button
                  type="button"
                  onClick={close}
                  aria-label="Fermer"
                  className="w-10 h-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all shadow-sm"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

            {/* Scrollable Form Body */}
            <div className="overflow-y-auto custom-scrollbar px-8 py-8 min-h-0 bg-slate-50/50 dark:bg-[#0c0e17]">
              <form 
                key={`${mode}-${currentData?.id || 'new'}-${isDataLoaded ? 'loaded' : 'initial'}-${open}`}
                ref={formRef} 
                className="space-y-8 pb-8"
              >
                {error && (
                  <div className="bg-rose-50 dark:bg-rose-950/40 border-l-4 border-rose-500 text-rose-700 dark:text-rose-300 px-6 py-4 rounded-2xl text-sm font-bold animate-shake flex items-center gap-4 shadow-sm border border-rose-200 dark:border-rose-900/50">
                    <div className="h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-300">
                      <X size={16} />
                    </div>
                    {error}
                  </div>
                )}

                <div className={step !== 1 ? "hidden" : "space-y-8 animate-in fade-in slide-in-from-right-8 duration-500"}>
                    <section className="space-y-6">
                       <div className="flex items-center gap-2 pb-2 border-b border-indigo-100 dark:border-indigo-950/60">
                         <span className="w-1.5 h-4 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                         <h4 className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                           Informations d'identité
                         </h4>
                       </div>
                       <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">N° Admission / Matricule *</Label>
                            <Input name="numAdmission" defaultValue={currentData?.numAdmission || ""} required placeholder="Ex: AD-2024-001" className="h-14 rounded-2xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 font-black text-lg text-slate-800 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Nom complet de l'élève *</Label>
                            <Input name="nomEtudiant" defaultValue={currentData?.nomEtudiant || ""} required placeholder="Jean Dupont" className="h-14 rounded-2xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 font-black text-lg text-slate-800 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1 font-arabic">الاسم الكامل بالعربية</Label>
                            <Input name="nomArabe" defaultValue={currentData?.nomArabe || ""} dir="rtl" placeholder="اسم الطالب هنا" className="h-14 rounded-2xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 font-arabic text-xl text-slate-800 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Sexe de l'enfant *</Label>
                            <select name="sexe" defaultValue={normalizeGender(currentData?.sexe)} required className="w-full h-14 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 px-6 font-black text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all cursor-pointer">
                              <option value="Garçon">👦 Garçon</option>
                              <option value="Fille">👧 Fille</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-6">
                           <div className="space-y-2">
                              <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Date de Naissance</Label>
                              <Input name="dateNaissance" type="date" defaultValue={formatDateForInput(currentData?.dateNaissance)} className="h-12 rounded-2xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 font-bold text-slate-800 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all" />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Lieu de Naissance</Label>
                              <Input name="lieuNaissance" defaultValue={currentData?.lieuNaissance || ""} placeholder="Ville, Pays" className="h-12 rounded-2xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all" />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Religion</Label>
                              <Input name="religion" defaultValue={currentData?.religion || ""} placeholder="Islam / Christianisme..." className="h-12 rounded-2xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all" />
                           </div>
                        </div>

                        <div className="grid grid-cols-3 gap-6">
                           <div className="space-y-2">
                              <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">CNIC / Numéro National</Label>
                              <Input name="cnic" defaultValue={currentData?.cnic || ""} placeholder="Numéro d'identification" className="h-12 rounded-2xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all" />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Groupe Sanguin</Label>
                              <select name="groupeSanguin" defaultValue={currentData?.groupeSanguin || ""} className="w-full h-12 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 px-4 font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all cursor-pointer">
                                <option value="">-- Choisir --</option>
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                              </select>
                           </div>
                           <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Code PIN Accès (4 Chiffres)</Label>
                                <button type="button" onClick={generateRandomPin} className="text-[11px] text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline flex items-center gap-1 cursor-pointer">
                                  <Sparkles size={11} /> Auto PIN
                                </button>
                              </div>
                              <div className="relative">
                                <Input
                                  name="activationPin"
                                  type={showPin ? "text" : "password"}
                                  maxLength={6}
                                  value={activationPin}
                                  onChange={(e) => setActivationPin(e.target.value)}
                                  placeholder="Ex: 1234"
                                  className="h-12 rounded-2xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 font-black text-center text-lg tracking-widest text-indigo-600 dark:text-indigo-400 pr-10 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPin(!showPin)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                >
                                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                           </div>
                        </div>
                     </section>

                     {/* ── Section Empreinte Digitale Biométrique ── */}
                     <section className="p-6 rounded-[2rem] bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 shadow-xl relative overflow-hidden border border-indigo-500/20">
                        <div className="absolute top-0 right-0 p-6 opacity-10">
                           <Fingerprint size={120} className="text-indigo-400" />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center justify-between">
                           <div className="flex items-center gap-5">
                              <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
                                fingerprintHash
                                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/20"
                                  : "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                              }`}>
                                <Fingerprint size={36} className={isScanningFingerprint ? "animate-pulse scale-110 text-amber-400" : ""} />
                              </div>
                              <div>
                                 <div className="flex items-center gap-2">
                                    <h4 className="text-white font-black text-base tracking-tight">Empreinte Digitale Biométrique</h4>
                                    {fingerprintHash ? (
                                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1">
                                        <Check size={10} /> Enregistrée
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 text-[9px] font-black uppercase tracking-wider rounded-full">
                                        Non Définie
                                      </span>
                                    )}
                                 </div>
                                 <p className="text-indigo-200/70 text-[11px] font-medium mt-1">
                                    {fingerprintHash
                                      ? `Hash d'empreinte unique : ${fingerprintHash}`
                                      : "Scannez l'empreinte digitale pour l'appel et le pointage automatique sur mobile et bornes."}
                                 </p>
                                 <input type="hidden" name="fingerprintHash" value={fingerprintHash} />
                              </div>
                           </div>
                           <Button
                              type="button"
                              onClick={scanFingerprint}
                              disabled={isScanningFingerprint}
                              className={`h-12 px-6 rounded-xl font-black text-xs gap-2 transition-all shrink-0 ${
                                fingerprintHash
                                  ? "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                              }`}
                           >
                              <Fingerprint size={16} className={isScanningFingerprint ? "animate-spin" : ""} />
                              {isScanningFingerprint
                                ? "SCAN EN COURS..."
                                : fingerprintHash
                                ? "RE-SCANNER L'EMPREINTE"
                                : "CAPTURER L'EMPREINTE"}
                           </Button>
                        </div>
                     </section>

                    <section className="p-8 rounded-[2rem] bg-slate-900 shadow-xl relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Camera size={100} className="text-white" />
                       </div>
                       <div className="relative z-10 flex gap-8 items-center">
                          <div className="h-32 w-32 rounded-3xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-2xl ring-4 ring-slate-800/50">
                            {preview ? (
                              <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                            ) : (
                              <User size={48} className="text-slate-600" />
                            )}
                            {isCameraOpen && (
                              <div className="absolute inset-0 z-20 bg-black">
                                <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover mirror" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 space-y-4">
                             <div>
                                <h4 className="text-white font-black text-lg tracking-tight">Photographie du dossier</h4>
                                <p className="text-slate-500 text-[10px] font-bold mt-0.5 uppercase tracking-widest">Requis pour la carte scolaire</p>
                             </div>
                             <div className="flex gap-2">
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()} className="flex-1 rounded-xl h-12 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] gap-2 border border-white/10">
                                  <Upload size={14} className="text-indigo-400" /> UPLOAD
                                </Button>
                                {!isCameraOpen ? (
                                  <Button type="button" variant="ghost" onClick={startCamera} className="flex-1 rounded-xl h-12 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] gap-2 border border-white/10">
                                    <Camera size={14} className="text-indigo-400" /> CAMÉRA
                                  </Button>
                                ) : (
                                  <Button type="button" onClick={capturePhoto} className="flex-1 rounded-xl h-12 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-[10px] gap-2">
                                    <Check size={14} /> CAPTURER
                                  </Button>
                                )}
                             </div>
                             {cameraError && (
                               <p className="text-[10px] text-rose-400 font-bold bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                                 ⚠️ {cameraError}
                               </p>
                             )}
                             <Button type="button" className="w-full rounded-xl h-12 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 font-black text-[10px] gap-2 border border-indigo-500/20 shadow-inner">
                                <Zap size={14} className="text-amber-400 animate-pulse" /> SMART AI SCAN
                             </Button>
                          </div>
                       </div>
                    </section>

                    <section className="space-y-6">
                       <div className="flex items-center gap-2 pb-2 border-b border-indigo-100 dark:border-indigo-950/60">
                         <span className="w-1.5 h-4 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                         <h4 className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                           Détails académiques
                         </h4>
                       </div>
                        
                       <div className="grid grid-cols-3 gap-6">

                          {/* SESSION — loaded from school_sessions table */}
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Session *</Label>
                            <select
                              name="session"
                              value={selectedSession}
                              onChange={e => setSelectedSession(e.target.value)}
                              className="w-full h-12 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 px-4 font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all cursor-pointer"
                            >
                              <option value="" disabled>-- Choisir la session --</option>
                              {sessionsList.length > 0
                                ? sessionsList.map(s => (
                                    <option key={s.id} value={s.sessionName}>{s.sessionName}</option>
                                  ))
                                : [
                                    <option key="f1" value="2024-2025">2024-2025</option>,
                                    <option key="f2" value="2025-2026">2025-2026</option>,
                                    <option key="f3" value="2023-2024">2023-2024</option>,
                                  ]
                              }
                              {selectedSession && !sessionsList.some(s => s.sessionName === selectedSession) && (
                                <option value={selectedSession}>{selectedSession}</option>
                              )}
                            </select>
                          </div>

                          {/* NIVEAU — ALL levels from Paramètres → Académique */}
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Niveau *</Label>
                            <select
                              name="educationalLevel"
                              value={selectedLevel}
                              onChange={e => {
                                const newLevel = e.target.value;
                                setSelectedLevel(newLevel);
                                setSelectedClasse("");
                                setSelectedSection("");
                              }}
                              required
                              className="w-full h-12 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 px-4 font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all cursor-pointer"
                            >
                              <option value="" disabled>-- Choisir le niveau --</option>
                              {levelsList.map(l => (
                                <option key={l.id} value={l.levelName}>{l.levelName}</option>
                              ))}
                              {selectedLevel && !levelsList.some(l => l.levelName === selectedLevel) && (
                                <option value={selectedLevel}>{selectedLevel}</option>
                              )}
                            </select>
                            {levelsList.length === 0 && (
                              <p className="text-[10px] text-amber-500 font-semibold ml-1">⏳ Chargement depuis Paramètres...</p>
                            )}
                          </div>

                          {/* CLASSE — filtered by selected level with fallback */}
                          <div className="space-y-2">
                             <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Classe *</Label>
                             <select
                               name="classe"
                               value={selectedClasse}
                               onChange={e => {
                                 const val = e.target.value;
                                 setSelectedClasse(val);
                                 // Auto-fill financial planning values and level from selected class settings
                                 const clsObj = allClassesList.find(c => c.className === val);
                                 if (clsObj) {
                                   const infLevel = clsObj.section?.educationalLevel || clsObj.educationalLevel;
                                   if (infLevel && infLevel !== selectedLevel) {
                                     setSelectedLevel(infLevel);
                                   }
                                   if (clsObj.section?.sectionName) {
                                     setSelectedSection(clsObj.section.sectionName);
                                   }
                                   setFraisMensuels(clsObj.scolariteMensuelle ?? 0);
                                   setFraisInscription(clsObj.droitsInscription ?? 0);
                                   setFraisCogesCard(clsObj.cogesCarteId ?? 0);
                                   setFraisTransportInternat(clsObj.transportInternat ?? 0);
                                   setAncienSoldeValue(clsObj.ancienSolde ?? 0);
                                   if (clsObj.statutInitial) {
                                     setStatutValue(clsObj.statutInitial);
                                   }
                                 }
                               }}
                               required
                               className="w-full h-12 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 px-4 font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all cursor-pointer"
                             >
                               <option value="" disabled>-- Choisir une classe --</option>
                               {classesList.map(c => (
                                 <option key={c.id} value={c.className}>{c.className}</option>
                               ))}
                               {selectedClasse && !classesList.some(c => c.className === selectedClasse) && (
                                 <option value={selectedClasse}>{selectedClasse}</option>
                               )}
                             </select>
                          </div>

                        </div>

                       <div className="grid grid-cols-3 gap-6">

                           {/* SECTION — filtered by selected level with fallback */}
                           <div className="space-y-2">
                             <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Section</Label>
                             <select
                               name="section"
                               value={selectedSection}
                               onChange={e => setSelectedSection(e.target.value)}
                               className="w-full h-12 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 px-4 font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all cursor-pointer"
                             >
                               <option value="">-- Aucune section --</option>
                               {sectionsList.map(s => (
                                 <option key={s.id} value={s.sectionName}>{s.sectionName}</option>
                               ))}
                               {selectedSection && !sectionsList.some(s => s.sectionName === selectedSection) && (
                                 <option value={selectedSection}>{selectedSection}</option>
                               )}
                             </select>
                           </div>

                           {/* CATÉGORIE — controlled with options */}
                           <div className="space-y-2">
                             <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Catégorie</Label>
                             <select
                               name="categorie"
                               value={selectedCategorie}
                               onChange={e => setSelectedCategorie(e.target.value)}
                               className="w-full h-12 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 px-4 font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all cursor-pointer"
                             >
                                 <option value="Général">Général</option>
                                 <option value="Boursier">Boursier</option>
                                 <option value="Fils d'employé">Fils d'employé</option>
                                 {categoriesList.filter(c => !["Général", "Boursier", "Fils d'employé"].includes(c.value)).map(c => (
                                   <option key={c.id} value={c.value}>{c.label}</option>
                                 ))}
                                 {selectedCategorie && !["Général", "Boursier", "Fils d'employé"].includes(selectedCategorie) && !categoriesList.some(c => c.value === selectedCategorie) && (
                                   <option value={selectedCategorie}>{selectedCategorie}</option>
                                 )}
                             </select>
                           </div>

                        </div>

                       <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Behavior Score (Conduite) /20</Label>
                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800/40">Automated Ranking</span>
                          </div>
                          <Input
                            name="behaviorScore"
                            type="number"
                            step="0.5"
                            value={behaviorScoreValue}
                            onChange={e => setBehaviorScoreValue(e.target.value)}
                            className="h-12 rounded-2xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 font-black text-slate-800 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all"
                          />
                       </div>
                    </section>
                </div>

                <div className={step !== 2 ? "hidden" : "space-y-8 animate-in fade-in slide-in-from-right-8 duration-500"}>
                    <section className="space-y-6">
                       <div className="flex items-center gap-2 pb-2 border-b border-indigo-100 dark:border-indigo-950/60">
                         <span className="w-1.5 h-4 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                         <h4 className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                           Informations du Père / Tuteur Légal
                         </h4>
                       </div>
                       <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Nom du tuteur légal *</Label>
                            <Input name="nomPere" defaultValue={currentData?.nomPere || ""} required placeholder="Nom et Prénom du parent" className="h-14 rounded-2xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 font-black text-lg text-slate-800 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Mobile principal (SMS) *</Label>
                            <Input name="mobile" type="tel" defaultValue={currentData?.mobile || ""} required placeholder="+221 ..." className="h-14 rounded-2xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 font-black text-lg text-slate-800 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all" />
                          </div>
                        </div>
                    </section>

                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">CNIC / ID du parent</Label>
                        <Input name="cnicPere" defaultValue={currentData?.cnicPere || ""} placeholder="Numéro national" className="h-12 rounded-2xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Numéro WhatsApp</Label>
                        <Input name="whatsapp" defaultValue={currentData?.whatsapp || ""} placeholder="Si différent du mobile SMS" className="h-12 rounded-2xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all" />
                      </div>
                    </div>

                    <div className="p-6 rounded-[2rem] bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 flex items-start gap-4 shadow-xs">
                       <div className="h-11 w-11 rounded-2xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/30 text-white">
                          <Zap size={20} />
                       </div>
                       <div>
                          <h4 className="text-indigo-950 dark:text-indigo-200 font-black tracking-tight text-base">Notification Automatique & Espace Parents</h4>
                          <p className="text-indigo-700/80 dark:text-indigo-300/80 text-xs font-medium mt-1">Le système enverra automatiquement un message de bienvenue et les accès mobiles dès validation du dossier.</p>
                       </div>
                    </div>
                  </div>

                <div className={step !== 3 ? "hidden" : "space-y-8 animate-in fade-in slide-in-from-right-8 duration-500"}>
                    <section className="space-y-6">
                       <div className="flex items-center gap-2 pb-2 border-b border-emerald-100 dark:border-emerald-950/60">
                         <span className="w-1.5 h-4 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                         <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                           Planification des Frais & Scolarité
                         </h4>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Scolarité Mensuelle</Label>
                            <div className="relative group">
                              <Input
                                name="fraisMensuels"
                                type="number"
                                value={fraisMensuels}
                                onChange={e => setFraisMensuels(e.target.value)}
                                className="h-16 pl-22 pr-4 rounded-2xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 font-black text-2xl text-emerald-600 dark:text-emerald-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-xs transition-all"
                              />
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 h-9 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center">
                                 <span className="font-black text-xs text-emerald-700 dark:text-emerald-300">FCFA</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Droits d'inscription</Label>
                            <div className="relative group">
                              <Input
                                name="fraisInscription"
                                type="number"
                                value={fraisInscription}
                                onChange={e => setFraisInscription(e.target.value)}
                                className="h-16 pl-22 pr-4 rounded-2xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 font-black text-2xl text-indigo-600 dark:text-indigo-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all"
                              />
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 h-9 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center">
                                 <span className="font-black text-xs text-indigo-700 dark:text-indigo-300">FCFA</span>
                              </div>
                            </div>
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">COGES & Carte ID</Label>
                            <div className="relative group">
                              <Input
                                name="fraisCogesCard"
                                type="number"
                                value={fraisCogesCard}
                                onChange={e => setFraisCogesCard(e.target.value)}
                                className="h-16 pl-22 pr-4 rounded-2xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 font-black text-2xl text-amber-600 dark:text-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 shadow-xs transition-all"
                              />
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 h-9 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center">
                                 <span className="font-black text-xs text-amber-700 dark:text-amber-300">FCFA</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Transport & Internat</Label>
                            <div className="relative group">
                              <Input
                                name="fraisTransportInternat"
                                type="number"
                                value={fraisTransportInternat}
                                onChange={e => setFraisTransportInternat(e.target.value)}
                                className="h-16 pl-22 pr-4 rounded-2xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 font-black text-2xl text-sky-600 dark:text-sky-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 shadow-xs transition-all"
                              />
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 h-9 px-3 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/50 flex items-center justify-center">
                                 <span className="font-black text-xs text-sky-700 dark:text-sky-300">FCFA</span>
                              </div>
                            </div>
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Ancien Solde (Report Arriérés)</Label>
                            <Input
                              name="ancienSolde"
                              type="number"
                              value={ancienSoldeValue}
                              onChange={e => setAncienSoldeValue(e.target.value)}
                              className="h-13 rounded-2xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 font-black text-lg text-slate-800 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Statut Initial du Dossier</Label>
                            <select
                              name="statut"
                              value={statutValue}
                              onChange={e => setStatutValue(e.target.value)}
                              className="w-full h-13 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 px-4 font-black text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all cursor-pointer"
                            >
                              <option value="Actif">✅ Actif</option>
                              <option value="Inactif">Inactif</option>
                              <option value="Diplômé">Diplômé</option>
                              <option value="Exclu">Exclu</option>
                            </select>
                          </div>
                       </div>
                    </section>

                    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 rounded-[2rem] p-7 text-white relative overflow-hidden shadow-2xl mt-4 border border-indigo-500/30">
                       <div className="absolute -bottom-10 -right-10 opacity-5 rotate-12">
                          <Zap size={180} className="text-indigo-400" />
                       </div>
                       <div className="relative z-10 space-y-5">
                          <div className="flex justify-between items-start">
                             <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-1">Finalisation Administrative</p>
                                <h3 className="text-2xl font-black tracking-tight text-white">Prêt pour l'admission officielle ?</h3>
                             </div>
                             <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shadow-lg shadow-indigo-500/20">
                                <Check size={24} />
                             </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                             <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Statut Sélectionné</p>
                                <p className="font-black text-emerald-400 text-base mt-1 tracking-tight">✅ DOSSIER ACTIF</p>
                             </div>
                             <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Validation Directe</p>
                                <p className="font-black text-indigo-300 text-base mt-1 tracking-tight">⚡ AUTO-COMPTABILITÉ</p>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
              </form>
            </div>

          {/* Footer */}
          <div className="shrink-0 px-8 py-5 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111422] flex justify-between items-center shadow-lg">
            <div>
              {step > 1 && (
                <Button
                  onClick={prevStep}
                  type="button"
                  variant="ghost"
                  className="h-11 px-6 rounded-xl font-black uppercase tracking-wider text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <ChevronLeft size={16} /> Précédent
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={close}
                className="h-11 px-6 rounded-xl font-black uppercase tracking-wider text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all"
              >
                Quitter
              </Button>
              {step < 3 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="h-11 px-9 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 hover:from-indigo-900 hover:to-indigo-950 text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-indigo-950/30 transition-all hover:scale-105 active:scale-95 group flex items-center gap-2 cursor-pointer border border-indigo-500/20"
                >
                  Suivant <Zap size={14} className="text-amber-400 group-hover:rotate-12 transition-transform" />
                </Button>
              ) : (
                <Button
                  onClick={handleFinalSubmit}
                  disabled={loading}
                  className="h-11 px-9 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black uppercase tracking-wider text-xs shadow-xl shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-indigo-400/30"
                >
                  {loading ? "TRAITEMENT..." : mode === "edit" ? "METTRE À JOUR" : "VALIDER L'INSCRIPTION"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  ) : null;

  return (
    <>
      <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">
        {trigger || (
          <button className="rounded-2xl px-6 py-4 bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all font-bold gap-2 flex items-center justify-center group">
            <Zap size={18} className="text-amber-400 group-hover:scale-125 transition-transform" />
            Ajouter un étudiant
          </button>
        )}
      </div>
      {typeof window !== "undefined" && createPortal(modal, document.body)}
    </>
  );
}
