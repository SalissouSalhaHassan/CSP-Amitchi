"use client";

import React, { useState } from "react";
import {
  Server,
  Database,
  HardDrive,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Settings,
  ShieldAlert,
  BarChart3,
  RefreshCw,
  Search,
  School,
  ArrowUpRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateSchoolQuotas } from "@/domains/platform/actions/platform.actions";

interface SchoolUsage {
  id: number;
  name: string;
  slug: string;
  plan: string;
  status: string;
  studentsCount: number;
  maxStudents: number;
  studentUsagePercent: number;
  usersCount: number;
  syncOpsCount: number;
  maxMonthlySyncOps: number;
  syncUsagePercent: number;
  estimatedDbMb: number;
  maxStorageMb: number;
  storageUsagePercent: number;
  isQuotaExceeded: boolean;
}

interface UsageSummaryProps {
  usageData: {
    global: {
      totalSchools: number;
      totalStudents: number;
      totalUsers: number;
      totalSyncs: number;
      supabaseDbMaxMb: number;
      supabaseStorageMaxMb: number;
      supabaseEgressMaxGb: number;
      supabaseMauMax: number;
    };
    schoolsUsage: SchoolUsage[];
  };
}

export function PlatformUsageSummary({ usageData }: UsageSummaryProps) {
  const [schools, setSchools] = useState<SchoolUsage[]>(usageData.schoolsUsage || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<SchoolUsage | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states for quotas
  const [editMaxStudents, setEditMaxStudents] = useState<number>(500);
  const [editMaxStorageMb, setEditMaxStorageMb] = useState<number>(100);
  const [editMaxMonthlySyncOps, setEditMaxMonthlySyncOps] = useState<number>(5000);

  // Total calculated usage across all schools
  const totalEstimatedDbMb = Number(
    schools.reduce((acc, s) => acc + s.estimatedDbMb, 0).toFixed(2)
  );

  const filteredSchools = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenEdit = (school: SchoolUsage) => {
    setSelectedSchool(school);
    setEditMaxStudents(school.maxStudents);
    setEditMaxStorageMb(school.maxStorageMb);
    setEditMaxMonthlySyncOps(school.maxMonthlySyncOps);
    setIsEditing(true);
  };

  const handleSaveQuotas = async () => {
    if (!selectedSchool) return;
    setLoading(true);
    try {
      const res = await updateSchoolQuotas(selectedSchool.id, {
        maxStudents: Number(editMaxStudents),
        maxStorageMb: Number(editMaxStorageMb),
        maxMonthlySyncOps: Number(editMaxMonthlySyncOps),
      });

      if (res.success) {
        toast.success(`Les quotas de ${selectedSchool.name} ont été mis à jour avec succès.`);
        setSchools((prev) =>
          prev.map((s) =>
            s.id === selectedSchool.id
              ? {
                  ...s,
                  maxStudents: Number(editMaxStudents),
                  maxStorageMb: Number(editMaxStorageMb),
                  maxMonthlySyncOps: Number(editMaxMonthlySyncOps),
                  studentUsagePercent: Math.min(
                    100,
                    Math.round((s.studentsCount / Number(editMaxStudents)) * 100)
                  ),
                  storageUsagePercent: Math.min(
                    100,
                    Math.round((s.estimatedDbMb / Number(editMaxStorageMb)) * 100)
                  ),
                  syncUsagePercent: Math.min(
                    100,
                    Math.round((s.syncOpsCount / Number(editMaxMonthlySyncOps)) * 100)
                  ),
                }
              : s
          )
        );
        setIsEditing(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour des quotas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* GLOBAL SUPABASE QUOTA OVERVIEW */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 dark:from-slate-950 dark:to-black text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Database className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Usage Summary & Quotas Supabase
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Contrôle et plafonnement de la consommation de chaque école sur le forfait gratuit (Free Tier)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs px-3 py-1 font-bold">
              Supabase Free Plan Actif (0$ / Mois)
            </Badge>
          </div>
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Database Size Card */}
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 font-semibold">
                <Database className="w-4 h-4 text-emerald-400" /> Taille BD Globale
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {((totalEstimatedDbMb / usageData.global.supabaseDbMaxMb) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="text-2xl font-black tracking-tight font-mono">
              {totalEstimatedDbMb} <span className="text-xs font-normal text-slate-400">/ 500 MB</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (totalEstimatedDbMb / usageData.global.supabaseDbMaxMb) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Storage Size Card */}
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 font-semibold">
                <HardDrive className="w-4 h-4 text-blue-400" /> Stockage Fichiers
              </span>
              <span className="font-mono text-blue-400 font-bold">&lt; 1%</span>
            </div>
            <div className="text-2xl font-black tracking-tight font-mono">
              0.01 <span className="text-xs font-normal text-slate-400">/ 1 GB</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mt-3">
              <div className="h-full bg-blue-400 rounded-full" style={{ width: `1%` }} />
            </div>
          </div>

          {/* Monthly Active Users */}
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 font-semibold">
                <Users className="w-4 h-4 text-indigo-400" /> Utilisateurs Actifs
              </span>
              <span className="font-mono text-indigo-400 font-bold">
                {((usageData.global.totalUsers / usageData.global.supabaseMauMax) * 100).toFixed(2)}%
              </span>
            </div>
            <div className="text-2xl font-black tracking-tight font-mono">
              {usageData.global.totalUsers}{" "}
              <span className="text-xs font-normal text-slate-400">/ 50,000 MAU</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-indigo-400 rounded-full"
                style={{
                  width: `${Math.min(100, (usageData.global.totalUsers / usageData.global.supabaseMauMax) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Sync Operations */}
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 font-semibold">
                <Activity className="w-4 h-4 text-amber-400" /> Flux & Sync Ops
              </span>
              <span className="font-mono text-amber-400 font-bold">Sûr</span>
            </div>
            <div className="text-2xl font-black tracking-tight font-mono">
              {usageData.global.totalSyncs}{" "}
              <span className="text-xs font-normal text-slate-400">opérations</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mt-3">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: `15%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* INDIVIDUAL SCHOOL CONSUMPTION & QUOTA LIMITS TABLE */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <School className="w-5 h-5 text-indigo-500" />
              Consommation et Plafonds par Établissement
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Suivi en temps réel des élèves, du stockage alloué et des quotas autorisés pour chaque école.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher une école..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* SCHOOLS TABLE */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Établissement</th>
                <th className="py-3.5 px-4">Plan & Statut</th>
                <th className="py-3.5 px-4">Élèves Enregistrés (Quota)</th>
                <th className="py-3.5 px-4">Volume Données (BD)</th>
                <th className="py-3.5 px-4">Mégasync Ops</th>
                <th className="py-3.5 px-4 text-center">État du Quota</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredSchools.map((school) => {
                return (
                  <tr
                    key={school.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-900/30 transition-colors"
                  >
                    {/* School Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{school.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">slug: {school.slug}</div>
                    </td>

                    {/* Plan */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`capitalize font-bold text-[10px] ${
                            school.plan === "enterprise"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                              : school.plan === "pro"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                              : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
                          }`}
                        >
                          {school.plan}
                        </Badge>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            school.status === "active" ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        />
                      </div>
                    </td>

                    {/* Students Quota */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {school.studentsCount} / {school.maxStudents}
                        </span>
                        <span className="text-slate-400">{school.studentUsagePercent}%</span>
                      </div>
                      <div className="w-36 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            school.studentUsagePercent > 90
                              ? "bg-rose-500"
                              : school.studentUsagePercent > 70
                              ? "bg-amber-500"
                              : "bg-indigo-500"
                          }`}
                          style={{ width: `${school.studentUsagePercent}%` }}
                        />
                      </div>
                    </td>

                    {/* Estimated Storage */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {school.estimatedDbMb} MB
                        </span>
                        <span className="text-slate-400">/ {school.maxStorageMb} MB</span>
                      </div>
                      <div className="w-28 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${school.storageUsagePercent}%` }}
                        />
                      </div>
                    </td>

                    {/* Sync Ops */}
                    <td className="py-3.5 px-4 font-mono">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {school.syncOpsCount}
                      </span>
                      <span className="text-slate-400 text-[11px]"> / {school.maxMonthlySyncOps}</span>
                    </td>

                    {/* Quota Status */}
                    <td className="py-3.5 px-4 text-center">
                      {school.isQuotaExceeded ? (
                        <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                          Dépassement Quota
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                          Normal & Conforme
                        </Badge>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(school)}
                        className="h-8 px-3 text-xs font-bold rounded-xl gap-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 border-slate-200 dark:border-slate-700"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Plafonner
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT QUOTA MODAL */}
      {isEditing && selectedSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
                <Settings className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Définir les Plafonds & Quotas
                </h3>
                <p className="text-xs text-slate-400 font-medium">{selectedSchool.name}</p>
              </div>
            </div>

            <div className="space-y-4 my-6 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Plafond Nombre d'Élèves (Max Students)
                </label>
                <input
                  type="number"
                  value={editMaxStudents}
                  onChange={(e) => setEditMaxStudents(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm"
                />
                <span className="text-[10px] text-slate-400">
                  Actuel: {selectedSchool.studentsCount} élèves
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Plafond Stockage Alloué (Max Storage MB)
                </label>
                <input
                  type="number"
                  value={editMaxStorageMb}
                  onChange={(e) => setEditMaxStorageMb(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm"
                />
                <span className="text-[10px] text-slate-400">
                  Total Supabase Free: 500 MB (Recommandé: 50 - 150 MB par école)
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Plafond Opérations de Synchro Mensuelles (Max Sync Ops)
                </label>
                <input
                  type="number"
                  value={editMaxMonthlySyncOps}
                  onChange={(e) => setEditMaxMonthlySyncOps(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setIsEditing(false)}
                className="rounded-xl text-xs"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSaveQuotas}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs"
              >
                {loading ? "Sauvegarde..." : "Appliquer les Plafonds"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
