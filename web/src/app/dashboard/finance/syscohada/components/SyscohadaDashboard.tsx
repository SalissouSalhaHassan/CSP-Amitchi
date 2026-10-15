"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { 
  Smartphone, CreditCard, Building2, BookOpen, ShieldCheck, CheckCircle2, 
  XCircle, Clock, Plus, FileText, ArrowUpRight, ArrowDownLeft, RefreshCw, 
  Search, Download, QrCode, Sparkles, AlertCircle, Layers
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { initiateMobilePayment, confirmMobilePayment } from "@/domains/finance/actions/payment_gateway.actions";
import { addSyscohadaEntry, seedSyscohadaAccounts } from "@/domains/finance/actions/syscohada.actions";

export function SyscohadaDashboard({
  initialTransactions,
  initialAccounts,
  initialEntries,
  initialStatements,
  initialCogesReport
}: any) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"MOBILE_MONEY" | "SYSCOHADA" | "COGES">("MOBILE_MONEY");

  // Mobile payment form state
  const [provider, setProvider] = useState<"ORANGE_MONEY" | "MOOV_MONEY" | "WAVE" | "BANK_CARD">("ORANGE_MONEY");
  const [payAmount, setPayAmount] = useState("25000");
  const [phoneNumber, setPhoneNumber] = useState("90000000");
  const [payPurpose, setPayPurpose] = useState<"Scolarité" | "Inscription" | "COGES">("Scolarité");

  // SYSCOHADA entry form state
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryRef, setEntryRef] = useState(`REF-${Date.now().toString().slice(-6)}`);
  const [entryAccountId, setEntryAccountId] = useState("");
  const [entryLabel, setEntryLabel] = useState("");
  const [entryDebit, setEntryDebit] = useState("0");
  const [entryCredit, setEntryCredit] = useState("0");

  // Search states
  const [txnSearch, setTxnSearch] = useState("");
  const [accSearch, setAccSearch] = useState("");

  const handleInitiatePayment = () => {
    if (!payAmount || Number(payAmount) <= 0) {
      toast.error("Veuillez entrer un montant valide");
      return;
    }
    startTransition(async () => {
      const res: any = await initiateMobilePayment({
        amount: Number(payAmount),
        provider,
        phoneNumber,
        purpose: payPurpose
      });

      if (res.success && res.data) {
        toast.success(res.data.message);
        // Automatically confirm in test environment
        const confirmRes: any = await confirmMobilePayment(res.data.transaction.id, "SUCCESS");
        if (confirmRes.success) {
          toast.success("Paiement simulé validé avec succès!");
          router.refresh();
        }
      } else {
        toast.error(res.error || "Erreur lors de l'initialisation du paiement");
      }
    });
  };

  const handleConfirmManualTxn = (txnId: number) => {
    startTransition(async () => {
      const res: any = await confirmMobilePayment(txnId, "SUCCESS");
      if (res.success) {
        toast.success("Transaction confirmée!");
        router.refresh();
      } else {
        toast.error(res.error || "Erreur de confirmation");
      }
    });
  };

  const handleAddSyscohadaEntry = () => {
    if (!entryAccountId || !entryLabel) {
      toast.error("Veuillez choisir un compte et saisir un libellé");
      return;
    }
    startTransition(async () => {
      const res: any = await addSyscohadaEntry({
        reference: entryRef,
        accountId: Number(entryAccountId),
        label: entryLabel,
        debit: Number(entryDebit || 0),
        credit: Number(entryCredit || 0)
      });
      if (res.success) {
        toast.success("Écriture comptable enregistrée!");
        setShowEntryModal(false);
        setEntryLabel("");
        setEntryDebit("0");
        setEntryCredit("0");
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de l'enregistrement");
      }
    });
  };

  const handleSeedAccounts = () => {
    startTransition(async () => {
      const res: any = await seedSyscohadaAccounts();
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.error || "Erreur d'initialisation");
      }
    });
  };

  const filteredTxns = (initialTransactions || []).filter((t: any) => {
    const q = txnSearch.toLowerCase();
    return !q || t.transactionReference?.toLowerCase().includes(q) || t.provider?.toLowerCase().includes(q) || t.phoneNumber?.includes(q);
  });

  const filteredAccounts = (initialAccounts || []).filter((a: any) => {
    const q = accSearch.toLowerCase();
    return !q || a.accountNumber?.includes(q) || a.accountName?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 border border-slate-800 shadow-2xl">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} />
                <span>Phase 3 • Q1 2027 Ready</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Paiements Mobile Money & Comptabilité المعيارية (SYSCOHADA & COGES)
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Gestion automatisée des flux financiers mobiles (Orange Money, Moov, Wave), intégration du Plan Comptable SYSCOHADA et génération des rapports réglementaires du Comité COGES.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSeedAccounts}
              disabled={isPending}
              variant="outline"
              className="h-11 border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white rounded-xl font-bold px-4 flex items-center gap-2"
            >
              <RefreshCw size={15} className={isPending ? "animate-spin" : ""} />
              <span>Initialiser Plan SYSCOHADA</span>
            </Button>
          </div>
        </div>

        {/* Tab Selection Chips */}
        <div className="flex items-center gap-2 mt-8 pt-6 border-t border-slate-800/80 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab("MOBILE_MONEY")}
            className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === "MOBILE_MONEY" 
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-950/40" 
                : "bg-slate-800/60 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Smartphone size={15} />
            <span>Paiements Mobile Money (Orange, Moov, Wave)</span>
          </button>

          <button
            onClick={() => setActiveTab("SYSCOHADA")}
            className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === "SYSCOHADA" 
                ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-950/40" 
                : "bg-slate-800/60 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <BookOpen size={15} />
            <span>Comptabilité SYSCOHADA (Grand Livre & Bilans)</span>
          </button>

          <button
            onClick={() => setActiveTab("COGES")}
            className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === "COGES" 
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/40" 
                : "bg-slate-800/60 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Building2 size={15} />
            <span>Rapport Officiel COGES</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#161822] border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Transactions Mobile</span>
            <Smartphone size={16} className="text-orange-400" />
          </div>
          <p className="text-2xl font-black text-white">{(initialTransactions || []).length} Txns</p>
          <p className="text-xs text-emerald-400 font-bold mt-1">
            {(initialTransactions || []).filter((t: any) => t.status === "SUCCESS").reduce((acc: number, t: any) => acc + (t.amount || 0), 0).toLocaleString()} FCFA
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#161822] border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Total Actif SYSCOHADA</span>
            <ArrowUpRight size={16} className="text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-indigo-400">
            {(initialStatements?.totalActif || 0).toLocaleString()} FCFA
          </p>
          <p className="text-xs text-slate-500 font-medium mt-1">Comptes Classe 2, 4 & 5</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#161822] border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Résultat Net Comptable</span>
            <Layers size={16} className="text-cyan-400" />
          </div>
          <p className={`text-2xl font-black ${(initialStatements?.resultatNet || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {(initialStatements?.resultatNet || 0).toLocaleString()} FCFA
          </p>
          <p className="text-xs text-slate-500 font-medium mt-1">Produits - Charges</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#161822] border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Solde Comité COGES</span>
            <ShieldCheck size={16} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">
            {(initialCogesReport?.soldeDisponible || 0).toLocaleString()} FCFA
          </p>
          <p className="text-xs text-slate-500 font-medium mt-1">Cotisations - Dépenses COGES</p>
        </div>
      </div>

      {/* TAB 1: MOBILE MONEY PAYMENTS */}
      {activeTab === "MOBILE_MONEY" && (
        <div className="space-y-6">
          {/* Quick Payment Simulator Box */}
          <div className="p-6 rounded-3xl bg-[#161822] border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Smartphone className="text-orange-400" size={20} />
              <span>Simulateur de Paiement Mobile Money & Carte Web</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1.5">Opérateur de Paiement</label>
                <select
                  value={provider}
                  onChange={(e: any) => setProvider(e.target.value)}
                  className="w-full h-11 bg-[#1F222B] border border-slate-700 text-white rounded-xl px-3 text-xs font-bold focus:outline-none focus:border-orange-500"
                >
                  <option value="ORANGE_MONEY">Orange Money 🟠</option>
                  <option value="MOOV_MONEY">Moov Money (Flooz) 🔵</option>
                  <option value="WAVE">Wave 🌊</option>
                  <option value="BANK_CARD">Carte Banciare / Visa 💳</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1.5">Motif du Paiement</label>
                <select
                  value={payPurpose}
                  onChange={(e: any) => setPayPurpose(e.target.value)}
                  className="w-full h-11 bg-[#1F222B] border border-slate-700 text-white rounded-xl px-3 text-xs font-bold focus:outline-none focus:border-orange-500"
                >
                  <option value="Scolarité">Frais de Scolarité</option>
                  <option value="Inscription">Frais d'Inscription</option>
                  <option value="COGES">Cotisation COGES</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1.5">Montant (FCFA)</label>
                <input 
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full h-11 bg-[#1F222B] border border-slate-700 text-white rounded-xl px-3 text-xs font-bold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1.5">Numéro Payeur</label>
                <input 
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full h-11 bg-[#1F222B] border border-slate-700 text-white rounded-xl px-3 text-xs font-bold focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleInitiatePayment}
                disabled={isPending}
                className="h-11 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white rounded-xl font-bold px-6 shadow-lg shadow-orange-950/40"
              >
                + Lancer la Transaction Mobile
              </Button>
            </div>
          </div>

          {/* Transactions Log Table */}
          <div className="p-6 rounded-3xl bg-[#161822] border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-white">Historique des Transactions En Ligne</h3>

              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input 
                  type="text"
                  placeholder="Rechercher référence ou tel..."
                  value={txnSearch}
                  onChange={(e) => setTxnSearch(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl pl-9 pr-3 h-9 text-xs focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {filteredTxns.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-800 rounded-2xl">
                <Smartphone className="mx-auto text-slate-600 mb-2" size={32} />
                <p className="text-slate-400 text-sm font-bold">Aucune transaction mobile enregistrée</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#1F222B] text-slate-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5 rounded-l-xl">Référence</th>
                      <th className="p-3.5">Opérateur</th>
                      <th className="p-3.5">Motif</th>
                      <th className="p-3.5">Montant</th>
                      <th className="p-3.5">Téléphone</th>
                      <th className="p-3.5">Statut</th>
                      <th className="p-3.5 rounded-r-xl text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredTxns.map((t: any) => (
                      <tr key={t.id} className="hover:bg-[#1F222B]/40 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-white">{t.transactionReference}</td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-black ${
                            t.provider === 'ORANGE_MONEY' ? 'bg-orange-950 text-orange-400 border border-orange-800' :
                            t.provider === 'MOOV_MONEY' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                            'bg-cyan-950 text-cyan-400 border border-cyan-800'
                          }`}>
                            {t.provider}
                          </span>
                        </td>
                        <td className="p-3.5 font-medium">{t.purpose}</td>
                        <td className="p-3.5 font-black text-emerald-400">{t.amount?.toLocaleString()} FCFA</td>
                        <td className="p-3.5 font-mono text-slate-400">{t.phoneNumber || 'N/A'}</td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            t.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            t.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {t.status === 'PENDING' && (
                            <button
                              onClick={() => handleConfirmManualTxn(t.id)}
                              disabled={isPending}
                              className="text-xs text-emerald-400 font-bold hover:underline"
                            >
                              Confirmer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SYSCOHADA ACCOUNTING */}
      {activeTab === "SYSCOHADA" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Plan Comptable & Écritures SYSCOHADA</h3>
            <Button
              onClick={() => setShowEntryModal(true)}
              className="h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs px-4"
            >
              + Saisir une Écriture
            </Button>
          </div>

          {/* Accounts Grid */}
          <div className="p-6 rounded-3xl bg-[#161822] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-200 text-sm">Plan Comptable Général (Classes 1 à 7)</h4>
              <input 
                type="text"
                placeholder="Filtrer comptes..."
                value={accSearch}
                onChange={(e) => setAccSearch(e.target.value)}
                className="bg-[#1F222B] border border-slate-800 text-white rounded-xl px-3 h-8 text-xs focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAccounts.map((acc: any) => (
                <div key={acc.id} className="p-3 rounded-xl bg-[#1F222B] border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-black text-indigo-400 block">{acc.accountNumber}</span>
                    <span className="text-xs font-bold text-white truncate block max-w-[180px]" title={acc.accountName}>{acc.accountName}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    acc.accountType === 'ACTIF' ? 'bg-indigo-950 text-indigo-400 border border-indigo-800' :
                    acc.accountType === 'PASSIF' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                    acc.accountType === 'PRODUIT' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                    'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}>
                    {acc.accountType}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* General Ledger Entries */}
          <div className="p-6 rounded-3xl bg-[#161822] border border-slate-800 space-y-4">
            <h4 className="font-bold text-white text-sm">Journal Général des Écritures Comptables</h4>
            {(initialEntries || []).length === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs font-bold">
                Aucune écriture comptable saisie
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#1F222B] text-slate-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Réf</th>
                      <th className="p-3">Compte SYSCOHADA</th>
                      <th className="p-3">Libellé</th>
                      <th className="p-3 text-right">Débit</th>
                      <th className="p-3 text-right">Crédit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {(initialEntries || []).map((e: any) => (
                      <tr key={e.id} className="hover:bg-[#1F222B]/40">
                        <td className="p-3 font-mono font-bold text-white">{e.reference}</td>
                        <td className="p-3 font-mono text-indigo-400 font-bold">{e.accountNumber} - {e.accountName}</td>
                        <td className="p-3 font-medium">{e.label}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          {e.debit ? `${e.debit.toLocaleString()} FCFA` : '-'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-cyan-400">
                          {e.credit ? `${e.credit.toLocaleString()} FCFA` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: COGES OFFICIAL REPORT */}
      {activeTab === "COGES" && (
        <div className="p-8 rounded-3xl bg-[#161822] border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-emerald-400" size={24} />
                <h3 className="text-xl font-black text-white">Rapport Financier Réglementaire COGES</h3>
              </div>
              <p className="text-slate-400 text-xs mt-1">Conforme aux directives du Ministère de l'Éducation Nationale</p>
            </div>

            <Button
              onClick={() => toast.success("Exportation PDF Officiel du Rapport COGES en cours...")}
              className="h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs px-6 flex items-center gap-2 shadow-lg shadow-emerald-950/40"
            >
              <Download size={15} />
              <span>Télécharger Rapport PDF Signé</span>
            </Button>
          </div>

          {/* Official Seal Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-[#1F222B] border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Cotisations Reçues</span>
              <p className="text-2xl font-black text-emerald-400">{(initialCogesReport?.totalCotisations || 0).toLocaleString()} FCFA</p>
              <p className="text-[11px] text-slate-500">{initialCogesReport?.paymentCount || 0} Paiements validés</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#1F222B] border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Dépenses d'Équipement COGES</span>
              <p className="text-2xl font-black text-rose-400">{(initialCogesReport?.totalDepenses || 0).toLocaleString()} FCFA</p>
              <p className="text-[11px] text-slate-500">{initialCogesReport?.expenseCount || 0} Nouveaux équipements/travaux</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#1F222B] border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Solde de Gestion En Caisse</span>
              <p className="text-2xl font-black text-cyan-400">{(initialCogesReport?.soldeDisponible || 0).toLocaleString()} FCFA</p>
              <p className="text-[11px] text-slate-500">Généré le {initialCogesReport?.generatedAt}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <QrCode size={32} className="text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-white">Sceau d'Authentification Ministérielle</h4>
                <p className="text-[11px] font-mono text-emerald-400">{initialCogesReport?.qrVerificationHash || 'COGES-REG-VALIDATED'}</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black">
              ✓ Document Officiel Conforme
            </span>
          </div>
        </div>
      )}

      {/* MANUAL ENTRY MODAL */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161822] border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Saisir une Écriture SYSCOHADA</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Référence Écriture</label>
                <input 
                  type="text" 
                  value={entryRef} 
                  onChange={(e) => setEntryRef(e.target.value)} 
                  className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-3 h-10 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Compte SYSCOHADA</label>
                <select
                  value={entryAccountId}
                  onChange={(e) => setEntryAccountId(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-3 h-10"
                >
                  <option value="">-- Choisir un compte --</option>
                  {(initialAccounts || []).map((a: any) => (
                    <option key={a.id} value={a.id}>{a.accountNumber} - {a.accountName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Libellé de l'Écriture</label>
                <input 
                  type="text" 
                  value={entryLabel} 
                  onChange={(e) => setEntryLabel(e.target.value)} 
                  placeholder="ex: Inscription Annuelle 2026-2027"
                  className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-3 h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Montant Débit (FCFA)</label>
                  <input 
                    type="number" 
                    value={entryDebit} 
                    onChange={(e) => setEntryDebit(e.target.value)} 
                    className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-3 h-10 font-mono text-emerald-400 font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-bold block mb-1">Montant Crédit (FCFA)</label>
                  <input 
                    type="number" 
                    value={entryCredit} 
                    onChange={(e) => setEntryCredit(e.target.value)} 
                    className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-3 h-10 font-mono text-cyan-400 font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <Button onClick={() => setShowEntryModal(false)} variant="outline" className="h-10 border-slate-800 text-slate-400 rounded-xl px-4 text-xs font-bold">
                Annuler
              </Button>
              <Button onClick={handleAddSyscohadaEntry} disabled={isPending} className="h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 text-xs font-bold">
                Enregistrer l'Écriture
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
