"use client";

import * as React from "react";
import {
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  BookOpen,
  BrainCircuit,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  LayoutGrid,
  Maximize2,
  Minimize2,
  PanelLeft,
  PanelRight,
  Printer,
  Settings2,
  Sparkles,
  TrendingUp,
  Wand2,
  Zap,
} from "lucide-react";
import ModernTimetable from "./ModernTimetable";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  deleteTimetableEntry,
  getGlobalOccupancy,
  getTimetableEntries,
  getTimetableSettings,
  runAISolver,
  saveTimetableEntry,
} from "@/domains/academics/actions/timetable.actions";
import { getPedagogicalUnitTimetable } from "@/domains/academics/actions/pedagogical-units.actions";
import {
  AssignmentsDialog,
  ConstraintsDialog,
  PrintOptionsDialog,
  TimetableSettingsDialog,
} from "@/app/dashboard/settings/components/TimetableDialogs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getClassDisplayName } from "@/domains/academics/utils/class-name";

type TimetableEntry = {
  id: number;
  sessionId?: number | null;
  classId?: number | null;
  employeeId?: number | null;
  subjectId?: number | null;
  dayName: string;
  periodNumber: number;
  roomName?: string | null;
  subject?: { subjectName?: string | null } | null;
  teacher?: { nom?: string | null } | null;
  class?: { className?: string | null } | null;
};

type TimetableSettings = {
  days: string;
  periods: number;
  recessAfter?: number | null;
  recessDuration?: number | null;
  periodDuration?: number | null;
  dayStart?: string | null;
};

type Props = {
  classes: Array<{ id: number; className: string }>;
  teachers: Array<{ id: number; nom: string }>;
  subjects: Array<{ id: number; subjectName: string }>;
  currentSession: { id: number; sessionName: string };
  pedagogicalUnits?: any[];
};

const DEFAULT_SETTINGS: TimetableSettings = {
  days: "Lundi,Mardi,Mercredi,Jeudi,Vendredi",
  periods: 6,
  recessAfter: 0,
  recessDuration: 30,
  periodDuration: 60,
  dayStart: "07:30",
};

const DAY_ABBR: Record<string, string> = {
  Lundi: "LUNDI",
  Mardi: "MARDI",
  Mercredi: "MERCREDI",
  Jeudi: "JEUDI",
  Vendredi: "VENDREDI",
  Samedi: "SAMEDI",
  Dimanche: "DIMANCHE",
};

function coerceSettings(data: unknown): TimetableSettings {
  const d = (data ?? {}) as Partial<TimetableSettings>;
  return {
    days: typeof d.days === "string" ? d.days : DEFAULT_SETTINGS.days,
    periods: typeof d.periods === "number" ? d.periods : DEFAULT_SETTINGS.periods,
    recessAfter: typeof d.recessAfter === "number" ? d.recessAfter : DEFAULT_SETTINGS.recessAfter,
    recessDuration: typeof d.recessDuration === "number" ? d.recessDuration : DEFAULT_SETTINGS.recessDuration,
    periodDuration: typeof d.periodDuration === "number" ? d.periodDuration : DEFAULT_SETTINGS.periodDuration,
    dayStart: typeof d.dayStart === "string" ? d.dayStart : DEFAULT_SETTINGS.dayStart,
  };
}

function coerceEntries(data: unknown): TimetableEntry[] {
  if (!Array.isArray(data)) return [];
  return data as TimetableEntry[];
}

function coerceGlobal(data: unknown): { entries: TimetableEntry[]; totalClasses: number } | null {
  const d = data as { entries?: unknown; totalClasses?: unknown } | null;
  if (!d) return null;
  const totalClasses = Number.isFinite(Number(d.totalClasses)) ? Number(d.totalClasses) : 0;
  return { entries: coerceEntries(d.entries), totalClasses };
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

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function normalizeDayLabel(day: string) {
  return DAY_ABBR[day] || day.toUpperCase();
}

function computeOccupancy(settings: TimetableSettings, days: string[], entries: TimetableEntry[]) {
  const periods = settings.periods || 6;
  const recess = settings.recessAfter || 0;
  const availableSlots = days.length * (periods - (recess ? 1 : 0));
  const filled = entries.filter((e) => e.periodNumber !== recess).length;
  const percent = availableSlots > 0 ? Math.round((filled / availableSlots) * 100) : 0;
  return { availableSlots, filled, percent };
}

function subjectDistribution(entries: TimetableEntry[]) {
  const total = entries.length || 1;
  const buckets: Array<{ label: string; color: string; filter: (n: string) => boolean }> = [
    { label: "Maths", color: "#7c3aed", filter: (n) => /math|alg|geo/i.test(n) },
    { label: "Langues", color: "#2563eb", filter: (n) => /fran|anglais|arab|lang/i.test(n) },
    { label: "Sciences", color: "#16a34a", filter: (n) => /svt|phys|chim|science/i.test(n) },
    { label: "Humanités", color: "#f59e0b", filter: (n) => /hist|geo|philo|hg/i.test(n) },
    { label: "Tech & Arts", color: "#a855f7", filter: (n) => /tech|info|art|plast|music/i.test(n) },
  ];

  const counts = new Map<string, number>();
  for (const e of entries) {
    const name = e.subject?.subjectName || "Autres";
    const bucket = buckets.find((b) => b.filter(name))?.label || "EPS & Autres";
    counts.set(bucket, (counts.get(bucket) || 0) + 1);
  }

  const palette: Record<string, string> = Object.fromEntries(buckets.map((b) => [b.label, b.color]));
  palette["EPS & Autres"] = "#ef4444";

  return Array.from(counts.entries())
    .map(([label, value]) => ({
      label,
      value,
      percent: Math.round((value / total) * 100),
      color: palette[label] || "#94a3b8",
    }))
    .sort((a, b) => b.value - a.value);
}

function weeklyBars(days: string[], settings: TimetableSettings, entries: TimetableEntry[]) {
  const periods = settings.periods || 6;
  const recess = settings.recessAfter || 0;
  const max = periods - (recess ? 1 : 0);

  const map = new Map<string, number>();
  for (const d of days) map.set(d, 0);
  for (const e of entries) {
    if (e.periodNumber === recess) continue;
    map.set(e.dayName, (map.get(e.dayName) || 0) + 1);
  }

  return days.map((d) => ({
    day: d[0] || d,
    value: map.get(d) || 0,
    max,
  }));
}

function timeRangeForPeriod(settings: TimetableSettings, period: number) {
  const start = parseTimeToMinutes(settings.dayStart || "07:30");
  const dur = settings.periodDuration || 60;

  // Match the screenshot feel: a short pause after H2, lunch after H4.
  const shortPauseAfter = 2;
  const shortPauseMinutes = 15;
  const lunchAfter = 4;
  const lunchMinutes = 90;

  let offset = 0;
  if (period >= shortPauseAfter + 1) offset += shortPauseMinutes;
  if (period >= lunchAfter + 1) offset += lunchMinutes;

  const pStart = start + (period - 1) * dur + offset;
  const pEnd = pStart + dur;
  return `${minutesToTime(pStart)} - ${minutesToTime(pEnd)}`;
}

function StatTile({
  label,
  value,
  sub,
  icon,
  spark,
  sparkColor,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  spark?: number[];
  sparkColor?: string;
}) {
  return (
    <div className="rounded-[20px] bg-white/[0.03] border border-white/[0.08] px-6 py-5 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
          <p className="mt-2 text-3xl font-black text-white tracking-tight">{value}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{sub}</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 grid place-items-center text-indigo-300">
          {icon}
        </div>
      </div>
      {spark && sparkColor ? (
        <div className="mt-4 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <ReBarChart
              data={spark.map((v, i) => ({ i, v }))}
              margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
              barCategoryGap="30%"
            >
              <Bar dataKey="v" fill={sparkColor} opacity={0.9} radius={[10, 10, 10, 10]} barSize={8} />
            </ReBarChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  sub,
  color = "text-slate-300",
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  color?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-5 p-5 rounded-[1.8rem] hover:bg-white/[0.03] border border-transparent hover:border-white/[0.05] transition-all duration-500 group relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div
        className={cn(
          "w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 border border-white/5 relative z-10",
          color
        )}
      >
        {icon}
      </div>
      <div className="text-left relative z-10">
        <div className="text-sm font-black text-white group-hover:text-indigo-300 transition-colors tracking-tight">{label}</div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{sub}</div>
      </div>
    </button>
  );
}

function TimetableCell({
  mode,
  cell,
  onDelete,
  onOpen,
}: {
  mode: "class" | "teacher" | "global" | "up";
  cell?: TimetableEntry | null;
  onDelete: (id: number) => void;
  onOpen: () => void;
}) {
  if (mode === "global") {
    // For global view we render a placeholder; occupancy is painted by parent.
    return <div className="group relative h-28 rounded-[24px] bg-white/[0.03] border border-white/[0.07] flex items-center justify-center" />;
  }

  return (
    <div
      role={mode !== "teacher" ? "button" : undefined}
      tabIndex={mode !== "teacher" ? 0 : undefined}
      draggable={!!cell && mode !== "up" && mode !== "teacher"}
      onDragStart={(e) => {
        if (cell) e.dataTransfer.setData("text/plain", String(cell.id));
      }}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
      className={cn(
        "group relative h-28 rounded-[24px] border transition-all duration-500 flex flex-col items-center justify-center p-5 gap-2 overflow-hidden",
        cell
          ? mode === "teacher"
            ? "bg-indigo-500/10 border-indigo-500/30 shadow-[0_10px_30px_rgba(99,102,241,0.10)]"
            : "bg-indigo-500/10 border-indigo-500/30 shadow-[0_10px_30px_rgba(99,102,241,0.10)] hover:bg-indigo-500/15 hover:border-indigo-500/50 hover:scale-[1.02] cursor-grab active:cursor-grabbing"
          : "bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.06] hover:border-white/[0.15]"
      )}
    >
      {cell ? (
        <>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500/50 to-purple-500/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-1 group-hover:scale-110 transition-transform duration-500">
            <BookOpen size={16} className="text-indigo-300" />
          </div>
          <span className="text-xs font-black text-white uppercase tracking-[0.08em] text-center leading-tight">
            {cell.subject?.subjectName || "Cours"}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-70">
            {mode === "teacher"
              ? getClassDisplayName(cell.class)
              : mode === "up"
              ? `${cell.teacher?.nom || "Prof"} • ${getClassDisplayName(cell.class)}`
              : cell.teacher?.nom || "Prof"}
          </span>
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest opacity-60">
            {cell.roomName ? `Salle ${cell.roomName}` : "Salle —"}
          </span>

          {mode !== "teacher" && (
          <div className="absolute bottom-4 flex gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Supprimer cette séance ?")) onDelete(cell.id);
              }}
              className="w-9 h-9 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-slate-400 hover:text-rose-300 hover:bg-rose-500/20 transition-all"
              aria-label="Supprimer"
              title="Supprimer"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>
          )}
        </>
      ) : (
        mode !== "teacher" ? (
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-dashed border-white/10 flex items-center justify-center">
              <span className="text-2xl text-slate-600">+</span>
            </div>
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Slot Libre</span>
          </div>
        ) : null
      )}
    </div>
  );
}

export default function IntelligentTimetable({ classes, teachers, subjects, currentSession, pedagogicalUnits = [] }: Props) {
  const [viewMode, setViewMode] = React.useState<"class" | "teacher" | "global" | "up">("class");
  const [selectedId, setSelectedId] = React.useState<number | null>(classes[0]?.id || null);
  const [lastClassId, setLastClassId] = React.useState<number | null>(classes[0]?.id || null);
  const [lastTeacherId, setLastTeacherId] = React.useState<number | null>(teachers[0]?.id || null);
  const [lastUpId, setLastUpId] = React.useState<number | null>(pedagogicalUnits[0]?.id || null);
  const [entries, setEntries] = React.useState<TimetableEntry[]>([]);
  const [settings, setSettings] = React.useState<TimetableSettings>(DEFAULT_SETTINGS);
  const [globalData, setGlobalData] = React.useState<{ entries: TimetableEntry[]; totalClasses: number } | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [isAiLoading, setIsAiLoading] = React.useState(false);

  // UI states
  const [compactView, setCompactView] = React.useState(false);
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const [updatedAgoLabel, setUpdatedAgoLabel] = React.useState<string>("—");
  const [showModernView, setShowModernView] = React.useState(true); // Default to true for user's request
  const [isWideView, setIsWideView] = React.useState(true); // Wide Screen Mode by default
  const [showLeftSidebar, setShowLeftSidebar] = React.useState(false); // Collapsed by default in wide view for maximum width
  const [showRightSidebar, setShowRightSidebar] = React.useState(false); // Collapsed by default in wide view for maximum width

  // Dialog states
  const [showConstraints, setShowConstraints] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showAssignments, setShowAssignments] = React.useState(false);
  const [showPrintOptions, setShowPrintOptions] = React.useState(false);

  const [entryDialogOpen, setEntryDialogOpen] = React.useState(false);
  const [entryDraft, setEntryDraft] = React.useState<{
    id?: number;
    classId: number | null;
    employeeId: number | null;
    subjectId: number | null;
    roomName: string;
    dayName: string;
    periodNumber: number;
  } | null>(null);

  const setMode = React.useCallback(
    (mode: "class" | "teacher" | "global" | "up") => {
      setViewMode(mode);
      if (mode === "global") {
        setSelectedId(null);
        return;
      }
      if (mode === "class") {
        const next = lastClassId ?? classes[0]?.id ?? null;
        setSelectedId(next);
        return;
      }
      if (mode === "teacher") {
        const next = lastTeacherId ?? teachers[0]?.id ?? null;
        setSelectedId(next);
        return;
      }
      const next = lastUpId ?? pedagogicalUnits[0]?.id ?? null;
      setSelectedId(next);
    },
    [classes, teachers, pedagogicalUnits, lastClassId, lastTeacherId, lastUpId]
  );

  const days = React.useMemo(() => (settings.days || DEFAULT_SETTINGS.days).split(",").map((d) => d.trim()).filter(Boolean), [settings.days]);
  const periods = settings.periods || DEFAULT_SETTINGS.periods;

  const refresh = React.useCallback(async () => {
    const sRes = await getTimetableSettings(viewMode === "class" ? selectedId ?? undefined : undefined);
    if (sRes.success) setSettings(coerceSettings(sRes.data));

    if (viewMode === "global") {
      const gRes = await getGlobalOccupancy();
      if (gRes.success) setGlobalData(coerceGlobal(gRes.data));
      setEntries([]);
      setLastUpdated(new Date());
      return;
    }

    if (viewMode === "up") {
      if (selectedId) {
        const upRes = await getPedagogicalUnitTimetable(selectedId);
        if (upRes.success) setEntries(coerceEntries(upRes.data));
      } else {
        setEntries([]);
      }
      setLastUpdated(new Date());
      return;
    }

    if (!selectedId) {
      setEntries([]);
      setLastUpdated(new Date());
      return;
    }

    const eRes = await getTimetableEntries(viewMode as "class" | "teacher", selectedId);
    if (eRes.success) setEntries(coerceEntries(eRes.data));
    setLastUpdated(new Date());
  }, [viewMode, selectedId]);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      await refresh();
      if (cancelled) return;
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedId, showSettings, showAssignments]);

  React.useEffect(() => {
    function updateLabel() {
      if (!lastUpdated) return setUpdatedAgoLabel("—");
      const minutes = Math.max(1, Math.round((Date.now() - lastUpdated.getTime()) / 60000));
      setUpdatedAgoLabel(`Dernière mise à jour : il y a ${minutes} min`);
    }
    updateLabel();
    const t = setInterval(updateLabel, 60_000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  const recess = settings.recessAfter || 0;

  const occupancy = React.useMemo(() => computeOccupancy(settings, days, entries), [settings, days, entries]);
  const uniqueSubjects = React.useMemo(() => new Set(entries.map((e) => e.subjectId).filter(Boolean)).size, [entries]);
  const conflicts = React.useMemo(() => {
    // Conflicts are computed within the loaded scope (class/teacher).
    // If you see duplicates at same day/period, we count them.
    const map = new Map<string, number>();
    for (const e of entries) {
      const key = `${e.dayName}_${e.periodNumber}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.values()).filter((n) => n > 1).reduce((a, b) => a + (b - 1), 0);
  }, [entries]);

  const weeklyHours = React.useMemo(() => {
    const dur = settings.periodDuration || 60;
    const count = entries.filter((e) => e.periodNumber !== recess).length;
    return Math.round((count * dur) / 60);
  }, [entries, settings.periodDuration, recess]);

  const distribution = React.useMemo(() => subjectDistribution(entries), [entries]);
  const bars = React.useMemo(() => weeklyBars(days, settings, entries), [days, settings, entries]);
  const roomCount = React.useMemo(
    () => new Set(entries.map((e) => e.roomName).filter(Boolean)).size,
    [entries]
  );

  const globalOccupancyMap = React.useMemo(() => {
    if (!globalData) return null;
    const map = new Map<string, number>();
    for (const e of globalData.entries || []) {
      const key = `${e.dayName}_${e.periodNumber}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [globalData]);

  const handleRunAI = async () => {
    if (!currentSession?.id) {
      alert("Erreur : Aucune session active sélectionnée.");
      return;
    }
    if (!confirm("Lancer l'IA pour générer l'emploi du temps ? Cela écrasera les données actuelles.")) return;

    setIsAiLoading(true);
    startTransition(async () => {
      try {
        const res = await runAISolver({
          sessionId: currentSession.id,
          classId: viewMode === "class" && selectedId ? selectedId : undefined,
          strategy: "balanced",
          overwriteExisting: true,
        });
        setIsAiLoading(false);
        if ((res as any).success || (res as any).data?.success) {
          alert("Optimisation terminée : " + ((res as any).message || (res as any).data?.message || ""));
          await refresh();
        } else {
          alert("Erreur IA : " + ((res as any).error || (res as any).data?.error || ""));
        }
      } catch (error: unknown) {
        setIsAiLoading(false);
        const msg = error instanceof Error ? error.message : "Erreur inconnue";
        alert("Erreur critique lors de la génération : " + msg);
      }
    });
  };

  const handlePrintCurrent = async () => {
    if (viewMode === "global" || viewMode === "up") {
      return alert("L'impression PDF n'est pas disponible pour la vue Globale ou UP.");
    }
    if (!selectedId) return alert("Aucune sélection active.");
    
    try {
      const { generateTimetablePDF } = await import('@/domains/academics/utils/timetable-pdf');
      await generateTimetablePDF({
        type: 'current',
        id: selectedId,
        mode: viewMode as 'class' | 'teacher'
      });
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'impression.");
    }
  };

  const getCellData = (day: string, periodNumber: number) => entries.filter((e) => e.dayName === day && e.periodNumber === periodNumber);

  const handleDelete = (id: number) => {
    // Delete is not allowed from teacher view (read-only)
    if (viewMode === "teacher") return;
    startTransition(async () => {
      await deleteTimetableEntry(id);
      await refresh();
    });
  };

  const openEntryDialog = React.useCallback(
    (dayName: string, periodNumber: number, cell: TimetableEntry | null) => {
      if (viewMode === "global" || viewMode === "up") return;

      // In teacher view, the timetable is READ-ONLY.
      // Adding or editing sessions must be done from the class view.
      if (viewMode === "teacher") return;

      const fallbackClassId = lastClassId ?? classes[0]?.id ?? null;
      const fallbackTeacherId = lastTeacherId ?? teachers[0]?.id ?? null;
      const fallbackSubjectId = subjects[0]?.id ?? null;

      if (cell) {
        setEntryDraft({
          id: cell.id,
          classId: (cell.classId ?? fallbackClassId) as number | null,
          employeeId: (cell.employeeId ?? fallbackTeacherId) as number | null,
          subjectId: (cell.subjectId ?? fallbackSubjectId) as number | null,
          roomName: cell.roomName ? String(cell.roomName) : "",
          dayName: cell.dayName,
          periodNumber: cell.periodNumber,
        });
      } else {
        setEntryDraft({
          classId: fallbackClassId,
          employeeId: fallbackTeacherId,
          subjectId: fallbackSubjectId,
          roomName: "",
          dayName,
          periodNumber,
        });
      }
      setEntryDialogOpen(true);
    },
    [classes, teachers, subjects, viewMode, selectedId, lastClassId, lastTeacherId]
  );

  const saveDraft = React.useCallback(async () => {
    if (!entryDraft) return;
    if (!currentSession?.id) return alert("Aucune session active.");
    if (!entryDraft.classId || !entryDraft.employeeId || !entryDraft.subjectId) {
      return alert("Veuillez sélectionner la classe, le professeur et la matière.");
    }
    const payload = {
      id: entryDraft.id,
      sessionId: currentSession.id,
      classId: entryDraft.classId,
      employeeId: entryDraft.employeeId,
      subjectId: entryDraft.subjectId,
      dayName: entryDraft.dayName,
      periodNumber: entryDraft.periodNumber,
      roomName: entryDraft.roomName || null,
    };

    const res = await saveTimetableEntry(payload);
    if (!res.success) {
      alert(res.error || "Erreur lors de l'enregistrement.");
      return;
    }
    setEntryDialogOpen(false);
    setEntryDraft(null);
    await refresh();
  }, [entryDraft, currentSession.id, refresh]);

  const weekLabel = React.useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() + weekOffset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 4);
    const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")} ${d.toLocaleString("fr-FR", { month: "short" })} ${d.getFullYear()}`;
    return `${fmt(start)} - ${fmt(end)}`;
  }, [weekOffset]);

  return (
    <div className="flex flex-col h-full bg-[#0E1018] text-slate-200 rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.55)] relative">
      {/* Background glows */}
      <div className="absolute top-0 left-0 w-[520px] h-[520px] bg-indigo-500/10 blur-[140px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[520px] h-[520px] bg-emerald-500/10 blur-[140px] rounded-full translate-x-1/2 translate-y-1/2 pointer-events-none" />

      {/* Dialogs */}
      <ConstraintsDialog open={showConstraints} onOpenChange={setShowConstraints} teachers={teachers} />
      <TimetableSettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      <AssignmentsDialog
        open={showAssignments}
        onOpenChange={setShowAssignments}
        classes={classes}
        teachers={teachers}
        subjects={subjects}
      />
      <PrintOptionsDialog
        open={showPrintOptions}
        onOpenChange={setShowPrintOptions}
        currentClassId={viewMode === "class" ? selectedId : lastClassId}
        currentTeacherId={viewMode === "teacher" ? selectedId : lastTeacherId}
        currentMode={viewMode}
        selectedName={
          viewMode === "class"
            ? classes.find((c) => c.id === (selectedId || lastClassId))?.className
            : viewMode === "teacher"
            ? teachers.find((t) => t.id === (selectedId || lastTeacherId))?.nom
            : undefined
        }
      />

      <Dialog
        open={entryDialogOpen}
        onOpenChange={(open) => {
          setEntryDialogOpen(open);
          if (!open) setEntryDraft(null);
        }}
      >
        <DialogContent className="max-w-[520px] rounded-2xl bg-[#0B0D14] text-slate-200 border border-white/10 p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-white font-black">Séance</DialogTitle>
            <DialogDescription className="text-slate-400">
              {entryDraft ? `${entryDraft.dayName} • H${entryDraft.periodNumber}` : ""}
            </DialogDescription>
          </DialogHeader>

          {entryDraft ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Classe</label>
                <select
                  className="w-full h-11 rounded-xl bg-black/40 border border-white/10 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/30"
                  value={entryDraft.classId ?? ""}
                  onChange={(e) =>
                    setEntryDraft((d) => (d ? { ...d, classId: Number(e.target.value) } : d))
                  }
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {getClassDisplayName(c)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Professeur</label>
                <select
                  className="w-full h-11 rounded-xl bg-black/40 border border-white/10 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/30"
                  value={entryDraft.employeeId ?? ""}
                  onChange={(e) =>
                    setEntryDraft((d) => (d ? { ...d, employeeId: Number(e.target.value) } : d))
                  }
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Matière</label>
                <select
                  className="w-full h-11 rounded-xl bg-black/40 border border-white/10 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/30"
                  value={entryDraft.subjectId ?? ""}
                  onChange={(e) =>
                    setEntryDraft((d) => (d ? { ...d, subjectId: Number(e.target.value) } : d))
                  }
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.subjectName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Salle</label>
                <Input
                  value={entryDraft.roomName}
                  onChange={(e) => setEntryDraft((d) => (d ? { ...d, roomName: e.target.value } : d))}
                  className="h-11 rounded-xl bg-black/40 border-white/10 text-slate-200 placeholder:text-slate-600"
                  placeholder="Ex: 12"
                />
              </div>
            </div>
          ) : null}

          <DialogFooter className="bg-transparent border-t border-white/10 mt-2">
            <Button
              variant="outline"
              className="h-11 rounded-xl border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
              onClick={() => setEntryDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button className="h-11 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-black" onClick={() => startTransition(saveDraft)}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5 bg-white/[0.04] backdrop-blur-3xl border-b border-white/10">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.8rem] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 ring-1 ring-white/20">
            <Calendar size={30} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white leading-tight">
              Emploi du Temps{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-300">
                Intelligent
              </span>
            </h1>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest flex items-center gap-3 mt-1 opacity-80">
              <Sparkles size={14} className="text-indigo-300" />
              v2.4.0 • {currentSession.sessionName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-black/40 p-3 rounded-[2rem] border border-white/5 shadow-inner">
          <div className="flex bg-white/5 rounded-2xl p-1.5 gap-1">
            {(["class", "teacher", "up", "global"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setMode(mode)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500",
                  viewMode === mode
                    ? "bg-indigo-500 text-white shadow-[0_5px_15px_rgba(99,102,241,0.4)] scale-105"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                )}
              >
                {mode === "class" ? "Classe" : mode === "teacher" ? "Prof" : mode === "up" ? "UP" : "Global"}
              </button>
            ))}
          </div>

          {viewMode !== "global" ? (
            <select
              value={selectedId || ""}
              onChange={(e) => {
                const next = Number(e.target.value);
                setSelectedId(next);
                if (viewMode === "class") setLastClassId(next);
                if (viewMode === "teacher") setLastTeacherId(next);
                if (viewMode === "up") setLastUpId(next);
              }}
              disabled={
                viewMode === "class" ? classes.length === 0 :
                viewMode === "teacher" ? teachers.length === 0 :
                (pedagogicalUnits || []).length === 0
              }
              className="bg-black/60 border border-white/5 rounded-2xl px-6 py-2.5 text-xs font-black text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/30 min-w-[220px] appearance-none cursor-pointer"
            >
              {viewMode === "class" ? (
                classes.length === 0 ? (
                  <option value="">Aucune classe</option>
                ) : (
                  classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {getClassDisplayName(c)}
                    </option>
                  ))
                )
              ) : viewMode === "teacher" ? (
                teachers.length === 0 ? (
                  <option value="">Aucun professeur</option>
                ) : (
                  teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom}
                    </option>
                  ))
                )
              ) : (
                (pedagogicalUnits || []).length === 0 ? (
                  <option value="">Aucune UP</option>
                ) : (
                  (pedagogicalUnits || []).map((up) => (
                    <option key={up.id} value={up.id}>
                      {up.name}
                    </option>
                  ))
                )
              )}
            </select>
          ) : null}

          {viewMode === "teacher" && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span className="text-[9px] font-black uppercase tracking-widest">Vue lecture seule</span>
            </div>
          )}


          <Button
            onClick={handleRunAI}
            disabled={isAiLoading}
            className="h-12 bg-indigo-500 hover:bg-indigo-600 text-white font-black px-8 rounded-2xl gap-3 shadow-xl shadow-indigo-500/20 group overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            {isAiLoading ? <Zap className="animate-spin" size={18} /> : <Wand2 size={18} />}
            Générer avec IA
          </Button>

          <div className="flex items-center gap-2 border-l border-white/10 pl-3">
            <button
              type="button"
              onClick={() => {
                const next = !isWideView;
                setIsWideView(next);
                if (next) {
                  setShowLeftSidebar(false);
                  setShowRightSidebar(false);
                } else {
                  setShowLeftSidebar(true);
                  setShowRightSidebar(true);
                }
              }}
              className={cn(
                "h-12 px-5 rounded-2xl border text-xs font-black flex items-center gap-2 transition-all duration-300",
                isWideView
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 border-indigo-300 text-white shadow-xl shadow-indigo-500/30 scale-105"
                  : "bg-black/40 border-white/10 text-slate-300 hover:bg-white/5"
              )}
              title="Basculer vers la vue الشاشة الشاملة الواسعة"
            >
              {isWideView ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              <span>{isWideView ? "Vue الشاملة (Wide)" : "Plein Écran"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowLeftSidebar((v) => !v)}
              className={cn(
                "h-12 px-4 rounded-2xl border text-xs font-black flex items-center gap-2 transition-all",
                showLeftSidebar
                  ? "bg-indigo-500/30 border-indigo-400 text-white shadow-md shadow-indigo-500/20"
                  : "bg-black/40 border-white/10 text-slate-400 hover:bg-white/5"
              )}
              title="Afficher/Masquer le panneau de configuration"
            >
              <PanelLeft className="size-4" />
              <span className="hidden xl:inline">Config</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRightSidebar((v) => !v)}
              className={cn(
                "h-12 px-4 rounded-2xl border text-xs font-black flex items-center gap-2 transition-all",
                showRightSidebar
                  ? "bg-indigo-500/30 border-indigo-400 text-white shadow-md shadow-indigo-500/20"
                  : "bg-black/40 border-white/10 text-slate-400 hover:bg-white/5"
              )}
              title="Afficher/Masquer le panneau Assistant IA & Stats"
            >
              <PanelRight className="size-4" />
              <span className="hidden xl:inline">Stats & IA</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Left sidebar */}
        {showLeftSidebar && (
          <aside className="w-72 bg-white/[0.03] backdrop-blur-2xl border-r border-white/[0.08] p-6 flex flex-col gap-8 overflow-y-auto custom-scrollbar shrink-0 transition-all duration-300">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-4">Configuration</h3>
              <div className="space-y-3">
                <ActionBtn icon={<LayoutGrid size={20} />} label="Affectations" sub="SYNC CURSUS" onClick={() => setShowAssignments(true)} />
                <ActionBtn
                  icon={<Settings2 size={20} />}
                  label="Règles"
                  sub="CONTRAINTES IA"
                  color="text-amber-300"
                  onClick={() => setShowConstraints(true)}
                />
                <ActionBtn icon={<Clock size={20} />} label="Stratégie" sub="JOURS / PÉRIODES" color="text-emerald-300" onClick={() => setShowSettings(true)} />
                <ActionBtn icon={<FileText size={20} />} label="Exporter PDF" sub="IMPRESSION BULK" color="text-indigo-300" onClick={() => setShowPrintOptions(true)} />
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.3em] px-4">Analyse</h3>
              <div className="grid grid-cols-1 gap-4">
                <MiniMetric label="Équité équipes" value="95%" tone="emerald" />
                <MiniMetric label="Équilibre" value="88%" tone="amber" />
                <MiniMetric label="Satisfaction" value="100%" tone="indigo" />
              </div>
            </div>

            <div className="mt-auto bg-gradient-to-br from-indigo-500/10 to-transparent rounded-[2.5rem] p-7 border border-white/[0.06] flex flex-col items-center text-center gap-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[40px] -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-all duration-700" />
              <div className="w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-2xl shadow-indigo-500/40 transform group-hover:rotate-12 transition-all duration-500">
                <BrainCircuit size={32} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-widest mb-2">Assistant IA</p>
                <p className="text-[10px] font-bold text-slate-400 leading-relaxed px-2">
                  Optimisation en temps réel des conflits et de l&apos;équité pédagogique.
                </p>
              </div>
              <Button
                variant="ghost"
                className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-indigo-300 hover:bg-indigo-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
              >
                Support stratégique
              </Button>
            </div>
          </aside>
        )}

        {/* Center + right columns */}
        <div className="flex-1 min-w-0 p-4 md:p-6 overflow-y-auto custom-scrollbar bg-[#0E1018]/60 backdrop-blur-sm">
          <div className={cn("h-full grid gap-6", showRightSidebar ? "grid-cols-1 xl:grid-cols-[1fr_380px]" : "grid-cols-1")}>
            {/* Center */}
            <section className="min-w-0 h-full flex flex-col gap-6">
              {/* Top stat cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                <StatTile label="Heures hebdomadaires" value={`${weeklyHours}h`} sub="Planifiées" icon={<Clock size={18} />} />
                <StatTile label="Matières" value={`${uniqueSubjects || subjects.length || 0}`} sub="Au programme" icon={<BookOpen size={18} />} />
                <StatTile label="Salles utilisées" value={`${roomCount}`} sub="Disponibles" icon={<LayoutGrid size={18} />} />
                <StatTile
                  label="Charge moyenne"
                  value={`${occupancy.percent}%`}
                  sub="Optimisée"
                  icon={<TrendingUp size={18} />}
                  spark={[32, 40, 38, 45, 55, 62, 58, 66, 71, 78, 82, occupancy.percent]}
                  sparkColor="#22c55e"
                />
                <StatTile label="Conflits" value={`${conflicts}`} sub="Détectés" icon={conflicts > 0 ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} />
              </div>

              {/* Timetable card */}
              <div className="flex-1 rounded-[24px] bg-white/[0.03] border border-white/[0.08] shadow-[0_20px_80px_rgba(0,0,0,0.45)] overflow-hidden flex flex-col min-h-0">
                <div className="px-6 py-4 border-b border-white/[0.06] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <p className="text-sm font-black text-white">Semaine en cours</p>
                    <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-2xl p-1">
                      <button
                        type="button"
                        onClick={() => setWeekOffset((v) => v - 1)}
                        className="w-10 h-9 rounded-xl hover:bg-white/5 text-slate-300 grid place-items-center"
                        aria-label="Semaine précédente"
                        title="Semaine précédente"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <div className="px-5 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center text-xs font-black text-slate-200">
                        {weekLabel}
                      </div>
                      <button
                        type="button"
                        onClick={() => setWeekOffset((v) => v + 1)}
                        className="w-10 h-9 rounded-xl hover:bg-white/5 text-slate-300 grid place-items-center"
                        aria-label="Semaine suivante"
                        title="Semaine suivante"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Action buttons right side */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrintCurrent}
                      className="h-9 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-indigo-300 gap-2 font-bold uppercase tracking-wider text-[10px]"
                    >
                      <Printer size={14} />
                      Imprimer
                    </Button>
                    <button
                      type="button"
                      onClick={() => setCompactView((v) => !v)}
                      className={cn(
                        "h-10 px-4 rounded-2xl border text-xs font-black flex items-center gap-2",
                        compactView
                          ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-200"
                          : "bg-black/40 border-white/10 text-slate-300 hover:bg-white/5"
                      )}
                    >
                      <Filter className="size-4 opacity-80" />
                      Vue compacte
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowModernView((v) => !v)}
                      className={cn(
                        "h-10 px-4 rounded-2xl border text-xs font-black flex items-center gap-2 transition-all",
                        showModernView
                          ? "bg-amber-500/20 border-amber-500/30 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                          : "bg-black/40 border-white/10 text-slate-300 hover:bg-white/5"
                      )}
                    >
                      <Sparkles className="size-4 opacity-80" />
                      Design Moderne
                    </button>
                    <button
                      type="button"
                      className="h-10 w-10 rounded-2xl bg-black/40 border border-white/10 text-slate-300 grid place-items-center hover:bg-white/5"
                      aria-label="Options"
                      title="Options"
                    >
                      <span className="text-xl leading-none">⋯</span>
                    </button>
                  </div>
                </div>

                <div className={cn("flex-1 overflow-auto custom-scrollbar p-6", compactView && "p-4")}>
                  {viewMode === "class" && classes.length === 0 ? (
                    <div className="h-full min-h-[420px] rounded-[24px] border border-dashed border-white/10 bg-black/20 flex items-center justify-center text-center p-8">
                      <div>
                        <p className="text-sm font-black text-white">Aucune classe trouvée</p>
                        <p className="mt-2 text-xs font-bold text-slate-500">
                          Créez les classes dans Académie ou vérifiez le niveau actif de l&apos;utilisateur.
                        </p>
                      </div>
                    </div>
                  ) : showModernView && viewMode !== "global" ? (
                    <ModernTimetable 
                        mode={viewMode}
                        title={viewMode === "class"
                        ? getClassDisplayName(classes.find(c => c.id === selectedId), "Inconnue")
                        : viewMode === "teacher"
                        ? teachers.find(t => t.id === selectedId)?.nom || "Inconnu"
                        : (pedagogicalUnits || []).find(up => up.id === selectedId)?.name || "Unité Pédagogique"
                      }
                      entries={entries}
                      settings={settings}
                      onRefresh={refresh}
                      onPrint={handlePrintCurrent}
                    />
                  ) : (
                    <div
                      className="grid gap-3 md:gap-4 overflow-x-auto"
                      style={{ gridTemplateColumns: `minmax(70px, 95px) repeat(${days.length}, minmax(130px, 1fr))` }}
                    >
                      <div className="h-10" />
                      {days.map((d) => (
                        <div key={d} className="pb-2 text-center border-b border-white/[0.04]">
                          <span className="text-[11px] font-black text-indigo-300/90 uppercase tracking-[0.4em] drop-shadow-[0_0_10px_rgba(99,102,241,0.25)]">
                            {normalizeDayLabel(d)}
                          </span>
                        </div>
                      ))}

                      {Array.from({ length: periods }).map((_, pIdx) => {
                        const pNum = pIdx + 1;
                        const isLunch = pNum === 4; // Lunch bar after H4 like screenshot
                        const timeLabel = timeRangeForPeriod(settings, pNum);

                        return (
                          <React.Fragment key={pNum}>
                            <div className="flex flex-col items-center justify-center text-slate-500 gap-1 border-r border-white/[0.04] pr-4">
                              <span className="text-sm font-black text-slate-400">H{pNum}</span>
                              <div className="w-10 h-px bg-white/8" />
                              <span className="text-[10px] font-black opacity-50">{timeLabel}</span>
                            </div>

                            {days.map((d) => {
                              const cells = viewMode === "global" ? [] : getCellData(d, pNum);
                              const occ = viewMode === "global" && globalOccupancyMap ? globalOccupancyMap.get(`${d}_${pNum}`) || 0 : 0;
                              const total = globalData?.totalClasses || 1;
                              const occPct = viewMode === "global" ? Math.round((occ / total) * 100) : 0;

                              return (
                                <div 
                                  key={`${d}_${pNum}`} 
                                  onDragOver={(e) => {
                                    if (viewMode !== "up") e.preventDefault();
                                  }}
                                  onDrop={async (e) => {
                                    if (viewMode === "up") return;
                                    const entryIdStr = e.dataTransfer.getData("text/plain");
                                    if (!entryIdStr) return;
                                    const entryId = Number(entryIdStr);
                                    try {
                                      const { moveTimetableEntry } = await import("@/domains/academics/actions/timetable.actions");
                                      const res = await moveTimetableEntry(entryId, d, pNum);
                                      if (!res.success) {
                                        alert(res.error || "Erreur lors du déplacement.");
                                      } else {
                                        await refresh();
                                      }
                                    } catch (err: any) {
                                      alert(err.message || "Erreur lors du déplacement.");
                                    }
                                  }}
                                  className="relative transition-all duration-300 hover:bg-indigo-500/5 rounded-[24px]"
                                >
                                  {viewMode === "global" ? (
                                    <div
                                      className={cn(
                                        "h-28 rounded-[24px] border flex items-center justify-center text-sm font-black",
                                        "bg-white/[0.03] border-white/[0.08]"
                                      )}
                                    >
                                      <div className="absolute inset-0 rounded-[24px] overflow-hidden">
                                        <div
                                          className="absolute inset-0"
                                          style={{
                                            background: `radial-gradient(circle at 30% 30%, rgba(99,102,241,${0.10 +
                                              occPct / 400}) 0%, rgba(0,0,0,0) 60%)`,
                                          }}
                                        />
                                        <div
                                          className="absolute inset-0"
                                          style={{
                                            background: `linear-gradient(90deg, rgba(34,197,94,0.0), rgba(34,197,94,${occPct /
                                              250}))`,
                                          }}
                                        />
                                      </div>
                                      <div className="relative text-slate-200">
                                        {occPct}% <span className="text-xs text-slate-500 font-bold">occup.</span>
                                      </div>
                                    </div>
                                  ) : viewMode === "up" ? (
                                    <div className="flex flex-col gap-2">
                                      {cells.map((cell) => (
                                        <TimetableCell
                                          key={cell.id}
                                          mode={viewMode}
                                          cell={cell}
                                          onDelete={handleDelete}
                                          onOpen={() => openEntryDialog(d, pNum, cell)}
                                        />
                                      ))}
                                      {cells.length === 0 && (
                                        <TimetableCell
                                          mode={viewMode}
                                          cell={null}
                                          onDelete={handleDelete}
                                          onOpen={() => openEntryDialog(d, pNum, null)}
                                        />
                                      )}
                                    </div>
                                  ) : (
                                    <TimetableCell
                                      mode={viewMode}
                                      cell={cells[0] || null}
                                      onDelete={handleDelete}
                                      onOpen={() => openEntryDialog(d, pNum, cells[0] || null)}
                                    />
                                  )}
                                </div>
                              );
                            })}

                            {isLunch ? (
                              <div className="col-span-full py-4">
                                <div className="h-14 rounded-[22px] border border-amber-500/15 bg-amber-500/[0.04] flex items-center justify-center gap-4 overflow-hidden relative">
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/[0.06] to-transparent -translate-x-full animate-[slide_2.5s_linear_infinite]" />
                                  <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 grid place-items-center">
                                    <span className="text-amber-300 text-lg">☕</span>
                                  </div>
                                  <span className="text-xs font-black text-amber-300/80 uppercase tracking-[0.35em]">
                                    Pause déjeuner • 12h00 - 13h30
                                  </span>
                                </div>
                              </div>
                            ) : null}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between gap-4">
                  <div className="text-xs font-bold text-slate-500 flex items-center gap-3">
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full bg-indigo-500" /> Salle
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full bg-amber-500" /> Cours
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full bg-rose-500" /> Laboratoire
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500" /> Atelier
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-xs text-slate-500 font-bold">
                      {updatedAgoLabel}
                    </div>
                    <button
                      type="button"
                      onClick={() => refresh()}
                      className="h-10 px-4 rounded-2xl bg-black/40 border border-white/10 text-slate-300 font-black text-xs flex items-center gap-2 hover:bg-white/5"
                    >
                      <Zap className={classNames("size-4", isPending && "animate-spin")} />
                      Actualiser
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Right sidebar */}
            {showRightSidebar && (
              <aside className="h-full overflow-auto custom-scrollbar space-y-6 shrink-0 transition-all duration-300">
                <div className="rounded-[24px] bg-white/[0.03] border border-white/[0.08] shadow-[0_20px_80px_rgba(0,0,0,0.45)] p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 grid place-items-center text-indigo-200">
                        <BrainCircuit className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">Assistant IA</p>
                        <p className="text-[11px] text-slate-400 font-bold mt-1">Optimisation en cours...</p>
                      </div>
                    </div>
                    <span className="h-7 px-3 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-[11px] font-black text-indigo-200">
                      Nouveau
                    </span>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                      <span>Ajustement des charges horaires</span>
                      <span className="text-slate-200">92%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full w-[92%] bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold">
                      Vérification des conflits et recommandations pédagogiques.
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    className="mt-5 w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-indigo-200 hover:bg-indigo-500 hover:text-white transition-all text-[11px] font-black"
                  >
                    <Sparkles className="size-4 mr-2" />
                    Voir les suggestions
                  </Button>
                </div>

                <div className="rounded-[24px] bg-white/[0.03] border border-white/[0.08] shadow-[0_20px_80px_rgba(0,0,0,0.45)] p-6">
                  <p className="text-sm font-black text-white">Statistiques</p>
                  <div className="mt-5 grid grid-cols-[180px_1fr] gap-6 items-center">
                    <div className="relative w-[180px] h-[180px] mx-auto">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={distribution}
                            dataKey="value"
                            nameKey="label"
                            innerRadius={60}
                            outerRadius={82}
                            stroke="transparent"
                            startAngle={90}
                            endAngle={-270}
                          >
                            {distribution.map((row, idx) => (
                              <Cell key={idx} fill={row.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 grid place-items-center">
                        <div className="text-center">
                          <p className="text-2xl font-black text-white">{weeklyHours}h</p>
                          <p className="text-xs font-bold text-slate-500 mt-1">Total</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {distribution.slice(0, 6).map((row) => (
                        <div key={row.label} className="flex items-center justify-between gap-3 text-xs font-bold">
                          <span className="inline-flex items-center gap-2 text-slate-300">
                            <span className="size-2 rounded-full" style={{ backgroundColor: row.color }} /> {row.label}
                          </span>
                          <span className="text-slate-500 tabular-nums">{row.percent}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] bg-white/[0.03] border border-white/[0.08] shadow-[0_20px_80px_rgba(0,0,0,0.45)] p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-white">Alertes & Notifications</p>
                    <button type="button" className="text-xs font-black text-indigo-200 hover:underline">
                      Tout voir
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    <AlertRow
                      tone="good"
                      title={conflicts === 0 ? "Aucun conflit détecté" : `${conflicts} conflit(s) détecté(s)`}
                      subtitle={conflicts === 0 ? "Excellent !" : "Vérifier les affectations"}
                    />
                    <AlertRow tone="warn" title="Charge de M. Hamissou (92%)" subtitle="Proche de la limite" />
                    <AlertRow tone="info" title="Salle 12 indisponible vendredi H6" subtitle="Remplacement suggéré" />
                  </div>
                </div>

                <div className="rounded-[24px] bg-white/[0.03] border border-white/[0.08] shadow-[0_20px_80px_rgba(0,0,0,0.45)] p-6">
                  <p className="text-sm font-black text-white">Aperçu Hebdomadaire</p>
                  <div className="mt-4 h-[170px]">
                    <WeeklyBarChart data={bars} />
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slide {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "amber" | "indigo";
}) {
  const color =
    tone === "emerald" ? "text-emerald-300" : tone === "amber" ? "text-amber-300" : "text-indigo-300";
  return (
    <div className="group bg-white/[0.02] hover:bg-white/[0.04] rounded-[22px] p-5 border border-white/[0.05] transition-all duration-500 shadow-lg">
      <div className="flex items-center justify-between text-slate-500 mb-2">
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
        <div className="p-2 rounded-xl bg-black/40 border border-white/5">
          <ActivityDot tone={tone} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className={cn("text-3xl font-black tracking-tighter", color)}>{value}</span>
        <div className="w-14 h-1 bg-white/5 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full bg-current", color)} style={{ width: value }} />
        </div>
      </div>
    </div>
  );
}

function ActivityDot({ tone }: { tone: "emerald" | "amber" | "indigo" }) {
  const cls =
    tone === "emerald"
      ? "bg-emerald-400"
      : tone === "amber"
      ? "bg-amber-400"
      : "bg-indigo-400";
  return <div className={cn("size-3 rounded-full shadow-[0_0_0_4px_rgba(255,255,255,0.04)]", cls)} />;
}

function AlertRow({
  tone,
  title,
  subtitle,
}: {
  tone: "good" | "warn" | "info";
  title: string;
  subtitle: string;
}) {
  const icon =
    tone === "good" ? <CheckCircle2 className="size-5" /> : tone === "warn" ? <AlertCircle className="size-5" /> : <Sparkles className="size-5" />;
  const bg =
    tone === "good"
      ? "bg-emerald-500/10 border-emerald-500/15 text-emerald-200"
      : tone === "warn"
      ? "bg-amber-500/10 border-amber-500/15 text-amber-200"
      : "bg-indigo-500/10 border-indigo-500/15 text-indigo-200";

  return (
    <div className={cn("rounded-2xl border p-4 flex items-start gap-4", bg)}>
      <div className="w-10 h-10 rounded-2xl bg-black/30 border border-white/10 grid place-items-center">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-black text-white">{title}</p>
        <p className="text-[11px] font-semibold text-slate-400 mt-1">{subtitle}</p>
      </div>
      <span className="ml-auto text-slate-500 text-lg leading-none">›</span>
    </div>
  );
}

function WeeklyBarChart({ data }: { data: Array<{ day: string; value: number; max: number }> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ReBarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barCategoryGap="35%">
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} strokeDasharray="6 6" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 800 }} />
        <YAxis hide domain={[0, (max: number) => max]} />
        <Tooltip
          contentStyle={{
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(2,6,23,0.9)",
            color: "#e2e8f0",
          }}
          labelStyle={{ fontWeight: 800 }}
          formatter={(v: unknown) => [`${v}h`, "Heures"]}
        />
        <Bar dataKey="value" fill="#7c3aed" radius={[10, 10, 10, 10]} barSize={18} />
      </ReBarChart>
    </ResponsiveContainer>
  );
}
