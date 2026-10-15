"use client";

import React, { useState, useTransition, useRef } from "react";
import { 
  MapPin, Plus, Save, Trash2, Building2, Calendar, 
  Hash, Mail, Phone, Globe, Clock, AtSign, 
  ShieldCheck, Server, Key, Image as ImageIcon,
  CheckCircle2, ExternalLink, Eye, Send, Edit2, Pencil,
  ChevronRight, LayoutGrid, GraduationCap, Upload, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { saveBranch, deleteBranch, syncAllBranchesToHeaders } from "@/domains/settings/actions/settings.actions";
import { DEFAULT_LMD_VU_CLAUSES } from "@/domains/printing/document-header";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const LEVEL_OPTIONS = [
  { value: "Primaire", label: "Primaire", icon: "📚", desc: "Cursus élémentaire et primaire" },
  { value: "College", label: "Collège", icon: "📖", desc: "Enseignement moyen / premier cycle" },
  { value: "Lycée", label: "Lycée", icon: "🎓", desc: "Second cycle et baccalauréat" },
  { value: "University", label: "Université", icon: "🏛️", desc: "Études supérieures et facultés" },
  { value: "Autre", label: "Autre", icon: "✨", desc: "Formations professionnelles ou spéciales" }
];

const CATEGORY_OPTIONS = [
  { value: "Privé", label: "Privé", icon: "🔒", desc: "Gestion et financement privés" },
  { value: "Public", label: "Public", icon: "🌐", desc: "Établissement étatique public" },
  { value: "Mixte", label: "Mixte", icon: "🔄", desc: "Partenariat mixte public-privé" }
];

interface Branch {
  id?: number;
  branchName: string;
  yearEstablished?: string;
  registrationNo?: string;
  branchAlias?: string;
  instType?: string;
  instCategory?: string;
  email?: string;
  altEmail?: string;
  contactNo?: string;
  officeNo?: string;
  timezone?: string;
  address?: string;
  admPrefix?: string;
  admPadding?: string;
  smtpUrl?: string;
  smtpPort?: string;
  smtpEmail?: string;
  smtpPassword?: string;
  logoPath?: string;
  workingDays?: string;
  ministry?: string;
  region?: string;
  dren?: string;
  department?: string;
  dden?: string;
  inspection?: string;
  commune?: string;
  schoolCode?: string;
  vuClauses?: string | string[];
  primaryColor?: string;
  secondaryColor?: string;
}

const NATIONAL_PRESETS = [
  {
    country: "Niger",
    flag: "🇳🇪",
    ministry: "Ministère de l'Éducation Nationale, de l'Alphabétisation et de la Promotion des Langues Nationales",
    region: "Niamey",
    dren: "Direction Régionale de l'Éducation Nationale (DREN)",
    department: "Niamey",
    dden: "Direction Départementale de l'Éducation Nationale (DDEN)",
    inspection: "Inspection de l'Enseignement Secondaire",
    commune: "Commune de Niamey IV",
    timezone: "GMT+1",
    vuClauses: DEFAULT_LMD_VU_CLAUSES,
  },
  {
    country: "Sénégal",
    flag: "🇸🇳",
    ministry: "Ministère de l'Éducation Nationale",
    region: "Dakar",
    dren: "Inspection d'Académie (IA) de Dakar",
    department: "Dakar",
    dden: "Inspection de l'Éducation et de la Formation (IEF)",
    inspection: "Inspection de l'Enseignement Elémentaire et Moyen",
    commune: "Dakar Plateau",
    timezone: "GMT",
    vuClauses: [
      "Vu la Constitution de la République du Sénégal ;",
      "Vu la loi d'orientation N° 91-22 du 16 Février 1991 sur l'Éducation Nationale sénégalaise ;",
      "Vu le décret N° 2012-1276 relatif à l'organisation du Ministère de l'Éducation Nationale ;",
      "Vu les arrêtés ministériels régissant les examens et diplômes officiels ;"
    ],
  },
  {
    country: "Côte d'Ivoire",
    flag: "🇨🇮",
    ministry: "Ministère de l'Éducation Nationale et de l'Alphabétisation (MENA)",
    region: "Abidjan",
    dren: "Direction Régionale de l'Éducation Nationale et de l'Alphabétisation (DRENA Abidjan 1)",
    department: "Abidjan",
    dden: "Direction Départementale de l'Éducation Nationale (DDENA)",
    inspection: "Inspection de l'Enseignement Préscolaire et Primaire (IEPP)",
    commune: "Cocody",
    timezone: "GMT",
    vuClauses: [
      "Vu la Constitution de la République de Côte d'Ivoire ;",
      "Vu la loi N° 95-696 du 7 Septembre 1995 relative à l'Enseignement en Côte d'Ivoire ;",
      "Vu les décrets portant organisation et délivrance des diplômes et attestations ;"
    ],
  },
  {
    country: "Mali",
    flag: "🇲🇱",
    ministry: "Ministère de l'Éducation Nationale",
    region: "Bamako",
    dren: "Académie d'Enseignement (AE) de Bamako Rive Droite",
    department: "Bamako",
    dden: "Centre d'Animation Pédagogique (CAP)",
    inspection: "Inspection Pédagogique Régionale",
    commune: "Commune V",
    timezone: "GMT",
    vuClauses: [
      "Vu la loi d'orientation sur l'éducation au Mali ;",
      "Vu les textes régissant l'organisation de l'Enseignement fondamental et secondaire ;"
    ],
  },
];

const DEFAULT_BRANCH_STATE: Branch = {
  branchName: "",
  yearEstablished: "",
  registrationNo: "",
  branchAlias: "",
  instType: "Lycée",
  instCategory: "Privé",
  email: "",
  altEmail: "",
  contactNo: "",
  officeNo: "",
  timezone: "GMT",
  address: "",
  admPrefix: "",
  admPadding: "0001",
  smtpUrl: "",
  smtpPort: "",
  smtpEmail: "",
  smtpPassword: "",
  logoPath: "",
  workingDays: "Lundi,Mardi,Mercredi,Jeudi,Vendredi",
  ministry: "",
  region: "",
  dren: "",
  department: "",
  dden: "",
  inspection: "",
  commune: "",
  schoolCode: "",
  primaryColor: "#6366f1",
  secondaryColor: "#10b981",
  vuClauses: DEFAULT_LMD_VU_CLAUSES
};

export function CampusSetup({ initialBranches }: { initialBranches: Branch[] }) {
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState<Branch>(DEFAULT_BRANCH_STATE);

  React.useEffect(() => {
    if (initialBranches && initialBranches.length > 0 && !selectedBranch) {
      handleBranchSelect(initialBranches[0].id?.toString() || "");
    }
  }, [initialBranches]);

  // instType helpers
  const instTypeVal = formData.instType || "";
  const selectedTypes = instTypeVal === "Tous" 
    ? LEVEL_OPTIONS.map(o => o.value) 
    : instTypeVal.split(",").map(s => s.trim()).filter(Boolean);
  const hasAllLevels = instTypeVal === "Tous" || selectedTypes.length === LEVEL_OPTIONS.length;

  const toggleInstType = (val: string) => {
    let current = instTypeVal === "Tous" 
      ? LEVEL_OPTIONS.map(o => o.value) 
      : instTypeVal.split(",").map(s => s.trim()).filter(Boolean);
    
    if (current.includes(val)) {
      current = current.filter(item => item !== val);
    } else {
      current = [...current, val];
    }
    
    if (current.length === LEVEL_OPTIONS.length || current.length === 0) {
      handleInputChange("instType", "Tous");
    } else {
      handleInputChange("instType", current.join(","));
    }
  };

  const toggleAllInstTypes = () => {
    if (hasAllLevels) {
      handleInputChange("instType", "");
    } else {
      handleInputChange("instType", "Tous");
    }
  };

  // instCategory helpers
  const instCategoryVal = formData.instCategory || "";
  const selectedCategories = instCategoryVal === "Toutes" 
    ? CATEGORY_OPTIONS.map(o => o.value) 
    : instCategoryVal.split(",").map(s => s.trim()).filter(Boolean);
  const hasAllCategories = instCategoryVal === "Toutes" || selectedCategories.length === CATEGORY_OPTIONS.length;

  const toggleInstCategory = (val: string) => {
    let current = instCategoryVal === "Toutes" 
      ? CATEGORY_OPTIONS.map(o => o.value) 
      : instCategoryVal.split(",").map(s => s.trim()).filter(Boolean);
    
    if (current.includes(val)) {
      current = current.filter(item => item !== val);
    } else {
      current = [...current, val];
    }
    
    if (current.length === CATEGORY_OPTIONS.length || current.length === 0) {
      handleInputChange("instCategory", "Toutes");
    } else {
      handleInputChange("instCategory", current.join(","));
    }
  };

  const toggleAllCategories = () => {
    if (hasAllCategories) {
      handleInputChange("instCategory", "");
    } else {
      handleInputChange("instCategory", "Toutes");
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (Max. 2MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      handleInputChange("logoPath", base64);
    };
    reader.readAsDataURL(file);
  };

  const handleBranchSelect = (branchId: string | null) => {
    if (!branchId) return;
    if (branchId === "new") {
      setSelectedBranch(null);
      setFormData(DEFAULT_BRANCH_STATE);
    } else {
      const branch = initialBranches.find(b => b.id?.toString() === branchId);
      if (branch) {
        setSelectedBranch(branch);
        // Ensure all fields have at least an empty string to avoid uncontrolled to controlled error
        setFormData({
          ...DEFAULT_BRANCH_STATE,
          ...branch,
          branchName: branch.branchName || "",
          yearEstablished: branch.yearEstablished || "",
          registrationNo: branch.registrationNo || "",
          branchAlias: branch.branchAlias || "",
          instType: branch.instType || "Lycée",
          instCategory: branch.instCategory || "Privé",
          email: branch.email || "",
          altEmail: branch.altEmail || "",
          contactNo: branch.contactNo || "",
          officeNo: branch.officeNo || "",
          timezone: branch.timezone || "GMT",
          address: branch.address || "",
          admPrefix: branch.admPrefix || "",
          admPadding: branch.admPadding || "0001",
          smtpUrl: branch.smtpUrl || "",
          smtpPort: branch.smtpPort || "",
          smtpEmail: branch.smtpEmail || "",
          smtpPassword: branch.smtpPassword || "",
          logoPath: branch.logoPath || "",
          workingDays: branch.workingDays || "Lundi,Mardi,Mercredi,Jeudi,Vendredi",
          ministry: branch.ministry || "",
          region: branch.region || "",
          dren: branch.dren || "",
          department: branch.department || "",
          dden: branch.dden || "",
          inspection: branch.inspection || "",
          commune: branch.commune || "",
          schoolCode: branch.schoolCode || "",
          primaryColor: (branch as any).primaryColor || "#6366f1",
          secondaryColor: (branch as any).secondaryColor || "#10b981",
          vuClauses: branch.vuClauses
            ? typeof branch.vuClauses === "string" && branch.vuClauses.startsWith("[")
              ? JSON.parse(branch.vuClauses)
              : typeof branch.vuClauses === "string"
              ? branch.vuClauses.split("\n").filter(Boolean)
              : Array.isArray(branch.vuClauses)
              ? branch.vuClauses
              : DEFAULT_LMD_VU_CLAUSES
            : DEFAULT_LMD_VU_CLAUSES
        });
      }
    }
  };

  const handleInputChange = (field: keyof Branch, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddVuClause = () => {
    const current = Array.isArray(formData.vuClauses) ? [...formData.vuClauses] : [...DEFAULT_LMD_VU_CLAUSES];
    current.push("Vu ");
    handleInputChange("vuClauses", current);
  };

  const handleUpdateVuClause = (index: number, val: string) => {
    const current = Array.isArray(formData.vuClauses) ? [...formData.vuClauses] : [...DEFAULT_LMD_VU_CLAUSES];
    current[index] = val;
    handleInputChange("vuClauses", current);
  };

  const handleDeleteVuClause = (index: number) => {
    const current = Array.isArray(formData.vuClauses) ? [...formData.vuClauses] : [...DEFAULT_LMD_VU_CLAUSES];
    current.splice(index, 1);
    handleInputChange("vuClauses", current);
  };

  const handleResetVuClauses = () => {
    handleInputChange("vuClauses", [...DEFAULT_LMD_VU_CLAUSES]);
    toast.info("Visas juridiques réinitialisés aux textes officiels");
  };

  const handleDayToggle = (day: string) => {
    const currentDays = formData.workingDays?.split(",").filter(Boolean) || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    handleInputChange("workingDays", newDays.join(","));
  };

  const onSave = () => {
    console.log("[onSave] Validating branchName:", formData.branchName);
    if (!formData.branchName || formData.branchName.trim() === "") {
      toast.error("Le nom de la branche est requis");
      return;
    }

    startTransition(async () => {
      console.log("[onSave] Sending data:", formData);
      const res = await saveBranch(formData);
      if (res.success) {
        toast.success(selectedBranch ? "Branche mise à jour & En-tête officiel synchronisé ! ⚡" : "Nouvelle branche créée & En-tête officiel généré ! ⚡");
        if (!selectedBranch) {
           setSelectedBranch(null);
           setFormData(DEFAULT_BRANCH_STATE);
        }
      } else {
        toast.error(res.error || "Erreur lors de l'enregistrement");
      }
    });
  };

  const applyNationalPreset = (preset: typeof NATIONAL_PRESETS[0]) => {
    setFormData(prev => ({
      ...prev,
      ministry: preset.ministry,
      region: preset.region,
      dren: preset.dren,
      department: preset.department,
      dden: preset.dden,
      inspection: preset.inspection,
      commune: preset.commune,
      timezone: preset.timezone,
      vuClauses: preset.vuClauses,
    }));
    toast.success(`Modèle officiel de ${preset.country} ${preset.flag} appliqué avec succès ! ✨`);
  };

  const onDelete = (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette branche ?")) return;
    startTransition(async () => {
      const res = await deleteBranch(id);
      if (res.success) {
        toast.success("Branche supprimée");
        setSelectedBranch(null);
        setFormData(DEFAULT_BRANCH_STATE);
      }
    });
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20">
      {/* 1. Selectors */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 dark:bg-[#12131C] shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 flex-1 w-full">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Building2 size={24} />
          </div>
          <div className="flex-1 max-w-md">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">SÉLECTIONNER UNE BRANCHE</label>
            <Select onValueChange={handleBranchSelect} value={selectedBranch?.id?.toString() || "new"}>
              <SelectTrigger className="h-12 rounded-xl border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0E0F18] dark:text-white font-bold">
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new" className="font-bold text-indigo-600">+ Ajouter Nouveau</SelectItem>
                {initialBranches.map(b => (
                  <SelectItem key={b.id} value={b.id?.toString() || ""}>{b.branchName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
           {selectedBranch?.id && (
             <a
               href={`/dashboard/settings/headers?branchId=${selectedBranch.id}`}
               className="h-11 px-5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 font-black text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm"
               title="Personnaliser l'en-tête officiel et les logos pour ce campus"
             >
               <Sparkles size={15} /> Studio En-têtes & Logos
             </a>
           )}

           <Button
             type="button"
             variant="outline"
             onClick={() => {
               startTransition(async () => {
                 toast.loading("Synchronisation de tous les campus...", { id: "sync-all" });
                 const res = await syncAllBranchesToHeaders();
                 if (res.success) {
                   const count = res.data?.count;
                   toast.success(`${count !== undefined ? `${count} ` : ""}campus synchronisés avec succès avec les En-têtes Officiels ! ⚡`, { id: "sync-all" });
                 } else {
                   toast.error(res.error || "Erreur lors de la synchronisation", { id: "sync-all" });
                 }
               });
             }}
             disabled={isPending}
             className="h-11 px-4 rounded-xl border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-300 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
             title="Synchronise instantanément tous les campus avec le studio des en-têtes"
           >
             <Sparkles size={14} className="text-amber-500" /> Resynchroniser Tout
           </Button>

           {selectedBranch && (
             <>
               <Button 
                 variant="outline"
                 className="h-11 px-6 rounded-xl border-indigo-100 text-indigo-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-50 transition-all"
                 onClick={() => toast.success(`Accès au campus: ${selectedBranch.branchName}`)}
               >
                 <ExternalLink size={16} /> Entrer
               </Button>
               <Button 
                 variant="ghost" 
                 size="icon" 
                 className="h-11 w-11 rounded-xl text-rose-500 hover:bg-rose-50"
                 onClick={() => selectedBranch.id && onDelete(selectedBranch.id)}
               >
                 <Trash2 size={18} />
               </Button>
             </>
           )}
           <Button 
             onClick={onSave}
             disabled={isPending}
             className="h-11 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all cursor-pointer"
           >
             <Save size={16} /> {isPending ? "ENREGISTREMENT..." : "ENREGISTRER"}
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Main Form */}
        <div className="xl:col-span-8 space-y-8">
           {/* Section 1: Basic Info */}
           <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 dark:bg-[#12131C] shadow-sm space-y-8">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <LayoutGrid size={20} />
                 </div>
                 Informations Générales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">NOM DE LA BRANCHE</Label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.branchName || ""}
                      onChange={e => handleInputChange("branchName", e.target.value)}
                      placeholder="Campus Central" 
                      className="h-14 pl-12 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0E0F18] dark:text-white font-bold" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">ANNÉE D'ÉTABLISSEMENT</Label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.yearEstablished || ""}
                      onChange={e => handleInputChange("yearEstablished", e.target.value)}
                      placeholder="2024" 
                      className="h-14 pl-12 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0E0F18] dark:text-white font-bold" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">N° ENREGISTREMENT</Label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.registrationNo || ""}
                      onChange={e => handleInputChange("registrationNo", e.target.value)}
                      placeholder="REG-2024-001"
                      className="h-14 pl-12 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0E0F18] dark:text-white font-bold" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">ALIAS BRANCHE</Label>
                  <div className="relative">
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.branchAlias || ""}
                      onChange={e => handleInputChange("branchAlias", e.target.value)}
                      placeholder="CC-01" 
                      className="h-14 pl-12 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0E0F18] dark:text-white font-bold" 
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-4">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 block mb-1">TYPE INSTITUTION / NIVEAU</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {/* All Stages Master Card */}
                    <button
                      type="button"
                      onClick={toggleAllInstTypes}
                      className={cn(
                        "relative p-5 rounded-3xl border-2 text-left transition-all duration-300 flex flex-col justify-between gap-4 group hover:-translate-y-1 hover:shadow-md select-none w-full",
                        hasAllLevels 
                          ? "bg-indigo-50/80 border-indigo-500 shadow-sm shadow-indigo-50" 
                          : "bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-white hover:border-slate-200"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all duration-300",
                          hasAllLevels ? "bg-indigo-500 text-white scale-110 shadow-lg shadow-indigo-100" : "bg-white border border-slate-100 text-slate-700 group-hover:scale-105"
                        )}>
                          ✨
                        </div>
                        <div className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                          hasAllLevels ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-200 bg-white"
                        )}>
                          {hasAllLevels && <CheckCircle2 size={12} className="stroke-[3]" />}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className={cn(
                          "font-black text-xs uppercase tracking-wider transition-colors",
                          hasAllLevels ? "text-indigo-900" : "text-slate-800"
                        )}>Toutes les étapes</p>
                        <p className="text-[10px] font-semibold text-slate-400 leading-snug">Sélectionner tout le cursus</p>
                      </div>
                    </button>

                    {/* Level Option Cards */}
                    {LEVEL_OPTIONS.map(lvl => {
                      const isActive = !hasAllLevels && selectedTypes.includes(lvl.value);
                      return (
                        <button
                          key={lvl.value}
                          type="button"
                          onClick={() => toggleInstType(lvl.value)}
                          className={cn(
                            "relative p-5 rounded-3xl border-2 text-left transition-all duration-300 flex flex-col justify-between gap-4 group hover:-translate-y-1 hover:shadow-md select-none w-full",
                            isActive 
                              ? "bg-emerald-50/80 border-emerald-500 shadow-sm shadow-emerald-50" 
                              : "bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-white hover:border-slate-200"
                          )}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all duration-300",
                              isActive ? "bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-100" : "bg-white border border-slate-100 text-slate-700 group-hover:scale-105"
                            )}>
                              {lvl.icon}
                            </div>
                            <div className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                              isActive ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 bg-white"
                            )}>
                              {isActive && <CheckCircle2 size={12} className="stroke-[3]" />}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className={cn(
                              "font-black text-xs uppercase tracking-wider transition-colors",
                              isActive ? "text-emerald-900" : "text-slate-800"
                            )}>{lvl.label}</p>
                            <p className="text-[10px] font-semibold text-slate-400 leading-snug">{lvl.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                    <div className="space-y-1">
                      <p className="text-xs text-indigo-950 dark:text-indigo-200 font-black flex items-center gap-1.5">
                        <Sparkles size={14} className="text-indigo-600" />
                        تخصيص اسم الترويسة لكل مستوى أو دمجها (Nom d'établissement par Niveau ou Fusion)
                      </p>
                      <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80 font-semibold">
                        يمكن لكل مستوى أن يحمل اسمه الرسمي الخاص (مثل: Primaire ➔ CSP BASMA ، Collège ➔ ALHOUSNA CSP ، Lycée ➔ CSP AL-NOUR) أو دمج المستويات معاً في ترويسة موحدة.
                      </p>
                    </div>
                    <a
                      href="/dashboard/settings/headers"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition shrink-0 shadow-sm shadow-indigo-200 dark:shadow-none cursor-pointer"
                    >
                      <Sparkles size={13} />
                      تخصيص الترويسات والأسماء الرسمية ←
                    </a>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 block mb-1">CATÉGORIE</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* All Categories Master Card */}
                    <button
                      type="button"
                      onClick={toggleAllCategories}
                      className={cn(
                        "relative p-5 rounded-3xl border-2 text-left transition-all duration-300 flex flex-col justify-between gap-4 group hover:-translate-y-1 hover:shadow-md select-none w-full",
                        hasAllCategories 
                          ? "bg-indigo-50/80 border-indigo-500 shadow-sm shadow-indigo-50" 
                          : "bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-white hover:border-slate-200"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all duration-300",
                          hasAllCategories ? "bg-indigo-500 text-white scale-110 shadow-lg shadow-indigo-100" : "bg-white border border-slate-100 text-slate-700 group-hover:scale-105"
                        )}>
                          🌟
                        </div>
                        <div className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                          hasAllCategories ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-200 bg-white"
                        )}>
                          {hasAllCategories && <CheckCircle2 size={12} className="stroke-[3]" />}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className={cn(
                          "font-black text-xs uppercase tracking-wider transition-colors",
                          hasAllCategories ? "text-indigo-900" : "text-slate-800"
                        )}>Toutes les catégories</p>
                        <p className="text-[10px] font-semibold text-slate-400 leading-snug">Sélectionner toutes les options</p>
                      </div>
                    </button>

                    {/* Category Option Cards */}
                    {CATEGORY_OPTIONS.map(cat => {
                      const isActive = !hasAllCategories && selectedCategories.includes(cat.value);
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => toggleInstCategory(cat.value)}
                          className={cn(
                            "relative p-5 rounded-3xl border-2 text-left transition-all duration-300 flex flex-col justify-between gap-4 group hover:-translate-y-1 hover:shadow-md select-none w-full",
                            isActive 
                              ? "bg-emerald-50/80 border-emerald-500 shadow-sm shadow-emerald-50" 
                              : "bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-white hover:border-slate-200"
                          )}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all duration-300",
                              isActive ? "bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-100" : "bg-white border border-slate-100 text-slate-700 group-hover:scale-105"
                            )}>
                              {cat.icon}
                            </div>
                            <div className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                              isActive ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 bg-white"
                            )}>
                              {isActive && <CheckCircle2 size={12} className="stroke-[3]" />}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className={cn(
                              "font-black text-xs uppercase tracking-wider transition-colors",
                              isActive ? "text-emerald-900" : "text-slate-800"
                            )}>{cat.label}</p>
                            <p className="text-[10px] font-semibold text-slate-400 leading-snug">{cat.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
           </div>

           {/* Section 2: Contact & Address */}
           <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 dark:bg-[#12131C] shadow-sm space-y-8">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <MapPin size={20} />
                 </div>
                 Contact & Adresse
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">EMAIL PRINCIPAL</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.email || ""}
                      onChange={e => handleInputChange("email", e.target.value)}
                      placeholder="contact@campuscentral.com"
                      className="h-14 pl-12 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0E0F18] dark:text-white font-bold" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">EMAIL ALTERNATIF</Label>
                  <div className="relative">
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.altEmail || ""}
                      onChange={e => handleInputChange("altEmail", e.target.value)}
                      placeholder="admin@campuscentral.com"
                      className="h-14 pl-12 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0E0F18] dark:text-white font-bold" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">N° CONTACT</Label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.contactNo || ""}
                      onChange={e => handleInputChange("contactNo", e.target.value)}
                      placeholder="+221 77 123 45 67"
                      className="h-14 pl-12 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0E0F18] dark:text-white font-bold" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">FUSEAU HORAIRE</Label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 z-10" size={18} />
                    <Select onValueChange={v => handleInputChange("timezone", v)} value={formData.timezone}>
                      <SelectTrigger className="h-14 pl-12 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0E0F18] dark:text-white font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["GMT (UTC+00:00)", "GMT+1", "GMT+2", "UTC"].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">ADRESSE PHYSIQUE</Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-6 text-indigo-500" size={18} />
                    <Textarea 
                      value={formData.address}
                      onChange={e => handleInputChange("address", e.target.value)}
                      rows={3} 
                      placeholder="123 Avenue de la République, Dakar, Sénégal"
                      className="rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0E0F18] dark:text-white font-bold pl-12 pr-12 pt-5 pb-4" 
                    />
                    <button className="absolute right-4 top-6 text-slate-300 hover:text-indigo-500 transition-colors">
                       <Pencil size={18} />
                    </button>
                  </div>
                </div>
              </div>
           </div>

           {/* Section 2.5: Structure Administrative & Hiérarchie Éducative */}
           <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 dark:bg-[#12131C] shadow-sm space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Building2 size={20} />
                   </div>
                   Structure Administrative & Hiérarchie Éducative
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Modèles d'État :</span>
                  {NATIONAL_PRESETS.map(preset => (
                    <button
                      key={preset.country}
                      type="button"
                      onClick={() => applyNationalPreset(preset)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-black flex items-center gap-1.5 transition cursor-pointer"
                      title={`Remplir automatiquement avec les dénominations officielles de ${preset.country}`}
                    >
                      <span>{preset.flag}</span>
                      <span>{preset.country}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">MINISTÈRE DE TUTELLE</Label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.ministry || ""}
                      onChange={e => handleInputChange("ministry", e.target.value)}
                      placeholder="Ministère de l'Éducation Nationale"
                      className="h-14 pl-12 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0E0F18] dark:text-white font-bold" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">RÉGION</Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.region || ""}
                      onChange={e => handleInputChange("region", e.target.value)}
                      placeholder="Niamey"
                      className="h-14 pl-12 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0E0F18] dark:text-white font-bold" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">DIRECTION RÉGIONALE (DREN)</Label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.dren || ""}
                      onChange={e => handleInputChange("dren", e.target.value)}
                      placeholder="Direction Régionale de l'Éducation Nationale"
                      className="h-14 pl-12 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0E0F18] dark:text-white font-bold" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">DÉPARTEMENT</Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.department || ""}
                      onChange={e => handleInputChange("department", e.target.value)}
                      placeholder="Niamey"
                      className="h-14 pl-12 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0E0F18] dark:text-white font-bold" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">DIRECTION DÉPARTEMENTALE (DDEN)</Label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.dden || ""}
                      onChange={e => handleInputChange("dden", e.target.value)}
                      placeholder="Direction Départementale de l'Éducation"
                      className="h-14 pl-12 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0E0F18] dark:text-white font-bold" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">INSPECTION</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.inspection || ""}
                      onChange={e => handleInputChange("inspection", e.target.value)}
                      placeholder="Inspection de l'Enseignement Secondaire"
                      className="h-14 pl-12 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0E0F18] dark:text-white font-bold" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">COMMUNE</Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.commune || ""}
                      onChange={e => handleInputChange("commune", e.target.value)}
                      placeholder="Commune de Niamey IV"
                      className="h-14 pl-12 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0E0F18] dark:text-white font-bold" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">CODE ÉTABLISSEMENT</Label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.schoolCode || ""}
                      onChange={e => handleInputChange("schoolCode", e.target.value)}
                      placeholder="ETB-2026-001"
                      className="h-14 pl-12 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0E0F18] dark:text-white font-bold" 
                    />
                  </div>
                </div>
              </div>
           </div>

           {/* Section 2.6: Visas Juridiques du Diplôme LMD (Clauses VU) */}
           <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 dark:bg-[#12131C] shadow-sm space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <GraduationCap size={20} />
                   </div>
                   Visas Juridiques du Diplôme LMD (Textes VU)
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                   <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-100 dark:border-emerald-500/20">
                      {Array.isArray(formData.vuClauses) ? formData.vuClauses.length : DEFAULT_LMD_VU_CLAUSES.length} Visas Actifs
                   </span>
                   <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     onClick={handleResetVuClauses}
                     className="h-9 px-3 text-[10px] font-bold text-slate-500 hover:text-slate-700 rounded-xl border-slate-200"
                   >
                     Réinitialiser
                   </Button>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Configurez les décrets, lois et arrêtés ministériels (articles « Vu ») qui figureront automatiquement sur les diplômes officiels et attestations de réussite émis par ce campus.
              </p>

              <div className="space-y-4">
                {(Array.isArray(formData.vuClauses) ? formData.vuClauses : DEFAULT_LMD_VU_CLAUSES).map((clause, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-[#0E0F18] border border-slate-100 dark:border-slate-800/80 group transition-all hover:border-emerald-200">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100/60 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black text-xs shrink-0 mt-1">
                      #{idx + 1}
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                        Texte / Arrêté juridique #{idx + 1}
                      </Label>
                      <Textarea
                        value={clause}
                        onChange={(e) => handleUpdateVuClause(idx, e.target.value)}
                        placeholder="Vu la loi N°... portant..."
                        rows={2}
                        className="rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-[#12131C] text-xs font-semibold leading-relaxed focus:border-emerald-500"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteVuClause(idx)}
                      className="h-8 w-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg shrink-0 mt-6 transition-colors"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handleAddVuClause}
                  className="h-12 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
                >
                  <Plus size={16} /> Ajouter un texte / visa VU
                </Button>
              </div>
           </div>

           {/* Section 3: Calendrier de Travail */}
           <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 dark:bg-[#12131C] shadow-sm space-y-8">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Calendar size={20} />
                 </div>
                 Calendrier de Travail
              </h3>
              <div className="flex flex-wrap gap-4">
                 {DAYS.map(day => {
                   const isActive = formData.workingDays?.split(",").includes(day);
                   return (
                     <button
                       key={day}
                       type="button"
                       onClick={() => handleDayToggle(day)}
                       className={cn(
                         "px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border shadow-sm",
                         isActive 
                           ? "bg-indigo-600 text-white border-indigo-600" 
                           : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100"
                       )}
                     >
                       {day}
                     </button>
                   );
                 })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                 <div className="bg-indigo-50/30 p-6 rounded-[2rem] border border-indigo-50 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white text-indigo-500 flex items-center justify-center shadow-sm">
                       <Clock size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Heures d'ouverture</p>
                       <p className="text-sm font-bold text-slate-700 mt-0.5">07:30 - 16:30</p>
                    </div>
                 </div>
                 <div className="bg-indigo-50/30 p-6 rounded-[2rem] border border-indigo-50 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white text-indigo-500 flex items-center justify-center shadow-sm">
                       <Calendar size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jours ouvrables</p>
                       <p className="text-sm font-bold text-slate-700 mt-0.5">Lundi - Vendredi</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Side Panels */}
        <div className="xl:col-span-4 space-y-8">
           {/* SMTP Config */}
           <div className="bg-[#1a2333] p-10 rounded-[2.5rem] shadow-2xl space-y-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16" />
              <h3 className="text-lg font-black tracking-tight flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-white/5 text-indigo-400 flex items-center justify-center">
                    <Mail size={20} />
                 </div>
                 Serveur SMTP (Emails)
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-white/40 uppercase tracking-widest px-1">URL / HÔTE SMTP</Label>
                  <Input 
                    value={formData.smtpUrl || ""}
                    onChange={e => handleInputChange("smtpUrl", e.target.value)}
                    placeholder="smtp.campuscentral.com" 
                    className="h-12 bg-white/5 border-white/10 rounded-xl text-white font-bold placeholder:text-white/10" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-white/40 uppercase tracking-widest px-1">PORT</Label>
                  <Input 
                    value={formData.smtpPort || ""}
                    onChange={e => handleInputChange("smtpPort", e.target.value)}
                    placeholder="587" 
                    className="h-12 bg-white/5 border-white/10 rounded-xl text-white font-bold placeholder:text-white/10" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-white/40 uppercase tracking-widest px-1">EMAIL AUTHENTIFICATION</Label>
                  <Input 
                    value={formData.smtpEmail || ""}
                    onChange={e => handleInputChange("smtpEmail", e.target.value)}
                    placeholder="noreply@campuscentral.com"
                    className="h-12 bg-white/5 border-white/10 rounded-xl text-white font-bold placeholder:text-white/10" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-white/40 uppercase tracking-widest px-1">MOT DE PASSE</Label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                    <Input 
                      type="password"
                      value={formData.smtpPassword || ""}
                      onChange={e => handleInputChange("smtpPassword", e.target.value)}
                      className="h-12 pl-12 pr-12 bg-white/5 border-white/10 rounded-xl text-white font-bold" 
                    />
                    <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors">
                       <Eye size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-4">
                 <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Connexion sécurisée établie
                 </div>
                 <Button className="w-full h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest border border-white/10 flex items-center justify-center gap-2 transition-all">
                    <Send size={14} className="rotate-45" /> Tester la connexion
                 </Button>
              </div>
           </div>

           {/* Branding / Logo */}
           <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 dark:bg-[#12131C] shadow-sm space-y-8">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <ImageIcon size={20} />
                 </div>
                 Logo & Branding
              </h3>
              
              <div className="flex flex-col items-center gap-6 py-4">
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   className="hidden" 
                   accept="image/*" 
                   onChange={handleLogoUpload}
                 />
                 <div 
                   className="w-32 h-32 rounded-[2.5rem] bg-indigo-50 border-4 border-white shadow-xl flex items-center justify-center text-indigo-600 relative overflow-hidden group cursor-pointer"
                   onClick={() => fileInputRef.current?.click()}
                 >
                    {formData.logoPath ? (
                      <img src={formData.logoPath} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 size={60} />
                    )}
                    <div className="absolute inset-0 bg-indigo-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <Pencil size={24} className="text-white" />
                    </div>
                 </div>
                 <div className="text-center">
                    <h4 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{formData.branchName || "Campus Central"}</h4>
                    <p className="text-[11px] font-bold text-slate-400 mt-1">Excellence & Réussite</p>
                 </div>
                 
                 <Button 
                   variant="outline" 
                   className="h-12 px-14 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0E0F18] dark:text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                   onClick={() => fileInputRef.current?.click()}
                 >
                    <Upload size={16} /> Changer le logo
                 </Button>
                 <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600">PNG, JPG ou SVG (Max. 2MB)</p>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-50 dark:border-slate-800/60">
                 <div className="flex items-center justify-between">
                   <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
                     COULEUR OFFICIELLE DU CAMPUS
                   </Label>
                   <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                     {formData.primaryColor || "#6366f1"}
                   </span>
                 </div>
                 <div className="flex items-center gap-3 flex-wrap">
                    {["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#ef4444", "#0f172a"].map((color) => {
                      const isSelected = (formData.primaryColor || "#6366f1").toLowerCase() === color.toLowerCase();
                      return (
                        <button 
                          key={color} 
                          type="button"
                          onClick={() => handleInputChange("primaryColor", color)}
                          className={cn(
                            "w-8 h-8 rounded-full shadow-sm transition-transform active:scale-90 cursor-pointer",
                            isSelected && "ring-4 ring-indigo-500/30 ring-offset-2 scale-110"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      );
                    })}
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 cursor-pointer hover:bg-slate-100 text-xs font-bold">
                      <input
                        type="color"
                        value={formData.primaryColor || "#6366f1"}
                        onChange={(e) => handleInputChange("primaryColor", e.target.value)}
                        className="w-5 h-5 border-none bg-transparent cursor-pointer"
                      />
                      <span className="text-[10px] uppercase font-black text-slate-500">Personnalisé</span>
                    </label>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">PRÉFIXE ADM</Label>
                  <Input 
                    value={formData.admPrefix || ""}
                    onChange={e => handleInputChange("admPrefix", e.target.value)}
                    placeholder="EDUT" 
                    className="h-12 rounded-xl border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0E0F18] dark:text-white font-bold" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">PADDING</Label>
                  <Select onValueChange={v => handleInputChange("admPadding", v)} value={formData.admPadding}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0E0F18] dark:text-white font-bold">
                      <SelectValue placeholder="0001" />
                    </SelectTrigger>
                    <SelectContent>
                      {["001", "0001", "00001"].map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
