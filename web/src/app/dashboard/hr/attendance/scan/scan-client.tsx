"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { recordTeacherSessionScan } from "@/domains/hr/actions/teacher-attendance.actions";
import { 
  QrCode, Camera, AlertTriangle, CheckCircle, ShieldAlert, 
  MapPin, Clock, Calendar, ArrowRight, ArrowLeft, RefreshCw, ListFilter
} from "lucide-react";
import Link from "next/link";

interface ScanClientProps {
  teacher: any; // Logged-in teacher's employee record
  teacherClasses: any[]; // Classes taught by this teacher for manual fallback
}

export default function ScanClient({ teacher, teacherClasses }: ScanClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classIdParam = searchParams.get("classId");

  const [scanResult, setScanResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanError, setScanError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-reader-container";

  // Triggered when classId is present in the URL (from direct scan or camera scan)
  useEffect(() => {
    if (classIdParam && teacher) {
      processScan(parseInt(classIdParam));
    }
  }, [classIdParam, teacher]);

  const processScan = async (classId: number) => {
    setLoading(true);
    setScanError("");
    setScanResult(null);
    try {
      const res = await recordTeacherSessionScan(classId, teacher.id);
      if (res.success) {
        setScanResult(res);
      } else {
        setScanError(res.error || "Une erreur inconnue est survenue.");
      }
    } catch (err: any) {
      setScanError(err.message || "Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  // Start in-app camera scanner
  const startCamera = async () => {
    setScanError("");
    setManualMode(false);
    try {
      setCameraActive(true);
      
      // Give DOM time to mount container
      setTimeout(async () => {
        try {
          const html5QrCode = new Html5Qrcode(scannerId);
          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.7;
                return { width: size, height: size };
              }
            },
            (qrCodeMessage) => {
              // Successfully scanned URL or raw ID
              stopCamera();
              try {
                const url = new URL(qrCodeMessage);
                const classId = url.searchParams.get("classId");
                if (classId) {
                  router.push(`?classId=${classId}`);
                } else {
                  setScanError("QR code invalide. URL non reconnue.");
                }
              } catch (e) {
                // If it's just a raw number ID
                if (!isNaN(Number(qrCodeMessage))) {
                  router.push(`?classId=${qrCodeMessage}`);
                } else {
                  setScanError("Format de QR Code invalide.");
                }
              }
            },
            (errorMessage) => {
              // Verbose error logging (throttled by library)
            }
          );
        } catch (err: any) {
          console.error("Camera init error:", err);
          setScanError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
          setCameraActive(false);
        }
      }, 300);
    } catch (err) {
      setScanError("Erreur d'initialisation de la caméra.");
      setCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        console.error("Error stopping scanner:", e);
      }
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) return;
    router.push(`?classId=${selectedClassId}`);
  };

  // Render Status Screens
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl max-w-md w-full flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <RefreshCw size={32} className="animate-spin" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900">Validation en cours...</h3>
            <p className="text-sm font-semibold text-slate-500">Vérification de votre emploi du temps et enregistrement de présence.</p>
          </div>
        </div>
      </div>
    );
  }

  // Scan success card
  if (scanResult) {
    const isDuplicate = scanResult.alreadyRecorded;
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 lg:p-10 rounded-[3rem] border border-slate-100 shadow-2xl max-w-md w-full flex flex-col items-center gap-6 relative overflow-hidden">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center ${isDuplicate ? "bg-amber-50 text-amber-500" : "bg-emerald-50 text-emerald-500"}`}>
            {isDuplicate ? <Clock size={40} /> : <CheckCircle size={40} />}
          </div>
          
          <div className="space-y-2">
            <span className={`px-4 py-1 text-[9px] font-black uppercase tracking-widest rounded-full ${isDuplicate ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}>
              {isDuplicate ? "DÉJÀ ENREGISTRÉ" : "PRÉSENCE CONFIRMÉE"}
            </span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
              {isDuplicate ? "Séance Déjà Validée" : "Présence Enregistrée !"}
            </h3>
            <p className="text-sm font-semibold text-slate-500">
              {isDuplicate 
                ? "Votre présence pour ce cours a déjà été scannée aujourd'hui." 
                : "Bonne séance de cours ! Votre check-in a été validé."}
            </p>
          </div>

          <div className="w-full bg-slate-50 p-5 rounded-2xl border border-slate-100 text-left space-y-3.5">
            <div className="flex items-center gap-3">
              <MapPin size={16} className="text-indigo-500 shrink-0" />
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe / Salle</p>
                <p className="text-sm font-black text-slate-900">{scanResult.entry.className}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ListFilter size={16} className="text-indigo-500 shrink-0" />
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matière</p>
                <p className="text-sm font-bold text-slate-800">{scanResult.entry.subjectName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-indigo-500 shrink-0" />
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Période &amp; Heure de Scan</p>
                <p className="text-sm font-bold text-slate-800">
                  Heure {scanResult.entry.periodNumber} • {new Date(scanResult.entry.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full pt-4">
            <Link
              href="/dashboard/hr/attendance/teacher/me"
              className="h-12 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all text-sm"
            >
              Voir mon calendrier
              <ArrowRight size={16} />
            </Link>
            <button
              onClick={() => {
                router.push("?");
                setScanResult(null);
              }}
              className="h-12 w-full rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-sm transition-all"
            >
              Scanner une autre salle
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Scan error card
  if (scanError) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 lg:p-10 rounded-[3rem] border border-slate-100 shadow-2xl max-w-md w-full flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center">
            <ShieldAlert size={40} />
          </div>
          
          <div className="space-y-2">
            <span className="px-4 py-1 bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-black uppercase tracking-widest rounded-full">
              ERREUR DE SCAN
            </span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-2">Échec de l'enregistrement</h3>
            <p className="text-sm font-semibold text-slate-600 leading-relaxed">
              {scanError}
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full pt-4">
            <button
              onClick={() => {
                setScanError("");
                if (classIdParam) {
                  router.push("?");
                } else {
                  startCamera();
                }
              }}
              className="h-12 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all text-sm"
            >
              Réessayer
            </button>
            <button
              onClick={() => {
                setScanError("");
                setManualMode(true);
              }}
              className="h-12 w-full rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-sm transition-all"
            >
              Sélectionner manuellement la classe
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans p-6 lg:p-10 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 lg:p-10 rounded-[3rem] border border-slate-100 shadow-2xl flex flex-col items-center text-center gap-8 relative overflow-hidden">
        
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -z-10" />

        {/* Intro */}
        <div className="space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mx-auto">
            <QrCode size={28} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-4">Enregistrement Présence</h2>
          <p className="text-xs font-semibold text-slate-400">Enseignant: <span className="text-indigo-600 uppercase font-black">{teacher?.nom}</span></p>
        </div>

        {/* Scanner Container */}
        {cameraActive ? (
          <div className="w-full flex flex-col items-center gap-4">
            <div 
              id={scannerId} 
              className="w-full aspect-square rounded-3xl border-2 border-indigo-500 overflow-hidden bg-black shadow-inner relative"
            />
            <button
              onClick={stopCamera}
              className="h-11 px-6 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 font-semibold rounded-xl text-xs transition-all w-full"
            >
              Annuler le Scan
            </button>
          </div>
        ) : manualMode ? (
          // Manual Fallback Form
          <form onSubmit={handleManualSubmit} className="w-full space-y-4">
            <div className="text-left space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sélectionner la classe</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">-- Choisir une classe --</option>
                {teacherClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.className}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              type="submit"
              disabled={!selectedClassId}
              className="h-12 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all text-sm disabled:opacity-50"
            >
              Valider ma présence
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              onClick={() => setManualMode(false)}
              className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Retour
            </button>
          </form>
        ) : (
          // Standard Scanning triggers
          <div className="w-full flex flex-col gap-3.5">
            <button
              onClick={startCamera}
              className="h-14 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all text-sm"
            >
              <Camera size={18} />
              Scanner le Code de la Classe
            </button>

            <button
              onClick={() => setManualMode(true)}
              className="h-14 w-full rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 flex items-center justify-center gap-2 transition-all text-sm"
            >
              Enregistrement Manuel Fallback
            </button>

            <div className="pt-4 border-t border-slate-50 w-full">
              <Link
                href="/dashboard/hr/attendance/teacher/me"
                className="text-xs font-bold text-indigo-500 hover:text-indigo-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowLeft size={14} />
                Retour à mon calendrier de présence
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
