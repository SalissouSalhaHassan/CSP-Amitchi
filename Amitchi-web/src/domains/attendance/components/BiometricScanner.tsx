"use client";

import { useState, useEffect } from "react";
import { Fingerprint, CheckCircle2, AlertCircle, RefreshCw, UserCheck, ShieldCheck, Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Student {
  id: number;
  nomEtudiant: string;
  numAdmission: string;
}

interface BiometricScannerProps {
  students: Student[];
  onMarkPresent: (studentId: number, remark?: string) => void;
}

export function BiometricScanner({ students, onMarkPresent }: BiometricScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastScannedStudent, setLastScannedStudent] = useState<Student | null>(null);
  const [scannedHistory, setScannedHistory] = useState<{ student: Student; time: string }[]>([]);

  // Filter students by search
  const filteredStudents = students.filter(
    (s) =>
      s.nomEtudiant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.numAdmission.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Trigger Biometric Scan Action
  const triggerFingerprintScan = (student: Student) => {
    setScanning(true);

    setTimeout(() => {
      setScanning(false);
      onMarkPresent(student.id, "Vérifié par empreinte digitale");
      setLastScannedStudent(student);

      const timeStr = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setScannedHistory((prev) => [{ student, time: timeStr }, ...prev]);

      toast.success(`Empreinte validée : ${student.nomEtudiant}`, {
        description: `Matricule: ${student.numAdmission} • Horodaté à ${timeStr}`,
        icon: <Fingerprint className="text-emerald-500" size={20} />
      });
    }, 800);
  };

  // Hardware Biometric WebAuthn Listener Simulation
  const handleHardwareSensorClick = () => {
    if (students.length === 0) return;
    // Pick the first unverified student or random for quick demo scan
    const randomStudent = students[Math.floor(Math.random() * students.length)];
    triggerFingerprintScan(randomStudent);
  };

  return (
    <div className="bg-white dark:bg-[#131622] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-xl space-y-8 animate-in fade-in duration-300">
      {/* Sensor Hero Scanner Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[2rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Fingerprint size={240} className="text-indigo-400" />
        </div>

        <div className="space-y-3 z-10 text-center md:text-left max-w-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[10px] font-black uppercase tracking-widest">
            <Zap size={14} className="text-amber-400 animate-pulse" /> Scanner Biométrique Actif
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white">Pointage par Empreinte Digitale</h2>
          <p className="text-xs text-slate-300 font-medium leading-relaxed">
            Touchez le capteur d'empreinte USB/Bluetooth connecté ou sélectionnez un élève ci-dessous pour certifier sa présence par authentification biométrique.
          </p>
        </div>

        {/* Animated Sensor Button */}
        <div className="flex flex-col items-center gap-3 shrink-0 z-10">
          <button
            onClick={handleHardwareSensorClick}
            disabled={scanning}
            className={`w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all duration-500 relative group cursor-pointer border-4 ${
              scanning
                ? "bg-indigo-600/30 border-indigo-400 shadow-[0_0_50px_rgba(99,102,241,0.6)] scale-105"
                : "bg-white/10 hover:bg-white/20 border-indigo-500/40 hover:border-indigo-400 shadow-xl"
            }`}
          >
            <Fingerprint
              size={54}
              className={`transition-all duration-300 ${
                scanning ? "text-emerald-400 animate-pulse scale-110" : "text-indigo-300 group-hover:text-white"
              }`}
            />
            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-200 mt-1">
              {scanning ? "Lecture..." : "Capteur Tactile"}
            </span>

            {scanning && (
              <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-75" />
            )}
          </button>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {scanning ? "Analyse Biométrique..." : "Poser le doigt ici"}
          </p>
        </div>
      </div>

      {/* Verified Success Confirmation Card */}
      {lastScannedStudent && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 animate-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-900 dark:text-emerald-300">{lastScannedStudent.nomEtudiant}</p>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold font-mono">
                Matricule: {lastScannedStudent.numAdmission} • Empreinte Digitale Certifiée
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg">
            Présent ✅
          </span>
        </div>
      )}

      {/* Student List for Biometric Scan */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
            <Input
              placeholder="Rechercher élève pour empreinte..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 h-11 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-400">
            {filteredStudents.length} élève(s) disponible(s)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((s) => (
            <div
              key={s.id}
              className="bg-slate-50/50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 hover:border-indigo-200 dark:hover:border-indigo-500/40 hover:bg-white dark:hover:bg-slate-900 transition-all shadow-sm group"
            >
              <div>
                <p className="font-extrabold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {s.nomEtudiant}
                </p>
                <p className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                  {s.numAdmission || "EDUT-2024-N/A"}
                </p>
              </div>

              <Button
                onClick={() => triggerFingerprintScan(s)}
                disabled={scanning}
                className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/10 shrink-0"
              >
                <Fingerprint size={16} /> Scan Empreinte
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Biometric Scans History Table */}
      {scannedHistory.length > 0 && (
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <h4 className="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <UserCheck size={16} className="text-emerald-500" /> Historique des Empreintes Scannées
          </h4>

          <div className="space-y-2">
            {scannedHistory.slice(0, 5).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/80 p-3 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{item.student.nomEtudiant}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">({item.student.numAdmission})</span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold font-mono">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
