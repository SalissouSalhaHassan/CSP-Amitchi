"use client";

import React, { useState, useTransition } from "react";
import { 
  Users, Search, Shield, ShieldCheck, Mail, 
  MoreHorizontal, Edit, Trash2, Globe, UserCheck
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { deleteUser } from "@/domains/auth/actions/users.actions";
import UserDialog from "./UserDialog";
import ActionMenu from "@/components/common/ActionMenu";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface UserManagerProps {
  initialUsers: any[];
  roles: any[];
  currentUser: any;
  schools?: any[];
  students?: any[];
  employees?: any[];
}

export default function UserManager({ initialUsers, roles, currentUser, schools = [], students = [], employees = [] }: UserManagerProps) {
  const [usersList, setUsersList] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [editingUser, setEditingUser] = useState<any>(null);

  const filteredUsers = usersList.filter(u => 
    u.utilisateur.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.nomPrenom?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: number) => {
    try {
      // 1. Try direct REST API first (immune to subdomains/serverAction CORS issues)
      const res = await fetch(`/api/security/users`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setUsersList(prev => prev.filter(u => u.id !== id));
        toast.success("Utilisateur supprimé avec succès");
        return { success: true };
      }

      // 2. If API fails, try server action as fallback
      const actionRes = await deleteUser(id);
      if (actionRes.success) {
        setUsersList(prev => prev.filter(u => u.id !== id));
        toast.success("Utilisateur supprimé avec succès");
        return { success: true };
      } else {
        const errMsg = actionRes.error || data.error || "Erreur lors de la suppression";
        toast.error(errMsg);
        return { success: false, error: errMsg };
      }
    } catch (err: any) {
      console.error("[handleDelete] Error:", err);
      // Fallback attempt
      try {
        const actionRes = await deleteUser(id);
        if (actionRes.success) {
          setUsersList(prev => prev.filter(u => u.id !== id));
          toast.success("Utilisateur supprimé avec succès");
          return { success: true };
        }
      } catch (_) {}

      const errMsg = err?.message || "Erreur réseau lors de la suppression";
      toast.error(errMsg);
      return { success: false, error: errMsg };
    }
  };

  const handleSaveSuccess = (savedUser?: any) => {
    if (savedUser && savedUser.id) {
      setUsersList(prev => {
        const exists = prev.some(u => u.id === savedUser.id);
        if (exists) {
          return prev.map(u => u.id === savedUser.id ? { ...u, ...savedUser } : u);
        }
        return [savedUser, ...prev];
      });
    }
    setEditingUser(null);
    startTransition(async () => {
      try {
        const { getUsers } = await import("@/domains/auth/actions/users.actions");
        const fresh = await getUsers();
        if (fresh.success && fresh.data) {
          setUsersList(fresh.data);
        }
      } catch (_) {}
    });
  };

  return (
    <div className="space-y-6">
      {/* Hidden UserDialog for editing */}
      <UserDialog 
        user={editingUser} 
        roles={roles} 
        schools={schools}
        students={students}
        employees={employees}
        currentUser={currentUser}
        onSuccess={handleSaveSuccess} 
        openOverride={!!editingUser}
        onOpenChangeOverride={(open) => !open && setEditingUser(null)}
      />

      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500" size={18} />
          <Input 
            placeholder="Rechercher par nom ou identifiant..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 rounded-2xl border-slate-100 dark:border-slate-800 bg-white dark:bg-[#131622] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 transition-all font-medium"
          />
        </div>
        <UserDialog roles={roles} schools={schools} students={students} employees={employees} currentUser={currentUser} onSuccess={handleSaveSuccess} />
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredUsers.map((user) => (
          <div key={user.id} className="group bg-white dark:bg-[#131622] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-1 flex flex-col shadow-sm hover:shadow-2xl hover:shadow-indigo-50 dark:hover:shadow-indigo-500/10 transition-all duration-500 relative overflow-hidden">
            <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-[2.2rem] p-7 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-2xl shadow-sm group-hover:scale-110 transition-transform duration-500 relative overflow-hidden shrink-0">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.nomPrenom || user.utilisateur} className="w-full h-full object-cover" />
                    ) : (
                      <span>{user.nomPrenom?.charAt(0).toUpperCase() || user.utilisateur.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white tracking-tight leading-tight text-lg">{user.nomPrenom || user.utilisateur}</h4>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">@{user.utilisateur}</span>
                    </div>
                  </div>
                </div>
                <ActionMenu 
                  title={`Gérer @${user.utilisateur}`}
                  onDelete={() => handleDelete(user.id)}
                  onEdit={() => setEditingUser(user)}
                />
              </div>

              <div className="space-y-4 flex-grow">
                <div className="flex flex-wrap gap-2">
                  <Badge className={`rounded-xl px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border-none ${user.admin ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-700'}`}>
                    {user.admin ? 'Administrateur' : 'Membre'}
                  </Badge>
                  {user.superAdmin ? (
                    <Badge variant="outline" className="rounded-xl px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <Shield size={10} className="mr-1.5 text-rose-500" /> Super Admin
                    </Badge>
                  ) : user.role ? (
                    <Badge variant="outline" className="rounded-xl px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      <Shield size={10} className="mr-1.5 text-indigo-500 dark:text-indigo-400" /> {user.role.roleName}
                    </Badge>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-3 border border-slate-100 dark:border-slate-700/80 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Niveau</p>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Globe size={12} className="text-indigo-400" />
                      {user.educationalLevel || "Primaire"}
                    </div>
                  </div>
                  {currentUser?.superAdmin && user.school ? (
                    <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-3 border border-slate-100 dark:border-slate-700/80 shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">École</p>
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate flex items-center gap-1.5" title={user.school.name}>
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        {user.school.name}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-3 border border-slate-100 dark:border-slate-700/80 shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Langue</p>
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="w-4 h-3 bg-slate-100 dark:bg-slate-700 rounded-[2px] flex items-center justify-center text-[8px]">{user.langue}</span>
                        {user.langue === "FR" ? "Français" : user.langue === "AR" ? "العربية" : "English"}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <ShieldCheck size={16} />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accès Actif</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic">
                    {user.createdAt ? format(new Date(user.createdAt), "dd MMM yyyy", { locale: fr }) : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Background Decoration */}
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-600 opacity-[0.02] rounded-full group-hover:scale-150 transition-transform duration-1000" />
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="py-24 text-center bg-slate-50/50 rounded-[4rem] border-2 border-dashed border-slate-200">
          <div className="p-8 bg-white rounded-full shadow-sm w-fit mx-auto mb-6">
            <Users size={64} className="text-slate-200" />
          </div>
          <h3 className="text-2xl font-black text-slate-400 uppercase tracking-widest">Aucun utilisateur</h3>
          <p className="text-slate-400 mt-2 font-medium">Les utilisateurs créés apparaîtront ici.</p>
        </div>
      )}
    </div>
  );
}
