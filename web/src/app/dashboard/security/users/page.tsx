export const dynamic = "force-dynamic";

import { getUsers } from "@/domains/auth/actions/users.actions";
import { getRoles } from "@/domains/auth/actions/roles.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getAllSchools } from "@/domains/auth/actions/super-admin.actions";
import { getStudents } from "@/domains/students/actions/students.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { getUserRoleType } from "@/domains/auth/services/rbac";
import UserManager from "./components/UserManager";
import { Users, ShieldAlert, Bell, ChevronDown, UserPlus, Shield, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function UsersPage() {
  const currentUser = await getCurrentUser();
  const roleType = currentUser ? await getUserRoleType(currentUser) : null;
  const enhancedUser = currentUser ? { ...currentUser, roleType } : null;
  
  const [usersRes, rolesRes, schoolsRes, studentsRes, employeesRes] = await Promise.all([
    getUsers(),
    getRoles(),
    currentUser?.superAdmin ? getAllSchools() : Promise.resolve({ data: [] }),
    getStudents(),
    getEmployees(),
  ]);

  const users = (usersRes as any)?.data || [];
  const roles = (rolesRes as any)?.data || [];
  const schools = (schoolsRes as any)?.data || [];
  const students = (studentsRes as any)?.data?.data || (studentsRes as any)?.data || [];
  const employees = (employeesRes as any)?.data?.data || (employeesRes as any)?.data || [];

  console.log("Users in Page:", users.length);

  const userName = currentUser?.nomPrenom || currentUser?.utilisateur || "Admin";
  const userRole = currentUser?.admin ? "Administrateur" : currentUser?.role?.roleName || "Utilisateur";

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700">
      {/* ... existing header and stats ... */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-indigo-700 text-white flex items-center justify-center shadow-2xl shadow-indigo-200 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <Users size={36} className="relative z-10" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Utilisateurs & Équipes</h1>
              <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20">Live</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-500 dark:text-indigo-400" />
              Gérez les accès, les rôles et la sécurité de votre espace de gestion
            </p>
          </div>
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-4 px-6 py-4 rounded-[2rem] bg-white dark:bg-[#131622] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-lg font-black shadow-lg shadow-indigo-200 dark:shadow-none group-hover:scale-105 transition-transform">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-[120px]">
              <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">{userName}</p>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mt-1 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {userRole}
              </div>
            </div>
            <ChevronDown size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors" />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-[#131622] p-1 rounded-[2.8rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-2xl hover:shadow-indigo-50 dark:hover:shadow-indigo-500/10 transition-all duration-500 overflow-hidden relative">
          <div className="bg-slate-50/50 dark:bg-slate-900/60 rounded-[2.5rem] p-8 flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500">
              <Users size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Utilisateurs</p>
              <p className="text-4xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">{users.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-[#131622] p-1 rounded-[2.8rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-2xl hover:shadow-amber-50 dark:hover:shadow-amber-500/10 transition-all duration-500 overflow-hidden relative">
          <div className="bg-slate-50/50 dark:bg-slate-900/60 rounded-[2.5rem] p-8 flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500">
              <ShieldAlert size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Administrateurs</p>
              <p className="text-4xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">{users.filter((u: any) => u.admin).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#1e1b4b] to-[#312e81] p-1 rounded-[2.8rem] text-white shadow-2xl shadow-indigo-100 flex group overflow-hidden relative border border-white/5">
          <div className="bg-white/[0.03] backdrop-blur-sm rounded-[2.5rem] p-8 flex-1 flex items-center justify-between">
            <div className="relative z-10">
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Actions de Sécurité</p>
              <h3 className="text-2xl font-black tracking-tight">Gestion des Équipes</h3>
              {currentUser?.superAdmin || (!currentUser?.educationalLevel || currentUser?.educationalLevel === "Tous" || currentUser?.educationalLevel === "All") ? (
                <Link href="/dashboard/security">
                  <Button variant="secondary" size="sm" className="mt-5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-white text-indigo-900 hover:bg-indigo-50 transition-all h-10 px-6 border-none shadow-lg shadow-black/20">
                    Configurer les Rôles
                  </Button>
                </Link>
              ) : (
                <span className="mt-5 inline-block px-4 py-2 rounded-xl bg-white/10 text-white text-[10px] font-black uppercase tracking-widest border border-white/10">
                  Accès Limité à la Section
                </span>
              )}
            </div>
            <Shield size={72} className="opacity-10 absolute -right-4 -bottom-4 group-hover:scale-125 transition-transform duration-700" />
          </div>
        </div>
      </div>

      {/* User Manager Component */}
      <UserManager initialUsers={users} roles={roles} currentUser={enhancedUser} schools={schools} students={students} employees={employees} />
    </div>
  );
}
