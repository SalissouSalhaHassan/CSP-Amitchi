export const dynamic = "force-dynamic";

import { getBranches } from "@/domains/settings/actions/settings.actions";
import { CampusSetup } from "../settings/components/CampusSetup";
import { MapPin, Building2, CheckCircle2 } from "lucide-react";

export default async function CampusSetupPage() {
  const res = await getBranches();
  const branches: any[] = (res as any).data?.data || (res as any).data || [];

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700 bg-[#fdfdff] min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
            <Building2 size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configuration du Campus</h1>
            <p className="text-slate-500 font-bold mt-1 text-[11px]">
              Gérez les branches et les informations de votre institut
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-500 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
              <CheckCircle2 size={14} />
              Modifications enregistrées
           </div>
        </div>
      </div>

      <div className="bg-transparent">
        <CampusSetup initialBranches={branches} />
      </div>
    </div>
  );
}
