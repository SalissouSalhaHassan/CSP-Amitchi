export const dynamic = "force-dynamic";

import { getDocumentHeaderConfig, getSettings, getBranches, updateSchoolDomain } from "@/domains/settings/actions/settings.actions";
import { getCurrentSchool } from "@/domains/auth/services/school";
import { 
  getSessions, getClasses, getSections, getSubjects, getSectionSubjects, 
  getClassSubjects, getGradingAppreciations, getSchoolRemarks, getPeriods, getEducationalLevels, getCanevasReferenceLists
} from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { Settings, Shield, CreditCard, BookOpen, Database, Bell, Globe, School, Building2, DollarSign, Lock, Server, AlertCircle, LayoutGrid, Calendar, MapPin, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { SettingsForm } from "./components/SettingsForm";
import { AcademicSettings } from "./components/AcademicSettings";
import { CurriculumMatrix } from "./components/CurriculumMatrix";
import TimetableManager from "./components/TimetableManager";
import { CampusSetup } from "./components/CampusSetup";
import DocumentHeaderManager from "@/domains/settings/components/DocumentHeaderManager";

import { DeveloperApiHub } from "./components/DeveloperApiHub";
import { SettingsTabsContainer } from "./components/SettingsTabsContainer";

function safeArray(res: any): any[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  let activeTab = 'general';
  try {
    const resolvedParams = searchParams ? await searchParams : {};
    activeTab = resolvedParams?.tab || 'general';
  } catch {
    activeTab = 'general';
  }

  const settingsRes = await getSettings().catch(() => null) as any;
  const allSettings = safeArray(settingsRes);

  const branchesRes = await getBranches().catch(() => null) as any;
  const branches = safeArray(branchesRes);

  const sessionsRes = await getSessions().catch(() => null) as any;
  const sessions = safeArray(sessionsRes);

  const classesRes = await getClasses(true).catch(() => null) as any;
  const classes = safeArray(classesRes);

  const sectionsRes = await getSections(true).catch(() => null) as any;
  const sections = safeArray(sectionsRes);

  const subjectsRes = await getSubjects().catch(() => null) as any;
  const subjects = safeArray(subjectsRes);

  const sectionSubjectsRes = await getSectionSubjects().catch(() => null) as any;
  const sectionSubjects = safeArray(sectionSubjectsRes);

  const classSubjectsRes = await getClassSubjects().catch(() => null) as any;
  const classSubjects = safeArray(classSubjectsRes);

  const gradingAppreciationsRes = await getGradingAppreciations().catch(() => null) as any;
  const gradingAppreciations = safeArray(gradingAppreciationsRes);

  const schoolRemarksRes = await getSchoolRemarks().catch(() => null) as any;
  const schoolRemarks = safeArray(schoolRemarksRes);

  const periodsRes = await getPeriods().catch((err) => {
    console.error("🔍 [DIAGNOSTIC SettingsPage] getPeriods error:", err);
    return null;
  }) as any;
  console.log("🔍 [DIAGNOSTIC SettingsPage] periodsRes:", JSON.stringify(periodsRes, null, 2));
  const periods = safeArray(periodsRes);
  console.log("🔍 [DIAGNOSTIC SettingsPage] safeArray(periodsRes) count:", periods.length);

  const levelsRes = await getEducationalLevels(true).catch(() => null) as any;
  const educationalLevels = safeArray(levelsRes);

  const canevasReferencesRes = await getCanevasReferenceLists().catch(() => null) as any;
  const canevasReferences = (canevasReferencesRes?.data?.data || canevasReferencesRes?.data || canevasReferencesRes) ?? { type: [], cycle: [], commune: [] };

  const employeesRes = await getEmployees().catch(() => null) as any;
  const employees = safeArray(employeesRes);

  const currentUser = await getCurrentUser().catch(() => null);
  const currentSchool = await getCurrentSchool().catch(() => null);
  const headerConfigRes = await getDocumentHeaderConfig().catch(() => null) as any;
  const documentHeaderConfig = headerConfigRes?.data?.data || headerConfigRes?.data || null;

  const permissionsList = safeArray(currentUser?.role?.permissions);
  const canEditAcademics = Boolean(
    currentUser?.admin || 
    permissionsList.some((p: any) => p.moduleName?.toLowerCase() === "academics" && p.canEdit)
  );

  const getVal = (key: string) => allSettings.find((s: any) => s?.key === key)?.value || "";
  const currentSession = sessions.find((s: any) => s?.isActive) || sessions[0] || null;

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700">
      <SettingsForm>
        <SettingsTabsContainer 
          initialTab={activeTab}
          generalContent={
            <>
              <div className="bg-white dark:bg-[#12131C] p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-10">
                 <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-6">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                       <Building2 size={24} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Informations de l'Établissement</h3>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Nom de l'École</label>
                       <Input name="school_name" defaultValue={getVal('school_name') || "Edut Pro School"} className="h-14 rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-[#0E0F18] dark:text-white focus:bg-white dark:focus:bg-[#181924] transition-all font-bold" />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Slogan / Devise</label>
                       <Input name="school_slogan" defaultValue={getVal('school_slogan')} className="h-14 rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-[#0E0F18] dark:text-white focus:bg-white dark:focus:bg-[#181924] transition-all font-bold" />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Adresse</label>
                       <Input name="school_address" defaultValue={getVal('school_address')} className="h-14 rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-[#0E0F18] dark:text-white focus:bg-white dark:focus:bg-[#181924] transition-all font-bold" />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Email de Contact</label>
                       <Input name="school_email" defaultValue={getVal('school_email')} className="h-14 rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-[#0E0F18] dark:text-white focus:bg-white dark:focus:bg-[#181924] transition-all font-bold" />
                    </div>
                 </div>

                 {/* SaaS Multi-Tenancy Section */}
                 <div className="pt-10 border-t border-slate-100 dark:border-slate-800/60 space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          <Globe size={20} />
                       </div>
                       <h4 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Configuration du Domaine</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Sous-domaine Edut</label>
                          <div className="flex items-center gap-2">
                             <Input readOnly disabled value={`${currentSchool?.slug || 'school'}.edut.pro`} className="h-14 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 font-bold text-slate-500 dark:text-slate-400 cursor-not-allowed" />
                          </div>
                       </div>
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Domaine Personnalisé (Premium)</label>
                          <Input 
                             name="custom_domain" 
                             placeholder="ex: portal.school.edu"
                             defaultValue={currentSchool?.customDomain || ""} 
                             className="h-14 rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-[#0E0F18] dark:text-white focus:bg-white dark:focus:bg-[#181924] transition-all font-bold" 
                          />
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium px-2">Pointez votre enregistrement CNAME vers <span className="text-blue-600 dark:text-blue-400 font-bold">domains.edut.pro</span></p>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="bg-white dark:bg-[#12131C] p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-8">
                 <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-6">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                       <Globe size={24} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Paramètres Régionaux</h3>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Langue par défaut</label>
                       <select name="language" defaultValue={getVal('language') || "fr"} className="w-full h-14 bg-slate-50 dark:bg-[#0E0F18] dark:text-white border-none rounded-2xl px-4 font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-primary/20">
                          <option value="fr">Français (Sénégal)</option>
                          <option value="ar">العربية (السودان)</option>
                          <option value="en">English (UK)</option>
                       </select>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Fuseau Horaire</label>
                       <select name="timezone" defaultValue={getVal('timezone') || "gmt"} className="w-full h-14 bg-slate-50 dark:bg-[#0E0F18] dark:text-white border-none rounded-2xl px-4 font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-primary/20">
                          <option value="gmt">(GMT+00:00) Dakar</option>
                          <option value="gmt2">(GMT+02:00) Khartoum</option>
                       </select>
                    </div>
                 </div>
              </div>
            </>
          }
          financeContent={
            <div className="bg-white dark:bg-[#12131C] p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-10">
               <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-6">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                     <DollarSign size={24} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Finance & Comptabilité</h3>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Devise</label>
                     <Input name="currency" defaultValue={getVal('currency') || "F CFA"} className="h-14 rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-[#0E0F18] dark:text-white font-bold" />
                  </div>
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Préfixe Reçus</label>
                     <Input name="receipt_prefix" defaultValue={getVal('receipt_prefix') || "REC-"} className="h-14 rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-[#0E0F18] dark:text-white font-bold" />
                  </div>
               </div>
            </div>
          }
          academicContent={
            <AcademicSettings 
               initialSessions={sessions}
               initialPeriods={periods}
               initialEducationalLevels={educationalLevels}
               initialCanevasReferences={canevasReferences}
               initialClasses={classes}
               initialSections={sections}
               initialSubjects={subjects}
               initialSectionSubjects={sectionSubjects}
               initialClassSubjects={classSubjects}
               initialGradingAppreciations={gradingAppreciations}
               initialSchoolRemarks={schoolRemarks}
               canEdit={canEditAcademics}
            />
          }
          curriculumContent={
            <CurriculumMatrix 
               initialSections={sections}
               initialSubjects={subjects}
            />
          }
          securityContent={
            <div className="space-y-8">
              <div className="bg-white dark:bg-[#12131C] p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-10">
                <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-6">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
                    <Lock size={24} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Sécurité & Accès</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Délai Expiration Session (min)</label>
                    <Input name="session_timeout" type="number" defaultValue={getVal('session_timeout') || "120"} className="h-14 rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-[#0E0F18] dark:text-white font-bold" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Politique de Mots de Passe</label>
                    <select name="password_policy" defaultValue={getVal('password_policy') || "strict"} className="w-full h-14 bg-slate-50 dark:bg-[#0E0F18] dark:text-white border-none rounded-2xl px-4 font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="strict">Stricte (Majuscules, Chiffres, Symboles)</option>
                      <option value="medium">Moyenne (8 caractères minimum)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Developer API & SSO Hub */}
              <DeveloperApiHub schoolSlug={currentSchool?.slug || "ecole"} />
            </div>
          }
          notificationsContent={
            <div className="bg-white dark:bg-[#12131C] p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-10">
               <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-6">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                     <Bell size={24} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Alertes & Communications</h3>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Nom de l'Expéditeur SMS</label>
                     <Input name="sms_sender_id" defaultValue={getVal('sms_sender_id') || "EDUT PRO"} className="h-14 rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-[#0E0F18] dark:text-white font-bold" />
                  </div>
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Clé API SMS</label>
                     <Input name="sms_api_key" type="password" defaultValue={getVal('sms_api_key')} className="h-14 rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-[#0E0F18] dark:text-white font-bold" placeholder="••••••••••••••••" />
                  </div>
               </div>
            </div>
          }
          systemContent={
            <div className="space-y-8">
              <div className="bg-white dark:bg-[#12131C] p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-10">
                <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                    <Server size={24} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Système & Avancé</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Maintenance Mode */}
                  <div className="p-6 rounded-3xl border border-red-100 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5 flex items-start gap-4">
                    <AlertCircle className="text-red-500 mt-1 flex-shrink-0" size={24} />
                    <div>
                      <h4 className="font-bold text-red-900 dark:text-red-400">Mode Maintenance</h4>
                      <p className="text-xs text-red-700/80 dark:text-red-400/70 mt-1 mb-4">Activer ce mode bloque l'accès à tous les utilisateurs sauf les administrateurs.</p>
                      <select name="maintenance_mode" defaultValue={getVal('maintenance_mode') || "false"} className="w-full h-11 bg-white dark:bg-[#0E0F18] dark:text-white border-red-200 dark:border-red-500/30 rounded-xl px-4 font-bold text-xs text-red-900 dark:text-red-400 shadow-sm outline-none focus:ring-2 focus:ring-red-500/20">
                        <option value="false">Désactivé (Opérationnel)</option>
                        <option value="true">Activé (Maintenance en cours)</option>
                      </select>
                    </div>
                  </div>

                  {/* Encrypted Backups & Sovereign Cloud */}
                  <div className="p-6 rounded-3xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/5 flex items-start gap-4">
                    <Database className="text-indigo-500 mt-1 flex-shrink-0" size={24} />
                    <div>
                      <h4 className="font-bold text-indigo-900 dark:text-indigo-300">Sauvegardes Chiffrées & Cloud Souverain</h4>
                      <p className="text-xs text-indigo-700/80 dark:text-indigo-400/70 mt-1 mb-4">
                        Vos données académiques et financières sont répliquées quotidiennement et chiffrées AES-256.
                      </p>
                      <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl">
                        Statut : Sauvegardes Quotidiennes Actives
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
          headersContent={
            <DocumentHeaderManager initialConfig={documentHeaderConfig} />
          }
        />
      </SettingsForm>
    </div>
  );
}
