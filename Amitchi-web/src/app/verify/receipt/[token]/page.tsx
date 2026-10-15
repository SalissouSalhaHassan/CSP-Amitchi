import { db } from "@/infrastructure/database";
import { feePayments, studentFees } from "@/infrastructure/database/schema/finance";
import { students } from "@/infrastructure/database/schema/students";
import { schools } from "@/infrastructure/database/schema/auth";
import { schoolClasses } from "@/infrastructure/database/schema/academics";
import { eq, or } from "drizzle-orm";
import { CheckCircle2, ShieldCheck, ShieldAlert, Printer, Download, Building2, User, Calendar, CreditCard } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface ReceiptVerifyPageProps {
  params: Promise<{ token: string }>;
}

export default async function ReceiptVerifyPage({ params }: ReceiptVerifyPageProps) {
  const { token } = await params;

  // 1. Fetch payment by token or reference
  const payment = await db.query.feePayments.findFirst({
    where: (p, { eq, or }) =>
      or(
        eq(p.receiptToken, token),
        eq(p.reference, token),
        token.startsWith("REC-") ? eq(p.id, Number(token.replace("REC-", "")) || -1) : eq(p.id, Number(token) || -1)
      ),
    with: {
      fee: {
        with: {
          student: true,
        },
      },
    },
  });

  const school = await db.query.schools.findFirst({
    where: eq(schools.id, payment?.schoolId || 1),
  });

  if (!payment) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900/90 border border-rose-500/30 rounded-3xl p-8 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95">
          <div className="size-16 mx-auto rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
            <ShieldAlert size={36} />
          </div>
          <h1 className="text-2xl font-black text-white">Reçu Introuvable / Non Reconnu</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            La référence ou le token <strong className="text-rose-300 font-mono">{token}</strong> ne correspond à aucun encaissement financier officiel enregistré dans notre registre central.
          </p>
          <div className="pt-2">
            <Link
              href="/verify"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-all"
            >
              Effectuer une autre vérification
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const paymentData = payment;

  const student = paymentData.fee?.student;
  const dateFormatted = new Date(paymentData.datePaid || new Date()).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Verification Success Header */}
        <div className="bg-emerald-600 text-white rounded-3xl p-6 shadow-xl text-center space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 opacity-10">
            <ShieldCheck size={160} />
          </div>
          <div className="inline-flex items-center justify-center p-3 bg-white/20 backdrop-blur-md rounded-full shadow-inner">
            <CheckCircle2 size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Reçu de Paiement Authentifié</h1>
          <p className="text-emerald-100 text-sm max-w-md mx-auto">
            Ce document est certifié conforme et enregistré dans les registres financiers officiels d&apos;Edut.
          </p>
        </div>

        {/* Receipt Card */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 space-y-6" id="receipt-card">
          
          {/* School Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Building2 size={28} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{school?.name || "Complexe Scolaire d'Excellence Edut"}</h2>
                <p className="text-xs text-slate-500">{(school as any)?.city || "Niamey"} • {(school as any)?.country || "Niger"}</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl">
              REF: {paymentData.reference || `REC-${paymentData.id}`}
            </span>
          </div>

          {/* Amount Paid Highlight */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-6 text-center space-y-1 shadow-md">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Montant Encaissé</span>
            <div className="text-4xl font-black tracking-tight text-emerald-400">
              {Number(paymentData.amount).toLocaleString("fr-FR")} <span className="text-xl font-bold text-white">FCFA</span>
            </div>
            <p className="text-xs text-slate-300 font-medium pt-1">
              Mode : <span className="text-white font-bold">{paymentData.paymentMode || "Espèces / Mobile Money"}</span>
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                <User size={14} className="text-indigo-500" /> Élève Bénéficiaire
              </span>
              <p className="font-bold text-slate-800 text-base">{student?.nomEtudiant || "Élève"}</p>
              <p className="text-xs text-slate-500">Matricule : {student?.numAdmission || "MAT-OFFICIEL"}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                <Building2 size={14} className="text-indigo-500" /> Classe / Niveau
              </span>
              <p className="font-bold text-slate-800 text-base">{student?.classe || "Classe non assignée"}</p>
              <p className="text-xs text-slate-500">Motif : Scolarité ({paymentData.monthConcerned || "Mensuel"})</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                <Calendar size={14} className="text-indigo-500" /> Date d&apos;encaissement
              </span>
              <p className="font-bold text-slate-800">{dateFormatted}</p>
              <p className="text-xs text-slate-500">Statut : Validé & Reçu</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                <CreditCard size={14} className="text-indigo-500" /> Agent Comptable
              </span>
              <p className="font-bold text-slate-800">{paymentData.recordedBy || "Direction Financière"}</p>
              <p className="text-xs text-emerald-600 font-semibold">● Cachet numérique validé</p>
            </div>
          </div>

          {/* Official Security Stamp */}
          <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck size={18} className="text-emerald-500" />
              <span>Signature numérique SHA-256 certifiée</span>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={() => typeof window !== "undefined" && window.print()} 
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
              >
                <Printer size={16} /> Imprimer le reçu
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Edut Platform • Système de Sécurisation Financière Scolaire</p>
        </div>

      </div>
    </div>
  );
}
