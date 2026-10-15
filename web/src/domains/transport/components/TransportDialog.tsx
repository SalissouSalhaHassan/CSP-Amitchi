"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { saveTransportRoute } from "@/domains/transport/actions/transport.actions";
import { TransportRouteFormData } from "../validators/transport.schema";

interface TransportDialogProps {
  mode?: "add" | "edit";
  initialData?: any;
  trigger?: React.ReactNode;
}

export default function TransportDialog({ mode = "add", initialData, trigger }: TransportDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data: TransportRouteFormData = {
      routeName: form.get("routeName") as string,
      vehicleNumber: form.get("vehicleNumber") as string,
      driverName: form.get("driverName") as string,
      driverPhone: form.get("driverPhone") as string,
      monthlyFee: Number(form.get("monthlyFee")) || 0,
    };

    const result = await saveTransportRoute(data, initialData?.id);

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
          <button type="button" className="rounded-2xl px-6 py-4 bg-primary text-white hover:bg-primary/90 shadow-xl shadow-indigo-100 transition-all font-bold gap-2 flex items-center justify-center">
            Nouvelle Ligne
          </button>
        )}
      </div>
      <DialogContent className="sm:max-w-xl rounded-[2.5rem] glass p-8 border-none shadow-2xl">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">
            {mode === "edit" ? "Modifier la Ligne" : "Nouvelle Ligne de Bus"}
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
              <Label className="text-xs font-bold text-slate-500 ml-1">Nom de la Zone / Trajet *</Label>
              <Input name="routeName" defaultValue={initialData?.routeName} placeholder="ex: Zone A - Campus Nord" required className="rounded-xl border-slate-200 h-11" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">Immatriculation du Bus *</Label>
                <Input name="vehicleNumber" defaultValue={initialData?.vehicleNumber} required className="rounded-xl border-slate-200 h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">Frais Mensuel (CFA) *</Label>
                <Input name="monthlyFee" type="number" defaultValue={initialData?.monthlyFee || 0} required className="rounded-xl border-slate-200 h-11" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">Nom du Chauffeur *</Label>
                <Input name="driverName" defaultValue={initialData?.driverName} required className="rounded-xl border-slate-200 h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">Téléphone Chauffeur</Label>
                <Input name="driverPhone" type="tel" defaultValue={initialData?.driverPhone} className="rounded-xl border-slate-200 h-11" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl px-8 bg-primary text-white hover:bg-primary/90 font-bold h-11 shadow-lg shadow-indigo-100">
              {loading ? "Enregistrement..." : mode === "edit" ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
