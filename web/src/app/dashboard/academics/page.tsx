export const dynamic = "force-dynamic";

import { getClasses, deleteClass, getSections, deleteSection } from "@/domains/academics/actions/academics.actions";
import ClassDialog from "@/domains/academics/components/ClassDialog";
import SectionDialog from "@/domains/academics/components/SectionDialog";
import ActionMenu from "@/components/common/ActionMenu";
import Link from "next/link";
import { BookOpen, MapPin, Calendar, PlusCircle, Edit, GraduationCap, Award, ChevronRight, Bookmark } from "lucide-react";

function NavCard({ href, title, subtitle, icon, color }: any) {
  return (
    <Link href={href} className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col gap-4">
      <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div>
        <h3 className="font-black text-slate-900 leading-tight">{title}</h3>
        <p className="text-xs text-slate-500 font-medium mt-1">{subtitle}</p>
      </div>
      <div className="mt-auto pt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-indigo-600 transition-colors">
        <span>Accéder</span>
        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}

export default async function AcademicsPage() {
  const result = await getClasses();
  const classes: any[] = ((result as any).data?.data || (result as any).data || []) as any[];
  
  const secResult = await getSections();
  const sections: any[] = ((secResult as any).data?.data || (secResult as any).data || []) as any[];

  return (
    <div className="p-10 space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gestion Académique</h1>
            <span className="text-2xl font-bold text-slate-300 font-arabic">الإدارة الأكاديمية</span>
          </div>
          <p className="text-slate-500 mt-2 font-medium">Gérez vos sections, classes, matières, notes et résultats.</p>
        </div>
        <div className="flex gap-4">
          <SectionDialog mode="add" trigger={
            <button className="rounded-2xl px-6 py-4 bg-amber-500 text-white hover:bg-amber-600 shadow-xl shadow-amber-200 transition-all font-bold gap-2 flex items-center justify-center">
              <PlusCircle size={20} /> Ajouter une Section
            </button>
          } />
          <ClassDialog mode="add" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <NavCard 
          href="/dashboard/academics/grades" 
          title="Notes & Résultats" 
          subtitle="Saisie et Broadsheet" 
          icon={<GraduationCap size={24} />} 
          color="bg-indigo-50 text-indigo-600"
        />
        <NavCard 
          href="/dashboard/academics/exams" 
          title="Examens" 
          subtitle="Programmation" 
          icon={<Award size={24} />} 
          color="bg-amber-50 text-amber-600"
        />
        <NavCard 
          href="/dashboard/academics/timetable" 
          title="Emploi du Temps" 
          subtitle="Gestion horaire" 
          icon={<Calendar size={24} />} 
          color="bg-emerald-50 text-emerald-600"
        />
        <NavCard 
          href="/dashboard/academics/homework" 
          title="Devoirs" 
          subtitle="Tâches élèves" 
          icon={<BookOpen size={24} />} 
          color="bg-rose-50 text-rose-600"
        />
        <NavCard 
          href="/dashboard/academics/sections" 
          title="Sections" 
          subtitle="Gérer les filières" 
          icon={<Bookmark size={24} />} 
          color="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="pt-8 border-t border-slate-100">
        <h2 className="text-xl font-black text-slate-800 mb-6">Liste des Sections / Filières</h2>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden mb-12">
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
                    <BookOpen size={64} />
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

      <div className="pt-8 border-t border-slate-100">
        <h2 className="text-xl font-black text-slate-800 mb-6">Liste des Classes</h2>
      </div>

      {result.error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-800 px-6 py-4 rounded-[2rem] text-sm font-semibold flex items-center gap-3 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          {result.error}
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.1em]">Nom de la classe <span className="text-[10px] font-bold opacity-50 ml-1">اسم الصف</span></th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.1em]">Section / Filière <span className="text-[10px] font-bold opacity-50 ml-1">الفرع / الشعبة</span></th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.1em]">Date d'ajout <span className="text-[10px] font-bold opacity-50 ml-1">تاريخ الإضافة</span></th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.1em] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {classes.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center gap-4 opacity-20">
                    <BookOpen size={64} />
                    <p className="text-xl font-bold">Aucune classe enregistrée</p>
                  </div>
                </td>
              </tr>
            ) : (
              classes.map((c: any) => (
                <tr key={c.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:rotate-12 transition-transform">
                        <MapPin size={18} />
                      </div>
                      <span className="font-bold text-slate-900">{c.className}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm font-bold text-slate-600">
                    {c.sectionId || "Général"}
                  </td>
                  <td className="px-8 py-5 text-sm font-medium text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <ActionMenu 
                      title={`Supprimer ${c.className} ?`}
                      onDelete={deleteClass.bind(null, c.id)}
                      editDialog={
                        <ClassDialog 
                          mode="edit" 
                          initialData={c} 
                          trigger={
                            <button className="flex items-center gap-2 p-3 rounded-xl cursor-pointer hover:bg-indigo-50 hover:text-indigo-600 transition-colors w-full text-left">
                              <Edit size={16} />
                              <span className="font-semibold text-sm">Modifier</span>
                            </button>
                          }
                        />
                      }
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
