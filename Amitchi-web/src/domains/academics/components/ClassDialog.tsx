"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createClass, updateClass, getSections } from "@/domains/academics/actions/academics.actions";
import { ClassFormData } from "../validators/academics.schema";
import { Edit, Loader2 } from "lucide-react";
import { useEffect } from "react";

interface ClassDialogProps {
  mode?: "add" | "edit";
  initialData?: any;
  trigger?: React.ReactNode;
}

export default function ClassDialog({ mode = "add", initialData, trigger }: ClassDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
   const [error, setError] = useState("");
  const [sections, setSections] = useState<any[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);

  useEffect(() => {
    if (open) {
      setLoadingSections(true);
      getSections().then(res => {
        if (res.success && res.data) setSections(res.data);
        setLoadingSections(false);
      });
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data: ClassFormData = {
      className: form.get("className") as string,
      sectionId: Number(form.get("sectionId")) || undefined,
    };

    let result;
    if (mode === "edit" && initialData?.id) {
      result = await updateClass(initialData.id, data);
    } else {
      result = await createClass(data);
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
          <button className="rounded-2xl px-6 py-4 bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all font-bold gap-2 flex items-center justify-center">
            Ajouter une classe
          </button>
        )}
      </div>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] glass p-8 border-none shadow-2xl">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">
            {mode === "edit" ? "Modifier la Classe" : "Nouvelle Classe"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-2xl text-sm font-bold animate-shake">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 ml-1">Nom de la classe *</Label>
            <Input name="className" defaultValue={initialData?.className} required placeholder="ex: 1ère AS Sciences" className="rounded-xl h-11" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 ml-1">Série / Section *</Label>
            <select 
              name="sectionId" 
              defaultValue={initialData?.sectionId || ""} 
              required
              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
              disabled={loadingSections}
            >
               <option value="" disabled>-- Choisir une section --</option>
               {sections.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.sectionName} ({s.educationalLevel})
                  </option>
               ))}
            </select>
            {loadingSections && <div className="flex items-center gap-2 text-[10px] text-slate-400 ml-1 mt-1"><Loader2 size={10} className="animate-spin"/> Chargement des sections...</div>}
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl px-8 bg-primary text-white hover:bg-primary/90 font-bold h-11">
              {loading ? "Enregistrement..." : mode === "edit" ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
