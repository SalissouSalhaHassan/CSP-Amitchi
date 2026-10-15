"use client";
// Refreshed

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { 
  Zap, Calendar, Users, Settings, FileText, 
  LayoutGrid, Wand2, Plus, Info, Check, 
  AlertCircle, Download, Clock, MapPin,
  ChevronLeft, ChevronRight, Sparkles, Filter,
  MousePointer2, Trash2, Edit3, BarChart3,
  Heart, ShieldCheck, Scale, MousePointerClick,
  Settings2, BookOpen, UserCheck, BrainCircuit, Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { 
  getTimetableEntries, 
  getTimetableSettings, 
  runAISolver,
  getGlobalOccupancy,
  deleteTimetableEntry 
} from '@/domains/academics/actions/timetable.actions';
import { ConstraintsDialog, TimetableSettingsDialog, AssignmentsDialog, PrintOptionsDialog } from './TimetableDialogs';
import { getClassDisplayName } from '@/domains/academics/utils/class-name';

interface TimetableManagerProps {
  classes: any[];
  teachers: any[];
  subjects: any[];
  currentSession: any;
}

export default function TimetableManager({ classes, teachers, subjects, currentSession }: TimetableManagerProps) {
  const [viewMode, setViewMode] = useState<'class' | 'teacher' | 'global'>('class');
  const [selectedId, setSelectedId] = useState<number | null>(classes[0]?.id || null);
  const [entries, setEntries] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [globalData, setGlobalData] = useState<any>(null);
  const [isPending, startTransition] = useTransition();
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Dialog States
  const [showConstraints, setShowConstraints] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAssignments, setShowAssignments] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);

  // Load settings and entries
  useEffect(() => {
    if (!selectedId) {
      if (viewMode === 'class' && classes.length > 0) setSelectedId(classes[0].id);
      else if (viewMode === 'teacher' && teachers.length > 0) setSelectedId(teachers[0].id);
    }
  }, [viewMode, classes, teachers, selectedId]);

  useEffect(() => {
    async function load() {
      if (viewMode === 'class' && !selectedId) return;
      
      const sRes = await getTimetableSettings(viewMode === 'class' ? selectedId! : undefined);
      if (sRes.success) setSettings(sRes.data);

      if (viewMode === 'global') {
        const gRes = await getGlobalOccupancy() as any;
        if (gRes.success) setGlobalData(gRes.data);
      } else if (selectedId) {
        const eRes = await getTimetableEntries(viewMode as any, selectedId) as any;
        if (eRes.success) setEntries(eRes.data || []);
      }
    }
    load();
  }, [viewMode, selectedId, showSettings, showAssignments]);

  const days = settings?.days.split(',') || ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
  const periods = settings?.periods || 6;

  const handleRunAI = async () => {
    if (!currentSession?.id) {
       alert("Erreur : Aucune session active sélectionnée.");
       return;
    }

    if (!confirm("Lancer l'IA pour générer l'emploi du temps ? Cela écrasera les données actuelles.")) return;
    
    setIsAiLoading(true);
    startTransition(async () => {
       try {
         const res = await runAISolver(currentSession.id) as any;
         setIsAiLoading(false);
         
         if (res.success) {
           alert("Optimisation terminée : " + (res.message || res.data?.message || "Success"));
           // Reload current view
           if (selectedId) {
             const eRes = await getTimetableEntries(viewMode as any, selectedId) as any;
             if (eRes.success) setEntries(eRes.data || []);
           }
         } else {
           alert("Erreur IA : " + res.error);
         }
       } catch (error: any) {
         setIsAiLoading(false);
         alert("Erreur critique lors de la génération : " + error.message);
       }
    });
  };

  const handleExportPDF = () => {
    setShowPrintOptions(true);
  };

  const getCellData = (day: string, period: number) => {
    return entries.find(e => e.dayName === day && e.periodNumber === period);
  };

  // Metrics (Mocked based on logic similar to Python)
  const metrics = useMemo(() => {
    return [
      { label: "Équité (Sوابع)", value: "95%", icon: <Scale size={16} />, color: "text-emerald-400" },
      { label: "Équilibre", value: "88%", icon: <BarChart3 size={16} />, color: "text-amber-400" },
      { label: "Santé", value: "100%", icon: <ShieldCheck size={16} />, color: "text-indigo-400" }
    ];
  }, [entries]);

  return (
    <div className="flex flex-col h-full bg-[#0E1018] text-slate-200 rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.5)] relative">
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full translate-x-1/2 translate-y-1/2 pointer-events-none" />

      {/* Dialogs */}
      <ConstraintsDialog open={showConstraints} onOpenChange={setShowConstraints} teachers={teachers} />
      <TimetableSettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      <AssignmentsDialog open={showAssignments} onOpenChange={setShowAssignments} classes={classes} teachers={teachers} subjects={subjects} />
      <PrintOptionsDialog
        open={showPrintOptions}
        onOpenChange={setShowPrintOptions}
        currentClassId={viewMode === "class" ? selectedId : null}
        currentTeacherId={viewMode === "teacher" ? selectedId : null}
        currentMode={viewMode}
        selectedName={
          viewMode === "class"
            ? classes.find((c) => c.id === selectedId)?.className
            : viewMode === "teacher"
            ? teachers.find((t) => t.id === selectedId)?.nom
            : undefined
        }
      />

      {/* 1. Ultra-Premium Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5 bg-white/[0.04] backdrop-blur-3xl border-b border-white/10">
        <div className="flex items-center gap-8">
          <div className="w-20 h-20 rounded-[2.2rem] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 ring-1 ring-white/20">
            <Calendar size={40} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-white">
               Emploi du Temps <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Intelligent</span>
            </h1>
            <p className="text-slate-400 text-sm font-black uppercase tracking-widest flex items-center gap-3 mt-1 opacity-70">
              <Sparkles size={16} className="text-indigo-400 animate-pulse" />
              Moteur IA v2.4 • {currentSession.sessionName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 bg-black/40 p-3 rounded-[2rem] border border-white/5 shadow-inner">
          <div className="flex bg-white/5 rounded-2xl p-1.5 gap-1">
            {['class', 'teacher', 'global'].map((mode) => (
              <button 
                key={mode}
                onClick={() => setViewMode(mode as any)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500",
                  viewMode === mode 
                    ? 'bg-indigo-500 text-white shadow-[0_5px_15px_rgba(99,102,241,0.4)] scale-105' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                )}
              >
                {mode === 'class' ? 'Classe' : mode === 'teacher' ? 'Prof' : 'Global'}
              </button>
            ))}
          </div>
          
          <select 
            value={selectedId || ''} 
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="bg-black/60 border border-white/5 rounded-2xl px-6 py-2.5 text-xs font-black text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/30 min-w-[240px] appearance-none cursor-pointer"
          >
            {viewMode === 'class' ? classes.map(c => <option key={c.id} value={c.id}>{getClassDisplayName(c)}</option>) : teachers.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
          </select>

          <Button 
            onClick={handleRunAI}
            disabled={isAiLoading}
            className="h-12 bg-indigo-500 hover:bg-indigo-600 text-white font-black px-8 rounded-2xl gap-3 shadow-xl shadow-indigo-500/20 group overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            {isAiLoading ? <Zap className="animate-spin" size={20} /> : <Wand2 size={20} />}
            Générer avec IA
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* 2. Glass Sidebar */}
        <aside className="w-72 bg-white/[0.03] backdrop-blur-2xl border-r border-white/[0.08] p-6 flex flex-col gap-8 overflow-y-auto custom-scrollbar">
          <div className="space-y-6">
             <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] px-4">Configuration Maîtresse</h3>
             <div className="space-y-3">
                <ActionBtn icon={<LayoutGrid size={20} />} label="Affectations" sub="Sync Cursus" onClick={() => setShowAssignments(true)} />
                <ActionBtn icon={<Settings2 size={20} />} label="RÈGLES" sub="Contraintes IA" color="text-amber-400" onClick={() => setShowConstraints(true)} />
                <ActionBtn icon={<Clock size={20} />} label="STRATÉGIE" sub="Jours/Heures" color="text-emerald-400" onClick={() => setShowSettings(true)} />
                <ActionBtn icon={<FileText size={20} />} label="PDF" sub="Impression Bulk" color="text-indigo-400" onClick={handleExportPDF} />
             </div>
          </div>

          <div className="space-y-8">
             <h3 className="text-[10px] font-black text-indigo-500/60 uppercase tracking-[0.3em] px-4">Analyse de Performance</h3>
             <div className="grid grid-cols-1 gap-5">
                {metrics.map((m, i) => (
                  <div key={i} className="group bg-white/[0.02] hover:bg-white/[0.04] rounded-[2rem] p-6 border border-white/[0.05] transition-all duration-500 hover:scale-105 active:scale-95 cursor-pointer shadow-lg">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                       <span className="text-[9px] font-black uppercase tracking-[0.2em]">{m.label}</span>
                       <div className="p-2 rounded-lg bg-black/40 border border-white/5">{m.icon}</div>
                    </div>
                    <div className="flex items-end justify-between">
                       <span className={`text-3xl font-black tracking-tighter ${m.color}`}>{m.value}</span>
                       <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full bg-current", m.color)} style={{ width: m.value }}></div>
                       </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>

          <div className="mt-auto bg-gradient-to-br from-indigo-500/10 to-transparent rounded-[2.5rem] p-8 border border-white/[0.05] flex flex-col items-center text-center gap-6 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[40px] -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-all duration-700" />
             <div className="w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-2xl shadow-indigo-500/40 transform group-hover:rotate-12 transition-all duration-500">
                <BrainCircuit size={32} className="text-white" />
             </div>
             <div>
                <p className="text-xs font-black text-white uppercase tracking-widest mb-2">Assistant IA</p>
                <p className="text-[10px] font-bold text-slate-500 leading-relaxed px-2">Optimisation en temps réel des conflits et de l'équité pédagogique.</p>
             </div>
             <Button variant="ghost" className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">
                Support Stratégique
             </Button>
          </div>
        </aside>

        {/* 3. The Ultra-Glass Grid */}
        <main className="flex-1 p-6 overflow-auto bg-[#0E1018]/60 backdrop-blur-sm custom-scrollbar">
          <div className="min-w-full">
             <div className="grid gap-6" style={{ gridTemplateColumns: `100px repeat(${days.length}, 1fr)` }}>
                {/* Header Row */}
                <div className="h-10"></div>
                {days.map((d: any) => (
                  <div key={d} className="pb-4 text-center border-b border-white/[0.03]">
                    <span className="text-[11px] font-black text-indigo-400/80 uppercase tracking-[0.4em] drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]">{d}</span>
                  </div>
                ))}

                {/* Grid Content */}
                {Array.from({ length: periods }).map((_, pIdx) => {
                  const pNum = pIdx + 1;
                  const isRecess = pNum === settings?.recessAfter;
                  
                  return (
                    <React.Fragment key={pIdx}>
                      <div className="flex flex-col items-center justify-center text-slate-600 gap-1 border-r border-white/[0.03] pr-4">
                        <span className="text-sm font-black text-slate-500">H{pNum}</span>
                        <div className="w-8 h-px bg-white/5" />
                        <span className="text-[9px] font-black opacity-40">08:00</span>
                      </div>
                      
                      {days.map((d: any) => {
                        const cell = getCellData(d, pNum);
                        return (
                          <div 
                            key={d} 
                            className={cn(
                              "group relative h-40 rounded-[2.5rem] border transition-all duration-500 flex flex-col items-center justify-center p-6 gap-2 overflow-hidden",
                              cell 
                                ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[0_10px_30px_rgba(99,102,241,0.1)] hover:bg-indigo-500/15 hover:border-indigo-500/50 hover:scale-[1.02] hover:-translate-y-1' 
                                : 'bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.06] hover:border-white/[0.15]'
                            )}
                          >
                            {cell ? (
                              <>
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500/50 to-purple-500/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-1 group-hover:scale-110 transition-transform duration-500">
                                   <BookOpen size={16} className="text-indigo-400" />
                                </div>
                                <span className="text-xs font-black text-white uppercase tracking-[0.1em] text-center leading-tight">{cell.subject?.subjectName}</span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">{cell.teacher?.nom}</span>
                                
                                <div className="absolute bottom-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                                   <button className="w-9 h-9 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/20 transition-all"><Edit3 size={16} /></button>
                                   <button 
                                      onClick={() => { if(confirm('Supprimer cette séance ?')) startTransition(async () => { await deleteTimetableEntry(cell.id); }); }}
                                      className="w-9 h-9 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-all"
                                   ><Trash2 size={16} /></button>
                                </div>
                              </>
                            ) : (
                              <div className="opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-dashed border-white/10 flex items-center justify-center">
                                   <Plus size={24} className="text-slate-700" />
                                </div>
                                <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.2em]">Slot Libre</span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {isRecess && (
                        <div className="col-span-full py-8 px-24">
                           <div className="h-16 bg-amber-500/[0.03] rounded-[2rem] border border-amber-500/10 flex items-center justify-center gap-6 overflow-hidden relative group shadow-2xl">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/[0.05] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[2000ms]"></div>
                              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                 <Clock size={20} className="text-amber-400 animate-pulse" />
                              </div>
                              <span className="text-xs font-black text-amber-500/60 uppercase tracking-[0.5em]">RÉCRÉATION INTERMÉDIAIRE • 30 MIN</span>
                              <div className="flex items-center gap-2">
                                 <div className="w-1 h-1 rounded-full bg-amber-500/30 animate-ping" />
                                 <div className="w-1 h-1 rounded-full bg-amber-500/30 animate-ping delay-75" />
                                 <div className="w-1 h-1 rounded-full bg-amber-500/30 animate-ping delay-150" />
                              </div>
                           </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
             </div>
          </div>
        </main>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 20px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.08);
          border: 2px solid transparent;
          background-clip: padding-box;
        }
      `}</style>
    </div>
  );
}

function ActionBtn({ icon, label, sub, color = "text-slate-300", onClick }: { icon: any, label: string, sub: string, color?: string, onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-5 p-5 rounded-[1.8rem] hover:bg-white/[0.03] border border-transparent hover:border-white/[0.05] transition-all duration-500 group relative overflow-hidden">
       <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
       <div className={`w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 border border-white/5 relative z-10 ${color}`}>
          {icon}
       </div>
       <div className="text-left relative z-10">
          <div className="text-sm font-black text-white group-hover:text-indigo-400 transition-colors tracking-tight">{label}</div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{sub}</div>
       </div>
    </button>
  );
}
