"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Users, CalendarCheck2, Award, Wallet, Smartphone, ShieldCheck, 
  Download, Printer, CheckCircle2, AlertTriangle, Clock, ChevronRight,
  BookOpen, Layers, Check, X, RefreshCw, Send, Sparkles, QrCode, FileText,
  User, Bell, CreditCard, ArrowUpRight, Plus, HelpCircle, Shield
} from "lucide-react";
import { toast } from "sonner";
import { ParentPortalData, submitParentAbsenceExcuseAction } from "@/domains/parent/actions/parent.actions";
import { initiateMobilePayment, confirmMobilePayment } from "@/domains/finance/actions/payment_gateway.actions";

interface ParentDashboardProps {
  initialData: ParentPortalData;
  currentUser: any;
  branding: {
    name: string;
    logoPath: string | null;
  };
}

export default function ParentDashboard({ initialData, currentUser, branding }: ParentDashboardProps) {
  const [data, setData] = useState<ParentPortalData>(initialData);
  const [activeTab, setActiveTab] = useState<"overview" | "attendance" | "academics" | "finances" | "card">("overview");
  const [selectedChildId, setSelectedChildId] = useState<number>(initialData.selectedChild?.id || initialData.children[0]?.id);
  
  // Absence Excuse Modal State
  const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);
  const [excuseDate, setExcuseDate] = useState(new Date().toISOString().split("T")[0]);
  const [excuseReason, setExcuseReason] = useState("Raison médicale (Maladie / Consultation)");
  const [excuseNotes, setExcuseNotes] = useState("");
  const [isSubmittingExcuse, setIsSubmittingExcuse] = useState(false);

  // Mobile Money Payment Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payPurpose, setPayPurpose] = useState<"Scolarité" | "Inscription" | "COGES" | "Autre">("Scolarité");
  const [payAmount, setPayAmount] = useState<number>(data.finances.balance > 0 ? Math.min(25000, data.finances.balance) : 10000);
  const [payProvider, setPayProvider] = useState<"AIRTEL_MONEY" | "MOOV_MONEY" | "FLOOZ" | "ORANGE_MONEY" | "WAVE" | "NITA" | "BANK_CARD">("AIRTEL_MONEY");
  const [phoneNumber, setPhoneNumber] = useState(data.selectedChild?.mobile || "90123456");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessTxn, setPaymentSuccessTxn] = useState<any>(null);

  const selectedChild = data.children.find((c) => c.id === selectedChildId) || data.selectedChild;

  // Handle Excuse Submission
  const handleExcuseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild) return;
    setIsSubmittingExcuse(true);
    try {
      const res = await submitParentAbsenceExcuseAction({
        studentId: selectedChild.id,
        date: excuseDate,
        reason: excuseReason,
        notes: excuseNotes
      });
      if (res && res.success) {
        toast.success((res as any).message || (res as any).data?.message || "Justification transmise avec succès !");
        setIsExcuseModalOpen(false);
        setExcuseNotes("");
      } else {
        toast.error((res as any)?.error || "Erreur lors de la soumission de la justification.");
      }
    } catch (err) {
      toast.error("Erreur serveur lors de l'envoi de la justification.");
    } finally {
      setIsSubmittingExcuse(false);
    }
  };

  // Handle Mobile Money Payment Simulation
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild) return;
    setIsProcessingPayment(true);

    try {
      const initRes = await initiateMobilePayment({
        studentId: selectedChild.id,
        amount: payAmount,
        provider: payProvider,
        phoneNumber,
        purpose: payPurpose
      });

      if (initRes && initRes.success && (initRes as any).data) {
        const dataObj = (initRes as any).data;
        const txnId = dataObj.transaction.id;
        
        // Simulate Mobile Money Push Notification / OTP validation delay (1.5s)
        await new Promise((r) => setTimeout(r, 1500));

        const confirmRes = await confirmMobilePayment(txnId, "SUCCESS");
        if (confirmRes && confirmRes.success) {
          toast.success(`Paiement de ${payAmount.toLocaleString("fr-FR")} FCFA validé via ${payProvider} !`);
          setPaymentSuccessTxn({
            ref: dataObj.transaction.transactionReference,
            amount: payAmount,
            provider: payProvider,
            date: new Date().toLocaleDateString("fr-FR"),
            purpose: payPurpose
          });

          // Optimistically update financial balance
          setData((prev) => {
            const newPaid = prev.finances.totalPaid + payAmount;
            const newBalance = Math.max(0, prev.finances.totalExpected - newPaid);
            return {
              ...prev,
              finances: {
                ...prev.finances,
                totalPaid: newPaid,
                balance: newBalance,
                paidPercentage: Math.min(100, Math.round((newPaid / prev.finances.totalExpected) * 100)),
                status: newBalance === 0 ? "Soldé" : "Partiel",
                paymentHistory: [
                  {
                    id: Date.now(),
                    receiptNo: dataObj.transaction.transactionReference,
                    amount: payAmount,
                    datePaid: new Date().toLocaleDateString("fr-FR"),
                    paymentMode: `Mobile Money (${payProvider})`,
                    purpose: payPurpose
                  },
                  ...prev.finances.paymentHistory
                ]
              }
            };
          });
        }
      } else {
        toast.error((initRes as any)?.error || "Erreur lors de l'initialisation du paiement Mobile Money.");
      }
    } catch (err) {
      toast.error("Erreur serveur lors de la transaction.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-[#0A0C10] p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* ─── APP HEADER / BRANDING & CHILD SWITCHER ─── */}
      <div className="bg-white/90 dark:bg-[#131622] backdrop-blur-md rounded-[2rem] p-5 md:p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm shrink-0 border border-indigo-100 dark:border-indigo-500/20">
            {branding.logoPath ? (
              <img src={branding.logoPath} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <Smartphone size={28} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/30">
                Espace Parents & Mobile App 🇳🇪
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              Portail de Suivi des Écoles
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Suivi en temps réel de l'assiduité, des notes, du bulletin et paiement des frais par Mobile Money.
            </p>
          </div>
        </div>

        {/* Child Switcher Selector */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/80 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <User size={18} className="text-indigo-600 dark:text-indigo-400 ml-2" />
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Élève Sélectionné</span>
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(Number(e.target.value))}
              className="bg-transparent text-xs font-black text-slate-900 dark:text-white outline-none cursor-pointer pr-2"
            >
              {data.children.map((c) => (
                <option key={c.id} value={c.id} className="dark:bg-slate-900">
                  {c.nomEtudiant} ({c.classe || "Scolaire"})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── QUICK NAV TABS (MOBILE & DESKTOP NATIVE APP LOOK) ─── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar print:hidden">
        {[
          { id: "overview", label: "Vue Générale", icon: <Layers size={16} /> },
          { id: "attendance", label: "Assiduité & Présences", icon: <CalendarCheck2 size={16} />, badge: `${data.attendance.rate}%` },
          { id: "academics", label: "Notes & Bulletin", icon: <Award size={16} />, badge: `${data.academics.averageGrade}/20` },
          { id: "finances", label: "Finances & Mobile Money", icon: <Wallet size={16} />, badge: `${data.finances.balance.toLocaleString("fr-FR")} F` },
          { id: "card", label: "Carte Scolaire QR", icon: <QrCode size={16} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "bg-white/80 dark:bg-[#131622] text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800 hover:bg-slate-100"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.badge && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── TAB 1: OVERVIEW ─── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Banner & Mobile Money Pay Action */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-[2.5rem] p-6 md:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">
                Paiement Mobile Money Direct 📱
              </span>
              <h2 className="text-2xl font-black">
                Solde Frais Scolaires : {data.finances.balance.toLocaleString("fr-FR")} FCFA
              </h2>
              <p className="text-xs text-indigo-100 font-medium max-w-lg">
                Réglez facilement la scolarité et les cotisations COGES de {selectedChild?.nomEtudiant} via Airtel Money, Moov Money (Flooz), Orange Money ou Wave.
              </p>
            </div>

            <button
              onClick={() => { setPaymentSuccessTxn(null); setIsPayModalOpen(true); }}
              className="relative z-10 flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-white text-indigo-700 font-black text-xs uppercase tracking-wider shadow-lg hover:bg-indigo-50 active:scale-95 transition-all self-start md:self-auto cursor-pointer"
            >
              <Wallet size={18} />
              Payer par Mobile Money
              <ArrowUpRight size={16} />
            </button>
          </div>

          {/* Quick KPIs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white/90 dark:bg-[#131622] border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase">Taux d'Assiduité</span>
                <CalendarCheck2 size={18} className="text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{data.attendance.rate}%</p>
              <p className="text-[10px] font-semibold text-slate-400">{data.attendance.presents} présences sur {data.attendance.totalSessions} cours</p>
            </div>

            <div className="p-5 rounded-3xl bg-white/90 dark:bg-[#131622] border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase">Moyenne Générale</span>
                <Award size={18} className="text-indigo-500" />
              </div>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{data.academics.averageGrade} / 20</p>
              <p className="text-[10px] font-semibold text-slate-400">Rang : {data.academics.rank}</p>
            </div>

            <div className="p-5 rounded-3xl bg-white/90 dark:bg-[#131622] border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase">Total Payé</span>
                <Wallet size={18} className="text-blue-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{data.finances.totalPaid.toLocaleString("fr-FR")} F</p>
              <p className="text-[10px] font-semibold text-emerald-500">{data.finances.paidPercentage}% du montant total</p>
            </div>

            <div className="p-5 rounded-3xl bg-white/90 dark:bg-[#131622] border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase">Absences à Justifier</span>
                <AlertTriangle size={18} className="text-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{data.attendance.absents}</p>
              <button
                onClick={() => setIsExcuseModalOpen(true)}
                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                Envoyer un justificatif <ChevronRight size={12} />
              </button>
            </div>
          </div>

          {/* School Announcements Feed */}
          <div className="bg-white/90 dark:bg-[#131622] rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Annonces & Communications de l'Établissement
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400">{data.announcements.length} annonces</span>
            </div>

            <div className="space-y-3">
              {data.announcements.map((item) => (
                <div key={item.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                      item.priority === "HIGH" ? "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400" : "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                    }`}>
                      {item.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{item.date}</span>
                  </div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">{item.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{item.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: ATTENDANCE & PRESENCE LOG ─── */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          <div className="bg-white/90 dark:bg-[#131622] rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Suivi de Présence de {selectedChild?.nomEtudiant}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Historique détaillé des présences, retards et absences constatés par l'équipe pédagogique.
                </p>
              </div>

              <button
                onClick={() => setIsExcuseModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all shadow-md cursor-pointer self-start md:self-auto"
              >
                <Plus size={16} />
                Justifier une Absence
              </button>
            </div>

            {/* Attendance Counters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-center space-y-1">
                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Présences</p>
                <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{data.attendance.presents}</p>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-center space-y-1">
                <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase">Absences</p>
                <p className="text-xl font-black text-rose-700 dark:text-rose-300">{data.attendance.absents}</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-center space-y-1">
                <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase">Retards</p>
                <p className="text-xl font-black text-amber-700 dark:text-amber-300">{data.attendance.retards}</p>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-center space-y-1">
                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase">Justifiés</p>
                <p className="text-xl font-black text-blue-700 dark:text-blue-300">{data.attendance.excused}</p>
              </div>
            </div>

            {/* Attendance Table Log */}
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs font-bold border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase text-slate-400">
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Statut Constaté</th>
                    <th className="p-3.5">Remarques & Motif Parent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.attendance.logs.length > 0 ? (
                    data.attendance.logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3.5 font-black text-slate-900 dark:text-white">{log.date}</td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            log.status === "Présent" || log.status === "Present"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                              : log.status === "Absent"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                                : log.status === "Retard"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300">{log.remarks || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-slate-400 font-semibold italic">
                        Aucun enregistrement d'assiduité disponible pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: ACADEMICS & REPORT CARD ─── */}
      {activeTab === "academics" && (
        <div className="space-y-6">
          <div className="bg-white/90 dark:bg-[#131622] rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Relevé de Notes & Résultats de {selectedChild?.nomEtudiant}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Notes de classe, coefficients par matière et moyenne trimestrielle de l'élève.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
                <Link
                  href={`/verify/${encodeURIComponent(selectedChild?.numAdmission || selectedChild?.id || "PARENT")}`}
                  target="_blank"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all cursor-pointer"
                >
                  <ShieldCheck size={16} />
                  <span>Vérification Officielle</span>
                </Link>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
                >
                  <Printer size={16} />
                  <span>Imprimer le Bulletin PDF</span>
                </button>
              </div>
            </div>

            {/* Subject Breakdown Table */}
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs font-bold border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase text-slate-400">
                    <th className="p-3.5">Matière Pédagogique</th>
                    <th className="p-3.5">Enseignant</th>
                    <th className="p-3.5 text-center">Coeff</th>
                    <th className="p-3.5 text-center">Moyenne / 20</th>
                    <th className="p-3.5">Appréciation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.academics.subjects.map((sub, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3.5 font-black text-slate-900 dark:text-white">{sub.subjectName}</td>
                      <td className="p-3.5 text-slate-500 dark:text-slate-400">{sub.teacherName}</td>
                      <td className="p-3.5 text-center text-slate-400">{sub.coefficient}</td>
                      <td className="p-3.5 text-center font-black text-indigo-600 dark:text-indigo-400 text-sm">
                        {sub.average}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300 italic">{sub.appreciation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Recent Evaluations */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                Dernières Notes d'Évaluations & Devoirs
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.academics.recentGrades.map((g) => (
                  <div key={g.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">{g.subject}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{g.type} ({g.date})</p>
                    </div>
                    <span className="text-sm font-black px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/30">
                      {g.score} / {g.maxScore}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: FINANCES & MOBILE MONEY ─── */}
      {activeTab === "finances" && (
        <div className="space-y-6">
          <div className="bg-white/90 dark:bg-[#131622] rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Situation Financière & Guichet Mobile Money
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  État des règlements de scolarité et historique des reçus de paiement.
                </p>
              </div>

              <button
                onClick={() => { setPaymentSuccessTxn(null); setIsPayModalOpen(true); }}
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-black uppercase tracking-wider shadow-lg hover:opacity-95 transition-all cursor-pointer self-start md:self-auto"
              >
                <Smartphone size={16} />
                Payer par Mobile Money
              </button>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase">Frais Totaux Annuel</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{data.finances.totalExpected.toLocaleString("fr-FR")} FCFA</p>
              </div>
              <div className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 space-y-1 text-center">
                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Montant Réglé</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{data.finances.totalPaid.toLocaleString("fr-FR")} FCFA</p>
              </div>
              <div className="p-5 rounded-3xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 space-y-1 text-center">
                <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase">Reste à Payer</p>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{data.finances.balance.toLocaleString("fr-FR")} FCFA</p>
              </div>
            </div>

            {/* Payment History */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                Historique des Reçus & Transcations Mobile Money
              </h4>

              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs font-bold border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase text-slate-400">
                      <th className="p-3.5">N° Reçu / Réf</th>
                      <th className="p-3.5">Motif</th>
                      <th className="p-3.5">Canal de Paiement</th>
                      <th className="p-3.5 text-right">Montant</th>
                      <th className="p-3.5 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.finances.paymentHistory.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3.5 font-mono text-indigo-600 dark:text-indigo-400">{p.receiptNo}</td>
                        <td className="p-3.5 text-slate-900 dark:text-white">{p.purpose}</td>
                        <td className="p-3.5 font-semibold text-slate-500 dark:text-slate-400">{p.paymentMode}</td>
                        <td className="p-3.5 text-right font-black text-emerald-600 dark:text-emerald-400">{p.amount.toLocaleString("fr-FR")} FCFA</td>
                        <td className="p-3.5 text-right text-slate-400">{p.datePaid}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 5: STUDENT DIGITAL ID CARD (CARTE SCOLAIRE QR) ─── */}
      {activeTab === "card" && (
        <div className="space-y-6 max-w-xl mx-auto">
          <div className="bg-white/90 dark:bg-[#131622] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 shadow-xl space-y-6 text-center">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Carte d'Identité Scolaire Numérique 🪪
            </h3>

            {/* Digital Student Card Container */}
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white rounded-[2rem] p-6 text-left shadow-2xl relative overflow-hidden border border-indigo-500/30 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">{data.studentCard.schoolName}</p>
                  <p className="text-[9px] text-slate-300">Année Scolaire {data.studentCard.academicYear}</p>
                </div>
                <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full uppercase">
                  Élève Valide
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-20 h-24 rounded-2xl bg-slate-800 border-2 border-indigo-400/40 overflow-hidden shrink-0 flex items-center justify-center">
                  {selectedChild?.photoPath ? (
                    <img src={selectedChild.photoPath} alt="Photo" className="w-full h-full object-cover" />
                  ) : (
                    <User size={36} className="text-slate-400" />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-lg font-black text-white">{selectedChild?.nomEtudiant}</p>
                  {selectedChild?.nomArabe && <p className="text-xs text-indigo-200 font-arabic">{selectedChild.nomArabe}</p>}
                  <p className="text-xs text-indigo-300 font-bold">N° Matricule : {selectedChild?.numAdmission}</p>
                  <p className="text-xs text-slate-300 font-medium">Classe : {selectedChild?.classe || "Primaire / Secondaire"}</p>
                  <p className="text-[10px] text-slate-400">Niveau : {selectedChild?.educationalLevel || "Enseignement Général"}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-3 text-[10px]">
                <div className="font-mono text-slate-400">{data.studentCard.cardId}</div>
                <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
                  <QrCode size={14} /> Scan de Vérification Active
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/verify/${encodeURIComponent(selectedChild?.numAdmission || selectedChild?.id || "CARD")}`}
                target="_blank"
                className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-all shadow-lg text-center flex items-center justify-center gap-2"
              >
                <ShieldCheck size={16} />
                <span>Vérifier en Ligne (Portail Public)</span>
              </Link>
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all shadow-lg cursor-pointer"
              >
                Imprimer la Carte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: SUBMIT ABSENCE EXCUSE ─── */}
      {isExcuseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#131622] rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                Justifier une Absence d'Élève
              </h3>
              <button onClick={() => setIsExcuseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleExcuseSubmit} className="space-y-4 text-xs font-bold">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Élève Concerné</label>
                <input
                  type="text"
                  disabled
                  value={`${selectedChild?.nomEtudiant} (${selectedChild?.classe})`}
                  className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Date de l'Absence</label>
                <input
                  type="date"
                  value={excuseDate}
                  onChange={(e) => setExcuseDate(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Motif de l'Absence</label>
                <select
                  value={excuseReason}
                  onChange={(e) => setExcuseReason(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none cursor-pointer"
                >
                  <option value="Raison médicale (Maladie / Consultation)">Raison médicale (Maladie / Consultation)</option>
                  <option value="Événement Familial / Impératif">Événement Familial / Impératif</option>
                  <option value="Voyage / Déplacement d'urgence">Voyage / Déplacement d'urgence</option>
                  <option value="Autre motif valable">Autre motif valable</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Détails ou Explications</label>
                <textarea
                  rows={3}
                  value={excuseNotes}
                  onChange={(e) => setExcuseNotes(e.target.value)}
                  placeholder="Précisez le détail ou le nom du médecin s'il y a lieu..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExcuseModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExcuse}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingExcuse ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  Envoyer la Justification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: MOBILE MONEY PAYMENT (AIRTEL, MOOV, FLOOZ, ORANGE, WAVE, NITA) ─── */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#131622] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Smartphone size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Paiement Mobile Money 🇳🇪</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Guichet sécurisé Airtel, Moov, Flooz, Orange & Wave</p>
                </div>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {paymentSuccessTxn ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 size={36} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">Paiement Validé avec Succès !</h4>
                  <p className="text-xs text-slate-500">Réf : <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{paymentSuccessTxn.ref}</span></p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 space-y-1">
                  <p>Montant : {paymentSuccessTxn.amount.toLocaleString("fr-FR")} FCFA</p>
                  <p>Opérateur : {paymentSuccessTxn.provider}</p>
                  <p>Motif : {paymentSuccessTxn.purpose}</p>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 flex items-center justify-center gap-2"
                  >
                    <Printer size={16} /> Imprimer Reçu
                  </button>
                  <button
                    onClick={() => setIsPayModalOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs font-bold">
                {/* Select Provider */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Choix de l'Opérateur Mobile Money</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "AIRTEL_MONEY", name: "Airtel Money", color: "border-red-500 text-red-600 bg-red-50 dark:bg-red-500/10" },
                      { id: "MOOV_MONEY", name: "Moov / Flooz", color: "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-500/10" },
                      { id: "ORANGE_MONEY", name: "Orange Money", color: "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-500/10" },
                      { id: "WAVE", name: "Wave", color: "border-cyan-500 text-cyan-600 bg-cyan-50 dark:bg-cyan-500/10" },
                      { id: "NITA", name: "Nita / Al-Izza", color: "border-purple-500 text-purple-600 bg-purple-50 dark:bg-purple-500/10" },
                      { id: "BANK_CARD", name: "Carte Bancaire", color: "border-indigo-500 text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10" }
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPayProvider(p.id as any)}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                          payProvider === p.id
                            ? `${p.color} ring-2 ring-indigo-400 font-black shadow-sm`
                            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-[11px]">{p.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Purpose */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Motif du Règlement</label>
                  <select
                    value={payPurpose}
                    onChange={(e) => setPayPurpose(e.target.value as any)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none cursor-pointer"
                  >
                    <option value="Scolarité">Frais de Scolarité / Mensualités</option>
                    <option value="COGES">Cotisation Annuelle COGES</option>
                    <option value="Inscription">Frais d'Inscription / Réinscription</option>
                    <option value="Autre">Transport / Cantine / Assurance</option>
                  </select>
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Montant à Payer (FCFA)</label>
                  <input
                    type="number"
                    min={500}
                    step={500}
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-black text-base outline-none"
                    required
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Numéro de Téléphone Mobile Money</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+227 90 00 00 00"
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono font-bold outline-none"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isProcessingPayment}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-indigo-600 text-white font-black text-xs uppercase tracking-wider shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingPayment ? <RefreshCw size={16} className="animate-spin" /> : <Smartphone size={16} />}
                    {isProcessingPayment ? "Traitement Mobile Money..." : `Confirmer & Payer ${payAmount.toLocaleString("fr-FR")} FCFA`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
