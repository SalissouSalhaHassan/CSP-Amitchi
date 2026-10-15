"use client";

import React from "react";
import { 
  BookOpen, Clock, Globe, Languages, Brain, 
  FlaskConical, Calculator, PenTool, Coffee, 
  MapPin, User, GraduationCap, Calendar, 
  ChevronLeft, ChevronRight, Printer, Search,
  AlertCircle, CheckCircle2, LayoutGrid, Sparkles,
  Zap, Info, Star, Landmark, Library
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getClassDisplayName } from "@/domains/academics/utils/class-name";

type TimetableEntry = {
  id: number;
  dayName: string;
  periodNumber: number;
  subject?: { subjectName?: string | null } | null;
  teacher?: { nom?: string | null } | null;
  class?: { className?: string | null } | null;
  roomName?: string | null;
};

type TimetableSettings = {
  days: string;
  periods: number;
  recessAfter?: number | null;
  recessDuration?: number | null;
  periodDuration?: number | null;
  dayStart?: string | null;
};

interface ModernTimetableProps {
  mode: "class" | "teacher" | "up";
  title: string;
  subTitle?: string;
  entries: TimetableEntry[];
  settings: TimetableSettings;
  onRefresh?: () => void;
  onPrint?: () => void;
}

const SUBJECT_THEMES: Record<string, { color: string; bg: string; icon: any }> = {
  "Mathématiques": { color: "text-blue-600", bg: "bg-blue-50", icon: Calculator },
  "Français": { color: "text-rose-600", bg: "bg-rose-50", icon: PenTool },
  "Arabe": { color: "text-purple-600", bg: "bg-purple-50", icon: Languages },
  "Anglais": { color: "text-indigo-600", bg: "bg-indigo-50", icon: Globe },
  "Histoire - Géographie": { color: "text-cyan-600", bg: "bg-cyan-50", icon: MapPin },
  "Éducation Islamique": { color: "text-emerald-600", bg: "bg-emerald-50", icon: Library },
  "SVT": { color: "text-teal-600", bg: "bg-teal-50", icon: FlaskConical },
  "Physique-Chimie": { color: "text-red-600", bg: "bg-red-50", icon: FlaskConical },
  "Psychologie du Travail": { color: "text-amber-600", bg: "bg-amber-50", icon: Brain },
  "EPS": { color: "text-orange-600", bg: "bg-orange-50", icon: Zap },
  "Philosophie": { color: "text-slate-600", bg: "bg-slate-50", icon: Landmark },
};

const DEFAULT_THEME = { color: "text-indigo-600", bg: "bg-indigo-50", icon: BookOpen };

function getSubjectTheme(name: string = "") {
  for (const key in SUBJECT_THEMES) {
    if (name.toLowerCase().includes(key.toLowerCase())) return SUBJECT_THEMES[key];
  }
  return DEFAULT_THEME;
}

function parseTimeToMinutes(value: string) {
  const [h, m] = value.split(":").map((x) => Number(x));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function minutesToTime(value: number) {
  const h = Math.floor(value / 60);
  const m = value % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function ModernTimetable({ mode, title, subTitle, entries, settings, onRefresh, onPrint }: ModernTimetableProps) {
  const days = (settings.days || "Lundi,Mardi,Mercredi,Jeudi,Vendredi").split(",").map(d => d.trim());
  const periods = settings.periods || 6;
  const recessAfter = settings.recessAfter || 4;

  const getTimeLabel = (pNum: number) => {
    const start = parseTimeToMinutes(settings.dayStart || "07:30");
    const dur = settings.periodDuration || 60;
    const recessDur = settings.recessDuration || 30;
    
    let offset = (pNum - 1) * dur;
    if (pNum > (settings.recessAfter || 0) && (settings.recessAfter || 0) > 0) {
      offset += recessDur;
    }
    
    const pStart = start + offset;
    const pEnd = pStart + dur;
    return `${minutesToTime(pStart)} - ${minutesToTime(pEnd)}`;
  };

  const getCellData = (day: string, pNum: number) => {
    return entries.filter(e => e.dayName === day && e.periodNumber === pNum);
  };

  return (
    <div className="w-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col print:shadow-none print:border-none">
      {/* Official Header */}
      <div className="px-12 py-8 flex items-center justify-between border-b border-slate-50 bg-slate-50/30">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 relative">
             <img src="/logo_niger.png" alt="Coat of Arms" className="w-full h-full object-contain" onError={(e) => {
                (e.target as any).src = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Coat_of_arms_of_Niger.svg/1200px-Coat_of_arms_of_Niger.svg.png";
             }} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 tracking-tighter uppercase">République du Niger</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Ministère de l'Éducation Nationale</p>
          </div>
        </div>

        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-4 mb-1">
            <div className="h-px w-8 bg-amber-400 rounded-full" />
            <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Emploi du Temps</h1>
            <div className="h-px w-8 bg-amber-400 rounded-full" />
          </div>
          <div className="inline-flex items-center px-8 py-2.5 rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-100">
            <span className="text-xs font-black uppercase tracking-widest">
              {mode === "class" ? "Classe" : mode === "teacher" ? "Enseignant" : "Unité Pédagogique (UP)"} : {title}
            </span>
          </div>
        </div>

        <div className="text-right flex flex-col items-end gap-2">
          <h3 className="text-sm font-black text-slate-800 tracking-tighter uppercase">Établissement d'Excellence</h3>
          <div className="flex items-center gap-1 text-amber-400">
            <Star size={14} fill="currentColor" />
          </div>
        </div>
      </div>

      {/* Info Bar */}
      <div className="px-12 py-4 flex items-center justify-center gap-12 bg-white border-b border-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Calendar size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Année Scolaire</p>
            <p className="text-sm font-bold text-slate-700">2024 - 2025</p>
          </div>
        </div>
        <div className="h-8 w-px bg-slate-100" />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Imprimé le</p>
            <p className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
      </div>

      {/* Main Grid Container */}
      <div className="p-8 flex-1 overflow-x-auto custom-scrollbar">
        <div className="min-w-[1000px] border-2 border-slate-900 rounded-[2rem] overflow-hidden bg-white shadow-xl shadow-slate-100/50">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#1A1F2E] text-white">
                <th className="py-6 px-4 border-r border-slate-700/50 w-32">
                  <div className="flex flex-col items-center gap-1">
                    <Clock size={18} className="text-indigo-400" />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Heures</span>
                  </div>
                </th>
                {days.map(day => (
                  <th key={day} className="py-6 px-4 border-r border-slate-700/50">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-black uppercase tracking-[0.3em]">{day}</span>
                      <Calendar size={14} className="opacity-40" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: periods }).map((_, idx) => {
                const pNum = idx + 1;
                const isRecess = pNum === recessAfter + 1;
                const timeRange = getTimeLabel(pNum);

                return (
                  <React.Fragment key={pNum}>
                    {isRecess && (
                      <tr className="bg-indigo-50/50">
                        <td colSpan={days.length + 1} className="py-4 px-4 border-y border-slate-100">
                          <div className="flex items-center justify-center gap-6">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-indigo-200" />
                            <div className="flex items-center gap-4 text-indigo-600">
                              <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                                <Coffee size={20} />
                              </div>
                              <span className="text-sm font-black uppercase tracking-[0.5em]">Récréation</span>
                            </div>
                            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-indigo-200" />
                          </div>
                        </td>
                      </tr>
                    )}
                    <tr className="group">
                      <td className="py-6 px-4 border-r border-slate-100 bg-slate-50/20 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                           <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-[10px] font-black text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                             H{pNum}
                           </div>
                           <span className="text-[10px] font-black text-slate-400 mt-1">{timeRange}</span>
                        </div>
                      </td>
                      {days.map(day => {
                        const cells = getCellData(day, pNum);

                        return (
                          <td 
                            key={day} 
                            onDragOver={(e) => {
                              if (mode !== "up") e.preventDefault();
                            }}
                            onDrop={async (e) => {
                              if (mode === "up") return;
                              const entryIdStr = e.dataTransfer.getData("text/plain");
                              if (!entryIdStr) return;
                              const entryId = Number(entryIdStr);
                              try {
                                const { moveTimetableEntry } = await import("@/domains/academics/actions/timetable.actions");
                                const res = await moveTimetableEntry(entryId, day, pNum);
                                if (!res.success) {
                                  alert(res.error || "Erreur lors du déplacement.");
                                } else if (onRefresh) {
                                  onRefresh();
                                }
                              } catch (err: any) {
                                alert(err.message || "Erreur lors du déplacement.");
                              }
                            }}
                            className="p-2 border-r border-slate-50 align-top transition-colors hover:bg-indigo-50/20"
                          >
                            {cells.length > 0 ? (
                              <div className="flex flex-col gap-2">
                                {cells.map((cell) => {
                                  const theme = getSubjectTheme(cell?.subject?.subjectName || "");
                                  const Icon = theme.icon;
                                  return (
                                    <div 
                                      key={cell.id} 
                                      draggable={mode !== "up"}
                                      onDragStart={(e) => {
                                        e.dataTransfer.setData("text/plain", String(cell.id));
                                      }}
                                      className={cn(
                                        "rounded-2xl p-4 flex flex-col gap-2 transition-all duration-300 hover:shadow-lg relative overflow-hidden group/cell cursor-grab active:cursor-grabbing",
                                        theme.bg
                                      )}
                                    >
                                      <div className={cn("absolute top-0 left-0 w-1.5 h-full opacity-60", theme.color.replace('text-', 'bg-'))} />
                                      <div className="flex items-start justify-between">
                                        <div className={cn("p-2 rounded-xl bg-white shadow-sm", theme.color)}>
                                          <Icon size={16} />
                                        </div>
                                      </div>
                                      <div className="mt-1">
                                        <h4 className={cn("text-xs font-black leading-tight uppercase tracking-tight", theme.color)}>
                                          {cell.subject?.subjectName}
                                        </h4>
                                        <p className="text-[10px] font-bold text-slate-600 mt-1 flex items-center gap-1 uppercase tracking-widest opacity-80">
                                          <User size={10} className="opacity-50" />
                                          {mode === "class" ? cell.teacher?.nom : `${cell.teacher?.nom || "Prof"} • ${getClassDisplayName(cell.class)}`}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="h-24 rounded-2xl border border-dashed border-slate-100 bg-slate-50/30" />
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
        </div>
      </div>

      {/* Legend Footer */}
      <div className="px-12 py-8 bg-slate-50/50 border-t border-slate-100">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
           {Object.keys(SUBJECT_THEMES).slice(0, 8).map(key => {
             const theme = SUBJECT_THEMES[key];
             const Icon = theme.icon;
             return (
               <div key={key} className="flex items-center gap-3 group">
                 <div className={cn("p-2 rounded-xl bg-white shadow-sm group-hover:scale-110 transition-transform", theme.color)}>
                   <Icon size={14} />
                 </div>
                 <div>
                   <p className="text-[10px] font-black text-slate-800 leading-none">{key}</p>
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 opacity-60">Matière pédagogique</p>
                 </div>
               </div>
             )
           })}
        </div>
        
        <div className="mt-8 pt-6 border-t border-slate-200/50 flex items-center justify-center gap-2 text-slate-400 italic font-medium text-[10px]">
          <Info size={12} className="text-slate-300" />
          Les horaires sont susceptibles d'être modifiés. Veuillez consulter régulièrement les mises à jour.
        </div>
      </div>
    </div>
  );
}
