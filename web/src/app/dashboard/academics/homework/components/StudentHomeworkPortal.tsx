"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Search,
  Filter,
  GraduationCap,
  Paperclip,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getStudentPersonalHomeworkAction } from "@/domains/academics/actions/homework.actions";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface StudentHomeworkPortalProps {
  currentUser?: any;
}

export default function StudentHomeworkPortal({ currentUser }: StudentHomeworkPortalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "past">("pending");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadHomework() {
      setLoading(true);
      try {
        const res: any = await getStudentPersonalHomeworkAction();
        const payload = res?.data?.data || res?.data;
        if (res?.success && payload) {
          setData(payload);
        } else {
          toast.error(res?.data?.error || res?.error || "Impossible de charger les devoirs.");
        }
      } catch (err) {
        toast.error("Erreur de connexion au serveur.");
      } finally {
        setLoading(false);
      }
    }
    loadHomework();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <BookOpen className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Chargement des devoirs & tâches...</h3>
          <p className="text-sm text-slate-400">Récupération des travaux assignés à votre classe.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-slate-900/60 rounded-3xl border border-slate-800">
        <BookOpen className="w-12 h-12 text-slate-500 mb-3" />
        <h3 className="text-lg font-bold text-white">Aucun devoir disponible</h3>
        <p className="text-sm text-slate-400 max-w-md mt-1">
          Aucun travail de maison n'a été publié pour votre classe pour le moment.
        </p>
      </div>
    );
  }

  const { student, class: classInfo, stats, homeworks } = data;

  // Unique subjects
  const subjects = Array.from(new Set(homeworks.map((h: any) => h.subjectName))).filter(Boolean);

  // Filtered homework list
  const filteredHomeworks = homeworks.filter((h: any) => {
    if (activeFilter === "pending" && h.isPastDue) return false;
    if (activeFilter === "past" && !h.isPastDue) return false;
    if (selectedSubject !== "all" && h.subjectName !== selectedSubject) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        h.title.toLowerCase().includes(q) ||
        (h.description || "").toLowerCase().includes(q) ||
        h.subjectName.toLowerCase().includes(q)
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
        className="bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-slate-700/60 rounded-3xl p-6 lg:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Espace Personnel Sécurisé
              </Badge>
              <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 text-xs font-semibold rounded-full">
                Classe : {classInfo?.name}
              </Badge>
              <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 text-xs font-semibold rounded-full">
                {classInfo?.level}
              </Badge>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-indigo-400" />
                Mes Devoirs & Travaux de Maison
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {student?.nomEtudiant} • Matricule : <span className="font-mono text-indigo-300 font-semibold">{student?.numAdmission}</span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── KPI Metric Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-400">Total Devoirs Assignés</p>
              <h3 className="text-3xl font-black text-white">{stats.total}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileText className="w-6 h-6" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-amber-400">À Rendre (En cours)</p>
              <h3 className="text-3xl font-black text-amber-300">{stats.pendingCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-emerald-400">Passés / Dépassés</p>
              <h3 className="text-3xl font-black text-emerald-300">{stats.pastCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* ─── Filter & Search Bar ─── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 w-full md:w-auto">
          <Button
            onClick={() => setActiveFilter("pending")}
            variant={activeFilter === "pending" ? "default" : "ghost"}
            className={`rounded-xl text-xs font-semibold px-4 py-2 flex-1 md:flex-initial ${
              activeFilter === "pending"
                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            À Rendre ({stats.pendingCount})
          </Button>
          <Button
            onClick={() => setActiveFilter("past")}
            variant={activeFilter === "past" ? "default" : "ghost"}
            className={`rounded-xl text-xs font-semibold px-4 py-2 flex-1 md:flex-initial ${
              activeFilter === "past"
                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Passés ({stats.pastCount})
          </Button>
          <Button
            onClick={() => setActiveFilter("all")}
            variant={activeFilter === "all" ? "default" : "ghost"}
            className={`rounded-xl text-xs font-semibold px-4 py-2 flex-1 md:flex-initial ${
              activeFilter === "all"
                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Tous ({stats.total})
          </Button>
        </div>

        {/* Search & Subject Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              type="text"
              placeholder="Rechercher un devoir..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900/80 border-slate-800 pl-10 rounded-2xl text-xs text-white placeholder:text-slate-500"
            />
          </div>

          {subjects.length > 0 && (
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-slate-900/80 border border-slate-800 text-xs text-slate-300 rounded-2xl px-3 py-2.5 outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="all">Toutes les matières</option>
              {subjects.map((sub: any) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ─── Homework Cards Grid ─── */}
      {filteredHomeworks.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/50 rounded-3xl border border-slate-800/80 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Aucun devoir dans cette catégorie</h3>
          <p className="text-xs text-slate-500">
            {activeFilter === "pending"
              ? "Vous êtes à jour ! Aucun travail en attente pour le moment."
              : "Aucun devoir correspondant à vos filtres de recherche."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHomeworks.map((hw: any) => {
            const dueDate = hw.dateDue ? new Date(hw.dateDue) : null;
            const assignedDate = hw.dateAssigned ? new Date(hw.dateAssigned) : null;

            return (
              <motion.div
                key={hw.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group bg-slate-900/80 hover:bg-slate-900 border rounded-3xl p-6 shadow-xl transition-all duration-300 flex flex-col justify-between ${
                  hw.isPastDue
                    ? "border-slate-800/60 opacity-85 hover:opacity-100"
                    : "border-slate-800 hover:border-indigo-500/50"
                }`}
              >
                <div className="space-y-4">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs px-3 py-1 font-semibold rounded-full">
                      {hw.subjectName}
                    </Badge>
                    {hw.isPastDue ? (
                      <Badge variant="outline" className="text-[11px] border-slate-700 text-slate-400">
                        Délai dépassé
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-medium rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {dueDate ? `À rendre pour le ${format(dueDate, "dd MMM", { locale: fr })}` : "À rendre"}
                      </Badge>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2">
                      {hw.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed line-clamp-4 whitespace-pre-line">
                      {hw.description || "Consignes indiquées en classe par l'enseignant."}
                    </p>
                  </div>
                </div>

                {/* Footer Details */}
                <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <div>
                      <span className="text-slate-500 block">Assigné le:</span>
                      <span className="text-slate-300 font-mono">
                        {assignedDate ? format(assignedDate, "dd/MM/yyyy") : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Date limite:</span>
                      <span className="text-indigo-300 font-mono font-bold">
                        {dueDate ? format(dueDate, "dd/MM/yyyy") : "—"}
                      </span>
                    </div>
                  </div>

                  {hw.evaluationMarks && (
                    <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Barème / Note :</span>
                      <span className="text-emerald-400 font-mono font-bold">{hw.evaluationMarks}</span>
                    </div>
                  )}

                  {hw.documentPath && (
                    <a
                      href={hw.documentPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="w-full flex items-center justify-center border border-slate-800 hover:border-indigo-500/40 bg-slate-950/50 hover:bg-indigo-950/30 text-xs text-indigo-300 font-semibold rounded-2xl h-10 gap-2 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Télécharger le document joint
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
