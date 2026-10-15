"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { returnLibraryBook } from "@/domains/library/actions/library.actions";
import { AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";

interface ReturnBookDialogProps {
  issueId: number;
  bookTitle: string;
  borrowerName: string;
  isOverdue: boolean;
  trigger?: React.ReactNode;
}

export default function ReturnBookDialog({
  issueId,
  bookTitle,
  borrowerName,
  isOverdue,
  trigger,
}: ReturnBookDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [condition, setCondition] = useState<"good" | "damaged" | "lost">("good");
  const [fineAmount, setFineAmount] = useState<number>(isOverdue ? 1000 : 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await returnLibraryBook(issueId, fineAmount);

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
          <button className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold text-xs">
            Retourner
          </button>
        )}
      </div>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] bg-white dark:bg-[#0E1017] p-8 border border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-white">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <RotateCcw size={18} />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Enregistrement de Retour
              </p>
              <DialogTitle className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">
                Restitution de Livre
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 px-5 py-3.5 rounded-2xl text-xs font-bold animate-shake">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Ouvrage restitué
                </p>
                <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                  {bookTitle}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Emprunteur
                </p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {borrowerName}
                </p>
              </div>
            </div>

            {isOverdue && (
              <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 p-4 rounded-2xl flex items-start gap-3">
                <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">
                    Retard détecté
                  </p>
                  <p className="text-[11px] text-rose-600 dark:text-rose-300 font-medium mt-0.5">
                    Le délai de retour prévu est dépassé. Une pénalité forfaitaire ou calculée peut être appliquée.
                  </p>
                </div>
              </div>
            )}

            {/* Book Condition Check */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">
                État physique de l&apos;ouvrage au retour
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "good", label: "Bon état", icon: "✨" },
                  { id: "damaged", label: "Abîmé", icon: "⚠️" },
                  { id: "lost", label: "Perdu", icon: "❌" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCondition(item.id as any);
                      if (item.id === "damaged") setFineAmount(2500);
                      if (item.id === "lost") setFineAmount(10000);
                      if (item.id === "good" && !isOverdue) setFineAmount(0);
                    }}
                    className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                      condition === item.id
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs"
                        : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <span className="block text-sm mb-0.5">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">
                Amende ou Frais de remplacement (FCFA)
              </Label>
              <Input
                name="fineAmount"
                type="number"
                min={0}
                value={fineAmount}
                onChange={(e) => setFineAmount(Number(e.target.value) || 0)}
                className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white h-11 text-sm font-semibold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-xl px-7 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 shadow-lg shadow-emerald-500/20 dark:shadow-none"
            >
              {loading ? "Traitement..." : "Confirmer le Retour"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
