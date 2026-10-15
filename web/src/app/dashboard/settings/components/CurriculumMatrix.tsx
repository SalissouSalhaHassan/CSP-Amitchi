"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Search, Wand2, Download, FileSpreadsheet, Trash2, Edit3,
  Plus, Check, X, Loader2, Sparkles, Filter, 
  BarChart3, Copy, Zap, Info, AlertTriangle, ArrowRightLeft, Layers, GraduationCap
} from "lucide-react";
import { toast } from "sonner";
import { 
  batchSaveMatrixLinks, applyStandardCurriculumTemplate, 
  createSubject, updateSubject, deleteSubject, autoLinkSubjectByType 
} from "@/domains/academics/actions/academics.actions";

export function CurriculumMatrix({ 
  initialSections, 
  initialSubjects 
}: any) {
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [eduSystemType, setEduSystemType] = useState("Tous");
  const [categoryFilter, setCategoryFilter] = useState("Toutes");
  
  // Dynamic Subjects List State
  const [subjectsList, setSubjectsList] = useState<any[]>(initialSubjects || []);
  
  // Unsaved changes tracking
  const [unsavedIds, setUnsavedIds] = useState<Set<string>>(new Set());

  // New Subject Form State
  const [newSubCode, setNewSubCode] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [newSubCat, setNewSubCat] = useState("Catégorie");
  const [targetScope, setTargetScope] = useState<"all" | "level" | "section">("all");
  const [selectedTargetLevel, setSelectedTargetLevel] = useState("all");
  const [selectedTargetSectionId, setSelectedTargetSectionId] = useState<string>("all");
  const [newDefaultCoef, setNewDefaultCoef] = useState<number>(2);
  const [newDefaultCredits, setNewDefaultCredits] = useState<number>(0);

  // Edit Subject Modal State
  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editCat, setEditCat] = useState("Catégorie");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Matrix State: { [subId_secId]: { coef, cred } }
  const [matrixData, setMatrixData] = useState<Record<string, { coef: string, cred: string }>>(() => {
    const initial: Record<string, { coef: string, cred: string }> = {};
    (initialSubjects || []).forEach((sub: any) => {
      sub.sectionLinks?.forEach((link: any) => {
        if (!link.term) {
          initial[`${sub.id}_${link.sectionId}`] = { 
            coef: String(link.defaultCoef || 0), 
            cred: String(link.credits || 0) 
          };
        }
      });
    });
    return initial;
  });

  const categories = ["Langues", "Sciences", "Religion", "Sciences Humaines", "Sport", "Technologie", "Arts", "Autre"];

  const availableLevels = useMemo(() => {
    const levelsFromSec = (initialSections || []).map((s: any) => s.educationalLevel).filter(Boolean);
    const defaults = ["Primaire", "Collège", "Lycée", "Licence", "Master", "Doctorat"];
    return Array.from(new Set([...defaults, ...levelsFromSec]));
  }, [initialSections]);

  const filteredSections = useMemo(() => {
    let secs = initialSections;
    if (eduSystemType !== "Tous") {
      secs = secs.filter((s: any) => {
        const name = (s.sectionName || "").toLowerCase();
        const ser = (s.series || "");
        if (eduSystemType === "Franco-Arabe") {
          return name.includes("franco-arabe") || ["FA", "A", "C", "D"].includes(ser);
        }
        return name.includes("général") || ser === "GEN";
      });
    }
    return secs;
  }, [initialSections, eduSystemType]);

  const filteredSubjects = useMemo(() => {
    let subs = subjectsList;
    const q = searchQuery.toLowerCase();
    
    if (q) {
      subs = subs.filter((s: any) => 
        (s.subjectName || "").toLowerCase().includes(q) || 
        (s.subjectCode && s.subjectCode.toLowerCase().includes(q))
      );
    }
    
    if (categoryFilter !== "Toutes") {
      subs = subs.filter((s: any) => s.category === categoryFilter);
    }
    
    return subs;
  }, [subjectsList, searchQuery, categoryFilter]);

  const handleAddSubjectSubmit = async () => {
    const cleanName = newSubName.trim();
    if (!cleanName) {
      toast.error("Veuillez saisir le nom de la matière.");
      return;
    }

    startTransition(async () => {
      const sectionId = targetScope === "section" && selectedTargetSectionId !== "all" ? Number(selectedTargetSectionId) : undefined;
      const educationalLevel = targetScope === "level" && selectedTargetLevel !== "all" ? selectedTargetLevel : undefined;

      const res = await createSubject({
        subjectName: cleanName,
        subjectCode: newSubCode.trim() || undefined,
        category: newSubCat === "Catégorie" ? undefined : newSubCat,
        sectionId,
        educationalLevel,
        defaultCoef: newDefaultCoef,
        credits: newDefaultCredits,
      });

      if (res.success) {
        const createdSub = (res as any).data || {
          id: Date.now(),
          subjectName: cleanName,
          subjectCode: newSubCode.trim() || null,
          category: newSubCat === "Catégorie" ? null : newSubCat,
        };

        setSubjectsList(prev => [createdSub, ...prev]);

        // Auto populate matrix cells if target was specified
        if (targetScope !== "all") {
          let targetSecs: any[] = [];
          if (sectionId) {
            targetSecs = initialSections.filter((s: any) => s.id === sectionId);
          } else if (educationalLevel) {
            targetSecs = initialSections.filter((s: any) => s.educationalLevel?.toLowerCase() === educationalLevel.toLowerCase());
          }

          if (targetSecs.length > 0) {
            setMatrixData(prev => {
              const next = { ...prev };
              targetSecs.forEach((sec: any) => {
                const key = `${createdSub.id}_${sec.id}`;
                next[key] = { coef: String(newDefaultCoef), cred: String(newDefaultCredits) };
                setUnsavedIds(u => new Set(u).add(key));
              });
              return next;
            });
          }
        }

        setNewSubName("");
        setNewSubCode("");
        toast.success(`Matière "${cleanName}" ajoutée avec succès !`);
      } else {
        toast.error(res.error || "Erreur lors de la création de la matière.");
      }
    });
  };

  const handleOpenEditModal = (sub: any) => {
    setEditingSubject(sub);
    setEditName(sub.subjectName || "");
    setEditCode(sub.subjectCode || "");
    setEditCat(sub.category || "Catégorie");
  };

  const handleSaveSubjectEdit = async () => {
    if (!editingSubject) return;
    const cleanName = editName.trim();
    if (!cleanName) {
      toast.error("Le nom de la matière est obligatoire.");
      return;
    }

    setIsSavingEdit(true);
    const res = await updateSubject(editingSubject.id, {
      subjectName: cleanName,
      subjectCode: editCode.trim() || undefined,
      category: editCat === "Catégorie" ? undefined : editCat,
    });
    setIsSavingEdit(false);

    if (res.success) {
      setSubjectsList(prev => prev.map(s => s.id === editingSubject.id ? { ...s, subjectName: cleanName, subjectCode: editCode.trim() || null, category: editCat === "Catégorie" ? null : editCat } : s));
      setEditingSubject(null);
      toast.success(`Matière "${cleanName}" mise à jour avec succès !`);
    } else {
      toast.error(res.error || "Erreur lors de la mise à jour.");
    }
  };

  const handleDeleteSubjectClick = (sub: any) => {
    if (confirm(`Voulez-vous vraiment supprimer la matière "${sub.subjectName}" ?`)) {
      startTransition(async () => {
        const res = await deleteSubject(sub.id);
        if (res.success) {
          setSubjectsList(prev => prev.filter(s => s.id !== sub.id));
          toast.success(`Matière "${sub.subjectName}" supprimée.`);
        } else {
          toast.error(res.error || "Erreur lors de la suppression.");
        }
      });
    }
  };

  const handleMatrixChange = (subId: number, secId: number, field: 'coef' | 'cred', value: string) => {
    const key = `${subId}_${secId}`;
    setMatrixData(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { coef: "0", cred: "0" }),
        [field]: value
      }
    }));
    setUnsavedIds(prev => new Set(prev).add(key));
  };

  const handleSaveMatrix = () => {
    const dataToSave = Array.from(unsavedIds).map(key => {
      const [subId, secId] = key.split("_").map(Number);
      const val = matrixData[key];
      return {
        subId,
        secId,
        coef: Number(val.coef) || 0,
        cred: Number(val.cred) || 0
      };
    });

    if (dataToSave.length === 0) return;

    startTransition(async () => {
      const res = await batchSaveMatrixLinks(dataToSave);
      if (res.success) {
        setUnsavedIds(new Set());
        // Toast logic would go here
      }
    });
  };

  const handleApplyTemplates = () => {
    if (!confirm("Appliquer les modèles standards ? Cela créera les sections et matières manquantes.")) return;
    startTransition(async () => {
      const res = await applyStandardCurriculumTemplate() as any;
      if (res.success || res.data?.success) alert(res.message || res.data?.message || "Succès");
      else alert("Erreur: " + (res.error || res.data?.error || "Inconnue"));
    });
  };

  const handleBulkCopy = (sourceSecId: number) => {
    const targetSecIdStr = prompt("Entrez l'ID de la section cible pour copier tous les coefficients :");
    if (!targetSecIdStr) return;
    const targetSecId = Number(targetSecIdStr);
    
    setMatrixData(prev => {
      const next = { ...prev };
      initialSubjects.forEach((sub: any) => {
        const sourceVal = prev[`${sub.id}_${sourceSecId}`];
        if (sourceVal) {
          const key = `${sub.id}_${targetSecId}`;
          next[key] = { ...sourceVal };
          setUnsavedIds(u => new Set(u).add(key));
        }
      });
      return next;
    });
  };

  const stats = useMemo(() => {
    const totalSubjects = filteredSubjects.length;
    const linkedSubjects = filteredSubjects.filter((s: any) => 
      initialSections.some((sec: any) => {
        const val = matrixData[`${s.id}_${sec.id}`];
        return val && Number(val.coef) > 0;
      })
    ).length;
    
    const catDistribution = categories.map(cat => ({
      name: cat,
      count: filteredSubjects.filter((s: any) => s.category === cat).length
    })).filter(c => c.count > 0);

    return { totalSubjects, linkedSubjects, catDistribution };
  }, [filteredSubjects, matrixData, initialSections]);

  const totalsBySection = useMemo(() => {
    const totals: Record<number, { coef: number, cred: number }> = {};
    filteredSections.forEach((sec: any) => {
      let cSum = 0;
      let rSum = 0;
      initialSubjects.forEach((sub: any) => {
        const val = matrixData[`${sub.id}_${sec.id}`];
        if (val) {
          cSum += Number(val.coef) || 0;
          rSum += Number(val.cred) || 0;
        }
      });
      totals[sec.id] = { coef: cSum, cred: rSum };
    });
    return totals;
  }, [filteredSections, initialSubjects, matrixData]);

  return (
    <div className="space-y-8 pb-20">
      {/* 1. Ultra-Premium Header */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl shadow-indigo-200/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 blur-[120px] rounded-full -mr-48 -mt-48 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -ml-32 -mb-32"></div>
        
        <div className="relative flex flex-wrap items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40 border border-white/20">
              <Zap size={40} className="text-white animate-bounce duration-[3000ms]" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-4xl font-black tracking-tight">Matières de Base</h2>
                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-indigo-500/30">AI Powered</span>
              </div>
              <p className="text-slate-400 font-medium text-lg">Système intelligent de gestion du curriculum et des coefficients</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md p-2 rounded-3xl border border-white/10">
            <Button variant="ghost" onClick={handleApplyTemplates} className="h-14 rounded-2xl text-white hover:bg-white/10 font-black gap-3 px-6">
              <Wand2 size={20} className="text-indigo-400" /> Appliquer Modèles
            </Button>
            <div className="w-px h-8 bg-white/10"></div>
            <Button className="h-14 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-black gap-3 px-8 shadow-xl shadow-indigo-500/20 transition-all active:scale-95">
              <FileSpreadsheet size={20} /> Import Tableau
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Intelligence Hub (Stats & Quick Add) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-8">
          {/* Real-time Stats Card */}
          <div className="bg-white dark:bg-[#12131C] p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
              <BarChart3 size={120} />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest text-xs flex items-center gap-2">
                <BarChart3 size={16} className="text-indigo-500" /> Analyse du Curriculum
              </h3>
              <span className="text-[10px] font-bold text-slate-400">Live View</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0E0F18] border border-slate-100 dark:border-slate-800/80">
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{stats.totalSubjects}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Matières</div>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{stats.linkedSubjects}</div>
                <div className="text-[10px] font-bold text-indigo-400 uppercase">Liées</div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                <span>Distribution par Catégorie</span>
                <span>{stats.totalSubjects} Mat.</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                {stats.catDistribution.map((c, i) => (
                  <div 
                    key={c.name}
                    className={`h-full transition-all duration-500`}
                    style={{ 
                      width: `${(c.count / stats.totalSubjects) * 100}%`,
                      backgroundColor: `hsl(${220 + i * 30}, 70%, 60%)` 
                    }}
                    title={`${c.name}: ${c.count}`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {stats.catDistribution.slice(0, 4).map((c, i) => (
                  <div key={c.name} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `hsl(${220 + i * 30}, 70%, 60%)` }}></div>
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="bg-white dark:bg-[#12131C] p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-50 dark:border-slate-800/60 pb-4">
              <Filter size={18} className="text-indigo-500" />
              <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest text-xs">Moteur de Recherche</h3>
            </div>
            
            <div className="space-y-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Rechercher par nom ou code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-14 bg-slate-50 dark:bg-[#0E0F18] border-none rounded-2xl pl-12 pr-4 font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Système</label>
                  <select 
                    value={eduSystemType}
                    onChange={(e) => setEduSystemType(e.target.value)}
                    className="w-full h-12 bg-slate-50 dark:bg-[#0E0F18] border-none rounded-xl px-4 font-bold text-slate-700 dark:text-white outline-none"
                  >
                    <option value="Tous">Tous</option>
                    <option value="Général">Général</option>
                    <option value="Franco-Arabe">F.A</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Catégorie</label>
                  <select 
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full h-12 bg-slate-50 dark:bg-[#0E0F18] border-none rounded-xl px-4 font-bold text-slate-700 dark:text-white outline-none"
                  >
                    <option value="Toutes">Toutes</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white dark:bg-[#12131C] p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800/60 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800/60 pb-6 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Plus size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest text-xs">Création &amp; Affectation de Matière</h3>
                  <p className="text-[11px] font-bold text-slate-400">Créer une matière et l'attribuer à une section ou niveau d'étude</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                <Sparkles size={12} /> CIBLAGE DYNAMIQUE
              </div>
            </div>

            <div className="space-y-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Nom de la Matière *</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Algorithmique Avancée, Physique-Chimie..."
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    className="w-full h-14 bg-slate-50 dark:bg-[#0E0F18] border border-slate-100 dark:border-slate-800 rounded-2xl px-5 font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-300 transition-all text-base"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Code Matière</label>
                    <input 
                      type="text" 
                      placeholder="ALG-201"
                      value={newSubCode}
                      onChange={(e) => setNewSubCode(e.target.value)}
                      className="w-full h-14 bg-slate-50 dark:bg-[#0E0F18] border border-slate-100 dark:border-slate-800 rounded-2xl px-5 font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-300 transition-all uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Catégorie</label>
                    <select 
                      value={newSubCat}
                      onChange={(e) => setNewSubCat(e.target.value)}
                      className="w-full h-14 bg-slate-50 dark:bg-[#0E0F18] border border-slate-100 dark:border-slate-800 rounded-2xl px-4 font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-xs"
                    >
                      <option>Catégorie</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Target / Scope Options */}
              <div className="p-5 bg-slate-50/80 dark:bg-[#0E0F18]/80 border border-slate-100 dark:border-slate-800 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <GraduationCap size={14} /> Affectation de la matière (Cible)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetScope("all")}
                      className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition ${targetScope === "all" ? "bg-indigo-600 text-white shadow-xs" : "bg-white dark:bg-[#181926] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"}`}
                    >
                      Toutes les sections
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetScope("level")}
                      className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition ${targetScope === "level" ? "bg-indigo-600 text-white shadow-xs" : "bg-white dark:bg-[#181926] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"}`}
                    >
                      Par Niveau d'Étude
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetScope("section")}
                      className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition ${targetScope === "section" ? "bg-indigo-600 text-white shadow-xs" : "bg-white dark:bg-[#181926] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"}`}
                    >
                      Par Section Spécifique
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {targetScope === "level" && (
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase px-1">Sélectionner le Niveau d'Étude</label>
                      <select
                        value={selectedTargetLevel}
                        onChange={(e) => setSelectedTargetLevel(e.target.value)}
                        className="w-full h-11 bg-white dark:bg-[#181926] border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-xs font-bold text-slate-800 dark:text-white outline-none"
                      >
                        <option value="all">Tous les Niveaux d'Étude</option>
                        {availableLevels.map((lvl: string) => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {targetScope === "section" && (
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase px-1">Sélectionner la Section</label>
                      <select
                        value={selectedTargetSectionId}
                        onChange={(e) => setSelectedTargetSectionId(e.target.value)}
                        className="w-full h-11 bg-white dark:bg-[#181926] border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-xs font-bold text-slate-800 dark:text-white outline-none"
                      >
                        <option value="all">Toutes les sections</option>
                        {(initialSections || []).map((sec: any) => (
                          <option key={sec.id} value={sec.id}>{sec.sectionName} ({sec.educationalLevel || "Section"})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {targetScope === "all" && (
                    <div className="md:col-span-2 flex items-center px-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                      La matière sera disponible dans la matrice pour toutes les sections de l'établissement.
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase px-1">Coef. Initial</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={newDefaultCoef}
                        onChange={(e) => setNewDefaultCoef(Number(e.target.value) || 1)}
                        className="w-full h-11 bg-white dark:bg-[#181926] border border-slate-200 dark:border-slate-700 rounded-xl text-center font-black text-slate-800 dark:text-white text-xs outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase px-1">Crédits (LMD)</label>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={newDefaultCredits}
                        onChange={(e) => setNewDefaultCredits(Number(e.target.value) || 0)}
                        className="w-full h-11 bg-white dark:bg-[#181926] border border-slate-200 dark:border-slate-700 rounded-xl text-center font-black text-slate-800 dark:text-white text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-6 bg-slate-50 dark:bg-[#0E0F18] rounded-3xl border border-slate-100 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#181926] flex items-center justify-center shadow-sm text-indigo-500">
              <Info size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Créer la matière dans la matrice</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">La matière sera automatiquement ajoutée et affectée aux sections choisies.</p>
            </div>
            <Button 
              onClick={handleAddSubjectSubmit} 
              disabled={isPending || !newSubName.trim()} 
              className="h-14 bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-700 text-white rounded-2xl px-10 font-black gap-3 shadow-xl shadow-slate-200 dark:shadow-none"
            >
              <Check size={20} className="text-emerald-400" /> Confirmer &amp; Créer
            </Button>
          </div>
        </div>
      </div>

      {/* 3. The Intelligent Matrix */}
      <div className="bg-white dark:bg-[#12131C] rounded-[3.5rem] border border-slate-100 dark:border-slate-800/60 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden flex flex-col h-[700px]">
        {/* Matrix Controls */}
        <div className="p-8 border-b border-slate-50 dark:border-slate-800/60 flex items-center justify-between bg-white dark:bg-[#12131C] sticky top-0 z-20">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
              <span className="text-xs font-black uppercase tracking-widest">{filteredSubjects.length} Matières Affichées</span>
            </div>
            {unsavedIds.size > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-100 dark:border-amber-500/20 animate-pulse">
                <AlertTriangle size={14} />
                <span className="text-xs font-black uppercase tracking-widest">{unsavedIds.size} modifications en attente</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="text-slate-400 font-bold hover:text-slate-900 dark:hover:text-slate-100 gap-2">
              <ArrowRightLeft size={16} /> Comparer
            </Button>
            <div className="w-px h-6 bg-slate-100 dark:bg-slate-800"></div>
            <Button 
              onClick={handleSaveMatrix} 
              disabled={isPending || unsavedIds.size === 0}
              className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-8 font-black gap-2 shadow-lg shadow-indigo-100 dark:shadow-none disabled:opacity-50 transition-all"
            >
              {isPending ? <Loader2 className="animate-spin" /> : <Check size={18} />}
              Sauvegarder tout
            </Button>
          </div>
        </div>

        {/* Scrollable Table Area */}
        <div className="flex-1 overflow-auto custom-scrollbar relative">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-900 dark:bg-[#0B0C12] text-white">
                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest border-r border-slate-800 sticky left-0 bg-slate-900 dark:bg-[#0B0C12] z-30 min-w-[80px]">Code</th>
                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest border-r border-slate-800 sticky left-[80px] bg-slate-900 dark:bg-[#0B0C12] z-30 min-w-[240px]">Désignation</th>
                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest border-r border-slate-800 bg-slate-900 dark:bg-[#0B0C12] z-20 min-w-[120px]">Catégorie</th>
                {filteredSections.map((sec: any) => (
                  <th key={sec.id} className="p-4 border-r border-slate-800 min-w-[110px] group transition-all hover:bg-slate-800 cursor-pointer" onClick={() => handleBulkCopy(sec.id)}>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">{sec.educationalLevel}</div>
                    <div className="text-xs font-black truncate max-w-[100px] mx-auto group-hover:text-indigo-400">{sec.sectionName}</div>
                    <div className="mt-2 flex items-center justify-center">
                       <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
                    </div>
                  </th>
                ))}
                <th className="p-6 w-24 bg-slate-900 dark:bg-[#0B0C12] sticky right-0 z-20 text-center text-[10px] font-black uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.map((sub: any, idx: number) => (
                <tr key={sub.id} className={`group hover:bg-indigo-50/40 dark:hover:bg-indigo-500/10 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-[#12131C]' : 'bg-slate-50/30 dark:bg-[#0E0F18]/60'}`}>
                  <td className={`p-5 font-black text-indigo-500 text-xs border-r border-slate-50 dark:border-slate-800/60 sticky left-0 z-10 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-[#12131C]' : 'bg-slate-50/30 dark:bg-[#0E0F18]/60'} group-hover:bg-indigo-50/10 dark:group-hover:bg-indigo-500/10`}>
                    {sub.subjectCode || "???"}
                  </td>
                  <td className={`p-5 font-bold text-slate-700 dark:text-slate-200 text-sm border-r border-slate-50 dark:border-slate-800/60 sticky left-[80px] z-10 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-[#12131C]' : 'bg-slate-50/30 dark:bg-[#0E0F18]/60'} group-hover:bg-indigo-50/10 dark:group-hover:bg-indigo-500/10`}>
                    {sub.subjectName}
                  </td>
                  <td className="p-5 border-r border-slate-50 dark:border-slate-800/60">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      {sub.category || "Autre"}
                    </span>
                  </td>
                  {filteredSections.map((sec: any) => {
                    const key = `${sub.id}_${sec.id}`;
                    const isUni = sec.educationalLevel?.toLowerCase().includes('licence') || sec.educationalLevel?.toLowerCase().includes('master');
                    const cell = matrixData[key] || { coef: "0", cred: "0" };
                    const isChanged = unsavedIds.has(key);
                    
                    return (
                      <td key={sec.id} className={`p-3 border-r border-slate-50 dark:border-slate-800/60 text-center transition-all ${isChanged ? 'bg-indigo-50/50 dark:bg-indigo-500/20' : ''}`}>
                        <div className="inline-flex items-center justify-center gap-1.5 p-1 bg-slate-50 dark:bg-[#0E0F18] rounded-xl border border-slate-100 dark:border-slate-800 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all">
                          <input 
                            type="text"
                            value={cell.coef}
                            onChange={(e) => handleMatrixChange(sub.id, sec.id, 'coef', e.target.value)}
                            className="w-10 h-10 bg-white dark:bg-[#181926] border border-slate-200 dark:border-slate-700 rounded-lg text-center font-black text-slate-700 dark:text-white text-sm outline-none focus:text-indigo-600 focus:border-indigo-500"
                          />
                          {isUni && (
                            <>
                              <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700"></div>
                              <input 
                                type="text"
                                value={cell.cred}
                                onChange={(e) => handleMatrixChange(sub.id, sec.id, 'cred', e.target.value)}
                                className="w-10 h-10 bg-slate-900 border-none rounded-lg text-center font-bold text-emerald-400 text-xs outline-none"
                              />
                            </>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="p-4 text-center sticky right-0 bg-inherit border-l border-slate-50 dark:border-slate-800/60 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => handleOpenEditModal(sub)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all active:scale-90"
                        title="Modifier la matière"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button 
                        onClick={() => handleDeleteSubjectClick(sub)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all active:scale-90"
                        title="Supprimer la matière"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Matrix Footer Dashboard */}
        <div className="p-8 bg-slate-900 dark:bg-[#0B0C12] text-white flex items-center justify-between border-t border-slate-800 z-20">
          <div className="flex items-center gap-10">
             <div className="flex items-center gap-3">
                <div className="w-1.5 h-10 rounded-full bg-indigo-500"></div>
                <div>
                   <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Moyenne Coef</div>
                   <div className="text-xl font-black text-indigo-400">1.8</div>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-1.5 h-10 rounded-full bg-emerald-500"></div>
                <div>
                   <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Usage Crédits</div>
                   <div className="text-xl font-black text-emerald-400">42%</div>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-4">
             {filteredSections.map((sec: any) => (
                <div key={sec.id} className="text-center px-4 border-r border-white/5 last:border-0 min-w-[110px]">
                   <div className="text-[9px] font-black text-slate-500 uppercase truncate max-w-[80px]">{sec.sectionName}</div>
                   <div className="text-sm font-black text-white">{totalsBySection[sec.id]?.coef} <span className="text-[10px] text-slate-500">Σ</span></div>
                </div>
             ))}
          </div>
        </div>
      </div>

      {/* ─── MODAL EDIT SUBJECT ─── */}
      {editingSubject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#12131C] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl max-w-lg w-full p-8 relative space-y-6">
            <button 
              onClick={() => setEditingSubject(null)}
              className="absolute right-6 top-6 w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Edit3 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Modifier la Matière</h3>
                <p className="text-xs text-slate-400 font-semibold">Mettre à jour la désignation, le code ou la catégorie.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Nom de la Matière *</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-12 bg-slate-50 dark:bg-[#0E0F18] border border-slate-200 dark:border-slate-800 rounded-xl px-4 font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Code Matière</label>
                  <input 
                    type="text" 
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full h-12 bg-slate-50 dark:bg-[#0E0F18] border border-slate-200 dark:border-slate-800 rounded-xl px-4 font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 uppercase text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Catégorie</label>
                  <select 
                    value={editCat}
                    onChange={(e) => setEditCat(e.target.value)}
                    className="w-full h-12 bg-slate-50 dark:bg-[#0E0F18] border border-slate-200 dark:border-slate-800 rounded-xl px-4 font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-sm"
                  >
                    <option value="Catégorie">Catégorie (Autre)</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setEditingSubject(null)}
                className="h-12 px-6 rounded-xl font-bold text-xs text-slate-500 dark:text-slate-400"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleSaveSubjectEdit}
                disabled={isSavingEdit || !editName.trim()}
                className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 dark:shadow-none"
              >
                {isSavingEdit ? <Loader2 className="animate-spin" /> : "Sauvegarder les modifications"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
