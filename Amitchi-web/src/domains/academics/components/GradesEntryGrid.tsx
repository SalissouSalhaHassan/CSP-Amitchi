"use client";

import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Save, Trash2, History, Plus, Edit3,
  CheckCircle2, AlertCircle, TrendingUp, Search,
  User, BookOpen, BarChart3, Eye, Zap,
  ExternalLink,
  ClipboardList,
  Loader2,
  Printer
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  calculateStudentMetrics,
  getAppreciation,
  calculateRanks,
  formatRank
} from "../utils/calculations";
import { StudentGradeRow, GradingScale } from "../types";
import StudentDialog from "@/domains/students/components/StudentDialog";

interface GradesEntryGridProps {
  students: any[];
  level: string;
  coefficient: number;
  gradingScale: GradingScale[];
  onSave: (data: any) => void;
  onPrintBulletin?: (studentId: number) => void;
  readOnly?: boolean;
  loading?: boolean;
}

export default function GradesEntryGrid({
  students: initialStudents,
  level,
  coefficient,
  gradingScale,
  onSave,
  onPrintBulletin,
  readOnly = false,
  loading = false
}: GradesEntryGridProps) {
  const isHigherEd = ["Licence", "Master", "Doctorat", "Supérieur", "Université"].includes(level);

  const [data, setData] = useState<StudentGradeRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setData(initialStudents.map(s => {
      const res = s.existingResult;
      return {
        studentId: s.id,
        matricule: s.numAdmission || "N/A",
        name: s.nomEtudiant,
        presents: s.attendance?.presents || 0,
        absents: s.attendance?.absents || 0,
        classWork: res?.classWorkScore?.toString() || "",
        examNote: res?.examScore?.toString() || "",
        total: res?.totalScore || 0,
        average: res?.totalScore ? res.totalScore / 2 : 0,
        weighted: res?.weightedScore || 0,
        rank: res?.rank || "-",
        observation: res?.observation || "",
        appreciation: res?.appreciation || "-",
        history: s.history || "N/A", 
        fullStudent: s 
      };
    }));
  }, [initialStudents]);

  const processedData = useMemo(() => {
    const updated = data.map(row => {
      const cw = parseFloat(row.classWork) || 0;
      const ex = parseFloat(row.examNote) || 0;

      const { total, average, weighted } = calculateStudentMetrics(cw, ex, coefficient, isHigherEd);
      const appreciation = getAppreciation(average, gradingScale);

      return { ...row, total, average, weighted, appreciation };
    });

    const rankMap = calculateRanks(updated.map(r => ({ id: r.studentId, weighted: r.weighted })));

    return updated.map(r => ({
      ...r,
      rank: formatRank(rankMap[r.studentId])
    }));
  }, [data, isHigherEd, coefficient, gradingScale]);

  const updateRow = (id: number, field: keyof StudentGradeRow, value: any) => {
    setData(prev => prev.map(row =>
      row.studentId === id ? { ...row, [field]: value } : row
    ));
  };

  const handleGradeInput = (id: number, field: 'classWork' | 'examNote', value: string) => {
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
    const num = parseFloat(value);
    if (num > 20) return;
    updateRow(id, field, value);
  };

  const filteredData = processedData.filter(r => {
    const name = r.name || "";
    const matricule = r.matricule || "";
    const searchTerm = search.toLowerCase();
    return name.toLowerCase().includes(searchTerm) ||
           matricule.toLowerCase().includes(searchTerm);
  });

  const stats = useMemo(() => {
    const count = processedData.length;
    const sum = processedData.reduce((acc, r) => acc + r.average, 0);
    const avg = count > 0 ? sum / count : 0;
    const passed = processedData.filter(r => r.average >= 10).length;
    const failed = count - passed;
    return { count, avg, passed, failed };
  }, [processedData]);

  const selectedStudent = useMemo(() => 
    data.find(s => s.studentId === selectedId)?.fullStudent, 
    [selectedId, data]
  );

  const handleDeleteResult = () => {
    if (!selectedId) return;
    if (confirm("Voulez-vous réinitialiser les notes de cet étudiant ?")) {
      setData(prev => prev.map(row => 
        row.studentId === selectedId 
          ? { ...row, classWork: "", examNote: "", observation: "", appreciation: "-", rank: "-" } 
          : row
      ));
    }
  };

  const isBusy = isSaving || loading;

  const handleSaveInternal = async () => {
    setIsSaving(true);
    try {
      await onSave(processedData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard 
           icon={<User className="text-indigo-500" />} 
           label="Total Élèves" 
           value={stats.count.toString()} 
           color="indigo"
        />
        <StatsCard 
           icon={<BarChart3 className="text-amber-500" />} 
           label="Moyenne Classe" 
           value={`${stats.avg.toFixed(2)} / 20`} 
           color="amber"
        />
        <StatsCard 
           icon={<TrendingUp className="text-emerald-500" />} 
           label="Admis (>=10)" 
           value={stats.passed.toString()} 
           color="emerald"
        />
        <StatsCard 
           icon={<AlertCircle className="text-rose-500" />} 
           label="Ajournés (<10)" 
           value={stats.failed.toString()} 
           color="rose"
        />
      </div>

      {/* Action Bar */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white/50 dark:bg-[#131622]/90 backdrop-blur-sm p-4 rounded-[2rem] border border-slate-200/60 dark:border-slate-800 shadow-sm">
        <div className="relative w-full xl:w-96 group">
          <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 group-focus-within:text-indigo-500 transition-colors">
            <Search size={18} />
          </div>
          <Input
            placeholder="Filtrer par nom ou matricule..."
            value={search}
            disabled={isBusy}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-12 bg-white dark:bg-slate-900 rounded-2xl border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-inner focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium disabled:opacity-60"
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button 
            variant="outline"
            className="h-11 px-5 rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-30"
            disabled={!selectedId || isBusy}
          >
            <History size={18} /> <span className="hidden sm:inline">Historique</span>
          </Button>

          <Button 
            variant="outline"
            className="h-11 px-5 rounded-xl border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all disabled:opacity-30"
            disabled={!selectedId || isBusy}
            onClick={() => onPrintBulletin?.(selectedId!)}
          >
            <Printer size={18} /> <span className="hidden sm:inline">Imprimer Bulletin</span>
          </Button>

          <Button 
            onClick={handleDeleteResult}
            className="h-11 px-5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 font-bold flex items-center gap-2 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all disabled:opacity-30 shadow-sm"
            disabled={!selectedId}
          >
            <Trash2 size={18} /> <span className="hidden sm:inline">Supprimer</span>
          </Button>

          <StudentDialog 
            mode="edit" 
            initialData={selectedStudent} 
            trigger={
              <Button 
                className="h-11 px-5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 font-bold flex items-center gap-2 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all disabled:opacity-30 shadow-sm"
                disabled={!selectedId}
              >
                <Edit3 size={18} /> <span className="hidden sm:inline">Modifier</span>
              </Button>
            }
          />

          <StudentDialog 
            mode="add" 
            trigger={
              <Button className="h-11 px-6 rounded-xl bg-indigo-600 text-white font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95">
                <Plus size={18} /> <span>Ajouter</span>
              </Button>
            }
          />
        </div>
      </div>

      {/* Main Grid Container */}
      <div className="bg-white dark:bg-[#131622]/90 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden relative group/grid">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1400px]">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800">
                <TableHead className="text-indigo-400">MATRICULE</TableHead>
                <TableHead className="w-[300px] text-white">NOM & PRENOM</TableHead>
                {!isHigherEd && (
                  <>
                    <TableHead className="text-center text-emerald-400">PRS</TableHead>
                    <TableHead className="text-center text-rose-400">ABS</TableHead>
                    <TableHead className="text-center text-indigo-300">MOY. CLASSE</TableHead>
                    <TableHead className="text-center text-indigo-300">NOTE COMPO</TableHead>
                    <TableHead className="text-center text-amber-400">TOTAL /40</TableHead>
                    <TableHead className="text-center text-slate-300">MOY. ANT.</TableHead>
                  </>
                )}
                {isHigherEd && <TableHead className="text-center text-white">NOTE /20</TableHead>}
                <TableHead className="text-center text-white">MOY /20</TableHead>
                <TableHead className="text-center text-indigo-400">MOY. COEF</TableHead>
                <TableHead className="text-white">OBSERVATION</TableHead>
                <TableHead className="text-center text-white">APPRECIATION</TableHead>
                <TableHead className="text-center text-amber-500">RANG</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((row) => (
                <tr
                  key={row.studentId}
                  onClick={() => setSelectedId(row.studentId)}
                  className={`group transition-all cursor-pointer relative ${
                    selectedId === row.studentId 
                      ? 'bg-indigo-50/80 ring-2 ring-inset ring-indigo-500/20' 
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter bg-slate-100 px-2.5 py-1 rounded-lg group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                      {row.matricule}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-black text-slate-800 text-sm tracking-tight">{row.name}</p>
                    {selectedId === row.studentId && (
                      <motion.div layoutId="active-indicator" className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                    )}
                  </td>
                  {!isHigherEd && (
                    <>
                      <td className="px-4 py-4 text-center">
                        <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                          {row.presents}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Input
                          type="number"
                          value={row.absents}
                          onChange={(e) => updateRow(row.studentId, 'absents', parseInt(e.target.value) || 0)}
                          className="w-14 h-10 text-center rounded-xl bg-slate-50 border-slate-100 text-rose-600 font-black mx-auto focus:ring-rose-500/10 focus:border-rose-300"
                        />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <GradeInput
                          value={row.classWork}
                          onChange={(v) => handleGradeInput(row.studentId, 'classWork', v)}
                          placeholder="Moy C"
                          disabled={readOnly}
                        />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <GradeInput
                          value={row.examNote}
                          onChange={(v) => handleGradeInput(row.studentId, 'examNote', v)}
                          placeholder="Compo"
                          disabled={readOnly}
                        />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-xs font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 shadow-sm">
                          {row.total.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-[10px] font-bold text-slate-400 italic">
                          {row.history !== "N/A" ? `${row.history}/20` : "-"}
                        </span>
                      </td>
                    </>
                  )}
                  {isHigherEd && (
                    <td className="px-4 py-4 text-center">
                      <GradeInput
                        value={row.examNote}
                        onChange={(v) => handleGradeInput(row.studentId, 'examNote', v)}
                        placeholder="Note"
                        disabled={readOnly}
                      />
                    </td>
                  )}
                  <td className="px-4 py-4 text-center">
                    <span className={`text-sm font-black tracking-tighter ${row.average >= 10 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {row.average.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm font-black text-indigo-600 bg-indigo-50/50 px-2 py-1 rounded-lg">
                      {row.weighted.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <Input
                      placeholder="Observation..."
                      value={row.observation}
                      onChange={(e) => updateRow(row.studentId, 'observation', e.target.value)}
                      disabled={readOnly}
                      className="min-w-[150px] h-10 rounded-xl border-slate-100 bg-slate-50/30 focus:bg-white transition-all text-xs font-medium"
                    />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <AppreciationBadge text={row.appreciation} />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm font-black text-amber-500 italic tracking-widest">{row.rank}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Bar */}
        <div className="bg-slate-900 px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-indigo-500/20 rounded-[1.25rem] border border-indigo-500/20 shadow-inner">
                  <TrendingUp className="text-indigo-400" size={24} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5">Moyenne de la classe</p>
                  <h4 className="text-2xl font-black text-white leading-none">
                    {stats.avg.toFixed(2)} <span className="text-slate-500 text-sm font-bold">/ 20</span>
                  </h4>
               </div>
            </div>

            <div className="h-10 w-[1px] bg-slate-800 hidden md:block" />

            <div className="flex items-center gap-4 hidden lg:flex">
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5 text-right">Taux de réussite</p>
                  <h4 className="text-2xl font-black text-emerald-400 leading-none text-right">
                    {stats.count > 0 ? Math.round((stats.passed / stats.count) * 100) : 0}%
                  </h4>
               </div>
               <div className="p-3 bg-emerald-500/20 rounded-[1.25rem] border border-emerald-500/20">
                  <CheckCircle2 className="text-emerald-400" size={24} />
               </div>
            </div>
          </div>

          <Button
            onClick={handleSaveInternal}
            disabled={isSaving || readOnly}
            className="h-14 px-10 rounded-[1.25rem] bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-500/40 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 group"
          >
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} className="group-hover:rotate-12 transition-transform" />}
            Enregistrer les Notes
          </Button>
        </div>
      </div>
      
      {/* Visual Tip */}
      <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest py-4">
         <Zap size={14} className="text-amber-400" />
         <span>Les changements sont calculés en temps réel</span>
      </div>
    </div>
  );
}

function StatsCard({ icon, label, value, color }: any) {
  const bgColors: any = {
    indigo: "from-indigo-500/10 to-transparent border-indigo-100 dark:border-indigo-900/30",
    amber: "from-amber-500/10 to-transparent border-amber-100 dark:border-amber-900/30",
    emerald: "from-emerald-500/10 to-transparent border-emerald-100 dark:border-emerald-900/30",
    rose: "from-rose-500/10 to-transparent border-rose-100 dark:border-rose-900/30"
  };

  return (
    <div className={`bg-white dark:bg-[#131622]/90 rounded-[2rem] p-6 border-2 border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden bg-gradient-to-br ${bgColors[color]}`}>
      <div className="relative z-10 flex flex-col gap-4">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl w-fit shadow-sm border border-slate-100 dark:border-slate-800 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-400 mb-1">{label}</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">{value}</p>
        </div>
      </div>
    </div>
  );
}

function TableHead({ children, className }: any) {
  return (
    <th className={`px-6 py-5 text-[10px] font-black uppercase tracking-[0.15em] ${className}`}>
      {children}
    </th>
  );
}

function GradeInput({ value, onChange, placeholder, disabled }: { value: string; onChange: (v: string) => void, placeholder?: string, disabled?: boolean }) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "0.00"}
      disabled={disabled}
      className="w-20 h-10 text-center rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 font-black text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all text-sm"
    />
  );
}

function AppreciationBadge({ text }: { text: string }) {
  const getStyles = () => {
    const t = text.toLowerCase();
    if (t.includes("excel") || t.includes("très bien")) return "bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-50";
    if (t.includes("bien")) return "bg-indigo-100 text-indigo-700 border-indigo-200 shadow-sm shadow-indigo-50";
    if (t.includes("passable")) return "bg-amber-100 text-amber-700 border-amber-200 shadow-sm shadow-amber-50";
    if (t.includes("insuffisant") || t.includes("médiocre")) return "bg-rose-100 text-rose-700 border-rose-200 shadow-sm shadow-rose-50";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  return (
    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getStyles()}`}>
      {text}
    </span>
  );
}