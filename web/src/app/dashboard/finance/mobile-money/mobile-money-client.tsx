"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { 
  Smartphone, 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  Plus, 
  FileDown, 
  Send, 
  ArrowLeft, 
  RefreshCw, 
  ShieldCheck, 
  Building2, 
  UserCheck, 
  ExternalLink,
  QrCode,
  Check,
  Zap,
  PhoneCall
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { 
  initiateMobilePayment, 
  confirmMobilePayment 
} from "@/domains/finance/actions/payment_gateway.actions";
import { 
  generateMobilePaymentReceiptPDF, 
  MobilePaymentReceiptParams 
} from "@/domains/finance/utils/mobile-payment-receipt-pdf-generator";

interface StudentOption {
  id: number;
  nom: string;
  matricule: string;
  classe?: string | null;
}

export function MobileMoneyClient({
  initialData,
  studentsList,
}: {
  initialData: any;
  studentsList: StudentOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string>("ALL");

  // Modal States
  const [isCheckoutModal, setIsCheckoutModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"form" | "confirming" | "success">("form");
  const [activeTxn, setActiveTxn] = useState<any>(null);

  // Form States
  const [studentId, setStudentId] = useState<number>(studentsList[0]?.id || 0);
  const [provider, setProvider] = useState<"AIRTEL_MONEY" | "MOOV_MONEY" | "ORANGE_MONEY" | "WAVE" | "BANK_CARD" | "CINETPAY">("AIRTEL_MONEY");
  const [amount, setAmount] = useState<number>(50000);
  const [phoneNumber, setPhoneNumber] = useState<string>("+227 90 00 00 00");
  const [purpose, setPurpose] = useState<"Scolarité" | "Inscription" | "Mensualité" | "Soutenance PFE" | "COGES">("Scolarité");

  const m = initialData.metrics || {};
  const transactions = initialData.transactions || [];

  // Filter transactions
  const filteredTransactions = transactions.filter((t: any) => {
    const term = search.toLowerCase();
    const matchesSearch = 
      (t.studentNom || "").toLowerCase().includes(term) ||
      (t.studentMatricule || "").toLowerCase().includes(term) ||
      (t.transactionReference || "").toLowerCase().includes(term) ||
      (t.phoneNumber || "").toLowerCase().includes(term);

    const matchesProvider = selectedProviderFilter === "ALL" || t.provider === selectedProviderFilter;
    return matchesSearch && matchesProvider;
  });

  const handleInitiateAndPay = () => {
    if (!amount || amount <= 0) {
      toast.error("Veuillez saisir un montant valide");
      return;
    }

    startTransition(async () => {
      setCheckoutStep("confirming");
      
      const initRes = await initiateMobilePayment({
        studentId: Number(studentId),
        provider,
        amount: Number(amount),
        phoneNumber,
        purpose,
      });

      if (!initRes || !initRes.success || !initRes.data) {
        toast.error(initRes?.error || "Échec de l'initialisation du paiement");
        setCheckoutStep("form");
        return;
      }

      const txn = (initRes.data as any).transaction;
      if (!txn) {
        toast.error("Transaction non initialisée");
        setCheckoutStep("form");
        return;
      }
      setActiveTxn(txn);

      // Simulate USSD Push / Operator Instant Confirmation
      setTimeout(async () => {
        const confirmRes = await confirmMobilePayment(txn.id, "SUCCESS");
        if (confirmRes.success) {
          toast.success("Paiement Mobile Money validé avec succès!");
          setCheckoutStep("success");
          router.refresh();
        } else {
          toast.error("Erreur de confirmation");
          setCheckoutStep("form");
        }
      }, 1500);
    });
  };

  const handleDownloadReceipt = async (t: any) => {
    try {
      const payload: MobilePaymentReceiptParams = {
        transaction: {
          id: t.id,
          reference: t.transactionReference,
          operatorTxnId: t.providerTransactionId,
          provider: t.provider,
          amount: Number(t.amount),
          currency: "FCFA",
          phoneNumber: t.phoneNumber,
          purpose: t.purpose || "Frais de Scolarité",
          datePaid: t.createdAt,
          status: t.status,
        },
        student: t.studentNom ? {
          id: t.studentId,
          nom: t.studentNom,
          matricule: t.studentMatricule || `EDUT-${t.studentId}`,
          classe: t.studentClasse || "Licence",
        } : undefined,
        feeSummary: {
          amountThisPayment: Number(t.amount),
          remainingBalance: 0,
        },
        institution: {
          name: "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES",
          countryName: "RÉPUBLIQUE DU NIGER",
          ministryName: "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE",
          city: "Niamey",
        },
      };

      await generateMobilePaymentReceiptPDF(payload);
      toast.success("Reçu de paiement téléchargé");
    } catch (e) {
      toast.error("Erreur lors de la génération du reçu");
    }
  };

  const handleShareWhatsApp = (t: any) => {
    const text = encodeURIComponent(
      `🏛️ *REÇU DE PAIEMENT NUMÉRIQUE EDUT*\n\n` +
      `👤 *Étudiant :* ${t.studentNom || "Étudiant"}\n` +
      `🔢 *Matricule :* ${t.studentMatricule || "N/A"}\n` +
      `💰 *Montant :* ${Number(t.amount).toLocaleString()} FCFA\n` +
      `📲 *Canal :* ${t.provider.replace("_", " ")}\n` +
      `📑 *Motif :* ${t.purpose}\n` +
      `🔖 *Réf :* ${t.transactionReference}\n\n` +
      `🔗 *Vérifier l'authenticité :* ${typeof window !== "undefined" ? window.location.origin : "https://niger.edut.pro"}/verify/${encodeURIComponent(t.transactionReference)}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const getProviderBadge = (p: string) => {
    switch (p) {
      case "AIRTEL_MONEY":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">Airtel Money</span>;
      case "MOOV_MONEY":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">Moov Money</span>;
      case "ORANGE_MONEY":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-orange-50 text-orange-700 border border-orange-200">Orange Money</span>;
      case "WAVE":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-cyan-50 text-cyan-700 border border-cyan-200">Wave</span>;
      case "BANK_CARD":
      case "CINETPAY":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">Carte / GIM-UEMOA</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">{p}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/finance">
            <Button
              variant="outline"
              className="h-12 w-12 rounded-2xl p-0 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600 transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-sm"
              title="Retour à la gestion financière"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>

          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
            <Smartphone className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                Passerelle Mobile Money &amp; UEMOA
              </h1>
              <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-emerald-200 dark:border-emerald-800">
                Paiement Instantané &amp; Quittances
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Encaissement direct des frais de scolarité, inscriptions et soutenances via Airtel, Moov, Orange, Wave et Cartes bancaires.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => {
              setCheckoutStep("form");
              setIsCheckoutModal(true);
            }}
            className="h-11 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <Zap className="h-4 w-4" />
            Nouveau Paiement Mobile
          </Button>

          <Button
            variant="outline"
            onClick={() => router.refresh()}
            className="h-11 px-3.5 rounded-2xl border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* ─── 4 MAIN KPI CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Encaissé Mobile</p>
            <span className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {(m.totalAmount || 0).toLocaleString()} <span className="text-xs font-bold text-slate-400">FCFA</span>
          </p>
          <p className="text-[11px] font-bold text-emerald-600 mt-1">Flux 100% numérisés</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Transactions Réussies</p>
            <span className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{m.successCount || 0}</p>
          <p className="text-[11px] font-bold text-indigo-600 mt-1">Quittances certifiées émises</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">En Attente / Validation</p>
            <span className="h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">{m.pendingCount || 0}</p>
          <p className="text-[11px] font-bold text-slate-400 mt-1">Transactions en cours de traitement</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Opérateurs Actifs</p>
            <span className="h-8 w-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-purple-600 dark:text-purple-400 mt-2">5 Passerelles</p>
          <p className="text-[11px] font-bold text-slate-400 mt-1">Airtel, Moov, Orange, Wave, GIM</p>
        </div>
      </div>

      {/* ─── OPERATOR VOLUME PILLS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-rose-100 dark:border-rose-950/50 flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-rose-500 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Airtel Money</p>
            <p className="text-xs font-black text-slate-900 dark:text-white">{(m.airtelVolume || 0).toLocaleString()} F</p>
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-blue-950/50 flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-blue-500 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Moov Money</p>
            <p className="text-xs font-black text-slate-900 dark:text-white">{(m.moovVolume || 0).toLocaleString()} F</p>
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-orange-100 dark:border-orange-950/50 flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-orange-500 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Orange Money</p>
            <p className="text-xs font-black text-slate-900 dark:text-white">{(m.orangeVolume || 0).toLocaleString()} F</p>
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-cyan-100 dark:border-cyan-950/50 flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-cyan-500 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Wave</p>
            <p className="text-xs font-black text-slate-900 dark:text-white">{(m.waveVolume || 0).toLocaleString()} F</p>
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-100 dark:border-indigo-950/50 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="h-3 w-3 rounded-full bg-indigo-500 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Carte &amp; GIM</p>
            <p className="text-xs font-black text-slate-900 dark:text-white">{(m.cardVolume || 0).toLocaleString()} F</p>
          </div>
        </div>
      </div>

      {/* ─── TRANSACTIONS TABLE ─── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {["ALL", "AIRTEL_MONEY", "MOOV_MONEY", "ORANGE_MONEY", "WAVE", "BANK_CARD"].map((p) => (
              <button
                key={p}
                onClick={() => setSelectedProviderFilter(p)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 ${
                  selectedProviderFilter === p
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {p === "ALL" ? "Tous les flux" : p.replace("_", " ")}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par étudiant, réf, tél..."
              className="pl-9 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Réf &amp; Date</th>
                <th className="py-3.5 px-5">Étudiant Bénéficiaire</th>
                <th className="py-3.5 px-5">Canal / Opérateur</th>
                <th className="py-3.5 px-5 text-center">N° Téléphone</th>
                <th className="py-3.5 px-5 text-center">Montant</th>
                <th className="py-3.5 px-5 text-center">Motif</th>
                <th className="py-3.5 px-5 text-center">Statut</th>
                <th className="py-3.5 px-5 text-right">Actions &amp; Reçus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {filteredTransactions.map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-5">
                    <p className="font-mono font-bold text-slate-900 dark:text-white">{t.transactionReference}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(t.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </td>

                  <td className="py-4 px-5">
                    <p className="font-bold text-slate-900 dark:text-white">{t.studentNom || "Paiement Général"}</p>
                    <p className="text-[10px] text-slate-400">{t.studentMatricule || "N/A"} • {t.studentClasse || "Scolarité"}</p>
                  </td>

                  <td className="py-4 px-5">
                    {getProviderBadge(t.provider)}
                  </td>

                  <td className="py-4 px-5 text-center font-mono text-slate-600 dark:text-slate-300">
                    {t.phoneNumber || "—"}
                  </td>

                  <td className="py-4 px-5 text-center font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    {Number(t.amount).toLocaleString()} F
                  </td>

                  <td className="py-4 px-5 text-center font-semibold text-slate-700 dark:text-slate-300">
                    {t.purpose || "Scolarité"}
                  </td>

                  <td className="py-4 px-5 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                      t.status === "SUCCESS"
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        : "bg-amber-50 text-amber-600 border border-amber-200"
                    }`}>
                      {t.status === "SUCCESS" ? "Validé" : "En attente"}
                    </span>
                  </td>

                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => handleDownloadReceipt(t)}
                        className="h-8 px-2.5 rounded-xl text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        title="Télécharger le reçu officiel PDF"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        Reçu PDF
                      </Button>

                      <Link
                        href={`/verify/${encodeURIComponent(t.transactionReference)}`}
                        target="_blank"
                        className="inline-flex items-center h-8 px-2.5 rounded-xl text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 gap-1 border border-slate-200 dark:border-slate-700 transition-colors"
                        title="Vérifier la transaction sur le portail public"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Vérifier</span>
                      </Link>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShareWhatsApp(t)}
                        className="h-8 px-2.5 rounded-xl text-[10px] font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1"
                        title="Partager par WhatsApp"
                      >
                        <Send className="h-3.5 w-3.5" />
                        WhatsApp
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs italic">
                    Aucune transaction mobile enregistrée. Cliquez sur "Nouveau Paiement Mobile" pour simuler ou encaisser un règlement.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── CHECKOUT & INSTANT PAYMENT MODAL ─── */}
      {isCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <Smartphone className="h-4 w-4" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Paiement Mobile Money Sécurisé</h3>
              </div>
              <button onClick={() => setIsCheckoutModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
            </div>

            {checkoutStep === "form" && (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">Étudiant Bénéficiaire *</label>
                  <select value={studentId} onChange={(e) => setStudentId(Number(e.target.value))} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                    {studentsList.map((s) => (
                      <option key={s.id} value={s.id}>{s.nom} ({s.matricule}) - {s.classe || "Licence"}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">Opérateur / Canal de Paiement *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "AIRTEL_MONEY", label: "Airtel Money", color: "border-rose-300 text-rose-700" },
                      { id: "MOOV_MONEY", label: "Moov Money", color: "border-blue-300 text-blue-700" },
                      { id: "ORANGE_MONEY", label: "Orange Money", color: "border-orange-300 text-orange-700" },
                      { id: "WAVE", label: "Wave", color: "border-cyan-300 text-cyan-700" },
                      { id: "BANK_CARD", label: "GIM / Carte", color: "border-indigo-300 text-indigo-700" },
                      { id: "CINETPAY", label: "Passerelle Web", color: "border-purple-300 text-purple-700" },
                    ].map((op) => (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setProvider(op.id as any)}
                        className={`p-2.5 rounded-xl border text-[11px] font-black text-center transition-all ${
                          provider === op.id
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 shadow-md"
                            : `${op.color} bg-white dark:bg-slate-800 hover:bg-slate-50`
                        }`}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">Montant à Encaisser (FCFA) *</label>
                    <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="h-10 text-xs font-black text-emerald-600" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">N° Téléphone Débiteur</label>
                    <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+227 90..." className="h-10 text-xs font-mono" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">Motif du Paiement</label>
                  <select value={purpose} onChange={(e) => setPurpose(e.target.value as any)} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                    <option value="Scolarité">Frais de Scolarité / Tranche</option>
                    <option value="Mensualité">Mensualité d'Échéancier</option>
                    <option value="Inscription">Frais d'Inscription Administrative</option>
                    <option value="Soutenance PFE">Frais de Soutenance PFE / Mémoire</option>
                    <option value="COGES">Cotisation COGES</option>
                  </select>
                </div>
              </div>
            )}

            {checkoutStep === "confirming" && (
              <div className="p-8 text-center space-y-4">
                <div className="h-16 w-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center animate-pulse">
                  <PhoneCall className="h-8 w-8 animate-bounce" />
                </div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">Push USSD / Validation Mobile en cours...</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Une notification de débit a été transmise au numéro <span className="font-bold text-slate-800 dark:text-slate-200">{phoneNumber}</span> via {provider.replace("_", " ")}.
                </p>
                <div className="h-1.5 w-48 mx-auto bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 animate-pulse rounded-full w-3/4" />
                </div>
              </div>
            )}

            {checkoutStep === "success" && activeTxn && (
              <div className="p-8 text-center space-y-4">
                <div className="h-16 w-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">Paiement Validé avec Succès !</h4>
                <p className="text-xs text-slate-500">
                  Transaction Réf : <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{activeTxn.transactionReference}</span>
                </p>
                <p className="text-2xl font-black text-emerald-600">
                  {Number(amount).toLocaleString()} FCFA
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button onClick={() => handleDownloadReceipt(activeTxn)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5">
                    <FileDown className="h-4 w-4" />
                    Télécharger Reçu PDF
                  </Button>
                </div>
              </div>
            )}

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              {checkoutStep === "form" && (
                <>
                  <Button variant="ghost" onClick={() => setIsCheckoutModal(false)}>Annuler</Button>
                  <Button onClick={handleInitiateAndPay} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5">
                    <Zap className="h-4 w-4" />
                    Valider l'Encaissement
                  </Button>
                </>
              )}
              {checkoutStep === "success" && (
                <Button onClick={() => setIsCheckoutModal(false)} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs">
                  Fermer
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
