"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createSection, updateSection, getEducationalLevels } from "@/domains/academics/actions/academics.actions";

interface SectionDialogProps {
  mode?: "add" | "edit";
  initialData?: any;
  trigger?: React.ReactNode;
}

export default function SectionDialog({ mode = "add", initialData, trigger }: SectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [levels, setLevels] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      getEducationalLevels().then((res: any) => {
        setLevels(res.data?.data || res.data || []);
      });
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data = {
      sectionName: form.get("sectionName") as string,
      educationalLevel: form.get("educationalLevel") as string,
      series: form.get("series") as string,
    };

    let result;
    if (mode === "edit" && initialData?.id) {
      result = await updateSection(initialData.id, data);
    } else {
      result = await createSection(data);
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
          <button className="rounded-2xl px-6 py-4 bg-amber-500 text-white hover:bg-amber-600 shadow-xl shadow-amber-200 transition-all font-bold gap-2 flex items-center justify-center">
            Ajouter une Section
          </button>
        )}
      </div>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] glass p-8 border-none shadow-2xl">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">
            {mode === "edit" ? "Modifier la Section" : "Nouvelle Section"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-2xl text-sm font-bold animate-shake">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 ml-1">Nom de la Section *</Label>
            <Input name="sectionName" defaultValue={initialData?.sectionName} required placeholder="ex: Littéraire" className="rounded-xl h-11" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 ml-1">Niveau d'Étude</Label>
            <select name="educationalLevel" defaultValue={initialData?.educationalLevel || ""} className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white">
              <option value="">Sélectionner un niveau</option>
              {levels.map(l => (
                <option key={l.id} value={l.levelName}>{l.levelName}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl px-8 bg-amber-500 text-white hover:bg-amber-600 font-bold h-11">
              {loading ? "Enregistrement..." : mode === "edit" ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
