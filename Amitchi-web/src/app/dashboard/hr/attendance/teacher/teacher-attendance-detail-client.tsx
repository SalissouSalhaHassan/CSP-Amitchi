"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveManualTeacherSessionAttendance } from "@/domains/hr/actions/teacher-attendance.actions";
import { 
  Calendar, Check, X, Clock, Printer, ChevronLeft, ChevronRight, 
  MapPin, BookOpen, AlertCircle, Edit, Users, ArrowLeft, TrendingUp, Sparkles 
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface TeacherAttendanceDetailProps {
  teacher: any;
  teachersList?: any[]; // For admin dropdown selector
  initialSlots: any[];
  initialStats: {
    total: number;
    attended: number;
    absent: number;
    late: number;
    rate: number;
  };
  filterType: "day" | "week" | "month" | "year";
  date: string;
  isAdmin: boolean;
}

export default function TeacherAttendanceDetail({
  teacher,
  teachersList = [],
  initialSlots,
  initialStats,
  filterType,
  date,
  isAdmin,
}: TeacherAttendanceDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Edit Modal State
  const [editingSlot, setEditingSlot] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState("Présent");
  const [editRemarks, setEditRemarks] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Date controls
  const handleDateChange = (newDate: string) => {
    router.push(`?date=${newDate}&filter=${filterType}`);
  };

  const handleFilterChange = (newFilter: "day" | "week" | "month" | "year") => {
    router.push(`?date=${date}&filter=${newFilter}`);
  };

  const shiftDate = (amount: number) => {
    const d = new Date(date);
    if (filterType === "day") {
      d.setDate(d.getDate() + amount);
    } else if (filterType === "week") {
      d.setDate(d.getDate() + amount * 7);
    } else if (filterType === "month") {
      d.setMonth(d.getMonth() + amount);
    } else {
      d.setFullYear(d.getFullYear() + amount);
    }
    handleDateChange(d.toISOString().split("T")[0]);
  };

  const handleTeacherChange = (teacherId: string) => {
    if (teacherId === "me") return;
    router.push(`/dashboard/hr/attendance/teacher/${teacherId}?date=${date}&filter=${filterType}`);
  };

  const openEditModal = (slot: any) => {
    if (!isAdmin) return;
    setEditingSlot(slot);
    setEditStatus(slot.status === "Planifié" ? "Présent" : slot.status);
    setEditRemarks(slot.remarques || "");
    setModalOpen(true);
  };

  const handleSaveOverride = async () => {
    if (!editingSlot) return;
    
    startTransition(async () => {
      const res = await saveManualTeacherSessionAttendance({
        employeeId: teacher.id,
        classId: editingSlot.classId,
        subjectId: editingSlot.subjectId,
        timetableEntryId: editingSlot.timetableEntryId,
        dateStr: editingSlot.dateStr,
        periodNumber: editingSlot.periodNumber,
        status: editStatus,
        remarques: editRemarks,
      });

      if (res.success) {
        setModalOpen(false);
        setEditingSlot(null);
        router.refresh();
      }
    });
  };

  const getFilterLabel = () => {
    const d = new Date(date);
    if (filterType === "day") {
      return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
    if (filterType === "week") {
      // Find Monday
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(d.setDate(diff));
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return `Semaine du ${mon.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} au ${sun.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    if (filterType === "month") {
      return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    }
    return `Année Académique ${d.getFullYear()}`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans p-6 lg:p-10 space-y-8 print:p-0 print:bg-white">
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          nav, aside, header, footer, button, .no-print, input, select, .breadcrumbs {
            display: none !important;
          }
          body {
            background-color: white !important;
            color: black !important;
          }
          .print-area {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 20px !important;
          }
          .print-table th, .print-table td {
            border: 1px solid #cbd5e1 !important;
            padding: 10px !important;
            font-size: 11px !important;
          }
          .print-title {
            display: block !important;
            font-size: 20px !important;
            font-weight: 900 !important;
            text-align: center !important;
            margin-bottom: 5px !important;
          }
          .print-subtitle {
            display: block !important;
            font-size: 12px !important;
            text-align: center !important;
            color: #64748b !important;
            margin-bottom: 25px !important;
          }
          .print-stats {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 15px !important;
            margin-bottom: 20px !important;
          }
          .print-stat-card {
            border: 1px solid #e2e8f0 !important;
            padding: 12px !important;
            text-align: center !important;
            border-radius: 8px !important;
          }
        }
      `}</style>

      {/* Header (Hidden in Print) */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 no-print">
        <div className="space-y-2">
          {isAdmin ? (
            <Link 
              href="/dashboard/hr/reports" 
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors breadcrumbs"
            >
              <ArrowLeft size={14} /> Retour au Centre de Rapports
            </Link>
          ) : (
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors breadcrumbs"
            >
              <ArrowLeft size={14} /> Tableau de Bord
            </Link>
          )}

          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Fiche de Présence Individuelle</h1>
            <span className="text-xl font-bold text-slate-400 font-arabic">سجل الحضور الفردي</span>
          </div>
          <p className="text-slate-500 font-medium text-sm">
            Calendrier des heures de cours de l'enseignant et statut de présence scanné.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Admin Teacher Switcher */}
          {isAdmin && teachersList.length > 0 && (
            <div className="relative w-full sm:w-[220px]">
              <select
                value={teacher.id}
                onChange={(e) => handleTeacherChange(e.target.value)}
                className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm"
              >
                {teachersList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nom} ({t.departement})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => window.print()}
            className="h-11 px-5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-2 shadow-sm text-sm transition-colors"
          >
            <Printer size={16} /> Imprimer
          </button>
        </div>
      </div>

      {/* Teacher Profile Summary Card (Always Visible) */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl uppercase shrink-0">
            {teacher.nom.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{teacher.nom}</h2>
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 text-[9px] font-black tracking-widest uppercase rounded-full">
                {teacher.departement || "Général"}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-400 mt-1">
              ID Enseignant: {teacher.empId} • {teacher.poste || "Professeur"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8 text-left border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-8 w-full md:w-auto">
          <div className="space-y-0.5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Mobile</p>
            <p className="text-sm font-black text-slate-700">{teacher.mobile || "Non renseigné"}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adresse E-mail</p>
            <p className="text-sm font-bold text-slate-600">{teacher.email || "Non renseignée"}</p>
          </div>
        </div>
      </div>

      {/* Print Title Header (Only Visible in Print) */}
      <div className="hidden print-title">
        FICHE DE PRÉSENCE ENSEIGNANT
      </div>
      <div className="hidden print-subtitle">
        Enseignant : ${teacher.nom.toUpperCase()} (${teacher.empId}) | Période : ${getFilterLabel()}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 print-stats">
        {[
          { label: "Séances Programmées", value: initialStats.total, color: "text-slate-700", bg: "bg-slate-100/70", desc: "Dans la période" },
          { label: "Présences Validées", value: initialStats.attended, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Heures assurées" },
          { label: "Heures Absentes", value: initialStats.absent, color: "text-rose-600", bg: "bg-rose-50", desc: "Non validées/manquées" },
          { label: "Heures en Retard", value: initialStats.late, color: "text-amber-600", bg: "bg-amber-50", desc: "Check-in tardif" },
          { label: "Taux de Présence", value: `${initialStats.rate}%`, color: "text-indigo-600", bg: "bg-indigo-50", desc: "Taux d'assiduité", isRate: true },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col gap-1.5 print-stat-card">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{s.label}</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={cn("text-3xl font-black leading-tight", s.color)}>{s.value}</span>
              {!s.isRate && <span className="text-[9px] font-bold text-slate-400">/{initialStats.total}</span>}
            </div>
            <span className="text-[9px] font-medium text-slate-500 mt-1 leading-none no-print">{s.desc}</span>
          </div>
        ))}
      </div>

      {/* Filter and Date Controls (Hidden in Print) */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-6 no-print">
        {/* Filter Selection */}
        <div className="flex bg-slate-100/75 p-1 rounded-2xl border border-slate-200/40 w-full lg:w-auto h-12">
          {[
            { val: "day", label: "Jour" },
            { val: "week", label: "Semaine" },
            { val: "month", label: "Mois" },
            { val: "year", label: "Année" },
          ].map((tab) => (
            <button
              key={tab.val}
              onClick={() => handleFilterChange(tab.val as any)}
              className={cn(
                "flex-1 lg:flex-none px-6 h-full rounded-xl text-xs font-bold transition-all uppercase tracking-wider",
                filterType === tab.val
                  ? "bg-white text-indigo-600 shadow-sm font-black"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
          <button
            onClick={() => shiftDate(-1)}
            className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          
          <div className="flex items-center gap-3">
            <Calendar size={16} className="text-slate-400" />
            <span className="text-sm font-black text-slate-700 whitespace-nowrap">
              {getFilterLabel()}
            </span>
          </div>

          <button
            onClick={() => shiftDate(1)}
            className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors"
          >
            <ChevronRight size={18} />
          </button>
          
          <div className="relative border-l border-slate-200 pl-4">
            <input
              type="date"
              value={date}
              onChange={(e) => {
                if (e.target.value) handleDateChange(e.target.value);
              }}
              className="outline-none text-xs font-bold text-slate-600 cursor-pointer bg-slate-50 border border-slate-200 rounded-xl px-3 h-10"
            />
          </div>
        </div>
      </div>

      {/* Slots Table (Visible both in print and view) */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden print-area">
        <table className="w-full text-left border-collapse print-table">
          <thead>
            <tr className="bg-white border-b border-slate-100">
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[160px]">
                Date &amp; Jour <span className="text-slate-300 ml-1 font-arabic">التاريخ</span>
              </th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[140px]">
                Heure / Période <span className="text-slate-300 ml-1 font-arabic">الحصة</span>
              </th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Classe &amp; Matière <span className="text-slate-300 ml-1 font-arabic">الفصل والمادة</span>
              </th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Salle <span className="text-slate-300 ml-1 font-arabic">القاعة</span>
              </th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-[150px]">
                Statut <span className="text-slate-300 ml-1 font-arabic">الحالة</span>
              </th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[200px]">
                Méthode &amp; Remarque <span className="text-slate-300 ml-1 font-arabic">ملاحظة</span>
              </th>
              {isAdmin && (
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-[80px] no-print">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {initialSlots.length > 0 ? (
              initialSlots.map((slot, i) => {
                const sDate = new Date(slot.date);
                const dayLabel = sDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
                
                return (
                  <tr key={i} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-8 py-5 text-xs font-black text-slate-900 uppercase">
                      {dayLabel}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <Clock size={12} className="text-slate-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-700">Période {slot.periodNumber}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-black text-slate-800 uppercase tracking-wide">{slot.className}</span>
                        <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                          <BookOpen size={10} className="text-slate-400" /> {slot.subjectName}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-600">{slot.roomName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      {slot.status === "Présent" ? (
                        <span className="inline-flex px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm">
                          PRÉSENT
                        </span>
                      ) : slot.status === "En Retard" ? (
                        <span className="inline-flex px-3 py-1 bg-amber-50 text-amber-600 border border-amber-100 text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm">
                          RETARD
                        </span>
                      ) : slot.status === "Planifié" ? (
                        <span className="inline-flex px-3 py-1 bg-slate-50 text-slate-500 border border-slate-100 text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm">
                          À VENIR
                        </span>
                      ) : (
                        <span className="inline-flex px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm">
                          ABSENT
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1">
                        {slot.scannedAt && (
                          <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                            💻 {slot.scanMethod === "QR_CODE" ? "Scan Code QR" : "Saisie Manuelle"} à {new Date(slot.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {slot.remarques && (
                          <span className="text-[11px] font-semibold text-slate-400 italic">
                            "{slot.remarques}"
                          </span>
                        )}
                        {!slot.scannedAt && !slot.remarques && (
                          <span className="text-xs text-slate-300 font-bold italic">—</span>
                        )}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-8 py-5 text-right no-print">
                        <button
                          onClick={() => openEditModal(slot)}
                          className="h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all"
                          title="Modifier la présence"
                        >
                          <Edit size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="px-8 py-24 text-center">
                  <div className="flex flex-col items-center gap-4 opacity-25">
                    <Calendar size={64} className="text-slate-400" />
                    <p className="text-xl font-bold">Aucune séance de cours dans cette période</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Manual Attendance Override Modal (Hidden in Print) */}
      {modalOpen && editingSlot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-indigo-50/20">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide">Ajuster la Présence</h3>
                <p className="text-[11px] font-bold text-slate-400 mt-1">
                  Cours: {editingSlot.className} • Période {editingSlot.periodNumber}
                </p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut de Présence</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: "Présent", label: "Présent", activeBg: "bg-emerald-600 text-white shadow-emerald-100 shadow-md border-emerald-600", normal: "border-slate-200 text-slate-600 hover:bg-slate-50" },
                    { val: "Absent", label: "Absent", activeBg: "bg-rose-600 text-white shadow-rose-100 shadow-md border-rose-600", normal: "border-slate-200 text-slate-600 hover:bg-slate-50" },
                    { val: "En Retard", label: "Retard", activeBg: "bg-amber-600 text-white shadow-amber-100 shadow-md border-amber-600", normal: "border-slate-200 text-slate-600 hover:bg-slate-50" },
                  ].map((btn) => (
                    <button
                      key={btn.val}
                      type="button"
                      onClick={() => setEditStatus(btn.val)}
                      className={cn(
                        "h-10 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                        editStatus === btn.val ? btn.activeBg : btn.normal
                      )}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Remarques / Motif</label>
                <textarea
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="Motif de l'absence ou remarque de retard..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-50 bg-slate-50/50 flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveOverride}
                disabled={isPending}
                className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-100 disabled:opacity-50"
              >
                {isPending ? "Enregistrement..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
