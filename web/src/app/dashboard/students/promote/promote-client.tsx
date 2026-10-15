"use client";

import * as React from "react";
import { 
  ArrowRight, 
  Search, 
  Filter, 
  Clock, 
  Info, 
  CheckCircle2, 
  Users, 
  AlertTriangle, 
  XCircle, 
  Eye, 
  Download, 
  ChevronDown, 
  MoreVertical,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { promoteStudents } from "@/domains/students/actions/promotion.actions";
import { getClassDisplayName } from "@/domains/academics/utils/class-name";

interface Student {
  id: number;
  nomEtudiant: string;
  numAdmission: string;
  moyenne?: number;
  statut?: string;
  classe: string;
  session: string;
}

interface PromoteClientProps {
  students: Student[];
  classes: any[];
  sessions: any[];
  initialClass?: string;
  initialSession?: string;
}

export default function PromoteClient({ 
  students: allStudents, 
  classes, 
  sessions,
  initialClass,
  initialSession
}: PromoteClientProps) {
  const router = useRouter();
  const [sourceClass, setSourceClass] = React.useState(initialClass || "");
  const [sourceSession, setSourceSession] = React.useState(initialSession || "");
  const [targetClass, setTargetClass] = React.useState("");
  const [targetSession, setTargetSession] = React.useState("");
  const [transferBalance, setTransferBalance] = React.useState(true);
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [isPromoting, setIsPromoting] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  // Helper to normalize academic sessions (e.g. 2025-2026 and 2026-2025 should match)
  // Helper to normalize academic sessions (e.g. 2025-2026 and 2026-2025 should match)
  const normalizeSession = (sessionName: string | null | undefined): string => {
    if (!sessionName) return "";
    const years = sessionName.match(/\d{4}/g);
    if (years && years.length === 2) {
      return years.sort().join("-");
    }
    return cleanString(sessionName);
  };

  // Helper to normalize strings (accents, spaces, casing)
  const cleanString = (val: string | null | undefined): string => {
    if (!val) return "";
    return val
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/\s+/g, ""); // Remove all whitespace
  };

  // Filtering logic
  const filteredStudents = React.useMemo(() => {
    // 1. Strict filter by class and session
    let results = allStudents.filter(s => {
      const matchesSearch = s.nomEtudiant.toLowerCase().includes(search.toLowerCase()) || 
                           s.numAdmission.toLowerCase().includes(search.toLowerCase());
      const matchesClass = !sourceClass || cleanString(s.classe) === cleanString(sourceClass);
      
      const normalizedStudentSession = normalizeSession(s.session);
      const normalizedSourceSession = normalizeSession(sourceSession);
      const matchesSession = !sourceSession || 
                             !s.session || 
                             normalizedStudentSession === normalizedSourceSession;
      
      return matchesSearch && matchesClass && matchesSession;
    });

    // 2. Fallback if 0 results: search by class only (ignoring session filter)
    if (results.length === 0 && sourceClass) {
      results = allStudents.filter(s => {
        const matchesSearch = s.nomEtudiant.toLowerCase().includes(search.toLowerCase()) || 
                             s.numAdmission.toLowerCase().includes(search.toLowerCase());
        const matchesClass = cleanString(s.classe) === cleanString(sourceClass);
        return matchesSearch && matchesClass;
      });
    }

    return results;
  }, [allStudents, search, sourceClass, sourceSession]);

  const stats = React.useMemo(() => {
    const total = filteredStudents.length;
    // Mocking eligibility for demo based on moyenne if exists, else random
    const eligibles = filteredStudents.filter(s => (s.moyenne || 12) >= 10).length;
    const atRisk = filteredStudents.filter(s => (s.moyenne || 12) < 10 && (s.moyenne || 12) >= 8).length;
    const nonEligibles = total - eligibles - atRisk;

    return { total, eligibles, atRisk, nonEligibles };
  }, [filteredStudents]);

  const chartData = [
    { name: "Éligibles", value: stats.total > 0 ? (stats.eligibles / stats.total) * 100 : 0, color: "#10b981" },
    { name: "En risque", value: stats.total > 0 ? (stats.atRisk / stats.total) * 100 : 0, color: "#f59e0b" },
    { name: "Non éligibles", value: stats.total > 0 ? (stats.nonEligibles / stats.total) * 100 : 0, color: "#ef4444" },
  ];

  const handlePromote = async () => {
    if (selectedIds.length === 0) {
      toast.error("Veuillez sélectionner au moins un étudiant.");
      return;
    }
    if (!targetClass || !targetSession) {
      toast.error("Veuillez sélectionner la classe et la session de destination.");
      return;
    }

    setIsPromoting(true);
    try {
      const res = await promoteStudents({
        studentIds: selectedIds,
        targetClass,
        targetSession,
        transferBalance
      }) as any;

      if (res.success || res.data?.success) {
        toast.success(res.message || res.data?.message || "Promotion réussie !");
        setSelectedIds([]);
        router.refresh();
      } else {
        toast.error(res.error || "Une erreur est survenue.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur de communication avec le serveur.");
    } finally {
      setIsPromoting(false);
    }
  };

  const handleOpenPreview = () => {
    if (selectedIds.length === 0) {
      toast.warning("Veuillez sélectionner au moins un élève.");
      return;
    }
    if (!targetClass || !targetSession) {
      toast.warning("Veuillez sélectionner la classe et la session de destination.");
      return;
    }
    setIsPreviewOpen(true);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map(s => s.id));
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#fdfdff] dark:bg-[#0A0C10] min-h-screen font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm dark:shadow-none">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Promotion des Élèves</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">Transférez les élèves vers la classe supérieure pour la nouvelle année</p>
          </div>
        </div>
        <Button variant="ghost" className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
          <Clock size={18} />
          Historique des promotions
        </Button>
      </div>

      {/* Selection Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Source Class */}
        <div className="bg-white dark:bg-[#131622] p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 flex items-center justify-center">
              <ArrowRight size={20} className="rotate-180" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Classe Actuelle (Source)</h3>
          </div>
          <p className="text-xs text-slate-400 font-medium -mt-4">Sélectionnez la classe actuelle des élèves</p>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe</label>
              <div className="relative">
                <select 
                  value={sourceClass}
                  onChange={(e) => setSourceClass(e.target.value)}
                  className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-4 font-bold text-slate-700 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Sélectionner</option>
                  {classes.map(c => {
                    const className = getClassDisplayName(c, "");
                    return className ? <option key={c.id} value={className}>{className}</option> : null;
                  })}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Session</label>
              <div className="relative">
                <select 
                  value={sourceSession}
                  onChange={(e) => setSourceSession(e.target.value)}
                  className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-4 font-bold text-slate-700 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Sélectionner</option>
                  {sessions.map(s => <option key={s.id} value={s.sessionName}>{s.sessionName}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-indigo-50/50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400">
            <Info size={18} />
            <span className="text-xs font-bold">Effectif total : {stats.total} élèves</span>
          </div>
        </div>

        {/* Target Class */}
        <div className="bg-white dark:bg-[#131622] p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center">
              <ArrowRight size={20} />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Classe Suivante (Destination)</h3>
          </div>
          <p className="text-xs text-slate-400 font-medium -mt-4">Sélectionnez la classe de destination</p>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe</label>
              <div className="relative">
                <select 
                  value={targetClass}
                  onChange={(e) => setTargetClass(e.target.value)}
                  className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-4 font-bold text-slate-700 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Sélectionner</option>
                  {classes.map(c => {
                    const className = getClassDisplayName(c, "");
                    return className ? <option key={c.id} value={className}>{className}</option> : null;
                  })}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Session</label>
              <div className="relative">
                <select 
                  value={targetSession}
                  onChange={(e) => setTargetSession(e.target.value)}
                  className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-4 font-bold text-slate-700 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Sélectionner</option>
                  {sessions.map(s => <option key={s.id} value={s.sessionName}>{s.sessionName}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-emerald-50/50 dark:bg-emerald-500/10 rounded-2xl text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={18} />
            <span className="text-xs font-bold">Les élèves retenus seront transférés vers la classe sélectionnée.</span>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white dark:bg-[#131622] p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-10 divide-x divide-slate-100 dark:divide-slate-800 overflow-x-auto pb-2 md:pb-0">
          <div className="flex items-center gap-4 shrink-0">
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center">
              <Users size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Élèves dans la classe</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{stats.total}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 pl-10 shrink-0">
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Éligibles à la promotion</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{stats.eligibles} <span className="text-sm font-bold text-slate-400 dark:text-slate-500">({stats.total > 0 ? ((stats.eligibles / stats.total) * 100).toFixed(1) : 0}%)</span></p>
            </div>
          </div>

          <div className="flex items-center gap-4 pl-10 shrink-0">
            <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">En risque</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{stats.atRisk} <span className="text-sm font-bold text-slate-400 dark:text-slate-500">({stats.total > 0 ? ((stats.atRisk / stats.total) * 100).toFixed(1) : 0}%)</span></p>
            </div>
          </div>

          <div className="flex items-center gap-4 pl-10 shrink-0">
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 flex items-center justify-center">
              <XCircle size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Non éligibles</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{stats.nonEligibles} <span className="text-sm font-bold text-slate-400 dark:text-slate-500">({stats.total > 0 ? ((stats.nonEligibles / stats.total) * 100).toFixed(1) : 0}%)</span></p>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-6">
          <div className="w-16 h-16">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={20}
                  outerRadius={30}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1">
            {chartData.map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{entry.name}</span>
                </div>
                <span className="text-[10px] font-black text-slate-900 dark:text-white">{entry.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-[#131622] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* Table Header/Toolbar */}
        <div className="p-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Liste des élèves à promouvoir</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-1">Sélectionnez les élèves et lancez le processus de promotion.</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500" size={16} />
                <input 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un élève..." 
                  className="w-full pl-10 pr-4 h-11 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <Button variant="outline" className="h-11 px-5 rounded-xl border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold flex items-center gap-2">
                <Filter size={16} /> Filtres
              </Button>
              <Button 
                onClick={handleOpenPreview}
                className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 dark:shadow-none transition-all"
              >
                <Eye size={16} /> Aperçu de la promotion
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-grow overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/60 border-y border-slate-100 dark:border-slate-800">
                <th className="px-8 py-4 text-left">
                  <Checkbox 
                    checked={selectedIds.length > 0 && selectedIds.length === filteredStudents.length}
                    onCheckedChange={toggleAll}
                    className="rounded-md border-slate-200 dark:border-slate-700" 
                  />
                </th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-left">Élève</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-left">Moy. Générale</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-left">Décision</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-left">Commentaire</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-left">Statut</th>
                <th className="px-8 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const moyenne = student.moyenne || 12;
                  const status = moyenne >= 10 ? "Éligible" : moyenne >= 8 ? "En risque" : "Non éligible";
                  const decision = moyenne >= 10 ? "Promu" : "En risque";

                  return (
                    <tr key={student.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-8 py-4">
                        <Checkbox 
                          checked={selectedIds.includes(student.id)} 
                          onCheckedChange={() => toggleSelect(student.id)}
                          className="rounded-md border-slate-200 dark:border-slate-700" 
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800">
                            <Users size={20} className="text-indigo-300 dark:text-indigo-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{student.nomEtudiant}</p>
                              {student.session && (
                                <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded text-[9px] font-bold">
                                  {student.session}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-tight">{student.numAdmission}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className={cn(
                          "text-sm font-black",
                          moyenne >= 10 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-500 dark:text-rose-400"
                        )}>
                          {moyenne.toFixed(2)} <span className="text-[10px] text-slate-400 dark:text-slate-500">/ 20</span>
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative w-32">
                          <select 
                            defaultValue={decision}
                            className={cn(
                              "w-full h-9 px-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] font-bold outline-none appearance-none cursor-pointer",
                              decision === "Promu" ? "text-emerald-600 dark:text-emerald-400" : decision === "En risque" ? "text-amber-600 dark:text-amber-400" : "text-rose-500 dark:text-rose-400"
                            )}
                          >
                            <option value="Promu">Promu</option>
                            <option value="En risque">En risque</option>
                            <option value="Non promu">Non promu</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 pointer-events-none" size={12} />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <input 
                          placeholder="Ajouter un commentaire..."
                          className="w-full h-10 px-4 bg-slate-50 dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-xl text-[11px] font-medium text-slate-600 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-200 dark:focus:border-slate-700 focus:bg-white dark:focus:bg-slate-900 transition-all"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            status === "Éligible" ? "bg-emerald-500" : status === "En risque" ? "bg-amber-500" : "bg-rose-500"
                          )} />
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            status === "Éligible" ? "text-emerald-600 dark:text-emerald-400" : status === "En risque" ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                          )}>
                            {status}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <button className="p-2 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20 text-slate-400 dark:text-slate-500">
                      <Users size={64} />
                      <p className="text-xl font-bold text-slate-900 dark:text-white">Aucun étudiant trouvé</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">{selectedIds.length} sélectionnés</span>
            </div>
            <button 
              onClick={() => setSelectedIds([])}
              className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline"
            >
              Tout désélectionner
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-12 px-6 rounded-xl border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-500/10">
              <Download size={18} /> Exporter la liste
            </Button>
            <Button 
              disabled={isPromoting || selectedIds.length === 0}
              onClick={handlePromote}
              className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-indigo-100 dark:shadow-none transition-all disabled:opacity-50"
            >
              {isPromoting ? "Traitement..." : <><ArrowUpRight size={18} /> Lancer la promotion</>}
            </Button>
          </div>
        </div>
      </div>
      
      {/* ON-SCREEN DEBUGGING PANEL */}
      <div className="mt-8 p-6 bg-slate-900 border border-slate-800 rounded-3xl text-slate-200 font-mono text-xs shadow-2xl space-y-4">
        <h3 className="text-sm font-bold text-rose-400 border-b border-slate-800 pb-2">💻 Diagnostic de la Promotion des Élèves</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-slate-400 font-bold">Filtres Sélectionnés :</p>
            <p>Source Class: <span className="text-amber-400">"{sourceClass}"</span> (Cleaned: "{cleanString(sourceClass)}")</p>
            <p>Source Session: <span className="text-amber-400">"{sourceSession}"</span> (Cleaned: "{cleanString(sourceSession)}")</p>
          </div>
          <div>
            <p className="text-slate-400 font-bold">Statistiques :</p>
            <p>Total allStudents: <span className="text-emerald-400">{allStudents.length}</span></p>
            <p>Filtered Students: <span className="text-emerald-400">{filteredStudents.length}</span></p>
          </div>
        </div>
        
        <div>
          <p className="text-slate-400 font-bold mb-2">Liste des Classes Configures dans la Base :</p>
          <div className="max-h-24 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-wrap gap-2">
            {classes.map((c: any) => (
              <span key={c.id} className="bg-slate-800 px-2 py-1 rounded text-[10px]">
                {c.className || c.class_name || c.name} (ID: {c.id})
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-slate-400 font-bold mb-2">Échantillon des 15 premiers étudiants (Données brutes) :</p>
          <div className="max-h-48 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            {allStudents.slice(0, 15).map((s: any) => (
              <div key={s.id} className="flex justify-between hover:bg-slate-900 p-1 rounded">
                <span>👤 {s.nomEtudiant} (ID: {s.id})</span>
                <span className="text-amber-500">Classe: "{s.classe}" | Session: "{s.session}"</span>
              </div>
            ))}
            {allStudents.length === 0 && <p className="text-rose-400 text-center py-4">Aucun étudiant trouvé dans allStudents (Array vide !)</p>}
          </div>
        </div>
      </div>

      {/* PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0E1017] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl dark:shadow-black/60 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/60">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Aperçu de la Promotion</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-1">Vérifiez les détails avant de valider.</p>
              </div>
              <button 
                onClick={() => setIsPreviewOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto space-y-6 flex-grow">
              {/* Transfer Details Card */}
              <div className="grid grid-cols-2 gap-4 p-6 bg-indigo-50/30 dark:bg-indigo-500/10 border border-indigo-50 dark:border-indigo-500/20 rounded-3xl">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Classe de Départ (Source)</span>
                  <span className="text-sm font-black text-indigo-900 dark:text-white mt-1 block">{sourceClass || "Non spécifiée"}</span>
                  <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400 block">{sourceSession || "Toutes les sessions"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Classe d'Arrivée (Destination)</span>
                  <span className="text-sm font-black text-emerald-900 dark:text-white mt-1 block">{targetClass}</span>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">{targetSession}</span>
                </div>
              </div>

              {/* Selected Students List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Élèves sélectionnés ({selectedIds.length})</h4>
                <div className="border border-slate-100 dark:border-slate-800 rounded-3xl divide-y divide-slate-50 dark:divide-slate-800/60 overflow-hidden max-h-60 overflow-y-auto bg-slate-50/20 dark:bg-slate-900/40">
                  {allStudents.filter(s => selectedIds.includes(s.id)).map(student => (
                    <div key={student.id} className="p-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                          <Users size={16} className="text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-white">{student.nomEtudiant}</p>
                          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500">{student.numAdmission}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded text-[9px] font-bold">
                          {(student.moyenne || 10).toFixed(2)} / 20
                        </span>
                        <span className="text-slate-400 dark:text-slate-500 text-xs">➔</span>
                        <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">{targetClass}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-[#0E1017]">
              <Button 
                variant="outline" 
                onClick={() => setIsPreviewOpen(false)}
                className="h-12 px-6 rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold"
              >
                Annuler
              </Button>
              <Button 
                disabled={isPromoting}
                onClick={async () => {
                  setIsPreviewOpen(false);
                  await handlePromote();
                }}
                className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-indigo-100 dark:shadow-none transition-all"
              >
                {isPromoting ? "Traitement..." : <><CheckCircle2 size={18} /> Confirmer la promotion</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
