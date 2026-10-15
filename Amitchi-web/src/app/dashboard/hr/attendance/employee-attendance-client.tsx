"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveEmployeeAttendance } from "@/domains/hr/actions/employees.actions";
import Link from "next/link";
import { 
  Calendar, Check, X, Clock, Search, Users, Briefcase, FileText, 
  ChevronLeft, Save, AlertCircle, ArrowLeft, Activity, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EmployeeAttendanceClientProps {
  employees: any[];
  initialAttendance: any[];
  date: string;
  canEdit: boolean;
}

export default function EmployeeAttendanceClient({
  employees,
  initialAttendance,
  date,
  canEdit,
}: EmployeeAttendanceClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Parse initial records
  // We match employees and attendance records
  const initialRecordsMap = new Map(
    initialAttendance.map((a) => [a.employeeId, a])
  );

  // Component state for attendance values
  const [records, setRecords] = useState<
    Record<number, { status: string; periodNumber: number; remarques: string }>
  >(() => {
    const state: Record<number, { status: string; periodNumber: number; remarques: string }> = {};
    employees.forEach((emp) => {
      const match = initialRecordsMap.get(emp.id);
      state[emp.id] = {
        status: match?.status || "Présent",
        periodNumber: match?.periodNumber || 1,
        remarques: match?.remarques || "",
      };
    });
    return state;
  });

  const handleStatusChange = (employeeId: number, status: string) => {
    if (!canEdit) return;
    setRecords((prev) => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        status,
      },
    }));
  };

  const handleRemarkChange = (employeeId: number, remarques: string) => {
    if (!canEdit) return;
    setRecords((prev) => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        remarques,
      },
    }));
  };

  const handlePeriodChange = (employeeId: number, period: number) => {
    if (!canEdit) return;
    setRecords((prev) => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        periodNumber: period,
      },
    }));
  };

  const handleBulkStatus = (status: string) => {
    if (!canEdit) return;
    setRecords((prev) => {
      const updated = { ...prev };
      employees.forEach((emp) => {
        updated[emp.id] = {
          ...updated[emp.id],
          status,
        };
      });
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!canEdit) return;
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const formattedRecords = Object.entries(records).map(([empIdStr, data]) => ({
        employeeId: Number(empIdStr),
        status: data.status,
        periodNumber: data.periodNumber,
        remarques: data.remarques,
      }));

      const res = await saveEmployeeAttendance(formattedRecords, date);
      if (res.success) {
        setSuccess(true);
        router.refresh();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(res.error || "Une erreur est survenue lors de l'enregistrement.");
      }
    } catch (err: any) {
      setError(err.message || "Erreur réseau ou serveur.");
    } finally {
      setLoading(false);
    }
  };

  const activeEmployees = employees.filter((e) => (e.statut || "").toUpperCase() === "ACTIF");

  const filteredEmployees = activeEmployees.filter(
    (e) =>
      e.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.empId && e.empId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.poste && e.poste.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.departement && e.departement.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Statistics
  const totalCount = activeEmployees.length;
  const stats = {
    total: totalCount,
    presents: Object.values(records).filter((r) => r.status === "Présent").length,
    absents: Object.values(records).filter((r) => r.status === "Absent").length,
    retards: Object.values(records).filter((r) => r.status === "En Retard").length,
    conges: Object.values(records).filter((r) => r.status === "Congé").length,
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <Link 
            href="/dashboard/hr" 
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft size={14} /> Retour à l'Annuaire
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Feuille de Présence du Personnel</h1>
            <span className="text-xl font-bold text-slate-400 font-arabic">حضور وغياب الموظفين</span>
          </div>
          <p className="text-slate-500 font-medium text-sm">
            Enregistrez la présence journalière de votre équipe d'enseignants et administratifs.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
          <Calendar size={18} className="text-slate-400" />
          <input
            type="date"
            defaultValue={date}
            onChange={(e) => {
              if (e.target.value) {
                router.push(`?date=${e.target.value}`);
              }
            }}
            className="outline-none text-sm font-bold text-slate-700 cursor-pointer bg-transparent"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Effectif Actif", value: stats.total, color: "text-slate-700", bg: "bg-slate-100/70", desc: "Membres actifs" },
          { label: "Présents", value: stats.presents, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Sur le campus" },
          { label: "Absents", value: stats.absents, color: "text-rose-600", bg: "bg-rose-50", desc: "Non signalés" },
          { label: "En Retard", value: stats.retards, color: "text-amber-600", bg: "bg-amber-50", desc: "Arrivée tardive" },
          { label: "En Congé", value: stats.conges, color: "text-indigo-600", bg: "bg-indigo-50", desc: "Permissions validées" },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col gap-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-3xl font-black", s.color)}>{s.value}</span>
              <span className="text-[9px] font-bold text-slate-400">/{stats.total}</span>
            </div>
            <span className="text-[10px] font-medium text-slate-500 mt-1">{s.desc}</span>
          </div>
        ))}
      </div>

      {/* Controls & Quick Actions */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="relative w-full lg:w-[400px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            placeholder="Rechercher par nom, ID ou poste..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 h-12 bg-slate-50/50 rounded-2xl border border-slate-200 outline-none text-sm font-medium placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-end">
            <span className="text-xs font-bold text-slate-500">Marquer tous :</span>
            <button
              onClick={() => handleBulkStatus("Présent")}
              className="h-10 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-100 transition-colors"
            >
              ✅ Présents
            </button>
            <button
              onClick={() => handleBulkStatus("Absent")}
              className="h-10 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-100 transition-colors"
            >
              ❌ Absents
            </button>
            <button
              onClick={() => handleBulkStatus("En Retard")}
              className="h-10 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold border border-amber-100 transition-colors"
            >
              ⏳ Retards
            </button>
          </div>
        )}
      </div>

      {/* Alerts */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-2xl text-sm font-bold flex items-center gap-3 animate-fade-in">
          <ShieldCheck size={20} className="shrink-0" />
          Feuille de présence enregistrée avec succès !
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-2xl text-sm font-bold flex items-center gap-3 animate-fade-in">
          <AlertCircle size={20} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Main Attendance List */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white border-b border-slate-100">
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/3">
                Employé <span className="text-slate-300 ml-1 font-arabic">الموظف</span>
              </th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Période / Heure <span className="text-slate-300 ml-1 font-arabic">الحصة الزمنية</span>
              </th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                Statut <span className="text-slate-300 ml-1 font-arabic">الحالة</span>
              </th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/4">
                Remarques / Observations <span className="text-slate-300 ml-1 font-arabic">ملاحظات</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((emp) => {
                const rec = records[emp.id] || { status: "Présent", periodNumber: 1, remarques: "" };
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50/50 flex items-center justify-center text-indigo-500 border border-indigo-100/50">
                          <Users size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 uppercase tracking-wide">{emp.nom}</p>
                          <p className="text-[10px] text-slate-400 mt-1 font-bold italic tracking-wider flex items-center gap-1.5">
                            <span>ID: {emp.empId}</span>
                            <span>•</span>
                            <span className="text-slate-500 not-italic">{emp.poste || emp.departement}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <select
                        value={rec.periodNumber}
                        disabled={!canEdit}
                        onChange={(e) => handlePeriodChange(emp.id, Number(e.target.value))}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value={1}>H1 (08:00 - 09:00)</option>
                        <option value={2}>H2 (09:00 - 10:00)</option>
                        <option value={3}>H3 (10:00 - 11:00)</option>
                        <option value={4}>H4 (11:00 - 12:00)</option>
                        <option value={5}>H5 (14:00 - 15:00)</option>
                        <option value={6}>H6 (15:00 - 16:00)</option>
                        <option value={7}>H7 (16:00 - 17:00)</option>
                      </select>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center justify-center gap-2">
                        {[
                          { val: "Présent", label: "Présent", color: "border-emerald-200 text-emerald-600", activeBg: "bg-emerald-600 text-white shadow-emerald-100 shadow-lg" },
                          { val: "Absent", label: "Absent", color: "border-rose-200 text-rose-600", activeBg: "bg-rose-600 text-white shadow-rose-100 shadow-lg" },
                          { val: "En Retard", label: "Retard", color: "border-amber-200 text-amber-600", activeBg: "bg-amber-600 text-white shadow-amber-100 shadow-lg" },
                          { val: "Congé", label: "Congé", color: "border-indigo-200 text-indigo-600", activeBg: "bg-indigo-600 text-white shadow-indigo-100 shadow-lg" },
                        ].map((btn) => (
                          <button
                            key={btn.val}
                            disabled={!canEdit}
                            onClick={() => handleStatusChange(emp.id, btn.val)}
                            className={cn(
                              "px-3 py-1.5 rounded-xl border text-[10px] font-black tracking-widest uppercase transition-all",
                              rec.status === btn.val
                                ? btn.activeBg
                                : cn("bg-white hover:bg-slate-50/50", btn.color)
                            )}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={rec.remarques}
                        placeholder="Ajouter une remarque..."
                        onChange={(e) => handleRemarkChange(emp.id, e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center gap-4 opacity-25">
                    <Users size={64} className="text-slate-400" />
                    <p className="text-xl font-bold">Aucun employé actif trouvé</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Floating Save Bar */}
      {canEdit && (
        <div className="flex justify-end gap-4 pb-12">
          <Link
            href="/dashboard/hr"
            className="h-12 px-6 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold flex items-center justify-center transition-all shadow-sm"
          >
            Annuler
          </Link>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="h-12 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:shadow-indigo-200/50 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            Sauvegarder la présence
          </button>
        </div>
      )}
    </div>
  );
}
