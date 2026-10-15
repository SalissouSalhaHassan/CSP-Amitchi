export const dynamic = "force-dynamic";

import { getRoles } from "@/domains/auth/actions/roles.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getUserRoleType } from "@/domains/auth/services/rbac";
import { redirect } from "next/navigation";
import RoleManager from "../settings/components/RoleManager";
import { Shield, ShieldCheck, Bell, ChevronDown } from "lucide-react";

export default async function SecurityPage() {
  const currentUser = await getCurrentUser();
  const roleType = await getUserRoleType(currentUser);

  // Level Directors and non-global admins are redirected to Users & Teams
  if (roleType === "level_director" || roleType === "level_comptable" || roleType === "comptable" || roleType === "caissier" || roleType === "teacher" || roleType === "eleve" || roleType === "parent") {
    redirect("/dashboard/security/users");
  }

  const { data: roles = [] } = await getRoles();

  const userName = currentUser?.nomPrenom || currentUser?.utilisateur || "Admin";
  const userRole = currentUser?.admin ? "Administrateur" : currentUser?.role?.roleName || "Utilisateur";

  return (
    <div className="p-10 space-y-8 animate-in fade-in duration-700">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-200 dark:shadow-none">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Sécurité & Permissions</h1>
            <p className="text-slate-400 dark:text-slate-400 text-sm font-medium mt-0.5">Gérez les accès et les rôles de votre personnel</p>
          </div>
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-4">
          <button className="relative w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-300 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors">
            <Bell size={18} />
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">3</span>
          </button>
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#131622] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{userName}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{userRole}</p>
            </div>
            <ChevronDown size={14} className="text-slate-300 dark:text-slate-600 ml-1" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <div className="bg-white dark:bg-[#131622] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Shield size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rôles Définis</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white leading-tight">{roles.length}</p>
            <p className="text-[11px] text-slate-400 font-medium">Rôles créés dans le système</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-[#131622] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Système Protégé</p>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-black text-slate-900 dark:text-white leading-tight">Actif</p>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Tous les accès sont sécurisés</p>
          </div>
        </div>
      </div>

      {/* Role Manager */}
      <RoleManager roles={roles} />
    </div>
  );
}
