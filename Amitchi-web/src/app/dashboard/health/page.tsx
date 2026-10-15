"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  HeartPulse,
  Stethoscope,
  Activity,
  AlertTriangle,
  ShieldAlert,
  UserPlus,
  Search,
  Filter,
  Calendar,
  Clock,
  Thermometer,
  Pill,
  Syringe,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Plus,
  Trash2,
  Edit,
  Send,
  Sparkles,
  Loader2,
  RefreshCw,
  Droplet,
  Heart,
  Baby,
} from "lucide-react";
import {
  getHealthDashboardData,
  createInfirmaryVisitAction,
  deleteInfirmaryVisitAction,
  getStudentMedicalRecordAction,
  saveStudentMedicalRecordAction,
  getStudentMedicalDirectoryAction,
} from "@/domains/health/actions/health.actions";

export default function HealthInfirmaryPage() {
  const [activeTab, setActiveTab] = useState<"visits" | "students" | "stats">("visits");
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMedicalRecords: 0,
    visitsToday: 0,
    urgentCasesCount: 0,
    activeMedicalAlerts: 0,
  });
  const [recentVisits, setRecentVisits] = useState<any[]>([]);

  // Directory State
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBloodGroup, setSelectedBloodGroup] = useState("ALL");
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);

  // New Visit Modal State
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [isSubmittingVisit, setIsSubmittingVisit] = useState(false);
  const [newVisit, setNewVisit] = useState({
    studentId: 0,
    studentName: "",
    studentClass: "",
    symptoms: "",
    temperature: 37.0,
    bloodPressure: "12/8",
    heartRate: 75,
    diagnosis: "",
    careProvided: "",
    prescriptions: "",
    severity: "Bénin",
    outcome: "Retour en classe",
    notifyParent: true,
    notes: "",
  });

  // Edit Medical Record Modal State
  const [isEditRecordModalOpen, setIsEditRecordModalOpen] = useState(false);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [selectedStudentForRecord, setSelectedStudentForRecord] = useState<any>(null);
  const [editingRecord, setEditingRecord] = useState({
    studentId: 0,
    bloodGroup: "O+",
    allergies: "",
    chronicConditions: "",
    regularMedications: "",
    vaccinations: [] as Array<{ name: string; isDone: boolean; date: string }>,
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "Parent",
    doctorName: "",
    doctorPhone: "",
    heightCm: 0,
    weightKg: 0,
    notes: "",
  });

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      const res: any = await getHealthDashboardData();
      const payload = res?.data || res;
      if (payload?.success && payload.stats) {
        setStats(payload.stats);
        setRecentVisits(payload.recentVisits || []);
      }
    } catch (err: any) {
      toast.error("Erreur de chargement des données de l'infirmerie");
    } finally {
      setIsLoading(false);
    }
  };

  const loadDirectory = async () => {
    try {
      setIsLoadingDirectory(true);
      const res: any = await getStudentMedicalDirectoryAction({
        search: searchQuery,
        bloodGroup: selectedBloodGroup !== "ALL" ? selectedBloodGroup : undefined,
      });
      const payload = res?.data || res;
      if (payload?.success) {
        setStudentsList(payload.students || []);
      }
    } catch (err: any) {
      toast.error("Erreur de chargement des fiches médicales");
    } finally {
      setIsLoadingDirectory(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (activeTab === "students") {
      loadDirectory();
    }
  }, [activeTab, searchQuery, selectedBloodGroup]);

  // Quick symptom chips
  const SYMPTOM_CHIPS = [
    "Fièvre élevée (Paludisme)",
    "Céphalées / Maux de tête",
    "Maux de ventre / Gastralgie",
    "Traumatisme / Plaie légère",
    "Crise d'asthme / Dyspnée",
    "Vertiges / Malaise",
    "Allergie / Éruption cutanée",
    "Nausées / Vomissements",
  ];

  const handleOpenNewVisitModal = (student?: any) => {
    if (student) {
      setNewVisit({
        studentId: student.studentId || student.id,
        studentName: student.nomEtudiant || student.name || "",
        studentClass: student.classe || student.class || "",
        symptoms: "",
        temperature: 37.2,
        bloodPressure: "12/8",
        heartRate: 75,
        diagnosis: "",
        careProvided: "Repos à l'infirmerie",
        prescriptions: "Paracétamol 500mg si besoin",
        severity: "Bénin",
        outcome: "Retour en classe",
        notifyParent: true,
        notes: "",
      });
    } else {
      setNewVisit({
        studentId: 0,
        studentName: "",
        studentClass: "",
        symptoms: "",
        temperature: 37.0,
        bloodPressure: "12/8",
        heartRate: 75,
        diagnosis: "",
        careProvided: "",
        prescriptions: "",
        severity: "Bénin",
        outcome: "Retour en classe",
        notifyParent: true,
        notes: "",
      });
    }
    setIsVisitModalOpen(true);
  };

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVisit.studentId || !newVisit.symptoms) {
      toast.error("Veuillez sélectionner un élève et renseigner les symptômes.");
      return;
    }

    try {
      setIsSubmittingVisit(true);
      const res = await createInfirmaryVisitAction({
        studentId: newVisit.studentId,
        symptoms: newVisit.symptoms,
        temperature: Number(newVisit.temperature),
        bloodPressure: newVisit.bloodPressure,
        heartRate: Number(newVisit.heartRate),
        diagnosis: newVisit.diagnosis,
        careProvided: newVisit.careProvided,
        prescriptions: newVisit.prescriptions,
        severity: newVisit.severity,
        outcome: newVisit.outcome,
        notifyParent: newVisit.notifyParent,
        notes: newVisit.notes,
      });

      const payload = (res as any)?.data || res;
      if (payload?.success) {
        toast.success(
          payload.parentNotified
            ? "Passage enregistré ! Parent alerté par WhatsApp/SMS."
            : "Passage à l'infirmerie enregistré avec succès."
        );
        setIsVisitModalOpen(false);
        loadDashboard();
      }
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'enregistrement de la visite.");
    } finally {
      setIsSubmittingVisit(false);
    }
  };

  const handleDeleteVisit = async (id: number) => {
    if (!confirm("Voulez-vous supprimer cet enregistrement de visite ?")) return;
    try {
      const res: any = await deleteInfirmaryVisitAction(id);
      const payload = res?.data || res;
      if (payload?.success) {
        toast.success("Enregistrement supprimé.");
        loadDashboard();
      }
    } catch (err: any) {
      toast.error("Erreur lors de la suppression.");
    }
  };

  const handleOpenEditRecordModal = async (studentId: number) => {
    try {
      toast.loading("Chargement de la fiche médicale...");
      const res: any = await getStudentMedicalRecordAction(studentId);
      toast.dismiss();
      const payload = res?.data || res;
      if (payload?.success && payload.student) {
        setSelectedStudentForRecord(payload.student);
        const r = payload.medicalRecord || {};
        setEditingRecord({
          studentId: payload.student.id,
          bloodGroup: r.bloodGroup || "O+",
          allergies: r.allergies || "",
          chronicConditions: r.chronicConditions || "",
          regularMedications: r.regularMedications || "",
          vaccinations: Array.isArray(r.vaccinations)
            ? r.vaccinations
            : [
                { name: "BCG (Tuberculose)", isDone: true, date: "" },
                { name: "Polio (VPO)", isDone: true, date: "" },
                { name: "Pentavalent (DTC-HepB-Hib)", isDone: true, date: "" },
                { name: "Rougeole & Rubéole (RR)", isDone: true, date: "" },
                { name: "Fièvre Jaune (VAA)", isDone: true, date: "" },
                { name: "Méningite A (MenAfriVac)", isDone: false, date: "" },
                { name: "Tétanos", isDone: true, date: "" },
              ],
          emergencyContactName: r.emergencyContactName || (payload.student as any).nomPere || (payload.student as any).nomParent || "",
          emergencyContactPhone: r.emergencyContactPhone || (payload.student as any).mobile || (payload.student as any).whatsapp || "",
          emergencyContactRelation: r.emergencyContactRelation || "Parent",
          doctorName: r.doctorName || "",
          doctorPhone: r.doctorPhone || "",
          heightCm: r.heightCm || 0,
          weightKg: r.weightKg || 0,
          notes: r.notes || "",
        });
        setIsEditRecordModalOpen(true);
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error("Impossible de charger la fiche médicale.");
    }
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingRecord(true);
      const res = await saveStudentMedicalRecordAction({
        studentId: editingRecord.studentId,
        bloodGroup: editingRecord.bloodGroup,
        allergies: editingRecord.allergies,
        chronicConditions: editingRecord.chronicConditions,
        regularMedications: editingRecord.regularMedications,
        vaccinations: editingRecord.vaccinations,
        emergencyContactName: editingRecord.emergencyContactName,
        emergencyContactPhone: editingRecord.emergencyContactPhone,
        emergencyContactRelation: editingRecord.emergencyContactRelation,
        doctorName: editingRecord.doctorName,
        doctorPhone: editingRecord.doctorPhone,
        heightCm: Number(editingRecord.heightCm) || null,
        weightKg: Number(editingRecord.weightKg) || null,
        notes: editingRecord.notes,
      });

      if (res?.success) {
        toast.success("Fiche médicale mise à jour avec succès !");
        setIsEditRecordModalOpen(false);
        loadDashboard();
        if (activeTab === "students") loadDirectory();
      }
    } catch (err: any) {
      toast.error("Erreur lors de la mise à jour de la fiche médicale.");
    } finally {
      setIsSavingRecord(false);
    }
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-rose-900 via-rose-800 to-indigo-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-10 -translate-y-10">
          <HeartPulse className="size-80" />
        </div>
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-200 border border-rose-400/30 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
            <Stethoscope className="size-3.5" /> Santé Scolaire & Infirmerie Pro
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Infirmerie & Dossiers Médicaux 🏥
          </h1>
          <p className="text-rose-100 text-sm sm:text-base max-w-2xl font-medium">
            Suivi en temps réel des passages à l'infirmerie, gestion des carnets de santé, allergies, drépanocytose et alertes d'urgence immédiates aux parents.
          </p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => handleOpenNewVisitModal()}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-rose-900 hover:bg-rose-50 font-bold text-sm shadow-lg transition-all transform active:scale-95"
          >
            <Plus className="size-4" /> Nouveau passage
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-2xl">
            <Activity className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Visites Aujourd'hui</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.visitsToday}</h3>
            <p className="text-xs text-slate-400">Passages enregistrés</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl">
            <AlertTriangle className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cas Urgents / Critiques</p>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{stats.urgentCasesCount}</h3>
            <p className="text-xs text-slate-400">Évacuations & alertes</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <ShieldAlert className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Alertes Pathologies</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.activeMedicalAlerts}</h3>
            <p className="text-xs text-slate-400">Allergies & Drépanocytose</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <HeartPulse className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dossiers Médicaux</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.totalMedicalRecords}</h3>
            <p className="text-xs text-slate-400">Fiches enregistrées</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab("visits")}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "visits"
              ? "border-rose-600 text-rose-600 dark:text-rose-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Activity className="size-4" /> Registre des Passages ({recentVisits.length})
        </button>

        <button
          onClick={() => setActiveTab("students")}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "students"
              ? "border-rose-600 text-rose-600 dark:text-rose-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <User className="size-4" /> Fiches Médicales des Élèves
        </button>
      </div>

      {/* TAB 1: VISITS LOG */}
      {activeTab === "visits" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="size-5 text-rose-600" /> Dernières Visites Médicales
            </h3>
            <button
              onClick={loadDashboard}
              className="text-xs font-semibold text-slate-500 hover:text-rose-600 flex items-center gap-1.5"
            >
              <RefreshCw className="size-3.5" /> Actualiser
            </button>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
              <Loader2 className="size-8 animate-spin text-rose-600" />
              <p className="text-sm font-medium">Chargement du journal médical...</p>
            </div>
          ) : recentVisits.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
              <HeartPulse className="size-12 text-slate-300" />
              <p className="text-sm font-semibold">Aucun passage à l'infirmerie enregistré récemment.</p>
              <button
                onClick={() => handleOpenNewVisitModal()}
                className="mt-2 text-xs font-bold text-rose-600 bg-rose-50 px-4 py-2 rounded-xl"
              >
                + Enregistrer une première visite
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Date / Heure</th>
                    <th className="p-4">Élève & Classe</th>
                    <th className="p-4">Symptômes & T°</th>
                    <th className="p-4">Soins / Médicaments</th>
                    <th className="p-4">Gravité</th>
                    <th className="p-4">Décision</th>
                    <th className="p-4">Parent Notifié</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {recentVisits.map((v) => {
                    const temp = v.temperature ? Number(v.temperature) : null;
                    const isFever = temp && temp >= 38.5;
                    const isUrgent = v.severity === "Urgent" || v.severity === "Urgent / Critique";

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-4 whitespace-nowrap">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {new Date(v.visitDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(v.visitDate).toLocaleDateString("fr-FR")}
                          </p>
                        </td>

                        <td className="p-4">
                          <p className="font-bold text-slate-900 dark:text-white">{v.studentName || "Élève inconnu"}</p>
                          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                            {v.studentClass || "Classe N/A"} • N° {v.admissionNo || "—"}
                          </p>
                        </td>

                        <td className="p-4">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{v.symptoms}</p>
                          {temp && (
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                                isFever
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-400"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400"
                              }`}
                            >
                              <Thermometer className="size-3" /> {temp.toFixed(1)}°C {isFever && "⚠️ Fièvre"}
                            </span>
                          )}
                        </td>

                        <td className="p-4 max-w-xs">
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{v.careProvided || "Soins de base"}</p>
                          {v.prescriptions && (
                            <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-0.5">
                              <Pill className="size-3" /> {v.prescriptions}
                            </p>
                          )}
                        </td>

                        <td className="p-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              isUrgent
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                                : v.severity === "Modéré"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                            }`}
                          >
                            {v.severity || "Bénin"}
                          </span>
                        </td>

                        <td className="p-4 whitespace-nowrap font-medium text-xs">
                          {v.outcome || "Retour en classe"}
                        </td>

                        <td className="p-4 whitespace-nowrap">
                          {v.parentNotified ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded-lg">
                              <CheckCircle2 className="size-3.5" /> Oui (WhatsApp/SMS)
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Non notifié</span>
                          )}
                        </td>

                        <td className="p-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteVisit(v.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="size-4" />
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

      {/* TAB 2: STUDENTS DIRECTORY & MEDICAL RECORDS */}
      {activeTab === "students" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par élève ou matricule..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-xs font-bold text-slate-500">Groupe Sanguin :</label>
              <select
                value={selectedBloodGroup}
                onChange={(e) => setSelectedBloodGroup(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-semibold text-slate-700 dark:text-slate-300"
              >
                <option value="ALL">Tous les groupes</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingDirectory ? (
              <div className="col-span-full p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                <Loader2 className="size-8 animate-spin text-rose-600" />
                <p className="text-sm font-medium">Chargement des fiches...</p>
              </div>
            ) : studentsList.length === 0 ? (
              <div className="col-span-full p-12 text-center text-slate-500">
                <p className="text-sm font-semibold">Aucun élève trouvé.</p>
              </div>
            ) : (
              studentsList.map((s) => (
                <div
                  key={s.studentId}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-rose-200 dark:hover:border-rose-900 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                          {s.nomEtudiant}
                        </h4>
                        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                          {s.classe} • {s.numAdmission}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 ${
                          s.bloodGroup
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                        }`}
                      >
                        <Droplet className="size-3 fill-rose-500 text-rose-500" />
                        {s.bloodGroup || "N/A"}
                      </span>
                    </div>

                    {/* Allergies / Chronic condition warnings */}
                    {s.allergies && (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 text-xs">
                        <p className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="size-3.5 text-amber-600" /> Allergies :
                        </p>
                        <p className="text-amber-900 dark:text-amber-200 text-[11px] mt-0.5 font-medium">{s.allergies}</p>
                      </div>
                    )}

                    {s.chronicConditions && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 text-xs">
                        <p className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                          <Heart className="size-3.5 text-rose-600" /> Pathologie :
                        </p>
                        <p className="text-rose-900 dark:text-rose-200 text-[11px] mt-0.5 font-medium">{s.chronicConditions}</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 mt-4">
                    <button
                      onClick={() => handleOpenNewVisitModal(s)}
                      className="flex-1 px-3 py-2 text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="size-3.5" /> Passage infirmerie
                    </button>

                    <button
                      onClick={() => handleOpenEditRecordModal(s.studentId)}
                      className="px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Edit className="size-3.5" /> Fiche
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: NOUVEAU PASSAGE INFIRMERIE */}
      {isVisitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-50 dark:bg-rose-950 text-rose-600 rounded-2xl">
                  <Stethoscope className="size-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Nouveau Passage Infirmerie</h3>
                  <p className="text-xs text-slate-500">Enregistrer les soins et alerter les parents</p>
                </div>
              </div>
              <button
                onClick={() => setIsVisitModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVisit} className="space-y-4">
              {/* Student Selector / Display */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Élève concerné *
                </label>
                {newVisit.studentName ? (
                  <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{newVisit.studentName}</p>
                      <p className="text-xs font-semibold text-indigo-600">{newVisit.studentClass}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewVisit({ ...newVisit, studentId: 0, studentName: "", studentClass: "" })}
                      className="text-xs font-bold text-rose-600 hover:underline"
                    >
                      Changer
                    </button>
                  </div>
                ) : (
                  <select
                    required
                    onChange={(e) => {
                      const selected = studentsList.find((s) => s.studentId === Number(e.target.value));
                      if (selected) {
                        setNewVisit({
                          ...newVisit,
                          studentId: selected.studentId,
                          studentName: selected.nomEtudiant,
                          studentClass: selected.classe,
                        });
                      }
                    }}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold outline-none"
                  >
                    <option value="">-- Sélectionner l'élève dans la liste --</option>
                    {studentsList.map((s) => (
                      <option key={s.studentId} value={s.studentId}>
                        {s.nomEtudiant} ({s.classe}) - {s.numAdmission}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Symptom selection & chips */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Motif / Symptômes principaux *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {SYMPTOM_CHIPS.map((chip) => (
                    <button
                      type="button"
                      key={chip}
                      onClick={() => setNewVisit({ ...newVisit, symptoms: newVisit.symptoms ? `${newVisit.symptoms}, ${chip}` : chip })}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 font-medium transition-all"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
                <textarea
                  required
                  rows={2}
                  placeholder="Décrire les symptômes observés..."
                  value={newVisit.symptoms}
                  onChange={(e) => setNewVisit({ ...newVisit, symptoms: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none"
                />
              </div>

              {/* Vital Signs Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Température (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="34"
                    max="43"
                    value={newVisit.temperature}
                    onChange={(e) => setNewVisit({ ...newVisit, temperature: parseFloat(e.target.value) || 37.0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Tension Artérielle
                  </label>
                  <input
                    type="text"
                    placeholder="12/8"
                    value={newVisit.bloodPressure}
                    onChange={(e) => setNewVisit({ ...newVisit, bloodPressure: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Pouls (bpm)
                  </label>
                  <input
                    type="number"
                    value={newVisit.heartRate}
                    onChange={(e) => setNewVisit({ ...newVisit, heartRate: parseInt(e.target.value) || 75 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold"
                  />
                </div>
              </div>

              {/* Care & Prescriptions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Soins prodigués
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Pansement, repos 30min"
                    value={newVisit.careProvided}
                    onChange={(e) => setNewVisit({ ...newVisit, careProvided: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Médicaments administrés
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Paracétamol 500mg"
                    value={newVisit.prescriptions}
                    onChange={(e) => setNewVisit({ ...newVisit, prescriptions: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-indigo-600"
                  />
                </div>
              </div>

              {/* Severity & Outcome */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Gravité</label>
                  <select
                    value={newVisit.severity}
                    onChange={(e) => setNewVisit({ ...newVisit, severity: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold"
                  >
                    <option value="Bénin">🟢 Bénin</option>
                    <option value="Modéré">🟡 Modéré</option>
                    <option value="Urgent">🔴 Urgent / Critique</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Décision</label>
                  <select
                    value={newVisit.outcome}
                    onChange={(e) => setNewVisit({ ...newVisit, outcome: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
                  >
                    <option value="Retour en classe">Retour en classe</option>
                    <option value="Repos infirmerie">Repos à l'infirmerie</option>
                    <option value="Retour à domicile">Retour à domicile (Appeler parent)</option>
                    <option value="Évacuation hôpital / Urgences">🚨 Évacuation hôpital / Urgences</option>
                  </select>
                </div>
              </div>

              {/* Parent Emergency Alert Switch */}
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-500 text-white rounded-xl">
                    <Send className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-rose-900 dark:text-rose-200">
                      Alerter les parents immédiatement
                    </p>
                    <p className="text-[11px] text-rose-700 dark:text-rose-300">
                      Envoi automatique par WhatsApp, SMS et notification mobile
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={newVisit.notifyParent}
                  onChange={(e) => setNewVisit({ ...newVisit, notifyParent: e.target.checked })}
                  className="size-5 accent-rose-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsVisitModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVisit}
                  className="px-6 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg flex items-center gap-2"
                >
                  {isSubmittingVisit && <Loader2 className="size-3.5 animate-spin" />}
                  Enregistrer & Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITER LA FICHE MÉDICALE */}
      {isEditRecordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-2xl">
                  <FileText className="size-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                    Fiche Médicale de {selectedStudentForRecord?.nomEtudiant}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedStudentForRecord?.classe} • N° {selectedStudentForRecord?.numAdmission}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditRecordModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-4">
              {/* Blood group & Anthropometrics */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Groupe Sanguin
                  </label>
                  <select
                    value={editingRecord.bloodGroup}
                    onChange={(e) => setEditingRecord({ ...editingRecord, bloodGroup: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-black text-rose-600"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Taille (cm)</label>
                  <input
                    type="number"
                    value={editingRecord.heightCm}
                    onChange={(e) => setEditingRecord({ ...editingRecord, heightCm: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Poids (kg)</label>
                  <input
                    type="number"
                    value={editingRecord.weightKg}
                    onChange={(e) => setEditingRecord({ ...editingRecord, weightKg: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold"
                  />
                </div>
              </div>

              {/* Allergies & Chronic Conditions */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Allergies connues (Alimentaires, Médicaments...)
                </label>
                <input
                  type="text"
                  placeholder="ex: Arachides, Pénicilline, Poussière..."
                  value={editingRecord.allergies}
                  onChange={(e) => setEditingRecord({ ...editingRecord, allergies: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Pathologies chroniques (Drépanocytose, Asthme, Diabète...)
                </label>
                <input
                  type="text"
                  placeholder="ex: Drépanocytose SS, Asthme d'effort..."
                  value={editingRecord.chronicConditions}
                  onChange={(e) => setEditingRecord({ ...editingRecord, chronicConditions: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-rose-600"
                />
              </div>

              {/* Vaccinations Checklist */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <Syringe className="size-3.5 text-indigo-500" /> Carnet de Vaccination Scolaire
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto">
                  {editingRecord.vaccinations.map((vac, idx) => (
                    <label
                      key={vac.name}
                      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={vac.isDone}
                        onChange={(e) => {
                          const updated = [...editingRecord.vaccinations];
                          updated[idx] = { ...updated[idx], isDone: e.target.checked };
                          setEditingRecord({ ...editingRecord, vaccinations: updated });
                        }}
                        className="size-4 accent-emerald-600 rounded"
                      />
                      <span className={vac.isDone ? "text-slate-800 dark:text-white font-semibold" : "text-slate-400"}>
                        {vac.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Emergency Contacts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Contact d'urgence (Nom)
                  </label>
                  <input
                    type="text"
                    value={editingRecord.emergencyContactName}
                    onChange={(e) => setEditingRecord({ ...editingRecord, emergencyContactName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Téléphone d'urgence
                  </label>
                  <input
                    type="text"
                    value={editingRecord.emergencyContactPhone}
                    onChange={(e) => setEditingRecord({ ...editingRecord, emergencyContactPhone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-indigo-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditRecordModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingRecord}
                  className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg flex items-center gap-2"
                >
                  {isSavingRecord && <Loader2 className="size-3.5 animate-spin" />}
                  Sauvegarder la fiche médicale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
