export const dynamic = "force-dynamic";

import { getAuditLogs } from "@/domains/auth/actions/audit.actions";
import { Shield } from "lucide-react";
import { AuditLogsManager } from "./components/AuditLogsManager";

export default async function AuditLogsPage() {
  const logsRes = await getAuditLogs();
  const logs = logsRes.success ? (logsRes.data || []) : [];

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-5xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <span className="p-4 rounded-[2rem] bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm inline-flex">
              <Shield className="size-10" />
            </span>
            Journal d'Audit
          </h1>
          <p className="text-slate-500 font-medium italic text-lg">Surveillance complète des opérations de sécurité et modifications de données.</p>
        </div>
      </div>

      <AuditLogsManager logs={logs} />
    </div>
  );
}
