"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  HardDrive,
  RefreshCw,
  Server,
  Shield,
  Zap,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { cn } from "@/lib/utils";

interface DiagnosticData {
  indexedDB: {
    accessible: boolean;
    version: number;
    tables: Record<string, number>;
    totalRecords: number;
    estimatedSizeKB: number;
  };
  serviceWorker: {
    supported: boolean;
    registered: boolean;
    active: boolean;
    scope: string | null;
    state: string | null;
  };
  outbox: {
    total: number;
    pending: number;
    failed: number;
    conflict: number;
    synced: number;
  };
  sync: {
    lastSyncAt: string | null;
    lastSyncResult: "success" | "error" | "never";
  };
  cache: {
    accessible: boolean;
    caches: string[];
    totalSizeKB: number;
  };
  network: {
    online: boolean;
    effectiveType: string | null;
    downlink: number | null;
  };
}

const EMPTY_DATA: DiagnosticData = {
  indexedDB: { accessible: false, version: 0, tables: {}, totalRecords: 0, estimatedSizeKB: 0 },
  serviceWorker: { supported: false, registered: false, active: false, scope: null, state: null },
  outbox: { total: 0, pending: 0, failed: 0, conflict: 0, synced: 0 },
  sync: { lastSyncAt: null, lastSyncResult: "never" },
  cache: { accessible: false, caches: [], totalSizeKB: 0 },
  network: { online: false, effectiveType: null, downlink: null },
};

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={cn("inline-block h-2.5 w-2.5 rounded-full shrink-0", ok ? "bg-emerald-500" : "bg-rose-500")} />
  );
}

function MetricCard({ icon: Icon, label, value, sub, status, color = "indigo" }: {
  icon: any; label: string; value: string | number; sub?: string;
  status?: "ok" | "warn" | "error"; color?: "indigo" | "emerald" | "amber" | "rose" | "slate";
}) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    slate: "bg-slate-50 text-slate-600 border-slate-100",
  };
  const statusIcon = status === "ok" ? "✅" : status === "warn" ? "⚠️" : status === "error" ? "❌" : null;
  return (
    <div className="bg-white rounded-[20px] border border-slate-100 p-5 shadow-sm flex items-start gap-4">
      <div className={cn("p-3 rounded-xl border", colors[color])}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
        <p className="text-2xl font-black text-slate-900 leading-none">
          {statusIcon && <span className="text-base mr-1">{statusIcon}</span>}
          {value}
        </p>
        {sub && <p className="text-xs font-medium text-slate-400 mt-1 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, desc }: { icon: any; title: string; desc?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0">
        <Icon size={17} />
      </div>
      <div>
        <h2 className="text-base font-black text-slate-900">{title}</h2>
        {desc && <p className="text-xs font-medium text-slate-400">{desc}</p>}
      </div>
    </div>
  );
}

export default function DiagnosticClient() {
  const isOnline = useOnlineStatus();
  const [data, setData] = useState<DiagnosticData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const runDiagnostic = useCallback(async () => {
    setLoading(true);
    const result: DiagnosticData = structuredClone(EMPTY_DATA);

    // Network info
    result.network.online = navigator.onLine;
    const conn = (navigator as any).connection;
    if (conn) {
      result.network.effectiveType = conn.effectiveType ?? null;
      result.network.downlink = conn.downlink ?? null;
    }

    // IndexedDB
    try {
      const { localDb } = await import("@/infrastructure/local-db/dexie");
      result.indexedDB.accessible = true;
      result.indexedDB.version = localDb.verno;

      const [students, feePayments, attendanceBatches, examResults, studentAttendance, references] = await Promise.all([
        localDb.students.count(),
        localDb.feePayments.count(),
        localDb.attendanceBatches.count(),
        localDb.examResults.count(),
        localDb.studentAttendance.count(),
        localDb.references.count(),
      ]);
      const outboxAll = await localDb.outbox.toArray();

      result.indexedDB.tables = { students, feePayments, attendanceBatches, examResults, studentAttendance, references, outbox: outboxAll.length };
      result.indexedDB.totalRecords = Object.values(result.indexedDB.tables).reduce((a, b) => a + b, 0);
      try { result.indexedDB.estimatedSizeKB = Math.round(JSON.stringify(outboxAll).length / 1024); } catch {}

      result.outbox.total = outboxAll.length;
      result.outbox.pending = outboxAll.filter(i => i.status === "pending" || !i.status).length;
      result.outbox.failed = outboxAll.filter(i => i.status === "failed").length;
      result.outbox.conflict = outboxAll.filter(i => i.status === "conflict").length;
      result.outbox.synced = outboxAll.filter(i => i.status === "synced").length;

      const synced = outboxAll.filter(i => i.status === "synced" && i.syncedAt).sort((a, b) => (b.syncedAt ?? 0) - (a.syncedAt ?? 0));
      if (synced.length > 0) {
        result.sync.lastSyncAt = new Date(synced[0].syncedAt!).toLocaleString("fr-FR");
        result.sync.lastSyncResult = "success";
      } else if (outboxAll.some(i => i.status === "failed")) {
        result.sync.lastSyncResult = "error";
      }
    } catch (e) {
      console.warn("IndexedDB diagnostic failed:", e);
    }

    // Service Worker
    result.serviceWorker.supported = "serviceWorker" in navigator;
    if (result.serviceWorker.supported) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          result.serviceWorker.registered = true;
          result.serviceWorker.scope = reg.scope;
          const sw = reg.active || reg.installing || reg.waiting;
          if (sw) { result.serviceWorker.active = !!reg.active; result.serviceWorker.state = sw.state; }
        }
      } catch {}
    }

    // Cache API
    if ("caches" in window) {
      result.cache.accessible = true;
      try {
        const keys = await window.caches.keys();
        result.cache.caches = keys;
        let totalBytes = 0;
        for (const key of keys) {
          const cache = await window.caches.open(key);
          const reqs = await cache.keys();
          for (const req of reqs.slice(0, 30)) {
            const resp = await cache.match(req);
            if (resp) { totalBytes += (await resp.clone().blob()).size; }
          }
        }
        result.cache.totalSizeKB = Math.round(totalBytes / 1024);
      } catch {}
    }

    setData(result);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    runDiagnostic();
    const id = setInterval(runDiagnostic, 30_000);
    return () => clearInterval(id);
  }, [runDiagnostic]);

  const outboxColor: "emerald" | "amber" | "rose" =
    data.outbox.conflict > 0 ? "rose" : data.outbox.pending > 0 || data.outbox.failed > 0 ? "amber" : "emerald";

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 space-y-8">

      {/* Header */}
      <header className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/synchronisation" className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition">
              <ArrowLeft size={18} />
            </Link>
            <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
              <Activity size={26} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Synchronisation</p>
              <h1 className="text-3xl font-black text-slate-900">Diagnostic Offline</h1>
              <p className="text-sm font-medium text-slate-500 mt-0.5">Statut en temps réel · IndexedDB · Service Worker · Outbox</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn("flex items-center gap-2 px-4 py-2 rounded-full font-black text-sm border",
              isOnline ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
            )}>
              {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
              {isOnline ? "En ligne" : "Hors ligne"}
            </div>
            <button onClick={runDiagnostic} disabled={loading}
              className="flex items-center gap-2 h-10 px-5 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition disabled:opacity-50">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualiser
            </button>
          </div>
        </div>
        {lastRefresh && (
          <p className="text-[10px] text-slate-400 font-medium mt-4 ml-[72px]">
            Dernière mise à jour : {lastRefresh.toLocaleTimeString("fr-FR")} · Rafraîchissement auto. toutes les 30s
          </p>
        )}
      </header>

      {/* Quick KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={Database} label="IndexedDB" value={data.indexedDB.accessible ? "Accessible" : "Erreur"}
          sub={`v${data.indexedDB.version} · ${data.indexedDB.totalRecords} enreg.`}
          status={data.indexedDB.accessible ? "ok" : "error"} color={data.indexedDB.accessible ? "emerald" : "rose"} />
        <MetricCard icon={Shield} label="Service Worker"
          value={!data.serviceWorker.supported ? "Non supporté" : data.serviceWorker.registered ? "Actif" : "Inactif"}
          sub={data.serviceWorker.state ?? undefined}
          status={data.serviceWorker.registered ? "ok" : data.serviceWorker.supported ? "warn" : "error"}
          color={data.serviceWorker.registered ? "emerald" : "amber"} />
        <MetricCard icon={Zap} label="Outbox" value={data.outbox.total}
          sub={`${data.outbox.pending} en attente · ${data.outbox.conflict} conflit(s)`}
          status={data.outbox.conflict > 0 ? "error" : data.outbox.pending > 0 ? "warn" : "ok"} color={outboxColor} />
        <MetricCard icon={Clock} label="Dernier sync" value={data.sync.lastSyncAt ?? "Jamais"}
          sub={data.sync.lastSyncResult === "success" ? "Succès" : data.sync.lastSyncResult === "error" ? "Erreur" : "—"}
          status={data.sync.lastSyncResult === "success" ? "ok" : data.sync.lastSyncResult === "error" ? "error" : undefined}
          color={data.sync.lastSyncResult === "success" ? "emerald" : data.sync.lastSyncResult === "error" ? "rose" : "slate"} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* IndexedDB Tables */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
          <SectionHeader icon={Database} title="IndexedDB — Tables" desc="Nombre d'enregistrements par table" />
          {data.indexedDB.accessible ? (
            <div className="space-y-2">
              {Object.entries(data.indexedDB.tables).map(([table, count]) => (
                <div key={table} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <StatusDot ok={true} />
                    <span className="text-sm font-bold text-slate-700">{table}</span>
                  </div>
                  <span className={cn("text-sm font-black px-3 py-0.5 rounded-full",
                    count === 0 ? "text-slate-400 bg-slate-50" : "text-indigo-700 bg-indigo-50")}>
                    {count}
                  </span>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Taille outbox estimée</span>
                <span className="text-sm font-black text-slate-700">≈ {data.indexedDB.estimatedSizeKB} KB</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-rose-600 bg-rose-50 rounded-2xl p-4">
              <XCircle size={20} />
              <p className="text-sm font-bold">IndexedDB inaccessible ou non initialisé</p>
            </div>
          )}
        </div>

        {/* Outbox Breakdown */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
          <SectionHeader icon={Zap} title="Outbox — Détail" desc="Répartition des opérations en attente" />
          <div className="space-y-3">
            {[
              { label: "Total", value: data.outbox.total, cls: "text-slate-900 bg-slate-100" },
              { label: "En attente (pending)", value: data.outbox.pending, cls: "text-amber-700 bg-amber-50" },
              { label: "Échoué (failed)", value: data.outbox.failed, cls: "text-rose-700 bg-rose-50" },
              { label: "Conflit", value: data.outbox.conflict, cls: "text-orange-700 bg-orange-50" },
              { label: "Synchronisé", value: data.outbox.synced, cls: "text-emerald-700 bg-emerald-50" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-600">{label}</span>
                <span className={cn("text-sm font-black px-3 py-0.5 rounded-full min-w-[3rem] text-center", cls)}>{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex gap-2">
            <Link href="/dashboard/synchronisation"
              className="flex-1 h-10 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition">
              <Zap size={14} /> Voir l'outbox
            </Link>
            {data.outbox.conflict > 0 && (
              <Link href="/dashboard/synchronisation/conflits"
                className="flex-1 h-10 rounded-xl bg-rose-600 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-700 transition">
                <AlertTriangle size={14} /> Conflits ({data.outbox.conflict})
              </Link>
            )}
          </div>
        </div>

        {/* Service Worker */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
          <SectionHeader icon={Shield} title="Service Worker" desc="Statut d'enregistrement et d'activation" />
          <div className="space-y-3">
            {[
              { label: "API supportée", ok: data.serviceWorker.supported },
              { label: "Enregistré", ok: data.serviceWorker.registered },
              { label: "Actif (active)", ok: data.serviceWorker.active },
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <span className="text-sm font-bold text-slate-600">{label}</span>
                <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black",
                  ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600")}>
                  {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {ok ? "Oui" : "Non"}
                </div>
              </div>
            ))}
            {data.serviceWorker.scope && (
              <div className="pt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Scope</p>
                <p className="text-xs font-bold text-slate-600 break-all bg-slate-50 rounded-xl px-3 py-2">{data.serviceWorker.scope}</p>
              </div>
            )}
            {data.serviceWorker.state && (
              <div className="pt-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">État SW</p>
                <span className={cn("inline-block px-3 py-1 rounded-full text-xs font-black",
                  data.serviceWorker.state === "activated" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                  {data.serviceWorker.state}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Cache & Network */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
          <SectionHeader icon={HardDrive} title="Cache & Réseau" desc="Cache API et informations de connexion" />
          <div className="space-y-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Cache API</p>
              {data.cache.accessible ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-bold text-slate-600">Taille totale</span>
                    <span className="text-sm font-black text-indigo-700">{data.cache.totalSizeKB} KB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-bold text-slate-600">Caches actifs</span>
                    <span className="text-sm font-black text-slate-700">{data.cache.caches.length}</span>
                  </div>
                  {data.cache.caches.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {data.cache.caches.map(c => (
                        <span key={c} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400 font-bold">Cache API non disponible</p>
              )}
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Connexion réseau</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-bold text-slate-600">Statut</span>
                  <span className={cn("text-sm font-black", data.network.online ? "text-emerald-700" : "text-rose-700")}>
                    {data.network.online ? "En ligne ✅" : "Hors ligne ❌"}
                  </span>
                </div>
                {data.network.effectiveType && (
                  <div className="flex justify-between">
                    <span className="text-sm font-bold text-slate-600">Type réseau</span>
                    <span className="text-sm font-black text-slate-700">{data.network.effectiveType}</span>
                  </div>
                )}
                {data.network.downlink !== null && (
                  <div className="flex justify-between">
                    <span className="text-sm font-bold text-slate-600">Débit estimé</span>
                    <span className="text-sm font-black text-slate-700">{data.network.downlink} Mbps</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Test Plan Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-[24px] p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-indigo-200">Documentation</p>
            <h3 className="text-xl font-black">Plan de Test Offline-First</h3>
            <p className="text-sm text-indigo-200 font-medium mt-0.5">Checklist complète — 8 phases · 40+ scénarios</p>
          </div>
        </div>
        <Link href="/dashboard/synchronisation"
          className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-white/15 hover:bg-white/25 transition rounded-xl text-sm font-black uppercase tracking-widest border border-white/20">
          <Zap size={15} /> Vue outbox
        </Link>
      </div>

      {/* Raw JSON debug */}
      <details className="bg-white rounded-[20px] border border-slate-100 shadow-sm">
        <summary className="p-5 cursor-pointer font-black text-sm text-slate-600 flex items-center gap-2 select-none">
          <Server size={16} /> Données brutes (debug)
        </summary>
        <pre className="p-5 pt-0 text-[11px] text-slate-600 font-mono overflow-auto max-h-80">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>

    </div>
  );
}
