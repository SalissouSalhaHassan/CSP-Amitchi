"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createIncident, updateIncident } from "@/domains/students/actions/discipline.actions";
import { getStudents } from "@/domains/students/actions/students.actions";
import { IncidentFormData } from "../validators/discipline.schema";

interface IncidentDialogProps {
  mode?: "add" | "edit";
  initialData?: any;
  trigger?: React.ReactNode;
}

export default function IncidentDialog({ mode = "add", initialData, trigger }: IncidentDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      getStudents().then(res => { if (res.data) setStudents(res.data as any); });
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data: IncidentFormData = {
      studentId: Number(form.get("studentId")),
      incidentType: form.get("incidentType") as string,
      severity: form.get("severity") as string,
      description: form.get("description") as string,
      proposedAction: form.get("proposedAction") as string,
      status: form.get("status") as string || "En attente",
    };

    let result;
    if (mode === "edit" && initialData?.id) {
      result = await updateIncident(initialData.id, data);
    } else {
      result = await createIncident(data);
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

        <button className="rounded-2xl px-6 py-4 bg-rose-600 text-white hover:bg-rose-700 shadow-xl shadow-rose-100 transition-all font-bold gap-2 flex items-center justify-center">
          Signaler un Incident
        </button>
      
        )}
      </div>
      <DialogContent className="sm:max-w-2xl rounded-[2.5rem] glass p-8 border-none shadow-2xl">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">
            {mode === "edit" ? "Modifier l'Incident" : "Rapport d'Incident"}
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
              <Label className="text-xs font-bold text-slate-500 ml-1">Élève concerné *</Label>
              <select name="studentId" defaultValue={initialData?.studentId} required className="w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-sm font-medium outline-none">
                <option value="">-- Choisir un élève --</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.nomEtudiant}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">Type d'incident *</Label>
                <select name="incidentType" defaultValue={initialData?.incidentType || "Retard Répété"} className="w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-sm font-medium outline-none">
                   <option value="Retard Répété">Retard Répété</option>
                   <option value="Absence injustifiée">Absence injustifiée</option>
                   <option value="Indiscipline en classe">Indiscipline en classe</option>
                   <option value="Bagarre / Violence">Bagarre / Violence</option>
                   <option value="Détérioration matériel">Détérioration matériel</option>
                   <option value="Vol">Vol</option>
                   <option value="Fraude aux examens">Fraude aux examens</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">Gravité</Label>
                <select name="severity" defaultValue={initialData?.severity || "Mineur"} className="w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-sm font-medium outline-none">
                  <option value="Mineur">Mineur</option>
                  <option value="Majeur">Majeur</option>
                  <option value="Critique">Critique</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 ml-1">Description détaillée</Label>
              <Textarea name="description" defaultValue={initialData?.description} rows={4} className="rounded-xl border-slate-200" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">Action proposée</Label>
                <select name="proposedAction" defaultValue={initialData?.proposedAction || "Avertissement Verbal"} className="w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-sm font-medium outline-none">
                  <option value="Avertissement Verbal">Avertissement Verbal</option>
                  <option value="Avertissement Écrit">Avertissement Écrit</option>
                  <option value="Heures de Colle">Heures de Colle</option>
                  <option value="Exclusion Temporaire">Exclusion Temporaire</option>
                  <option value="Conseil de Discipline">Conseil de Discipline</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">Statut</Label>
                <select name="status" defaultValue={initialData?.status || "En attente"} className="w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-sm font-medium outline-none">
                  <option value="En attente">En attente</option>
                  <option value="Résolu">Résolu</option>
                  <option value="Conseil de Discipline">Conseil de Discipline</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl px-8 bg-rose-600 text-white hover:bg-rose-700 font-bold h-11 shadow-lg shadow-rose-100">
              {loading ? "Enregistrement..." : mode === "edit" ? "Mettre à jour" : "Enregistrer le Rapport"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
