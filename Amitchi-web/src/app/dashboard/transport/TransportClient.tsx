"use client";

import React, { useState } from "react";
import {
  Bus,
  Users,
  MapPin,
  Clock,
  Phone,
  ShieldCheck,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Printer,
  Trash2,
  Edit3,
  Calendar,
  Navigation,
  Sparkles,
  ArrowRight,
  TrendingUp,
  UserCheck,
  X,
  MessageSquare,
  Compass,
} from "lucide-react";
import { toast } from "sonner";
import {
  saveTransportRoute,
  deleteTransportRoute,
  addSubscription,
  removeSubscription,
  startLiveTripAction,
  updateLiveTripStatusAction,
  recordStudentBoardingAction,
  searchStudentsAction,
} from "@/domains/transport/actions/transport.actions";

interface TransportClientProps {
  initialStats: {
    totalRoutes: number;
    activeSubscriptions: number;
    tripsToday: number;
    boardingsToday: number;
  };
  initialRoutes: any[];
  initialSubscriptions: any[];
  initialTrips: any[];
  initialLogs: any[];
}

export default function TransportClient({
  initialStats,
  initialRoutes,
  initialSubscriptions,
  initialTrips,
  initialLogs,
}: TransportClientProps) {
  const [activeTab, setActiveTab] = useState<"passengers" | "routes" | "live" | "logs">("passengers");

  // State
  const [stats, setStats] = useState(initialStats);
  const [routes, setRoutes] = useState(initialRoutes);
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [trips, setTrips] = useState(initialTrips);
  const [logs, setLogs] = useState(initialLogs);

  // Filters & Search
  const [searchPassenger, setSearchPassenger] = useState("");
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>("ALL");

  // Modals
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isStartTripModalOpen, setIsStartTripModalOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState<any>(null);

  // Form State: Route
  const [routeForm, setRouteForm] = useState<{
    id?: number;
    routeName: string;
    vehicleNumber: string;
    driverName: string;
    driverPhone: string;
    capacity: number;
    monthlyFee: number;
    stops: { id: string; stopName: string; timeMorning: string; timeEvening: string; order: number }[];
    status: string;
    notes: string;
  }>({
    routeName: "",
    vehicleNumber: "",
    driverName: "",
    driverPhone: "",
    capacity: 30,
    monthlyFee: 15000,
    stops: [
      { id: "1", stopName: "Terminus / Départ", timeMorning: "06:30", timeEvening: "16:45", order: 1 },
      { id: "2", stopName: "Carrefour Central", timeMorning: "06:45", timeEvening: "16:30", order: 2 },
      { id: "3", stopName: "École (Arrivée)", timeMorning: "07:15", timeEvening: "16:00", order: 3 },
    ],
    status: "Actif",
    notes: "",
  });

  // Form State: Subscription
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentSearchResults, setStudentSearchResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [subForm, setSubForm] = useState({
    routeId: routes[0]?.id || 0,
    pickupStop: "",
    dropoffStop: "École",
    tripType: "Aller-Retour",
    parentPhone: "",
    parentWhatsapp: "",
  });

  // Form State: Start Live Trip
  const [tripForm, setTripForm] = useState({
    routeId: routes[0]?.id || 0,
    tripType: "Circuit Matin",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Search Students Helper ───────────────────────────────────────────────
  const handleSearchStudents = async (q: string) => {
    setStudentSearchQuery(q);
    if (!q || q.trim().length < 2) {
      setStudentSearchResults([]);
      return;
    }
    const res = await searchStudentsAction(q);
    const data = (res as any)?.data?.data || (res as any)?.data || [];
    setStudentSearchResults(data);
  };

  // ─── Save Route ───────────────────────────────────────────────────────────
  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeForm.routeName || !routeForm.vehicleNumber || !routeForm.driverName) {
      toast.error("Veuillez renseigner les champs obligatoires de la ligne.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res: any = await saveTransportRoute(routeForm, routeForm.id);
      const payload = res?.data || res;
      if (payload?.success) {
        toast.success(payload.message || "Ligne enregistrée avec succès !");
        setIsRouteModalOpen(false);
        // Refresh local routes
        window.location.reload();
      } else {
        toast.error(res?.error || payload?.error || "Erreur lors de l'enregistrement.");
      }
    } catch (err) {
      toast.error("Erreur serveur");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoute = async (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer cette ligne de transport ?")) return;
    try {
      const res: any = await deleteTransportRoute(id);
      const payload = res?.data || res;
      if (payload?.success) {
        toast.success("Ligne supprimée.");
        setRoutes(routes.filter((r) => r.id !== id));
      }
    } catch (err) {
      toast.error("Erreur lors de la suppression.");
    }
  };

  // ─── Save Subscription ───────────────────────────────────────────────────
  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !subForm.routeId) {
      toast.error("Veuillez sélectionner un élève et une ligne de transport.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res: any = await addSubscription({
        studentId: selectedStudent.id,
        routeId: Number(subForm.routeId),
        pickupStop: subForm.pickupStop,
        dropoffStop: subForm.dropoffStop,
        tripType: subForm.tripType,
        parentPhone: subForm.parentPhone || selectedStudent.mobile,
        parentWhatsapp: subForm.parentWhatsapp || selectedStudent.whatsapp,
        startDate: new Date(),
      });

      const payload = res?.data || res;
      if (payload?.success) {
        toast.success(payload.message || "Élève inscrit au transport scolaire !");
        setIsSubModalOpen(false);
        setSelectedStudent(null);
        setStudentSearchQuery("");
        window.location.reload();
      } else {
        toast.error(res?.error || payload?.error || "Erreur lors de l'inscription.");
      }
    } catch (err) {
      toast.error("Erreur lors de l'inscription.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSubscription = async (id: number) => {
    if (!confirm("Voulez-vous retirer cet élève du circuit de transport ?")) return;
    try {
      const res: any = await removeSubscription(id);
      const payload = res?.data || res;
      if (payload?.success) {
        toast.success("Abonnement supprimé.");
        setSubscriptions(subscriptions.filter((s) => s.id !== id));
      }
    } catch (err) {
      toast.error("Erreur lors du retrait.");
    }
  };

  // ─── Live Trip Actions ────────────────────────────────────────────────────
  const handleStartTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res: any = await startLiveTripAction({
        routeId: Number(tripForm.routeId),
        tripType: tripForm.tripType,
      });

      const payload = res?.data || res;
      if (payload?.success) {
        toast.success(payload.message || "Trajet démarré !");
        setIsStartTripModalOpen(false);
        window.location.reload();
      } else {
        toast.error(res?.error || payload?.error);
      }
    } catch (err) {
      toast.error("Erreur lors du démarrage du trajet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTripStatus = async (tripId: number, status: "En cours" | "Terminé" | "Annulé", currentStop?: string) => {
    try {
      const res: any = await updateLiveTripStatusAction({ tripId, status, currentStop });
      const payload = res?.data || res;
      if (payload?.success) {
        toast.success(payload.message || `Trajet ${status}.`);
        window.location.reload();
      }
    } catch (err) {
      toast.error("Erreur mise à jour trajet.");
    }
  };

  // ─── Student Boarding Pointage ────────────────────────────────────────────
  const handleRecordBoarding = async (
    studentId: number,
    tripId: number,
    eventType: "Montée Matin" | "Descente Matin (École)" | "Montée Soir (École)" | "Descente Soir (Maison)",
    stopName: string
  ) => {
    try {
      toast.loading("Pointage en cours et envoi de l'alerte WhatsApp/SMS...");
      const res: any = await recordStudentBoardingAction({
        studentId,
        tripId,
        eventType,
        stopName,
        notifyParent: true,
      });
      toast.dismiss();
      const payload = res?.data || res;
      if (payload?.success) {
        toast.success(
          payload.parentNotified
            ? `${eventType} validée ! Parent notifié instantanément.`
            : `${eventType} validée avec succès.`
        );
        window.location.reload();
      } else {
        toast.error(res?.error || payload?.error || "Erreur de pointage.");
      }
    } catch (err) {
      toast.dismiss();
      toast.error("Erreur lors de l'enregistrement.");
    }
  };

  // Filtered Subscriptions
  const filteredSubscriptions = subscriptions.filter((s) => {
    const matchQuery =
      !searchPassenger ||
      s.student?.nomEtudiant?.toLowerCase().includes(searchPassenger.toLowerCase()) ||
      s.student?.numAdmission?.toLowerCase().includes(searchPassenger.toLowerCase()) ||
      s.pickupStop?.toLowerCase().includes(searchPassenger.toLowerCase());
    const matchRoute = selectedRouteFilter === "ALL" || String(s.routeId) === String(selectedRouteFilter);
    return matchQuery && matchRoute;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ─── Header & Top Stats ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold backdrop-blur-md border border-blue-400/20">
            <Bus className="w-3.5 h-3.5" />
            Module Flotte & Sécurité des Élèves
          </div>
          <h1 className="text-3xl font-black tracking-tight">🚌 Transport Scolaire & Pointage</h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Gestion complète des lignes de bus, arrêts programmés, pointage de montée/descente et alertes WhatsApp automatiques aux parents.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-3">
          <button
            onClick={() => {
              setRouteForm({
                routeName: "",
                vehicleNumber: "",
                driverName: "",
                driverPhone: "",
                capacity: 30,
                monthlyFee: 15000,
                stops: [
                  { id: "1", stopName: "Terminus / Départ", timeMorning: "06:30", timeEvening: "16:45", order: 1 },
                  { id: "2", stopName: "Carrefour Central", timeMorning: "06:45", timeEvening: "16:30", order: 2 },
                  { id: "3", stopName: "École (Arrivée)", timeMorning: "07:15", timeEvening: "16:00", order: 3 },
                ],
                status: "Actif",
                notes: "",
              });
              setIsRouteModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-md border border-white/10 transition"
          >
            <Plus className="w-4 h-4" />
            Nouvelle Ligne
          </button>
          <button
            onClick={() => setIsSubModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-500/30 transition transform active:scale-95"
          >
            <UserCheck className="w-4 h-4" />
            Inscrire un Élève
          </button>
        </div>
      </div>

      {/* ─── KPI Widgets ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Bus className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{stats.totalRoutes}</div>
            <div className="text-xs text-slate-500 font-medium">Lignes de Bus</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{stats.activeSubscriptions}</div>
            <div className="text-xs text-slate-500 font-medium">Élèves Abonnés</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Navigation className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{stats.tripsToday}</div>
            <div className="text-xs text-slate-500 font-medium">Trajets Aujourd'hui</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{stats.boardingsToday}</div>
            <div className="text-xs text-slate-500 font-medium">Pointages Validés</div>
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("passengers")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition ${
            activeTab === "passengers"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Users className="w-4 h-4" />
          👥 Abonnés & Cartes ({subscriptions.length})
        </button>

        <button
          onClick={() => setActiveTab("routes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition ${
            activeTab === "routes"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Compass className="w-4 h-4" />
          🚌 Lignes & Arrêts ({routes.length})
        </button>

        <button
          onClick={() => setActiveTab("live")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition ${
            activeTab === "live"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Navigation className="w-4 h-4" />
          🚦 Suivi en Direct & Pointage ({trips.filter((t) => t.status === "En cours").length} actifs)
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition ${
            activeTab === "logs"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Clock className="w-4 h-4" />
          📜 Journal de Sécurité
        </button>
      </div>

      {/* ─── TAB 1: PASSENGERS & BOARDING PASSES ──────────────────────────── */}
      {activeTab === "passengers" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-3 justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par élève, matricule, arrêt..."
                value={searchPassenger}
                onChange={(e) => setSearchPassenger(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={selectedRouteFilter}
              onChange={(e) => setSelectedRouteFilter(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Toutes les Lignes</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.routeName} ({r.vehicleNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Subscriptions Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Élève / Matricule</th>
                    <th className="py-3.5 px-4">Classe</th>
                    <th className="py-3.5 px-4">Ligne & Véhicule</th>
                    <th className="py-3.5 px-4">Arrêt Prévu</th>
                    <th className="py-3.5 px-4">Formule</th>
                    <th className="py-3.5 px-4">Contact Parent</th>
                    <th className="py-3.5 px-4 text-center">Carte & QR</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredSubscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Aucun élève inscrit au transport ne correspond aux filtres.
                      </td>
                    </tr>
                  ) : (
                    filteredSubscriptions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div>{sub.student?.nomEtudiant}</div>
                          <div className="text-xs font-mono text-slate-400">{sub.student?.numAdmission}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold text-xs">
                            {sub.student?.classe || "N/A"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-blue-600">{sub.route?.routeName}</div>
                          <div className="text-xs text-slate-400 font-mono">{sub.route?.vehicleNumber}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                            <MapPin className="w-3.5 h-3.5 text-rose-500" />
                            {sub.pickupStop || sub.pickupPoint || "Arrêt Principal"}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {sub.tripType || "Aller-Retour"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono">
                          {sub.parentPhone || sub.student?.mobile || "Non renseigné"}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setSelectedPass(sub)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs transition"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            Pass QR
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleRemoveSubscription(sub.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Retirer du transport"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: ROUTES & STOPS ───────────────────────────────────────── */}
      {activeTab === "routes" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {routes.map((route) => {
            const stops = (route.stops as any[]) || [];
            const isFull = (route.subscribersCount || 0) >= (route.capacity || 30);
            return (
              <div
                key={route.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {route.status}
                      </div>
                      <h3 className="text-lg font-black text-slate-900 mt-1">{route.routeName}</h3>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-base font-black text-slate-900">{route.monthlyFee} CFA</span>
                      <span className="text-[10px] text-slate-400 block">/ mois</span>
                    </div>
                  </div>

                  {/* Vehicle & Driver Details */}
                  <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-700 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Bus className="w-3.5 h-3.5 text-blue-600" />
                        Véhicule :
                      </span>
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                        {route.vehicleNumber}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span>Chauffeur :</span>
                      <span className="font-bold">{route.driverName}</span>
                    </div>
                    {route.driverPhone && (
                      <div className="flex items-center justify-between text-slate-700">
                        <span>Téléphone :</span>
                        <a
                          href={`tel:${route.driverPhone}`}
                          className="font-mono text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          {route.driverPhone}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Capacity Bar */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-500">Taux d'occupation :</span>
                      <span className={isFull ? "text-rose-600 font-bold" : "text-slate-700"}>
                        {route.subscribersCount || 0} / {route.capacity || 30} places
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isFull ? "bg-rose-500" : "bg-blue-600"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(((route.subscribersCount || 0) / (route.capacity || 30)) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Stops Timeline */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Itinéraire ({stops.length} arrêts)
                    </span>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {stops.map((st: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50/70 border border-slate-100"
                        >
                          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            {st.stopName}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            🌅 {st.timeMorning} | 🌇 {st.timeEvening}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setRouteForm({
                        id: route.id,
                        routeName: route.routeName,
                        vehicleNumber: route.vehicleNumber,
                        driverName: route.driverName,
                        driverPhone: route.driverPhone || "",
                        capacity: route.capacity || 30,
                        monthlyFee: route.monthlyFee || 15000,
                        stops: route.stops || [],
                        status: route.status || "Actif",
                        notes: route.notes || "",
                      });
                      setIsRouteModalOpen(true);
                    }}
                    className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition text-center"
                  >
                    Modifier la Ligne
                  </button>
                  <button
                    onClick={() => handleDeleteRoute(route.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── TAB 3: LIVE TRIPS & POINTAGE ─────────────────────────────────── */}
      {activeTab === "live" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <h3 className="font-black text-slate-900 text-base">Trajets du Jour & Pointage en Temps Réel</h3>
              <p className="text-slate-400 text-xs">
                Sélectionnez un circuit actif pour pointer la montée et descente des passagers arrêt par arrêt.
              </p>
            </div>
            <button
              onClick={() => setIsStartTripModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
            >
              <Navigation className="w-4 h-4" />
              Démarrer un Circuit
            </button>
          </div>

          {trips.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <Bus className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700">Aucun trajet en cours aujourd'hui</h4>
              <p className="text-slate-400 text-xs">
                Cliquez sur "Démarrer un Circuit" ci-dessus pour lancer la tournée du matin ou du soir.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {trips.map((trip) => {
                const route = trip.route;
                const stops = (route?.stops as any[]) || [];
                const routeSubs = subscriptions.filter((s) => s.routeId === trip.routeId);

                return (
                  <div
                    key={trip.id}
                    className="bg-white rounded-3xl border border-slate-100 shadow-lg p-6 space-y-6"
                  >
                    {/* Trip Status Bar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                          <Bus className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-black text-slate-900">{route?.routeName}</h4>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                trip.status === "En cours"
                                  ? "bg-emerald-100 text-emerald-800 animate-pulse"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {trip.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">
                            {trip.tripType} | Véhicule : {trip.vehicleNumber || route?.vehicleNumber} | Départ :{" "}
                            {trip.startTime || "N/A"}
                          </div>
                        </div>
                      </div>

                      {trip.status === "En cours" && (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleUpdateTripStatus(trip.id, "Terminé")}
                            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
                          >
                            Clôturer le Trajet (Terminé)
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Pointage Grid for this Line */}
                    <div className="space-y-3">
                      <h5 className="font-black text-sm text-slate-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Pointage des Élèves Abonnés à ce Circuit ({routeSubs.length} élèves)
                      </h5>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {routeSubs.map((sub) => {
                          const student = sub.student;
                          const studentLogs = logs.filter(
                            (l) => l.studentId === student?.id && l.tripId === trip.id
                          );
                          const hasBoardedMorning = studentLogs.some((l) => l.eventType === "Montée Matin");
                          const hasArrivedSchool = studentLogs.some(
                            (l) => l.eventType === "Descente Matin (École)"
                          );
                          const hasBoardedEvening = studentLogs.some((l) => l.eventType === "Montée Soir (École)");
                          const hasDroppedHome = studentLogs.some(
                            (l) => l.eventType === "Descente Soir (Maison)"
                          );

                          return (
                            <div
                              key={sub.id}
                              className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3 hover:bg-white hover:shadow-md transition"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="font-bold text-slate-900">{student?.nomEtudiant}</div>
                                  <div className="text-xs text-slate-400">
                                    {student?.classe} | Arrêt : {sub.pickupStop || "Principal"}
                                  </div>
                                </div>
                                <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">
                                  {sub.tripType}
                                </span>
                              </div>

                              {/* Pointage Action Buttons */}
                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                                {trip.tripType.includes("Matin") ? (
                                  <>
                                    <button
                                      disabled={hasBoardedMorning}
                                      onClick={() =>
                                        handleRecordBoarding(
                                          student.id,
                                          trip.id,
                                          "Montée Matin",
                                          sub.pickupStop || "Arrêt Matin"
                                        )
                                      }
                                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                                        hasBoardedMorning
                                          ? "bg-emerald-100 text-emerald-800 cursor-not-allowed"
                                          : "bg-blue-600 text-white hover:bg-blue-500 shadow-sm"
                                      }`}
                                    >
                                      {hasBoardedMorning ? "✓ Monté (Matin)" : "1. Montée Bus"}
                                    </button>
                                    <button
                                      disabled={hasArrivedSchool}
                                      onClick={() =>
                                        handleRecordBoarding(student.id, trip.id, "Descente Matin (École)", "École")
                                      }
                                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                                        hasArrivedSchool
                                          ? "bg-emerald-100 text-emerald-800 cursor-not-allowed"
                                          : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm"
                                      }`}
                                    >
                                      {hasArrivedSchool ? "✓ À l'école" : "2. Arrivée École"}
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      disabled={hasBoardedEvening}
                                      onClick={() =>
                                        handleRecordBoarding(
                                          student.id,
                                          trip.id,
                                          "Montée Soir (École)",
                                          "École (Départ)"
                                        )
                                      }
                                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                                        hasBoardedEvening
                                          ? "bg-emerald-100 text-emerald-800 cursor-not-allowed"
                                          : "bg-amber-600 text-white hover:bg-amber-500 shadow-sm"
                                      }`}
                                    >
                                      {hasBoardedEvening ? "✓ Embarqué" : "1. Départ École"}
                                    </button>
                                    <button
                                      disabled={hasDroppedHome}
                                      onClick={() =>
                                        handleRecordBoarding(
                                          student.id,
                                          trip.id,
                                          "Descente Soir (Maison)",
                                          sub.pickupStop || "Maison"
                                        )
                                      }
                                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                                        hasDroppedHome
                                          ? "bg-emerald-100 text-emerald-800 cursor-not-allowed"
                                          : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm"
                                      }`}
                                    >
                                      {hasDroppedHome ? "✓ Déposé" : "2. Déposé Arrêt"}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: AUDIT & BOARDING LOGS ─────────────────────────────────── */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-4">
          <h3 className="font-black text-slate-900 text-base">Historique des Pointages & Notifications Parents</h3>

          <div className="divide-y divide-slate-100">
            {logs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Aucun événement de pointage récent enregistré.
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                        log.eventType.includes("Montée")
                          ? "bg-blue-100 text-blue-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      <Bus className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{log.student?.nomEtudiant}</div>
                      <div className="text-xs text-slate-400">
                        {log.eventType} à l'arrêt <span className="font-semibold text-slate-700">{log.stopName}</span>{" "}
                        ({log.trip?.route?.routeName || "Ligne"})
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-slate-700">
                        {new Date(log.scanTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(log.scanTime).toLocaleDateString("fr-FR")}
                      </div>
                    </div>

                    {log.parentNotified ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <MessageSquare className="w-3 h-3" />
                        WhatsApp / SMS Envoyé
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500 font-semibold">
                        Non notifié
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL: NOUVELLE / MODIFIER LIGNE ────────────────────────────── */}
      {isRouteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">
                {routeForm.id ? "Modifier la Ligne de Bus" : "Ajouter une Ligne de Bus"}
              </h3>
              <button onClick={() => setIsRouteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoute} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Nom de la Ligne *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ligne 1 - Plateau / Yantala"
                    value={routeForm.routeName}
                    onChange={(e) => setRouteForm({ ...routeForm, routeName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Immatriculation Véhicule *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: RN-4829-A"
                    value={routeForm.vehicleNumber}
                    onChange={(e) => setRouteForm({ ...routeForm, vehicleNumber: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Nom du Chauffeur *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Moussa Idrissa"
                    value={routeForm.driverName}
                    onChange={(e) => setRouteForm({ ...routeForm, driverName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Téléphone Chauffeur</label>
                  <input
                    type="text"
                    placeholder="Ex: +227 90 00 00 00"
                    value={routeForm.driverPhone}
                    onChange={(e) => setRouteForm({ ...routeForm, driverPhone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Capacité du Bus (Places)</label>
                  <input
                    type="number"
                    value={routeForm.capacity}
                    onChange={(e) => setRouteForm({ ...routeForm, capacity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Tarif Mensuel (CFA)</label>
                  <input
                    type="number"
                    value={routeForm.monthlyFee}
                    onChange={(e) => setRouteForm({ ...routeForm, monthlyFee: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Dynamic Stops Editor */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600">Arrêts et Horaires de passage</label>
                  <button
                    type="button"
                    onClick={() =>
                      setRouteForm({
                        ...routeForm,
                        stops: [
                          ...routeForm.stops,
                          {
                            id: String(routeForm.stops.length + 1),
                            stopName: `Nouvel Arrêt ${routeForm.stops.length + 1}`,
                            timeMorning: "07:00",
                            timeEvening: "16:15",
                            order: routeForm.stops.length + 1,
                          },
                        ],
                      })
                    }
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    + Ajouter un arrêt
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {routeForm.stops.map((stop, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        placeholder="Nom de l'arrêt"
                        value={stop.stopName}
                        onChange={(e) => {
                          const nextStops = [...routeForm.stops];
                          nextStops[idx].stopName = e.target.value;
                          setRouteForm({ ...routeForm, stops: nextStops });
                        }}
                        className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400"
                      />
                      <input
                        type="text"
                        placeholder="Matin (07:00)"
                        value={stop.timeMorning}
                        onChange={(e) => {
                          const nextStops = [...routeForm.stops];
                          nextStops[idx].timeMorning = e.target.value;
                          setRouteForm({ ...routeForm, stops: nextStops });
                        }}
                        className="w-24 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center text-slate-900 placeholder:text-slate-400"
                      />
                      <input
                        type="text"
                        placeholder="Soir (16:30)"
                        value={stop.timeEvening}
                        onChange={(e) => {
                          const nextStops = [...routeForm.stops];
                          nextStops[idx].timeEvening = e.target.value;
                          setRouteForm({ ...routeForm, stops: nextStops });
                        }}
                        className="w-24 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center text-slate-900 placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const nextStops = routeForm.stops.filter((_, i) => i !== idx);
                          setRouteForm({ ...routeForm, stops: nextStops });
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRouteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition"
                >
                  {isSubmitting ? "Enregistrement..." : "Enregistrer la Ligne"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: INSCRIRE UN ÉLÈVE ────────────────────────────────────── */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Inscrire un Élève au Transport</h3>
              <button onClick={() => setIsSubModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubscription} className="space-y-4">
              {/* Student Search */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Rechercher l'Élève *</label>
                <input
                  type="text"
                  placeholder="Nom ou Matricule de l'élève..."
                  value={studentSearchQuery}
                  onChange={(e) => handleSearchStudents(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                />

                {studentSearchResults.length > 0 && !selectedStudent && (
                  <div className="mt-2 bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 max-h-40 overflow-y-auto">
                    {studentSearchResults.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => {
                          setSelectedStudent(st);
                          setSubForm({
                            ...subForm,
                            parentPhone: st.mobile || "",
                            parentWhatsapp: st.whatsapp || st.mobile || "",
                          });
                        }}
                        className="p-2.5 hover:bg-blue-50 cursor-pointer text-xs flex items-center justify-between"
                      >
                        <span className="font-bold text-slate-900">{st.nomEtudiant}</span>
                        <span className="text-slate-400 font-mono">{st.numAdmission} ({st.classe})</span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedStudent && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-xl border border-blue-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-blue-900">{selectedStudent.nomEtudiant}</div>
                      <div className="text-blue-700">{selectedStudent.classe} | {selectedStudent.numAdmission}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(null)}
                      className="text-blue-500 hover:text-blue-700 font-bold"
                    >
                      Changer
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Ligne de Transport *</label>
                <select
                  value={subForm.routeId}
                  onChange={(e) => {
                    const rId = Number(e.target.value);
                    const selRoute = routes.find((r) => r.id === rId);
                    const firstStop = selRoute?.stops?.[0]?.stopName || "";
                    setSubForm({ ...subForm, routeId: rId, pickupStop: firstStop });
                  }}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.routeName} ({r.vehicleNumber}) - {r.monthlyFee} CFA
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Arrêt de Prise en Charge *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Arrêt Pharmacie Centrale"
                  value={subForm.pickupStop}
                  onChange={(e) => setSubForm({ ...subForm, pickupStop: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Formule de Trajet</label>
                  <select
                    value={subForm.tripType}
                    onChange={(e) => setSubForm({ ...subForm, tripType: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Aller-Retour">Aller-Retour</option>
                    <option value="Aller simple matin">Aller simple matin</option>
                    <option value="Retour simple soir">Retour simple soir</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Téléphone Parent (SMS/WhatsApp)</label>
                  <input
                    type="text"
                    placeholder="Ex: +227 90 00 00 00"
                    value={subForm.parentPhone}
                    onChange={(e) => setSubForm({ ...subForm, parentPhone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition"
                >
                  {isSubmitting ? "Inscription..." : "Valider l'Inscription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: DÉMARRER UN TRAJET ──────────────────────────────────── */}
      {isStartTripModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Démarrer un Trajet de Bus</h3>
              <button onClick={() => setIsStartTripModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStartTrip} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Ligne de Bus *</label>
                <select
                  value={tripForm.routeId}
                  onChange={(e) => setTripForm({ ...tripForm, routeId: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.routeName} ({r.vehicleNumber}) - Chauffeur : {r.driverName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Type de Circuit *</label>
                <select
                  value={tripForm.tripType}
                  onChange={(e) => setTripForm({ ...tripForm, tripType: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Circuit Matin">🌅 Circuit Matin (Ramassage vers l'École)</option>
                  <option value="Circuit Soir">🌇 Circuit Soir (Retour vers les Domiciles)</option>
                  <option value="Sortie Pédagogique">🚌 Sortie Spéciale / Pédagogique</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStartTripModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition"
                >
                  {isSubmitting ? "Démarrage..." : "Lancer le Trajet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CARTE DE TRANSPORT NUMÉRIQUE (PASS QR) ───────────────── */}
      {selectedPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-6 shadow-2xl text-center">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Carte de Transport Scolaire</span>
              <button onClick={() => setSelectedPass(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Badge Card */}
            <div className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white p-6 rounded-2xl space-y-4 shadow-xl text-left relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] uppercase font-bold text-blue-300">Edut Pro • Flotte Sécurisée</div>
                  <div className="text-base font-black">{selectedPass.student?.nomEtudiant}</div>
                  <div className="text-xs font-mono text-slate-300">{selectedPass.student?.numAdmission}</div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-white/20 text-white font-bold text-[10px]">
                  {selectedPass.student?.classe}
                </span>
              </div>

              <div className="bg-white/10 p-3 rounded-xl backdrop-blur-md space-y-1 text-xs">
                <div>
                  <span className="text-slate-300">Ligne : </span>
                  <span className="font-bold">{selectedPass.route?.routeName}</span>
                </div>
                <div>
                  <span className="text-slate-300">Bus : </span>
                  <span className="font-mono font-bold">{selectedPass.route?.vehicleNumber}</span>
                </div>
                <div>
                  <span className="text-slate-300">Arrêt : </span>
                  <span className="font-semibold text-amber-300">{selectedPass.pickupStop || "Principal"}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-center">
                <div className="bg-white p-3 rounded-xl text-slate-900 flex flex-col items-center">
                  <QrCode className="w-24 h-24 text-slate-900" />
                  <span className="text-[9px] font-mono text-slate-500 mt-1">SCAN-BUS-{selectedPass.studentId}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition"
            >
              <Printer className="w-4 h-4" />
              Imprimer le Pass
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
