"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarCheck2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Sparkles,
  Search,
  Filter,
  User,
  Activity,
  Send,
  PlusCircle,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getStudentPersonalAttendanceAction,
  submitAbsenceJustificationAction,
} from "@/domains/attendance/actions/attendance.actions";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function formatSafeDate(d: any, formatPattern: string = "EEEE dd MMMM yyyy"): string {
  if (!d) return "—";
  try {
    const parsed = typeof d === "string" ? new Date(d) : d;
    if (!parsed || isNaN(parsed.getTime())) return "—";
    return format(parsed, formatPattern, { locale: fr });
  } catch {
    return "—";
  }
}

interface StudentAttendancePortalProps {
  currentUser?: any;
}

export default function StudentAttendancePortal({ currentUser }: StudentAttendancePortalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Justification modal state
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [justificationReason, setJustificationReason] = useState("Raison médicale (Maladie)");
  const [justificationNote, setJustificationNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadAttendance() {
    setLoading(true);
    try {
      const res: any = await getStudentPersonalAttendanceAction();
      const payload = res?.data?.data || res?.data;
      if (res?.success && payload) {
        setData(payload);
      } else {
        toast.error(res?.data?.error || res?.error || "Impossible de charger votre fiche d'assiduité.");
      }
    } catch (err) {
      toast.error("Erreur de communication avec le serveur.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAttendance();
  }, []);

  async function handleSendJustification() {
    if (!selectedRecord) return;
    setSubmitting(true);
    try {
      const res: any = await submitAbsenceJustificationAction(
        selectedRecord.id,
        justificationReason,
        justificationNote
      );
      if (res?.success && res?.data?.success !== false) {
        toast.success(res?.data?.message || res?.message || "Justification transmise avec succès !");
        setSelectedRecord(null);
        setJustificationNote("");
        await loadAttendance();
      } else {
        toast.error(res?.data?.error || res?.error || "Échec de l'envoi de la justification.");
      }
    } catch (err) {
      toast.error("Erreur lors de la transmission.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          <CalendarCheck2 className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Chargement de votre assiduité...</h3>
          <p className="text-sm text-slate-400">Calcul du taux de présence et historique des cours.</p>
        </div>
      </div>
    );
  }

  const effectiveData = data || {
    student: {
      id: currentUser?.studentId || 1,
      nomEtudiant: currentUser?.nom || currentUser?.utilisateur || "Malam Laouali Habsatou",
      numAdmission: currentUser?.utilisateur || "CARD-EDUT-414",
      classe: currentUser?.classe || "Enseignement Général",
    },
    class: {
      id: 1,
      name: currentUser?.classe || "Enseignement Général",
      level: "Enseignement Général",
    },
    stats: {
      totalSessions: 0,
      presents: 0,
      absents: 0,
      retards: 0,
      excused: 0,
      rate: 100.0,
    },
    records: [],
  };

  const { student, class: classInfo, stats, records } = effectiveData;

  const filteredRecords = (records || []).filter((r: any) => {
    if (statusFilter !== "all") {
      const s = (r.status || "").toLowerCase();
      if (statusFilter === "present" && !s.includes("présent") && !s.includes("present")) return false;
      if (statusFilter === "absent" && !s.includes("abs")) return false;
      if (statusFilter === "retard" && !s.includes("retard")) return false;
      if (statusFilter === "excuse" && !s.includes("excus")) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (r.subjectName || "").toLowerCase().includes(q) ||
        (r.teacherName || "").toLowerCase().includes(q) ||
        (r.remark || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="w-full space-y-8">
      {/* ─── Header & Security Banner ─── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-slate-900/90 via-emerald-950/40 to-slate-900/90 border border-slate-700/60 rounded-3xl p-6 lg:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Espace Personnel Sécurisé
              </Badge>
              <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 text-xs font-semibold rounded-full">
                Classe : {classInfo?.name || student?.classe}
              </Badge>
              <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 text-xs font-semibold rounded-full">
                {classInfo?.level || "Enseignement Général"}
              </Badge>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <CalendarCheck2 className="w-8 h-8 text-emerald-400" />
                Mon Assiduité & Présences
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {student?.nomEtudiant} • Matricule : <span className="font-mono text-emerald-300 font-semibold">{student?.numAdmission}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={() => setSelectedRecord({ id: 0 })}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl px-5 py-6 font-bold shadow-lg shadow-emerald-900/30 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Justifier une absence
            </Button>
            <div className="bg-slate-950/80 border border-emerald-500/30 rounded-3xl p-4 px-6 flex items-center gap-5 shadow-inner">
              <div className="space-y-0.5 text-right">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Taux Global</span>
                <span className="text-3xl font-black text-emerald-400 font-mono">{stats.rate}%</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── KPI Metric Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold text-emerald-400">Présences</p>
            <h3 className="text-3xl font-black text-white">{stats.presents}</h3>
            <p className="text-[10px] text-slate-500">sur {stats.totalSessions} cours</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold text-rose-400">Absences Non-Justifiées</p>
            <h3 className="text-3xl font-black text-rose-400">{stats.absents}</h3>
            <p className="text-[10px] text-slate-500">À régulariser</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold text-blue-400">Absences Justifiées</p>
            <h3 className="text-3xl font-black text-blue-300">{stats.excused}</h3>
            <p className="text-[10px] text-slate-500">Validées par l'école</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold text-amber-400">Retards</p>
            <h3 className="text-3xl font-black text-amber-300">{stats.retards}</h3>
            <p className="text-[10px] text-slate-500">Arrivées tardives</p>
          </div>
        </motion.div>
      </div>

      {/* ─── Filters & Search ─── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 w-full md:w-auto">
          <Button
            onClick={() => setStatusFilter("all")}
            variant={statusFilter === "all" ? "default" : "ghost"}
            className={`rounded-xl text-xs font-semibold px-4 py-2 ${
              statusFilter === "all" ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "text-slate-400"
            }`}
          >
            Tout ({records.length})
          </Button>
          <Button
            onClick={() => setStatusFilter("present")}
            variant={statusFilter === "present" ? "default" : "ghost"}
            className={`rounded-xl text-xs font-semibold px-4 py-2 ${
              statusFilter === "present" ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "text-slate-400"
            }`}
          >
            Présent ({stats.presents})
          </Button>
          <Button
            onClick={() => setStatusFilter("absent")}
            variant={statusFilter === "absent" ? "default" : "ghost"}
            className={`rounded-xl text-xs font-semibold px-4 py-2 ${
              statusFilter === "absent" ? "bg-rose-600 hover:bg-rose-500 text-white" : "text-slate-400"
            }`}
          >
            Absent ({stats.absents})
          </Button>
          <Button
            onClick={() => setStatusFilter("retard")}
            variant={statusFilter === "retard" ? "default" : "ghost"}
            className={`rounded-xl text-xs font-semibold px-4 py-2 ${
              statusFilter === "retard" ? "bg-amber-600 hover:bg-amber-500 text-white" : "text-slate-400"
            }`}
          >
            Retard ({stats.retards})
          </Button>
          <Button
            onClick={() => setStatusFilter("excuse")}
            variant={statusFilter === "excuse" ? "default" : "ghost"}
            className={`rounded-xl text-xs font-semibold px-4 py-2 ${
              statusFilter === "excuse" ? "bg-blue-600 hover:bg-blue-500 text-white" : "text-slate-400"
            }`}
          >
            Excusé ({stats.excused})
          </Button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            type="text"
            placeholder="Filtrer par matière, enseignant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-900/80 border-slate-800 pl-10 rounded-2xl text-xs text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* ─── Attendance Timeline Table ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-xl overflow-x-auto"
      >
        <table className="w-full text-left border-collapse min-w-[650px]">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
              <th className="p-3">Date de la séance</th>
              <th className="p-3">Matière</th>
              <th className="p-3">Enseignant</th>
              <th className="p-3 text-center">Statut</th>
              <th className="p-3">Remarques & Justification</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-xs">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3 max-w-md mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white">Excellente Assiduité Scolaire 🎓</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Aucun incident ou absence injustifiée n'a été enregistré. L'élève fait preuve d'une présence et d'une ponctualité exemplaires (100% de présence).
                      </p>
                    </div>
                    <Button
                      onClick={() => setSelectedRecord({ id: 0 })}
                      variant="outline"
                      size="sm"
                      className="border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl text-xs mt-2"
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                      Signaler / Justifier une absence
                    </Button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRecords.map((r: any) => {
                const dateObj = r.date ? new Date(r.date) : null;
                const statusStr = (r.status || "").toLowerCase();

                let statusBadge = (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 font-semibold rounded-full">
                    Présent
                  </Badge>
                );

                if (statusStr.includes("retard")) {
                  statusBadge = (
                    <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 font-semibold rounded-full">
                      En Retard
                    </Badge>
                  );
                } else if (statusStr.includes("excus")) {
                  statusBadge = (
                    <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 font-semibold rounded-full">
                      Excusé
                    </Badge>
                  );
                } else if (statusStr.includes("abs")) {
                  statusBadge = (
                    <Badge className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 font-semibold rounded-full">
                      Absent
                    </Badge>
                  );
                }

                const canJustify = statusStr.includes("abs") && !statusStr.includes("excus");

                return (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-mono font-medium text-slate-300">
                      {formatSafeDate(r.date, "EEEE dd MMMM yyyy")}
                    </td>
                    <td className="p-3 font-bold text-white">{r.subjectName}</td>
                    <td className="p-3 text-slate-400">{r.teacherName}</td>
                    <td className="p-3 text-center">{statusBadge}</td>
                    <td className="p-3 text-slate-400 max-w-xs truncate">
                      {r.remark || "—"}
                    </td>
                    <td className="p-3 text-right">
                      {canJustify ? (
                        <Button
                          onClick={() => setSelectedRecord(r)}
                          size="sm"
                          variant="outline"
                          className="border-rose-500/30 hover:bg-rose-950/30 text-rose-300 text-xs rounded-xl h-8 px-3"
                        >
                          Justifier
                        </Button>
                      ) : (
                        <span className="text-slate-600 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </motion.div>

      {/* ─── Absence Justification Dialog ─── */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white rounded-3xl p-6 sm:max-w-md">
          <DialogHeader className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-1">
              <FileText className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold">Justifier une Absence</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Séance du{" "}
              <span className="text-white font-semibold">
                {selectedRecord?.date ? formatSafeDate(selectedRecord.date, "dd MMMM yyyy") : "Aujourd'hui"}
              </span>{" "}
              ({selectedRecord?.subjectName || "Séance générale"})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Motif principal :</label>
              <select
                value={justificationReason}
                onChange={(e) => setJustificationReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2.5 text-xs text-white outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="Raison médicale (Maladie)">Raison médicale (Maladie / Consultation)</option>
                <option value="Impératif familial">Impératif familial majeur</option>
                <option value="Déplacement d'urgence">Déplacement d'urgence</option>
                <option value="Autre motif justifié">Autre motif justifié</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Explications / Détails :</label>
              <textarea
                value={justificationNote}
                onChange={(e) => setJustificationNote(e.target.value)}
                placeholder="Indiquez le nom du médecin, numéro de certificat ou détails pour l'administration..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              onClick={() => setSelectedRecord(null)}
              variant="ghost"
              className="rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSendJustification}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold px-4"
            >
              {submitting ? "Envoi en cours..." : "Transmettre à l'administration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
