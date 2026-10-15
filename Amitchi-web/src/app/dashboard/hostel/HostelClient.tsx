"use client";

import React, { useState, useTransition, useMemo, useRef, useEffect } from "react";
import {
  Building,
  Bed,
  Users,
  DoorOpen,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  Clock,
  LogOut,
  LogIn,
  Moon,
  Calendar,
  AlertTriangle,
  UserCheck,
  Send,
  Loader2,
  FileText,
  UserPlus,
  ShieldCheck,
  Phone,
  Sparkles,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  saveHostelRoom,
  allocateRoom,
  vacateRoom,
  deleteHostelRoom,
  deleteHostelAllocation,
  recordNightAttendanceAction,
  reviewHostelExitPermissionAction,
  markHostelExitDepartureAction,
  markHostelExitReturnAction,
  submitHostelExitPermissionAction,
  recordHostelVisitorAction,
  deleteHostelVisitorAction,
} from "@/domains/hostel/actions/hostel.actions";

interface Props {
  rooms: any[];
  allocations: any[];
  students: any[];
  initialNightAttendance: any[];
  initialExitPermissions: any[];
  initialVisitors: any[];
}

export default function HostelClient({
  rooms: initialRooms,
  allocations: initialAllocations,
  students,
  initialNightAttendance,
  initialExitPermissions,
  initialVisitors,
}: Props) {
  const [activeTab, setActiveTab] = useState<"residents" | "rooms" | "night_call" | "exit_passes" | "visitors">("residents");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Rooms with occupancy
  const rooms = useMemo(() => {
    return initialRooms.map((r) => {
      const activeCount = initialAllocations.filter((a) => a.roomId === r.id && a.status === "Occupé").length;
      return {
        ...r,
        occupiedBeds: activeCount,
        cost: r.costPerTerm ?? r.cost ?? 0,
      };
    });
  }, [initialRooms, initialAllocations]);

  const allocations = initialAllocations;
  const [nightAttendance, setNightAttendance] = useState(initialNightAttendance);
  const [exitPermissions, setExitPermissions] = useState(initialExitPermissions);
  const [visitors, setVisitors] = useState(initialVisitors);

  // Modals state
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [isExitPassModalOpen, setIsExitPassModalOpen] = useState(false);
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);

  // Form states - Add Room
  const [roomNumber, setRoomNumber] = useState("");
  const [buildingName, setBuildingName] = useState("Pavillon A (Garçons)");
  const [roomType, setRoomType] = useState("Garçons");
  const [capacity, setCapacity] = useState("4");
  const [cost, setCost] = useState("50000");

  // Form states - Allocate Student
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const studentDropdownRef = useRef<HTMLDivElement>(null);

  // Form states - Exit Pass
  const [newExitPass, setNewExitPass] = useState({
    studentId: "",
    permissionType: "Sortie weekend",
    departureDate: new Date().toISOString().slice(0, 10),
    returnDateExpected: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    guardianName: "",
    guardianPhone: "",
    reason: "Visite familiale pour le weekend",
  });

  // Form states - Visitor Log
  const [newVisitor, setNewVisitor] = useState({
    studentId: "",
    visitorName: "",
    relation: "Père",
    visitorPhone: "",
    cnic: "",
    visitDate: new Date().toISOString().slice(0, 10),
    entryTime: "15:00",
    exitTime: "17:00",
    purpose: "Visite familiale et dépôt de fournitures",
  });

  // State for Night Roll Call
  const [rollCallDate, setRollCallDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedRollCallBuilding, setSelectedRollCallBuilding] = useState("ALL");
  const [rollCallRecords, setRollCallRecords] = useState<Record<number, string>>({});
  const [isSavingRollCall, setIsSavingRollCall] = useState(false);

  // Initialize roll call state for all active boarders
  useEffect(() => {
    const activeAllocations = allocations.filter((a) => a.status === "Occupé");
    const initialMap: Record<number, string> = {};
    activeAllocations.forEach((a) => {
      const existing = nightAttendance.find((na) => na.studentId === a.studentId && na.date === rollCallDate);
      initialMap[a.studentId] = existing ? existing.status : "Présent";
    });
    setRollCallRecords(initialMap);
  }, [allocations, nightAttendance, rollCallDate]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target as Node)) {
        setIsStudentDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Stats calculation
  const totalCapacity = useMemo(() => rooms.reduce((acc, r) => acc + (r.capacity || 0), 0), [rooms]);
  const occupiedBeds = useMemo(() => rooms.reduce((acc, r) => acc + (r.occupiedBeds || 0), 0), [rooms]);
  const availableBeds = totalCapacity - occupiedBeds;
  const activeExitsCount = useMemo(() => exitPermissions.filter((e) => e.status === "Sorti" || e.status === "Approuvé").length, [exitPermissions]);

  // Filtered residents
  const filteredAllocations = useMemo(() => {
    return allocations.filter((a) => {
      const studentName = (a.student?.nomEtudiant || "").toLowerCase();
      const studentMatricule = (a.student?.numAdmission || "").toLowerCase();
      const rNum = (a.room?.roomNumber || "").toLowerCase();
      const bName = (a.room?.buildingName || "").toLowerCase();
      const query = searchQuery.toLowerCase();
      return (
        studentName.includes(query) ||
        studentMatricule.includes(query) ||
        rNum.includes(query) ||
        bName.includes(query)
      );
    });
  }, [allocations, searchQuery]);

  // Filtered available students for allocation
  const availableStudents = useMemo(() => {
    const occupiedStudentIds = new Set(
      allocations.filter((a) => a.status === "Occupé").map((a) => a.studentId)
    );
    return students.filter(
      (s) =>
        !occupiedStudentIds.has(s.id) &&
        (s.nomEtudiant || "").toLowerCase().includes(studentSearch.toLowerCase())
    );
  }, [students, allocations, studentSearch]);

  // Handle Save Room
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber) return;

    startTransition(async () => {
      const res = await saveHostelRoom({
        roomNumber,
        buildingName,
        roomType,
        capacity: parseInt(capacity) || 1,
        costPerTerm: parseFloat(cost) || 0,
      });

      if (res.success) {
        toast.success("Chambre ajoutée avec succès !");
        setIsRoomModalOpen(false);
        setRoomNumber("");
      } else {
        toast.error(res?.error || "Erreur lors de l'ajout.");
      }
    });
  };

  // Handle Allocate Student
  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedRoomId) {
      toast.error("Veuillez sélectionner un élève et une chambre.");
      return;
    }

    startTransition(async () => {
      const res = await allocateRoom(parseInt(selectedStudentId), parseInt(selectedRoomId));
      if (res.success) {
        toast.success("Élève affecté à la chambre avec succès !");
        setIsAllocateModalOpen(false);
        setSelectedStudentId("");
        setSelectedRoomId("");
      } else {
        toast.error(res.error || "Erreur lors de l'affectation.");
      }
    });
  };

  // Handle Vacate Room
  const handleVacate = async (allocationId: number) => {
    if (!confirm("Êtes-vous sûr de vouloir libérer cette place en internat ?")) return;

    startTransition(async () => {
      const res = await vacateRoom(allocationId);
      if (res.success) {
        toast.success("Place libérée avec succès !");
      } else {
        toast.error(res.error || "Erreur.");
      }
    });
  };

  // Handle Night Roll Call Submission
  const handleSaveRollCall = async () => {
    const activeAllocations = allocations.filter((a) => a.status === "Occupé");
    const records = activeAllocations.map((a) => ({
      roomId: a.roomId,
      studentId: a.studentId,
      date: rollCallDate,
      status: rollCallRecords[a.studentId] || "Présent",
    }));

    try {
      setIsSavingRollCall(true);
      const res: any = await recordNightAttendanceAction(records);
      const payload = res?.data || res;
      if (payload?.success || res?.success) {
        toast.success(payload?.message || res?.message || "Appel de nuit enregistré ! Les parents des absents ont été notifiés.");
      } else if (res?.error || payload?.error) {
        toast.error(res?.error || payload?.error);
      }
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement de l'appel.");
    } finally {
      setIsSavingRollCall(false);
    }
  };

  // Handle Exit Pass Actions
  const handleApproveExitPass = async (id: number) => {
    startTransition(async () => {
      const res = await reviewHostelExitPermissionAction({ permissionId: id, decision: "Approuvé" });
      if (res.success) {
        toast.success("Demande de sortie validée. Notification envoyée au parent.");
        setExitPermissions((prev) => prev.map((p) => (p.id === id ? { ...p, status: "Approuvé" } : p)));
      }
    });
  };

  const handleMarkDeparture = async (id: number) => {
    startTransition(async () => {
      const res = await markHostelExitDepartureAction(id);
      if (res.success) {
        toast.success("Départ enregistré. Parent alerté par WhatsApp.");
        setExitPermissions((prev) => prev.map((p) => (p.id === id ? { ...p, status: "Sorti" } : p)));
      }
    });
  };

  const handleMarkReturn = async (id: number) => {
    startTransition(async () => {
      const res = await markHostelExitReturnAction(id);
      if (res.success) {
        toast.success("Retour sécurisé enregistré. Parent rassuré.");
        setExitPermissions((prev) => prev.map((p) => (p.id === id ? { ...p, status: "Retourné" } : p)));
      }
    });
  };

  const handleCreateExitPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExitPass.studentId || !newExitPass.reason) return;

    startTransition(async () => {
      const res = await submitHostelExitPermissionAction({
        studentId: parseInt(newExitPass.studentId),
        permissionType: newExitPass.permissionType,
        departureDate: newExitPass.departureDate,
        returnDateExpected: newExitPass.returnDateExpected,
        guardianName: newExitPass.guardianName,
        guardianPhone: newExitPass.guardianPhone,
        reason: newExitPass.reason,
      });

      if (res.success) {
        toast.success("Autorisation de sortie créée.");
        setIsExitPassModalOpen(false);
      }
    });
  };

  // Handle Visitor Log
  const handleCreateVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVisitor.studentId || !newVisitor.visitorName) return;

    startTransition(async () => {
      const res = await recordHostelVisitorAction({
        studentId: parseInt(newVisitor.studentId),
        visitorName: newVisitor.visitorName,
        relation: newVisitor.relation,
        visitorPhone: newVisitor.visitorPhone,
        cnic: newVisitor.cnic,
        visitDate: newVisitor.visitDate,
        entryTime: newVisitor.entryTime,
        exitTime: newVisitor.exitTime,
        purpose: newVisitor.purpose,
      });

      if (res.success) {
        toast.success("Visite enregistrée dans le registre.");
        setIsVisitorModalOpen(false);
      }
    });
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-emerald-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5 relative z-10">
          <div className="size-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-slate-950 font-black text-2xl shadow-2xl">
            <Building className="size-10" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="size-3.5" /> Internat & Résidences Étudiantes
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Gestion des Dortoirs & Internat</h1>
            <p className="text-emerald-200 text-xs sm:text-sm font-semibold">
              Télésurveillance des présences nocturnes, autorisations de sorties et allocation des lits 🇳🇪
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={() => setIsAllocateModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs sm:text-sm shadow-lg transition transform active:scale-95 flex items-center gap-2"
          >
            <UserPlus className="size-4" /> Affecter un Élève
          </button>

          <button
            onClick={() => setIsRoomModalOpen(true)}
            className="px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2"
          >
            <Plus className="size-4" /> Nouvelle Chambre
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-2xl">
            <Building className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chambres Totales</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{rooms.length}</h3>
            <p className="text-[11px] text-slate-400">Pavillons actifs</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-2xl">
            <Bed className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Capacité & Lits</p>
            <h3 className="text-2xl font-black text-indigo-600 mt-0.5">{occupiedBeds} / {totalCapacity}</h3>
            <p className="text-[11px] text-slate-400">{availableBeds} lits disponibles</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-2xl">
            <Moon className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Appel Nocturne</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-0.5">
              {allocations.filter((a) => a.status === "Occupé").length}
            </h3>
            <p className="text-[11px] text-slate-400">Pensionnaires attendus ce soir</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950 text-amber-600 rounded-2xl">
            <DoorOpen className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sorties & Permissions</p>
            <h3 className="text-2xl font-black text-amber-600 mt-0.5">{activeExitsCount}</h3>
            <p className="text-[11px] text-slate-400">En weekend ou autorisés</p>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("residents")}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "residents"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Users className="size-4" /> Résidents & Affectations ({allocations.length})
        </button>

        <button
          onClick={() => setActiveTab("rooms")}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "rooms"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Building className="size-4" /> Chambres & Pavillons ({rooms.length})
        </button>

        <button
          onClick={() => setActiveTab("night_call")}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "night_call"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Moon className="size-4" /> Appel & Présence Nocturne 🌙
        </button>

        <button
          onClick={() => setActiveTab("exit_passes")}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "exit_passes"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <LogOut className="size-4" /> Sorties & Permissions ({exitPermissions.length})
        </button>

        <button
          onClick={() => setActiveTab("visitors")}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "visitors"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <FileText className="size-4" /> Registre des Visiteurs ({visitors.length})
        </button>
      </div>

      {/* TAB 1: RÉSIDENTS & AFFECTATIONS */}
      {activeTab === "residents" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par élève, matricule, chambre ou pavillon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={() => setIsAllocateModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5 justify-center"
            >
              <UserPlus className="size-3.5" /> Nouvelle Affectation
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {filteredAllocations.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Users className="size-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold">Aucun résident trouvé.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-4">Élève Pensionnaire</th>
                      <th className="p-4">Chambre & Pavillon</th>
                      <th className="p-4">Date d'entrée</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredAllocations.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                        <td className="p-4 font-bold text-slate-900 dark:text-white">
                          {a.student?.nomEtudiant}
                          <p className="text-xs text-slate-400 font-normal">
                            Matricule : {a.student?.numAdmission || "N/A"} • Classe : {a.student?.classe || "N/A"}
                          </p>
                        </td>
                        <td className="p-4">
                          <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                            Chambre {a.room?.roomNumber}
                          </span>
                          <p className="text-xs text-slate-400">{a.room?.buildingName}</p>
                        </td>
                        <td className="p-4 whitespace-nowrap text-xs text-slate-500">
                          {a.joinDate ? new Date(a.joinDate).toLocaleDateString("fr-FR") : "-"}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              a.status === "Occupé"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800"
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          {a.status === "Occupé" && (
                            <button
                              onClick={() => handleVacate(a.id)}
                              className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold transition"
                            >
                              Libérer la place
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

      {/* TAB 2: CHAMBRES & PAVILLONS */}
      {activeTab === "rooms" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rooms.map((r) => {
              const isFull = r.occupiedBeds >= r.capacity;
              return (
                <div
                  key={r.id}
                  className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-700">
                        {r.roomType}
                      </span>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">
                        Chambre {r.roomNumber}
                      </h3>
                      <p className="text-xs text-slate-500">{r.buildingName}</p>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black ${
                        isFull
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {r.occupiedBeds} / {r.capacity} lits
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${isFull ? "bg-rose-500" : "bg-emerald-500"}`}
                        style={{ width: `${Math.min(100, (r.occupiedBeds / r.capacity) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 text-right">
                      {r.capacity - r.occupiedBeds} place(s) restante(s)
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600">Tarif / Trimestre :</span>
                    <span className="font-black text-emerald-600">
                      {Number(r.cost).toLocaleString()} FCFA
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: APPEL & PRÉSENCE NOCTURNE */}
      {activeTab === "night_call" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Moon className="size-5 text-indigo-600" /> Appel Nocturne des Pensionnaires (Curfew Check)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pointage du coucher. Les élèves marqués comme <strong className="text-rose-600">Absent non justifié</strong> déclenchent un SMS/WhatsApp d'alerte immédiat au parent.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={rollCallDate}
                  onChange={(e) => setRollCallDate(e.target.value)}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                />

                <button
                  onClick={handleSaveRollCall}
                  disabled={isSavingRollCall}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow flex items-center gap-2"
                >
                  {isSavingRollCall ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  Valider l'Appel Nocturne
                </button>
              </div>
            </div>

            {/* Roll Call Table */}
            <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800 pt-4">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="text-slate-500 font-semibold">
                  <tr>
                    <th className="p-3">Élève & Chambre</th>
                    <th className="p-3">Statut de Présence</th>
                    <th className="p-3">Téléphone Parent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {allocations
                    .filter((a) => a.status === "Occupé")
                    .map((a) => {
                      const currentStatus = rollCallRecords[a.studentId] || "Présent";
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            {a.student?.nomEtudiant}
                            <p className="text-xs text-indigo-600 font-normal">
                              Chambre {a.room?.roomNumber} • {a.room?.buildingName}
                            </p>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-2">
                              {["Présent", "Absent non justifié", "Permission / Weekend", "Infirmerie"].map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() =>
                                    setRollCallRecords((prev) => ({
                                      ...prev,
                                      [a.studentId]: st,
                                    }))
                                  }
                                  className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                                    currentStatus === st
                                      ? st === "Présent"
                                        ? "bg-emerald-600 text-white shadow"
                                        : st === "Absent non justifié"
                                        ? "bg-rose-600 text-white shadow animate-pulse"
                                        : "bg-amber-600 text-white shadow"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200"
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 text-xs text-slate-500 font-mono">
                            {a.student?.telephoneParent || a.student?.telephone || "Non renseigné"}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SORTIES & PERMISSIONS */}
      {activeTab === "exit_passes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-lg text-slate-900 dark:text-white">Autorisations de Sorties & Weekends</h3>
            <button
              onClick={() => setIsExitPassModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5"
            >
              <Plus className="size-3.5" /> Nouvelle Autorisation
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {exitPermissions.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <DoorOpen className="size-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold">Aucune sortie enregistrée.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-4">Élève</th>
                      <th className="p-4">Type & Motif</th>
                      <th className="p-4">Période</th>
                      <th className="p-4">Tuteur / Contact</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {exitPermissions.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td className="p-4 font-bold text-slate-900 dark:text-white">
                          {p.student?.nomEtudiant}
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-indigo-600">{p.permissionType}</p>
                          <p className="text-xs text-slate-400">{p.reason}</p>
                        </td>
                        <td className="p-4 text-xs whitespace-nowrap">
                          Du {p.departureDate} au {p.returnDateExpected}
                          {p.exitTime && <p className="text-[10px] text-slate-400">Sorti à : {p.exitTime}</p>}
                        </td>
                        <td className="p-4 text-xs">
                          {p.guardianName || "-"}
                          {p.guardianPhone && <p className="text-slate-400 font-mono">{p.guardianPhone}</p>}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              p.status === "Sorti"
                                ? "bg-amber-100 text-amber-800"
                                : p.status === "Retourné"
                                ? "bg-emerald-100 text-emerald-800"
                                : p.status === "Approuvé"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="p-4 text-right whitespace-nowrap space-x-2">
                          {p.status === "En attente" && (
                            <button
                              onClick={() => handleApproveExitPass(p.id)}
                              className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                            >
                              Approuver
                            </button>
                          )}
                          {p.status === "Approuvé" && (
                            <button
                              onClick={() => handleMarkDeparture(p.id)}
                              className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold"
                            >
                              Marquer Départ 🚪
                            </button>
                          )}
                          {p.status === "Sorti" && (
                            <button
                              onClick={() => handleMarkReturn(p.id)}
                              className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                            >
                              Marquer Retour ✅
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

      {/* TAB 5: REGISTRE DES VISITEURS */}
      {activeTab === "visitors" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-lg text-slate-900 dark:text-white">Registre des Visiteurs de l'Internat</h3>
            <button
              onClick={() => setIsVisitorModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5"
            >
              <Plus className="size-3.5" /> Enregistrer un Visiteur
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {visitors.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <FileText className="size-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold">Aucun visiteur enregistré aujourd'hui.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-4">Visiteur</th>
                      <th className="p-4">Lien & CNIC</th>
                      <th className="p-4">Élève Visité</th>
                      <th className="p-4">Horaires</th>
                      <th className="p-4">Motif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {visitors.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/70">
                        <td className="p-4 font-bold text-slate-900 dark:text-white">
                          {v.visitorName}
                          {v.visitorPhone && <p className="text-xs text-slate-400 font-mono">{v.visitorPhone}</p>}
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-indigo-600">{v.relation}</span>
                          {v.cnic && <p className="text-xs text-slate-400">CNIC : {v.cnic}</p>}
                        </td>
                        <td className="p-4 font-bold">{v.student?.nomEtudiant}</td>
                        <td className="p-4 text-xs whitespace-nowrap">
                          {v.visitDate} • De {v.entryTime} à {v.exitTime || "En cours"}
                        </td>
                        <td className="p-4 text-xs text-slate-500">{v.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: AJOUT CHAMBRE */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="size-5 text-emerald-600" /> Ajouter une Chambre
              </h3>
              <button onClick={() => setIsRoomModalOpen(false)} className="p-2 text-slate-400">✕</button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Numéro de Chambre *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 101, A-04"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Pavillon / Bâtiment *</label>
                <input
                  type="text"
                  required
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Type</label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  >
                    <option value="Garçons">Garçons</option>
                    <option value="Filles">Filles</option>
                    <option value="Mixte">Mixte</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Capacité (Lits)</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Frais de séjour / Trimestre (FCFA)</label>
                <input
                  type="number"
                  step="5000"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsRoomModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Annuler</button>
                <button type="submit" disabled={isPending} className="px-6 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow">
                  Enregistrer la Chambre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AFFECTER UN ÉLÈVE */}
      {isAllocateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="size-5 text-emerald-600" /> Affecter un Élève à l'Internat
              </h3>
              <button onClick={() => setIsAllocateModalOpen(false)} className="p-2 text-slate-400">✕</button>
            </div>

            <form onSubmit={handleAllocate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Sélectionner l'Élève *</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none"
                >
                  <option value="">-- Choisir un élève non affecté --</option>
                  {availableStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nomEtudiant} ({s.classe || "Scolaire"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Chambre d'Internat *</label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none"
                >
                  <option value="">-- Choisir une chambre disponible --</option>
                  {rooms
                    .filter((r) => r.occupiedBeds < r.capacity)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        Chambre {r.roomNumber} - {r.buildingName} ({r.capacity - r.occupiedBeds} lits dispo)
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsAllocateModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Annuler</button>
                <button type="submit" disabled={isPending} className="px-6 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow">
                  Affecter le Pensionnaire
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AUTORISATION DE SORTIE */}
      {isExitPassModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <LogOut className="size-5 text-indigo-600" /> Nouvelle Demande de Sortie
              </h3>
              <button onClick={() => setIsExitPassModalOpen(false)} className="p-2 text-slate-400">✕</button>
            </div>

            <form onSubmit={handleCreateExitPass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Élève Pensionnaire *</label>
                <select
                  required
                  value={newExitPass.studentId}
                  onChange={(e) => setNewExitPass({ ...newExitPass, studentId: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none"
                >
                  <option value="">-- Choisir le pensionnaire --</option>
                  {allocations
                    .filter((a) => a.status === "Occupé")
                    .map((a) => (
                      <option key={a.studentId} value={a.studentId}>
                        {a.student?.nomEtudiant} (Chambre {a.room?.roomNumber})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Date départ *</label>
                  <input
                    type="date"
                    required
                    value={newExitPass.departureDate}
                    onChange={(e) => setNewExitPass({ ...newExitPass, departureDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Retour attendu *</label>
                  <input
                    type="date"
                    required
                    value={newExitPass.returnDateExpected}
                    onChange={(e) => setNewExitPass({ ...newExitPass, returnDateExpected: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nom du Tuteur / Responsable</label>
                  <input
                    type="text"
                    value={newExitPass.guardianName}
                    onChange={(e) => setNewExitPass({ ...newExitPass, guardianName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Téléphone de contact</label>
                  <input
                    type="tel"
                    value={newExitPass.guardianPhone}
                    onChange={(e) => setNewExitPass({ ...newExitPass, guardianPhone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Motif de la sortie *</label>
                <textarea
                  required
                  rows={2}
                  value={newExitPass.reason}
                  onChange={(e) => setNewExitPass({ ...newExitPass, reason: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsExitPassModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Annuler</button>
                <button type="submit" disabled={isPending} className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow">
                  Enregistrer l'Autorisation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ENREGISTREMENT VISITEUR */}
      {isVisitorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="size-5 text-emerald-600" /> Registre des Visiteurs
              </h3>
              <button onClick={() => setIsVisitorModalOpen(false)} className="p-2 text-slate-400">✕</button>
            </div>

            <form onSubmit={handleCreateVisitor} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Élève Visité *</label>
                <select
                  required
                  value={newVisitor.studentId}
                  onChange={(e) => setNewVisitor({ ...newVisitor, studentId: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none"
                >
                  <option value="">-- Choisir l'élève --</option>
                  {allocations.map((a) => (
                    <option key={a.studentId} value={a.studentId}>
                      {a.student?.nomEtudiant} (Chambre {a.room?.roomNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nom complet du visiteur *</label>
                <input
                  type="text"
                  required
                  value={newVisitor.visitorName}
                  onChange={(e) => setNewVisitor({ ...newVisitor, visitorName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Lien de parenté</label>
                  <select
                    value={newVisitor.relation}
                    onChange={(e) => setNewVisitor({ ...newVisitor, relation: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  >
                    <option value="Père">Père</option>
                    <option value="Mère">Mère</option>
                    <option value="Frère / Sœur">Frère / Sœur</option>
                    <option value="Tuteur">Tuteur</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={newVisitor.visitorPhone}
                    onChange={(e) => setNewVisitor({ ...newVisitor, visitorPhone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Heure d'entrée</label>
                  <input
                    type="time"
                    value={newVisitor.entryTime}
                    onChange={(e) => setNewVisitor({ ...newVisitor, entryTime: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Heure de sortie</label>
                  <input
                    type="time"
                    value={newVisitor.exitTime}
                    onChange={(e) => setNewVisitor({ ...newVisitor, exitTime: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsVisitorModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Annuler</button>
                <button type="submit" disabled={isPending} className="px-6 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow">
                  Enregistrer la Visite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
