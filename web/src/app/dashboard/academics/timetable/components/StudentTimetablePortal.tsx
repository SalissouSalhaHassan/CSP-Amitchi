"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  BookOpen,
  User,
  MapPin,
  Printer,
  ShieldCheck,
  Sparkles,
  GraduationCap,
  CheckCircle2,
  CalendarDays,
  Flame,
  Coffee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStudentPersonalTimetableAction } from "@/domains/academics/actions/timetable.actions";
import { toast } from "sonner";

interface StudentTimetablePortalProps {
  currentUser?: any;
}

export default function StudentTimetablePortal({ currentUser }: StudentTimetablePortalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<string>("All");

  useEffect(() => {
    async function loadTimetable() {
      setLoading(true);
      try {
        const res: any = await getStudentPersonalTimetableAction();
        const payload = res?.data?.data || res?.data;
        if (res?.success && payload) {
          setData(payload);
        } else {
          toast.error(res?.data?.error || res?.error || "Impossible de charger votre emploi du temps.");
        }
      } catch (err: any) {
        toast.error("Erreur de connexion au serveur.");
      } finally {
        setLoading(false);
      }
    }
    loadTimetable();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          <Calendar className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Chargement de votre emploi du temps...</h3>
          <p className="text-sm text-slate-400">Vérification de la classe et des séances officielles en cours.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-slate-900/60 rounded-3xl border border-slate-800">
        <BookOpen className="w-12 h-12 text-slate-500 mb-3" />
        <h3 className="text-lg font-bold text-white">Emploi du temps indisponible</h3>
        <p className="text-sm text-slate-400 max-w-md mt-1">
          Aucun emploi du temps n'est actuellement publié pour votre classe. Veuillez contacter l'administration de votre établissement.
        </p>
      </div>
    );
  }

  const { student, class: classInfo, session, settings, entries, school } = data;
  const daysList: string[] = (settings?.days || "Lundi,Mardi,Mercredi,Jeudi,Vendredi").split(",").map((d: string) => d.trim());
  const periodsCount = settings?.periods || 6;
  const periodDuration = settings?.periodDuration || 60;
  const dayStart = settings?.dayStart || "08:00";
  const recessAfter = settings?.recessAfter || 3;
  const recessDuration = settings?.recessDuration || 30;

  // Compute period start and end times
  function getPeriodTime(periodNum: number) {
    const [startHour, startMin] = dayStart.split(":").map(Number);
    let totalMinutes = startHour * 60 + startMin;

    for (let p = 1; p < periodNum; p++) {
      totalMinutes += periodDuration;
      if (recessAfter && p === recessAfter) {
        totalMinutes += recessDuration;
      }
    }

    const startH = Math.floor(totalMinutes / 60);
    const startM = totalMinutes % 60;
    const endMinutes = totalMinutes + periodDuration;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;

    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(startH)}h${pad(startM)} - ${pad(endH)}h${pad(endM)}`;
  }

  // Get current weekday name in French
  const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const currentDayName = dayNames[new Date().getDay()];
  const todayEntries = entries.filter((e: any) => e.dayName.toLowerCase() === currentDayName.toLowerCase())
    .sort((a: any, b: any) => a.periodNumber - b.periodNumber);

  const filteredDays = selectedDay === "All" ? daysList : [selectedDay];

  return (
    <div className="w-full space-y-6 print:m-0 print:p-0 print:space-y-4 print:bg-white print:text-black">
      {/* ─── Global Print Stylesheet ─── */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 6mm 8mm;
          }
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print, [class*="no-print"] {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-table {
            border-collapse: collapse !important;
            width: 100% !important;
            table-layout: fixed !important;
          }
          .print-table th, .print-table td {
            border: 1px solid #1e293b !important;
            padding: 4px 6px !important;
          }
          .print-card {
            background: white !important;
            border: 1px solid #cbd5e1 !important;
            color: black !important;
            box-shadow: none !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      {/* ─── Official Print-Only Academic Header ─── */}
      <div className="print-only border-b-2 border-slate-900 pb-3 mb-3">
        <div className="flex items-center justify-between">
          <div className="text-left space-y-0.5">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-800">
              RÉPUBLIQUE DU NIGER
            </div>
            <div className="text-[9px] text-slate-600 uppercase font-semibold">
              Ministère de l'Enseignement Supérieur / de l'Éducation
            </div>
            <div className="text-sm font-black text-slate-900 uppercase tracking-tight mt-1">
              {school?.name || "ÉTABLISSEMENT D'EXCELLENCE"}
            </div>
          </div>

          <div className="text-center px-4">
            <div className="inline-block bg-slate-900 text-white font-black text-xs uppercase tracking-widest px-4 py-1 rounded-md">
              EMPLOI DU TEMPS OFFICIEL
            </div>
            <div className="text-[11px] font-bold text-slate-800 mt-1">
              CLASSE : <span className="font-extrabold text-blue-900">{classInfo?.name}</span> ({classInfo?.level})
            </div>
            <div className="text-[10px] text-slate-600 font-medium">
              Année Académique : <strong>{session?.name || "En cours"}</strong>
            </div>
          </div>

          <div className="text-right space-y-0.5">
            <div className="text-xs font-bold text-slate-900">
              {student?.nomEtudiant}
            </div>
            <div className="text-[10px] text-slate-600 font-mono">
              Matricule : <strong>{student?.numAdmission}</strong>
            </div>
            <div className="text-[9px] text-slate-500">
              Édité le : {new Date().toLocaleDateString("fr-FR")}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Header & Security Banner (Screen Only) ─── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="no-print bg-gradient-to-r from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-slate-700/60 rounded-3xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden"
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
                Classe : {classInfo?.name}
              </Badge>
              <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 text-xs font-semibold rounded-full">
                {classInfo?.level}
              </Badge>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <CalendarDays className="w-8 h-8 text-emerald-400" />
                Mon Emploi du Temps Officiel
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {student?.nomEtudiant} • Matricule : <span className="font-mono text-emerald-300 font-semibold">{student?.numAdmission}</span> • Année : <span className="text-slate-200">{session?.name || "En cours"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-2xl shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition-all transform active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimer l'Emploi du Temps (A4 Paysage)
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ─── Today's Classes Quick View (Screen Only) ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="no-print bg-slate-900/70 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
            <h2 className="text-lg font-bold text-white">Cours d'Aujourd'hui ({currentDayName})</h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {todayEntries.length} séance(s) programmée(s)
          </span>
        </div>

        {todayEntries.length === 0 ? (
          <div className="p-5 text-center bg-slate-950/40 rounded-2xl border border-slate-800/50">
            <Coffee className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-300">Aucun cours programmé aujourd'hui.</p>
            <p className="text-xs text-slate-500 mt-0.5">Profitez-en pour réviser et préparer vos devoirs !</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayEntries.map((e: any) => (
              <div
                key={e.id}
                className="bg-slate-950/70 border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-4 transition-all duration-200 group"
              >
                <div className="flex items-center justify-between text-xs text-emerald-400 font-mono font-semibold mb-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {getPeriodTime(e.periodNumber)}
                  </span>
                  <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                    Période {e.periodNumber}
                  </Badge>
                </div>
                <h4 className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors">
                  {e.subjectName}
                </h4>
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 truncate">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    {e.teacherName}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {e.roomName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ─── Day Switcher Tabs (Screen Only) ─── */}
      <div className="no-print flex flex-wrap items-center gap-2">
        <Button
          onClick={() => setSelectedDay("All")}
          variant={selectedDay === "All" ? "default" : "outline"}
          className={`rounded-xl text-xs font-semibold px-4 py-2 ${
            selectedDay === "All"
              ? "bg-emerald-600 hover:bg-emerald-500 text-white border-transparent"
              : "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800"
          }`}
        >
          Tous les Jours (Matrice)
        </Button>
        {daysList.map((day) => (
          <Button
            key={day}
            onClick={() => setSelectedDay(day)}
            variant={selectedDay === day ? "default" : "outline"}
            className={`rounded-xl text-xs font-semibold px-4 py-2 ${
              selectedDay === day
                ? "bg-emerald-600 hover:bg-emerald-500 text-white border-transparent"
                : "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800"
            }`}
          >
            {day}
          </Button>
        ))}
      </div>

      {/* ─── Complete Weekly Timetable Grid ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-2xl overflow-x-auto print:bg-white print:border-none print:p-0 print:shadow-none"
      >
        <table className="w-full text-left border-collapse min-w-[700px] print-table print:text-black print:min-w-0">
          <thead>
            <tr className="border-b border-slate-800 print:border-slate-900 print:bg-slate-100">
              <th className="p-3 text-xs font-black text-slate-400 uppercase tracking-wider w-36 print:text-slate-900 print:w-28 print:p-1.5 print:text-[10px]">
                Horaire / Période
              </th>
              {filteredDays.map((day) => (
                <th
                  key={day}
                  className={`p-3 text-xs font-black uppercase tracking-wider text-center print:text-slate-900 print:p-1.5 print:text-[10px] ${
                    day.toLowerCase() === currentDayName.toLowerCase()
                      ? "text-emerald-400 bg-emerald-500/10 rounded-t-xl print:bg-slate-200"
                      : "text-slate-300"
                  }`}
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 print:divide-slate-900">
            {Array.from({ length: periodsCount }, (_, i) => i + 1).map((pNum) => {
              const isRecessTime = recessAfter && pNum === recessAfter + 1;

              return (
                <React.Fragment key={pNum}>
                  {/* Recess Banner */}
                  {isRecessTime && (
                    <tr className="bg-amber-500/10 border-y border-amber-500/20 print:bg-slate-100 print:border-slate-900">
                      <td
                        colSpan={filteredDays.length + 1}
                        className="py-2 px-4 text-center text-xs font-bold text-amber-300 flex items-center justify-center gap-2 print:text-slate-900 print:py-1 print:text-[10px]"
                      >
                        <Coffee className="w-4 h-4 print:hidden" />
                        ☕ PAUSE / RÉCRÉATION ({recessDuration} min)
                      </td>
                    </tr>
                  )}

                  <tr className="hover:bg-slate-800/30 transition-colors print:hover:bg-transparent">
                    {/* Period Label */}
                    <td className="p-3 align-top print:p-1.5 print:bg-slate-50">
                      <div className="font-bold text-white text-xs print:text-slate-900 print:text-[10px]">Période {pNum}</div>
                      <div className="text-[11px] font-mono text-emerald-400 mt-0.5 print:text-slate-700 print:text-[9px] print:font-semibold">
                        {getPeriodTime(pNum)}
                      </div>
                    </td>

                    {/* Day Slots */}
                    {filteredDays.map((day) => {
                      const entry = entries.find(
                        (e: any) =>
                          e.dayName.toLowerCase() === day.toLowerCase() &&
                          e.periodNumber === pNum
                      );

                      const isToday = day.toLowerCase() === currentDayName.toLowerCase();

                      return (
                        <td
                          key={day}
                          className={`p-2.5 align-top print:p-1 ${
                            isToday ? "bg-emerald-500/5 print:bg-transparent" : ""
                          }`}
                        >
                          {entry ? (
                            <div className="bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-3 shadow-md transition-all group print:bg-white print:border print:border-slate-400 print:rounded-lg print:p-1.5 print:shadow-none">
                              <div className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors print:text-slate-950 print:text-[11px] print:leading-tight">
                                {entry.subjectName}
                              </div>
                              <div className="mt-2 text-xs text-slate-400 flex flex-col space-y-1 print:mt-1 print:text-[9px] print:space-y-0.5">
                                <span className="flex items-center gap-1 truncate text-slate-300 print:text-slate-800 print:font-medium">
                                  <User className="w-3 h-3 text-slate-500 flex-shrink-0 print:hidden" />
                                  {entry.teacherName}
                                </span>
                                <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400/90 print:text-slate-600 print:text-[8.5px]">
                                  <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0 print:hidden" />
                                  Salle : {entry.roomName}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="h-16 rounded-xl border border-dashed border-slate-800/60 flex items-center justify-center text-slate-600 text-xs font-mono print:h-8 print:border-none print:text-slate-300">
                              —
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {/* ─── Official Print-Only Academic Footer ─── */}
        <div className="print-only mt-4 pt-3 border-t border-slate-400">
          <div className="flex items-center justify-between text-[10px] text-slate-600">
            <div>
              <p className="font-semibold text-slate-800">
                Document académique officiel généré via le portail Edut Pro.
              </p>
              <p className="text-[9px] text-slate-500">
                Toute modification non autorisée de ce document est strictement interdite.
              </p>
            </div>
            <div className="text-right pr-6">
              <p className="font-bold text-slate-900 uppercase">Direction des Études</p>
              <p className="text-[9px] text-slate-500 italic mt-6">Cachet et Visa de l'Établissement</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
