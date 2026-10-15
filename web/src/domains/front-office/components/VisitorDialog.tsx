"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { saveVisitor } from "@/domains/front-office/actions/front-office.actions";
import { VisitorFormData } from "../validators/front-office.schema";
import { UserPlus } from "lucide-react";

interface VisitorDialogProps {
  mode?: "add" | "edit";
  initialData?: any;
  trigger?: React.ReactNode;
}

export default function VisitorDialog({ mode = "add", initialData, trigger }: VisitorDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const result = await saveVisitor({
      id: initialData?.id,
      visitorName: form.get("visitorName") as string,
      phone: (form.get("phone") as string) || undefined,
      purpose: form.get("purpose") as string,
      meetingWith: (form.get("meetingWith") as string) || undefined,
      timeIn: (form.get("timeIn") as string) || new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      notes: (form.get("note") as string) || undefined,
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
      <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">
        {trigger || (

        <button className="rounded-2xl px-6 py-4 bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all font-bold gap-2 flex items-center justify-center">
          <UserPlus size={18} /> Nouveau Visiteur
        </button>
      
        )}
      </div>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] glass p-8 border-none shadow-2xl">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">
            {mode === "edit" ? "Modifier Visiteur" : "Nouveau Visiteur"}
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
              <Label className="text-xs font-bold text-slate-500 ml-1">Nom du Visiteur *</Label>
              <Input name="visitorName" defaultValue={initialData?.visitorName} required className="rounded-xl border-slate-200 h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 ml-1">Téléphone</Label>
              <Input name="phone" defaultValue={initialData?.phone} className="rounded-xl border-slate-200 h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 ml-1">Motif de Visite *</Label>
              <Input name="purpose" defaultValue={initialData?.purpose} required className="rounded-xl border-slate-200 h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 ml-1">Rencontre Avec</Label>
              <Input name="meetingWith" defaultValue={initialData?.meetingWith} placeholder="Ex: Directeur, M. Ali..." className="rounded-xl border-slate-200 h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 ml-1">Notes</Label>
              <Textarea name="note" defaultValue={initialData?.note} rows={3} className="rounded-xl border-slate-200" />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl px-8 bg-indigo-600 text-white hover:bg-indigo-700 font-bold h-11 shadow-lg shadow-indigo-100 transition-all">
              {loading ? "Traitement..." : mode === "edit" ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
