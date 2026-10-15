"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Shield,
  ShieldAlert,
  Gavel,
  AlertTriangle,
  Clock,
  UserX,
  UserCheck,
  Send,
  Plus,
  Trash2,
  Edit,
  Search,
  CheckCircle2,
  Calendar,
  MapPin,
  FileText,
  Award,
  Users,
  Loader2,
  RefreshCw,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import {
  getDisciplineDashboardStats,
  getIncidents,
  createIncident,
  deleteIncident,
  getDisciplinaryCouncils,
  createDisciplinaryCouncil,
  deleteDisciplinaryCouncil,
  getParentConvocations,
  createParentConvocation,
  deleteParentConvocation,
} from "@/domains/students/actions/discipline.actions";
import { getStudentMedicalDirectoryAction } from "@/domains/health/actions/health.actions";

export default function DisciplinePage() {
  const [activeTab, setActiveTab] = useState<"incidents" | "councils" | "convocations" | "rewards">("incidents");
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalIncidents: 0,
    activeCouncils: 0,
    pendingConvocations: 0,
    totalRewards: 0,
  });

  // Data lists
  const [incidentsList, setIncidentsList] = useState<any[]>([]);
  const [councilsList, setCouncilsList] = useState<any[]>([]);
  const [convocationsList, setConvocationsList] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");

  // Modals State
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);
  const [newIncident, setNewIncident] = useState({
    studentId: 0,
    incidentType: "Indiscipline en classe",
    severity: "Majeur",
    description: "",
    proposedAction: "",
    sanctionType: "Avertissement écrit",
    sanctionDurationDays: 0,
    status: "En attente",
    notifyParent: true,
  });

  const [isCouncilModalOpen, setIsCouncilModalOpen] = useState(false);
  const [isSubmittingCouncil, setIsSubmittingCouncil] = useState(false);
  const [newCouncil, setNewCouncil] = useState({
    studentId: 0,
    sessionDate: new Date().toISOString().slice(0, 16),
    location: "Salle de délibération",
    presidentName: "Le Proviseur",
    membersPresent: "Proviseur, Censeur, Professeur Principal, Représentant des Parents",
    reproachedFacts: "",
    studentDefense: "",
    decisionType: "Avertissement solennel",
    exclusionDays: 0,
    status: "Programmé",
    notifyParent: true,
  });

  const [isConvocationModalOpen, setIsConvocationModalOpen] = useState(false);
  const [isSubmittingConvocation, setIsSubmittingConvocation] = useState(false);
  const [newConvocation, setNewConvocation] = useState({
    studentId: 0,
    reason: "Comportement et indiscipline répétée en classe",
    convocationDate: new Date().toISOString().slice(0, 16),
    location: "Bureau du Censeur / Surveillant Général",
    channel: "WhatsApp",
    notes: "",
    notifyParent: true,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, incRes, cnlRes, convRes, stdRes] = await Promise.all([
        getDisciplineDashboardStats(),
        getIncidents(),
        getDisciplinaryCouncils(),
        getParentConvocations(),
        getStudentMedicalDirectoryAction(),
      ]);

      if (statsRes) setStats((statsRes as any)?.data || statsRes);
      if (incRes?.data) setIncidentsList((incRes.data as any)?.data || incRes.data || []);
      if (cnlRes?.data) setCouncilsList((cnlRes.data as any)?.data || cnlRes.data || []);
      if (convRes?.data) setConvocationsList((convRes.data as any)?.data || convRes.data || []);
      const studentsData = (stdRes as any)?.data?.students || (stdRes as any)?.students || [];
      setStudentsList(studentsData);
    } catch (err: any) {
      toast.error("Erreur lors du chargement des données de discipline.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const INCIDENT_TYPES = [
    "Indiscipline en classe",
    "Retards répétés et injustifiés",
    "Bagarre / Violence physique",
    "Insulte ou manque de respect envers un enseignant",
    "Absence non justifiée / École buissonnière",
    "Utilisation du téléphone portable en classe",
    "Détérioration du matériel scolaire",
    "Fraude ou tricherie à l'évaluation",
  ];

  const SANCTION_TYPES = [
    "Rappel à l'ordre oral",
    "Avertissement écrit",
    "Blâme officiel avec inscription au dossier",
    "Retenue / Heures de colle",
    "Travaux d'intérêt général",
    "Exclusion temporaire (1 à 8 jours)",
    "Renvoi devant le Conseil de Discipline",
  ];

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncident.studentId || !newIncident.description) {
      toast.error("Veuillez sélectionner un élève et fournir une description.");
      return;
    }

    try {
      setIsSubmittingIncident(true);
      const res = await createIncident({
        studentId: Number(newIncident.studentId),
        incidentType: newIncident.incidentType,
        severity: newIncident.severity as any,
        description: newIncident.description,
        proposedAction: newIncident.proposedAction,
        sanctionType: newIncident.sanctionType,
        sanctionDurationDays: Number(newIncident.sanctionDurationDays || 0),
        status: newIncident.status,
        notifyParent: newIncident.notifyParent,
      });

      if (res?.success) {
        toast.success("Incident et mesure disciplinaire enregistrés ! Parent notifié.");
        setIsIncidentModalOpen(false);
        loadData();
      } else if (res?.error) {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error("Erreur lors de l'enregistrement de l'incident.");
    } finally {
      setIsSubmittingIncident(false);
    }
  };

  const handleDeleteIncident = async (id: number) => {
    if (!confirm("Voulez-vous supprimer cet incident ?")) return;
    try {
      const res = await deleteIncident(id);
      if (res?.success) {
        toast.success("Incident supprimé.");
        loadData();
      }
    } catch (err) {
      toast.error("Erreur lors de la suppression.");
    }
  };

  const handleCreateCouncil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouncil.studentId || !newCouncil.reproachedFacts) {
      toast.error("Veuillez renseigner l'élève et les faits reprochés.");
      return;
    }

    try {
      setIsSubmittingCouncil(true);
      const res = await createDisciplinaryCouncil({
        studentId: Number(newCouncil.studentId),
        sessionDate: newCouncil.sessionDate,
        location: newCouncil.location,
        presidentName: newCouncil.presidentName,
        membersPresent: newCouncil.membersPresent,
        reproachedFacts: newCouncil.reproachedFacts,
        studentDefense: newCouncil.studentDefense,
        decisionType: newCouncil.decisionType,
        exclusionDays: Number(newCouncil.exclusionDays || 0),
        status: newCouncil.status,
        notifyParent: newCouncil.notifyParent,
      });

      if (res?.success) {
        toast.success("Conseil de discipline programmé ! Convocation envoyée aux parents.");
        setIsCouncilModalOpen(false);
        loadData();
      } else if (res?.error) {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error("Erreur lors de la création du conseil de discipline.");
    } finally {
      setIsSubmittingCouncil(false);
    }
  };

  const handleDeleteCouncil = async (id: number) => {
    if (!confirm("Voulez-vous supprimer ce conseil de discipline ?")) return;
    try {
      const res = await deleteDisciplinaryCouncil(id);
      if (res?.success) {
        toast.success("Conseil de discipline supprimé.");
        loadData();
      }
    } catch (err) {
      toast.error("Erreur lors de la suppression.");
    }
  };

  const handleCreateConvocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConvocation.studentId || !newConvocation.reason) {
      toast.error("Veuillez renseigner l'élève et le motif du rendez-vous.");
      return;
    }

    try {
      setIsSubmittingConvocation(true);
      const res = await createParentConvocation({
        studentId: Number(newConvocation.studentId),
        reason: newConvocation.reason,
        convocationDate: newConvocation.convocationDate,
        location: newConvocation.location,
        channel: newConvocation.channel,
        notes: newConvocation.notes,
        notifyParent: newConvocation.notifyParent,
      });

      if (res?.success) {
        toast.success("Convocation transmise au parent par WhatsApp/SMS !");
        setIsConvocationModalOpen(false);
        loadData();
      } else if (res?.error) {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error("Erreur lors de l'envoi de la convocation.");
    } finally {
      setIsSubmittingConvocation(false);
    }
  };

  const handleDeleteConvocation = async (id: number) => {
    if (!confirm("Voulez-vous supprimer cette convocation ?")) return;
    try {
      const res = await deleteParentConvocation(id);
      if (res?.success) {
        toast.success("Convocation supprimée.");
        loadData();
      }
    } catch (err) {
      toast.error("Erreur lors de la suppression.");
    }
  };

  const filteredIncidents = incidentsList.filter((inc) => {
    const sName = inc.student?.nomEtudiant?.toLowerCase() || "";
    const matchSearch = sName.includes(searchQuery.toLowerCase()) || inc.incidentType?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSeverity = severityFilter === "ALL" || inc.severity === severityFilter;
    return matchSearch && matchSeverity;
  });

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-rose-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-200 border border-rose-400/30 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
            <Shield className="size-3.5" /> Vie Scolaire & Discipline
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Discipline, Sanctions & Conseils 🛡️
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl font-medium">
            Suivi rigoureux du comportement scolaire, gestion des avertissements, blâmes, convocations d'urgence et procès-verbaux de conseils de discipline.
          </p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => setIsIncidentModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg transition-all transform active:scale-95"
          >
            <Plus className="size-4" /> Signaler un incident
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-2xl">
            <Gavel className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Incidents</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.totalIncidents}</h3>
            <p className="text-xs text-slate-400">Signalements enregistrés</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950 text-rose-600 rounded-2xl">
            <ShieldAlert className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conseils de Discipline</p>
            <h3 className="text-2xl font-black text-rose-600 mt-0.5">{stats.activeCouncils}</h3>
            <p className="text-xs text-slate-400">Sessions programmées</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950 text-amber-600 rounded-2xl">
            <Clock className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Convocations Parents</p>
            <h3 className="text-2xl font-black text-amber-600 mt-0.5">{stats.pendingConvocations}</h3>
            <p className="text-xs text-slate-400">En attente d'entretien</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-2xl">
            <Award className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tableau d'Honneur</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-0.5">{stats.totalRewards}</h3>
            <p className="text-xs text-slate-400">Mérites & Félicitations</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("incidents")}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "incidents"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <AlertTriangle className="size-4" /> Incidents & Sanctions ({incidentsList.length})
        </button>

        <button
          onClick={() => setActiveTab("councils")}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "councils"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Gavel className="size-4" /> Conseils de Discipline ({councilsList.length})
        </button>

        <button
          onClick={() => setActiveTab("convocations")}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "convocations"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Users className="size-4" /> Convocations des Parents ({convocationsList.length})
        </button>
      </div>

      {/* TAB 1: INCIDENTS & SANCTIONS */}
      {activeTab === "incidents" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par élève ou motif..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-xs font-bold text-slate-500">Gravité :</label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-semibold"
              >
                <option value="ALL">Toutes les gravités</option>
                <option value="Mineur">Mineur</option>
                <option value="Majeur">Majeur</option>
                <option value="Critique">Critique</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                <Loader2 className="size-8 animate-spin text-rose-600" />
                <p className="text-sm font-medium">Chargement des signalements...</p>
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                <Shield className="size-12 text-slate-300" />
                <p className="text-sm font-semibold">Aucun incident disciplinaire enregistré.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-4">Date</th>
                      <th className="p-4">Élève & Classe</th>
                      <th className="p-4">Motif de l'incident</th>
                      <th className="p-4">Sanction Prononcée</th>
                      <th className="p-4">Gravité</th>
                      <th className="p-4">Parent Notifié</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredIncidents.map((inc) => (
                      <tr key={inc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-4 whitespace-nowrap">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {new Date(inc.date).toLocaleDateString("fr-FR")}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(inc.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </td>

                        <td className="p-4">
                          <p className="font-bold text-slate-900 dark:text-white">{inc.student?.nomEtudiant || "Élève"}</p>
                          <p className="text-xs font-semibold text-indigo-600">
                            {inc.student?.classe || "Classe N/A"} • Conduite : {inc.student?.behaviorScore ?? 20}/20
                          </p>
                        </td>

                        <td className="p-4 max-w-xs">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{inc.incidentType}</p>
                          <p className="text-xs text-slate-500 truncate">{inc.description || "Pas de description"}</p>
                        </td>

                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 font-bold text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950 px-2.5 py-1 rounded-xl">
                            {inc.sanctionType || "Rappel à l'ordre"}
                            {inc.sanctionDurationDays > 0 && ` (${inc.sanctionDurationDays}j)`}
                          </span>
                        </td>

                        <td className="p-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              inc.severity === "Critique"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50"
                                : inc.severity === "Majeur"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800"
                            }`}
                          >
                            {inc.severity}
                          </span>
                        </td>

                        <td className="p-4 whitespace-nowrap">
                          {inc.parentNotified ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded-lg">
                              <CheckCircle2 className="size-3.5" /> WhatsApp / SMS
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Non notifié</span>
                          )}
                        </td>

                        <td className="p-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteIncident(inc.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            title="Supprimer"
                          >
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

      {/* TAB 2: CONSEILS DE DISCIPLINE */}
      {activeTab === "councils" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Gavel className="size-5 text-rose-600" /> Sessions du Conseil de Discipline
            </h3>
            <button
              onClick={() => setIsCouncilModalOpen(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5"
            >
              <Plus className="size-3.5" /> Programmer un Conseil
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {councilsList.length === 0 ? (
              <div className="col-span-full p-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                <Gavel className="size-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold">Aucun conseil de discipline programmé ou tenu.</p>
              </div>
            ) : (
              councilsList.map((c) => (
                <div
                  key={c.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-700 dark:bg-rose-950">
                        {c.status}
                      </span>
                      <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-2">
                        {c.student?.nomEtudiant || "Élève"} ({c.student?.classe})
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="size-3.5" /> {new Date(c.sessionDate).toLocaleString("fr-FR")} • {c.location}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteCouncil(c.id)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs space-y-1.5">
                    <p className="font-bold text-slate-700 dark:text-slate-300">Faits reprochés :</p>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">{c.reproachedFacts}</p>
                    {c.studentDefense && (
                      <>
                        <p className="font-bold text-indigo-600 mt-2">Défense de l'élève :</p>
                        <p className="text-slate-600 dark:text-slate-400 italic">"{c.studentDefense}"</p>
                      </>
                    )}
                  </div>

                  <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900 flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[11px] font-bold text-rose-800 uppercase">Décision & Sanction :</p>
                      <p className="text-sm font-extrabold text-rose-900 dark:text-rose-200 mt-0.5">{c.decisionType}</p>
                      {c.exclusionDays > 0 && (
                        <p className="text-xs font-semibold text-rose-700">Durée : {c.exclusionDays} jours d'exclusion</p>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400">Président : {c.presidentName} • Membres : {c.membersPresent}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PARENT CONVOCATIONS */}
      {activeTab === "convocations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="size-5 text-indigo-600" /> Convocations & Entretiens Parents
            </h3>
            <button
              onClick={() => setIsConvocationModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5"
            >
              <Plus className="size-3.5" /> Nouvelle Convocation
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {convocationsList.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Users className="size-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold">Aucune convocation de parent en cours.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-4">Rendez-vous</th>
                      <th className="p-4">Élève & Classe</th>
                      <th className="p-4">Motif de convocation</th>
                      <th className="p-4">Lieu de l'entretien</th>
                      <th className="p-4">Canal</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {convocationsList.map((conv) => (
                      <tr key={conv.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                        <td className="p-4 whitespace-nowrap">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {new Date(conv.convocationDate).toLocaleDateString("fr-FR")}
                          </p>
                          <p className="text-xs text-indigo-600 font-semibold">
                            {new Date(conv.convocationDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </td>

                        <td className="p-4">
                          <p className="font-bold text-slate-900 dark:text-white">{conv.student?.nomEtudiant}</p>
                          <p className="text-xs text-slate-500">{conv.student?.classe} • {conv.student?.telephoneParent}</p>
                        </td>

                        <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                          {conv.reason}
                        </td>

                        <td className="p-4 text-xs text-slate-500">
                          {conv.location}
                        </td>

                        <td className="p-4 whitespace-nowrap font-bold text-indigo-600">
                          {conv.channel}
                        </td>

                        <td className="p-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            {conv.status}
                          </span>
                        </td>

                        <td className="p-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteConvocation(conv.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600"
                          >
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

      {/* MODAL: NOUVEL INCIDENT */}
      {isIncidentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                  <ShieldAlert className="size-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Signaler un Incident</h3>
                  <p className="text-xs text-slate-500">Appliquer une sanction et alerter les parents</p>
                </div>
              </div>
              <button onClick={() => setIsIncidentModalOpen(false)} className="p-2 text-slate-400">✕</button>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Élève concerné *</label>
                <select
                  required
                  value={newIncident.studentId}
                  onChange={(e) => setNewIncident({ ...newIncident, studentId: Number(e.target.value) })}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold outline-none"
                >
                  <option value={0}>-- Sélectionner l'élève --</option>
                  {studentsList.map((s) => (
                    <option key={s.studentId} value={s.studentId}>
                      {s.nomEtudiant} ({s.classe}) - {s.numAdmission}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Motif de l'incident *</label>
                <select
                  value={newIncident.incidentType}
                  onChange={(e) => setNewIncident({ ...newIncident, incidentType: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold outline-none"
                >
                  {INCIDENT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Sanction disciplinaire appliquée *</label>
                <select
                  value={newIncident.sanctionType}
                  onChange={(e) => setNewIncident({ ...newIncident, sanctionType: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-rose-600 outline-none"
                >
                  {SANCTION_TYPES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Gravité</label>
                  <select
                    value={newIncident.severity}
                    onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold"
                  >
                    <option value="Mineur">🟢 Mineur (-1 pt)</option>
                    <option value="Majeur">🟡 Majeur (-2 pts)</option>
                    <option value="Critique">🔴 Critique (-5 pts)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Jours d'exclusion</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={newIncident.sanctionDurationDays}
                    onChange={(e) => setNewIncident({ ...newIncident, sanctionDurationDays: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Détails et faits observés *</label>
                <textarea
                  required
                  rows={3}
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                  placeholder="Expliquer les circonstances de l'incident..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none"
                />
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold text-rose-900 dark:text-rose-200">Alerter les parents immédiatement</p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300">Notification WhatsApp & SMS instantanée</p>
                </div>
                <input
                  type="checkbox"
                  checked={newIncident.notifyParent}
                  onChange={(e) => setNewIncident({ ...newIncident, notifyParent: e.target.checked })}
                  className="size-5 accent-rose-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsIncidentModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Annuler</button>
                <button type="submit" disabled={isSubmittingIncident} className="px-6 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow">
                  {isSubmittingIncident && <Loader2 className="size-3.5 animate-spin mr-1" />}
                  Enregistrer l'incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROGRAMMER CONSEIL DE DISCIPLINE */}
      {isCouncilModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Gavel className="size-5 text-rose-600" /> Conseil de Discipline
              </h3>
              <button onClick={() => setIsCouncilModalOpen(false)} className="p-2 text-slate-400">✕</button>
            </div>

            <form onSubmit={handleCreateCouncil} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Élève traduit devant le conseil *</label>
                <select
                  required
                  value={newCouncil.studentId}
                  onChange={(e) => setNewCouncil({ ...newCouncil, studentId: Number(e.target.value) })}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold outline-none"
                >
                  <option value={0}>-- Sélectionner l'élève --</option>
                  {studentsList.map((s) => (
                    <option key={s.studentId} value={s.studentId}>
                      {s.nomEtudiant} ({s.classe})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Date & Heure de la session *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newCouncil.sessionDate}
                    onChange={(e) => setNewCouncil({ ...newCouncil, sessionDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Lieu</label>
                  <input
                    type="text"
                    value={newCouncil.location}
                    onChange={(e) => setNewCouncil({ ...newCouncil, location: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Faits reprochés et contexte *</label>
                <textarea
                  required
                  rows={2}
                  value={newCouncil.reproachedFacts}
                  onChange={(e) => setNewCouncil({ ...newCouncil, reproachedFacts: e.target.value })}
                  placeholder="Décrire avec précision les motifs de comparution..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Décision / Sanction *</label>
                  <select
                    value={newCouncil.decisionType}
                    onChange={(e) => setNewCouncil({ ...newCouncil, decisionType: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-rose-600"
                  >
                    <option value="Avertissement solennel">Avertissement solennel</option>
                    <option value="Blâme avec inscription au dossier">Blâme avec inscription au dossier</option>
                    <option value="Exclusion temporaire (1 à 8 jours)">Exclusion temporaire (1 à 8 jours)</option>
                    <option value="Exclusion définitive">🚨 Exclusion définitive de l'école</option>
                    <option value="Non-lieu / Relaxé">Non-lieu / Relaxé</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Jours d'exclusion</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={newCouncil.exclusionDays}
                    onChange={(e) => setNewCouncil({ ...newCouncil, exclusionDays: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Membres de la commission présents</label>
                <input
                  type="text"
                  value={newCouncil.membersPresent}
                  onChange={(e) => setNewCouncil({ ...newCouncil, membersPresent: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsCouncilModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Annuler</button>
                <button type="submit" disabled={isSubmittingCouncil} className="px-6 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow">
                  {isSubmittingCouncil && <Loader2 className="size-3.5 animate-spin mr-1" />}
                  Valider le Conseil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOUVELLE CONVOCATION PARENT */}
      {isConvocationModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="size-5 text-indigo-600" /> Convocation des Parents
              </h3>
              <button onClick={() => setIsConvocationModalOpen(false)} className="p-2 text-slate-400">✕</button>
            </div>

            <form onSubmit={handleCreateConvocation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Élève concerné *</label>
                <select
                  required
                  value={newConvocation.studentId}
                  onChange={(e) => setNewConvocation({ ...newConvocation, studentId: Number(e.target.value) })}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold outline-none"
                >
                  <option value={0}>-- Sélectionner l'élève --</option>
                  {studentsList.map((s) => (
                    <option key={s.studentId} value={s.studentId}>
                      {s.nomEtudiant} ({s.classe}) - {s.telephoneParent || "Pas de tél"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Motif de la convocation *</label>
                <input
                  type="text"
                  required
                  value={newConvocation.reason}
                  onChange={(e) => setNewConvocation({ ...newConvocation, reason: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Date & Heure de l'entretien *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newConvocation.convocationDate}
                    onChange={(e) => setNewConvocation({ ...newConvocation, convocationDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Canal d'envoi</label>
                  <select
                    value={newConvocation.channel}
                    onChange={(e) => setNewConvocation({ ...newConvocation, channel: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-indigo-600"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="SMS">SMS Direct</option>
                    <option value="Courrier officiel">Courrier officiel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Lieu du rendez-vous</label>
                <input
                  type="text"
                  value={newConvocation.location}
                  onChange={(e) => setNewConvocation({ ...newConvocation, location: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsConvocationModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Annuler</button>
                <button type="submit" disabled={isSubmittingConvocation} className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow">
                  {isSubmittingConvocation && <Loader2 className="size-3.5 animate-spin mr-1" />}
                  Envoyer la Convocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
