"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { saveTimetableEntry, deleteTimetableEntry } from "@/domains/academics/actions/timetable.actions";
import { getClasses, getSubjects } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { Plus, Trash2, Edit3, Settings2, Sparkles } from "lucide-react";

interface TimetableGridProps {
  initialEntries: any[];
  settings: any;
  classes: any[];
  currentClassId?: number;
}

export default function TimetableGrid({ initialEntries, settings, classes, currentClassId }: TimetableGridProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [selectedCell, setSelectedCell] = useState<{ day: string; period: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  useEffect(() => {
    getSubjects().then((res: any) => setSubjects(res.data?.data || res.data || []));
    getEmployees().then((res: any) => setTeachers(res.data?.data || res.data || []));
  }, []);

  const days = settings?.days || ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
  const periods = settings?.periods || 6;
  const recess = settings?.recess || 3;

  const getEntry = (day: string, period: number) => {
    return entries.find(e => e.dayName === day && e.periodNumber === period);
  };

  const handleCellClick = (day: string, period: number) => {
    if (!currentClassId) return;
    setSelectedCell({ day, period });
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCell || !currentClassId) return;

    setLoading(true);
    const form = new FormData(e.currentTarget);
    const data = {
      dayName: selectedCell.day,
      periodNumber: selectedCell.period,
      classId: currentClassId,
      subjectId: Number(form.get("subjectId")),
      employeeId: Number(form.get("employeeId")),
    };

    const res = await saveTimetableEntry(data);
    if (res.success) {
      // Optimistic update or refresh? For now, I'll refresh manually if needed, 
      // but revalidatePath will handle the server-side part if I wrap this in a component that fetches.
      // For now, let's just close and hope for the best (or refresh window).
      window.location.reload(); 
    }
    setLoading(false);
    setOpen(false);
  };

  const handleDelete = async (entryId: number) => {
    if (!confirm("Supprimer cette séance ?")) return;
    
    await deleteTimetableEntry(entryId);
    window.location.reload();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-6 border-b border-r border-slate-50 bg-slate-50/30 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Heures</th>
              {days.map((day: string) => (
                <th key={day} className="p-6 border-b border-slate-100 text-sm font-black text-primary uppercase tracking-widest">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: periods }).map((_, i) => {
              const pNum = i + 1;
              const isRecess = pNum === recess;

              return (
                <tr key={pNum}>
                  <td className="p-4 border-r border-b border-slate-50 bg-slate-50/10 text-center">
                    <p className="text-xs font-black text-slate-400">P{pNum}</p>
                    <p className="text-[10px] font-bold text-slate-300 mt-1">
                      {8 + i}:00
                    </p>
                  </td>
                  {days.map((day: string) => {
                    const entry = getEntry(day, pNum);
                    return (
                      <td 
                        key={day} 
                        className={`p-2 border-b border-slate-50 transition-all ${!currentClassId ? 'opacity-50' : 'cursor-pointer hover:bg-slate-50/50'}`}
                        onClick={() => handleCellClick(day, pNum)}
                      >
                        {entry ? (
                          <div className="relative group p-4 rounded-2xl bg-indigo-50 border border-indigo-100 h-24 flex flex-col justify-center animate-in zoom-in duration-300">
                            <p className="font-black text-indigo-700 text-xs leading-tight mb-1 uppercase line-clamp-2">
                              {entry.subject?.subjectName}
                            </p>
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                              {entry.teacher?.nom}
                            </p>
                            
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/50 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-50 transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="h-24 border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center text-slate-200 group-hover:border-primary/20 group-hover:text-primary/20 transition-all">
                             <Plus size={20} />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] glass p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
               <Edit3 className="text-primary" /> Affecter une Séance
            </DialogTitle>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              {selectedCell?.day} - Période {selectedCell?.period}
            </p>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">Matière *</Label>
                <select name="subjectId" required className="w-full rounded-xl border border-slate-200 bg-white px-3 h-12 text-sm font-medium outline-none">
                  <option value="">-- Choisir --</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">Enseignant *</Label>
                <select name="employeeId" required className="w-full rounded-xl border border-slate-200 bg-white px-3 h-12 text-sm font-medium outline-none">
                  <option value="">-- Choisir --</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold">Annuler</Button>
              <Button type="submit" disabled={loading} className="rounded-xl px-8 bg-primary text-white hover:bg-primary/90 font-bold h-11">
                {loading ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
