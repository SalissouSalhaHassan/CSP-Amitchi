"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createExam } from "@/domains/academics/actions/exams.actions";
import { getClasses, getSubjects, getPeriods } from "@/domains/academics/actions/academics.actions";
import { ExamFormData } from "../validators/exams.schema";
import { PlusCircle } from "lucide-react";
import { getClassDisplayName } from "@/domains/academics/utils/class-name";
import { useOfflineMutation } from "@/hooks/use-offline-mutation";
import { resolveOnlineOrCached } from "@/infrastructure/local-db/references";

export default function ExamDialog() {
  const { mutate } = useOfflineMutation<ExamFormData>();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      resolveOnlineOrCached("class", () => getClasses(), "className").then(setClasses);
      resolveOnlineOrCached("subject", () => getSubjects(), "subjectName").then(setSubjects);
      resolveOnlineOrCached("period", () => getPeriods(), "name").then(setPeriods);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data: ExamFormData = {
      examName: form.get("examName") as string,
      classId: Number(form.get("classId")),
      subjectId: Number(form.get("subjectId")),
      periodId: form.get("periodId") ? Number(form.get("periodId")) : undefined,
      examDate: form.get("examDate") as string,
      maxMarks: Number(form.get("maxMarks")) || 20,
    };

    const result = await mutate(data, {
      targetTable: "exams",
      onlineAction: createExam,
    });
    setLoading(false);

    if (result.success) {
      setOpen(false);
    } else if (result.error) {
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="rounded-2xl px-6 py-4 bg-primary text-white hover:bg-primary/90 shadow-xl shadow-indigo-100 transition-all font-bold gap-2 flex items-center justify-center">
        <PlusCircle size={20} /> Programmer un Examen
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl rounded-[2.5rem] glass p-8 border-none shadow-2xl">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">
            Nouvel Examen
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-2xl text-sm font-bold animate-shake">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 ml-1">Nom de l'Examen *</Label>
              <Input name="examName" placeholder="ex: Composition 1er Trimestre" required className="rounded-xl border-slate-200 h-12" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">Classe *</Label>
                <select name="classId" required className="w-full rounded-xl border border-slate-200 bg-white px-3 h-12 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">-- Choisir --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{getClassDisplayName(c)}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">Matière *</Label>
                <select name="subjectId" required className="w-full rounded-xl border border-slate-200 bg-white px-3 h-12 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">-- Choisir --</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">Période (Optionnel)</Label>
                <select name="periodId" className="w-full rounded-xl border border-slate-200 bg-white px-3 h-12 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">-- Aucune --</option>
                  {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">Date de l'Examen</Label>
                <Input name="examDate" type="date" required className="rounded-xl border-slate-200 h-12" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">Note Maximale</Label>
                <Input name="maxMarks" type="number" defaultValue={20} required className="rounded-xl border-slate-200 h-12" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold h-12">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl px-10 bg-primary text-white hover:bg-primary/90 font-bold h-12 shadow-lg shadow-indigo-100 transition-all">
              {loading ? "Création..." : "Programmer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
