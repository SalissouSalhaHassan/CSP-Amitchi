"use client";

import { useState, useEffect } from "react";
import { 
  FileCheck, 
  ClipboardCheck, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Eye, 
  RefreshCw, 
  SlidersHorizontal, 
  Search, 
  Layers, 
  ArrowRight,
  ShieldAlert,
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Link from "next/link";
import { 
  getWorkflowControlData, 
  validateGradeControl, 
  requestGradeCorrection 
} from "@/domains/academics/actions/results-workflow.actions";
import { getCurrentUserAction } from "@/domains/auth/actions/session.actions";

export default function ResultsControlPage() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Data lists
  const [sessions, setSessions] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [resultsData, setResultsData] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);

  // Filters state
  const [selectedSession, setSelectedSession] = useState<string>("All");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("All");
  const [selectedLevel, setSelectedLevel] = useState<string>("All");
  const [selectedSection, setSelectedSection] = useState<string>("All");
  const [selectedClass, setSelectedClass] = useState<string>("All");
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Load user & page data
  async function loadData() {
    setLoading(true);
    try {
      const user = await getCurrentUserAction();
      setCurrentUser(user);

      const res = await getWorkflowControlData();
      const payload = (res as any)?.data || res;
      if (payload) {
        setSessions(payload.sessions || []);
        setPeriods(payload.periods || []);
        setClasses(payload.classes || []);
        setSubjects(payload.subjects || []);
        setEmployees(payload.employees || []);
        setAssignments(payload.assignments || []);
        setWorkflows(payload.workflows || []);
        setResultsData(payload.resultsData || []);
        setStudentsList(payload.studentsList || []);
        setAttendanceList(payload.attendanceList || []);
        
        // Auto-select active session if any
        const activeSess = (payload.sessions || []).find((s: any) => s.isActive);
        if (activeSess) {
          setSelectedSession(activeSess.id.toString());
        } else if ((payload.sessions || []).length > 0) {
          setSelectedSession(payload.sessions[0].id.toString());
        }

        // Auto-select first period if any
        if ((payload.periods || []).length > 0) {
          setSelectedPeriod(payload.periods[0].periodName || payload.periods[0].id.toString());
        }
      }
    } catch (err) {
      console.error("Failed to load control dashboard data:", err);
      toast.error("Erreur de chargement des données.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Compute distinct levels/sections for filter dropdowns
  const levels = Array.from(new Set(classes.map(c => c.level).filter(Boolean)));
  const sections = Array.from(new Set(classes.map(c => c.section).filter(Boolean)));

  // Build the list of rows to control
  // Each row corresponds to a class-subject-teacher assignment
  const rows = assignments.map((assign: any) => {
    const classObj = classes.find(c => c.id === assign.classId);
    const subjectObj = subjects.find(s => s.id === assign.subjectId);
    const teacherObj = employees.find(e => e.id === assign.employeeId);

    // Get current workflow status
    const matchingWorkflow = workflows.find((w: any) => 
      w.classId === assign.classId && 
      w.subjectId === assign.subjectId &&
      (selectedSession === "All" || w.sessionId === Number(selectedSession)) &&
      (selectedPeriod === "All" || w.period === selectedPeriod)
    );

    const status = matchingWorkflow?.status || "BROUILLON";
    const observation = matchingWorkflow?.observation || "";

    // Class size
    const classStudents = studentsList.filter(s => s.classId === assign.classId);
    const classSize = classStudents.length;

    // Grades count & Class average calculation
    const subjectGrades = resultsData.filter(r => 
      r.classId === assign.classId && 
      r.subjectId === assign.subjectId &&
      (selectedSession === "All" || r.sessionId === Number(selectedSession)) &&
      (selectedPeriod === "All" || r.term === selectedPeriod)
    );

    const missingNotes = Math.max(0, classSize - subjectGrades.length);

    const totalScore = subjectGrades.reduce((sum, g) => sum + (Number(g.average) || 0), 0);
    const averageClass = subjectGrades.length > 0 ? (totalScore / subjectGrades.length) : 0;

    // Absences count
    const absencesCount = attendanceList.filter(a => 
      a.classId === assign.classId &&
      a.subjectId === assign.subjectId &&
      a.status === "Absent" &&
      (selectedSession === "All" || a.sessionId === Number(selectedSession))
    ).length;

    return {
      id: assign.id,
      classId: assign.classId,
      subjectId: assign.subjectId,
      teacherId: assign.employeeId,
      className: classObj?.className || "Classe inconnue",
      subjectName: subjectObj?.subjectName || "Matière inconnue",
      teacherName: teacherObj ? `${teacherObj.firstName} ${teacherObj.lastName}` : "Non assigné",
      level: classObj?.level || "",
      section: classObj?.section || "",
      status,
      observation,
      averageClass,
      missingNotes,
      absencesCount,
      classSize
    };
  });

  // Filter rows based on dropdown selections and search query
  const filteredRows = rows.filter(row => {
    if (selectedLevel !== "All" && row.level !== selectedLevel) return false;
    if (selectedSection !== "All" && row.section !== selectedSection) return false;
    if (selectedClass !== "All" && row.classId.toString() !== selectedClass) return false;
    if (selectedSubject !== "All" && row.subjectId.toString() !== selectedSubject) return false;
    if (selectedTeacher !== "All" && row.teacherId.toString() !== selectedTeacher) return false;
    
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchClass = row.className.toLowerCase().includes(q);
      const matchSubject = row.subjectName.toLowerCase().includes(q);
      const matchTeacher = row.teacherName.toLowerCase().includes(q);
      return matchClass || matchSubject || matchTeacher;
    }
    return true;
  });

  // Compute stat counts for top summary cards
  const stats = {
    brouillon: filteredRows.filter(r => r.status === "BROUILLON" || r.status === "CORRECTION_DEMANDEE").length,
    soumis: filteredRows.filter(r => r.status === "SAISIE_TERMINEE").length,
    correction: filteredRows.filter(r => r.status === "CORRECTION_DEMANDEE").length,
    prets: filteredRows.filter(r => r.status === "CONTROLE_PEDAGOGIQUE" || r.status === "VALIDATION_CONSEIL").length,
  };

  // Actions
  async function handleValiderControle(row: any) {
    if (!confirm(`Valider le contrôle des notes pour la classe ${row.className} (${row.subjectName}) ?`)) return;
    setLoading(true);
    try {
      const res = await validateGradeControl({
        sessionId: Number(selectedSession),
        period: selectedPeriod,
        classId: row.classId,
        subjectId: row.subjectId,
      });
      if (res?.success) {
        toast.success("Contrôle pédagogique validé !");
        loadData();
      } else {
        toast.error("Erreur: " + ((res as any)?.error || "Action impossible"));
      }
    } catch (e) {
      toast.error("Erreur technique de validation.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemanderCorrection(row: any) {
    const obs = prompt("Motif de la demande de correction :");
    if (!obs) return;
    setLoading(true);
    try {
      const res = await requestGradeCorrection({
        sessionId: Number(selectedSession),
        period: selectedPeriod,
        classId: row.classId,
        subjectId: row.subjectId,
        observation: obs
      });
      if (res?.success) {
        toast.success("Demande de correction transmise à l'enseignant.");
        loadData();
      } else {
        toast.error("Erreur: " + ((res as any)?.error || "Action impossible"));
      }
    } catch (e) {
      toast.error("Erreur technique de transmission.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-start gap-4">
          <div className="p-4 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-[1.5rem] text-white shadow-lg shadow-indigo-100">
            <FileCheck size={28} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Contrôle des Notes & Résultats
              </h1>
              <span className="px-3 py-1 bg-violet-100 text-violet-700 text-xs font-black uppercase tracking-widest rounded-xl">
                Supervision
              </span>
            </div>
            <p className="text-slate-500 font-medium ml-1">
              Vérifiez, validez ou rejetez les notes saisies par les enseignants avant l'impression des bulletins.
            </p>
          </div>
        </div>

        <Button 
          onClick={loadData} 
          disabled={loading}
          className="h-12 px-6 rounded-xl bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-bold text-sm uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          Actualiser
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          icon={<Layers className="text-slate-400" size={24} />}
          label="Classes en brouillon"
          value={stats.brouillon.toString()}
          color="slate"
        />
        <StatsCard 
          icon={<ClipboardCheck className="text-blue-500" size={24} />}
          label="Notes soumises"
          value={stats.soumis.toString()}
          color="blue"
        />
        <StatsCard 
          icon={<ShieldAlert className="text-rose-500" size={24} />}
          label="Corrections demandées"
          value={stats.correction.toString()}
          color="rose"
        />
        <StatsCard 
          icon={<Award className="text-emerald-500" size={24} />}
          label="Prêtes pour conseil"
          value={stats.prets.toString()}
          color="emerald"
        />
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-[2rem] p-6 border-2 border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-2 text-slate-800 font-black text-sm uppercase tracking-wider">
          <SlidersHorizontal size={18} />
          <span>Filtres de recherche</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
          
          {/* Session */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Session</label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-indigo-500/10 focus:border-indigo-300 transition-all outline-none"
            >
              <option value="All">Toutes</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.sessionName}</option>
              ))}
            </select>
          </div>

          {/* Period */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Période</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-indigo-500/10 focus:border-indigo-300 transition-all outline-none"
            >
              <option value="All">Toutes</option>
              {periods.map((p, idx) => (
                <option key={idx} value={p.periodName}>{p.periodName}</option>
              ))}
            </select>
          </div>

          {/* Niveau */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Niveau</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-indigo-500/10 focus:border-indigo-300 transition-all outline-none"
            >
              <option value="All">Tous</option>
              {levels.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-indigo-500/10 focus:border-indigo-300 transition-all outline-none"
            >
              <option value="All">Toutes</option>
              {sections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>

          {/* Classe */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Classe</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-indigo-500/10 focus:border-indigo-300 transition-all outline-none"
            >
              <option value="All">Toutes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id.toString()}>{c.className}</option>
              ))}
            </select>
          </div>

          {/* Matière */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Matière</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-indigo-500/10 focus:border-indigo-300 transition-all outline-none"
            >
              <option value="All">Toutes</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id.toString()}>{s.subjectName}</option>
              ))}
            </select>
          </div>

          {/* Professeur */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Professeur</label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-indigo-500/10 focus:border-indigo-300 transition-all outline-none"
            >
              <option value="All">Tous</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id.toString()}>{emp.firstName} {emp.lastName}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
          <Input
            placeholder="Rechercher par classe, matière ou professeur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all text-xs font-semibold"
          />
        </div>
      </div>

      {/* Control List Table */}
      <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-100 text-slate-400">
                <TableHead>Classe</TableHead>
                <TableHead>Matière</TableHead>
                <TableHead>Professeur</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead className="text-center">Moyenne Classe</TableHead>
                <TableHead className="text-center">Notes Manquantes</TableHead>
                <TableHead className="text-center">Absences</TableHead>
                <TableHead className="text-right pr-8">Actions</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 font-bold uppercase tracking-wider text-xs">
                    Aucun circuit de contrôle trouvé avec ces filtres.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5 font-black text-slate-800 text-sm">
                      {row.className}
                    </td>
                    <td className="px-6 py-5 text-slate-600 font-medium text-xs">
                      {row.subjectName}
                    </td>
                    <td className="px-6 py-5 text-slate-600 font-semibold text-xs">
                      {row.teacherName}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                        row.status === "BROUILLON" ? "bg-slate-50 text-slate-500 border-slate-100" :
                        row.status === "SAISIE_TERMINEE" ? "bg-blue-50 text-blue-600 border-blue-100" :
                        row.status === "CONTROLE_PEDAGOGIQUE" ? "bg-amber-50 text-amber-600 border-amber-100" :
                        row.status === "CORRECTION_DEMANDEE" ? "bg-rose-50 text-rose-600 border-rose-100" :
                        row.status === "VERROUILLE" ? "bg-red-50 text-red-600 border-red-100 font-bold" :
                        row.status === "PUBLIE" ? "bg-emerald-50 text-emerald-600 border-emerald-100 font-bold" :
                        "bg-indigo-50 text-indigo-600 border-indigo-100"
                      }`}>
                        {row.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`text-xs font-black px-2 py-1 rounded-lg ${row.averageClass >= 10 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"}`}>
                        {row.averageClass > 0 ? row.averageClass.toFixed(2) : "-"}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`text-xs font-black ${row.missingNotes > 0 ? "text-rose-600 bg-rose-50 px-2 py-1 rounded-lg" : "text-slate-400"}`}>
                        {row.missingNotes} / {row.classSize}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`text-xs font-black ${row.absencesCount > 0 ? "text-amber-600" : "text-slate-400"}`}>
                        {row.absencesCount}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right pr-8">
                      <div className="flex justify-end items-center gap-2">
                        
                        {/* Go to grades page */}
                        <Link href={`/dashboard/academics/grades?classId=${row.classId}&period=${selectedPeriod}&sessionId=${selectedSession}`}>
                          <Button className="h-8 w-8 p-0 rounded-lg bg-slate-50 border border-slate-150 text-slate-600 hover:bg-slate-100" title="Voir détails">
                            <Eye size={14} />
                          </Button>
                        </Link>

                        {/* Request correction */}
                        {row.status === "SAISIE_TERMINEE" && (
                          <Button 
                            onClick={() => handleDemanderCorrection(row)}
                            className="h-8 px-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 font-bold text-xs uppercase"
                          >
                            Rejeter
                          </Button>
                        )}

                        {/* Validate Control */}
                        {row.status === "SAISIE_TERMINEE" && (
                          <Button 
                            onClick={() => handleValiderControle(row)}
                            className="h-8 px-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs uppercase"
                          >
                            Valider
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TableHead({ children, className }: any) {
  return (
    <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] ${className}`}>
      {children}
    </th>
  );
}

function StatsCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const bgColors: any = {
    slate: "from-slate-500/5 to-transparent border-slate-100",
    blue: "from-blue-500/10 to-transparent border-blue-100",
    rose: "from-rose-500/10 to-transparent border-rose-100",
    emerald: "from-emerald-500/10 to-transparent border-emerald-100"
  };

  return (
    <div className={`bg-white rounded-[2rem] p-6 border-2 border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden bg-gradient-to-br ${bgColors[color]}`}>
      <div className="relative z-10 flex flex-col gap-4">
        <div className="p-3 bg-white rounded-2xl w-fit shadow-sm border border-slate-100 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{label}</p>
          <p className="text-3xl font-black text-slate-900 tracking-tighter italic">{value}</p>
        </div>
      </div>
    </div>
  );
}
