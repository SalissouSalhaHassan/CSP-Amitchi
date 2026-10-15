"use client";

import React, { useState, useEffect } from "react";
import AttendanceGrid from "@/domains/attendance/components/AttendanceGrid";
import { AttendanceFilters } from "@/domains/attendance/components/AttendanceFilters";
import { ClipboardCheck, Users, Calendar, BookOpen } from "lucide-react";

interface AttendanceClientProps {
  classes: any[];
  stats: any;
  subjects: any[];
  initialRecords: any[];
  students: any[];
  classId: number | null;
  subjectId: number | null;
  date: string;
  canEdit: boolean;
}

export default function AttendanceClient({
  classes,
  stats: initialStats,
  subjects,
  initialRecords,
  students,
  classId,
  subjectId,
  date,
  canEdit,
}: AttendanceClientProps) {
  const [records, setRecords] = useState<any[]>(initialRecords);
  const [stats, setStats] = useState<any>(initialStats);
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (classId) {
        // Cache online records
        if (navigator.onLine && initialRecords && initialRecords.length > 0) {
          try {
            const { cacheAttendance } = await import("@/infrastructure/local-db/cache");
            await cacheAttendance(classId, date, subjectId || undefined, initialRecords);
          } catch (e) {
            console.warn("Failed to cache attendance locally:", e);
          }
        }

        // Fallback to local cache if offline or empty
        if (!initialRecords || initialRecords.length === 0 || !navigator.onLine) {
          try {
            const { getCachedAttendance } = await import("@/infrastructure/local-db/cache");
            const cached = await getCachedAttendance(classId, date, subjectId || undefined);
            if (cached && cached.length > 0) {
              setRecords(cached);
              setIsLocal(true);

              // Recalculate local stats for the UI
              const presents = cached.filter((r: any) => r.status?.toUpperCase() === "PRESENT").length;
              const absents = cached.filter((r: any) => r.status?.toUpperCase() === "ABSENT").length;
              const lates = cached.filter((r: any) => r.status?.toUpperCase() === "LATE").length;
              const excused = cached.filter((r: any) => r.status?.toUpperCase() === "EXCUSED").length;
              setStats({ presents, absents, lates, excused });
            }
          } catch (e) {
            console.warn("Failed to get cached attendance:", e);
          }
        }
      }
    }
    loadData();
  }, [classId, date, subjectId, initialRecords]);

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">Appel & Présence</h1>
            {isLocal && (
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-widest rounded-xl animate-pulse self-center">
                Données locales
              </span>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Enregistrez la présence quotidienne des élèves</p>
        </div>
      </div>

      <AttendanceFilters 
        date={date} 
        classId={classId} 
        subjectId={subjectId} 
        classes={classes} 
        subjects={subjects} 
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Presents", value: stats?.presents || 0, icon: ClipboardCheck, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
          { label: "Absents", value: stats?.absents || 0, icon: Users, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10" },
          { label: "Retards", value: stats?.lates || 0, icon: Calendar, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
          { label: "Excusés", value: stats?.excused || 0, icon: BookOpen, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white dark:bg-[#131622] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${s.bg} ${s.color}`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">{s.label}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {classId ? (
        <AttendanceGrid 
          key={`${classId}-${subjectId}-${date}`}
          students={students} 
          classId={classId} 
          subjectId={subjectId || undefined} 
          date={date} 
          initialRecords={records}
          canEdit={canEdit}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 dark:bg-slate-900/40 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
          <div className="p-6 bg-white dark:bg-[#131622] rounded-full shadow-sm mb-4 border border-slate-100 dark:border-slate-800">
            <ClipboardCheck size={48} className="text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-600 dark:text-slate-200">Prêt pour l'appel</h3>
          <p className="text-slate-400 dark:text-slate-400 font-medium">Veuillez sélectionner une classe pour commencer</p>
        </div>
      )}
    </div>
  );
}
