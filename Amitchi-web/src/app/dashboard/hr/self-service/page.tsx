"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  UserCheck,
  Calendar,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Eye,
  Download,
  Printer,
  DollarSign,
  Briefcase,
  Building,
  CreditCard,
  Phone,
  Mail,
  Loader2,
  Sparkles,
  Award,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import {
  getStaffSelfServiceData,
  submitStaffHrRequestAction,
  submitStaffExtraHoursAction,
  deleteStaffHrRequestAction,
  deleteStaffExtraHoursAction,
} from "@/domains/hr/actions/self-service.actions";
import { getDocumentHeaderConfig } from "@/domains/settings/actions/settings.actions";
import HrDocumentPrintModal, { HrDocType } from "@/domains/hr/components/HrDocumentPrintModal";

export default function HrSelfServicePage() {
  const [activeTab, setActiveTab] = useState<"requests" | "payslips" | "certificates" | "overtime">("requests");
  const [isLoading, setIsLoading] = useState(true);

  const [profile, setProfile] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [extraHours, setExtraHours] = useState<any[]>([]);
  const [headerConfig, setHeaderConfig] = useState<any>(null);

  // Official Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState<HrDocType>("payslip");
  const [selectedPayslipRecord, setSelectedPayslipRecord] = useState<any | null>(null);

  // Modal State: New HR Request
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [newRequest, setNewRequest] = useState({
    requestType: "Congé payé",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    daysCount: 3,
    advanceAmount: 50000,
    reason: "",
  });

  // Modal State: New Extra Hours
  const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);
  const [isSubmittingOvertime, setIsSubmittingOvertime] = useState(false);
  const [newOvertime, setNewOvertime] = useState({
    date: new Date().toISOString().slice(0, 10),
    typeHour: "Heure supplémentaire",
    className: "Terminale D",
    subjectName: "Mathématiques",
    hoursCount: 2,
    hourlyRate: 2500,
    notes: "",
  });

  // Selected Payslip for View Modal
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

  // Selected Certificate for View/Print Modal
  const [isAttestationModalOpen, setIsAttestationModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [res, cfgRes]: any = await Promise.all([
        getStaffSelfServiceData(),
        getDocumentHeaderConfig().catch(() => null),
      ]);
      const payload = res?.data || res;
      if (payload?.profile) {
        setProfile(payload.profile);
        setRequests(payload.requests || []);
        setPayslips(payload.payslips || []);
        setExtraHours(payload.extraHours || []);
      }
      if (cfgRes?.data) {
        setHeaderConfig(cfgRes.data);
      }
    } catch (err) {
      toast.error("Erreur lors du chargement de votre espace personnel.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !newRequest.reason) {
      toast.error("Veuillez motiver votre demande.");
      return;
    }

    try {
      setIsSubmittingRequest(true);
      const res: any = await submitStaffHrRequestAction({
        employeeId: profile.id,
        requestType: newRequest.requestType,
        startDate: newRequest.startDate,
        endDate: newRequest.endDate,
        daysCount: Number(newRequest.daysCount || 1),
        advanceAmount: newRequest.requestType === "Avance sur salaire" ? Number(newRequest.advanceAmount) : undefined,
        reason: newRequest.reason,
      });

      const data = res?.data || res;
      if (data?.success) {
        toast.success(data.message || "Demande transmise avec succès !");
        setIsRequestModalOpen(false);
        setNewRequest({ ...newRequest, reason: "" });
        loadData();
      } else if (res?.error || data?.error) {
        toast.error(res?.error || data?.error);
      }
    } catch (err) {
      toast.error("Erreur lors de la transmission de la demande.");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleDeleteRequest = async (id: number) => {
    if (!confirm("Voulez-vous annuler cette demande ?")) return;
    try {
      const res = await deleteStaffHrRequestAction(id);
      if (res?.success) {
        toast.success("Demande annulée.");
        loadData();
      }
    } catch (err) {
      toast.error("Erreur lors de l'annulation.");
    }
  };

  const handleCreateOvertime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    try {
      setIsSubmittingOvertime(true);
      const res = await submitStaffExtraHoursAction({
        employeeId: profile.id,
        date: newOvertime.date,
        typeHour: newOvertime.typeHour,
        className: newOvertime.className,
        subjectName: newOvertime.subjectName,
        hoursCount: Number(newOvertime.hoursCount || 1),
        hourlyRate: Number(newOvertime.hourlyRate || 2500),
        notes: newOvertime.notes,
      });

      if (res?.success) {
        toast.success("Déclaration d'heures supplémentaires enregistrée.");
        setIsOvertimeModalOpen(false);
        loadData();
      }
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setIsSubmittingOvertime(false);
    }
  };

  const handleDeleteOvertime = async (id: number) => {
    if (!confirm("Supprimer cette déclaration ?")) return;
    try {
      const res = await deleteStaffExtraHoursAction(id);
      if (res?.success) {
        toast.success("Déclaration supprimée.");
        loadData();
      }
    } catch (err) {
      toast.error("Erreur lors de la suppression.");
    }
  };

  const REQUEST_TYPES = [
    "Congé annuel / payé",
    "Congé maladie",
    "Congé familial / Naissance / Décès",
    "Permission d'absence exceptionnelle",
    "Avance sur salaire / Acompte",
    "Demande d'Attestation de travail",
    "Ordre de mission pédagogique",
    "Autre démarche administrative",
  ];

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto font-sans">
      {/* Header Profile Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-emerald-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5 relative z-10">
          <div className="size-20 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-3xl flex items-center justify-center text-slate-950 font-black text-2xl shadow-2xl border-2 border-emerald-300">
            {profile?.nom ? profile.nom.slice(0, 2).toUpperCase() : "RH"}
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold uppercase tracking-wider">
              <UserCheck className="size-3.5" /> Espace Personnel & RH
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{profile?.nom || "Agent Edut"}</h1>
            <p className="text-emerald-200 text-xs sm:text-sm font-semibold flex items-center gap-2">
              <span>{profile?.poste}</span> • <span>Matricule : {profile?.empId}</span> • <span>{profile?.departement}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs sm:text-sm shadow-lg transition transform active:scale-95 flex items-center gap-2"
          >
            <Plus className="size-4" /> Déposer une Demande RH
          </button>
        </div>
      </div>

      {/* Contract & Financial Overview Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-2xl">
            <DollarSign className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Salaire Net Estimé</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-0.5">
              {profile ? `${Number(profile.netSalary).toLocaleString()} FCFA` : "-"}
            </h3>
            <p className="text-[11px] text-slate-400">Base : {Number(profile?.salaireBase || 0).toLocaleString()} F</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-2xl">
            <Calendar className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ancienneté</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {profile?.dateEmbauche || "2023"}
            </h3>
            <p className="text-[11px] text-slate-400">Contrat Actif</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950 text-amber-600 rounded-2xl">
            <Clock className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Demandes en cours</p>
            <h3 className="text-2xl font-black text-amber-600 mt-0.5">
              {requests.filter((r) => r.status === "En attente").length}
            </h3>
            <p className="text-[11px] text-slate-400">En cours d'examen</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-2xl">
            <CreditCard className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Virement Bancaire</p>
            <h3 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{profile?.banqueNom || "SONIBANK"}</h3>
            <p className="text-[11px] text-slate-400 truncate">{profile?.banqueCompte || "Compte principal"}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("requests")}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "requests"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Calendar className="size-4" /> Demandes RH & Congés ({requests.length})
        </button>

        <button
          onClick={() => setActiveTab("payslips")}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "payslips"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <DollarSign className="size-4" /> Mes Bulletins de Paie ({payslips.length})
        </button>

        <button
          onClick={() => setActiveTab("certificates")}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "certificates"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <FileText className="size-4" /> Attestations & Documents
        </button>

        <button
          onClick={() => setActiveTab("overtime")}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "overtime"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <TrendingUp className="size-4" /> Heures Supplémentaires ({extraHours.length})
        </button>
      </div>

      {/* TAB 1: DEMANDES RH & CONGÉS */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Historique de vos démarches RH</h3>
            <button
              onClick={() => setIsRequestModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5"
            >
              <Plus className="size-3.5" /> Nouvelle Demande
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                <Loader2 className="size-8 animate-spin text-emerald-600" />
                <p className="text-sm font-medium">Chargement des demandes...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                <Calendar className="size-12 text-slate-300" />
                <p className="text-sm font-semibold">Aucune demande RH enregistrée pour le moment.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-4">Type de Demande</th>
                      <th className="p-4">Période / Montant</th>
                      <th className="p-4">Motif & Explications</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4">Avis Direction</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {requests.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                        <td className="p-4 font-bold text-slate-900 dark:text-white">
                          {r.requestType}
                          <p className="text-xs text-slate-400 font-normal">
                            Déposée le {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                          </p>
                        </td>

                        <td className="p-4 whitespace-nowrap">
                          {r.requestType === "Avance sur salaire" ? (
                            <span className="font-extrabold text-emerald-600">
                              {Number(r.advanceAmount || 0).toLocaleString()} FCFA
                            </span>
                          ) : (
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">{r.daysCount} jour(s)</p>
                              {r.startDate && (
                                <p className="text-xs text-slate-400">
                                  Du {r.startDate} au {r.endDate || "-"}
                                </p>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="p-4 max-w-xs truncate">{r.reason}</td>

                        <td className="p-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              r.status === "Approuvé"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950"
                                : r.status === "Rejeté"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>

                        <td className="p-4 text-xs italic text-slate-500">
                          {r.adminComment || "En attente d'avis"}
                        </td>

                        <td className="p-4 text-right whitespace-nowrap">
                          {r.status === "En attente" && (
                            <button
                              onClick={() => handleDeleteRequest(r.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600"
                              title="Annuler"
                            >
                              <Trash2 className="size-4" />
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

      {/* TAB 2: MES BULLETINS DE PAIE */}
      {activeTab === "payslips" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="size-5 text-emerald-600" /> Bulletins de Paie Numériques
            </h3>

            {payslips.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-3">
                <FileText className="size-12 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold">Aucun bulletin de paie archivé pour l'instant.</p>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  💡 Votre fiche de paie mensuelle apparaîtra ici dès clôture de la paie par la comptabilité (SYSCOHADA).
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {payslips.map((p) => (
                  <div
                    key={p.id}
                    className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 dark:text-white text-base">{p.monthYear}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                        {p.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-slate-500">
                      <div className="flex justify-between">
                        <span>Salaire de Base :</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{Number(p.basicSalary).toLocaleString()} F</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Primes & Indemnités :</span>
                        <span className="font-semibold text-emerald-600">+{Number(p.totalAllowance).toLocaleString()} F</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Retenues (CNSS/IUTS) :</span>
                        <span className="font-semibold text-rose-600">-{Number(p.totalDeduction).toLocaleString()} F</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1 font-black text-sm text-slate-900 dark:text-white">
                        <span>Net Payé :</span>
                        <span className="text-emerald-600">{Number(p.netSalary).toLocaleString()} FCFA</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedPayslipRecord(p);
                        setPrintDocType("payslip");
                        setIsPrintModalOpen(true);
                      }}
                      className="w-full py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Printer className="size-3.5" /> Imprimer le Bulletin Officiel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ATTESTATIONS & DOCUMENTS ADMINISTRATIFS */}
      {activeTab === "certificates" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="size-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileText className="size-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">Attestation de Travail Officielle</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Certificat d'emploi attestant de votre fonction, date d'embauche et affiliation à l'établissement avec sceau officiel.
                </p>
              </div>
              <button
                onClick={() => {
                  setPrintDocType("certificate");
                  setIsPrintModalOpen(true);
                }}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2 transition"
              >
                <Printer className="size-4" /> Générer & Imprimer l'Attestation
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="size-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Award className="size-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">Certificat de Prise de Service</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Document confirmant votre affectation et présence effective pour l'année scolaire en cours.
                </p>
              </div>
              <button
                onClick={() => {
                  setPrintDocType("certificate");
                  setIsPrintModalOpen(true);
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2 transition"
              >
                <Printer className="size-4" /> Générer & Imprimer le Certificat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: HEURES SUPPLÉMENTAIRES */}
      {activeTab === "overtime" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Déclarations d'heures de vacation & soutien</h3>
            <button
              onClick={() => setIsOvertimeModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5"
            >
              <Plus className="size-3.5" /> Déclarer des Heures
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {extraHours.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <TrendingUp className="size-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold">Aucune heure supplémentaire déclarée.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-4">Date</th>
                      <th className="p-4">Type & Matière</th>
                      <th className="p-4">Classe</th>
                      <th className="p-4">Volume Horaire</th>
                      <th className="p-4">Montant Total</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {extraHours.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                        <td className="p-4 font-bold text-slate-900 dark:text-white">{h.date}</td>
                        <td className="p-4">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{h.typeHour}</p>
                          <p className="text-xs text-slate-400">{h.subjectName}</p>
                        </td>
                        <td className="p-4 font-bold text-indigo-600">{h.className}</td>
                        <td className="p-4 font-black">{h.hoursCount} heure(s)</td>
                        <td className="p-4 font-black text-emerald-600">{Number(h.totalAmount).toLocaleString()} FCFA</td>
                        <td className="p-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            {h.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleDeleteOvertime(h.id)} className="p-1.5 text-slate-400 hover:text-rose-600">
                            <Trash2 className="size-4" />
                          </button>
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

      {/* MODAL: NOUVELLE DEMANDE RH */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="size-5 text-emerald-600" /> Déposer une Demande RH
              </h3>
              <button onClick={() => setIsRequestModalOpen(false)} className="p-2 text-slate-400">✕</button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Type de démarche *</label>
                <select
                  value={newRequest.requestType}
                  onChange={(e) => setNewRequest({ ...newRequest, requestType: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-emerald-600 outline-none"
                >
                  {REQUEST_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {newRequest.requestType === "Avance sur salaire" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Montant souhaité (FCFA) *</label>
                  <input
                    type="number"
                    required
                    step="5000"
                    value={newRequest.advanceAmount}
                    onChange={(e) => setNewRequest({ ...newRequest, advanceAmount: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-emerald-600"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Date début</label>
                    <input
                      type="date"
                      value={newRequest.startDate}
                      onChange={(e) => setNewRequest({ ...newRequest, startDate: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Date fin</label>
                    <input
                      type="date"
                      value={newRequest.endDate}
                      onChange={(e) => setNewRequest({ ...newRequest, endDate: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Nb Jours</label>
                    <input
                      type="number"
                      min="1"
                      value={newRequest.daysCount}
                      onChange={(e) => setNewRequest({ ...newRequest, daysCount: parseInt(e.target.value) || 1 })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Motif / Justification détaillée *</label>
                <textarea
                  required
                  rows={3}
                  value={newRequest.reason}
                  onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                  placeholder="Préciser les raisons de votre demande..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsRequestModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Annuler</button>
                <button type="submit" disabled={isSubmittingRequest} className="px-6 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow">
                  {isSubmittingRequest && <Loader2 className="size-3.5 animate-spin mr-1" />}
                  Transmettre la demande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DÉCLARATION HEURES SUPPLÉMENTAIRES */}
      {isOvertimeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="size-5 text-indigo-600" /> Heures Supplémentaires
              </h3>
              <button onClick={() => setIsOvertimeModalOpen(false)} className="p-2 text-slate-400">✕</button>
            </div>

            <form onSubmit={handleCreateOvertime} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Date d'exécution *</label>
                <input
                  type="date"
                  required
                  value={newOvertime.date}
                  onChange={(e) => setNewOvertime({ ...newOvertime, date: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Classe</label>
                  <input
                    type="text"
                    value={newOvertime.className}
                    onChange={(e) => setNewOvertime({ ...newOvertime, className: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Matière</label>
                  <input
                    type="text"
                    value={newOvertime.subjectName}
                    onChange={(e) => setNewOvertime({ ...newOvertime, subjectName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nombre d'heures</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newOvertime.hoursCount}
                    onChange={(e) => setNewOvertime({ ...newOvertime, hoursCount: parseInt(e.target.value) || 1 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Taux horaire (FCFA)</label>
                  <input
                    type="number"
                    step="500"
                    value={newOvertime.hourlyRate}
                    onChange={(e) => setNewOvertime({ ...newOvertime, hourlyRate: parseInt(e.target.value) || 2500 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsOvertimeModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Annuler</button>
                <button type="submit" disabled={isSubmittingOvertime} className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Official HR Document Printing Modal ─── */}
      <HrDocumentPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        headerConfig={headerConfig}
        docType={printDocType}
        salaryRecord={selectedPayslipRecord}
        employee={profile}
      />
    </div>
  );
}
