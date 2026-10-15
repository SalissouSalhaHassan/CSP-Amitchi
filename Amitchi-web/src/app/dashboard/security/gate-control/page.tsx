import { Metadata } from "next";
import { getGateMonitoringData } from "@/domains/security/actions/gate-control.actions";
import LiveGateDashboard from "@/domains/security/components/LiveGateDashboard";
import { ShieldCheck, ArrowLeft, QrCode } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contrôle d'Accès & Poste de Garde | EDUT Security Core",
  description: "Surveillance et monitoring en temps réel des flux d'entrées et sorties des élèves sur le campus.",
};

export default async function GateControlPage() {
  const { stats, liveLogs } = await getGateMonitoringData();

  return (
    <div className="p-6 sm:p-10 space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white flex items-center justify-center shadow-xl shadow-indigo-500/10">
            <ShieldCheck size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Contrôle d'Accès & Portail Sécurité
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-0.5">
              Supervision en temps réel des passages élèves, internats et alertes de sécurité
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/id-cards"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
          >
            <QrCode size={16} />
            <span>Studio Cartes Scolaires</span>
          </Link>
          <Link
            href="/dashboard/security"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all"
          >
            <ArrowLeft size={16} />
            <span>Retour Sécurité</span>
          </Link>
        </div>
      </div>

      {/* Main Live Dashboard */}
      <LiveGateDashboard initialStats={stats} initialLogs={liveLogs} />
    </div>
  );
}
