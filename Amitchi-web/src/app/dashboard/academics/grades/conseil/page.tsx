"use client";

import { useState, useEffect } from "react";
import { 
  Award, 
  FileText, 
  Printer, 
  Lock, 
  RefreshCw, 
  SlidersHorizontal, 
  CheckCircle2, 
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  getClasses, 
  getSessions, 
  getPeriods 
} from "@/domains/academics/actions/academics.actions";
import { 
  getClassCouncilData, 
  saveStudentCouncilDecision 
} from "@/domains/academics/actions/class-council.actions";
import { 
  validateClassCouncil, 
  lockResults 
} from "@/domains/academics/actions/results-workflow.actions";
import { getCurrentUserAction } from "@/domains/auth/actions/session.actions";

const DECISIONS = [
  "Admis",
  "Redouble",
  "Exclu",
  "Encouragement",
  "Tableau d’honneur",
  "Félicitations"
];

export default function ClassCouncilPage() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Filter definitions
  const [sessions, setSessions] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);

  // Selected filters
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");

  // Council data
  const [students, setStudents] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [studentGrades, setStudentGrades] = useState<any[]>([]);
  const [workflow, setWorkflow] = useState<any>(null);

  // Form states per student (local changes before save)
  const [localDecisions, setLocalDecisions] = useState<Record<number, string>>({});
  const [localObservations, setLocalObservations] = useState<Record<number, string>>({});
  const [localConduite, setLocalConduite] = useState<Record<number, string>>({});

  // 1. Initial Load of Filter dropdown lists
  async function loadFilters() {
    setLoading(true);
    try {
      const user = await getCurrentUserAction();
      setCurrentUser(user);

      const [sessRes, perRes, clsRes] = await Promise.all([
        getSessions(),
        getPeriods(),
        getClasses(true)
      ]);

      const sess = (sessRes as any).data || sessRes || [];
      const pers = (perRes as any).data || perRes || [];
      const cls = (clsRes as any).data?.data || (clsRes as any).data || clsRes || [];

      setSessions(sess);
      setPeriods(pers);
      setClassesList(cls);

      // Select active defaults
      const activeSess = sess.find((s: any) => s.isActive) || sess[0];
      if (activeSess) setSelectedSession(activeSess.id.toString());

      if (pers.length > 0) {
        setSelectedPeriod(pers[0].periodName || pers[0].id.toString());
      }

      if (cls.length > 0) {
        setSelectedClass(cls[0].id.toString());
      }
    } catch (e) {
      console.error("Failed to load class council filters:", e);
      toast.error("Erreur de chargement des filtres.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFilters();
  }, []);

  // 2. Load Council Data when filters change
  async function loadCouncilData() {
    if (!selectedSession || !selectedPeriod || !selectedClass) return;
    setLoading(true);
    try {
      const res = await getClassCouncilData({
        sessionId: Number(selectedSession),
        period: selectedPeriod,
        classId: Number(selectedClass)
      });
      const payload = (res as any)?.data || res;
      if (payload) {
        setStudents(payload.students || []);
        setSummaries(payload.summaries || []);
        setStudentGrades(payload.studentGrades || []);
        setWorkflow(payload.workflow || null);

        // Prepopulate form states from existing summaries
        const decs: Record<number, string> = {};
        const obs: Record<number, string> = {};
        const conds: Record<number, string> = {};

        (payload.students || []).forEach((st: any) => {
          const matchingSum = (payload.summaries || []).find((s: any) => s.studentId === st.id);
          decs[st.id] = matchingSum?.travail || "Admis";
          obs[st.id] = matchingSum?.observation || "";
          conds[st.id] = matchingSum?.conduite != null ? matchingSum.conduite.toString() : "15";
        });

        setLocalDecisions(decs);
        setLocalObservations(obs);
        setLocalConduite(conds);
      }
    } catch (e) {
      console.error("Failed to load class council data:", e);
      toast.error("Erreur de chargement des élèves.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCouncilData();
  }, [selectedSession, selectedPeriod, selectedClass]);

  // Compute student averages and ranks
  const computeStudentAverage = (studentId: number) => {
    const grades = studentGrades.filter(g => g.studentId === studentId);
    if (grades.length === 0) return 0;
    let totalWeighted = 0;
    let totalCoef = 0;
    grades.forEach(g => {
      const coef = g.coefficient || 1;
      totalWeighted += (g.totalScore || 0) * coef;
      totalCoef += coef;
    });
    return totalCoef > 0 ? (totalWeighted / totalCoef) : 0;
  };

  const computeStudentAbsences = (studentId: number) => {
    const grades = studentGrades.filter(g => g.studentId === studentId);
    return grades.reduce((sum, g) => sum + (g.absences || 0), 0);
  };

  // Rank students
  const studentsWithStats = students.map(s => {
    const avg = computeStudentAverage(s.id);
    const absences = computeStudentAbsences(s.id);
    return { ...s, avg, absences };
  }).sort((a, b) => b.avg - a.avg);

  const studentsWithRanks = studentsWithStats.map((s, index) => ({
    ...s,
    rank: index + 1
  }));

  // Actions
  const isLocked = workflow?.status === "VERROUILLE" || workflow?.status === "PUBLIE" || workflow?.status === "ARCHIVE";

  async function handleSaveDecision(studentId: number) {
    if (isLocked) {
      toast.error("Le conseil est verrouillé pour cette classe.");
      return;
    }
    const dec = localDecisions[studentId] || "Admis";
    const obs = localObservations[studentId] || "";
    const cond = Number(localConduite[studentId]) || 15;

    try {
      const res = await saveStudentCouncilDecision({
        studentId,
        classId: Number(selectedClass),
        sessionId: Number(selectedSession),
        period: selectedPeriod,
        decision: dec,
        observation: obs,
        conduite: cond
      });
      if (res?.success) {
        toast.success("Décision enregistrée.");
      } else {
        toast.error("Erreur de sauvegarde.");
      }
    } catch (e) {
      toast.error("Erreur de connexion.");
    }
  }

  async function handleValiderConseil() {
    if (isLocked) {
      toast.error("Le conseil est déjà verrouillé.");
      return;
    }
    if (!confirm("Valider officiellement les décisions du conseil de classe ?")) return;
    setLoading(true);
    try {
      const res = await validateClassCouncil({
        sessionId: Number(selectedSession),
        period: selectedPeriod,
        classId: Number(selectedClass),
      });
      if (res?.success) {
        toast.success("Conseil de classe validé avec succès !");
        loadCouncilData();
      } else {
        toast.error("Erreur: " + ((res as any)?.error || "Action impossible"));
      }
    } catch (e) {
      toast.error("Erreur technique de validation.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerrouillerConseil() {
    if (!confirm("Voulez-vous verrouiller définitivement les résultats de cette classe ? (Plus aucun changement possible)")) return;
    setLoading(true);
    try {
      const res = await lockResults({
        sessionId: Number(selectedSession),
        period: selectedPeriod,
        classId: Number(selectedClass),
      });
      if (res?.success) {
        toast.success("Résultats verrouillés définitivement !");
        loadCouncilData();
      } else {
        toast.error("Erreur: " + ((res as any)?.error || "Action impossible"));
      }
    } catch (e) {
      toast.error("Erreur de verrouillage.");
    } finally {
      setLoading(false);
    }
  }

  function handleImprimer() {
    window.print();
  }

  function handleExportPV() {
    toast.success("PV de Conseil exporté en format PDF (Simulé).");
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700 print:p-0 print:space-y-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
        <div className="flex items-start gap-4">
          <div className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-[1.5rem] text-white shadow-lg shadow-indigo-150">
            <UserCheck size={28} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Conseil de Classe
              </h1>
              {workflow && (
                <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest border ${
                  isLocked ? "bg-red-50 text-red-600 border-red-100" : "bg-indigo-50 text-indigo-600 border-indigo-100"
                }`}>
                  Statut: {workflow.status.replace("_", " ")}
                </span>
              )}
            </div>
            <p className="text-slate-500 font-medium ml-1">
              Validation finale des moyennes trimestrielles/annuelles et formulation des décisions d'orientation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={handleImprimer}
            className="h-12 px-5 rounded-xl bg-white border-2 border-slate-100 text-slate-600 hover:bg-slate-50 font-bold text-sm uppercase tracking-wider flex items-center gap-2 shadow-sm"
          >
            <Printer size={18} />
            Imprimer
          </Button>

          <Button 
            onClick={handleExportPV}
            className="h-12 px-5 rounded-xl bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-bold text-sm uppercase tracking-wider flex items-center gap-2 shadow-sm"
          >
            <FileText size={18} />
            Exporter PV
          </Button>

          <Button 
            onClick={handleValiderConseil}
            disabled={loading || isLocked}
            className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-200"
          >
            <CheckCircle2 size={18} />
            Valider Conseil
          </Button>

          <Button 
            onClick={handleVerrouillerConseil}
            disabled={loading || isLocked}
            className="h-12 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-200"
          >
            <Lock size={18} />
            Verrouiller
          </Button>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="hidden print:block text-center space-y-2 border-b-2 border-slate-900 pb-4">
        <h1 className="text-2xl font-black uppercase">Procès-Verbal de Conseil de Classe</h1>
        <p className="text-sm font-semibold">
          Classe: {classesList.find(c => c.id.toString() === selectedClass)?.className} | 
          Période: {selectedPeriod} | 
          Session: {sessions.find(s => s.id.toString() === selectedSession)?.sessionName}
        </p>
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-[2rem] p-6 border-2 border-slate-100 shadow-sm space-y-4 print:hidden">
        <div className="flex items-center gap-2 text-slate-800 font-black text-sm uppercase tracking-wider">
          <SlidersHorizontal size={18} />
          <span>Sélectionner la classe</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Session */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Session Académique</label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-indigo-500/10 focus:border-indigo-300 transition-all outline-none"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.sessionName}</option>
              ))}
            </select>
          </div>

          {/* Period */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Période d'évaluation</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-indigo-500/10 focus:border-indigo-300 transition-all outline-none"
            >
              {periods.map((p, idx) => (
                <option key={idx} value={p.periodName}>{p.periodName}</option>
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
              {classesList.map(c => (
                <option key={c.id} value={c.id.toString()}>{c.className}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lock Warning alert */}
      {isLocked && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-center gap-3 print:hidden">
          <AlertTriangle size={20} className="text-rose-600" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Les décisions de ce conseil sont actuellement verrouillées et consultables uniquement en lecture seule.
          </span>
        </div>
      )}

      {/* Council Table */}
      <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-100 text-slate-400 print:bg-transparent print:border-slate-800">
                <TableHead>Élève</TableHead>
                <TableHead className="text-center">Moyenne</TableHead>
                <TableHead className="text-center">Rang</TableHead>
                <TableHead className="text-center">Absences</TableHead>
                <TableHead className="text-center print:hidden">Conduite</TableHead>
                <TableHead className="text-center">Décision</TableHead>
                <TableHead className="w-1/3">Observation Conseil</TableHead>
                <TableHead className="text-right pr-8 print:hidden">Sauvegarde</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-800">
              {studentsWithRanks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 font-bold uppercase tracking-wider text-xs">
                    Aucun élève trouvé dans cette classe.
                  </td>
                </tr>
              ) : (
                studentsWithRanks.map((student, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors print:hover:bg-transparent">
                    <td className="px-6 py-5 font-black text-slate-800 text-sm">
                      {student.firstName} {student.lastName}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`text-xs font-black px-2.5 py-1.5 rounded-lg border ${
                        student.avg >= 10 
                          ? "text-emerald-700 bg-emerald-50 border-emerald-100" 
                          : "text-rose-700 bg-rose-50 border-rose-100"
                      }`}>
                        {student.avg.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center text-xs font-black text-indigo-600">
                      {student.rank}e
                    </td>
                    <td className="px-6 py-5 text-center text-xs font-semibold text-slate-500">
                      {student.absences} hrs
                    </td>
                    <td className="px-6 py-5 text-center print:hidden">
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        disabled={isLocked}
                        value={localConduite[student.id] || "15"}
                        onChange={(e) => setLocalConduite({ ...localConduite, [student.id]: e.target.value })}
                        className="w-16 h-9 text-center bg-slate-50 border-slate-100 font-black rounded-lg text-xs"
                      />
                    </td>
                    <td className="px-6 py-5 text-center">
                      {isLocked ? (
                        <span className="text-xs font-black text-slate-700">{localDecisions[student.id]}</span>
                      ) : (
                        <select
                          value={localDecisions[student.id] || "Admis"}
                          onChange={(e) => setLocalDecisions({ ...localDecisions, [student.id]: e.target.value })}
                          className="h-9 px-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-700 outline-none"
                        >
                          {DECISIONS.map((dec, i) => (
                            <option key={i} value={dec}>{dec}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      {isLocked ? (
                        <span className="text-xs font-medium text-slate-500">{localObservations[student.id]}</span>
                      ) : (
                        <Input
                          placeholder="Note de conseil..."
                          value={localObservations[student.id] || ""}
                          onChange={(e) => setLocalObservations({ ...localObservations, [student.id]: e.target.value })}
                          className="h-9 rounded-lg border-slate-100 bg-slate-50/50 text-xs font-medium"
                        />
                      )}
                    </td>
                    <td className="px-6 py-5 text-right pr-8 print:hidden">
                      <Button
                        disabled={isLocked}
                        onClick={() => handleSaveDecision(student.id)}
                        className="h-8 px-3 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 font-bold text-xs uppercase"
                      >
                        Enregistrer
                      </Button>
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
