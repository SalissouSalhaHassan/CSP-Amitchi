"use client";

import React, { useState, useTransition } from 'react';
import { 
  Shield, Plus, Trash2, Save, Search,
  ChevronRight, Users, Eye, Edit, Trash,
  GraduationCap, Wallet, UserRound, CalendarCheck2,
  BookOpen, Package, ShieldCheck, MessageSquare,
  Bus, Home, Store, FileText, LibraryBig
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createRole, deleteRole, updateRolePermissions } from '@/domains/auth/actions/roles.actions';
import { cn } from '@/lib/utils';

const FIELD_LABELS: Record<string, string> = {
  nomEtudiant: "Nom de l'élève",
  dateNaissance: "Date de naissance",
  mobile: "Téléphone Mobile",
  fraisMensuels: "Frais Mensuels",
  behaviorScore: "Note de conduite",
  montantPaye: "Montant Payé",
  modePaiement: "Mode de Paiement",
  revenueAmount: "Montant des Revenus",
  expenseAmount: "Montant des Dépenses",
  salaireBase: "Salaire de Base",
  cnic: "Carte d'identité / CNIC",
  saisieNotes: "Saisie des Notes",
  gestionDevoirs: "Gestion des Devoirs (DS)",
  bulletins: "Bulletins & Résultats",
  emploisDuTemps: "Emplois du temps",
  examens: "Examens & Évaluations",
  appelEleves: "Appel des Élèves",
  appelEnseignants: "Appel des Enseignants",
};

const MODULE_CONFIG = [
  { 
    name: "Students",   
    label: "Students",   
    icon: GraduationCap, 
    color: "bg-violet-100 text-violet-600",
    fields: ["nomEtudiant", "dateNaissance", "mobile", "fraisMensuels", "behaviorScore"]
  },
  { 
    name: "Finance",    
    label: "Finance",    
    icon: Wallet,         
    color: "bg-emerald-100 text-emerald-600",
    fields: ["montantPaye", "modePaiement", "revenueAmount", "expenseAmount"]
  },
  { 
    name: "HR",         
    label: "HR",         
    icon: Users,          
    color: "bg-rose-100 text-rose-600",
    fields: ["salaireBase", "dateNaissance", "mobile", "cnic"]
  },
  { 
    name: "Attendance", 
    label: "Attendance", 
    icon: CalendarCheck2, 
    color: "bg-sky-100 text-sky-600",
    fields: ["appelEleves", "appelEnseignants"]
  },
  { 
    name: "Academics",  
    label: "Academics",  
    icon: BookOpen,       
    color: "bg-indigo-100 text-indigo-600",
    fields: ["saisieNotes", "gestionDevoirs", "bulletins", "emploisDuTemps", "examens"]
  },
  { name: "Inventory",  label: "Inventory",  icon: Package,        color: "bg-amber-100 text-amber-600" },
  { name: "Security",   label: "Security",   icon: ShieldCheck,    color: "bg-red-100 text-red-600" },
  { name: "Messaging",  label: "Messaging",  icon: MessageSquare,  color: "bg-teal-100 text-teal-600" },
  { name: "Pedagogy",   label: "Pédagogie",  icon: BookOpen,       color: "bg-purple-100 text-purple-600" },
  { name: "Transport",  label: "Transport",  icon: Bus,            color: "bg-blue-100 text-blue-600" },
  { name: "Library",    label: "Bibliothèque",icon: LibraryBig,    color: "bg-sky-100 text-sky-700" },
  { name: "Hostel",     label: "Internat",    icon: Home,          color: "bg-emerald-100 text-emerald-600" },
  { name: "Canteen",    label: "Cantine",     icon: Store,         color: "bg-amber-100 text-amber-700" },
  { name: "Canevas",    label: "Canevas Scolaires", icon: FileText, color: "bg-cyan-100 text-cyan-600" },
];

const ROLE_ICONS = [
  { icon: Shield,        color: "bg-indigo-100 text-indigo-600" },
  { icon: GraduationCap, color: "bg-emerald-100 text-emerald-600" },
  { icon: UserRound,     color: "bg-amber-100 text-amber-600" },
  { icon: Wallet,        color: "bg-sky-100 text-sky-600" },
  { icon: ShieldCheck,   color: "bg-violet-100 text-violet-600" },
  { icon: BookOpen,      color: "bg-rose-100 text-rose-600" },
  { icon: Package,       color: "bg-teal-100 text-teal-600" },
  { icon: Users,         color: "bg-orange-100 text-orange-600" },
];

interface RoleManagerProps {
  roles: any[];
}

export default function RoleManager({ roles: initialRoles }: RoleManagerProps) {
  const [roles, setRoles] = useState(initialRoles);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [editPermissions, setEditPermissions] = useState<Record<string, { canView: boolean; canEdit: boolean; canDelete: boolean; fieldPermissions?: any }>>({});
  const [isPending, startTransition] = useTransition();
  const [newRoleName, setNewRoleName] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const selectedRole = roles.find(r => r.id === selectedRoleId);

  // Initialize edit state when selecting a role
  const selectRole = (roleId: number) => {
    setSelectedRoleId(roleId);
    const role = roles.find(r => r.id === roleId);
    if (role) {
      const perms: Record<string, { canView: boolean; canEdit: boolean; canDelete: boolean; fieldPermissions?: any }> = {};
      MODULE_CONFIG.forEach(m => {
        const existing = role.permissions?.find((p: any) => p.moduleName === m.name);
        let fieldPerms = {};
        if (existing?.fieldPermissions) {
          try {
            fieldPerms = typeof existing.fieldPermissions === 'string' 
              ? JSON.parse(existing.fieldPermissions) 
              : existing.fieldPermissions;
          } catch (e) {
            console.error("Error parsing field permissions", e);
          }
        }
        perms[m.name] = {
          canView: existing?.canView ?? false,
          canEdit: existing?.canEdit ?? false,
          canDelete: existing?.canDelete ?? false,
          fieldPermissions: fieldPerms,
        };
      });
      setEditPermissions(perms);
    }
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;
    startTransition(async () => {
      try {
        const res = await createRole(newRoleName.trim()) as any;
        const newRole = res?.data || (res?.id ? res : null);
        if (newRole && (newRole.id || newRole.roleName)) {
          toast.success(`Rôle "${newRoleName}" créé avec succès`);
          setRoles(prev => [...prev, { ...newRole, permissions: [], users: [] }]);
          setNewRoleName("");
          setShowAddInput(false);
          selectRole(newRole.id);
        } else {
          toast.error(res?.error || "Erreur lors de la création du rôle");
        }
      } catch (err: any) {
        toast.error(err?.message || "Erreur réseau lors de la création du rôle");
      }
    });
  };

  const handleDeleteRole = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const role = roles.find(r => r.id === id);
    if (!confirm(`Supprimer le rôle "${role?.roleName}" ? Cette action est irréversible.`)) return;
    startTransition(() => {
      deleteRole(id).then(() => {
        setRoles(prev => prev.filter(r => r.id !== id));
        if (selectedRoleId === id) {
          setSelectedRoleId(null);
          setEditPermissions({});
        }
        toast.success("Rôle supprimé");
      });
    });
  };

  const togglePermission = (moduleName: string, type: 'canView' | 'canEdit' | 'canDelete') => {
    setEditPermissions(prev => ({
      ...prev,
      [moduleName]: {
        ...prev[moduleName],
        [type]: !prev[moduleName]?.[type],
      }
    }));
  };

  const toggleFieldPermission = (moduleName: string, fieldName: string, type: 'view' | 'edit') => {
    setEditPermissions(prev => {
      const modulePerms = prev[moduleName] || { canView: false, canEdit: false, canDelete: false };
      const currentFields = modulePerms.fieldPermissions || {};
      const defaultView = modulePerms.canView ?? false;
      const defaultEdit = modulePerms.canEdit ?? false;
      const currentField = currentFields[fieldName] || { view: defaultView, edit: defaultEdit };

      return {
        ...prev,
        [moduleName]: {
          ...modulePerms,
          fieldPermissions: {
            ...currentFields,
            [fieldName]: {
              ...currentField,
              [type]: !currentField[type],
            }
          }
        }
      };
    });
  };

  const handleSavePermissions = () => {
    if (!selectedRoleId) return;
    const permArray = Object.entries(editPermissions).map(([moduleName, perms]) => ({
      moduleName,
      ...perms,
    }));
    startTransition(async () => {
      try {
        const res = await updateRolePermissions(selectedRoleId, permArray) as any;
        if (res?.success || res?.data?.success || (!res?.error && res?.data)) {
          toast.success("Permissions enregistrées avec succès");
          // Update local roles state
          setRoles(prev => prev.map(r => 
            r.id === selectedRoleId 
              ? { ...r, permissions: permArray.filter(p => p.canView || p.canEdit || p.canDelete || (p.fieldPermissions && Object.keys(p.fieldPermissions).length > 0)) }
              : r
          ));
        } else {
          toast.error(res?.error || "Erreur lors de la sauvegarde");
        }
      } catch (err: any) {
        toast.error(err?.message || "Erreur réseau lors de la sauvegarde");
      }
    });
  };

  const filteredRoles = roles.filter(r => 
    r.roleName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleVisual = (index: number) => ROLE_ICONS[index % ROLE_ICONS.length];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Panel – Roles */}
      <div className="lg:col-span-4">
        <div className="bg-white dark:bg-[#131622] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Panel Header */}
          <div className="p-6 pb-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Rôles Utilisateurs</h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 font-medium mt-0.5">Définissez et gérez les rôles du système</p>
          </div>

          {/* Search + Add */}
          <div className="px-6 pb-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500" size={16} />
              <Input 
                placeholder="Rechercher un rôle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm"
              />
            </div>
            <div className="flex gap-1.5 items-center">
              {showAddInput ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    placeholder="Nom du rôle..."
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateRole();
                      if (e.key === 'Escape') {
                        setShowAddInput(false);
                        setNewRoleName("");
                      }
                    }}
                    className="h-10 w-36 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateRole}
                    disabled={isPending || !newRoleName.trim()}
                    className="h-10 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 transition-colors disabled:opacity-50"
                  >
                    OK
                  </button>
                  <button
                    onClick={() => {
                      setShowAddInput(false);
                      setNewRoleName("");
                    }}
                    className="h-10 px-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs shrink-0 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddInput(true)}
                  disabled={isPending}
                  title="Créer un nouveau rôle"
                  className="h-10 w-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shrink-0 transition-colors shadow-sm shadow-indigo-200 dark:shadow-none"
                >
                  <Plus size={18} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>

          {/* Roles List */}
          <div className="px-4 pb-4 space-y-1 max-h-[480px] overflow-y-auto">
            {filteredRoles.map((role, index) => {
              const visual = getRoleVisual(index);
              const IconComp = visual.icon;
              const isSelected = selectedRoleId === role.id;
              const userCount = role.users?.length || 0;

              return (
                <div
                  key={role.id}
                  onClick={() => selectRole(role.id)}
                  className={cn(
                    "group flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer transition-all duration-200",
                    isSelected 
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none" 
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    isSelected ? "bg-white/20" : visual.color
                  )}>
                    <IconComp size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-bold truncate", isSelected ? "text-white" : "text-slate-800 dark:text-slate-100")}>
                      {role.roleName}
                    </p>
                    <p className={cn("text-[11px] font-medium", isSelected ? "text-indigo-200" : "text-slate-400 dark:text-slate-500")}>
                      {userCount} utilisateur{userCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleDeleteRole(e, role.id)}
                      className={cn(
                        "p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all",
                        isSelected 
                          ? "hover:bg-white/20 text-white" 
                          : "hover:bg-rose-50 dark:hover:bg-rose-500/20 text-rose-400 hover:text-rose-600"
                      )}
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight size={16} className={cn(isSelected ? "text-white/60" : "text-slate-300 dark:text-slate-600")} />
                  </div>
                </div>
              );
            })}

            {filteredRoles.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-slate-400 text-sm font-medium">Aucun rôle trouvé</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel – Permissions */}
      <div className="lg:col-span-8">
        {selectedRole ? (
          <div className="bg-white dark:bg-[#131622] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Permissions Header */}
            <div className="p-6 flex items-center justify-between border-b border-slate-50 dark:border-slate-800/80">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Shield size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Permissions: <span className="text-indigo-600 dark:text-indigo-400">{selectedRole.roleName}</span>
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-400 font-medium mt-0.5">Gérez les accès aux modules pour ce rôle</p>
                </div>
              </div>
              <Button
                onClick={handleSavePermissions}
                disabled={isPending}
                className="h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white px-6 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-100 dark:shadow-none transition-all disabled:opacity-50"
              >
                <Save size={16} />
                {isPending ? "Sauvegarde..." : "Enregistrer"}
              </Button>
            </div>

            {/* Permissions Grid */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {MODULE_CONFIG.map((mod) => {
                const perms = editPermissions[mod.name] || { canView: false, canEdit: false, canDelete: false };
                const isActive = perms.canView || perms.canEdit || perms.canDelete;
                const IconComp = mod.icon;

                return (
                  <div 
                    key={mod.name} 
                    className={cn(
                      "rounded-2xl border p-5 transition-all duration-200",
                      isActive 
                        ? "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm" 
                        : "border-slate-100/60 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/20"
                    )}
                  >
                    {/* Module Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", mod.color)}>
                          <IconComp size={16} />
                        </div>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{mod.label}</span>
                      </div>
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        isActive 
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                      )}>
                        {isActive ? "Actif" : "Inactif"}
                      </span>
                    </div>

                    {/* Permission Buttons */}
                    <div className="flex items-center gap-2">
                      {/* VOIR */}
                      <button
                        onClick={() => togglePermission(mod.name, 'canView')}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all duration-200",
                          perms.canView
                            ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                            : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-600 hover:text-slate-500 dark:hover:text-slate-200"
                        )}
                      >
                        <Eye size={13} />
                        Voir
                      </button>

                      {/* ÉDITER */}
                      <button
                        onClick={() => togglePermission(mod.name, 'canEdit')}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all duration-200",
                          perms.canEdit
                            ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400"
                            : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-600 hover:text-slate-500 dark:hover:text-slate-200"
                        )}
                      >
                        <Edit size={13} />
                        Éditer
                      </button>

                      {/* SUPPRIMER */}
                      <button
                        onClick={() => togglePermission(mod.name, 'canDelete')}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all duration-200",
                          perms.canDelete
                            ? "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400"
                            : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-600 hover:text-slate-500 dark:hover:text-slate-200"
                        )}
                      >
                        <Trash size={13} />
                        Supprimer
                      </button>
                    </div>

                    {/* Field Permissions (Expansion) */}
                    {mod.fields && (
                      <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/60">
                        <button 
                          onClick={() => setExpandedModule(expandedModule === mod.name ? null : mod.name)}
                          className="flex items-center justify-between w-full text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          <span>Permissions par sous-module / champ</span>
                          <ChevronRight size={14} className={cn("transition-transform", expandedModule === mod.name ? "rotate-90" : "")} />
                        </button>

                        {expandedModule === mod.name && (
                          <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            {mod.fields.map(field => {
                              const defaultView = perms.canView ?? false;
                              const defaultEdit = perms.canEdit ?? false;
                              const fieldConfig = perms.fieldPermissions?.[field] || { view: defaultView, edit: defaultEdit };
                              return (
                                <div key={field} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{FIELD_LABELS[field] || field}</span>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => toggleFieldPermission(mod.name, field, 'view')}
                                      className={cn(
                                        "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all",
                                        fieldConfig.view ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300" : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-400"
                                      )}
                                    >
                                      Voir
                                    </button>
                                    <button
                                      onClick={() => toggleFieldPermission(mod.name, field, 'edit')}
                                      className={cn(
                                        "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all",
                                        fieldConfig.edit ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-400"
                                      )}
                                    >
                                      Éditer
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#131622] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center p-16 min-h-[540px]">
            <div className="w-20 h-20 rounded-3xl bg-slate-50 dark:bg-slate-800/60 text-slate-200 dark:text-slate-600 flex items-center justify-center mb-6">
              <Shield size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Aucun rôle sélectionné</h3>
            <p className="text-slate-400 dark:text-slate-400 max-w-xs mx-auto mt-2 text-sm font-medium">
              Sélectionnez un rôle à gauche pour gérer ses permissions d'accès aux modules.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
