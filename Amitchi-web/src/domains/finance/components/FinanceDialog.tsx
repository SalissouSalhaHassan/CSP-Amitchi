"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { createExpense } from "@/domains/finance/actions/finance.actions";
import { useSpeech } from "@/hooks/use-speech";
import { useEffect } from "react";

interface FinanceDialogProps {
  type: "expense";
  mode?: "add" | "edit";
  initialData?: any;
  trigger?: React.ReactNode;
}

export function FinanceDialog({ type, mode = "add", initialData, trigger }: FinanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { speak } = useSpeech();

  useEffect(() => {
    if (open) {
      if (mode === "add") {
        speak("Nouvelle dépense. Veuillez saisir le montant et la référence pour enregistrer la transaction.", "fr-FR");
      } else {
        speak("Modification de la dépense. Vous pouvez mettre à jour le montant ou la description.", "fr-FR");
      }
    }
  }, [open, mode, speak]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data: any = {
      reference: form.get("reference") as string,
      amount: Number(form.get("amount")) || 0,
      paymentMode: form.get("paymentMode") as string,
      description: form.get("description") as string,
    };

    let result;
    if (mode === "edit") {
      result = { error: "Not implemented yet" }; // TODO: Add updateExpense action
    } else {
      result = await createExpense(data);
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
          <button className={`rounded-2xl font-bold h-11 px-6 border transition-all border-slate-200 bg-white text-slate-900 hover:bg-slate-50`}>
            {mode === "add" ? "Ajouter une dépense" : "Modifier"}
          </button>
        )}
      </div>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" />
        <DialogContent className="fixed left-[50%] top-[50%] z-[101] grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 rounded-[2.5rem] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-300 focus:outline-none">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">
              {mode === "edit" ? "Modifier" : "Nouvelle"} Dépense
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-2xl text-sm font-bold animate-shake">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500">Référence *</Label>
              <Input name="reference" defaultValue={initialData?.reference} required className="rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500">Montant (DA) *</Label>
              <Input name="amount" type="number" defaultValue={initialData?.amount} required className="rounded-xl h-11" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500">Paiement</Label>
              <select name="paymentMode" defaultValue={initialData?.paymentMode || "Espèces"} className="w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-sm font-medium outline-none">
                <option value="Espèces">Espèces</option>
                <option value="Virement">Virement</option>
                <option value="Chèque">Chèque</option>
              </select>
            </div>
            <div /> 
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500">Description</Label>
            <Textarea name="description" defaultValue={initialData?.description} rows={2} className="rounded-xl" />
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
      </DialogPortal>
    </Dialog>
  );
}
