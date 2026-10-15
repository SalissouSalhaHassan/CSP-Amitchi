"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { recordPayment } from "@/domains/finance/actions/finance.actions";
import { getPeriods } from "@/domains/academics/actions/academics.actions";
import { PaymentFormData } from "../validators/finance.schema";
import { CreditCard, Banknote, TrendingUp, TrendingDown, Info, AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOfflineMutation } from "@/hooks/use-offline-mutation";
import { toast } from "sonner";
import ReceiptPreviewDialog from "./ReceiptPreviewDialog";

interface PaymentDialogProps {
  feeData: any;
  allFees?: any[];
  headerConfig?: any | null;
  trigger?: React.ReactNode;
  onPaymentSuccess?: (updatedFeeData: any) => void;
  currentUser?: any;
  currentSchoolId?: number | null;
}

const months = ["Septembre", "Octobre", "Novembre", "Décembre", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août"];

export default function PaymentDialog({ 
  feeData, 
  allFees, 
  headerConfig, 
  trigger, 
  onPaymentSuccess,
  currentUser,
  currentSchoolId
}: PaymentDialogProps) {
  const { mutate, isOnline } = useOfflineMutation<PaymentFormData & { schoolId?: number; recordedBy?: string }>();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [periods, setPeriods] = useState<any[]>([]);
  
  // Selected student fee state (supports switching if allFees is provided)
  const [selectedFee, setSelectedFee] = useState<any>(feeData);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptFee, setReceiptFee] = useState<any>(null);

  // Form State for Live Calculations
  const [amount, setAmount] = useState<number>(feeData?.balance || 0);
  const [reduction, setReduction] = useState<number>(0);
  const [reference, setReference] = useState(() => `REC-${Date.now().toString().slice(-8)}`);

  useEffect(() => {
    if (feeData) {
      setSelectedFee(feeData);
      setAmount(feeData.balance || 0);
      setReduction(0);
    }
  }, [feeData]);

  useEffect(() => {
    if (open) {
      setReference(`REC-${Date.now().toString().slice(-8)}`);
      getPeriods().then(res => {
        if (res.data) setPeriods(res.data as any as any[]);
      });
    }
  }, [open]);

  const summary = useMemo(() => {
    const totalDu = selectedFee?.balance || feeData?.balance || 0;
    const netAPayer = totalDu - reduction;
    const reste = netAPayer - amount;

    let status = "Calcul en cours...";
    let statusColor = "text-slate-400";
    let Icon = Info;

    if (reste < 0) {
      status = `Trop-perçu: ${Math.abs(reste).toLocaleString()} CFA (Crédit)`;
      statusColor = "text-blue-500";
      Icon = TrendingUp;
    } else if (reste === 0) {
      status = "Paiement Complet (Solde à 0)";
      statusColor = "text-emerald-500";
      Icon = CheckCircle2;
    } else if (amount === 0) {
      status = "En attente de paiement";
      statusColor = "text-slate-400";
      Icon = Info;
    } else {
      status = `Paiement Partiel (Reste: ${reste.toLocaleString()} CFA)`;
      statusColor = "text-amber-500";
      Icon = AlertCircle;
    }

    return { reste, status, statusColor, Icon };
  }, [selectedFee?.balance, feeData?.balance, amount, reduction]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();

    try {
      setLoading(true);
      setError("");

      const currentFee = selectedFee || feeData;
      if (!currentFee?.id) {
        setError("Veuillez sélectionner un élève valide.");
        setLoading(false);
        return;
      }

      const form = new FormData(e.currentTarget);
      const reference = (form.get("reference") as string)?.trim() || `REC-${Date.now().toString().slice(-8)}`;

      let resolvedCashier = currentUser?.nomPrenom || (currentUser?.prenom || currentUser?.nom ? `${currentUser.prenom || ""} ${currentUser.nom || ""}`.trim() : currentUser?.utilisateur || currentUser?.name);
      let resolvedUserId = currentUser?.id || currentUser?.utilisateur;
      let resolvedSchoolId = currentSchoolId || currentFee?.schoolId || currentFee?.student?.schoolId || currentUser?.schoolId;
      let resolvedSchoolName = currentUser?.school?.name || currentUser?.schoolName || headerConfig?.schoolName;

      if (typeof window !== "undefined" && (!resolvedCashier || !resolvedSchoolId || !resolvedSchoolName)) {
        try {
          const cachedSessionStr = localStorage.getItem("edut_user_session") || localStorage.getItem("edut_session_user");
          if (cachedSessionStr) {
            const cachedUser = JSON.parse(cachedSessionStr);
            if (!resolvedCashier) {
              resolvedCashier = cachedUser.nomPrenom || (cachedUser.prenom || cachedUser.nom ? `${cachedUser.prenom || ""} ${cachedUser.nom || ""}`.trim() : cachedUser.utilisateur || cachedUser.name || cachedUser.email?.split("@")[0]);
            }
            if (!resolvedUserId) resolvedUserId = cachedUser.id || cachedUser.utilisateur;
            if (!resolvedSchoolId) resolvedSchoolId = cachedUser.schoolId || cachedUser.school?.id;
            if (!resolvedSchoolName) resolvedSchoolName = cachedUser.school?.name || cachedUser.schoolName;
          }
        } catch (_) {}
      }

      resolvedCashier = resolvedCashier || "Admin";
      resolvedUserId = resolvedUserId || "Admin";
      resolvedSchoolId = resolvedSchoolId || 9;
      resolvedSchoolName = resolvedSchoolName || "GROUP AIIU-NIGER";

      const data: PaymentFormData & { schoolId?: number; recordedBy?: string } = {
        feeId: currentFee.id,
        amount: Number(form.get("amount")),
        reduction: Number(form.get("reduction")) || 0,
        paymentMode: form.get("paymentMode") as string,
        monthConcerned: form.get("monthConcerned") as string,
        reference: reference,
        notes: form.get("notes") as string,
        datePaid: form.get("datePaid") as string,
        schoolId: resolvedSchoolId,
        recordedBy: resolvedCashier,
      };

      // Client-side double payment check
      const hasDuplicate = currentFee.payments?.some((p: any) => {
        const sameRef = reference && p.reference && p.reference.toLowerCase() === reference.toLowerCase();
        const sameAmountAndDate = p.amount === data.amount && p.datePaid && new Date(p.datePaid).toDateString() === new Date(data.datePaid || new Date()).toDateString();
        return sameRef || sameAmountAndDate;
      });

      if (hasDuplicate) {
        setError("Attention : Un paiement avec la même référence ou le même montant pour cette date existe déjà (protection double paiement).");
        setLoading(false);
        return;
      }

      const result = await mutate(data, {
        targetTable: "feePayments",
        onlineAction: recordPayment,
        entity: "payment",
        entityId: reference,
        idempotencyKey: reference,
        userId: resolvedUserId,
        schoolId: resolvedSchoolId,
        userName: resolvedCashier,
        schoolName: resolvedSchoolName,
        onSuccess: () => setOpen(false),
      });
      setLoading(false);

      if (result.success) {
        const newPaid = (currentFee.totalPaid || 0) + data.amount;
        const newReduc = (currentFee.totalReduction || 0) + data.reduction;
        const newBalance = Math.max(0, (currentFee.totalExpected || 0) - newPaid - newReduc);
        const newStatus = newBalance <= 0 ? "Soldé" : newPaid > 0 ? "Partiel" : "Impayé";

        const newPaymentRecord = {
          id: (result as any)?.id || Date.now(),
          feeId: currentFee.id,
          amount: data.amount,
          reduction: data.reduction,
          paymentMode: data.paymentMode,
          reference: data.reference,
          monthConcerned: data.monthConcerned,
          notes: data.notes,
          datePaid: data.datePaid ? new Date(data.datePaid).toISOString() : new Date().toISOString(),
          recordedBy: resolvedCashier,
          isProvisoire: !isOnline,
        };

        const updatedFee = {
          ...currentFee,
          totalPaid: newPaid,
          totalReduction: newReduc,
          balance: newBalance,
          status: newStatus,
          payments: [newPaymentRecord, ...(currentFee.payments || [])],
          payment: newPaymentRecord,
        };

        setOpen(false);

        if (!isOnline) {
          toast.warning("Paiement enregistré localement (PROVISOIRE - HORS LIGNE). Il sera synchronisé dès le retour de la connexion.");
        }

        setTimeout(() => {
          if (onPaymentSuccess) {
            onPaymentSuccess(updatedFee);
          } else {
            setReceiptFee(updatedFee);
            setShowReceipt(true);
          }
        }, 120);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err: any) {
      console.error("[PaymentDialog] Unhandled submission error:", err);
      setError(err?.message || "Une erreur inattendue est survenue.");
      setLoading(false);
    }
  }

  // Suggest current month
  const currentMonthIdx = (new Date().getMonth() - 8 + 12) % 12;
  const suggestedMonth = months[currentMonthIdx] || "Septembre";

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">
        {trigger || (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all font-bold text-sm cursor-pointer">
            <Banknote size={16} /> Encaisser
          </div>
        )}
      </div>
      <DialogContent className="sm:max-w-2xl rounded-[2.5rem] glass p-10 border-none shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
              <Banknote size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">
                Encaissement des Frais
              </DialogTitle>
              {allFees && allFees.length > 1 && (!feeData?.id || feeData?.id === 0) ? (
                <div className="mt-2 relative">
                  <select
                    value={selectedFee?.id || ""}
                    onChange={(e) => {
                      const found = allFees.find((f: any) => String(f.id) === e.target.value);
                      if (found) {
                        setSelectedFee(found);
                        setAmount(found.balance || 0);
                        setReduction(0);
                      }
                    }}
                    className="w-full rounded-xl border border-indigo-100 bg-indigo-50/40 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Sélectionner un élève...</option>
                    {allFees.map((f: any) => (
                      <option key={f.id} value={f.id}>
                        {f.student?.nomEtudiant || "Élève"} ({f.student?.classe || "Sans classe"}) — Solde: {(f.balance || 0).toLocaleString()} CFA
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedFee?.student?.nomEtudiant || feeData?.student?.nomEtudiant}</span>
                   <span className="text-slate-200">|</span>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedFee?.student?.classe || feeData?.student?.classe}</span>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 px-6 py-4 rounded-2xl text-sm font-bold flex items-center gap-3 animate-shake">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {!isOnline && (
            <div className="bg-amber-50 border border-amber-100 text-amber-700 px-6 py-4 rounded-2xl text-sm font-bold flex items-center gap-3">
              <AlertCircle size={18} />
              Mode hors-ligne: le paiement sera enregistré localement puis synchronisé automatiquement.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mois / Session concerné</Label>
                <div className="relative">
                  <select 
                    name="monthConcerned" 
                    defaultValue="Général"
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-4 h-14 text-sm font-bold text-slate-700 outline-none appearance-none focus:ring-2 focus:ring-indigo-500/10"
                  >
                    <option value="Général">Général</option>
                    <option value="Frais d'inscription">Frais d'inscription</option>
                    <option value="Frais COGES & Carte ID">Frais COGES & Carte ID</option>
                    <option value="Frais Transport & Internat">Frais Transport & Internat</option>
                    {periods.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date de Paiement</Label>
                <Input 
                  name="datePaid" 
                  type="date" 
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="rounded-2xl border-slate-100 bg-slate-50/50 h-14 font-bold" 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mode de Paiement</Label>
                <div className="relative">
                  <select 
                    name="paymentMode" 
                    defaultValue="Espèces"
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-4 h-14 text-sm font-bold text-slate-700 outline-none appearance-none focus:ring-2 focus:ring-indigo-500/10"
                  >
                    <option value="Espèces">Espèces (Cash)</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Virement">Virement Bancaire</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Carte Bancaire">Carte Bancaire</option>
                    <option value="Paiement Électronique">Paiement Électronique</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Référence / N° Reçu</Label>
                <Input 
                  name="reference" 
                  placeholder="REC-XXXXXX" 
                  defaultValue={reference}
                  className="rounded-2xl border-slate-100 bg-slate-50/50 h-14 font-bold" 
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Montant à Payer (CFA) *</Label>
                  <button 
                    type="button" 
                    onClick={() => setAmount((selectedFee?.balance || feeData?.balance || 0) - reduction)}
                    className="text-[9px] font-black text-indigo-500 uppercase hover:underline cursor-pointer"
                  >
                    Tout payer
                  </button>
                </div>
                <Input 
                  name="amount" 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  required 
                  className="rounded-2xl border-emerald-100 bg-emerald-50/30 h-14 text-2xl font-black text-emerald-600 focus:ring-emerald-500/20" 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Réduction (CFA)</Label>
                <Input 
                  name="reduction" 
                  type="number" 
                  value={reduction}
                  onChange={(e) => setReduction(Number(e.target.value))}
                  className="rounded-2xl border-slate-100 bg-slate-50/50 h-14 font-bold text-slate-600" 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes / Remarques</Label>
                <Input 
                  name="notes" 
                  placeholder="Notes additionnelles..." 
                  className="rounded-2xl border-slate-100 bg-slate-50/50 h-14" 
                />
              </div>
            </div>
          </div>

          {/* Smart Summary Box matching Python UI logic */}
          <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div className="space-y-1">
              <p className={cn("text-lg font-black flex items-center gap-2", summary.statusColor)}>
                <summary.Icon size={20} />
                Solde Final: {summary.reste.toLocaleString()} CFA
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-7">
                Basé sur un dû de {(selectedFee?.balance || feeData?.balance || 0).toLocaleString()} CFA
              </p>
            </div>
            <div className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border", 
              summary.statusColor.replace('text-', 'bg-').replace('500', '50'),
              summary.statusColor.replace('text-', 'border-').replace('500', '100'),
              summary.statusColor
            )}>
              {summary.status.split('(')[0]}
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setOpen(false)} 
              className="rounded-2xl font-black text-xs uppercase tracking-widest h-14 px-8 cursor-pointer"
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className="rounded-2xl px-12 bg-indigo-600 text-white hover:bg-indigo-700 font-black text-xs uppercase tracking-widest h-14 shadow-xl shadow-indigo-100 transition-all cursor-pointer"
            >
              {loading ? "Traitement..." : "Enregistrer le Paiement"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Auto-opened Receipt Preview Dialog when standalone / fallback */}
    {showReceipt && receiptFee && (
      <ReceiptPreviewDialog
        open={showReceipt}
        onOpenChange={setShowReceipt}
        feeData={receiptFee}
        headerConfig={headerConfig}
        currentUser={currentUser}
      />
    )}
    </>
  );
}
