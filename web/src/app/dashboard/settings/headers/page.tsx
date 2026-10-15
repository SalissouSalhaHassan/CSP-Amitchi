import { getDocumentHeaderConfig, getBranches } from "@/domains/settings/actions/settings.actions";
import DocumentHeaderManager from "@/domains/settings/components/DocumentHeaderManager";
import { FileText, Sparkles } from "lucide-react";

export const revalidate = 0;

export default async function DocumentHeadersPage({
  searchParams,
}: {
  searchParams?: Promise<{ branchId?: string; profileId?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const [headerConfigRes, branchesRes] = await Promise.all([
    getDocumentHeaderConfig().catch(() => null) as any,
    getBranches().catch(() => null) as any,
  ]);
  const initialConfig = headerConfigRes?.data?.data || headerConfigRes?.data || null;
  const branches: any[] = branchesRes?.data?.data || branchesRes?.data || [];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-8 rounded-[2.5rem] shadow-xl">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-[1.5rem] shadow-inner text-amber-300">
            <FileText size={36} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black tracking-tight">En-têtes Officiels & Designer</h1>
              <span className="px-3 py-1 bg-amber-400/20 border border-amber-400/30 text-amber-200 text-xs font-black uppercase tracking-widest rounded-xl flex items-center gap-1.5">
                <Sparkles size={14} /> Studio Intelligent
              </span>
            </div>
            <p className="text-indigo-200 text-sm font-medium">
              تصميم المستندات الإدارية والترويسات الرسمية بالكامل بحسب الفروع والمستويات مع المزامنة الذكية المباشرة.
            </p>
          </div>
        </div>
      </div>

      {/* Main Standalone Template Designer & Manager */}
      <DocumentHeaderManager 
        initialConfig={initialConfig} 
        branches={branches}
        targetBranchId={resolvedParams?.branchId}
        targetProfileId={resolvedParams?.profileId}
      />
    </div>
  );
}
