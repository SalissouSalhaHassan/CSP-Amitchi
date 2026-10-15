"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createHomework, updateHomework } from "@/domains/academics/actions/homework.actions";
import { getClasses, getSubjects } from "@/domains/academics/actions/academics.actions";
import { HomeworkFormData } from "../validators/homework.schema";
import { getClassDisplayName } from "@/domains/academics/utils/class-name";

interface HomeworkDialogProps {
  mode?: "add" | "edit";
  initialData?: any;
  trigger?: React.ReactNode;
}

export default function HomeworkDialog({ mode = "add", initialData, trigger }: HomeworkDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      getClasses(false).then((res: any) => { if (res.data) setClasses(res.data || []); });
      getSubjects().then((res: any) => { if (res.data) setSubjects(res.data || []); });
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data: HomeworkFormData = {
      title: form.get("title") as string,
      description: form.get("description") as string,
      classId: Number(form.get("classId")),
      subjectId: Number(form.get("subjectId")),
      dateDue: form.get("dateDue") as string,
      attachmentPath: form.get("attachmentPath") as string,
    };

    let result;
    if (mode === "edit" && initialData?.id) {
      result = await updateHomework(initialData.id, data);
    } else {
      result = await createHomework(data);
    }

    setLoading(false);

    if (result.success) {
      setOpen(false);
    } else if (result.error) {
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">
        {trigger || (
          <button className="rounded-2xl px-6 py-4 bg-primary text-white hover:bg-primary/90 shadow-xl shadow-indigo-100 transition-all font-bold gap-2 flex items-center justify-center">
            Publier un Devoir
          </button>
        )}
      </div>
      <DialogContent className="sm:max-w-2xl rounded-[2.5rem] glass p-8 border-none shadow-2xl">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">
            {mode === "edit" ? "Modifier le Devoir" : "Nouveau Devoir"}
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
              <Label className="text-xs font-bold text-slate-500 ml-1">Titre du Devoir *</Label>
              <Input name="title" defaultValue={initialData?.title} required className="rounded-xl border-slate-200 h-11" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">Classe *</Label>
                <select name="classId" defaultValue={initialData?.classId} required className="w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-sm font-medium outline-none">
                  <option value="">-- Choisir --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{getClassDisplayName(c)}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">Matière *</Label>
                <select name="subjectId" defaultValue={initialData?.subjectId} required className="w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-sm font-medium outline-none">
                  <option value="">-- Choisir --</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 ml-1">Date d'échéance *</Label>
              <Input name="dateDue" type="date" defaultValue={initialData?.dateDue ? new Date(initialData.dateDue).toISOString().split('T')[0] : ""} required className="rounded-xl border-slate-200 h-11" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 ml-1">Description / Instructions</Label>
              <Textarea name="description" defaultValue={initialData?.description} rows={4} className="rounded-xl border-slate-200" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 ml-1">Lien vers pièce jointe (Optionnel)</Label>
              <Input name="attachmentPath" defaultValue={initialData?.attachmentPath} placeholder="Lien Google Drive, PDF, etc." className="rounded-xl border-slate-200 h-11" />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl px-8 bg-primary text-white hover:bg-primary/90 font-bold h-11 shadow-lg shadow-indigo-100">
              {loading ? "Publication..." : mode === "edit" ? "Mettre à jour" : "Publier le Devoir"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
