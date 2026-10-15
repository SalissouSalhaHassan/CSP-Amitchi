"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  User,
  Lock,
  Shield,
  Pencil,
  X,
  Building2,
  CheckCircle2,
  AlertCircle,
  Crown,
  Languages,
  GraduationCap,
  Users,
  Plus,
  Link2,
  Loader2,
  Camera,
  Trash2 as TrashIcon,
} from "lucide-react";
import { saveUser } from "@/domains/auth/actions/users.actions";
import { createRoleInline } from "@/domains/auth/actions/roles.actions";
import { toast } from "sonner";
import { useSpeech } from "@/hooks/use-speech";

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserDialogProps {
  user?: any;
  roles: any[];
  schools?: any[];
  students?: any[];
  employees?: any[];
  currentUser?: any;
  onSuccess?: (savedUser?: any) => void;
  trigger?: React.ReactNode;
  isMenuItem?: boolean;
  openOverride?: boolean;
  onOpenChangeOverride?: (open: boolean) => void;
}

// ─── Static data ──────────────────────────────────────────────────────────────
const LANGUAGES = [
  { value: "FR", label: "Français", flag: "🇫🇷" },
  { value: "AR", label: "العربية", flag: "🇩🇿" },
  { value: "EN", label: "English", flag: "🇬🇧" },
];

const EDUCATION_LEVELS = [
  { value: "Primaire",    label: "Primaire",    icon: "📚" },
  { value: "Collège",     label: "Collège",     icon: "📖" },
  { value: "Lycée",       label: "Lycée",       icon: "🎓" },
  { value: "Université",  label: "Université",  icon: "🏛️" },
];

function getLevelFamily(level: string | null | undefined): "primary" | "middle" | "secondary" | "university" | null {
  if (!level) return null;
  const norm = level.toLowerCase().trim();
  if (["tous", "all", "administration", "gestion scolaire", "administration generale", "administration générale", "toutes les étapes", "tous les cycles", "tous les niveaux"].includes(norm)) {
    return null;
  }
  if (norm.includes("universit") || norm.includes("superieur") || norm.includes("licence") || norm.includes("master") || norm.includes("doctorat") || norm.includes("lmd") || norm.includes("جامع")) {
    return "university";
  }
  if (norm.includes("coll") || norm.includes("moyen") || norm.includes("cem") || norm.includes("اعداد") || norm.includes("متوسط")) {
    return "middle";
  }
  if (norm.includes("lyc") || norm.includes("secondaire") || norm.includes("ثانوي")) {
    return "secondary";
  }
  if (norm.includes("prim") || norm.includes("elem") || norm.includes("mat") || norm.includes("creche") || norm.includes("ابتدائ")) {
    return "primary";
  }
  return null;
}

function getMatchingEducationLevel(family: "primary" | "middle" | "secondary" | "university" | null): string {
  switch (family) {
    case "university": return "Université";
    case "middle": return "Collège";
    case "secondary": return "Lycée";
    case "primary": return "Primaire";
    default: return "Primaire";
  }
}

function isRoleAllowedForLevelDirector(roleName: string): boolean {
  const r = (roleName || "").toLowerCase().trim();
  if (
    r.includes("directeur") ||
    r.includes("dirigeant") ||
    r.includes("مدير") ||
    r.includes("admin") ||
    r.includes("superadmin") ||
    r.includes("comptable") ||
    r.includes("caissier") ||
    r.includes("finance") ||
    r.includes("financier") ||
    r.includes("ministere") ||
    r.includes("ministère") ||
    r.includes("dren") ||
    r.includes("dden") ||
    r.includes("inspection")
  ) {
    return false;
  }
  return true;
}

// ─── Chip option ──────────────────────────────────────────────────────────────
function parseSelectedLevels(value: string) {
  if (!value || value === "Tous" || value === "All") return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function formatSelectedLevels(levels: string[]) {
  return levels.length > 0 ? levels.join(",") : "Tous";
}

type ChipColor = "indigo" | "violet" | "emerald" | "amber" | "rose";

const COLOR_MAP: Record<ChipColor, { bg: string; border: string; text: string }> = {
  indigo:  { bg: "bg-indigo-600",  border: "border-indigo-600",  text: "text-white" },
  violet:  { bg: "bg-violet-600",  border: "border-violet-600",  text: "text-white" },
  emerald: { bg: "bg-emerald-600", border: "border-emerald-600", text: "text-white" },
  amber:   { bg: "bg-amber-500",   border: "border-amber-500",   text: "text-white" },
  rose:    { bg: "bg-rose-500",    border: "border-rose-500",    text: "text-white" },
};

function ChipOption({
  selected,
  onClick,
  children,
  color = "indigo",
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: ChipColor;
}) {
  const c = COLOR_MAP[color];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold
        transition-all duration-150 cursor-pointer select-none
        ${selected
          ? `${c.bg} ${c.border} ${c.text} shadow-sm`
          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:shadow-sm"
        }`}
    >
      {selected && <CheckCircle2 size={12} className="shrink-0" />}
      {children}
    </button>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, label, iconBg }: { icon: React.ReactNode; label: string; iconBg: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function UserDialog({
  user,
  roles,
  schools = [],
  students = [],
  employees = [],
  currentUser,
  onSuccess,
  trigger,
  isMenuItem,
  openOverride,
  onOpenChangeOverride,
}: UserDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open    = openOverride !== undefined ? openOverride : internalOpen;
  const setOpen = useCallback(
    (v: boolean) => { onOpenChangeOverride ? onOpenChangeOverride(v) : setInternalOpen(v); },
    [onOpenChangeOverride],
  );
  const close = useCallback(() => setOpen(false), [setOpen]);

  const userLevelFamily = getLevelFamily(currentUser?.educationalLevel);
  const isSuperAdmin = !!currentUser?.superAdmin;
  const isGeneralAdmin = isSuperAdmin || !!currentUser?.admin || (
    currentUser?.roleType === "general_director" ||
    (currentUser?.role?.roleName || "").toLowerCase().includes("directeur général") ||
    (currentUser?.role?.roleName || "").toLowerCase().includes("directeur")
  );
  const isLevelDirector = !isSuperAdmin && !isGeneralAdmin && currentUser?.roleType === "level_director";

  const initialLevelDefault = isLevelDirector && userLevelFamily
    ? getMatchingEducationLevel(userLevelFamily)
    : "Primaire";

  const { speak } = useSpeech();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    utilisateur: "", nomPrenom: "", motDePasse: "",
    admin: false, superAdmin: false,
    roleId: "", langue: "FR", educationalLevel: initialLevelDefault,
    avatarUrl: "",
    supabaseId: "", schoolId: "",
    studentId: "", employeeId: "",
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      toast.error("La taille de la photo ne doit pas dépasser 3 Mo.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setFormData((prev) => ({ ...prev, avatarUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  // Inline role creation state
  const [rolesList, setRolesList] = useState<any[]>(roles);
  const [showNewRoleInput, setShowNewRoleInput] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [creatingRole, setCreatingRole] = useState(false);

  // Determine if liaison section should appear
  const selectedRole = rolesList.find(r => r.id.toString() === formData.roleId);
  const selectedRoleName = (selectedRole?.roleName || "").toLowerCase();
  const isEleveRole   = selectedRoleName.includes("élève") || selectedRoleName.includes("etudiant") || selectedRoleName.includes("student");
  const isParentRole  = selectedRoleName.includes("parent") || selectedRoleName.includes("tuteur");
  const isTeacherRole = selectedRoleName.includes("professeur") || selectedRoleName.includes("enseignant") || selectedRoleName.includes("teacher");
  const showLiaison   = isEleveRole || isParentRole || isTeacherRole;

  // Reset + announce on open
  useEffect(() => {
    if (!open) return;
    setRolesList(roles);
    setShowNewRoleInput(false);
    setNewRoleName("");
    const initialEduLevel = user
      ? (user?.educationalLevel || user?.educational_level || initialLevelDefault)
      : initialLevelDefault;

    setFormData({
      utilisateur:      user?.utilisateur      || "",
      nomPrenom:        user?.nomPrenom        || user?.nom_prenom || "",
      motDePasse:       "",
      admin:            isLevelDirector ? false : (user?.admin || false),
      superAdmin:       isLevelDirector ? false : (user?.superAdmin || user?.super_admin || false),
      roleId:           (user?.roleId ?? user?.role_id)?.toString()    || "",
      langue:           user?.langue           || "FR",
      educationalLevel: initialEduLevel,
      avatarUrl:        user?.avatarUrl        || user?.avatar_url || "",
      supabaseId:       user?.supabaseId       || user?.supabase_id || "",
      schoolId:         (user?.schoolId ?? user?.school_id)?.toString()  || "",
      studentId:        (user?.studentId ?? user?.student_id)?.toString()  || "",
      employeeId:       (user?.employeeId ?? user?.employee_id)?.toString() || "",
    });
    speak(
      user
        ? "Modification de l'utilisateur."
        : "Ajout d'un nouvel utilisateur.",
      "fr-FR",
    );
  }, [open, user, speak, roles]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, close]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const submissionData = {
      ...formData,
      admin:            isLevelDirector ? false : formData.admin,
      superAdmin:       isLevelDirector ? false : formData.superAdmin,
      roleId:           formData.roleId           === "" ? null : formData.roleId,
      langue:           formData.langue           || "FR",
      educationalLevel: isLevelDirector && userLevelFamily
        ? getMatchingEducationLevel(userLevelFamily)
        : (formData.educationalLevel || "Primaire"),
      studentId:        formData.studentId  === "" ? null : formData.studentId,
      employeeId:       formData.employeeId === "" ? null : formData.employeeId,
    };
    try {
      // 1. Try direct REST API first (handles subdomains and proxies seamlessly)
      const res = await fetch(`/api/security/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...submissionData, id: user?.id }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        toast.success(user ? "Utilisateur modifié avec succès" : "Utilisateur créé avec succès");
        close();
        onSuccess?.(data.data);
        return;
      }

      // 2. Try Server Action fallback if API returned business error
      const actionRes = await saveUser(submissionData, user?.id);
      if (actionRes.success) {
        toast.success(user ? "Utilisateur modifié avec succès" : "Utilisateur créé avec succès");
        close();
        onSuccess?.(actionRes.data);
      } else {
        toast.error(actionRes.error || data.error || "Une erreur est survenue lors de l'enregistrement");
      }
    } catch (err: any) {
      console.error("[handleSubmit] Error:", err);
      // Fallback attempt
      try {
        const actionRes = await saveUser(submissionData, user?.id);
        if (actionRes.success) {
          toast.success(user ? "Utilisateur modifié avec succès" : "Utilisateur créé avec succès");
          close();
          onSuccess?.(actionRes.data);
          return;
        }
      } catch (_) {}

      toast.error(err?.message || "Une erreur inattendue est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;

    if (!currentUser?.superAdmin) {
      const lower = newRoleName.trim().toLowerCase();
      const forbidden = ["superadmin", "super admin", "ministere", "ministère", "dren", "dden", "inspection"];
      if (forbidden.some((term) => lower.includes(term))) {
        toast.error("Ce nom de rôle est réservé à l'administration supérieure.");
        return;
      }
    }

    setCreatingRole(true);
    try {
      const res = await createRoleInline(newRoleName);
      if (res.success && res.data) {
        const created = res.data;
        setRolesList(prev => [...prev, created]);
        setFormData(prev => ({ ...prev, roleId: created.id.toString() }));
        setShowNewRoleInput(false);
        setNewRoleName("");
        toast.success(`Rôle "${created.roleName}" créé et sélectionné`);
      } else {
        toast.error(res.error || "Erreur lors de la création du rôle");
      }
    } finally {
      setCreatingRole(false);
    }
  };

  const requiredMissing =
    !formData.utilisateur.trim() ||
    !formData.nomPrenom.trim()   ||
    (!user && !formData.motDePasse.trim());

  const selectedLevels = parseSelectedLevels(formData.educationalLevel);
  const hasAllLevels = selectedLevels.length === 0;
  const toggleEducationalLevel = (level: string) => {
    const next = selectedLevels.includes(level)
      ? selectedLevels.filter((item) => item !== level)
      : [...selectedLevels, level];
    setFormData({ ...formData, educationalLevel: formatSelectedLevels(next) });
  };

  // ── Trigger ────────────────────────────────────────────────────────────────
  const renderTrigger = () => {
    if (openOverride !== undefined) return null;
    if (trigger) {
      return (
        <div
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className="inline-block cursor-pointer w-full"
        >
          {trigger}
        </div>
      );
    }
    if (isMenuItem) {
      return (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
          className="flex w-full items-center gap-2 p-3 rounded-xl cursor-pointer text-slate-600
            hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-sm font-semibold
            outline-none border-none bg-transparent text-left"
        >
          <Pencil size={16} />
          <span>Modifier</span>
        </button>
      );
    }
    return (
      <Button
        onClick={() => setOpen(true)}
        className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2"
      >
        <User size={18} />
        Ajouter un utilisateur
      </Button>
    );
  };

  // ── Modal (via portal) ─────────────────────────────────────────────────────
  const modal = open ? (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop — click closes */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      {/* Panel — stopPropagation so clicks inside don't reach backdrop */}
      <div
        className="relative w-full max-w-[1100px] bg-white dark:bg-[#0E1017] dark:border dark:border-slate-800 rounded-3xl shadow-2xl
          flex flex-col max-h-[90vh] overflow-hidden
          animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Sticky Header ───────────────────────────────────────────── */}
        <div className="shrink-0">
          <div className="h-1.5 w-full rounded-t-3xl bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600" />
          <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg
                  ${user
                    ? "bg-gradient-to-br from-violet-500 to-purple-600"
                    : "bg-gradient-to-br from-indigo-500 to-blue-600"
                  }`}
              >
                {user ? <Pencil size={22} /> : <User size={22} />}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {user ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-400 font-medium mt-0.5">
                  {user
                    ? "Mettez à jour les informations de compte"
                    : "Créez un nouveau compte d'accès au système"}
                </p>
              </div>
            </div>

            {/* ✕ Close button */}
            <button
              type="button"
              onClick={close}
              aria-label="Fermer"
              className="w-9 h-9 rounded-xl flex items-center justify-center
                text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────── */}
        <form
          id="user-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-8 py-6 space-y-7"
        >
          {/* IDENTITÉ */}
          <div>
            <SectionHeader
              icon={<User size={14} />}
              label="Identité & Photo"
              iconBg="bg-gradient-to-br from-blue-500 to-indigo-600"
            />
            
            {/* Avatar Photo Picker */}
            <div className="mb-5 flex items-center gap-5 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
              <div className="relative w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center overflow-hidden shrink-0 group">
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-black text-xl text-indigo-600 dark:text-indigo-400">
                    {formData.nomPrenom?.charAt(0)?.toUpperCase() || formData.utilisateur?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Photo de profil / Avatar</p>
                <div className="flex items-center gap-2 pt-0.5">
                  <label className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black tracking-wide cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-sm">
                    <Camera size={13} />
                    <span>Choisir une photo</span>
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>
                  {formData.avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, avatarUrl: "" }))}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                    >
                      <TrashIcon size={12} />
                      <span>Supprimer</span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Formats acceptés : PNG, JPG, WEBP (Max: 3 Mo)</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Identifiant */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Identifiant <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" size={15} />
                  <Input
                    placeholder="ex: jdoe"
                    value={formData.utilisateur}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        utilisateur: val,
                        supabaseId: !user ? val : prev.supabaseId,
                      }));
                    }}
                    className="pl-9 h-11 rounded-xl border-slate-200 bg-slate-50 font-bold text-sm"
                    required
                  />
                </div>
              </div>

              {/* Nom complet */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Nom Complet <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="ex: John Doe"
                  value={formData.nomPrenom}
                  onChange={(e) => setFormData({ ...formData, nomPrenom: e.target.value })}
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 font-bold text-sm"
                  required
                />
              </div>

              {/* Mot de passe */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Mot de passe{" "}
                  {user
                    ? <span className="text-slate-400 normal-case font-medium">(vide = inchangé)</span>
                    : <span className="text-rose-500">*</span>
                  }
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400" size={15} />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={formData.motDePasse}
                    onChange={(e) => setFormData({ ...formData, motDePasse: e.target.value })}
                    className="pl-9 h-11 rounded-xl border-slate-200 bg-slate-50 font-bold text-sm"
                    required={!user}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RÔLE */}
          <div>
            <SectionHeader
              icon={<Users size={14} />}
              label="Rôle"
              iconBg="bg-gradient-to-br from-violet-500 to-purple-600"
            />
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <ChipOption
                  selected={formData.roleId === ""}
                  onClick={() => setFormData({ ...formData, roleId: "" })}
                  color="indigo"
                >
                  — Aucun rôle —
                </ChipOption>
                {rolesList
                  .filter((role) => {
                    const rName = (role.roleName || "").toLowerCase().trim();
                    if (currentUser?.superAdmin || isGeneralAdmin || !!currentUser?.admin) return true;
                    const forbidden = ["superadmin", "super admin", "ministere", "ministère", "dren", "dden", "inspection"];
                    if (forbidden.some((term) => rName.includes(term))) return false;

                    if (isLevelDirector) {
                      return isRoleAllowedForLevelDirector(role.roleName);
                    }

                    return true;
                  })
                  .map((role) => (
                  <ChipOption
                    key={role.id}
                    selected={formData.roleId === role.id.toString()}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        roleId: formData.roleId === role.id.toString() ? "" : role.id.toString(),
                      })
                    }
                    color="violet"
                  >
                    <Shield size={11} />
                    {role.roleName}
                  </ChipOption>
                ))}

                {/* ── Inline Role Creator ── */}
                {!isLevelDirector && (!showNewRoleInput ? (
                  <button
                    type="button"
                    onClick={() => setShowNewRoleInput(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-indigo-300 text-indigo-600 text-xs font-bold hover:bg-indigo-50 transition-all"
                  >
                    <Plus size={12} /> Créer un rôle
                  </button>
                ) : (
                  <div className="flex items-center gap-2 mt-1 w-full">
                    <input
                      autoFocus
                      type="text"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateRole(); } if (e.key === "Escape") setShowNewRoleInput(false); }}
                      placeholder="Nom du nouveau rôle (ex: Élève)"
                      className="flex-1 h-9 px-3 rounded-xl border border-indigo-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    <button
                      type="button"
                      onClick={handleCreateRole}
                      disabled={creatingRole || !newRoleName.trim()}
                      className="h-9 px-4 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {creatingRole ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      {creatingRole ? "..." : "Créer"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowNewRoleInput(false); setNewRoleName(""); }}
                      className="h-9 px-3 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {selectedRole && (
                <p className="text-[10px] text-indigo-500 font-semibold flex items-center gap-1">
                  <Shield size={10} /> Rôle sélectionné : <span className="font-black">{selectedRole.roleName}</span>
                  {(isEleveRole || isParentRole || isTeacherRole) && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">Liaison requise ↓</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* LIAISON — Élève / Parent / Enseignant */}
          {showLiaison && (
            <div>
              <SectionHeader
                icon={<Link2 size={14} />}
                label={isTeacherRole ? "Liaison Enseignant" : isParentRole ? "Liaison Parent → Élève" : "Liaison Élève"}
                iconBg="bg-gradient-to-br from-teal-500 to-emerald-600"
              />
              {(isEleveRole || isParentRole) && students.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    {isParentRole ? "Sélectionner l'élève (enfant)" : "Associer à un élève"}
                  </Label>
                  <div className="relative">
                    <select
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      style={{ color: '#1e293b', backgroundColor: '#f8fafc' }}
                      className="w-full h-11 pl-3 pr-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-200 appearance-auto"
                    >
                      <option value="" style={{ color: '#64748b', backgroundColor: '#ffffff' }}>— Aucun élève sélectionné —</option>
                      {students.map((s: any) => (
                        <option key={s.id} value={s.id} style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>
                          {s.nomEtudiant} {s.classe ? `(${s.classe})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formData.studentId && (
                    <p className="text-[10px] text-teal-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={10} /> Compte lié à l'élève sélectionné
                    </p>
                  )}
                </div>
              )}
              {isTeacherRole && employees.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Associer à un enseignant
                  </Label>
                  <div className="relative">
                    <select
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      style={{ color: '#1e293b', backgroundColor: '#f8fafc' }}
                      className="w-full h-11 pl-3 pr-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-200 appearance-auto"
                    >
                      <option value="" style={{ color: '#64748b', backgroundColor: '#ffffff' }}>— Aucun enseignant sélectionné —</option>
                      {employees.map((e: any) => (
                        <option key={e.id} value={e.id} style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>
                          {e.nom} {e.poste ? `(${e.poste})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formData.employeeId && (
                    <p className="text-[10px] text-teal-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={10} /> Compte lié à l'enseignant sélectionné
                    </p>
                  )}
                </div>
              )}
              {showLiaison && students.length === 0 && employees.length === 0 && (
                <p className="text-xs text-amber-600 font-medium bg-amber-50 rounded-xl p-3 border border-amber-100">
                  ⚠ Aucun élève/enseignant disponible. Ajoutez-les d'abord dans les modules correspondants.
                </p>
              )}
            </div>
          )}

          {/* NIVEAU ÉDUCATIF */}
          <div>
            <SectionHeader
              icon={<GraduationCap size={14} />}
              label="Niveau Éducatif"
              iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
            />
            <div className="flex flex-wrap gap-2">
              {!isLevelDirector && (
                <ChipOption
                  selected={hasAllLevels}
                  onClick={() => setFormData({ ...formData, educationalLevel: "Tous" })}
                  color="indigo"
                >
                  Toutes les étapes
                </ChipOption>
              )}
              {EDUCATION_LEVELS
                .filter((lvl) => {
                  if (!isLevelDirector || !userLevelFamily) return true;
                  return getLevelFamily(lvl.value) === userLevelFamily;
                })
                .map((lvl) => {
                  const isSelected = isLevelDirector ? true : (!hasAllLevels && selectedLevels.includes(lvl.value));
                  return (
                    <ChipOption
                      key={lvl.value}
                      selected={isSelected}
                      onClick={() => {
                        if (!isLevelDirector) {
                          toggleEducationalLevel(lvl.value);
                        }
                      }}
                      color="emerald"
                    >
                      <span>{lvl.icon}</span>
                      {lvl.label}
                    </ChipOption>
                  );
                })}
            </div>
          </div>

          {/* LANGUE */}
          <div>
            <SectionHeader
              icon={<Languages size={14} />}
              label="Langue d'interface"
              iconBg="bg-gradient-to-br from-amber-500 to-orange-500"
            />
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <ChipOption
                  key={lang.value}
                  selected={formData.langue === lang.value}
                  onClick={() => setFormData({ ...formData, langue: lang.value })}
                  color="amber"
                >
                  <span>{lang.flag}</span>
                  {lang.label}
                </ChipOption>
              ))}
            </div>
          </div>

          {/* ÉCOLE */}
          {currentUser?.superAdmin && schools.length > 0 && (
            <div>
              <SectionHeader
                icon={<Building2 size={14} />}
                label="École (Multi-Tenancy)"
                iconBg="bg-gradient-to-br from-rose-500 to-pink-600"
              />
              <div className="flex flex-wrap gap-2">
                <ChipOption
                  selected={formData.schoolId === ""}
                  onClick={() => setFormData({ ...formData, schoolId: "" })}
                  color="indigo"
                >
                  — Toutes les écoles —
                </ChipOption>
                {schools.map((school: any) => (
                  <ChipOption
                    key={school.id}
                    selected={formData.schoolId === school.id.toString()}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        schoolId: formData.schoolId === school.id.toString() ? "" : school.id.toString(),
                      })
                    }
                    color="amber"
                  >
                    <Building2 size={11} />
                    {school.name}
                  </ChipOption>
                ))}
              </div>
            </div>
          )}

          {/* SÉCURITÉ / ACCÈS */}
          <div>
            <SectionHeader
              icon={<Shield size={14} />}
              label="Sécurité / Accès"
              iconBg="bg-gradient-to-br from-slate-600 to-slate-800"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Supabase ID */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  ID Supabase
                </Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <Input
                    placeholder="ID de l'utilisateur dans Supabase"
                    value={formData.supabaseId}
                    onChange={(e) => setFormData({ ...formData, supabaseId: e.target.value })}
                    className="pl-9 h-11 rounded-xl border-slate-200 bg-slate-50 font-medium text-xs text-slate-500"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex flex-col gap-2 justify-center">
                {!isLevelDirector && (
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50
                    cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors group">
                    <Checkbox
                      id="admin"
                      checked={formData.admin}
                      onCheckedChange={(v) => setFormData({ ...formData, admin: !!v })}
                      className="mt-0.5 rounded-md border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                    />
                    <div>
                      <div className="text-sm font-black text-slate-700 leading-none group-hover:text-indigo-700">
                        Administrateur Système
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">
                        Accès complet à tous les paramètres.
                      </p>
                    </div>
                  </label>
                )}

                {currentUser?.superAdmin && (
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-rose-100 bg-rose-50/60
                    cursor-pointer hover:bg-rose-100 hover:border-rose-200 transition-colors group">
                    <Checkbox
                      id="superAdmin"
                      checked={formData.superAdmin}
                      onCheckedChange={(v) => setFormData({ ...formData, superAdmin: !!v })}
                      className="mt-0.5 rounded-md border-rose-300 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                    />
                    <div>
                      <div className="text-sm font-black text-rose-800 leading-none flex items-center gap-1.5">
                        <Crown size={12} className="text-rose-500" />
                        Super Administrateur
                      </div>
                      <p className="text-[10px] text-rose-400 font-medium mt-1">
                        Accès global à toute la plateforme.
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* ── Sticky Footer ────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#0E1017] px-8 py-4
          flex items-center justify-between gap-4 rounded-b-3xl">
          {/* Required fields notice */}
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-400 font-medium">
            {requiredMissing ? (
              <>
                <AlertCircle size={14} className="text-amber-400 shrink-0" />
                <span>
                  Champs obligatoires manquants :{" "}
                  <span className="text-rose-500 font-bold">
                    {[
                      !formData.utilisateur.trim() && "Identifiant",
                      !formData.nomPrenom.trim()   && "Nom complet",
                      !user && !formData.motDePasse.trim() && "Mot de passe",
                    ].filter(Boolean).join(", ")}
                  </span>
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Tous les champs requis sont remplis
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={close}
              className="rounded-xl font-bold px-6 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              form="user-form"
              disabled={loading || requiredMissing}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600
                hover:from-indigo-700 hover:to-violet-700 text-white font-bold px-8
                shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Traitement...
                </span>
              ) : user ? "Enregistrer" : "Créer l'utilisateur"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {renderTrigger()}
      {typeof window !== "undefined" && createPortal(modal, document.body)}
    </>
  );
}
