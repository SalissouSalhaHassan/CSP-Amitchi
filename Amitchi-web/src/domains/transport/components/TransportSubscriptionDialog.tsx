"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { addSubscription, getTransportRoutes } from "@/domains/transport/actions/transport.actions";
import { getStudents } from "@/domains/students/actions/students.actions";
import { TransportSubscriptionFormData } from "../validators/transport.schema";

interface TransportSubscriptionDialogProps {
  trigger?: React.ReactNode;
}

export default function TransportSubscriptionDialog({ trigger }: TransportSubscriptionDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [routes, setRoutes] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      getTransportRoutes().then(res => { if (res.data) setRoutes(res.data as any); });
      getStudents().then(res => { if (res.data) setStudents(res.data as any); });
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data: TransportSubscriptionFormData = {
      studentId: Number(form.get("studentId")),
      routeId: Number(form.get("routeId")),
      pickupPoint: form.get("pickupPoint") as string,
      startDate: form.get("startDate") as string,
      status: "Actif",
    };

    const result = await addSubscription({
      studentId: data.studentId,
      routeId: data.routeId,
      pickupPoint: data.pickupPoint || undefined,
      startDate: data.startDate ? new Date(data.startDate) : new Date()
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
          <button type="button" className="rounded-2xl px-6 py-4 bg-primary text-white hover:bg-primary/90 shadow-xl shadow-indigo-100 transition-all font-bold gap-2 flex items-center justify-center">
            Inscrire un Élève
          </button>
        )}
      </div>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] glass p-8 border-none shadow-2xl">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">
            Inscription au Transport
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
              <Label className="text-xs font-bold text-slate-500 ml-1">Élève *</Label>
              <select name="studentId" required className="w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-sm font-medium outline-none">
                <option value="">-- Choisir l'élève --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.nomEtudiant}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 ml-1">Ligne de Bus *</Label>
              <select name="routeId" required className="w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-sm font-medium outline-none">
                <option value="">-- Choisir la ligne --</option>
                {routes.map(r => (
                  <option key={r.id} value={r.id}>{r.routeName} ({Number(r.monthlyFee).toLocaleString()} CFA)</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 ml-1">Point de Ramassage</Label>
              <Input name="pickupPoint" placeholder="ex: Devant la poste" className="rounded-xl border-slate-200 h-11" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 ml-1">Date de début</Label>
              <Input name="startDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="rounded-xl border-slate-200 h-11" />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl px-8 bg-primary text-white hover:bg-primary/90 font-bold h-11 shadow-lg shadow-indigo-100">
              {loading ? "Inscription..." : "Confirmer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
