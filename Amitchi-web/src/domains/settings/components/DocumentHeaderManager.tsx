"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { FileText, Printer, Save, Settings2, Upload, Plus, Trash2, Layers, Check, Globe, GraduationCap, Sparkles, Building2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import OfficialDocumentHeader from "@/domains/printing/components/OfficialDocumentHeader";
import {
  defaultDocumentHeaderConfig,
  mergeDocumentHeaderConfig,
  getActiveLevelHeaderConfig,
  type DocumentHeaderConfig,
  type DocumentHeaderStyle,
  type LevelHeaderProfile,
  type EducationalLevelKey,
} from "@/domains/printing/document-header";
import dynamic from "next/dynamic";
import { saveDocumentHeaderConfig, getBranches, syncHeaderProfileToBranch, syncAllBranchesToHeaders } from "@/domains/settings/actions/settings.actions";
import { LayoutGrid } from "lucide-react";

const TemplateDesigner = dynamic(() => import("@/domains/settings/components/designer/TemplateDesigner"), {
  ssr: false,
  loading: () => <div className="p-12 text-center text-slate-400 font-bold">Chargement du studio graphique...</div>,
});

const HEADER_STYLES: { value: DocumentHeaderStyle; label: string; description: string }[] = [
  { value: "classic_dual_logo", label: "Classique deux logos", description: "Lycée, collège, primaire, rapports officiels." },
  { value: "bilingual_center_logo", label: "Bilingue centre logo", description: "Français / arabe avec logo central." },
  { value: "university_formal", label: "Université formelle", description: "Facultés, scolarité, arrêtés et autorisations." },
  { value: "modern_card", label: "Carte moderne", description: "Cartes, badges, reçus modernes." },
  { value: "minimal_administrative", label: "Administratif minimal", description: "Listes, rapports internes, attestations simples." },
];

const PRESET_LEVELS: { key: EducationalLevelKey; label: string; icon: string; defaultMinistry: string; defaultInspection: string }[] = [
  { key: "Maternelle", label: "Maternelle / Préscolaire", icon: "🧸", defaultMinistry: "Ministère de l'Éducation Nationale", defaultInspection: "Inspection de l'Enseignement Préscolaire" },
  { key: "Primaire", label: "Primaire", icon: "📚", defaultMinistry: "Ministère de l'Éducation Nationale", defaultInspection: "Inspection de l'Enseignement Primaire" },
  { key: "College", label: "Collège (Moyen)", icon: "📖", defaultMinistry: "Ministère de l'Éducation Nationale", defaultInspection: "Direction de l'Enseignement Moyen" },
  { key: "Lycée", label: "Lycée (Secondaire)", icon: "🎓", defaultMinistry: "Ministère de l'Éducation Nationale", defaultInspection: "Direction de l'Enseignement Secondaire" },
  { key: "University", label: "Université (Supérieur / LMD)", icon: "🏛️", defaultMinistry: "Ministère de l'Enseignement Supérieur & de la Recherche", defaultInspection: "Rectorat & Conseil d'Administration" },
  { key: "Autre", label: "Formation Pro / Autre", icon: "✨", defaultMinistry: "Ministère de la Formation Professionnelle", defaultInspection: "Direction de la Pédagogie" },
];

const HEADER_NATIONAL_PRESETS = [
  {
    country: "Niger",
    flag: "🇳🇪",
    countryFr: "RÉPUBLIQUE DU NIGER",
    countryAr: "جمهورية النيجر",
    mottoFr: "Fraternité - Travail - Progrès",
    mottoAr: "إخاء - عمل - تقدم",
    ministryFr: "Ministère de l'Éducation Nationale, de l'Alphabétisation et de la Promotion des Langues Nationales",
    ministryAr: "وزارة التربية الوطنية ومحو الأمية والنهوض باللغات الوطنية",
    regionalFr: "Direction Régionale de l'Éducation Nationale (DREN)",
    regionalAr: "المديرية الجهوية للتربية الوطنية",
    departmentalFr: "Direction Départementale de l'Éducation Nationale (DDEN)",
    departmentalAr: "المديرية الإقليمية للتربية الوطنية",
    inspectionFr: "Inspection de l'Enseignement Secondaire",
    inspectionAr: "مفتشية التعليم الثانوي",
  },
  {
    country: "Sénégal",
    flag: "🇸🇳",
    countryFr: "RÉPUBLIQUE DU SÉNÉGAL",
    countryAr: "جمهورية السنغال",
    mottoFr: "Un Peuple - Un But - Une Foi",
    mottoAr: "شعب واحد - هدف واحد - إيمان واحد",
    ministryFr: "Ministère de l'Éducation Nationale",
    ministryAr: "وزارة التربية الوطنية",
    regionalFr: "Inspection d'Académie (IA) de Dakar",
    regionalAr: "مفتشية الأكاديمية",
    departmentalFr: "Inspection de l'Éducation et de la Formation (IEF)",
    departmentalAr: "مفتشية التربية والتكوين",
    inspectionFr: "Inspection de l'Enseignement Elémentaire et Moyen",
    inspectionAr: "مفتشية التعليم الابتدائي والمتوسط",
  },
  {
    country: "Côte d'Ivoire",
    flag: "🇨🇮",
    countryFr: "RÉPUBLIQUE DE CÔTE D'IVOIRE",
    countryAr: "جمهورية كوت ديفوار",
    mottoFr: "Union - Discipline - Travail",
    mottoAr: "اتحاد - انضباط - عمل",
    ministryFr: "Ministère de l'Éducation Nationale et de l'Alphabétisation (MENA)",
    ministryAr: "وزارة التربية الوطنية ومحو الأمية",
    regionalFr: "Direction Régionale de l'Éducation Nationale (DRENA)",
    regionalAr: "المديرية الجهوية للتربية الوطنية",
    departmentalFr: "Direction Départementale de l'Éducation Nationale (DDENA)",
    departmentalAr: "المديرية الإقليمية للتربية الوطنية",
    inspectionFr: "Inspection de l'Enseignement Préscolaire et Primaire (IEPP)",
    inspectionAr: "مفتشية التعليم الأولي والابتدائي",
  },
  {
    country: "Mali",
    flag: "🇲🇱",
    countryFr: "RÉPUBLIQUE DU MALI",
    countryAr: "جمهورية مالي",
    mottoFr: "Un Peuple - Un But - Une Foi",
    mottoAr: "شعب واحد - هدف واحد - إيمان واحد",
    ministryFr: "Ministère de l'Éducation Nationale",
    ministryAr: "وزارة التربية الوطنية",
    regionalFr: "Académie d'Enseignement (AE)",
    regionalAr: "أكاديمية التعليم",
    departmentalFr: "Centre d'Animation Pédagogique (CAP)",
    departmentalAr: "مركز التنشيط التربوي",
    inspectionFr: "Inspection Pédagogique Régionale",
    inspectionAr: "المفتشية التربوية الجهوية",
  },
];

const fieldClass = "h-11 rounded-xl border-slate-200 bg-white text-sm font-bold dark:border-slate-800 dark:bg-slate-900 dark:text-white";

export default function DocumentHeaderManager({ 
  initialConfig,
  branches: initialBranches,
  targetBranchId,
  targetProfileId,
}: { 
  initialConfig?: Partial<DocumentHeaderConfig> | null;
  branches?: any[];
  targetBranchId?: string;
  targetProfileId?: string;
}) {
  const [activeTab, setActiveTab] = useState<"designer" | "preset">("preset");
  const [isPending, startTransition] = useTransition();
  const [config, setConfig] = useState<DocumentHeaderConfig>(() => mergeDocumentHeaderConfig(initialConfig));
  const [branches, setBranches] = useState<any[]>(initialBranches || []);
  const [selectedCampusFilter, setSelectedCampusFilter] = useState<string>(targetBranchId ? String(targetBranchId) : "all");
  
  // Selected level/profile ID ('global' for base, or profile id)
  const [selectedProfileId, setSelectedProfileId] = useState<string>(targetProfileId || "global");

  // Fallback fetch branches if empty
  useEffect(() => {
    if (!initialBranches || initialBranches.length === 0) {
      getBranches().then((res: any) => {
        const list = res?.data?.data || res?.data || [];
        if (Array.isArray(list) && list.length > 0) {
          setBranches(list);
        }
      }).catch(() => {});
    }
  }, [initialBranches]);

  // Deep-linking: auto-select campus and profile from URL search params
  useEffect(() => {
    if (targetProfileId) {
      setSelectedProfileId(targetProfileId);
    } else if (targetBranchId) {
      setSelectedCampusFilter(String(targetBranchId));
      const matchedProfile = (config.levelProfiles || []).find(
        (p) => String(p.branchId) === String(targetBranchId)
      );
      if (matchedProfile) {
        setSelectedProfileId(matchedProfile.id);
      }
    }
  }, [targetBranchId, targetProfileId, config.levelProfiles]);

  const previewTitle = useMemo(() => "Exemple de rapport officiel", []);

  // Current active configuration for editing & preview
  const currentEditingProfile = useMemo(() => {
    if (selectedProfileId === "global") return null;
    return config.levelProfiles?.find((p) => p.id === selectedProfileId) || null;
  }, [config.levelProfiles, selectedProfileId]);

  // Compute live preview header config
  const previewConfig = useMemo<DocumentHeaderConfig>(() => {
    if (!currentEditingProfile) {
      return config;
    }
    const profCfg = currentEditingProfile.headerConfig || {};
    return {
      ...config,
      ...profCfg,
      leftLogo: currentEditingProfile.leftLogo || currentEditingProfile.customLogo || profCfg.leftLogo || config.leftLogo,
      centerLogo: currentEditingProfile.centerLogo || profCfg.centerLogo || config.centerLogo,
      rightLogo: currentEditingProfile.rightLogo || profCfg.rightLogo || config.rightLogo,
    };
  }, [config, currentEditingProfile]);

  // Update base config or level profile config
  const updateField = (key: keyof DocumentHeaderConfig, value: any) => {
    if (selectedProfileId === "global") {
      setConfig((prev) => ({ ...prev, [key]: value }));
    } else {
      setConfig((prev) => {
        const profiles = [...(prev.levelProfiles || [])];
        const idx = profiles.findIndex((p) => p.id === selectedProfileId);
        if (idx >= 0) {
          const profile = { ...profiles[idx] };
          if (key === "leftLogo" || key === "centerLogo" || key === "rightLogo") {
            profile[key] = value;
          }
          profile.headerConfig = {
            ...profile.headerConfig,
            [key]: value,
          };
          profiles[idx] = profile;
        }
        return { ...prev, levelProfiles: profiles };
      });
    }
  };

  // Add new Profile (Single or Merged Group or Campus-specific)
  const handleAddProfile = (levelKey?: EducationalLevelKey, branchObj?: any) => {
    const defaultLevel = levelKey || (branchObj?.instType as EducationalLevelKey) || "Primaire";
    const preset = PRESET_LEVELS.find((p) => p.key === defaultLevel);
    const newId = `profile_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    const bName = branchObj?.branchName || null;
    const bId = branchObj?.id ? Number(branchObj.id) : null;
    const newName = bName 
      ? `En-tête ${bName}${preset ? ` (${preset.label})` : ""}` 
      : preset 
        ? `En-tête ${preset.label}` 
        : "Nouveau Groupe d'En-têtes";

    const newProfile: LevelHeaderProfile = {
      id: newId,
      name: newName,
      branchId: bId,
      branchName: bName,
      applicableLevels: [defaultLevel],
      leftLogo: branchObj?.logoPath || config.leftLogo,
      centerLogo: config.centerLogo,
      rightLogo: config.rightLogo,
      headerConfig: {
        schoolName: branchObj?.branchName || config.schoolName,
        schoolNameAr: config.schoolNameAr,
        campusSubtitle: branchObj?.branchAlias || "",
        ministry: branchObj?.ministry || preset?.defaultMinistry || config.ministry,
        regionalDirection: branchObj?.dren || config.regionalDirection,
        departmentalDirection: branchObj?.dden || config.departmentalDirection,
        inspection: branchObj?.inspection || preset?.defaultInspection || config.inspection,
        commune: branchObj?.commune || config.commune,
        schoolCode: branchObj?.schoolCode || config.schoolCode,
        address: branchObj?.address || config.address,
        phone: branchObj?.contactNo || branchObj?.officeNo || config.phone,
        email: branchObj?.email || config.email,
        authorizationText: Array.isArray(branchObj?.vuClauses)
          ? branchObj.vuClauses.join("\n")
          : (branchObj?.vuClauses || config.authorizationText),
        style: defaultLevel === "University" ? "university_formal" : config.style,
      },
    };

    setConfig((prev) => ({
      ...prev,
      levelProfiles: [...(prev.levelProfiles || []), newProfile],
    }));
    setSelectedProfileId(newId);
    toast.success(`Profil "${newName}" créé avec succès !`);
  };

  // Remove Level Profile
  const handleDeleteProfile = (profileId: string) => {
    setConfig((prev) => ({
      ...prev,
      levelProfiles: (prev.levelProfiles || []).filter((p) => p.id !== profileId),
    }));
    setSelectedProfileId("global");
    toast.info("Profil supprimé.");
  };

  // Toggle applicable levels in merged group
  const handleToggleLevelInProfile = (levelKey: EducationalLevelKey) => {
    if (!currentEditingProfile) return;
    const currentLevels = currentEditingProfile.applicableLevels || [];
    let updatedLevels: EducationalLevelKey[];

    if (currentLevels.includes(levelKey)) {
      if (currentLevels.length === 1) {
        toast.error("Le profil doit couvrir au moins un niveau.");
        return;
      }
      updatedLevels = currentLevels.filter((l) => l !== levelKey);
    } else {
      updatedLevels = [...currentLevels, levelKey];
    }

    setConfig((prev) => {
      const profiles = [...(prev.levelProfiles || [])];
      const idx = profiles.findIndex((p) => p.id === selectedProfileId);
      if (idx >= 0) {
        profiles[idx] = {
          ...profiles[idx],
          applicableLevels: updatedLevels,
        };
      }
      return { ...prev, levelProfiles: profiles };
    });
  };

  // Assign or unassign branch from profile
  const handleAssignBranchToProfile = (branchIdStr: string) => {
    if (!currentEditingProfile) return;
    const branch = branches.find((b) => String(b.id) === String(branchIdStr));
    const bId = branch ? Number(branch.id) : null;
    const bName = branch ? branch.branchName : null;

    setConfig((prev) => {
      const profiles = [...(prev.levelProfiles || [])];
      const idx = profiles.findIndex((p) => p.id === selectedProfileId);
      if (idx >= 0) {
        profiles[idx] = {
          ...profiles[idx],
          branchId: bId,
          branchName: bName,
        };
      }
      return { ...prev, levelProfiles: profiles };
    });
  };

  // One-click import campus official data into current editing profile (or global)
  const handleImportBranchData = (branchIdToImport: number | string) => {
    const branch = branches.find((b) => String(b.id) === String(branchIdToImport));
    if (!branch) {
      toast.error("Campus introuvable.");
      return;
    }

    if (selectedProfileId === "global") {
      setConfig((prev) => ({
        ...prev,
        schoolName: branch.branchName || prev.schoolName,
        campusSubtitle: branch.branchAlias || prev.campusSubtitle,
        ministry: branch.ministry || prev.ministry,
        regionalDirection: branch.dren || prev.regionalDirection,
        departmentalDirection: branch.dden || prev.departmentalDirection,
        inspection: branch.inspection || prev.inspection,
        commune: branch.commune || prev.commune,
        schoolCode: branch.schoolCode || prev.schoolCode,
        address: branch.address || prev.address,
        phone: branch.contactNo || branch.officeNo || prev.phone,
        email: branch.email || prev.email,
        leftLogo: branch.logoPath || prev.leftLogo,
        authorizationText: Array.isArray(branch.vuClauses)
          ? branch.vuClauses.join("\n")
          : (branch.vuClauses || prev.authorizationText),
      }));
      toast.success(`Données officielles du campus "${branch.branchName}" appliquées au profil global ! ⚡`);
      return;
    }

    setConfig((prev) => {
      const profiles = [...(prev.levelProfiles || [])];
      const idx = profiles.findIndex((p) => p.id === selectedProfileId);
      if (idx >= 0) {
        const current = profiles[idx];
        profiles[idx] = {
          ...current,
          branchId: Number(branch.id),
          branchName: branch.branchName,
          leftLogo: branch.logoPath || current.leftLogo,
          headerConfig: {
            ...current.headerConfig,
            schoolName: branch.branchName || current.headerConfig?.schoolName,
            campusSubtitle: branch.branchAlias || current.headerConfig?.campusSubtitle,
            ministry: branch.ministry || current.headerConfig?.ministry,
            regionalDirection: branch.dren || current.headerConfig?.regionalDirection,
            departmentalDirection: branch.dden || current.headerConfig?.departmentalDirection,
            inspection: branch.inspection || current.headerConfig?.inspection,
            commune: branch.commune || current.headerConfig?.commune,
            schoolCode: branch.schoolCode || current.headerConfig?.schoolCode,
            address: branch.address || current.headerConfig?.address,
            phone: branch.contactNo || branch.officeNo || current.headerConfig?.phone,
            email: branch.email || current.headerConfig?.email,
            primaryColor: (branch as any).primaryColor || current.headerConfig?.primaryColor,
            secondaryColor: (branch as any).secondaryColor || current.headerConfig?.secondaryColor,
            authorizationText: Array.isArray(branch.vuClauses)
              ? branch.vuClauses.join("\n")
              : (branch.vuClauses || current.headerConfig?.authorizationText),
          },
        };
      }
      return { ...prev, levelProfiles: profiles };
    });
    toast.success(`Données officielles du campus "${branch.branchName}" importées avec succès ! ⚡`);
  };

  const handleSyncToBranch = (branchId: number) => {
    startTransition(async () => {
      toast.loading("Mise à jour des informations du campus...", { id: "sync-branch" });
      const payload = currentEditingProfile ? (currentEditingProfile.headerConfig || {}) : previewConfig;
      const res = await syncHeaderProfileToBranch(branchId, {
        ...payload,
        leftLogo: currentEditingProfile?.leftLogo || previewConfig.leftLogo,
        primaryColor: previewConfig.primaryColor,
        secondaryColor: previewConfig.secondaryColor,
      });
      if (res.success) {
        toast.success("Informations du campus mises à jour avec succès depuis cet en-tête ! ⚡", { id: "sync-branch" });
      } else {
        toast.error(res.error || "Erreur lors de la mise à jour du campus", { id: "sync-branch" });
      }
    });
  };

  const applyNationalPresetToHeader = (preset: typeof HEADER_NATIONAL_PRESETS[0]) => {
    updateField("country", preset.countryFr);
    updateField("countryAr", preset.countryAr);
    updateField("motto", preset.mottoFr);
    updateField("mottoAr", preset.mottoAr);
    updateField("ministry", preset.ministryFr);
    updateField("ministryAr", preset.ministryAr);
    updateField("regionalDirection", preset.regionalFr);
    updateField("regionalDirectionAr", preset.regionalAr);
    updateField("departmentalDirection", preset.departmentalFr);
    updateField("departmentalDirectionAr", preset.departmentalAr);
    updateField("inspection", preset.inspectionFr);
    updateField("inspectionAr", preset.inspectionAr);
    toast.success(`Dénominations officielles de ${preset.country} ${preset.flag} appliquées (FR & AR) ! ✨`);
  };

  const reset = () => {
    setConfig(defaultDocumentHeaderConfig);
    setSelectedProfileId("global");
    toast.info("Configuration réinitialisée aux valeurs par défaut.");
  };

  const save = () => {
    startTransition(async () => {
      try {
        toast.loading("Optimisation et enregistrement des en-têtes...", { id: "saving-header" });
        const optimizedConfig = await prepareConfigForSave(config);

        const response = await fetch("/api/settings/headers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(optimizedConfig),
        });

        const result = await response.json().catch(() => null);

        if (response.ok && result?.success) {
          if (result.data) {
            setConfig(mergeDocumentHeaderConfig(result.data));
          }
          toast.success("En-têtes officiels et profils par niveau enregistrés avec succès ! 🎉", { id: "saving-header" });
        } else {
          toast.error(result?.error || `Erreur lors de l'enregistrement (${response.status})`, { id: "saving-header" });
        }
      } catch (err: any) {
        console.error("Save header error:", err);
        toast.error(err?.message || "Erreur lors de l'enregistrement de l'en-tête", { id: "saving-header" });
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Header Mode Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#131622]/90 p-4 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-100 dark:shadow-none">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              En-têtes Officiels & Logos par Niveau (Multi-Campus)
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">
                Multi-Niveaux
              </Badge>
            </h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Personnalisez les en-têtes et logos par niveau (Primaire, Collège, Lycée, Université) ou fusionnez-les en groupes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab("preset")}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer ${
              activeTab === "preset" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <Settings2 size={16} /> Configuration par Niveau
          </button>
          <button
            onClick={() => setActiveTab("designer")}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer ${
              activeTab === "designer" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <LayoutGrid size={16} /> المحرر التفاعلي (Canva Designer)
          </button>
        </div>
      </div>

      {activeTab === "designer" ? (
        <TemplateDesigner />
      ) : (
        <div className="rounded-[2.5rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#131622]/90 p-8 shadow-sm space-y-8">
          
          {/* Action Toolbar */}
          <div className="flex flex-col gap-4 border-b border-slate-100 dark:border-slate-800 pb-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-sm">
                <Settings2 size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Gestion des Profils d'En-têtes
                </h3>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Sélectionnez un niveau ou un groupe pour ajuster les logos, la tutelle ministérielle et les libellés officiels.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => window.print()} className="rounded-xl font-black dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                <Printer size={16} /> Imprimer test
              </Button>
              <Button type="button" variant="outline" onClick={reset} className="rounded-xl font-black dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                Réinitialiser
              </Button>
              <Button type="button" onClick={save} disabled={isPending} className="rounded-xl bg-indigo-600 font-black text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20">
                <Save size={16} /> {isPending ? "Enregistrement..." : "Enregistrer la Configuration"}
              </Button>
            </div>
          </div>

          {/* LEVEL & PROFILES SELECTOR BAR */}
          <div className="space-y-4">
            {/* Campus Filtering Bar */}
            {branches.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mr-1 shrink-0">
                  <Building2 size={14} className="text-indigo-600" />
                  Filtrer par Campus :
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCampusFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                    selectedCampusFilter === "all"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  🏢 Tous les campus ({config.levelProfiles?.length || 0})
                </button>
                {branches.map((b) => {
                  const count = (config.levelProfiles || []).filter((p) => String(p.branchId) === String(b.id)).length;
                  const isSelected = selectedCampusFilter === String(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedCampusFilter(String(b.id))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      <Building2 size={13} />
                      <span>{b.branchName}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-bold">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Layers size={15} className="text-indigo-600" />
                Niveaux Académiques & Profils d'En-têtes Actifs :
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddProfile("Primaire")}
                  className="rounded-xl text-xs font-bold gap-1 dark:border-slate-800"
                >
                  <Plus size={13} /> Ajouter Profil Niveau
                </Button>

                {branches.length > 0 && (
                  <div className="relative group">
                    <Button
                      size="sm"
                      className="rounded-xl text-xs font-bold gap-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                    >
                      <Building2 size={13} /> + Profil pour un Campus
                    </Button>
                    <div className="absolute right-0 mt-1 hidden group-hover:flex flex-col bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-30 min-w-[220px]">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 py-1">Créer profil pour :</span>
                      {branches.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleAddProfile(undefined, b)}
                          className="text-left px-3 py-2 text-xs font-bold rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer transition"
                        >
                          <Building2 size={14} className="text-indigo-600 shrink-0" />
                          <span className="truncate">{b.branchName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 p-2 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              {/* Global Default Button */}
              <button
                type="button"
                onClick={() => setSelectedProfileId("global")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  selectedProfileId === "global"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <Globe size={15} />
                <span>🌐 Défaut Global (Tous niveaux / Tous campus)</span>
              </button>

              {/* Specific Level & Campus Profiles */}
              {(config.levelProfiles || [])
                .filter((prof) => selectedCampusFilter === "all" || String(prof.branchId) === String(selectedCampusFilter))
                .map((prof) => {
                  const isSelected = selectedProfileId === prof.id;
                  return (
                    <div key={prof.id} className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setSelectedProfileId(prof.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-l-xl text-xs font-black transition cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        <GraduationCap size={15} />
                        <span>{prof.name}</span>
                        {prof.branchName && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-700 dark:text-indigo-200 font-bold flex items-center gap-1">
                            <Building2 size={11} /> {prof.branchName}
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/15 uppercase font-bold">
                          {(prof.applicableLevels || []).join(" + ")}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProfile(prof.id)}
                        title="Supprimer ce profil"
                        className={`px-2.5 py-2.5 rounded-r-xl border-l border-black/10 text-xs transition cursor-pointer ${
                          isSelected
                            ? "bg-indigo-700 text-white hover:bg-rose-600"
                            : "bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* GLOBAL DEFAULT HELPER: QUICK IMPORT FROM CAMPUS */}
          {selectedProfileId === "global" && branches.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm">
                  <Building2 size={18} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    Pré-remplir les données par défaut à partir d'un Campus
                    <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[9px] font-black uppercase">
                      Gain de temps
                    </Badge>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Importe en 1 clic le nom, ministère, DREN, inspection, adresse, code établissement et logos du campus choisi dans le modèle par défaut.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="h-9 px-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer shadow-sm"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleImportBranchData(e.target.value);
                      e.target.value = "";
                    }
                  }}
                >
                  <option value="" disabled>⚡ Choisir un campus à importer...</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>🏢 {b.branchName} ({b.instType || "Général"})</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* IF EDITING A CUSTOM LEVEL/CAMPUS PROFILE */}
          {currentEditingProfile && (
            <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 space-y-4 animate-in fade-in duration-300">
              {/* Campus Attachment Row */}
              {branches.length > 0 && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-indigo-200/60 dark:border-indigo-800/50">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
                      <Building2 size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wide flex items-center gap-1.5">
                        Rattachement au Campus (Branche) :
                        {currentEditingProfile.branchName && (
                          <Badge className="bg-indigo-600 text-white text-[9px] font-black uppercase">
                            {currentEditingProfile.branchName}
                          </Badge>
                        )}
                      </h4>
                      <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300 font-medium">
                        Associez cet en-tête à un campus pour qu'il soit injecté automatiquement sur tous ses bulletins, reçus et attestations.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={currentEditingProfile.branchId ? String(currentEditingProfile.branchId) : ""}
                      onChange={(e) => handleAssignBranchToProfile(e.target.value)}
                      className="h-9 px-3 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white cursor-pointer shadow-sm"
                    >
                      <option value="">🌐 Tous les campus (Non restreint)</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>🏢 {b.branchName} ({b.instType || "Campus"})</option>
                      ))}
                    </select>

                    {currentEditingProfile.branchId && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleImportBranchData(currentEditingProfile.branchId!)}
                          className="rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Sparkles size={14} /> ⚡ Importer données du Campus
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleSyncToBranch(currentEditingProfile.branchId!)}
                          className="rounded-xl border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-950/60 font-black text-xs gap-1.5 cursor-pointer"
                          title="Met à jour la fiche de ce campus dans la base de données avec ces données d'en-tête"
                        >
                          <Save size={14} /> 🔄 Synchroniser vers le Campus
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Profile Name & Level Grouping */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wide flex items-center gap-2">
                    <Check size={16} className="text-indigo-600" />
                    Fusion & Niveaux Rattachés à cet En-tête :
                  </h4>
                  <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300 font-medium">
                    Cochez les niveaux qui partageront automatiquement cet en-tête et ces logos (ex: Primaire + Collège).
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">Nom du Profil</span>
                  <Input
                    value={currentEditingProfile.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setConfig((prev) => {
                        const profiles = [...(prev.levelProfiles || [])];
                        const idx = profiles.findIndex((p) => p.id === selectedProfileId);
                        if (idx >= 0) profiles[idx] = { ...profiles[idx], name: newName };
                        return { ...prev, levelProfiles: profiles };
                      });
                    }}
                    className="h-9 text-xs font-bold bg-white dark:bg-slate-900 w-56"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {PRESET_LEVELS.map((lvl) => {
                  const isChecked = (currentEditingProfile?.applicableLevels || []).includes(lvl.key);
                  return (
                    <button
                      key={lvl.key}
                      type="button"
                      onClick={() => handleToggleLevelInProfile(lvl.key)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
                        isChecked
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-300"
                      }`}
                    >
                      <span>{lvl.icon}</span>
                      <span>{lvl.label}</span>
                      {isChecked && <Check size={14} className="ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* MAIN EDITING GRID & LIVE A4 PREVIEW */}
          <div className="grid gap-8 xl:grid-cols-[440px_minmax(0,1fr)]">
            <div className="space-y-6">
              
              {/* Style Selector */}
              <section className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Style de Mise en Page ({selectedProfileId === "global" ? "Défaut" : currentEditingProfile?.name})
                </p>
                <div className="grid gap-2">
                  {HEADER_STYLES.map((style) => (
                    <button
                      key={style.value}
                      type="button"
                      onClick={() => updateField("style", style.value)}
                      className={`rounded-2xl border p-4 text-left transition cursor-pointer ${
                        previewConfig.style === style.value
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 shadow-sm"
                          : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <p className="text-sm font-black">{style.label}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{style.description}</p>
                    </button>
                  ))}
                </div>
              </section>

              {/* Text Fields Form with Smart National Preset Assistant */}
              <section className="grid gap-4">
                <div className="flex items-center justify-between p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/60 flex-wrap gap-2">
                  <span className="text-[10px] font-black uppercase text-indigo-900 dark:text-indigo-300 tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-600" />
                    Auto-remplissage Étatique (FR + AR) :
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {HEADER_NATIONAL_PRESETS.map((p) => (
                      <button
                        key={p.country}
                        type="button"
                        onClick={() => applyNationalPresetToHeader(p)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-[11px] font-black border border-indigo-200 dark:border-indigo-800 text-slate-700 dark:text-slate-200 hover:border-indigo-500 hover:text-indigo-600 transition flex items-center gap-1 cursor-pointer shadow-sm"
                      >
                        <span>{p.flag}</span>
                        <span>{p.country}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Field
                  label="Nom établissement"
                  value={previewConfig.schoolName}
                  onChange={(v) => updateField("schoolName", v)}
                />
                <Field
                  label="Nom arabe établissement"
                  value={previewConfig.schoolNameAr || ""}
                  onChange={(v) => updateField("schoolNameAr", v)}
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <Field label="République / Pays" value={previewConfig.country || ""} onChange={(v) => updateField("country", v)} />
                  <Field label="Pays (Arabe)" value={previewConfig.countryAr || ""} onChange={(v) => updateField("countryAr", v)} />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Ministère de Tutelle" value={previewConfig.ministry || ""} onChange={(v) => updateField("ministry", v)} />
                  <Field label="Ministère (Arabe)" value={previewConfig.ministryAr || ""} onChange={(v) => updateField("ministryAr", v)} />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Direction régionale (DREN)" value={previewConfig.regionalDirection || ""} onChange={(v) => updateField("regionalDirection", v)} />
                  <Field label="Direction régionale (Arabe)" value={previewConfig.regionalDirectionAr || ""} onChange={(v) => updateField("regionalDirectionAr", v)} />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Direction départementale (DDEN)" value={previewConfig.departmentalDirection || ""} onChange={(v) => updateField("departmentalDirection", v)} />
                  <Field label="DDEN (Arabe)" value={previewConfig.departmentalDirectionAr || ""} onChange={(v) => updateField("departmentalDirectionAr", v)} />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Inspection / Rectorat" value={previewConfig.inspection || ""} onChange={(v) => updateField("inspection", v)} />
                  <Field label="Inspection (Arabe)" value={previewConfig.inspectionAr || ""} onChange={(v) => updateField("inspectionAr", v)} />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Service / Faculté" value={previewConfig.service || ""} onChange={(v) => updateField("service", v)} />
                  <Field label="Service (Arabe)" value={previewConfig.serviceAr || ""} onChange={(v) => updateField("serviceAr", v)} />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Sous-titre / Mention Campus"
                    value={previewConfig.campusSubtitle || ""}
                    onChange={(v) => updateField("campusSubtitle", v)}
                  />
                  <Field
                    label="Commune / Ville"
                    value={previewConfig.commune || ""}
                    onChange={(v) => updateField("commune", v)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Adresse" value={previewConfig.address || ""} onChange={(v) => updateField("address", v)} />
                  <Field label="Code Établissement" value={previewConfig.schoolCode || ""} onChange={(v) => updateField("schoolCode", v)} />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Téléphone" value={previewConfig.phone || ""} onChange={(v) => updateField("phone", v)} />
                  <Field label="Email" value={previewConfig.email || ""} onChange={(v) => updateField("email", v)} />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Devise" value={previewConfig.motto || ""} onChange={(v) => updateField("motto", v)} />
                  <Field label="Devise (Arabe)" value={previewConfig.mottoAr || ""} onChange={(v) => updateField("mottoAr", v)} />
                </div>
                
                <Field
                  label="Arrêtés Ministériels / Autorisations officielles"
                  value={previewConfig.authorizationText || ""}
                  onChange={(v) => updateField("authorizationText", v)}
                />
                
                {/* LOGOS CONFIGURATION FOR CURRENT LEVEL PROFILE */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                      Logos & Sceaux ({selectedProfileId === "global" ? "Défaut Global" : currentEditingProfile?.name})
                    </p>
                    <Badge className="bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300 text-[9px] font-black uppercase">
                      Spécifique
                    </Badge>
                  </div>
                  <LogoUploaderField
                    label="Logo gauche (Spécifique au Niveau / Établissement)"
                    value={previewConfig.leftLogo || ""}
                    onChange={(v) => updateField("leftLogo", v)}
                  />
                  <LogoUploaderField
                    label="Logo centre (Sceau / République)"
                    value={previewConfig.centerLogo || ""}
                    onChange={(v) => updateField("centerLogo", v)}
                  />
                  <LogoUploaderField
                    label="Logo droite (Ministère / Armoiries)"
                    value={previewConfig.rightLogo || ""}
                    onChange={(v) => updateField("rightLogo", v)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <ColorField
                    label="Couleur principale"
                    value={previewConfig.primaryColor || "#4f46e5"}
                    onChange={(v) => updateField("primaryColor", v)}
                  />
                  <ColorField
                    label="Couleur secondaire"
                    value={previewConfig.secondaryColor || "#10b981"}
                    onChange={(v) => updateField("secondaryColor", v)}
                  />
                </div>
              </section>
            </div>

            {/* LIVE A4 PREVIEW SECTION */}
            <section className="space-y-4">
              <div className="flex items-center justify-between text-sm font-black text-slate-700 dark:text-slate-200">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-indigo-600" />
                  <span>Aperçu A4 en Direct ({selectedProfileId === "global" ? "Défaut Global" : currentEditingProfile?.name})</span>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase">
                  Rendu Conforme A4
                </Badge>
              </div>

              <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 p-4">
                <div className="mx-auto min-h-[720px] max-w-[794px] bg-white text-slate-900 p-8 shadow-xl print:min-h-0 print:max-w-none print:shadow-none rounded-xl">
                  <OfficialDocumentHeader config={previewConfig} title={previewTitle} />
                  <div className="mt-10 space-y-4 text-sm font-semibold text-slate-800">
                    <p className="text-slate-500 italic text-xs">
                      Ce document utilise automatiquement l'en-tête et le logo configurés pour :{" "}
                      <strong>
                        {selectedProfileId === "global"
                          ? "Tous les campus et tous les niveaux (Défaut Global)"
                          : `${currentEditingProfile?.branchName ? `Campus: ${currentEditingProfile.branchName} • ` : ""}${(currentEditingProfile?.applicableLevels || []).join(", ")}`}
                      </strong>.
                    </p>
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-600">
                          <tr><th className="p-3">N°</th><th className="p-3">Libellé</th><th className="p-3">Valeur</th><th className="p-3">Observation</th></tr>
                        </thead>
                        <tbody>
                          {[1, 2, 3].map((n) => (
                            <tr key={n} className="border-t border-slate-200 text-slate-900">
                              <td className="p-3 font-bold">{n}</td>
                              <td className="p-3">Exemple de rapport officiel</td>
                              <td className="p-3">Donnée niveau {(currentEditingProfile?.applicableLevels || [])[0] || "Global"}</td>
                              <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-black">Validé</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-16 flex justify-between text-center text-xs font-black text-slate-900">
                      <span>Le Directeur d'Établissement</span>
                      <span>Sceau & Cachet Officiel</span>
                      <span>L'Inspection Académique</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass} />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-8 border-none bg-transparent cursor-pointer" />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full text-sm font-bold bg-transparent text-slate-900 dark:text-white outline-none" />
      </div>
    </label>
  );
}

function compressBase64Image(dataUrl: string, maxWidth = 300, maxHeight = 300, quality = 0.8): Promise<string> {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image")) {
    return Promise.resolve(dataUrl || "");
  }
  // If already small (less than 40KB base64), return as is
  if (dataUrl.length < 50000) {
    return Promise.resolve(dataUrl);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const isPng = dataUrl.startsWith("data:image/png");
      const compressed = canvas.toDataURL(isPng ? "image/png" : "image/jpeg", quality);
      resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
    };
    img.onerror = () => resolve(dataUrl);
  });
}

async function prepareConfigForSave(cfg: DocumentHeaderConfig): Promise<DocumentHeaderConfig> {
  const [leftLogo, centerLogo, rightLogo] = await Promise.all([
    compressBase64Image(cfg.leftLogo || ""),
    compressBase64Image(cfg.centerLogo || ""),
    compressBase64Image(cfg.rightLogo || ""),
  ]);

  const sanitizedProfiles = await Promise.all(
    (cfg.levelProfiles || []).map(async (prof) => {
      const [pLeft, pCenter, pRight, pCustom] = await Promise.all([
        compressBase64Image(prof.leftLogo || ""),
        compressBase64Image(prof.centerLogo || ""),
        compressBase64Image(prof.rightLogo || ""),
        compressBase64Image(prof.customLogo || ""),
      ]);

      const profHeaderCfg = prof.headerConfig || {};
      const [phLeft, phCenter, phRight] = await Promise.all([
        compressBase64Image(profHeaderCfg.leftLogo || ""),
        compressBase64Image(profHeaderCfg.centerLogo || ""),
        compressBase64Image(profHeaderCfg.rightLogo || ""),
      ]);

      return {
        ...prof,
        leftLogo: pLeft || undefined,
        centerLogo: pCenter || undefined,
        rightLogo: pRight || undefined,
        customLogo: pCustom || undefined,
        headerConfig: {
          ...profHeaderCfg,
          leftLogo: phLeft || undefined,
          centerLogo: phCenter || undefined,
          rightLogo: phRight || undefined,
        },
      };
    })
  );

  return {
    ...cfg,
    leftLogo: leftLogo || undefined,
    centerLogo: centerLogo || undefined,
    rightLogo: rightLogo || undefined,
    levelProfiles: sanitizedProfiles,
  };
}

function compressImage(file: File, maxWidth = 300, maxHeight = 300, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      compressBase64Image(dataUrl, maxWidth, maxHeight, quality).then(resolve);
    };
    reader.onerror = () => resolve("");
  });
}

function LogoUploaderField({ label, value, onChange }: { label: string; value: string; onChange: (base64: string) => void }) {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("La taille du logo ne doit pas dépasser 5 Mo");
        return;
      }
      try {
        const compressedBase64 = await compressImage(file);
        onChange(compressedBase64);
        toast.success("Logo optimisé et chargé avec succès ! ✨");
      } catch {
        toast.error("Impossible de charger le fichier image");
      }
    }
  };

  return (
    <div className="space-y-2">
      <span className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 relative">
          {value ? (
            <img src={value} alt={label} className="w-full h-full object-contain p-1" />
          ) : (
            <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase">Logo</span>
          )}
        </div>

        <div className="flex-1 space-y-1.5 min-w-0">
          <Input 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            placeholder="URL du logo ou Data Base64..." 
            className="h-9 text-xs font-semibold dark:bg-slate-900 dark:border-slate-800 dark:text-white"
          />
          <div className="flex items-center gap-2">
            <label className="flex h-8 items-center gap-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-3 text-[11px] font-black cursor-pointer transition">
              <Upload size={13} /> Charger image
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="flex h-8 items-center gap-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-300 px-2.5 text-[11px] font-bold transition cursor-pointer"
              >
                Supprimer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
