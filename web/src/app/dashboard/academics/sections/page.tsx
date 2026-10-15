export const dynamic = "force-dynamic";

import { getSections, deleteSection } from "@/domains/academics/actions/academics.actions";
import SectionDialog from "@/domains/academics/components/SectionDialog";
import ActionMenu from "@/components/common/ActionMenu";
import { Bookmark, Edit, BookOpen } from "lucide-react";

export default async function SectionsPage() {
  const result = await getSections();
  const sections: any[] = ((result as any).data?.data || (result as any).data || []) as any[];

  return (
    <div className="p-10 space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Sections / Filières</h1>
            <span className="text-2xl font-bold text-slate-300 font-arabic">الأقسام والشعب</span>
          </div>
          <p className="text-slate-500 mt-2 font-medium">Gérez les sections et filières de votre établissement.</p>
        </div>
        <SectionDialog mode="add" />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.1em]">Nom de la Section</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.1em]">Niveau</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.1em]">Date d'ajout</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.1em] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sections.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center gap-4 opacity-20">
                    <Bookmark size={64} />
                    <p className="text-xl font-bold">Aucune section enregistrée</p>
                  </div>
                </td>
              </tr>
            ) : (
              sections.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                        {s.sectionName?.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-700">{s.sectionName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                      {s.educationalLevel || "-"}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-slate-500 font-medium text-sm">
                    {new Date(s.createdAt).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <ActionMenu 
                      onDelete={async () => {
                        "use server";
                        return await deleteSection(s.id);
                      }}
                      editDialog={<SectionDialog mode="edit" initialData={s} trigger={
                        <button className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 w-full text-left">
                          <Edit size={16} /> Modifier
                        </button>
                      } />}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
