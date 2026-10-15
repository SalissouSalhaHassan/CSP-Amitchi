"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  LogIn,
  LogOut,
  Users,
  Search,
  RefreshCw,
  Clock,
  Building,
  AlertTriangle,
  QrCode,
  Radio,
} from "lucide-react";
import { GateLogItem, logManualGateEntry } from "../actions/gate-control.actions";
import { toast } from "sonner";

interface Props {
  initialStats: {
    totalStudents: number;
    onCampus: number;
    enteredToday: number;
    exitedToday: number;
    activeHostelPerms: number;
  };
  initialLogs: GateLogItem[];
}

export default function LiveGateDashboard({ initialStats, initialLogs }: Props) {
  const [stats, setStats] = useState(initialStats);
  const [logs, setLogs] = useState<GateLogItem[]>(initialLogs);
  const [filterQuery, setFilterQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<"all" | "entry" | "exit">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString("fr-FR"));

  // Auto-refresh simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefreshed(new Date().toLocaleTimeString("fr-FR"));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleManualAction = async (studentId: number, action: "entry" | "exit") => {
    try {
      const res = await logManualGateEntry(studentId, action);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.error || "Erreur lors de l'enregistrement");
      }
    } catch {
      toast.error("Erreur de communication");
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.studentName.toLowerCase().includes(filterQuery.toLowerCase()) ||
      log.matricule.toLowerCase().includes(filterQuery.toLowerCase()) ||
      log.classe.toLowerCase().includes(filterQuery.toLowerCase());

    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      {/* Top Controls & Live Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full animate-ping absolute opacity-75" />
            <div className="w-3 h-3 bg-emerald-500 rounded-full" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>Flux de Contrôle en Direct</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase font-black tracking-wider">
                Live Active
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Synchronisé avec les terminaux mobiles de sécurité • Dernier ping à {lastRefreshed}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsRefreshing(true);
              setTimeout(() => {
                setIsRefreshing(false);
                setLastRefreshed(new Date().toLocaleTimeString("fr-FR"));
                toast.info("Données de la porte actualisées");
              }, 600);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-indigo-400" : ""} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* KPI Counters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* On Campus */}
        <div className="bg-slate-900/70 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-400">
            <Users size={56} />
          </div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Présents sur le Campus
          </div>
          <div className="text-3xl font-black text-emerald-400">{stats.onCampus}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            sur {stats.totalStudents} élèves inscrits
          </div>
        </div>

        {/* Entries Today */}
        <div className="bg-slate-900/70 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-indigo-400">
            <LogIn size={56} />
          </div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Entrées Enregistrées
          </div>
          <div className="text-3xl font-black text-indigo-400">{stats.enteredToday}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Passages validés aujourd'hui
          </div>
        </div>

        {/* Exits Today */}
        <div className="bg-slate-900/70 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-amber-400">
            <LogOut size={56} />
          </div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Sorties Enregistrées
          </div>
          <div className="text-3xl font-black text-amber-400">{stats.exitedToday}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Fin de cours & permissions
          </div>
        </div>

        {/* Hostel Alerts */}
        <div className="bg-slate-900/70 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-rose-400">
            <Building size={56} />
          </div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Bons Sortie Internat
          </div>
          <div className="text-3xl font-black text-rose-400">{stats.activeHostelPerms}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Autorisations actives
          </div>
        </div>
      </div>

      {/* Main Stream Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        {/* Search and Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Rechercher par élève, classe ou matricule..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {(["all", "entry", "exit"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActionFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  actionFilter === filter
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800/60 text-slate-400 hover:text-white"
                }`}
              >
                {filter === "all" ? "Tous" : filter === "entry" ? "Entrées" : "Sorties"}
              </button>
            ))}
          </div>
        </div>

        {/* Movement Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Élève</th>
                <th className="py-3 px-4">Classe / Matricule</th>
                <th className="py-3 px-4">Mouvement</th>
                <th className="py-3 px-4">Heure</th>
                <th className="py-3 px-4">Statut & Motif</th>
                <th className="py-3 px-4">Opérateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.map((log) => {
                const isEntry = log.action === "entry";
                return (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 shrink-0">
                          {log.studentName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm leading-tight">
                            {log.studentName}
                          </div>
                          <div className="text-[10px] text-slate-500">ID #{log.studentId}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-300">{log.classe}</div>
                      <div className="font-mono text-[10px] text-slate-500">{log.matricule}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                          isEntry
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                        }`}
                      >
                        {isEntry ? <LogIn size={13} /> : <LogOut size={13} />}
                        <span>{isEntry ? "Entrée" : "Sortie"}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-300">
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-slate-500" />
                        <span>{log.timestamp}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            log.status === "green"
                              ? "bg-emerald-400"
                              : log.status === "yellow"
                              ? "bg-amber-400"
                              : "bg-rose-400"
                          }`}
                        />
                        <span className="text-slate-300 text-xs">{log.reason}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {log.operator}
                    </td>
                  </tr>
                );
              })}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <ShieldCheck size={36} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-semibold text-slate-400">
                      Aucun passage ne correspond à votre recherche
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
