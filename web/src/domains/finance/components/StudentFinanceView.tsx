"use client";

import React, { useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Receipt,
  Calendar,
  Wallet,
  FileText,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  GraduationCap,
  Building2,
  Phone,
  Banknote,
  Printer,
  ChevronRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReceiptPreviewDialog from "./ReceiptPreviewDialog";

export interface StudentFinanceViewProps {
  student: {
    id: number;
    numAdmission: string;
    nomEtudiant: string;
    nomArabe?: string | null;
    classe?: string | null;
    educationalLevel?: string | null;
    fraisMensuels?: number | null;
    fraisInscription?: number | null;
    fraisTransport?: number | null;
    fraisCantine?: number | null;
    fraisAssurance?: number | null;
    fraisCogesCard?: number | null;
    bourse?: number | null;
    photoPath?: string | null;
    [key: string]: any;
  };
  fee?: {
    id: number;
    totalExpected?: number | null;
    totalPaid?: number | null;
    totalReduction?: number | null;
    balance?: number | null;
    status?: string | null;
    [key: string]: any;
  } | null;
  payments?: Array<{
    id: number;
    amount: number;
    reduction?: number | null;
    datePaid?: string | Date | null;
    monthConcerned?: string | null;
    paymentMode?: string | null;
    reference?: string | null;
    recordedBy?: string | null;
    [key: string]: any;
  }>;
  cogesPayments?: Array<{
    id: number;
    receiptNumber: string;
    amount: number;
    purpose?: string | null;
    datePaid?: string | Date | null;
    [key: string]: any;
  }>;
  headerConfig?: any;
  user?: any;
}

const formatCFA = (amount: number = 0) => {
  return amount.toLocaleString("fr-FR") + " CFA";
};

export default function StudentFinanceView({
  student,
  fee,
  payments = [],
  cogesPayments = [],
  headerConfig,
  user,
}: StudentFinanceViewProps) {
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"history" | "breakdown" | "coges">("history");

  // Calculations
  const calculatedExpected =
    fee?.totalExpected && fee.totalExpected > 0
      ? fee.totalExpected
      : (student.fraisMensuels || 0) +
        (student.fraisInscription || 0) +
        (student.fraisTransport || 0) +
        (student.fraisCantine || 0) +
        (student.fraisAssurance || 0) +
        (student.fraisCogesCard || 0);

  const totalPaid = fee?.totalPaid ?? payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalReduction = fee?.totalReduction ?? (student.bourse || 0);
  const balance = fee?.balance ?? Math.max(0, calculatedExpected - totalPaid - totalReduction);
  const status =
    fee?.status ||
    (balance === 0 && totalPaid > 0
      ? "Soldé"
      : totalPaid > 0
      ? "Partiel"
      : "Impayé");

  const progressPercent =
    calculatedExpected > 0
      ? Math.min(100, Math.round((totalPaid / calculatedExpected) * 100))
      : 100;

  const isSolde = balance === 0;

  const tuitionAmount = Math.max(
    0,
    calculatedExpected -
      (student.fraisInscription || 0) -
      (student.fraisTransport || 0) -
      (student.fraisCantine || 0) -
      (student.fraisAssurance || 0) -
      (student.fraisCogesCard || 0)
  );

  const breakdownItems = [
    { label: "Frais d'inscription & dossier", amount: student.fraisInscription || 0 },
    { label: "Frais de scolarité & cours", amount: tuitionAmount },
    ...(student.fraisTransport ? [{ label: "Frais de transport", amount: student.fraisTransport }] : []),
    ...(student.fraisCantine ? [{ label: "Frais de cantine", amount: student.fraisCantine }] : []),
    ...(student.fraisAssurance ? [{ label: "Assurance scolaire", amount: student.fraisAssurance }] : []),
    ...(student.fraisCogesCard ? [{ label: "Carte COGES / Scolaire", amount: student.fraisCogesCard }] : []),
  ];

  return (
    <div className="min-h-screen p-6 lg:p-10 space-y-8 animate-in fade-in duration-500 transition-colors dark:bg-[#0c0e14]">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 rounded-full bg-purple-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl font-black text-white shadow-inner shrink-0">
              {student.nomEtudiant.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-xs font-black uppercase tracking-wider">
                  Espace Financier Élève
                </span>
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5",
                    isSolde
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : totalPaid > 0
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {isSolde ? "Scolarité Soldée" : status}
                </span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight">{student.nomEtudiant}</h1>
              <p className="text-sm text-indigo-200 flex items-center gap-3 flex-wrap">
                <span className="font-semibold">Matricule : {student.numAdmission}</span>
                <span>•</span>
                <span className="font-semibold">Classe : {student.classe || "Non assignée"}</span>
                {student.educationalLevel && (
                  <>
                    <span>•</span>
                    <span>Niveau : {student.educationalLevel}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 md:px-6">
            <span className="text-xs text-indigo-200 uppercase font-black tracking-wider">Taux de règlement</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-white">{progressPercent}%</span>
              <span className="text-xs text-indigo-200">payé</span>
            </div>
            <div className="w-48 h-2 bg-white/20 rounded-full mt-2 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isSolde ? "bg-emerald-400" : "bg-gradient-to-r from-amber-400 to-emerald-400"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Attendu */}
        <div className="rounded-2xl bg-white/85 dark:bg-[#181a24]/90 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/80 p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Total Scolarité</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 grid place-items-center group-hover:scale-110 transition-transform">
              <GraduationCap className="size-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {formatCFA(calculatedExpected)}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Frais annuels & inscription
          </p>
        </div>

        {/* Total Payé */}
        <div className="rounded-2xl bg-white/85 dark:bg-[#181a24]/90 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/80 p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Total Déjà Versé
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 grid place-items-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="size-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatCFA(totalPaid)}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <TrendingUp className="size-3 text-emerald-500" />
            {payments.length} versement(s) enregistré(s)
          </p>
        </div>

        {/* Solde Dû */}
        <div className="rounded-2xl bg-white/85 dark:bg-[#181a24]/90 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/80 p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "text-xs font-black uppercase tracking-wider",
                balance > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"
              )}
            >
              Reste à Payer
            </span>
            <div
              className={cn(
                "w-10 h-10 rounded-xl grid place-items-center group-hover:scale-110 transition-transform",
                balance > 0
                  ? "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500"
              )}
            >
              {balance > 0 ? <AlertCircle className="size-5" /> : <ShieldCheck className="size-5" />}
            </div>
          </div>
          <p
            className={cn(
              "mt-3 text-2xl font-black tabular-nums",
              balance > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
            )}
          >
            {formatCFA(balance)}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {balance > 0 ? "Solde restant pour l'année" : "Compte en règle 100%"}
          </p>
        </div>

        {/* Bourses / Réductions */}
        <div className="rounded-2xl bg-white/85 dark:bg-[#181a24]/90 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/80 p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Bourse / Exonération
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 grid place-items-center group-hover:scale-110 transition-transform">
              <Sparkles className="size-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-purple-600 dark:text-purple-400 tabular-nums">
            {formatCFA(totalReduction)}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {totalReduction > 0 ? "Réduction accordée" : "Aucune exonération"}
          </p>
        </div>
      </div>

      {/* 3. Main Content: Tabs for History vs Fee Breakdown */}
      <div className="rounded-[24px] bg-white/85 dark:bg-[#181a24]/90 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/80 shadow-[0_20px_80px_rgba(15,23,42,0.04)] overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200/80 dark:border-slate-800/80 px-6 pt-4 gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "pb-4 px-2 text-sm font-black transition-colors relative whitespace-nowrap flex items-center gap-2",
              activeTab === "history"
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            <Receipt className="size-4" />
            Historique des Paiements & Reçus ({payments.length})
            {activeTab === "history" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("breakdown")}
            className={cn(
              "pb-4 px-2 text-sm font-black transition-colors relative whitespace-nowrap flex items-center gap-2",
              activeTab === "breakdown"
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            <FileText className="size-4" />
            Détail de la Scolarité
            {activeTab === "breakdown" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
            )}
          </button>

          {cogesPayments.length > 0 && (
            <button
              onClick={() => setActiveTab("coges")}
              className={cn(
                "pb-4 px-2 text-sm font-black transition-colors relative whitespace-nowrap flex items-center gap-2",
                activeTab === "coges"
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              <Wallet className="size-4" />
              Versements COGES ({cogesPayments.length})
              {activeTab === "coges" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
              )}
            </button>
          )}
        </div>

        {/* Tab 1: Payment History */}
        {activeTab === "history" && (
          <div className="p-6">
            {payments.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 grid place-items-center mx-auto text-slate-400">
                  <Receipt className="size-8" />
                </div>
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                  Aucun versement enregistré pour le moment
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Vos futurs paiements de scolarité effectués à la caisse ou en ligne apparaîtront ici avec leurs reçus officiels téléchargeables.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="py-3 px-4">Date de paiement</th>
                      <th className="py-3 px-4">N° Référence / Reçu</th>
                      <th className="py-3 px-4">Période / Motif</th>
                      <th className="py-3 px-4">Mode de règlement</th>
                      <th className="py-3 px-4 text-right">Montant Versé</th>
                      <th className="py-3 px-4 text-center">Reçu Officiel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                    {payments.map((p, idx) => {
                      const dateFormatted = p.datePaid
                        ? new Date(p.datePaid).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "-";

                      return (
                        <tr
                          key={p.id || idx}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                        >
                          <td className="py-4 px-4 font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Calendar className="size-4 text-slate-400" />
                            {dateFormatted}
                          </td>
                          <td className="py-4 px-4 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {p.reference || `REC-${p.id}`}
                          </td>
                          <td className="py-4 px-4 font-medium text-slate-600 dark:text-slate-300">
                            {p.monthConcerned || "Frais de scolarité"}
                          </td>
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              <Banknote className="size-3.5 text-slate-500" />
                              {p.paymentMode || "Espèces"}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right font-black text-emerald-600 dark:text-emerald-400 tabular-nums text-base">
                            {formatCFA(p.amount)}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <button
                              onClick={() => {
                                setSelectedPaymentForReceipt({
                                  ...p,
                                  student,
                                  fee,
                                  receiptNumber: p.reference || `REC-${p.id}`,
                                });
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 text-xs font-black transition-all shadow-sm cursor-pointer"
                            >
                              <Printer className="size-3.5" />
                              Voir Reçu
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Detailed Breakdown */}
        {activeTab === "breakdown" && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Composantes de la Scolarité
                </h4>
                <div className="space-y-2">
                  {breakdownItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
                    >
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {item.label}
                      </span>
                      <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                        {formatCFA(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Récapitulatif Financier
                </h4>
                <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-800/50 dark:to-indigo-950/20 border border-slate-200/80 dark:border-slate-800 p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700/60">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                      Montant Brut Total
                    </span>
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      {formatCFA(calculatedExpected)}
                    </span>
                  </div>
                  {totalReduction > 0 && (
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700/60 text-purple-600 dark:text-purple-400">
                      <span className="text-sm font-bold">Réduction / Bourse</span>
                      <span className="text-base font-black">- {formatCFA(totalReduction)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700/60 text-emerald-600 dark:text-emerald-400">
                    <span className="text-sm font-bold">Total Encaissé</span>
                    <span className="text-base font-black">{formatCFA(totalPaid)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      Solde Restant à Régler
                    </span>
                    <span
                      className={cn(
                        "text-xl font-black",
                        balance > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {formatCFA(balance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: COGES */}
        {activeTab === "coges" && cogesPayments.length > 0 && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">N° Reçu COGES</th>
                    <th className="py-3 px-4">Motif</th>
                    <th className="py-3 px-4 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                  {cogesPayments.map((c, idx) => (
                    <tr key={c.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {c.datePaid ? new Date(c.datePaid).toLocaleDateString("fr-FR") : "-"}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {c.receiptNumber}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {c.purpose || "Cotisation COGES"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatCFA(c.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 4. Receipt Preview Modal */}
      {selectedPaymentForReceipt && (
        <ReceiptPreviewDialog
          open={Boolean(selectedPaymentForReceipt)}
          onOpenChange={(open) => {
            if (!open) setSelectedPaymentForReceipt(null);
          }}
          feeData={{
            student: student,
            totalExpected: calculatedExpected,
            totalPaid: totalPaid,
            balance: balance,
            payments: payments,
            lastPayment: selectedPaymentForReceipt,
            currentPayment: selectedPaymentForReceipt,
            receiptNumber: selectedPaymentForReceipt.reference || `REC-${selectedPaymentForReceipt.id}`,
            amount: selectedPaymentForReceipt.amount,
            paidAmount: selectedPaymentForReceipt.amount,
            datePaid: selectedPaymentForReceipt.datePaid,
            paymentMode: selectedPaymentForReceipt.paymentMode || "Espèces",
            monthConcerned: selectedPaymentForReceipt.monthConcerned || "Scolarité",
          }}
          headerConfig={headerConfig}
          canDelete={false}
        />
      )}
    </div>
  );
}
